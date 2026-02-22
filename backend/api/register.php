<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$payload = read_json_body();
$name = normalize_username($payload['name'] ?? '');
$password = (string) ($payload['password'] ?? '');

if (!validate_username($name)) {
    json_response(422, [
        'ok' => false,
        'error' => 'Name must be 3-40 characters and contain only letters, numbers, dot, underscore, or hyphen.',
    ]);
}

if (!validate_password($password)) {
    json_response(422, [
        'ok' => false,
        'error' => 'Password must be 8-120 characters.',
    ]);
}

$db = db_connection($config);

$existing = $db->prepare('SELECT id FROM users WHERE name = :name LIMIT 1');
$existing->execute([':name' => $name]);
if ($existing->fetch()) {
    json_response(409, [
        'ok' => false,
        'error' => 'This user name already exists.',
    ]);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$db->beginTransaction();
try {
    $db->prepare('INSERT INTO users (name, password_hash) VALUES (:name, :password_hash)')
        ->execute([
            ':name' => $name,
            ':password_hash' => $passwordHash,
        ]);

    $userId = (int) $db->lastInsertId();
    $db->prepare('INSERT INTO user_profiles (user_id, progress_json, lesson_loop_json) VALUES (:user_id, NULL, NULL)')
        ->execute([
            ':user_id' => $userId,
        ]);

    $token = issue_auth_token($db, $userId, (int) ($config['token_ttl_seconds'] ?? 2592000));
    $db->commit();
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    json_response(500, [
        'ok' => false,
        'error' => 'Could not create account.',
    ]);
}

json_response(201, [
    'ok' => true,
    'data' => [
        'token' => $token,
        'user' => [
            'id' => $userId,
            'name' => $name,
        ],
    ],
]);
