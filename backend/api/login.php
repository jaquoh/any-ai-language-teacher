<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$payload = read_json_body();
$name = normalize_username($payload['name'] ?? '');
$password = (string) ($payload['password'] ?? '');

if (!validate_username($name) || !validate_password($password)) {
    json_response(422, [
        'ok' => false,
        'error' => 'Invalid login input.',
    ]);
}

$db = db_connection($config);
$query = $db->prepare('SELECT id, name, password_hash FROM users WHERE name = :name LIMIT 1');
$query->execute([':name' => $name]);
$user = $query->fetch();

if (!$user || !password_verify($password, (string) $user['password_hash'])) {
    json_response(401, [
        'ok' => false,
        'error' => 'Invalid name or password.',
    ]);
}

$userId = (int) $user['id'];
delete_expired_tokens_for_user($db, $userId);
$token = issue_auth_token($db, $userId, (int) ($config['token_ttl_seconds'] ?? 2592000));

json_response(200, [
    'ok' => true,
    'data' => [
        'token' => $token,
        'user' => [
            'id' => $userId,
            'name' => (string) $user['name'],
        ],
    ],
]);
