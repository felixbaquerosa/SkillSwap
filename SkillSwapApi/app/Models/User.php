<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

final class User
{
    /**
     * @return array<string, mixed>|null
     */
    public static function find(int $id): ?array
    {
        return Database::first('SELECT * FROM users WHERE id = ?', [$id]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function findByEmail(string $email): ?array
    {
        return Database::first('SELECT * FROM users WHERE email = ?', [strtolower($email)]);
    }

    public static function emailExists(string $email): bool
    {
        return self::findByEmail($email) !== null;
    }

    public static function create(
        string $name,
        string $email,
        string $password,
        string $birthdate,
        ?string $location = null
    ): int {
        return Database::insert(
            'INSERT INTO users (name, email, password, location, birthdate) VALUES (?, ?, ?, ?, ?)',
            [$name, strtolower($email), password_hash($password, PASSWORD_DEFAULT), $location, $birthdate]
        );
    }

    public static function updatePassword(int $id, string $newPassword): void
    {
        Database::run(
            'UPDATE users SET password = ? WHERE id = ?',
            [password_hash($newPassword, PASSWORD_DEFAULT), $id]
        );
    }

    /**
     * @param array<string, mixed> $fields
     */
    public static function updateProfile(int $id, array $fields): void
    {
        $allowed = ['name', 'bio', 'location', 'avatar'];
        $sets = [];
        $params = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $sets[] = "{$col} = ?";
                $params[] = $fields[$col];
            }
        }
        if ($sets === []) {
            return;
        }
        $params[] = $id;
        Database::run('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    }

    public static function delete(int $id): void
    {
        Database::run('DELETE FROM users WHERE id = ?', [$id]);
    }

    /**
     * Public-safe representation for API responses.
     *
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public static function payload(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'bio' => (string) ($user['bio'] ?? ''),
            'location' => (string) ($user['location'] ?? ''),
            'avatar' => (string) ($user['avatar'] ?? ''),
        ];
    }
}
