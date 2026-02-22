<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('PUT');

$db = db_connection($config);
$auth = require_auth($db);
$payload = read_json_body();

$name = normalize_username($payload['name'] ?? $auth['name']);
if (!validate_username($name)) {
    json_response(422, [
        'ok' => false,
        'error' => 'Name must be 3-40 characters and contain only letters, numbers, dot, underscore, or hyphen.',
    ]);
}

$avatarUrl = normalize_avatar_url($payload['avatarUrl'] ?? null);
if (!validate_avatar_url($avatarUrl)) {
    json_response(422, [
        'ok' => false,
        'error' => 'Profile image URL must be empty or a valid http/https URL (max 512 chars).',
    ]);
}

$nameChanged = $name !== (string) $auth['name'];
if ($nameChanged) {
    $existing = $db->prepare('SELECT id FROM users WHERE name = :name AND id <> :user_id LIMIT 1');
    $existing->execute([
        ':name' => $name,
        ':user_id' => $auth['user_id'],
    ]);
    if ($existing->fetch()) {
        json_response(409, [
            'ok' => false,
            'error' => 'This user name is already taken.',
        ]);
    }
}

if (!set_user_avatar_url($db, $auth['user_id'], $avatarUrl)) {
    json_response(409, [
        'ok' => false,
        'error' => 'Database migration required: add users.avatar_url column before saving profile image.',
    ]);
}

$db->prepare('UPDATE users SET name = :name WHERE id = :user_id')
    ->execute([
        ':name' => $name,
        ':user_id' => $auth['user_id'],
    ]);

json_response(200, [
    'ok' => true,
    'data' => [
        'user' => [
            'id' => $auth['user_id'],
            'name' => $name,
            'avatarUrl' => get_user_avatar_url($db, $auth['user_id']),
        ],
    ],
]);
