<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$tg = (string)($b['telegram']      ?? '');
$wa = (string)($b['walletAddress'] ?? '');

$gained = lux_with_state(function (array &$state) use ($tg, $wa): int {
    $user = lux_get_user($state, $tg, false);
    if (!$user) return -1;
    $groups = $state['minersByWallet'][$wa] ?? [];
    $now = time();
    $gain = 0;
    foreach ($groups as &$g) {
        $tokenIdInt = (int)$g['tokenId'];
        $perDay = MINERS_STATS[$tokenIdInt] ?? 0;
        foreach ($g['miners'] as &$m) {
            if (empty($m['isActive'])) continue;
            $last = !empty($m['lastTimeReset']) ? strtotime($m['lastTimeReset']) : $now;
            $elapsed = ($now - $last) / 86400.0;
            $gain += (int)floor($perDay * $elapsed);
            $m['lastTimeReset'] = gmdate('c', $now);
        }
        unset($m);
    }
    unset($g);
    $state['minersByWallet'][$wa] = $groups;
    if ($gain > 0) {
        $user['score'] = (int)($user['score'] ?? 0) + $gain;
        lux_save_user($state, $user);
    }
    return $gain;
});

if ($gained === -1) lux_fail('user not found');
lux_ok($gained);
