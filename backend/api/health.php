<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$db = db_connection($config);
$db->query('SELECT 1');

json_response(200, [
    'ok' => true,
    'service' => 'any-ai-teacher-api',
    'time' => gmdate('c'),
]);
