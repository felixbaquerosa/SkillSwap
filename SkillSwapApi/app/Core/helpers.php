<?php

declare(strict_types=1);

use App\Core\App;

/**
 * Minimal global helpers for the SkillSwap JSON API.
 */

if (!function_exists('absolute_url')) {
    /**
     * Build a full URL for mobile clients (respects subfolder install).
     */
    function absolute_url(string $path = '/'): string
    {
        $configured = (string) (App::config('app')['url'] ?? '');
        if ($configured !== '') {
            return rtrim($configured, '/') . '/' . ltrim($path, '/');
        }
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return rtrim($scheme . '://' . $host . App::basePath(), '/') . '/' . ltrim($path, '/');
    }
}

if (!function_exists('json_abort')) {
    /**
     * Stop the request with a JSON error payload and HTTP status.
     */
    function json_abort(int $status, string $message): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }
}
