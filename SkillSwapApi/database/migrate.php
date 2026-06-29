<?php

declare(strict_types=1);

/**
 * SkillSwap installer.
 *
 * Creates the skillswap_db database, applies schema.sql, and seeds a skills
 * catalog so users can pick skills when registering and managing profiles.
 *
 * Run:  C:\xamppss\php\php.exe database/migrate.php
 */

require __DIR__ . '/../bootstrap.php';

use App\Core\App;

$db = App::config('db');

function out(string $msg): void
{
    echo $msg . PHP_EOL;
}

try {
    // 1) Connect to the server (no DB) and create the database.
    $serverDsn = sprintf('mysql:host=%s;port=%d;charset=%s', $db['host'], $db['port'], $db['charset']);
    $pdo = new PDO($serverDsn, $db['username'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $pdo->exec(
        sprintf(
            'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            $db['database']
        )
    );
    out("Database `{$db['database']}` ready.");

    // 2) Switch into the database and apply the schema.
    $pdo->exec("USE `{$db['database']}`");
    $schema = file_get_contents(__DIR__ . '/schema.sql');
    if ($schema === false) {
        throw new RuntimeException('Could not read schema.sql');
    }
    $pdo->exec($schema);
    out('Schema applied (tables created).');

    // 2b) Add birthdate column for databases created before 18+ registration.
    $birthdateCol = $pdo->query("SHOW COLUMNS FROM users LIKE 'birthdate'")->fetch();
    if ($birthdateCol === false) {
        $pdo->exec('ALTER TABLE users ADD COLUMN birthdate DATE NULL AFTER location');
        out('Added users.birthdate column.');
    }

    $activeCol = $pdo->query("SHOW COLUMNS FROM user_skills LIKE 'is_active'")->fetch();
    if ($activeCol === false) {
        $pdo->exec('ALTER TABLE user_skills ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER description');
        out('Added user_skills.is_active column.');
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS swap_ratings (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            match_id INT UNSIGNED NOT NULL,
            rater_id INT UNSIGNED NOT NULL,
            rated_user_id INT UNSIGNED NOT NULL,
            rating TINYINT UNSIGNED NOT NULL,
            comment VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_swap_ratings_once (match_id, rater_id),
            KEY idx_swap_ratings_rated (rated_user_id),
            CONSTRAINT fk_swap_ratings_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
            CONSTRAINT fk_swap_ratings_rater FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_swap_ratings_rated FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    out('swap_ratings table ready.');

    $lastSeenCol = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_seen_at'")->fetch();
    if ($lastSeenCol === false) {
        $pdo->exec('ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL AFTER birthdate');
        out('Added users.last_seen_at column.');
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS user_match_prefs (
            user_id INT UNSIGNED NOT NULL,
            match_id INT UNSIGNED NOT NULL,
            archived_at DATETIME NULL,
            deleted_at DATETIME NULL,
            PRIMARY KEY (user_id, match_id),
            KEY idx_user_match_prefs_match (match_id),
            CONSTRAINT fk_user_match_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_user_match_prefs_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    out('user_match_prefs table ready.');

    // 3) Seed the skills catalog.
    $catalog = [
        'Technology' => ['Web Development', 'Python Programming', 'Graphic Design', 'Video Editing', 'Data Analysis', 'Mobile App Development'],
        'Languages' => ['English Tutoring', 'Spanish', 'Japanese', 'Tagalog'],
        'Music' => ['Guitar', 'Piano', 'Singing', 'Music Production'],
        'Lifestyle' => ['Cooking', 'Baking', 'Yoga', 'Fitness Coaching', 'Photography'],
        'Business' => ['Digital Marketing', 'Public Speaking', 'Bookkeeping'],
        'Crafts' => ['Drawing', 'Painting', 'Sewing'],
    ];
    $skillIds = [];
    $insertSkill = $pdo->prepare(
        'INSERT INTO skills (name, slug, category) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE category = VALUES(category), id = LAST_INSERT_ID(id)'
    );
    foreach ($catalog as $category => $names) {
        foreach ($names as $name) {
            $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)) ?? '', '-'));
            $insertSkill->execute([$name, $slug, $category]);
            $skillIds[$name] = (int) $pdo->lastInsertId();
        }
    }
    out('Seeded ' . count($skillIds) . ' skills.');

    out('');
    out('SkillSwap installed successfully.');
    out('Create your account in the app — no demo users are seeded.');
} catch (Throwable $e) {
    fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
