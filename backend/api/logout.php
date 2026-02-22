<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$db = db_connection($config);
$token = extract_bearer_token();

if ($token) {
    $tokenHash = token_hash($token);
    $userId = find_user_id_by_token_hash($db, $tokenHash);

    $db->prepare('DELETE FROM user_tokens WHERE token_hash = :token_hash')->execute([
        ':token_hash' => $tokenHash,
    ]);

    if ($userId !== null) {
        delete_expired_tokens_for_user($db, $userId);
    }
}

json_response(200, [
    'ok' => true,
]);
