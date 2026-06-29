<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Central application container: holds configuration and resolves the base
 * path so the API works whether served at the domain root or in a subfolder
 * such as /SkillSwapApi/public.
 */
final class App
{
    /** @var array<string, mixed> */
    private static array $config = [];

    private static string $basePath = '';

    /**
     * @param array<string, mixed> $config
     */
    public static function boot(array $config): void
    {
        self::$config = $config;

        date_default_timezone_set($config['app']['timezone'] ?? 'UTC');

        $debug = (bool) ($config['app']['debug'] ?? false);
        error_reporting(E_ALL);
        ini_set('display_errors', $debug ? '1' : '0');

        self::detectBasePath();
    }

    /**
     * Read a config section, e.g. App::config('db').
     */
    public static function config(string $key): mixed
    {
        return self::$config[$key] ?? null;
    }

    public static function basePath(): string
    {
        return self::$basePath;
    }

    private static function detectBasePath(): void
    {
        $configuredUrl = self::$config['app']['url'] ?? '';
        if (is_string($configuredUrl) && $configuredUrl !== '') {
            $path = parse_url($configuredUrl, PHP_URL_PATH) ?: '';
            self::$basePath = rtrim($path, '/');
            return;
        }

        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        $dir = str_replace('\\', '/', dirname($script));
        self::$basePath = $dir === '/' ? '' : rtrim($dir, '/');
    }
}
