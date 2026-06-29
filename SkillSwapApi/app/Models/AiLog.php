<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/**
 * Audit log of every AI (Gemini) call, supporting the documentation's
 * logging framework and troubleshooting.
 */
final class AiLog
{
    public static function record(
        ?int $userId,
        string $feature,
        string $prompt,
        string $response,
        string $status = 'ok'
    ): void {
        try {
            Database::run(
                'INSERT INTO ai_logs (user_id, feature, prompt, response, status) VALUES (?, ?, ?, ?, ?)',
                [$userId, $feature, mb_substr($prompt, 0, 8000), mb_substr($response, 0, 8000), $status]
            );
        } catch (\Throwable $e) {
            // Logging must never break the request.
        }
    }
}
