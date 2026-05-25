<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');
if ($tg === '') lux_fail('telegram required');

$u = lux_with_state(function (array &$state) use ($tg): array {
    $user = lux_get_user($state, $tg, true);
    lux_touch_login($user);
    lux_save_user($state, $user);
    return $user;
});

lux_ok($u);
