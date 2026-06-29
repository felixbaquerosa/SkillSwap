<?php

declare(strict_types=1);

use App\Core\App;
use App\Core\Router;

require dirname(__DIR__) . '/bootstrap.php';

// CORS for the Expo mobile client (sent on every response, including preflight).
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
require dirname(__DIR__) . '/routes/api.php';

try {
    $router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
} catch (Throwable $e) {
    $debug = (bool) (App::config('app')['debug'] ?? false);
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $debug ? $e->getMessage() : 'Something went wrong on the server.',
    ]);
}
