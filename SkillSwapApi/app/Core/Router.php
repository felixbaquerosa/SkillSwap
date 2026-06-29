<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * Minimal regex-based router supporting GET/POST/DELETE routes with named
 * parameters (e.g. /matches/{id}). Authentication is enforced inside the
 * controller actions via ApiAuth, keeping the router simple.
 */
final class Router
{
    /** @var array<int, array{method:string, pattern:string, handler:array{0:class-string,1:string}}> */
    private array $routes = [];

    /**
     * @param array{0:class-string,1:string} $handler
     */
    public function get(string $pattern, array $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    /**
     * @param array{0:class-string,1:string} $handler
     */
    public function post(string $pattern, array $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    /**
     * @param array{0:class-string,1:string} $handler
     */
    public function delete(string $pattern, array $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    /**
     * @param array{0:class-string,1:string} $handler
     */
    private function add(string $method, string $pattern, array $handler): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = $this->normalize($uri);
        $method = strtoupper($method);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $regex = $this->compile($route['pattern']);
            if (preg_match($regex, $path, $matches) === 1) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $this->invoke($route['handler'], $params);
                return;
            }
        }

        json_abort(404, 'Endpoint not found.');
    }

    private function compile(string $pattern): string
    {
        $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
        return '#^' . $regex . '$#';
    }

    private function normalize(string $uri): string
    {
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $base = App::basePath();
        if ($base !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base));
        }
        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }

    /**
     * @param array{0:class-string,1:string} $handler
     * @param array<string, string> $params
     */
    private function invoke(array $handler, array $params): void
    {
        [$class, $action] = $handler;
        if (!class_exists($class)) {
            throw new RuntimeException("Controller {$class} not found.");
        }
        $controller = new $class();
        if (!method_exists($controller, $action)) {
            throw new RuntimeException("Action {$class}::{$action} not found.");
        }
        $controller->{$action}(...array_values($params));
    }
}
