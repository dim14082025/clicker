<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');
$score = (int)($b['score'] ?? 0);
$clicksDelta = max(0, (int)($b['clicksDelta'] ?? 0));

$r = lux_with_state(function (array &$state) use ($tg, $score, $clicksDelta) {
    $user = lux_get_user($state, $tg, false);
    if (!$user) return null;
    $user['score'] = $score;
    if ($clicksDelta > 0) {
        $today = lux_today_str();
        if (($user['clicksDate'] ?? null) !== $today) {
            $user['clicksToday'] = 0;
            $user['clicksDate']  = $today;
        }
        $user['clicksToday'] = (int)($user['clicksToday'] ?? 0) + $clicksDelta;
    }
    lux_save_user($state, $user);
    return ['telegram' => $tg, 'score' => $score];
});

if ($r === null) lux_fail('user not found');
lux_ok($r);
