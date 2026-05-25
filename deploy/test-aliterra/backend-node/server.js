// LUX Clicker — standalone backend server (mock/in-memory game state, with JSON persistence).
//
// All endpoints live under /api/v2/*. Mirrors the Vite dev-mode mock backend
// in lux-preview/vite.config.ts. Data is persisted to `data.json` on every
// mutation so a restart doesn't wipe player progress.
//
// Run:   PORT=3001 node server.js
// Behind nginx: proxy /api/v2/ → http://127.0.0.1:3001/api/v2/

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3001);
const DATA_FILE   = process.env.DATA_FILE   ?? path.resolve(__dirname, "data.json");
const MINERS_FILE = process.env.MINERS_FILE ?? path.resolve(__dirname, "miners-config.json");

const MINERS_STATS = { 4: 30_000, 5: 70_000, 6: 150_000, 7: 350_000 };
const DAILY_REWARD = 5000;
const DAILY_REWARD_TIME = 60 * 60 * 3;
const EXCHANGE_RATE = 1000;
const REFERRAL_BONUS = 50_000;

const TASKS = {
  click100: { id: "click100", reward: 500,    target: 100 },
  login7:   { id: "login7",   reward: 2000,   target: 7   },
  invite1:  { id: "invite1",  reward: 50000,  target: 1   },
  invite3:  { id: "invite3",  reward: 200000, target: 3   },
  invite5:  { id: "invite5",  reward: 350000, target: 5   },
};

/* ─── Persistence ─────────────────────────────────────────── */

/** @type {Map<string, any>} */ const users = new Map();
/** @type {Map<string, any[]>} */ const minersByWallet = new Map();

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const j = JSON.parse(raw);
    for (const [k, v] of Object.entries(j.users ?? {})) users.set(k, v);
    for (const [k, v] of Object.entries(j.minersByWallet ?? {})) minersByWallet.set(k, v);
    console.log(`[lux-backend] loaded ${users.size} users, ${minersByWallet.size} miner wallets`);
  } catch {
    console.log(`[lux-backend] no data file at ${DATA_FILE} — starting fresh`);
  }
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const j = {
      users:          Object.fromEntries(users),
      minersByWallet: Object.fromEntries(minersByWallet),
    };
    try {
      fs.writeFileSync(DATA_FILE + ".tmp", JSON.stringify(j));
      fs.renameSync(DATA_FILE + ".tmp", DATA_FILE);
    } catch (e) {
      console.error("[lux-backend] save error", e);
    }
  }, 500);
}

load();
process.on("SIGINT",  () => { if (saveTimer) clearTimeout(saveTimer); save(); process.exit(0); });
process.on("SIGTERM", () => { if (saveTimer) clearTimeout(saveTimer); save(); process.exit(0); });

/* ─── Helpers ─────────────────────────────────────────────── */

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

function makeRefCode(telegram) {
  let h = 5381;
  const s = String(telegram);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `LUX-${(Math.abs(h) % 0xffffff).toString(36).toUpperCase().padStart(5, "0")}`;
}

function newUser(telegram) {
  return {
    telegram: String(telegram), score: 0, lastDailyReward: null, gold: 0,
    referralCode: makeRefCode(telegram), invitedBy: null, invitedCount: 0,
    clicksToday: 0, clicksDate: null,
    loginDays: 0, lastLoginDate: null,
    claimedTasks: [],
  };
}

function ok(res, data) { res.json({ success: true, data }); }
function fail(res, msg, status = 400) { res.status(status).json({ success: false, data: msg }); }

function syncMiners(existing, nfts) {
  const now = new Date().toISOString();
  const out = [];
  for (const nft of nfts) {
    if (nft.count === 0) continue;
    const ex = existing.find((g) => g.tokenId === nft.tokenId);
    if (ex) {
      if (nft.count < ex.miners.length) out.push({ tokenId: nft.tokenId, miners: ex.miners.slice(0, nft.count) });
      else if (nft.count > ex.miners.length) {
        const extra = Array.from({ length: nft.count - ex.miners.length }, () => ({ isActive: false, lastTimeReset: now }));
        out.push({ tokenId: nft.tokenId, miners: [...ex.miners, ...extra] });
      } else out.push(ex);
    } else {
      out.push({ tokenId: nft.tokenId, miners: Array.from({ length: nft.count }, () => ({ isActive: false, lastTimeReset: now })) });
    }
  }
  return out;
}

/* ─── App ─────────────────────────────────────────────────── */

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "32kb" }));

