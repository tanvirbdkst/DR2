<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Session;

class AdminMiddleware
{
    public function handle(): bool
    {
        $user = Session::get('user');
        if (!$user) {
            Session::flash('error', 'Please login to access the administration console.');
            header("Location: /login");
            exit;
        }

        if (($user['role'] ?? '') !== 'admin') {
            http_response_code(403);
            die("Access Denied: Super Admin permissions required.");
        }

        return true;
    }
}
