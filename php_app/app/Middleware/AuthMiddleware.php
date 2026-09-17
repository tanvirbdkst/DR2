<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Session;

class AuthMiddleware
{
    public function handle(): bool
    {
        if (!Session::has('user')) {
            Session::flash('error', 'Please login to continue.');
            header("Location: /login");
            exit;
        }
        return true;
    }
}
