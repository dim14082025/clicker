<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');

$r = lux_with_state(function (array &$state) use ($tg) {
    $user = lux_get_user($state, $tg, false);
    if (!$user) return ['error' => 'user not found'];
    $now = time();
    $last = !empty($user['lastDailyReward']) ? strtotime($user['lastDailyReward']) : 0;
    $elapsed = $last ? ($now - $last) : 0;
    if ($last && $elapsed < DAILY_REWARD_TIME) {
        return [
            'error' => json_encode([
                'nextClaimIn' => DAILY_REWARD_TIME - $elapsed,
                'score'       => (int)$user['score'],
            ]),
        ];
    }
    $user['score'] = (int)($user['score'] ?? 0) + DAILY_REWARD;
    $user['lastDailyReward'] = gmdate('c', $now);
    lux_save_user($state, $user);
    return ['score' => (int)$user['score'], 'reward' => DAILY_REWARD, 'nextClaimIn' => DAILY_REWARD_TIME];
});

if (isset($r['error'])) lux_fail($r['error']);
lux_ok($r);
