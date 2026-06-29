<?php

declare(strict_types=1);

namespace App\Support;

use App\Core\Database;

/** Tracks whether a user is currently active in the app. */
final class UserPresence
{
    public const ONLINE_SECONDS = 120;

    public static function touch(int $userId): void
    {
        Database::run('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [$userId]);
    }

    public static function isOnline(int $userId): bool
    {
        $row = Database::first(
            'SELECT id FROM users
             WHERE id = ?
               AND last_seen_at IS NOT NULL
               AND last_seen_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)',
            [$userId, self::ONLINE_SECONDS]
        );
        return $row !== null;
    }
}
