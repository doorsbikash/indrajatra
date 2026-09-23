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

$autoload = $backendRoot . '/vendor/autoload.php';
if (is_readable($autoload)) {
    require_once $autoload;
} else {
    require_once $backendRoot . '/src/Database.php';
    require_once $backendRoot . '/src/Api.php';
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';
$respond = static function (array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
};

// These high-volume public reads do not need a PHP session. Keep them away
// from MySQL wherever possible so event-day traffic cannot exhaust connections.
if ($method === 'GET' && $path === '/api/health') {
    $respond(['ok' => true, 'service' => 'indra-jatra-api', 'mode' => getenv('IJ26_APP_ENV') ?: 'production']);
}
if ($method === 'GET' && $path === '/api/live') {
    $cacheKey = hash('sha256', (string) (getenv('IJ26_APP_URL') ?: 'indra-jatra'));
    $cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . "ij26-live-{$cacheKey}.json";
    $lockFile = $cacheFile . '.lock';
    $maxAge = 10;
    header('Cache-Control: public, max-age=5, stale-while-revalidate=30');

    $fresh = static fn () => is_readable($cacheFile) && (time() - (int) filemtime($cacheFile)) < $maxAge;
    if ($fresh()) {
        readfile($cacheFile);
        exit;
    }

    $lock = fopen($lockFile, 'c');
    if ($lock !== false) flock($lock, LOCK_EX);
    try {
        if ($fresh()) {
            readfile($cacheFile);
            exit;
        }
        $db = Database::connect();
        $query = $db->prepare("SELECT payload, revision, updated_at FROM live_state WHERE id = 'festival-2026' LIMIT 1");
        $query->execute();
        $row = $query->fetch();
        $payload = $row ? [
            'state' => json_decode((string) $row['payload'], true, 512, JSON_THROW_ON_ERROR),
            'revision' => (int) $row['revision'],
            'updatedAt' => $row['updated_at'],
        ] : ['state' => null, 'revision' => 0, 'updatedAt' => null];
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        file_put_contents($cacheFile, $encoded, LOCK_EX);
        echo $encoded;
        exit;
    } catch (Throwable $error) {
        error_log($error->__toString());
        $respond(['error' => 'The service is temporarily unavailable.'], 500);
    } finally {
        if ($lock !== false) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

if ($method === 'GET' && $path === '/api/auth/session' && empty($_COOKIE['ij26_session'])) {
    $respond(['error' => 'Not signed in'], 401);
}
if (getenv('IJ26_READ_ONLY') === '1' && $method !== 'GET') {
    $respond(['error' => 'Staging is read-only. Use the live app for event-day changes.'], 423);
}

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
$sessionLifetime = 60 * 60 * 24 * 30;
ini_set('session.gc_maxlifetime', (string) $sessionLifetime);
ini_set('session.cookie_lifetime', (string) $sessionLifetime);
session_name('ij26_session');
session_set_cookie_params([
    'lifetime' => $sessionLifetime,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

if ($method === 'GET' && $path === '/api/auth/session' && empty($_SESSION['visitor_id'])) {
    $respond(['error' => 'Not signed in'], 401);
}

(new Api(Database::connect()))->dispatch($method, $path);
