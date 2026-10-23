<?php
/**
 * Hospitality Minds portfolio — enquiry form handler.
 *
 * Accepts POSTs from the site's enquiry forms, validates them, and emails the
 * team with PHP mail(). Responds with JSON when the request asks for it (the
 * JavaScript form) and with a redirect / plain HTML page otherwise (no-JS).
 * The site only shows "thank you" when this script returns { "ok": true },
 * which happens only after mail() reports the message was accepted.
 *
 * Requirements: PHP 7.4+ with a working mail() transport. If the host requires
 * SMTP, replace send_enquiry() with PHPMailer/SMTP — see README.md.
 */

declare(strict_types=1);

// ---- Configuration ----------------------------------------------------------
const RECIPIENTS     = ['nilesh@hospitalityminds.com', 'bdm@hospitalityminds.com'];
// Must be an address on a domain this server is allowed to send for (SPF/DKIM),
// otherwise mail is likely to be rejected or filtered as spam.
const FROM_ADDRESS   = 'no-reply@hospitalitymindsportfolio.com';
const FROM_NAME      = 'Hospitality Minds Portfolio';
const THANK_YOU_URL  = '/thank-you/';
const RATE_LIMIT     = 5;     // submissions per IP address…
const RATE_WINDOW    = 3600;  // …per this many seconds
const MIN_FILL_MS    = 3000;  // faster than this is treated as a bot

// ---- Helpers ------------------------------------------------------------------
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(int $status, array $data, bool $json): void
{
    http_response_code($status);
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    if (!empty($data['ok'])) {
        header('Location: ' . THANK_YOU_URL, true, 303);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $msg = htmlspecialchars($data['message'] ?? 'Your enquiry could not be sent.', ENT_QUOTES, 'UTF-8');
    $list = '';
    foreach (($data['errors'] ?? []) as $e) {
        $list .= '<li>' . htmlspecialchars($e, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    echo "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
       . "<title>Enquiry not sent</title><body style=\"font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.6\">"
       . "<h1>Your enquiry was not sent</h1><p>{$msg}</p>" . ($list ? "<ul>{$list}</ul>" : '')
       . "<p><a href=\"javascript:history.back()\">Go back to the form</a> or email <a href=\"mailto:nilesh@hospitalityminds.com\">nilesh@hospitalityminds.com</a>.</p></body></html>";
    exit;
}

function field(string $key, int $max = 500): string
{
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = trim(strip_tags($v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/** Strip characters that could inject extra mail headers. */
function header_safe(string $v): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v) ?? '');
}

function rate_limited(string $ip): bool
{
    $file = rtrim(sys_get_temp_dir(), '/\\') . '/hm-enquiry-' . sha1($ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $hits = json_decode((string) file_get_contents($file), true) ?: [];
    }
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
    if (count($hits) >= RATE_LIMIT) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return false;
}

function send_enquiry(array $d): bool
{
    $subject = 'Portfolio enquiry — ' . header_safe($d['name']) . ($d['property'] ? ' (' . header_safe($d['property']) . ')' : '');
    $lines = [
        'New enquiry from the Hospitality Minds portfolio website',
        str_repeat('-', 56),
        'Name:          ' . $d['name'],
        'Email:         ' . $d['email'],
        'Phone:         ' . ($d['phone'] ?: '—'),
        'Property:      ' . ($d['property'] ?: '—'),
        'Property type: ' . ($d['property_type'] ?: '—'),
        'Location:      ' . ($d['location'] ?: '—'),
        'Interested in: ' . ($d['services'] ? implode(', ', $d['services']) : '—'),
        '',
        'Message:',
        $d['message'],
        '',
        str_repeat('-', 56),
        'Sent from page: ' . ($d['page'] ?: '—'),
        'Submitted:      ' . gmdate('Y-m-d H:i') . ' UTC',
    ];
    $headers = [
        'From: ' . FROM_NAME . ' <' . FROM_ADDRESS . '>',
        'Reply-To: ' . header_safe($d['name']) . ' <' . $d['email'] . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return mail(implode(', ', RECIPIENTS), $encodedSubject, implode("\n", $lines), implode("\r\n", $headers), '-f' . FROM_ADDRESS);
}

// ---- Request handling ---------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Method not allowed.'], $wantsJson);
}

// Honeypot: real visitors never see this field. Drop silently.
if (field('company_website') !== '') {
    respond(200, ['ok' => true], $wantsJson);
}

$data = [
    'name'          => field('name', 120),
    'email'         => field('email', 160),
    'phone'         => field('phone', 24),
    'property'      => field('property', 160),
    'property_type' => field('property_type', 80),
    'location'      => field('location', 120),
    'message'       => field('message', 4000),
    'page'          => field('page', 200),
    'services'      => [],
];
foreach ((array) ($_POST['services'] ?? []) as $s) {
    if (is_string($s) && $s !== '' && count($data['services']) < 12) {
        $data['services'][] = substr(trim(strip_tags($s)), 0, 80);
    }
}

$errors = [];
if ((function_exists('mb_strlen') ? mb_strlen($data['name']) : strlen($data['name'])) < 2) {
    $errors['name'] = 'Please enter your name.';
}
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL) || header_safe($data['email']) !== $data['email']) {
    $errors['email'] = 'Please enter a valid email address.';
}
if ($data['phone'] !== '' && !preg_match('/^[0-9+()\-\s]{7,24}$/', $data['phone'])) {
    $errors['phone'] = 'Please enter a valid phone number.';
}
if ((function_exists('mb_strlen') ? mb_strlen($data['message']) : strlen($data['message'])) < 10) {
    $errors['message'] = 'Please tell us a little about the project (at least 10 characters).';
}
$started = (int) ($_POST['started'] ?? 0);
if ($started > 0 && (microtime(true) * 1000 - $started) < MIN_FILL_MS) {
    $errors['message'] = 'Please wait a moment before sending.';
}

if ($errors) {
    respond(422, ['ok' => false, 'errors' => $errors, 'message' => 'Please check the highlighted fields.'], $wantsJson);
}

if (rate_limited($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    respond(429, ['ok' => false, 'message' => 'Too many enquiries from this connection. Please try again later or call us.'], $wantsJson);
}

if (!send_enquiry($data)) {
    error_log('[hm-portfolio] mail() failed for enquiry from ' . $data['email']);
    respond(502, ['ok' => false, 'message' => 'Our mail server could not deliver your message.'], $wantsJson);
}

respond(200, ['ok' => true], $wantsJson);
