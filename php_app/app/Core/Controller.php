<?php
declare(strict_types=1);

namespace App\Core;

class Controller
{
    protected function view(string $viewPath, array $data = [], string $layout = 'main'): void
    {
        extract($data);

        // Capture view content
        ob_start();
        $fullPath = __DIR__ . '/../Views/' . $viewPath . '.php';
        if (!file_exists($fullPath)) {
            die("View [{$viewPath}] not found.");
        }
        require $fullPath;
        $content = ob_get_clean();

        // Render layout
        $layoutPath = __DIR__ . '/../Views/layouts/' . $layout . '.php';
        if (file_exists($layoutPath)) {
            require $layoutPath;
        } else {
            echo $content;
        }
    }

    protected function json(array $data, int $statusCode = 200): void
    {
        jsonResponse($data, $statusCode);
    }

    protected function validateCsrf(): void
    {
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!Session::validateCsrfToken($token)) {
            if ($this->isJsonRequest()) {
                $this->json(['error' => 'Invalid or expired CSRF token.'], 419);
            } else {
                Session::flash('error', 'Your session expired or token is invalid. Please try again.');
                redirect($_SERVER['HTTP_REFERER'] ?? '/');
            }
        }
    }

    protected function isJsonRequest(): bool
    {
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        return str_contains($accept, 'application/json') || str_contains($contentType, 'application/json');
    }
}
