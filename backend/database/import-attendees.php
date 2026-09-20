<?php
declare(strict_types=1);

use IndraJatra\Database;

$root = dirname(__DIR__, 2);
$envFile = getenv('IJ26_ENV_FILE') ?: $root . '/config/app.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (preg_match('/^[A-Z0-9_]+$/', $key) && getenv($key) === false) {
            putenv($key . '=' . trim($value, "\"'"));
        }
    }
}

require_once $root . '/backend/src/Database.php';
$secret = getenv('IJ26_SESSION_SECRET');
if (!$secret || strlen($secret) < 32) throw new RuntimeException('Missing session secret.');

$input = stream_get_contents(STDIN) ?: '';
$emails = preg_split('/[\s,;]+/', $input, -1, PREG_SPLIT_NO_EMPTY) ?: [];
$db = Database::connect();
$save = $db->prepare(
    'INSERT INTO attendee_entitlements (email_hash, source, event_id) VALUES (?, ?, ?) '
    . 'ON DUPLICATE KEY UPDATE source = VALUES(source), event_id = VALUES(event_id), imported_at = CURRENT_TIMESTAMP'
);
$count = 0;
foreach ($emails as $candidate) {
    $email = mb_strtolower(trim($candidate));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fwrite(STDERR, "Skipped invalid email: {$candidate}\n");
        continue;
    }
    $save->execute([hash_hmac('sha256', $email, $secret), 'eventbrite', 'indra-jatra-2026']);
    $count++;
}
fwrite(STDOUT, "Imported {$count} attendee entitlement(s).\n");
