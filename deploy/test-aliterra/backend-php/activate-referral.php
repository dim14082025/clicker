<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg   = (string)($b['telegram'] ?? '');
$code = strtoupper(trim((string)($b['code'] ?? '')));
if ($code === '') lux_fail('code required');

$r = lux_with_state(function (array &$state) use ($tg, $code) {
    $user = lux_get_user($state, $tg, true);
    if (!empty($user['invitedBy'])) return ['error' => 'already activated'];
    if (($user['referralCode'] ?? '') === $code) return ['error' => 'cannot use your own code'];
    $inviter = null;
    foreach ($state['users'] as &$candidate) {
        if (($candidate['referralCode'] ?? '') === $code) { $inviter = &$candidate; break; }
    }
    unset($candidate);
    if (!$inviter) return ['error' => 'invalid code'];

    $user['invitedBy']    = $inviter['telegram'];
    $inviter['invitedCount'] = (int)($inviter['invitedCount'] ?? 0) + 1;
    $inviter['score']     = (int)($inviter['score'] ?? 0) + REFERRAL_BONUS;
    lux_save_user($state, $user);
    return ['invitedBy' => $inviter['telegram'], 'bonusAwarded' => REFERRAL_BONUS];
});

if (isset($r['error'])) lux_fail($r['error']);
lux_ok($r);
