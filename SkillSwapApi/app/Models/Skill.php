<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

final class Skill
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function all(): array
    {
        return Database::all('SELECT * FROM skills ORDER BY category, name');
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(int $id): ?array
    {
        return Database::first('SELECT * FROM skills WHERE id = ?', [$id]);
    }

    /**
     * Find an existing skill by name (case-insensitive) or create it.
     */
    public static function findOrCreate(string $name, string $category = 'General'): int
    {
        $name = trim($name);
        $slug = self::slugify($name);
        $existing = Database::first('SELECT id FROM skills WHERE slug = ?', [$slug]);
        if ($existing !== null) {
            return (int) $existing['id'];
        }
        return Database::insert(
            'INSERT INTO skills (name, slug, category) VALUES (?, ?, ?)',
            [$name, $slug, $category]
        );
    }

    public static function slugify(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }

    /**
     * @param array<string, mixed> $skill
     * @return array<string, mixed>
     */
    public static function payload(array $skill): array
    {
        return [
            'id' => (int) $skill['id'],
            'name' => (string) $skill['name'],
            'slug' => (string) $skill['slug'],
            'category' => (string) ($skill['category'] ?? 'General'),
        ];
    }
}
