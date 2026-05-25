<?php
require __DIR__ . '/_lib.php';
$b = lux_read_body();
$wa = (string)($b['walletAddress'] ?? '');
$nftRaw = $b['nftMiners'] ?? null;
if ($wa === '') lux_fail('walletAddress required');

$nfts = [];
if ($nftRaw && $nftRaw !== '-') {
    $parsed = json_decode((string)$nftRaw, true);
    if (is_array($parsed)) $nfts = $parsed;
}

$result = lux_with_state(function (array &$state) use ($wa, $nfts) {
    $existing = $state['minersByWallet'][$wa] ?? [];
    $synced = !empty($nfts) ? lux_sync_miners($existing, $nfts) : $existing;
    $state['minersByWallet'][$wa] = $synced;
    return $synced;
});

lux_ok($result);
