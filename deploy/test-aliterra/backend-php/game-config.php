<?php
require __DIR__ . '/_lib.php';
$f = __DIR__ . '/miners-config.json';
if (!is_readable($f)) lux_fail('Config read error', 500);
$raw = file_get_contents($f);
if ($raw === false) lux_fail('Config read error', 500);
lux_ok($raw);
