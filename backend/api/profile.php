<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('GET');

$db = db_connection($config);
$auth = require_auth($db);

$query = $db->prepare('SELECT progress_json, lesson_loop_json, updated_at FROM user_profiles WHERE user_id = :user_id LIMIT 1');
$query->execute([':user_id' => $auth['user_id']]);
$profile = $query->fetch();

json_response(200, [
    'ok' => true,
    'data' => [
        'user' => [
            'id' => $auth['user_id'],
            'name' => $auth['name'],
        ],
        'progressData' => decode_json_or_null($profile['progress_json'] ?? null),
        'lessonLoop' => decode_json_or_null($profile['lesson_loop_json'] ?? null),
        'updatedAt' => $profile['updated_at'] ?? null,
    ],
]);
