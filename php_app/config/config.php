<?php
declare(strict_types=1);

// Detect environment or default to production-ready values
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'pixeswpo_dr';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASSWORD') ?: '';

return [
    'app' => [
        'name' => 'Daktar Serial',
        'tagline_bn' => 'সহজেই ডাক্তার দেখানোর সিরিয়াল নিন',
        'url' => getenv('APP_URL') ?: 'http://localhost',
        'lang' => 'bn', // 'bn' or 'en'
        'debug' => false,
        'upload_max_size' => 5 * 1024 * 1024, // 5MB
    ],
    'db' => [
        'host' => $dbHost,
        'port' => (int)$dbPort,
        'database' => $dbName,
        'username' => $dbUser,
        'password' => $dbPass,
        'charset' => 'utf8mb4',
    ],
    'session' => [
        'lifetime' => 86400 * 7, // 7 days
        'cookie_name' => 'daktar_session',
    ],
];
