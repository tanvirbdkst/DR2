<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Session;

class DoctorMiddleware
{
    public function handle(): bool
    {
        $user = Session::get('user');
        if (!$user) {
            Session::flash('error', 'Please login as a doctor to access this portal.');
            header("Location: /login");
            exit;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            http_response_code(403);
            die("Access Denied: Doctor permissions required.");
        }

        return true;
    }
}
