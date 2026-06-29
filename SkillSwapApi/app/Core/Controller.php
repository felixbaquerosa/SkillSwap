<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Base controller with shared JSON + request-input helpers for the API.
 */
abstract class Controller
{
    /**
     * Send a JSON response and stop.
     *
     * @param array<string, mixed> $data
     */
    protected function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    /**
     * Read a query-string value (GET).
     */
    protected function query(string $key, mixed $default = null): mixed
    {
        $value = $_GET[$key] ?? $default;
        return is_string($value) ? trim($value) : $value;
    }

    /**
     * Decode the JSON request body into an associative array.
     *
     * @return array<string, mixed>
     */
    protected function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return $_POST;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
