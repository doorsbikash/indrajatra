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
            $this->json(['error' => 'No account was found for that email.'], 404);
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
                'INSERT INTO visitor_profiles (first_name, last_name, email, phone) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone)'
            );
            $save->execute([$profile['firstName'], $profile['lastName'], $profile['email'], $profile['phone']]);
        }

        $profileQuery = $this->db->prepare('SELECT id, first_name, last_name, email, phone FROM visitor_profiles WHERE email = ? LIMIT 1');
        $profileQuery->execute([$challenge['email']]);
        $profile = $profileQuery->fetch();
        $consume = $this->db->prepare('UPDATE auth_challenges SET consumed_at = UTC_TIMESTAMP() WHERE id = ?');
        $consume->execute([$challengeId]);
        $this->db->commit();

        session_regenerate_id(true);
        $_SESSION['visitor_id'] = (int) $profile['id'];
        $this->json($this->publicProfile($profile));
    }

    private function session(): never
    {
        $id = $_SESSION['visitor_id'] ?? null;
        if (!$id) {
            $this->json(['error' => 'Not signed in'], 401);
        }
        $query = $this->db->prepare('SELECT id, first_name, last_name, email, phone FROM visitor_profiles WHERE id = ? LIMIT 1');
        $query->execute([$id]);
        $profile = $query->fetch();
        if (!$profile) {
            unset($_SESSION['visitor_id']);
            $this->json(['error' => 'Not signed in'], 401);
        }
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
        return [
            'firstName' => $profile['first_name'],
            'lastName' => $profile['last_name'],
            'email' => $profile['email'],
            'phone' => $profile['phone'],
        ];
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
