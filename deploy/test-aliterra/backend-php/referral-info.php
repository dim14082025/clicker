<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram'] ?? '');

$r = lux_with_state(function (array &$state) use ($tg) {
    $user = lux_get_user($state, $tg, true);
    if (empty($user['referralCode'])) $user['referralCode'] = lux_make_ref_code($tg);
    lux_save_user($state, $user);
    return [
        'code'           => $user['referralCode'],
        'invitedCount'   => (int)($user['invitedCount'] ?? 0),
        'invitedBy'      => $user['invitedBy'] ?? null,
        'bonusPerInvite' => REFERRAL_BONUS,
    ];
});

lux_ok($r);
