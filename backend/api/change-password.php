<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$db = db_connection($config);
$auth = require_auth($db);
$payload = read_json_body();

$currentPassword = (string) ($payload['currentPassword'] ?? '');
$newPassword = (string) ($payload['newPassword'] ?? '');

if ($currentPassword === '' || $newPassword === '') {
    json_response(422, [
        'ok' => false,
        'error' => 'Current password and new password are required.',
    ]);
}

if (!validate_password($newPassword)) {
    json_response(422, [
        'ok' => false,
        'error' => 'New password must be 8-120 characters.',
    ]);
}

if (hash_equals($currentPassword, $newPassword)) {
    json_response(422, [
        'ok' => false,
        'error' => 'New password must be different from the current password.',
    ]);
}

$query = $db->prepare('SELECT password_hash FROM users WHERE id = :user_id LIMIT 1');
$query->execute([
    ':user_id' => $auth['user_id'],
]);
$user = $query->fetch();

if (!$user || !password_verify($currentPassword, (string) $user['password_hash'])) {
    json_response(401, [
        'ok' => false,
        'error' => 'Current password is incorrect.',
    ]);
}

$db->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :user_id')
    ->execute([
        ':password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        ':user_id' => $auth['user_id'],
    ]);

json_response(200, [
    'ok' => true,
    'data' => [
        'message' => 'Password updated successfully.',
    ],
]);
