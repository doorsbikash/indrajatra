<?php
declare(strict_types=1);

namespace IndraJatra;

use DateTimeImmutable;
use DateTimeZone;
use PDO;
use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;
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
            if ($method === 'POST' && $path === '/api/auth/eventbrite') {
                $this->requestEventbriteAccess();
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
            if ($method === 'GET' && $path === '/api/membership-reward') {
                $this->membershipReward();
            }
            if ($method === 'POST' && $path === '/api/membership-reward') {
                $this->claimMembershipReward();
            }
            if ($method === 'POST' && $path === '/api/integrations/membership-application') {
                $this->integrationMembershipApplication();
            }
            if ($method === 'POST' && $path === '/api/volunteers/register') {
                $this->registerVolunteer();
            }
            if ($method === 'GET' && $path === '/api/organiser-request') {
                $this->organiserRequest();
            }
            if ($method === 'POST' && $path === '/api/organiser-request') {
                $this->requestOrganiserAccess();
            }
            if ($method === 'GET' && $path === '/api/admin/organiser-requests') {
                $this->organiserRequests();
            }
            if ($method === 'PATCH' && preg_match('#^/api/admin/organiser-requests/(\d+)$#', $path, $matches)) {
                $this->updateOrganiserRequest((int) $matches[1]);
            }
            if ($method === 'GET' && $path === '/api/admin/organisers') {
                $this->organisers();
            }
            if ($method === 'DELETE' && preg_match('#^/api/admin/organisers/(\d+)$#', $path, $matches)) {
                $this->removeOrganiser((int) $matches[1]);
            }
            if ($method === 'GET' && $path === '/api/admin/volunteers') {
                $this->volunteers();
            }
            if ($method === 'PATCH' && preg_match('#^/api/admin/volunteers/(\d+)$#', $path, $matches)) {
                $this->updateVolunteer((int) $matches[1]);
            }
            if ($method === 'GET' && $path === '/api/admin/check-ins') {
                $this->checkInSummary();
            }
            if ($method === 'POST' && $path === '/api/admin/check-ins/scan') {
                $this->scanAttendee();
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
            $this->json(['error' => 'Your Eventbrite booking is ready to activate. Choose Eventbrite guest and enter the name on your booking.'], 409);
        }
        $this->createChallenge($email, 'login', null);
    }

    private function requestEventbriteAccess(): never
    {
        $input = $this->body();
        $profile = [
            'firstName' => $this->requiredText($input, 'firstName', 120),
            'lastName' => $this->requiredText($input, 'lastName', 120),
            'email' => $this->email($input['email'] ?? null),
        ];
        $query = $this->db->prepare(
            "SELECT id FROM event_attendees WHERE event_id = 'indra-jatra-2026' AND email_hash = ? "
            . 'AND LOWER(TRIM(first_name)) = LOWER(?) AND LOWER(TRIM(last_name)) = LOWER(?) LIMIT 1'
        );
        $query->execute([$this->emailHash($profile['email']), trim($profile['firstName']), trim($profile['lastName'])]);
        if (!$query->fetch()) {
            $this->json(['error' => 'We could not match those details to the Eventbrite guest list. Check the spelling used on your booking.'], 404);
        }
        $this->createChallenge($profile['email'], 'attendee', $profile);
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
            $attendeeProfile = json_decode((string) $challenge['registration_payload'], true, 512, JSON_THROW_ON_ERROR);
            $save = $this->db->prepare(
                "INSERT INTO visitor_profiles (first_name, last_name, email, phone, pass_source) VALUES (?, ?, ?, '', 'eventbrite') "
                . "ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), pass_source = 'eventbrite'"
            );
            $save->execute([$attendeeProfile['firstName'], $attendeeProfile['lastName'], $challenge['email']]);
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
        return $this->sendEmail(
            $email,
            'Your Indra Jatra sign-in code',
            "Your sign-in code is {$code}.\n\nIt expires in 10 minutes. If you did not request it, you can ignore this email."
        );
    }

    private function sendEmail(string $email, string $subject, string $message): bool
    {
        $from = getenv('IJ26_MAIL_FROM') ?: 'no-reply@newaguthi.org.au';
        $name = getenv('IJ26_MAIL_FROM_NAME') ?: 'Indra Jatra Melbourne';
        $smtpHost = trim((string) (getenv('IJ26_SMTP_HOST') ?: ''));
        $smtpAuth = (getenv('IJ26_SMTP_AUTH') ?: '1') !== '0';
        $smtpUser = trim((string) (getenv('IJ26_SMTP_USERNAME') ?: ''));
        $smtpPassword = trim((string) (getenv('IJ26_SMTP_PASSWORD') ?: ''));
        if ($smtpHost !== '' && (!$smtpAuth || ($smtpUser !== '' && $smtpPassword !== ''))) {
            return $this->sendSmtp($smtpAuth, $smtpUser, $smtpPassword, $from, $name, $email, $subject, $message);
        }
        $transactionalKey = trim((string) (getenv('IJ26_MAILCHIMP_TRANSACTIONAL_KEY') ?: ''));
        if ($transactionalKey !== '') {
            return $this->sendMailchimpTransactional($transactionalKey, $from, $name, $email, $subject, $message);
        }
        $headers = [
            'From: ' . $name . ' <' . $from . '>',
            'Reply-To: ' . $from,
            'Content-Type: text/plain; charset=UTF-8',
        ];
        return mail($email, $subject, $message, implode("\r\n", $headers));
    }

    private function sendSmtp(
        bool $authenticate,
        string $username,
        string $password,
        string $from,
        string $fromName,
        string $to,
        string $subject,
        string $text
    ): bool {
        if (!class_exists(PHPMailer::class)) {
            error_log('SMTP is configured but PHPMailer is not installed.');
            return false;
        }
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = (string) getenv('IJ26_SMTP_HOST');
            $mail->Port = (int) (getenv('IJ26_SMTP_PORT') ?: 587);
            $mail->SMTPAuth = $authenticate;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            if ($authenticate) {
                $mail->Username = $username;
                $mail->Password = $password;
            }
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->Timeout = 12;
            $mail->setFrom($from, $fromName);
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->Body = $text;
            $mail->isHTML(false);
            return $mail->send();
        } catch (MailException $error) {
            error_log('SMTP send failed: ' . $mail->ErrorInfo);
            return false;
        }
    }

    private function sendMailchimpTransactional(
        string $key,
        string $from,
        string $fromName,
        string $to,
        string $subject,
        string $text
    ): bool {
        if (!function_exists('curl_init')) {
            error_log('Mailchimp Transactional requires the PHP cURL extension.');
            return false;
        }
        $request = curl_init('https://mandrillapp.com/api/1.0/messages/send');
        curl_setopt_array($request, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode([
                'key' => $key,
                'message' => [
                    'from_email' => $from,
                    'from_name' => $fromName,
                    'subject' => $subject,
                    'text' => $text,
                    'to' => [['email' => $to, 'type' => 'to']],
                    'auto_text' => true,
                    'tags' => ['festival-sign-in'],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
        $response = curl_exec($request);
        $status = curl_getinfo($request, CURLINFO_RESPONSE_CODE);
        $error = curl_error($request);
        curl_close($request);
        if ($response === false || $status < 200 || $status >= 300) {
            error_log('Mailchimp Transactional request failed: HTTP ' . $status . ($error ? ' ' . $error : ''));
            return false;
        }
        $result = json_decode((string) $response, true);
        $deliveryStatus = is_array($result) && isset($result[0]['status']) ? (string) $result[0]['status'] : '';
        return in_array($deliveryStatus, ['sent', 'queued', 'scheduled'], true);
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

    private function membershipReward(): never
    {
        $visitorId = $this->requireVisitor();
        $query = $this->db->prepare(
            'SELECT reward_code, discount_percent, status, issued_at, email_sent_at, '
            . 'application_received_at, payment_requested_at, paid_at, activated_at '
            . 'FROM membership_rewards WHERE visitor_id = ? LIMIT 1'
        );
        $query->execute([$visitorId]);
        $reward = $query->fetch();
        $this->json(['reward' => $reward ? $this->publicMembershipReward($reward) : null]);
    }

    private function claimMembershipReward(): never
    {
        $visitorId = $this->requireVisitor();
        $this->requireCsrf();
        $passport = $this->db->prepare('SELECT payload FROM passport_state WHERE visitor_id = ? LIMIT 1');
        $passport->execute([$visitorId]);
        $payload = $passport->fetchColumn();
        $state = $payload ? json_decode((string) $payload, true) : null;
        $discovered = is_array($state) && isset($state['discovered']) && is_array($state['discovered'])
            ? array_values(array_unique(array_map('strval', $state['discovered'])))
            : [];
        $required = array_map(static fn(int $number): string => 'trail-' . $number, range(1, 12));
        if (array_diff($required, $discovered) !== []) {
            $this->json(['error' => 'Complete all 12 trail stops before claiming this offer.'], 422);
        }

        $profile = $this->db->prepare('SELECT first_name, email FROM visitor_profiles WHERE id = ? LIMIT 1');
        $profile->execute([$visitorId]);
        $visitor = $profile->fetch();
        if (!$visitor) $this->json(['error' => 'Visitor profile not found.'], 404);

        $existing = $this->db->prepare('SELECT * FROM membership_rewards WHERE visitor_id = ? LIMIT 1');
        $existing->execute([$visitorId]);
        $reward = $existing->fetch();
        if (!$reward) {
            do {
                $code = 'IJ26-' . strtoupper(bin2hex(random_bytes(4)));
                $duplicate = $this->db->prepare('SELECT 1 FROM membership_rewards WHERE reward_code = ? LIMIT 1');
                $duplicate->execute([$code]);
            } while ($duplicate->fetchColumn());
            $save = $this->db->prepare(
                "INSERT INTO membership_rewards (visitor_id, reward_code, discount_percent, status) VALUES (?, ?, 25, 'issued')"
            );
            $save->execute([$visitorId, $code]);
            $existing->execute([$visitorId]);
            $reward = $existing->fetch();
        }

        if (!$reward['email_sent_at']) {
            $membershipUrl = 'https://newaguthi.org.au/become-a-member/?reward=' . rawurlencode((string) $reward['reward_code']);
            $message = "Hi {$visitor['first_name']},\n\n"
                . "Congratulations on completing all 12 stops of the Yenya Cultural Trail.\n\n"
                . "Your 25% Newa Guthi Victoria membership offer code is: {$reward['reward_code']}\n\n"
                . "Complete the membership application here:\n{$membershipUrl}\n\n"
                . "Our team will contact you about payment and your trail certificate after receiving the form.\n\n"
                . "Newa Guthi Victoria";
            if (!$this->sendEmail((string) $visitor['email'], 'Your Yenya Trail membership reward', $message)) {
                $this->json(['error' => 'Your reward was saved, but the email could not be sent. Please try again.'], 503);
            }
            $sent = $this->db->prepare('UPDATE membership_rewards SET email_sent_at = UTC_TIMESTAMP() WHERE visitor_id = ?');
            $sent->execute([$visitorId]);
            $existing->execute([$visitorId]);
            $reward = $existing->fetch();
        }

        $this->json(['reward' => $this->publicMembershipReward($reward)]);
    }

    private function publicMembershipReward(array $reward): array
    {
        return [
            'code' => $reward['reward_code'],
            'discountPercent' => (int) $reward['discount_percent'],
            'status' => $reward['status'],
            'issuedAt' => $reward['issued_at'],
            'emailSentAt' => $reward['email_sent_at'],
            'applicationReceivedAt' => $reward['application_received_at'],
            'paymentRequestedAt' => $reward['payment_requested_at'],
            'paidAt' => $reward['paid_at'],
            'activatedAt' => $reward['activated_at'],
        ];
    }

    private function integrationMembershipApplication(): never
    {
        $this->requireIntegrationKey();
        $input = $this->body();
        $action = trim((string) ($input['action'] ?? 'verify'));
        $code = strtoupper($this->requiredText($input, 'code', 32));
        if (!preg_match('/^IJ26-[A-F0-9]{8}$/', $code)) {
            $this->json(['error' => 'Reward code not found'], 404);
        }

        $query = $this->db->prepare(
            'SELECT mr.id, mr.visitor_id, mr.reward_code, mr.discount_percent, mr.status, '
            . 'mr.application_received_at, vp.email '
            . 'FROM membership_rewards mr '
            . 'INNER JOIN visitor_profiles vp ON vp.id = mr.visitor_id '
            . 'WHERE mr.reward_code = ? LIMIT 1'
        );
        $query->execute([$code]);
        $reward = $query->fetch();
        if (!$reward) {
            $this->json(['error' => 'Reward code not found'], 404);
        }

        if ($action === 'verify') {
            $this->json([
                'verified' => true,
                'code' => $reward['reward_code'],
                'discountPercent' => (int) $reward['discount_percent'],
                'status' => $reward['status'],
            ]);
        }
        if ($action !== 'submit') {
            $this->json(['error' => 'Invalid integration action'], 422);
        }

        $email = $this->email($input['email'] ?? null);
        $submissionId = $this->requiredText($input, 'submissionId', 64);
        if (!hash_equals(mb_strtolower((string) $reward['email']), $email)) {
            $this->json(['error' => 'The reward code does not match this email address'], 422);
        }

        $update = $this->db->prepare(
            "UPDATE membership_rewards SET status = 'application_received', "
            . 'application_received_at = COALESCE(application_received_at, UTC_TIMESTAMP()), '
            . 'application_submission_id = ?, application_email = ? WHERE id = ?'
        );
        $update->execute([$submissionId, $email, $reward['id']]);

        $this->json([
            'verified' => true,
            'code' => $reward['reward_code'],
            'discountPercent' => (int) $reward['discount_percent'],
            'status' => 'application_received',
            'submissionId' => $submissionId,
        ]);
    }

    private function registerVolunteer(): never
    {
        $input = $this->body();
        $email = $this->email($input['email'] ?? null);
        $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $this->secret());
        $recent = $this->db->prepare(
            'SELECT COUNT(*) FROM volunteer_registrations WHERE requested_ip_hash = ? AND created_at >= (UTC_TIMESTAMP() - INTERVAL 15 MINUTE)'
        );
        $recent->execute([$ipHash]);
        if ((int) $recent->fetchColumn() >= 5) {
            $this->json(['error' => 'Too many registrations from this device. Please ask an organiser for help.'], 429);
        }

        $existing = $this->db->prepare('SELECT public_id, status FROM volunteer_registrations WHERE email = ? LIMIT 1');
        $existing->execute([$email]);
        $volunteer = $existing->fetch();
        if ($volunteer) {
            $this->json([
                'ok' => true,
                'reference' => $volunteer['public_id'],
                'status' => $volunteer['status'],
                'existing' => true,
            ]);
        }

        $publicId = bin2hex(random_bytes(16));
        $save = $this->db->prepare(
            'INSERT INTO volunteer_registrations '
            . '(public_id, first_name, last_name, email, phone, assistance_area, requested_ip_hash) '
            . 'VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $save->execute([
            $publicId,
            $this->requiredText($input, 'firstName', 120),
            $this->requiredText($input, 'lastName', 120),
            $email,
            $this->requiredText($input, 'phone', 40),
            $this->requiredText($input, 'assistanceArea', 160),
            $ipHash,
        ]);
        $this->json(['ok' => true, 'reference' => $publicId, 'status' => 'pending'], 201);
    }

    private function organiserRequest(): never
    {
        $visitorId = $this->requireVisitor();
        $query = $this->db->prepare(
            'SELECT id, assistance_area, message, status, reviewed_at, created_at, updated_at '
            . 'FROM organiser_requests WHERE visitor_id = ? LIMIT 1'
        );
        $query->execute([$visitorId]);
        $request = $query->fetch();
        $this->json(['request' => $request ? $this->publicOrganiserRequest($request) : null]);
    }

    private function requestOrganiserAccess(): never
    {
        $visitorId = $this->requireVisitor();
        $this->requireCsrf();
        $role = $this->db->prepare('SELECT 1 FROM organiser_users WHERE visitor_id = ? LIMIT 1');
        $role->execute([$visitorId]);
        if ($role->fetchColumn()) $this->json(['error' => 'You already have organiser access.'], 409);

        $input = $this->body();
        $area = $this->requiredText($input, 'assistanceArea', 160);
        $message = trim((string) ($input['message'] ?? ''));
        if (mb_strlen($message) > 500) $this->json(['error' => 'Message is too long.'], 422);
        $save = $this->db->prepare(
            "INSERT INTO organiser_requests (visitor_id, assistance_area, message, status) VALUES (?, ?, ?, 'pending') "
            . "ON DUPLICATE KEY UPDATE assistance_area = VALUES(assistance_area), message = VALUES(message), "
            . "status = 'pending', reviewed_by = NULL, reviewed_at = NULL"
        );
        $save->execute([$visitorId, $area, $message !== '' ? $message : null]);
        $this->organiserRequest();
    }

    private function organiserRequests(): never
    {
        $this->requireOrganiser();
        $query = $this->db->query(
            'SELECT r.id, r.assistance_area, r.message, r.status, r.reviewed_at, r.created_at, r.updated_at, '
            . 'v.first_name, v.last_name, v.email, v.phone '
            . 'FROM organiser_requests r JOIN visitor_profiles v ON v.id = r.visitor_id '
            . 'ORDER BY FIELD(r.status, "pending", "approved", "rejected"), r.created_at DESC'
        );
        $this->json(['requests' => array_map([$this, 'publicOrganiserRequest'], $query->fetchAll())]);
    }

    private function updateOrganiserRequest(int $id): never
    {
        $organiserId = $this->requireOrganiser();
        $this->requireCsrf();
        $action = $this->requiredText($this->body(), 'action', 16);
        if (!in_array($action, ['approve', 'reject'], true)) $this->json(['error' => 'Invalid request action.'], 422);
        $query = $this->db->prepare('SELECT * FROM organiser_requests WHERE id = ? LIMIT 1');
        $query->execute([$id]);
        $request = $query->fetch();
        if (!$request) $this->json(['error' => 'Access request not found.'], 404);
        if ($request['status'] !== 'pending') $this->json(['error' => 'This request has already been reviewed.'], 409);

        $this->db->beginTransaction();
        $status = $action === 'approve' ? 'approved' : 'rejected';
        $save = $this->db->prepare('UPDATE organiser_requests SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?');
        $save->execute([$status, $organiserId, $id]);
        if ($action === 'approve') {
            $grant = $this->db->prepare(
                "INSERT INTO organiser_users (visitor_id, role) VALUES (?, 'organiser') ON DUPLICATE KEY UPDATE role = VALUES(role)"
            );
            $grant->execute([$request['visitor_id']]);
            $clearRevocation = $this->db->prepare('DELETE FROM organiser_revocations WHERE visitor_id = ?');
            $clearRevocation->execute([$request['visitor_id']]);
        }
        $this->audit($organiserId, 'organiser_request.' . $action, 'organiser_request', (string) $id, null, $status);
        $this->db->commit();

        $query = $this->db->prepare(
            'SELECT r.id, r.assistance_area, r.message, r.status, r.reviewed_at, r.created_at, r.updated_at, '
            . 'v.first_name, v.last_name, v.email, v.phone FROM organiser_requests r '
            . 'JOIN visitor_profiles v ON v.id = r.visitor_id WHERE r.id = ? LIMIT 1'
        );
        $query->execute([$id]);
        $this->json(['request' => $this->publicOrganiserRequest($query->fetch())]);
    }

    private function organisers(): never
    {
        $organiserId = $this->requireOrganiser();
        $query = $this->db->query(
            'SELECT o.visitor_id, o.role, o.created_at, v.first_name, v.last_name, v.email, v.phone '
            . 'FROM organiser_users o JOIN visitor_profiles v ON v.id = o.visitor_id '
            . 'ORDER BY v.first_name, v.last_name, v.email'
        );
        $organisers = array_map(static fn(array $row): array => [
            'id' => (int) $row['visitor_id'],
            'firstName' => $row['first_name'],
            'lastName' => $row['last_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'role' => $row['role'],
            'createdAt' => $row['created_at'],
            'isCurrent' => (int) $row['visitor_id'] === $organiserId,
        ], $query->fetchAll());
        $this->json(['organisers' => $organisers]);
    }

    private function removeOrganiser(int $visitorId): never
    {
        $organiserId = $this->requireOrganiser();
        $this->requireCsrf();
        if ($visitorId === $organiserId) {
            $this->json(['error' => 'You cannot remove your own organiser access.'], 409);
        }

        $target = $this->db->prepare(
            'SELECT v.email FROM organiser_users o JOIN visitor_profiles v ON v.id = o.visitor_id '
            . 'WHERE o.visitor_id = ? LIMIT 1'
        );
        $target->execute([$visitorId]);
        $targetRow = $target->fetch();
        if (!$targetRow) $this->json(['error' => 'Organiser not found.'], 404);

        $count = (int) $this->db->query('SELECT COUNT(*) FROM organiser_users')->fetchColumn();
        if ($count <= 1) $this->json(['error' => 'The final organiser cannot be removed.'], 409);

        $this->db->beginTransaction();
        $revoke = $this->db->prepare(
            'INSERT INTO organiser_revocations (visitor_id, revoked_by) VALUES (?, ?) '
            . 'ON DUPLICATE KEY UPDATE revoked_by = VALUES(revoked_by), revoked_at = CURRENT_TIMESTAMP'
        );
        $revoke->execute([$visitorId, $organiserId]);
        $remove = $this->db->prepare('DELETE FROM organiser_users WHERE visitor_id = ?');
        $remove->execute([$visitorId]);
        $this->audit($organiserId, 'organiser.remove', 'visitor_profile', (string) $visitorId, $targetRow['email'], null);
        $this->db->commit();

        $this->json(['ok' => true]);
    }

    private function publicOrganiserRequest(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'firstName' => $row['first_name'] ?? null,
            'lastName' => $row['last_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'assistanceArea' => $row['assistance_area'],
            'message' => $row['message'] ?? '',
            'status' => $row['status'],
            'reviewedAt' => $row['reviewed_at'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    private function volunteers(): never
    {
        $this->requireOrganiser();
        $query = $this->db->query(
            'SELECT id, public_id, first_name, last_name, email, phone, assistance_area, status, '
            . 'sash_issued, badge_issued, radio_issued, other_items, sash_returned, badge_returned, '
            . 'radio_returned, other_items_returned, approved_at, checked_in_at, signed_off_at, created_at, updated_at '
            . 'FROM volunteer_registrations ORDER BY FIELD(status, "checked_in", "pending", "approved", "signed_off"), created_at ASC'
        );
        $this->json(['volunteers' => array_map([$this, 'publicVolunteer'], $query->fetchAll())]);
    }

    private function updateVolunteer(int $id): never
    {
        $organiserId = $this->requireOrganiser();
        $this->requireCsrf();
        $input = $this->body();
        $action = $this->requiredText($input, 'action', 32);
        $query = $this->db->prepare('SELECT * FROM volunteer_registrations WHERE id = ? LIMIT 1');
        $query->execute([$id]);
        $volunteer = $query->fetch();
        if (!$volunteer) $this->json(['error' => 'Volunteer not found'], 404);

        $before = json_encode($this->publicVolunteer($volunteer), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if ($action === 'approve') {
            if ($volunteer['status'] !== 'pending') $this->json(['error' => 'Only pending volunteers can be approved'], 409);
            $save = $this->db->prepare("UPDATE volunteer_registrations SET status = 'approved', approved_at = UTC_TIMESTAMP(), approved_by = ? WHERE id = ?");
            $save->execute([$organiserId, $id]);
        } elseif ($action === 'checkIn') {
            if (!in_array($volunteer['status'], ['approved', 'checked_in'], true)) $this->json(['error' => 'Approve this volunteer before checking them in'], 409);
            $otherItems = trim((string) ($input['otherItems'] ?? ''));
            if (mb_strlen($otherItems) > 500) $this->json(['error' => 'Other items are too long'], 422);
            $save = $this->db->prepare(
                "UPDATE volunteer_registrations SET status = 'checked_in', checked_in_at = COALESCE(checked_in_at, UTC_TIMESTAMP()), "
                . 'sash_issued = ?, badge_issued = ?, radio_issued = ?, other_items = ?, '
                . 'sash_returned = 0, badge_returned = 0, radio_returned = 0, other_items_returned = 0 WHERE id = ?'
            );
            $save->execute([
                !empty($input['sashIssued']) ? 1 : 0,
                !empty($input['badgeIssued']) ? 1 : 0,
                !empty($input['radioIssued']) ? 1 : 0,
                $otherItems !== '' ? $otherItems : null,
                $id,
            ]);
        } elseif ($action === 'returns') {
            if ($volunteer['status'] !== 'checked_in') $this->json(['error' => 'This volunteer is not checked in'], 409);
            $save = $this->db->prepare(
                'UPDATE volunteer_registrations SET sash_returned = ?, badge_returned = ?, radio_returned = ?, other_items_returned = ? WHERE id = ?'
            );
            $save->execute([
                !empty($input['sashReturned']) ? 1 : 0,
                !empty($input['badgeReturned']) ? 1 : 0,
                !empty($input['radioReturned']) ? 1 : 0,
                !empty($input['otherItemsReturned']) ? 1 : 0,
                $id,
            ]);
        } elseif ($action === 'signOff') {
            if ($volunteer['status'] !== 'checked_in') $this->json(['error' => 'This volunteer is not checked in'], 409);
            if (($volunteer['sash_issued'] && !$volunteer['sash_returned'])
                || ($volunteer['badge_issued'] && !$volunteer['badge_returned'])
                || ($volunteer['radio_issued'] && !$volunteer['radio_returned'])
                || ($volunteer['other_items'] && !$volunteer['other_items_returned'])) {
                $this->json(['error' => 'All issued items must be returned before sign-off'], 409);
            }
            $save = $this->db->prepare(
                "UPDATE volunteer_registrations SET status = 'signed_off', signed_off_at = UTC_TIMESTAMP(), signed_off_by = ? WHERE id = ?"
            );
            $save->execute([$organiserId, $id]);
        } else {
            $this->json(['error' => 'Invalid volunteer action'], 422);
        }

        $query->execute([$id]);
        $updated = $query->fetch();
        $after = json_encode($this->publicVolunteer($updated), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $this->audit($organiserId, 'volunteer.' . $action, 'volunteer', (string) $id, $before, $after);
        $this->json(['volunteer' => $this->publicVolunteer($updated)]);
    }

    private function publicVolunteer(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'reference' => $row['public_id'],
            'firstName' => $row['first_name'],
            'lastName' => $row['last_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'assistanceArea' => $row['assistance_area'],
            'status' => $row['status'],
            'sashIssued' => (bool) $row['sash_issued'],
            'badgeIssued' => (bool) $row['badge_issued'],
            'radioIssued' => (bool) $row['radio_issued'],
            'otherItems' => $row['other_items'] ?: '',
            'sashReturned' => (bool) $row['sash_returned'],
            'badgeReturned' => (bool) $row['badge_returned'],
            'radioReturned' => (bool) $row['radio_returned'],
            'otherItemsReturned' => (bool) $row['other_items_returned'],
            'approvedAt' => $row['approved_at'],
            'checkedInAt' => $row['checked_in_at'],
            'signedOffAt' => $row['signed_off_at'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    private function checkInSummary(): never
    {
        $this->requireOrganiser();
        $counts = $this->db->query(
            "SELECT COUNT(*) AS total, SUM(checked_in_at IS NOT NULL) AS checked_in FROM event_attendees WHERE event_id = 'indra-jatra-2026'"
        )->fetch();
        $recent = $this->db->query(
            "SELECT id, first_name, last_name, ticket_type, checked_in_at FROM event_attendees "
            . "WHERE event_id = 'indra-jatra-2026' AND checked_in_at IS NOT NULL ORDER BY checked_in_at DESC LIMIT 20"
        )->fetchAll();
        $total = (int) ($counts['total'] ?? 0);
        $checkedIn = (int) ($counts['checked_in'] ?? 0);
        $this->json([
            'total' => $total,
            'checkedIn' => $checkedIn,
            'remaining' => max(0, $total - $checkedIn),
            'recent' => array_map([$this, 'publicAttendee'], $recent),
        ]);
    }

    private function scanAttendee(): never
    {
        $organiserId = $this->requireOrganiser();
        $this->requireCsrf();
        $input = $this->body();
        $code = $this->requiredText($input, 'code', 2048);
        $hashes = $this->ticketCandidateHashes($code);
        $placeholders = implode(',', array_fill(0, count($hashes), '?'));
        $parameters = [...$hashes, ...$hashes, ...$hashes];

        $this->db->beginTransaction();
        $query = $this->db->prepare(
            "SELECT * FROM event_attendees WHERE ticket_code_hash IN ({$placeholders}) "
            . "OR source_attendee_id_hash IN ({$placeholders}) OR order_number_hash IN ({$placeholders}) FOR UPDATE"
        );
        $query->execute($parameters);
        $matches = $query->fetchAll();
        if (!$matches) {
            $this->db->rollBack();
            $this->json(['error' => 'Ticket not found in the imported Eventbrite list.'], 404);
        }
        if (count($matches) > 1) {
            $this->db->rollBack();
            $this->json(['error' => 'This order contains multiple attendees. Scan the individual attendee ticket.'], 409);
        }

        $attendee = $matches[0];
        if ($attendee['checked_in_at'] !== null) {
            $this->db->commit();
            $this->json(['status' => 'already_checked_in', 'attendee' => $this->publicAttendee($attendee)]);
        }
        $update = $this->db->prepare('UPDATE event_attendees SET checked_in_at = UTC_TIMESTAMP(), checked_in_by = ? WHERE id = ?');
        $update->execute([$organiserId, $attendee['id']]);
        $query = $this->db->prepare('SELECT * FROM event_attendees WHERE id = ? LIMIT 1');
        $query->execute([$attendee['id']]);
        $updated = $query->fetch();
        $this->audit(
            $organiserId,
            'attendee.check_in',
            'event_attendee',
            (string) $attendee['id'],
            null,
            json_encode($this->publicAttendee($updated), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
        );
        $this->db->commit();
        $this->json(['status' => 'checked_in', 'attendee' => $this->publicAttendee($updated)]);
    }

    private function ticketCandidateHashes(string $value): array
    {
        $candidates = [trim($value), mb_strtolower(trim($value))];
        $parts = parse_url(trim($value));
        if (is_array($parts)) {
            if (!empty($parts['path'])) $candidates[] = basename((string) $parts['path']);
            if (!empty($parts['query'])) {
                parse_str((string) $parts['query'], $query);
                foreach (['barcode', 'code', 'attendee_id', 'attendeeId'] as $key) {
                    if (!empty($query[$key]) && is_scalar($query[$key])) $candidates[] = trim((string) $query[$key]);
                }
            }
        }
        return array_values(array_unique(array_map(
            fn(string $candidate): string => hash_hmac('sha256', mb_strtolower($candidate), $this->secret()),
            array_filter($candidates, static fn(string $candidate): bool => $candidate !== '')
        )));
    }

    private function publicAttendee(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'firstName' => $row['first_name'],
            'lastName' => $row['last_name'],
            'ticketType' => $row['ticket_type'],
            'checkedInAt' => $row['checked_in_at'],
        ];
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

    private function requireIntegrationKey(): void
    {
        $provided = trim((string) ($_SERVER['HTTP_X_NGV_INTEGRATION_KEY'] ?? ''));
        $expected = trim((string) (getenv('IJ26_INTEGRATION_KEY') ?: ''));
        if ($provided === '' || strlen($expected) < 32 || !hash_equals($expected, $provided)) {
            $this->json(['error' => 'Integration access denied'], 403);
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
        $revoked = $this->db->prepare('SELECT 1 FROM organiser_revocations WHERE visitor_id = ? LIMIT 1');
        $revoked->execute([$visitorId]);
        if ($revoked->fetchColumn()) return;
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
