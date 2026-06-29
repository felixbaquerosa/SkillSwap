<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/**
 * A skill a user can teach ('offer') or wants to learn ('want').
 */
final class UserSkill
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function forUser(int $userId, ?string $type = null, bool $activeOnly = false): array
    {
        $sql = 'SELECT us.id, us.type, us.level, us.description, us.is_active,
                       s.id AS skill_id, s.name, s.slug, s.category
                FROM user_skills us
                JOIN skills s ON s.id = us.skill_id
                WHERE us.user_id = ?';
        $params = [$userId];
        if ($type !== null) {
            $sql .= ' AND us.type = ?';
            $params[] = $type;
        }
        if ($activeOnly) {
            $sql .= ' AND us.is_active = 1';
        }
        $sql .= ' ORDER BY us.is_active DESC, us.type, s.name';
        return Database::all($sql, $params);
    }

    public static function countForUser(int $userId, ?string $type = null): int
    {
        $sql = 'SELECT COUNT(*) AS c FROM user_skills WHERE user_id = ? AND is_active = 1';
        $params = [$userId];
        if ($type !== null) {
            $sql .= ' AND type = ?';
            $params[] = $type;
        }
        $row = Database::first($sql, $params);
        return (int) ($row['c'] ?? 0);
    }

    public static function hasAny(int $userId): bool
    {
        return self::countForUser($userId) > 0;
    }

    public static function add(int $userId, int $skillId, string $type, string $level, ?string $description): int
    {
        return Database::insert(
            'INSERT INTO user_skills (user_id, skill_id, type, level, description, is_active) VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE level = VALUES(level), description = VALUES(description), is_active = 1',
            [$userId, $skillId, $type, $level, $description]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function findOwned(int $id, int $userId): ?array
    {
        return Database::first(
            'SELECT us.*, s.name, s.slug, s.category
             FROM user_skills us
             JOIN skills s ON s.id = us.skill_id
             WHERE us.id = ? AND us.user_id = ?',
            [$id, $userId]
        );
    }

    public static function updateOwned(int $id, int $userId, string $level, ?string $description): bool
    {
        $stmt = Database::run(
            'UPDATE user_skills SET level = ?, description = ? WHERE id = ? AND user_id = ?',
            [$level, $description, $id, $userId]
        );
        return $stmt->rowCount() > 0;
    }

    /** Soft-disable — skills are not deleted from the database. */
    public static function setActive(int $id, int $userId, bool $active): bool
    {
        $stmt = Database::run(
            'UPDATE user_skills SET is_active = ? WHERE id = ? AND user_id = ?',
            [$active ? 1 : 0, $id, $userId]
        );
        return $stmt->rowCount() > 0;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function payload(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'skill_id' => (int) $row['skill_id'],
            'name' => (string) $row['name'],
            'slug' => (string) ($row['slug'] ?? ''),
            'category' => (string) ($row['category'] ?? 'General'),
            'type' => (string) $row['type'],
            'level' => (string) $row['level'],
            'description' => (string) ($row['description'] ?? ''),
            'is_active' => (int) ($row['is_active'] ?? 1) === 1,
        ];
    }
}
