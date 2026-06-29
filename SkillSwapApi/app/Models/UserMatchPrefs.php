<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/** Per-user archive / delete state for a swap conversation. */
final class UserMatchPrefs
{
    public static function archive(int $userId, int $matchId): void
    {
        Database::run(
            'INSERT INTO user_match_prefs (user_id, match_id, archived_at)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE archived_at = NOW(), deleted_at = NULL',
            [$userId, $matchId]
        );
    }

    public static function unarchive(int $userId, int $matchId): void
    {
        Database::run(
            'UPDATE user_match_prefs SET archived_at = NULL WHERE user_id = ? AND match_id = ?',
            [$userId, $matchId]
        );
    }

    public static function delete(int $userId, int $matchId): void
    {
        Database::run(
            'INSERT INTO user_match_prefs (user_id, match_id, deleted_at, archived_at)
             VALUES (?, ?, NOW(), NULL)
             ON DUPLICATE KEY UPDATE deleted_at = NOW(), archived_at = NULL',
            [$userId, $matchId]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forUserMatch(int $userId, int $matchId): ?array
    {
        return Database::first(
            'SELECT * FROM user_match_prefs WHERE user_id = ? AND match_id = ?',
            [$userId, $matchId]
        );
    }
}
