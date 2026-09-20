<?php
declare(strict_types=1);

namespace IndraJatra;

use DateTimeImmutable;
use DateTimeZone;
use PDO;
use Throwable;

final class Api
{
    private const CODE_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 5;
    private const MAX_REQUESTS_PER_15_MINUTES = 5;

    public function __construct(private readonly PDO $db)
    {
    }

    public function dispatch(string $method, string $path): never
    {
        try {
            if ($method === 'GET' && $path === '/api/health') {
                $this->json(['ok' => true, 'service' => 'indra-jatra-api', 'mode' => getenv('IJ26_APP_ENV') ?: 'production']);
            }
            if ($method === 'GET' && $path === '/api/auth/session') {
                $this->session();
            }
            if ($method === 'POST' && $path === '/api/auth/register') {
                $this->requestRegistration();
            }
            if ($method === 'POST' && $path === '/api/auth/code') {
                $this->requestLogin();
            }
            if ($method === 'POST' && $path === '/api/auth/verify') {
                $this->verify();
            }
            if ($method === 'POST' && $path === '/api/auth/logout') {
                $this->logout();
            }
            if ($method === 'GET' && $path === '/api/live') {
                $this->liveState();
            }
            if ($method === 'PUT' && $path === '/api/admin/live') {
                $this->saveLiveState();
            }
            if ($method === 'GET' && $path === '/api/passport') {
                $this->passport();
            }
            if ($method === 'PUT' && $path === '/api/passport') {
                $this->savePassport();
            }
            $this->json(['error' => 'Not found'], 404);
        } catch (Throwable $error) {
            error_log($error->__toString());
            $this->json(['error' => 'The service is temporarily unavailable.'], 500);
        }
    }

    private function requestRegistration(): never
    {
        $input = $this->body();
        $profile = [
            'firstName' => $this->requiredText($input, 'firstName', 120),
            'lastName' => $this->requiredText($input, 'lastName', 120),
            'email' => $this->email($input['email'] ?? null),
            'phone' => $this->requiredText($input, 'phone', 40),
            'marketingConsent' => !empty($input['marketingConsent']),
        ];
        $this->createChallenge($profile['email'], 'register', $profile);
    }

    private function requestLogin(): never
    {
        $input = $this->body();
        $email = $this->email($input['email'] ?? null);
        $query = $this->db->prepare('SELECT id FROM visitor_profiles WHERE email = ? LIMIT 1');
        $query->execute([$email]);
        if (!$query->fetch()) {
            $attendee = $this->db->prepare('SELECT email_hash FROM attendee_entitlements WHERE email_hash = ? LIMIT 1');
            $attendee->execute([$this->emailHash($email)]);
            if (!$attendee->fetch()) {
                $this->json(['error' => 'No festival pass was found for that email. You can still register for a free pass.'], 404);
            }
            $this->createChallenge($email, 'attendee', null);
        }
        $this->createChallenge($email, 'login', null);
    }

    private function createChallenge(string $email, string $mode, ?array $profile): never
    {
        $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $this->secret());
        $recent = $this->db->prepare(
            'SELECT COUNT(*) FROM auth_challenges WHERE (email = ? OR requested_ip_hash = ?) AND created_at >= (UTC_TIMESTAMP() - INTERVAL 15 MINUTE)'
        );
        $recent->execute([$email, $ipHash]);
        if ((int) $recent->fetchColumn() >= self::MAX_REQUESTS_PER_15_MINUTES) {
            $this->json(['error' => 'Too many codes requested. Please wait 15 minutes.'], 429);
        }

