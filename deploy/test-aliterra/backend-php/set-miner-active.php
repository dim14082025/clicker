<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$wa     = (string)($b['walletAddress'] ?? '');
$id     = (string)($b['minerId']       ?? '');
$idx    = (int)($b['minerIndex']        ?? -1);
$active = (bool)($b['active']          ?? false);

$r = lux_with_state(function (array &$state) use ($wa, $id, $idx, $active) {
    $groups = $state['minersByWallet'][$wa] ?? [];
    $found = false;
    foreach ($groups as &$g) {
        if ($g['tokenId'] === $id) {
            if (!isset($g['miners'][$idx])) return ['error' => 'miner not found'];
            $g['miners'][$idx]['isActive'] = $active;
            if ($active) $g['miners'][$idx]['lastTimeReset'] = gmdate('c');
            $found = true;
            break;
        }
    }
    unset($g);
    if (!$found) return ['error' => 'miner not found'];
    $state['minersByWallet'][$wa] = $groups;
    return $groups;
});

if (isset($r['error'])) lux_fail($r['error']);
lux_ok($r);
