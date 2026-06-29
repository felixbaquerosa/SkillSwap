<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/**
 * A swap request between two users ("Match" is a reserved word in PHP 8,
 * so the class is named SwapMatch; the table is `matches`).
 */
final class SwapMatch
{
    /**
     * @return array<string, mixed>|null
     */
    public static function find(int $id): ?array
    {
        return Database::first('SELECT * FROM matches WHERE id = ?', [$id]);
    }

    /**
     * Existing match between two users in either direction, if any.
     *
     * @return array<string, mixed>|null
     */
    public static function between(int $a, int $b): ?array
    {
        return Database::first(
            'SELECT * FROM matches
             WHERE (requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?)
             ORDER BY id DESC LIMIT 1',
            [$a, $b, $b, $a]
        );
    }

    public static function create(int $requesterId, int $partnerId, float $score, ?string $message): int
    {
        return Database::insert(
            'INSERT INTO matches (requester_id, partner_id, score, message) VALUES (?, ?, ?, ?)',
            [$requesterId, $partnerId, $score, $message]
        );
    }

    public static function updateStatus(int $id, string $status): void
    {
        Database::run('UPDATE matches SET status = ? WHERE id = ?', [$status, $id]);
    }

    /**
     * All matches that involve a user (as requester or partner), with the
     * other party's name joined in.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forUser(int $userId, bool $archivedOnly = false): array
    {
        $archiveClause = $archivedOnly
            ? 'AND p.archived_at IS NOT NULL'
            : 'AND (p.archived_at IS NULL)';

        return Database::all(
            "SELECT m.*,
                    ru.name AS requester_name,
                    pu.name AS partner_name,
                    p.archived_at AS user_archived_at
             FROM matches m
             JOIN users ru ON ru.id = m.requester_id
             JOIN users pu ON pu.id = m.partner_id
             LEFT JOIN user_match_prefs p ON p.match_id = m.id AND p.user_id = ?
             WHERE (m.requester_id = ? OR m.partner_id = ?)
               AND (p.deleted_at IS NULL)
               {$archiveClause}
             ORDER BY m.updated_at DESC, m.id DESC",
            [$userId, $userId, $userId]
        );
    }

    public static function partnerId(array $row, int $viewerId): int
    {
        return (int) $row['requester_id'] === $viewerId
            ? (int) $row['partner_id']
            : (int) $row['requester_id'];
    }

    /**
     * Confirm a user is part of a match (used to guard messages/sessions).
     */
    public static function involves(int $matchId, int $userId): bool
    {
        $row = Database::first(
            'SELECT id FROM matches WHERE id = ? AND (requester_id = ? OR partner_id = ?)',
            [$matchId, $userId, $userId]
        );
        return $row !== null;
    }

    /**
     * Build an API payload from the "for user" join, resolving the other party.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function payload(array $row, int $viewerId): array
    {
        $isRequester = (int) $row['requester_id'] === $viewerId;
        $otherId = $isRequester ? (int) $row['partner_id'] : (int) $row['requester_id'];
        $otherName = $isRequester ? (string) $row['partner_name'] : (string) $row['requester_name'];

        return [
            'id' => (int) $row['id'],
            'status' => (string) $row['status'],
            'score' => (float) $row['score'],
            'message' => (string) ($row['message'] ?? ''),
            'is_requester' => $isRequester,
            'partner_id' => $otherId,
            'partner_name' => $otherName,
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
    }
}