// Health check
app.get("/api/v2/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Game config (miners list, prices, etc.) — file-backed
app.post("/api/v2/game-config", (_req, res) => {
  try {
    const raw = fs.readFileSync(MINERS_FILE, "utf8");
    return ok(res, raw);
  } catch (e) {
    return fail(res, "Config read error");
  }
});

// User profile + daily login streak tick
app.post("/api/v2/user", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  if (!tg) return fail(res, "telegram required");
  let u = users.get(tg);
  if (!u) { u = newUser(tg); users.set(tg, u); }
  if (!u.referralCode) u.referralCode = makeRefCode(tg);
  const today = todayStr();
  if (u.lastLoginDate !== today) {
    u.loginDays = u.lastLoginDate === yesterdayStr() ? u.loginDays + 1 : 1;
    u.lastLoginDate = today;
  }
  if (u.clicksDate !== today) { u.clicksToday = 0; u.clicksDate = today; }
  save();
  return ok(res, u);
});

// Persist gem score (and bump today's click counter)
app.post("/api/v2/save-score", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const score = Number(req.body?.score ?? 0);
  const clicksDelta = Math.max(0, Number(req.body?.clicksDelta ?? 0));
  const u = users.get(tg);
  if (!u) return fail(res, "user not found");
  u.score = score;
  if (clicksDelta > 0) {
    const today = todayStr();
    if (u.clicksDate !== today) { u.clicksToday = 0; u.clicksDate = today; }
    u.clicksToday += clicksDelta;
  }
  save();
  return ok(res, { telegram: tg, score });
});

// Exchange gems → gold
app.post("/api/v2/exchange-gold", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const gems = Math.floor(Number(req.body?.gems ?? 0));
  const u = users.get(tg);
  if (!u) return fail(res, "user not found");
  if (!Number.isFinite(gems) || gems < EXCHANGE_RATE) return fail(res, "minimum 1000 gems");
  if (u.score < gems) return fail(res, "insufficient gems");
  const exchanged = Math.floor(gems / EXCHANGE_RATE);
  u.score -= exchanged * EXCHANGE_RATE;
  u.gold  += exchanged;
  save();
  return ok(res, { score: u.score, gold: u.gold, exchanged });
});

// Referral info
app.post("/api/v2/referral-info", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  let u = users.get(tg);
  if (!u) { u = newUser(tg); users.set(tg, u); }
  if (!u.referralCode) u.referralCode = makeRefCode(tg);
  save();
  return ok(res, {
    code: u.referralCode,
    invitedCount: u.invitedCount,
    invitedBy: u.invitedBy,
    bonusPerInvite: REFERRAL_BONUS,
  });
});

// Activate another player's referral code
app.post("/api/v2/activate-referral", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const code = String(req.body?.code ?? "").trim().toUpperCase();
  if (!code) return fail(res, "code required");
  let u = users.get(tg);
  if (!u) { u = newUser(tg); users.set(tg, u); }
  if (u.invitedBy) return fail(res, "already activated");
  if (u.referralCode === code) return fail(res, "cannot use your own code");
  const inviter = Array.from(users.values()).find((x) => x.referralCode === code);
  if (!inviter) return fail(res, "invalid code");
  u.invitedBy = inviter.telegram;
  inviter.invitedCount += 1;
  inviter.score += REFERRAL_BONUS;
  save();
  return ok(res, { invitedBy: inviter.telegram, bonusAwarded: REFERRAL_BONUS });
});

// Tasks list + per-task progress
app.post("/api/v2/tasks", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  let u = users.get(tg);
  if (!u) { u = newUser(tg); users.set(tg, u); }
  const tasks = [
    { id: TASKS.click100.id, label: "Click 100 times today",  progress: Math.min(u.clicksToday,  TASKS.click100.target), target: TASKS.click100.target, reward: TASKS.click100.reward, claimed: u.claimedTasks.includes(TASKS.click100.id) },
    { id: TASKS.login7.id,   label: "Login 7 days in a row",   progress: Math.min(u.loginDays,    TASKS.login7.target),   target: TASKS.login7.target,   reward: TASKS.login7.reward,   claimed: u.claimedTasks.includes(TASKS.login7.id) },
    { id: TASKS.invite1.id,  label: "Invite 1 friend",          progress: Math.min(u.invitedCount, TASKS.invite1.target),  target: TASKS.invite1.target,  reward: TASKS.invite1.reward,  claimed: u.claimedTasks.includes(TASKS.invite1.id) },
    { id: TASKS.invite3.id,  label: "Invite 3 friends",         progress: Math.min(u.invitedCount, TASKS.invite3.target),  target: TASKS.invite3.target,  reward: TASKS.invite3.reward,  claimed: u.claimedTasks.includes(TASKS.invite3.id) },
    { id: TASKS.invite5.id,  label: "Invite 5 friends",         progress: Math.min(u.invitedCount, TASKS.invite5.target),  target: TASKS.invite5.target,  reward: TASKS.invite5.reward,  claimed: u.claimedTasks.includes(TASKS.invite5.id) },
  ];
  save();
  return ok(res, { tasks, score: u.score });
});

