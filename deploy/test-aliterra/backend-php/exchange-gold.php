<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');
$gems = (int)floor((float)($b['gems'] ?? 0));

$r = lux_with_state(function (array &$state) use ($tg, $gems) {
    $user = lux_get_user($state, $tg, false);
    if (!$user) return ['error' => 'user not found'];
    if ($gems < EXCHANGE_RATE) return ['error' => 'minimum 1000 gems'];
    if ((int)$user['score'] < $gems) return ['error' => 'insufficient gems'];
    $exchanged = (int)floor($gems / EXCHANGE_RATE);
    $user['score'] -= $exchanged * EXCHANGE_RATE;
    $user['gold']  += $exchanged;
    lux_save_user($state, $user);
    return ['score' => (int)$user['score'], 'gold' => (int)$user['gold'], 'exchanged' => $exchanged];
});

if (isset($r['error'])) lux_fail($r['error']);
lux_ok($r);
