<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/config.php.example';
}

$config = require $configPath;

if (!is_array($config)) {
    json_response(500, [
        'ok' => false,
        'error' => 'Invalid API configuration.',
    ]);
}

if (!empty($config['cors_origin'])) {
    header('Access-Control-Allow-Origin: ' . $config['cors_origin']);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_method(string $expected): void
{
    $actual = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($actual !== strtoupper($expected)) {
        json_response(405, [
            'ok' => false,
            'error' => 'Method not allowed.',
        ]);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(400, [
            'ok' => false,
            'error' => 'Invalid JSON body.',
        ]);
    }

    return $decoded;
}

function db_connection(array $config): PDO
{
    $dbHost = trim((string) ($config['db_host'] ?? ''));
    $dbName = trim((string) ($config['db_name'] ?? ''));
    $dbUser = trim((string) ($config['db_user'] ?? ''));
    $dbPass = (string) ($config['db_pass'] ?? '');
    $dbPort = (int) ($config['db_port'] ?? 3306);

    if ($dbHost === '' || $dbName === '' || $dbUser === '') {
        json_response(500, [
            'ok' => false,
            'error' => 'Database configuration is incomplete.',
        ]);
    }

    try {
        return new PDO(
            sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $dbName),
            $dbUser,
            $dbPass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (Throwable $error) {
        json_response(500, [
            'ok' => false,
            'error' => 'Could not connect to database.',
        ]);
    }
}

function normalize_username(mixed $name): string
{
    return trim((string) $name);
}

function validate_username(string $name): bool
{
    if (strlen($name) < 3 || strlen($name) > 40) {
        return false;
    }

    return (bool) preg_match('/^[A-Za-z0-9_.-]+$/', $name);
}

function validate_password(string $password): bool
{
    return strlen($password) >= 8 && strlen($password) <= 120;
}

function normalize_avatar_url(mixed $value): ?string
{
    $url = trim((string) $value);
    if ($url === '') {
        return null;
    }
    return $url;
}

function validate_avatar_url(?string $url): bool
{
    if ($url === null) {
        return true;
    }

    if (strlen($url) > 512) {
        return false;
    }

    if (!preg_match('/^https?:\/\//i', $url)) {
        return false;
    }

    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

function extract_bearer_token(): ?string
{
    $header = null;

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }

    if (!is_string($header) || $header === '') {
        return null;
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }

    return trim($matches[1]);
}

function token_hash(string $token): string
{
    return hash('sha256', $token);
}

function users_support_avatar_url(PDO $db): bool
{
    static $supports = null;

    if (is_bool($supports)) {
        return $supports;
    }

    try {
        $query = $db->query("SHOW COLUMNS FROM users LIKE 'avatar_url'");
        $supports = (bool) $query->fetch();
    } catch (Throwable $error) {
        $supports = false;
    }

    return $supports;
}

function get_user_avatar_url(PDO $db, int $userId): ?string
{
    if (!users_support_avatar_url($db)) {
        return null;
    }

    $query = $db->prepare('SELECT avatar_url FROM users WHERE id = :user_id LIMIT 1');
    $query->execute([
        ':user_id' => $userId,
    ]);

    $row = $query->fetch();
    if (!$row) {
        return null;
    }

    return isset($row['avatar_url']) && $row['avatar_url'] !== null && $row['avatar_url'] !== ''
        ? (string) $row['avatar_url']
        : null;
}

function set_user_avatar_url(PDO $db, int $userId, ?string $avatarUrl): bool
{
    if (!users_support_avatar_url($db)) {
        return false;
    }

    $db->prepare('UPDATE users SET avatar_url = :avatar_url WHERE id = :user_id')
        ->execute([
            ':avatar_url' => $avatarUrl,
            ':user_id' => $userId,
        ]);

    return true;
}

function issue_auth_token(PDO $db, int $userId, int $ttlSeconds): string
{
    $token = bin2hex(random_bytes(32));
    $hash = token_hash($token);
    $expiresAt = gmdate('Y-m-d H:i:s', time() + max(3600, $ttlSeconds));

    $db->prepare('INSERT INTO user_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)')
        ->execute([
            ':user_id' => $userId,
            ':token_hash' => $hash,
            ':expires_at' => $expiresAt,
        ]);

    return $token;
}

function delete_expired_tokens_for_user(PDO $db, int $userId): void
{
    $db->prepare(
        'DELETE FROM user_tokens
         WHERE user_id = :user_id
           AND expires_at <= UTC_TIMESTAMP()'
    )->execute([
        ':user_id' => $userId,
    ]);
}

function find_user_id_by_token_hash(PDO $db, string $tokenHash): ?int
{
    $query = $db->prepare(
        'SELECT user_id
         FROM user_tokens
         WHERE token_hash = :token_hash
         LIMIT 1'
    );
    $query->execute([
        ':token_hash' => $tokenHash,
    ]);

    $row = $query->fetch();
    if (!$row || !isset($row['user_id'])) {
        return null;
    }

    return (int) $row['user_id'];
}

function require_auth(PDO $db): array
{
    $token = extract_bearer_token();
    if (!$token) {
        json_response(401, [
            'ok' => false,
            'error' => 'Missing token.',
        ]);
    }

    $query = $db->prepare(
        'SELECT u.id, u.name, t.id AS token_id
         FROM user_tokens t
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = :token_hash
           AND t.expires_at > UTC_TIMESTAMP()
         LIMIT 1'
    );
    $query->execute([
        ':token_hash' => token_hash($token),
    ]);

    $row = $query->fetch();
    if (!$row) {
        json_response(401, [
            'ok' => false,
            'error' => 'Session expired or invalid.',
        ]);
    }

    return [
        'token' => $token,
        'token_id' => (int) $row['token_id'],
        'user_id' => (int) $row['id'],
        'name' => (string) $row['name'],
    ];
}

function decode_json_or_null(?string $raw): mixed
{
    if ($raw === null || $raw === '') {
        return null;
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }

    return $decoded;
}
