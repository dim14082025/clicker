<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');

$r = lux_with_state(function (array &$state) use ($tg) {
    $user = lux_get_user($state, $tg, true);
    $claimed = is_array($user['claimedTasks'] ?? null) ? $user['claimedTasks'] : [];
    $tasks = [
        [
            'id' => TASKS['click100']['id'], 'label' => 'Click 100 times today',
            'progress' => min((int)$user['clicksToday'], TASKS['click100']['target']),
            'target' => TASKS['click100']['target'], 'reward' => TASKS['click100']['reward'],
            'claimed' => in_array(TASKS['click100']['id'], $claimed, true),
        ],
        [
            'id' => TASKS['login7']['id'], 'label' => 'Login 7 days in a row',
            'progress' => min((int)$user['loginDays'], TASKS['login7']['target']),
            'target' => TASKS['login7']['target'], 'reward' => TASKS['login7']['reward'],
            'claimed' => in_array(TASKS['login7']['id'], $claimed, true),
        ],
        [
            'id' => TASKS['invite1']['id'], 'label' => 'Invite 1 friend',
            'progress' => min((int)$user['invitedCount'], TASKS['invite1']['target']),
            'target' => TASKS['invite1']['target'], 'reward' => TASKS['invite1']['reward'],
            'claimed' => in_array(TASKS['invite1']['id'], $claimed, true),
        ],
        [
            'id' => TASKS['invite3']['id'], 'label' => 'Invite 3 friends',
            'progress' => min((int)$user['invitedCount'], TASKS['invite3']['target']),
            'target' => TASKS['invite3']['target'], 'reward' => TASKS['invite3']['reward'],
            'claimed' => in_array(TASKS['invite3']['id'], $claimed, true),
        ],
        [
            'id' => TASKS['invite5']['id'], 'label' => 'Invite 5 friends',
            'progress' => min((int)$user['invitedCount'], TASKS['invite5']['target']),
            'target' => TASKS['invite5']['target'], 'reward' => TASKS['invite5']['reward'],
            'claimed' => in_array(TASKS['invite5']['id'], $claimed, true),
        ],
    ];
    lux_save_user($state, $user);
    return ['tasks' => $tasks, 'score' => (int)$user['score']];
});

lux_ok($r);
