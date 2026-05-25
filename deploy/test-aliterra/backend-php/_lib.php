<?php
// LUX Clicker — shared library for /api/v2/*.php endpoints.
// Provides JSON-file-backed storage with flock(), CORS headers, helpers.
// Works on any PHP 7.0+ host. No extensions required.

declare(strict_types=1);

// ----- CORS / Content-Type -------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----- Constants -----------------------------------------------------------
const MINERS_STATS      = [4 => 30000, 5 => 70000, 6 => 150000, 7 => 350000];
const DAILY_REWARD      = 5000;
const DAILY_REWARD_TIME = 60 * 60 * 3;
const EXCHANGE_RATE     = 1000;
const REFERRAL_BONUS    = 50000;

const TASKS = [
    'click100' => ['id' => 'click100', 'reward' => 500,    'target' => 100],
    'login7'   => ['id' => 'login7',   'reward' => 2000,   'target' => 7],
    'invite1'  => ['id' => 'invite1',  'reward' => 50000,  'target' => 1],
    'invite3'  => ['id' => 'invite3',  'reward' => 200000, 'target' => 3],
    'invite5'  => ['id' => 'invite5',  'reward' => 350000, 'target' => 5],
];

// ----- Helpers -------------------------------------------------------------

function lux_ok($data): void {
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_SLASHES);
    exit;
}

function lux_fail(string $msg, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'data' => $msg], JSON_UNESCAPED_SLASHES);
    exit;
}

function lux_read_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

function lux_today_str(): string { return gmdate('Y-m-d'); }

function lux_yesterday_str(): string { return gmdate('Y-m-d', time() - 86400); }

function lux_make_ref_code(string $telegram): string {
    $h = 5381;
    $len = strlen($telegram);
    for ($i = 0; $i < $len; $i++) {
        $h = ((($h << 5) + $h) + ord($telegram[$i])) & 0xFFFFFFFF;
    }
    // Normalize to unsigned 32-bit, take modulo 0xFFFFFF, base36-pad to 5 chars
    $u = $h & 0x7FFFFFFF;
    $code = strtoupper(str_pad(base_convert((string)($u % 0xFFFFFF), 10, 36), 5, '0', STR_PAD_LEFT));
    return 'LUX-' . $code;
}

function lux_new_user(string $telegram): array {
    return [
        'telegram'        => $telegram,
        'score'           => 0,
        'lastDailyReward' => null,
        'gold'            => 0,
        'referralCode'    => lux_make_ref_code($telegram),
        'invitedBy'       => null,
        'invitedCount'    => 0,
        'clicksToday'     => 0,
        'clicksDate'      => null,
        'loginDays'       => 0,
        'lastLoginDate'   => null,
        'claimedTasks'    => [],
    ];
}

function lux_data_file(): string {
    // Store JSON next to /api/v2/*.php files. Writable by the PHP-FPM user.
    return __DIR__ . '/data.json';
}

/**
 * Open the data file for read+write under an exclusive lock, give the caller
 * a chance to mutate $state, then write back atomically. The closure receives
 * the parsed state by reference; whatever's in it at return time is persisted.
 */
function lux_with_state(callable $fn) {
    $file = lux_data_file();
    if (!file_exists($file)) {
        file_put_contents($file, json_encode(['users' => new stdClass(), 'minersByWallet' => new stdClass()]));
        @chmod($file, 0664);
    }
    $fh = fopen($file, 'c+');
    if ($fh === false) lux_fail('storage open error', 500);
    if (!flock($fh, LOCK_EX)) { fclose($fh); lux_fail('storage lock error', 500); }
    $raw = stream_get_contents($fh);
    $state = json_decode($raw ?: '{}', true);
    if (!is_array($state)) $state = [];
    if (!isset($state['users']) || !is_array($state['users'])) $state['users'] = [];
    if (!isset($state['minersByWallet']) || !is_array($state['minersByWallet'])) $state['minersByWallet'] = [];

    try {
        $result = $fn($state);
        // Persist
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($state, JSON_UNESCAPED_SLASHES));
        fflush($fh);
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
    return $result;
}

function lux_touch_login(array &$user): void {
    $today = lux_today_str();
    if (($user['lastLoginDate'] ?? null) !== $today) {
        $user['loginDays'] = (($user['lastLoginDate'] ?? null) === lux_yesterday_str())
            ? (int)($user['loginDays'] ?? 0) + 1
            : 1;
        $user['lastLoginDate'] = $today;
    }
    if (($user['clicksDate'] ?? null) !== $today) {
        $user['clicksToday'] = 0;
        $user['clicksDate']  = $today;
    }
}

function lux_get_user(array &$state, string $telegram, bool $create = true): ?array {
    if (!isset($state['users'][$telegram])) {
        if (!$create) return null;
        $state['users'][$telegram] = lux_new_user($telegram);
    }
    if (empty($state['users'][$telegram]['referralCode'])) {
        $state['users'][$telegram]['referralCode'] = lux_make_ref_code($telegram);
    }
    return $state['users'][$telegram];
}

function lux_save_user(array &$state, array $user): void {
    $state['users'][$user['telegram']] = $user;
}

function lux_sync_miners(array $existing, array $nfts): array {
    $now = gmdate('c');
    $out = [];
    foreach ($nfts as $nft) {
        if (($nft['count'] ?? 0) === 0) continue;
        $tokenId = (string)$nft['tokenId'];
        $count   = (int)$nft['count'];
        $ex = null;
        foreach ($existing as $g) if ($g['tokenId'] === $tokenId) { $ex = $g; break; }
        if ($ex) {
            $cur = count($ex['miners']);
            if ($count < $cur) {
                $out[] = ['tokenId' => $tokenId, 'miners' => array_slice($ex['miners'], 0, $count)];
            } elseif ($count > $cur) {
                $extra = [];
                for ($i = 0; $i < $count - $cur; $i++) $extra[] = ['isActive' => false, 'lastTimeReset' => $now];
                $out[] = ['tokenId' => $tokenId, 'miners' => array_merge($ex['miners'], $extra)];
            } else {
                $out[] = $ex;
            }
        } else {
            $miners = [];
            for ($i = 0; $i < $count; $i++) $miners[] = ['isActive' => false, 'lastTimeReset' => $now];
            $out[] = ['tokenId' => $tokenId, 'miners' => $miners];
        }
    }
    return $out;
}