        $id = bin2hex(random_bytes(32));
        $code = (string) random_int(100000, 999999);
        $expires = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
            ->modify('+' . self::CODE_TTL_MINUTES . ' minutes')
            ->format('Y-m-d H:i:s');
        $statement = $this->db->prepare(
            'INSERT INTO auth_challenges (id, email, mode, code_hash, registration_payload, requested_ip_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $id,
            $email,
            $mode,
            password_hash($code, PASSWORD_DEFAULT),
            $profile ? json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) : null,
            $ipHash,
            $expires,
        ]);

        if (!$this->sendCode($email, $code)) {
            $this->json(['error' => 'The email could not be sent. Please contact the festival team.'], 503);
        }

        $response = ['challengeId' => $id, 'email' => $email, 'mode' => $mode];
        if (getenv('IJ26_AUTH_DEBUG_CODE') === '1') {
            $response['demoCode'] = $code;
        }
        $this->json($response, 201);
    }

    private function verify(): never
    {
        $input = $this->body();
        $challengeId = $this->requiredText($input, 'challengeId', 64);
        $code = $this->requiredText($input, 'code', 6);
        $this->db->beginTransaction();
        $query = $this->db->prepare('SELECT * FROM auth_challenges WHERE id = ? FOR UPDATE');
        $query->execute([$challengeId]);
        $challenge = $query->fetch();

        if (!$challenge || $challenge['consumed_at'] !== null || strtotime((string) $challenge['expires_at']) < time()) {
            $this->db->rollBack();
            $this->json(['error' => 'That code has expired. Request a new one.'], 400);
        }
        if ((int) $challenge['attempts'] >= self::MAX_ATTEMPTS || !password_verify($code, (string) $challenge['code_hash'])) {
            $update = $this->db->prepare('UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?');
            $update->execute([$challengeId]);
            $this->db->commit();
            $this->json(['error' => 'That code is not correct.'], 400);
        }

        if ($challenge['mode'] === 'register') {
            $profile = json_decode((string) $challenge['registration_payload'], true, 512, JSON_THROW_ON_ERROR);
            $save = $this->db->prepare(
                'INSERT INTO visitor_profiles (first_name, last_name, email, phone, pass_source, marketing_consent) VALUES (?, ?, ?, ?, ?, ?) '
                . 'ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), marketing_consent = VALUES(marketing_consent)'
            );
            $source = $this->hasAttendeeEntitlement($profile['email']) ? 'eventbrite' : 'direct';
            $save->execute([$profile['firstName'], $profile['lastName'], $profile['email'], $profile['phone'], $source, $profile['marketingConsent'] ? 1 : 0]);
        } elseif ($challenge['mode'] === 'attendee') {
            $save = $this->db->prepare(
                "INSERT INTO visitor_profiles (first_name, last_name, email, phone, pass_source) VALUES ('Festival guest', '', ?, '', 'eventbrite') "
                . "ON DUPLICATE KEY UPDATE pass_source = 'eventbrite'"
            );
            $save->execute([$challenge['email']]);
            $claimed = $this->db->prepare('UPDATE attendee_entitlements SET claimed_at = UTC_TIMESTAMP() WHERE email_hash = ?');
            $claimed->execute([$this->emailHash((string) $challenge['email'])]);
        }

        $profileQuery = $this->db->prepare('SELECT id, first_name, last_name, email, phone, pass_source, marketing_consent FROM visitor_profiles WHERE email = ? LIMIT 1');
        $profileQuery->execute([$challenge['email']]);
        $profile = $profileQuery->fetch();
        $consume = $this->db->prepare('UPDATE auth_challenges SET consumed_at = UTC_TIMESTAMP() WHERE id = ?');
        $consume->execute([$challengeId]);
        $this->db->commit();

        session_regenerate_id(true);
        $_SESSION['visitor_id'] = (int) $profile['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        $this->ensureConfiguredOrganiser((int) $profile['id'], (string) $profile['email']);
        $this->json($this->publicProfile($profile));
    }

    private function session(): never
    {
        $id = $_SESSION['visitor_id'] ?? null;
        if (!$id) {
            $this->json(['error' => 'Not signed in'], 401);
        }
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
        }
        $query = $this->db->prepare('SELECT id, first_name, last_name, email, phone, pass_source, marketing_consent FROM visitor_profiles WHERE id = ? LIMIT 1');
        $query->execute([$id]);
        $profile = $query->fetch();
        if (!$profile) {
            unset($_SESSION['visitor_id']);
            $this->json(['error' => 'Not signed in'], 401);
        }
        $this->ensureConfiguredOrganiser((int) $profile['id'], (string) $profile['email']);
        $this->json($this->publicProfile($profile));
    }

    private function logout(): never
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        $this->json(['ok' => true]);
    }

    private function sendCode(string $email, string $code): bool
    {
        $from = getenv('IJ26_MAIL_FROM') ?: 'no-reply@newaguthi.org.au';
        $name = getenv('IJ26_MAIL_FROM_NAME') ?: 'Indra Jatra Melbourne';
        $subject = 'Your Indra Jatra sign-in code';
        $message = "Your sign-in code is {$code}.\n\nIt expires in 10 minutes. If you did not request it, you can ignore this email.";
        $headers = [
            'From: ' . $name . ' <' . $from . '>',
            'Reply-To: ' . $from,
            'Content-Type: text/plain; charset=UTF-8',
        ];
        return mail($email, $subject, $message, implode("\r\n", $headers));
    }

    private function publicProfile(array $profile): array
    {
        $role = 'visitor';
        if (isset($profile['id'])) {
            $query = $this->db->prepare('SELECT role FROM organiser_users WHERE visitor_id = ? LIMIT 1');
            $query->execute([(int) $profile['id']]);
            $role = (string) ($query->fetchColumn() ?: 'visitor');
        }
        return [
            'firstName' => $profile['first_name'],
            'lastName' => $profile['last_name'],
            'email' => $profile['email'],
            'phone' => $profile['phone'],
            'passSource' => $profile['pass_source'] ?? 'direct',
            'marketingConsent' => !empty($profile['marketing_consent']),
            'role' => $role,
            'csrfToken' => $_SESSION['csrf'] ?? null,
        ];
    }

    private function liveState(): never
    {
        $query = $this->db->prepare("SELECT payload, revision, updated_at FROM live_state WHERE id = 'festival-2026' LIMIT 1");
        $query->execute();
        $row = $query->fetch();
        $this->json($row ? [
            'state' => json_decode((string) $row['payload'], true, 512, JSON_THROW_ON_ERROR),
            'revision' => (int) $row['revision'],
            'updatedAt' => $row['updated_at'],
        ] : ['state' => null, 'revision' => 0, 'updatedAt' => null]);
    }

    private function saveLiveState(): never
    {
        $visitorId = $this->requireOrganiser();
        $this->requireCsrf();
        $input = $this->body();
        $state = $input['state'] ?? null;
        if (!is_array($state)) $this->json(['error' => 'Invalid live state'], 422);
        $payload = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (strlen($payload) > 3_600_000) $this->json(['error' => 'Live state is too large'], 413);

        $previous = $this->db->prepare("SELECT payload FROM live_state WHERE id = 'festival-2026' LIMIT 1");
        $previous->execute();
        $old = $previous->fetchColumn();
        $save = $this->db->prepare(
            "INSERT INTO live_state (id, payload, revision, updated_by) VALUES ('festival-2026', ?, 1, ?) "
            . 'ON DUPLICATE KEY UPDATE payload = VALUES(payload), revision = revision + 1, updated_by = VALUES(updated_by)'
        );
        $save->execute([$payload, $visitorId]);
        $this->audit($visitorId, 'live.update', 'live_state', 'festival-2026', $old ?: null, $payload);
        $this->liveState();
    }

    private function passport(): never
    {
        $visitorId = $this->requireVisitor();
        $query = $this->db->prepare('SELECT payload, updated_at FROM passport_state WHERE visitor_id = ? LIMIT 1');
        $query->execute([$visitorId]);
        $row = $query->fetch();
        $this->json($row ? [
            'state' => json_decode((string) $row['payload'], true, 512, JSON_THROW_ON_ERROR),
            'updatedAt' => $row['updated_at'],
        ] : ['state' => null, 'updatedAt' => null]);
    }

    private function savePassport(): never
    {
        $visitorId = $this->requireVisitor();
        $this->requireCsrf();
        $input = $this->body();
        $state = $input['state'] ?? null;
        if (!is_array($state)) $this->json(['error' => 'Invalid passport state'], 422);
        $payload = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (strlen($payload) > 64_000) $this->json(['error' => 'Passport state is too large'], 413);
        $save = $this->db->prepare(
            'INSERT INTO passport_state (visitor_id, payload) VALUES (?, ?) '
            . 'ON DUPLICATE KEY UPDATE payload = VALUES(payload)'
        );
        $save->execute([$visitorId, $payload]);
        $this->json(['ok' => true]);
    }

    private function requireVisitor(): int
    {
        $id = (int) ($_SESSION['visitor_id'] ?? 0);
        if (!$id) $this->json(['error' => 'Sign in required'], 401);
        return $id;
    }

    private function requireOrganiser(): int
    {
        $id = $this->requireVisitor();
        $query = $this->db->prepare('SELECT role FROM organiser_users WHERE visitor_id = ? LIMIT 1');
        $query->execute([$id]);
        if (!$query->fetchColumn()) $this->json(['error' => 'Organiser access required'], 403);
        return $id;
    }

    private function requireCsrf(): void
    {
        $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = $_SESSION['csrf'] ?? '';
        if ($provided === '' || $expected === '' || !hash_equals((string) $expected, (string) $provided)) {
            $this->json(['error' => 'Invalid security token'], 403);
        }
    }

    private function emailHash(string $email): string
    {
        return hash_hmac('sha256', mb_strtolower(trim($email)), $this->secret());
    }

    private function hasAttendeeEntitlement(string $email): bool
    {
        $query = $this->db->prepare('SELECT 1 FROM attendee_entitlements WHERE email_hash = ? LIMIT 1');
        $query->execute([$this->emailHash($email)]);
        return (bool) $query->fetchColumn();
    }

    private function ensureConfiguredOrganiser(int $visitorId, string $email): void
    {
        $configured = array_filter(array_map(
            static fn(string $value): string => mb_strtolower(trim($value)),
            explode(',', (string) (getenv('IJ26_ORGANISER_EMAILS') ?: ''))
        ));
        if (!in_array(mb_strtolower($email), $configured, true)) return;
        $save = $this->db->prepare(
            "INSERT INTO organiser_users (visitor_id, role) VALUES (?, 'organiser') ON DUPLICATE KEY UPDATE role = VALUES(role)"
        );
        $save->execute([$visitorId]);
    }

    private function audit(int $actorId, string $action, string $entityType, string $entityId, mixed $previous, mixed $next): void
    {
        $save = $this->db->prepare(
            'INSERT INTO audit_entries (actor_id, action, entity_type, entity_id, previous_payload, next_payload) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $save->execute([(string) $actorId, $action, $entityType, $entityId, $previous, $next]);
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $this->json(['error' => 'Invalid JSON body'], 400);
        }
        return $decoded;
    }

    private function requiredText(array $input, string $key, int $max): string
    {
        $value = trim((string) ($input[$key] ?? ''));
        if ($value === '' || mb_strlen($value) > $max) {
            $this->json(['error' => "Invalid {$key}"], 422);
        }
        return $value;
    }

    private function email(mixed $value): string
    {
        $email = mb_strtolower(trim((string) $value));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
            $this->json(['error' => 'Invalid email'], 422);
        }
        return $email;
    }

    private function secret(): string
    {
        $secret = getenv('IJ26_SESSION_SECRET');
        if (!$secret || strlen($secret) < 32) {
            throw new \RuntimeException('IJ26_SESSION_SECRET must contain at least 32 characters.');
        }
        return $secret;
    }

    private function json(array $payload, int $status = 200): never
    {
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
}
