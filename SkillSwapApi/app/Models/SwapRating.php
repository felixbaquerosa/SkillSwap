<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

final class SwapRating
{
    /**
     * @param array<int> $userIds
     * @return array<int, array{avg: float, count: int}>
     */
    public static function averagesForUsers(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $rows = Database::all(
            "SELECT rated_user_id, AVG(rating) AS avg_rating, COUNT(*) AS c
             FROM swap_ratings
             WHERE rated_user_id IN ({$placeholders})
             GROUP BY rated_user_id",
            $userIds
        );
        $out = [];
        foreach ($rows as $row) {
            $uid = (int) $row['rated_user_id'];
            $out[$uid] = [
                'avg' => round((float) $row['avg_rating'], 1),
                'count' => (int) $row['c'],
            ];
        }
        return $out;
    }

    public static function upsert(int $matchId, int $raterId, int $ratedUserId, int $rating, ?string $comment): int
    {
        Database::run(
            'INSERT INTO swap_ratings (match_id, rater_id, rated_user_id, rating, comment)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)',
            [$matchId, $raterId, $ratedUserId, $rating, $comment]
        );
        $row = Database::first(
            'SELECT id FROM swap_ratings WHERE match_id = ? AND rater_id = ?',
            [$matchId, $raterId]
        );
        return (int) ($row['id'] ?? 0);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forMatchByRater(int $matchId, int $raterId): ?array
    {
        return Database::first(
            'SELECT * FROM swap_ratings WHERE match_id = ? AND rater_id = ?',
            [$matchId, $raterId]
        );
    }

    /**
     * @return array{avg: float, count: int}
     */
    public static function averageForUser(int $userId): array
    {
        $row = Database::first(
            'SELECT AVG(rating) AS avg_rating, COUNT(*) AS c FROM swap_ratings WHERE rated_user_id = ?',
            [$userId]
        );
        return [
            'avg' => round((float) ($row['avg_rating'] ?? 0), 1),
            'count' => (int) ($row['c'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function payload(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'match_id' => (int) $row['match_id'],
            'rater_id' => (int) $row['rater_id'],
            'rated_user_id' => (int) $row['rated_user_id'],
            'rating' => (int) $row['rating'],
            'comment' => (string) ($row['comment'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
    }
}