// Claim a completed task
app.post("/api/v2/claim-task", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const taskId = String(req.body?.taskId ?? "");
  const def = Object.values(TASKS).find((t) => t.id === taskId);
  if (!def) return fail(res, "unknown task");
  const u = users.get(tg);
  if (!u) return fail(res, "user not found");
  if (u.claimedTasks.includes(taskId)) return fail(res, "already claimed");
  const progress =
    taskId === TASKS.click100.id ? u.clicksToday :
    taskId === TASKS.login7.id   ? u.loginDays   :
    taskId === TASKS.invite1.id  ? u.invitedCount :
    taskId === TASKS.invite3.id  ? u.invitedCount :
    taskId === TASKS.invite5.id  ? u.invitedCount : 0;
  if (progress < def.target) return fail(res, "not completed yet");
  u.score += def.reward;
  u.claimedTasks = [...u.claimedTasks, taskId];
  save();
  return ok(res, { score: u.score, reward: def.reward, taskId });
});

// Claim daily reward (3-hour cooldown)
app.post("/api/v2/claim-daily", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const u = users.get(tg);
  if (!u) return fail(res, "user not found");
  const now = Date.now();
  const last = u.lastDailyReward ? new Date(u.lastDailyReward).getTime() : 0;
  const elapsed = (now - last) / 1000;
  if (last && elapsed < DAILY_REWARD_TIME) {
    return fail(res, JSON.stringify({ nextClaimIn: DAILY_REWARD_TIME - elapsed, score: u.score }));
  }
  u.score += DAILY_REWARD;
  u.lastDailyReward = new Date(now).toISOString();
  save();
  return ok(res, { score: u.score, reward: DAILY_REWARD, nextClaimIn: DAILY_REWARD_TIME });
});

// Miners list (sync with on-chain NFT count snapshot)
app.post("/api/v2/miners", (req, res) => {
  const wa = String(req.body?.walletAddress ?? "");
  const nftRaw = req.body?.nftMiners;
  if (!wa) return fail(res, "walletAddress required");
  const nfts = nftRaw && nftRaw !== "-" ? JSON.parse(nftRaw) : [];
  const existing = minersByWallet.get(wa) ?? [];
  const synced = nfts.length ? syncMiners(existing, nfts) : existing;
  minersByWallet.set(wa, synced);
  save();
  return ok(res, synced);
});

// Toggle a miner active/idle
app.post("/api/v2/set-miner-active", (req, res) => {
  const wa = String(req.body?.walletAddress ?? "");
  const id = String(req.body?.minerId ?? "");
  const idx = Number(req.body?.minerIndex ?? -1);
  const active = Boolean(req.body?.active);
  const groups = minersByWallet.get(wa) ?? [];
  const g = groups.find((x) => x.tokenId === id);
  if (!g || !g.miners[idx]) return fail(res, "miner not found");
  g.miners[idx].isActive = active;
  if (active) g.miners[idx].lastTimeReset = new Date().toISOString();
  minersByWallet.set(wa, groups);
  save();
  return ok(res, groups);
});

// Collect accumulated miner output → into user's gem balance
app.post("/api/v2/withdrawal-miners", (req, res) => {
  const tg = String(req.body?.telegram ?? "");
  const wa = String(req.body?.walletAddress ?? "");
  const u = users.get(tg);
  if (!u) return fail(res, "user not found");
  const groups = minersByWallet.get(wa) ?? [];
  const now = new Date();
  let gained = 0;
  const updated = groups.map((g) => {
    const perDay = MINERS_STATS[g.tokenId] ?? 0;
    return {
      ...g,
      miners: g.miners.map((m) => {
        if (!m.isActive) return m;
        const e = (now.getTime() - new Date(m.lastTimeReset).getTime()) / 86_400_000;
        gained += Math.floor(perDay * e);
        return { ...m, lastTimeReset: now.toISOString() };
      }),
    };
  });
  minersByWallet.set(wa, updated);
  if (gained > 0) u.score += gained;
  save();
  return ok(res, gained);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[lux-backend] listening on http://127.0.0.1:${PORT}  (api at /api/v2)`);
});
