<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$db = db_connection($config);
$auth = require_auth($db);

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $query = $db->prepare('SELECT progress_json, lesson_loop_json, updated_at FROM user_profiles WHERE user_id = :user_id LIMIT 1');
    $query->execute([':user_id' => $auth['user_id']]);
    $profile = $query->fetch();

    json_response(200, [
        'ok' => true,
        'data' => [
            'progressData' => decode_json_or_null($profile['progress_json'] ?? null),
            'lessonLoop' => decode_json_or_null($profile['lesson_loop_json'] ?? null),
            'updatedAt' => $profile['updated_at'] ?? null,
        ],
    ]);
}

require_method('PUT');

$payload = read_json_body();
$progressData = $payload['progressData'] ?? null;
$lessonLoop = $payload['lessonLoop'] ?? null;

if (!is_array($progressData)) {
    json_response(422, [
        'ok' => false,
        'error' => 'progressData must be a JSON object.',
    ]);
}

if ($lessonLoop !== null && !is_array($lessonLoop)) {
    json_response(422, [
        'ok' => false,
        'error' => 'lessonLoop must be a JSON object when provided.',
    ]);
}

$statement = $db->prepare(
    'INSERT INTO user_profiles (user_id, progress_json, lesson_loop_json)
     VALUES (:user_id, :progress_json, :lesson_loop_json)
     ON DUPLICATE KEY UPDATE progress_json = VALUES(progress_json), lesson_loop_json = VALUES(lesson_loop_json), updated_at = CURRENT_TIMESTAMP'
);

$statement->execute([
    ':user_id' => $auth['user_id'],
    ':progress_json' => json_encode($progressData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ':lesson_loop_json' => $lessonLoop !== null
        ? json_encode($lessonLoop, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        : null,
]);

json_response(200, [
    'ok' => true,
    'data' => [
        'updatedAt' => gmdate('c'),
    ],
]);
