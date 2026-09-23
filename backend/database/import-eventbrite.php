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
        if (preg_match('/^[A-Z0-9_]+$/', $key) && getenv($key) === false) putenv($key . '=' . trim($value, "\"'"));
    }
}

require_once $root . '/backend/src/Database.php';
$secret = getenv('IJ26_SESSION_SECRET');
if (!$secret || strlen($secret) < 32) throw new RuntimeException('Missing session secret.');
$file = $argv[1] ?? '';
if ($file === '' || !is_readable($file)) throw new InvalidArgumentException('Usage: php import-eventbrite.php /path/to/eventbrite.csv');

$handle = fopen($file, 'rb');
if ($handle === false) throw new RuntimeException('Could not open CSV.');
$headers = fgetcsv($handle);
if (!$headers) throw new RuntimeException('CSV has no header row.');
$headers = array_map(static function (string $header): string {
    $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
    return preg_replace('/[^a-z0-9]+/', '', mb_strtolower(trim($header))) ?? '';
}, $headers);

function value(array $row, array $headers, array $aliases): string
{
    foreach ($aliases as $alias) {
        $index = array_search($alias, $headers, true);
        if ($index !== false) return trim((string) ($row[$index] ?? ''));
    }
    return '';
}

function secureHash(string $value, string $secret): ?string
{
    $value = mb_strtolower(trim($value));
    return $value === '' ? null : hash_hmac('sha256', $value, $secret);
}

$db = Database::connect();
$saveAttendee = $db->prepare(
    'INSERT INTO event_attendees '
    . '(event_id, source, source_attendee_id_hash, ticket_code_hash, order_number_hash, email_hash, first_name, last_name, ticket_type) '
    . 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE '
    . 'ticket_code_hash = COALESCE(VALUES(ticket_code_hash), ticket_code_hash), '
    . 'email_hash = VALUES(email_hash), first_name = VALUES(first_name), last_name = VALUES(last_name), '
    . 'ticket_type = VALUES(ticket_type), order_number_hash = VALUES(order_number_hash), updated_at = CURRENT_TIMESTAMP'
);
$saveEntitlement = $db->prepare(
    'INSERT INTO attendee_entitlements (email_hash, source, event_id) VALUES (?, ?, ?) '
    . 'ON DUPLICATE KEY UPDATE source = VALUES(source), event_id = VALUES(event_id), imported_at = CURRENT_TIMESTAMP'
);

$imported = 0;
$skipped = 0;
while (($row = fgetcsv($handle)) !== false) {
    $email = mb_strtolower(value($row, $headers, ['email', 'emailaddress', 'attendeeemail', 'buyeremail']));
    $attendeeId = value($row, $headers, ['attendeeid', 'attendeeno', 'attendeenumber']);
    $barcode = value($row, $headers, ['barcode', 'barcodenumber', 'ticketbarcode', 'qrcode']);
    $firstName = value($row, $headers, ['firstname', 'attendeefirstname']);
    $lastName = value($row, $headers, ['surname', 'lastname', 'attendeelastname']);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $firstName === '' || $lastName === '') {
        $skipped++;
        continue;
    }
    // Eventbrite's standard attendee export does not always include an attendee ID.
    // A barcode identifies the individual ticket; using email/name here would collapse
    // family or group bookings into a single attendee row.
    $sourceKey = $attendeeId !== ''
        ? $attendeeId
        : ($barcode !== '' ? "barcode:{$barcode}" : "identity:{$email}|{$firstName}|{$lastName}");
    $emailHash = secureHash($email, $secret);
    $saveAttendee->execute([
        'indra-jatra-2026',
        'eventbrite',
        secureHash($sourceKey, $secret),
        secureHash($barcode, $secret),
        secureHash(value($row, $headers, ['orderno', 'ordernumber', 'orderid']), $secret),
        $emailHash,
        $firstName,
        $lastName,
        value($row, $headers, ['tickettype', 'ticketname', 'ticketclass', 'ticketclassname']),
    ]);
    $saveEntitlement->execute([$emailHash, 'eventbrite', 'indra-jatra-2026']);
    $imported++;
}
fclose($handle);
fwrite(STDOUT, "Imported {$imported} Eventbrite attendee(s); skipped {$skipped} incomplete row(s).\n");
