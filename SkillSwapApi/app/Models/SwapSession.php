<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/**
 * A scheduled skill-swap session tied to an accepted match.
 */
final class SwapSession
{
    public static function create(int $matchId, ?int $skillId, string $scheduledAt, ?string $notes): int
    {
        return Database::insert(
            'INSERT INTO sessions (match_id, skill_id, scheduled_at, notes) VALUES (?, ?, ?, ?)',
            [$matchId, $skillId, $scheduledAt, $notes]
        );
    }

    /**
     * Create or update the active scheduled session for a swap.
     */
    public static function upsertForMatch(int $matchId, ?int $skillId, string $scheduledAt, ?string $notes): int
    {
        $existing = Database::first(
            "SELECT id FROM sessions WHERE match_id = ? AND status = 'scheduled' ORDER BY id DESC LIMIT 1",
            [$matchId]
        );
        if ($existing !== null) {
            Database::run(
                'UPDATE sessions SET scheduled_at = ?, skill_id = ?, notes = ? WHERE id = ?',
                [$scheduledAt, $skillId, $notes, (int) $existing['id']]
            );
            return (int) $existing['id'];
        }

        return self::create($matchId, $skillId, $scheduledAt, $notes);
    }

    /**
     * Validate and normalize a client datetime string for MySQL.
     */
    public static function normalizeScheduledAt(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '' || str_starts_with($raw, '0000')) {
            return null;
        }

        $formats = ['Y-m-d H:i:s', 'Y-m-d H:i', 'Y-m-d\TH:i:s', 'Y-m-d\TH:i', 'Y-m-d'];
        foreach ($formats as $format) {
            $dt = \DateTime::createFromFormat($format, $raw);
            if ($dt instanceof \DateTime) {
                $normalized = $dt->format('Y-m-d H:i:s');
                if (!str_starts_with($normalized, '0000')) {
                    return $normalized;
                }
            }
        }

        $ts = strtotime($raw);
        if ($ts === false || $ts <= 0) {
            return null;
        }

        $normalized = date('Y-m-d H:i:s', $ts);
        return str_starts_with($normalized, '0000') ? null : $normalized;
    }

    /**
     * Sessions for every match a user belongs to.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forUser(int $userId): array
    {
        return Database::all(
            "SELECT se.*, s.name AS skill_name,
                    ru.name AS requester_name, pu.name AS partner_name,
                    m.requester_id, m.partner_id
             FROM sessions se
             JOIN matches m ON m.id = se.match_id
             JOIN users ru ON ru.id = m.requester_id
             JOIN users pu ON pu.id = m.partner_id
             LEFT JOIN skills s ON s.id = se.skill_id
             WHERE m.requester_id = ? OR m.partner_id = ?
               AND se.scheduled_at > '1000-01-01 00:00:00'
             ORDER BY se.scheduled_at ASC",
            [$userId, $userId]
        );
    }

    public static function countUpcoming(int $userId): int
    {
        $row = Database::first(
            "SELECT COUNT(*) AS c
             FROM sessions se
             JOIN matches m ON m.id = se.match_id
             WHERE (m.requester_id = ? OR m.partner_id = ?)
               AND se.status = 'scheduled' AND se.scheduled_at > '1000-01-01 00:00:00' AND se.scheduled_at >= NOW()",
            [$userId, $userId]
        );
        return (int) ($row['c'] ?? 0);
    }

    /**
     * Upcoming scheduled sessions for appointment reminders.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function upcomingReminders(int $userId, int $limit = 20): array
    {
        return Database::all(
            "SELECT se.*, s.name AS skill_name,
                    ru.name AS requester_name, pu.name AS partner_name,
                    m.requester_id, m.partner_id
             FROM sessions se
             JOIN matches m ON m.id = se.match_id
             JOIN users ru ON ru.id = m.requester_id
             JOIN users pu ON pu.id = m.partner_id
             LEFT JOIN skills s ON s.id = se.skill_id
             WHERE (m.requester_id = ? OR m.partner_id = ?)
               AND se.status = 'scheduled'
               AND se.scheduled_at > '1000-01-01 00:00:00'
               AND se.scheduled_at >= NOW()
             ORDER BY se.scheduled_at ASC
             LIMIT " . (int) $limit,
            [$userId, $userId]
        );
    }

    public static function reminderLabel(string $scheduledAt): string
    {
        $target = strtotime($scheduledAt);
        if ($target === false) {
            return 'Upcoming';
        }
        $now = time();
        $diff = $target - $now;
        if ($diff < 3600) {
            return 'Starting soon';
        }
        if ($diff < 86400) {
            return 'Today';
        }
        if ($diff < 172800) {
            return 'Tomorrow';
        }
        $days = (int) floor($diff / 86400);
        return "In {$days} days";
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function payload(array $row, int $viewerId): array
    {
        $isRequester = (int) $row['requester_id'] === $viewerId;
        $otherName = $isRequester ? (string) $row['partner_name'] : (string) $row['requester_name'];

        return [
            'id' => (int) $row['id'],
            'match_id' => (int) $row['match_id'],
            'skill_name' => (string) ($row['skill_name'] ?? ''),
            'partner_name' => $otherName,
            'scheduled_at' => (string) $row['scheduled_at'],
            'status' => (string) $row['status'],
            'notes' => (string) ($row['notes'] ?? ''),
            'reminder_label' => self::reminderLabel((string) $row['scheduled_at']),
        ];
    }
}
