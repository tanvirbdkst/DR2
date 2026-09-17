<?php
declare(strict_types=1);

namespace App\Core;

class Router
{
    private array $routes = [];

    public function get(string $path, array|callable $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, array|callable $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, array|callable $handler, array $middlewares = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, array|callable $handler, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }

    private function addRoute(string $method, string $path, array|callable $handler, array $middlewares): void
    {
        // Convert route with parameters like /doctor/{id} to regex
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        $pattern = "#^" . $pattern . "/?$#"; // Allow optional trailing slash

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
    }

    public function dispatch(): void
    {
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($requestMethod === 'POST' && isset($_POST['_method'])) {
            $requestMethod = strtoupper($_POST['_method']);
        }

        // 1. Resolve URI from query parameter, PATH_INFO, or REQUEST_URI
        $routeParam = $_GET['r'] ?? $_GET['route'] ?? $_GET['page'] ?? $_GET['p'] ?? null;
        if (!empty($routeParam)) {
            $uri = '/' . ltrim((string)$routeParam, '/');
        } elseif (!empty($_SERVER['PATH_INFO'])) {
            $uri = $_SERVER['PATH_INFO'];
        } else {
            $rawUri = $_SERVER['REQUEST_URI'] ?? '/';
            $uri = parse_url($rawUri, PHP_URL_PATH) ?? '/';

            // 2. Remove script directory if deployed in a subfolder (e.g. /php_app or /subfolder)
            $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
            $scriptDir = dirname($scriptName);
            if ($scriptDir !== '/' && $scriptDir !== '.' && $scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
                $uri = substr($uri, strlen($scriptDir));
            }

            // 3. Remove /index.php from URI if present (e.g. /index.php or /index.php/doctors)
            if (str_starts_with($uri, '/index.php')) {
                $uri = substr($uri, 10);
            }
        }

        // Clean slashes: ensure single leading slash and no trailing slash for root
        $uri = '/' . trim($uri, '/');
        if ($uri === '//' || $uri === '') {
            $uri = '/';
        }

        // Match against registered routes
        foreach ($this->routes as $route) {
            if ($route['method'] === $requestMethod && preg_match($route['pattern'], $uri, $matches)) {
                // Execute Middlewares
                foreach ($route['middlewares'] as $middlewareClass) {
                    $middleware = new $middlewareClass();
                    if (!$middleware->handle()) {
                        return; // Stopped by middleware
                    }
                }

                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                if (is_callable($route['handler'])) {
                    call_user_func_array($route['handler'], [$params]);
                    return;
                }

                if (is_array($route['handler'])) {
                    [$controllerClass, $method] = $route['handler'];
                    $controller = new $controllerClass();
                    call_user_func_array([$controller, $method], [$params]);
                    return;
                }
            }
        }

        // 404 Not Found
        http_response_code(404);
        if (str_starts_with($uri, '/api/')) {
            jsonResponse(['error' => 'API endpoint not found', 'requested_path' => $uri], 404);
        } else {
            $controller = new \App\Controllers\HomeController();
            $controller->notFound($uri);
        }
    }
}
