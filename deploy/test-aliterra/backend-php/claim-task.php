<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg     = (string)($b['telegram'] ?? '');
$taskId = (string)($b['taskId'] ?? '');
if (!isset(TASKS[$taskId])) lux_fail('unknown task');
$def = TASKS[$taskId];

$r = lux_with_state(function (array &$state) use ($tg, $taskId, $def) {
    $user = lux_get_user($state, $tg, false);
    if (!$user) return ['error' => 'user not found'];
    $claimed = is_array($user['claimedTasks'] ?? null) ? $user['claimedTasks'] : [];
    if (in_array($taskId, $claimed, true)) return ['error' => 'already claimed'];

    $progress = 0;
    if      ($taskId === 'click100') $progress = (int)($user['clicksToday']  ?? 0);
    else if ($taskId === 'login7')   $progress = (int)($user['loginDays']    ?? 0);
    else                              $progress = (int)($user['invitedCount'] ?? 0);

    if ($progress < $def['target']) return ['error' => 'not completed yet'];

    $user['score']        = (int)($user['score'] ?? 0) + (int)$def['reward'];
    $claimed[]            = $taskId;
    $user['claimedTasks'] = $claimed;
    lux_save_user($state, $user);
    return ['score' => (int)$user['score'], 'reward' => (int)$def['reward'], 'taskId' => $taskId];
});

if (isset($r['error'])) lux_fail($r['error']);
lux_ok($r);
