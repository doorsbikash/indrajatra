<?php
declare(strict_types=1);

use IndraJatra\Api;
use IndraJatra\Database;

$releaseRoot = dirname(__DIR__, 2);
$backendRoot = getenv('IJ26_BACKEND_ROOT') ?: $releaseRoot . '/backend';
$envFile = getenv('IJ26_ENV_FILE') ?: $releaseRoot . '/config/app.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (preg_match('/^[A-Z0-9_]+$/', $key) && getenv($key) === false) {
            putenv($key . '=' . trim($value, "\"'"));
        }
    }
}

require_once $backendRoot . '/src/Database.php';
require_once $backendRoot . '/src/Api.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('ij26_session');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 14,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
(new Api(Database::connect()))->dispatch($method, rtrim($path, '/') ?: '/');
