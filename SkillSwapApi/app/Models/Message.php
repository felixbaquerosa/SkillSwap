<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

final class Message
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function forMatch(int $matchId): array
    {
        return Database::all(
            'SELECT m.*, u.name AS sender_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.match_id = ?
             ORDER BY m.id ASC',
            [$matchId]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function lastForMatch(int $matchId): ?array
    {
        return Database::first(
            'SELECT m.*, u.name AS sender_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.match_id = ?
             ORDER BY m.id DESC
             LIMIT 1',
            [$matchId]
        );
    }

    public static function unreadCount(int $matchId, int $viewerId): int
    {
        $row = Database::first(
            'SELECT COUNT(*) AS c
             FROM messages
             WHERE match_id = ? AND sender_id <> ? AND read_at IS NULL',
            [$matchId, $viewerId]
        );
        return (int) ($row['c'] ?? 0);
    }

    public static function create(int $matchId, int $senderId, string $body): int
    {
        return Database::insert(
            'INSERT INTO messages (match_id, sender_id, body) VALUES (?, ?, ?)',
            [$matchId, $senderId, $body]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(int $id): ?array
    {
        return Database::first(
            'SELECT m.*, u.name AS sender_name
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.id = ?',
            [$id]
        );
    }

    public static function markRead(int $matchId, int $readerId): void
    {
        Database::run(
            'UPDATE messages SET read_at = NOW()
             WHERE match_id = ? AND sender_id <> ? AND read_at IS NULL',
            [$matchId, $readerId]
        );
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function payload(array $row, int $viewerId, bool $partnerOnline = false): array
    {
        $mine = (int) $row['sender_id'] === $viewerId;
        $readAt = (string) ($row['read_at'] ?? '');
        $isRead = $readAt !== '' && !str_starts_with($readAt, '0000');

        return [
            'id' => (int) $row['id'],
            'match_id' => (int) $row['match_id'],
            'sender_id' => (int) $row['sender_id'],
            'sender_name' => (string) ($row['sender_name'] ?? ''),
            'body' => (string) $row['body'],
            'mine' => $mine,
            'created_at' => (string) ($row['created_at'] ?? ''),
            'read_at' => $isRead ? $readAt : null,
            'status' => $mine ? self::deliveryStatus($isRead, $partnerOnline) : null,
        ];
    }

    private static function deliveryStatus(bool $isRead, bool $partnerOnline): string
    {
        if ($isRead) {
            return 'read';
        }
        if ($partnerOnline) {
            return 'delivered';
        }
        return 'sent';
    }
}
