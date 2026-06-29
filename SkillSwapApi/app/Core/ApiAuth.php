<?php

declare(strict_types=1);

namespace App\Core;

use App\Models\User;
use App\Support\UserPresence;

/**
 * Bearer-token authentication for the SkillSwap mobile API.
 * Tokens are random 64-char strings stored in api_tokens with a 30-day expiry.
 */
final class ApiAuth
{
    public static function issue(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30);
        Database::run(
            'INSERT INTO api_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [$userId, $token, $expires]
        );
        return $token;
    }

    public static function bearer(): ?string
    {
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        // Some Apache setups strip Authorization; fall back to a custom header.
        if ($header === '') {
            $header = (string) ($_SERVER['HTTP_X_AUTHORIZATION'] ?? '');
        }
        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches) === 1) {
            return $matches[1];
        }
        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function user(): ?array
    {
        $token = self::bearer();
        if ($token === null) {
            return null;
        }
        $row = Database::first(
            'SELECT user_id FROM api_tokens WHERE token = ? AND expires_at > NOW()',
            [$token]
        );
        if ($row === null) {
            return null;
        }
        $user = User::find((int) $row['user_id']);
        if ($user === null || (int) ($user['is_active'] ?? 1) === 0) {
            return null;
        }
        UserPresence::touch((int) $user['id']);
        return $user;
    }

    public static function id(): ?int
    {
        $user = self::user();
        return $user !== null ? (int) $user['id'] : null;
    }

    /**
     * Resolve the authenticated user id or stop the request with 401.
     */
    public static function requireId(): int
    {
        $id = self::id();
        if ($id === null) {
            json_abort(401, 'Unauthorized. Please sign in again.');
        }
        return $id;
    }

    public static function revoke(?string $token = null): void
    {
        $token ??= self::bearer();
        if ($token === null) {
            return;
        }
        Database::run('DELETE FROM api_tokens WHERE token = ?', [$token]);
    }
}
