<?php
declare(strict_types=1);

use IndraJatra\Database;

require_once dirname(__DIR__) . '/src/Database.php';

$releaseRoot = dirname(__DIR__, 2);
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

$db = Database::connect();
$db->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(64) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
);

$files = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files, SORT_STRING);
foreach ($files as $file) {
    $version = basename($file, '.sql');
    $check = $db->prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
    $check->execute([$version]);
    if ($check->fetchColumn()) {
        echo "Already applied: {$version}\n";
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false) {
        throw new RuntimeException("Cannot read migration {$version}");
    }
    // MySQL DDL performs implicit commits, so each migration file must be idempotent.
    $db->exec($sql);
    $record = $db->prepare('INSERT INTO schema_migrations (version) VALUES (?)');
    $record->execute([$version]);
    echo "Applied: {$version}\n";
}
