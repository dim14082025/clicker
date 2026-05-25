import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import Database from "better-sqlite3";

// ─── SQLite persistent database ──────────────────────────────────────────────
const DB_PATH = path.resolve(import.meta.dirname, "data/game.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tg_clicker (
    telegram          TEXT PRIMARY KEY,
    score             INTEGER NOT NULL DEFAULT 0,
    last_daily_reward TEXT    NULL
  );

  CREATE TABLE IF NOT EXISTS tg_miners (
    wallet_address TEXT PRIMARY KEY,
    miners         TEXT NOT NULL DEFAULT '[]'
  );
`);

// Additive columns for v2 (gold, referrals, daily tasks). SQLite ADD COLUMN is
// not idempotent, so guard each one against "duplicate column" failures.
const existingCols = new Set(
  (db.prepare(`PRAGMA table_info(tg_clicker)`).all() as { name: string }[]).map(c => c.name)
);
const extraCols: Array<[string, string]> = [
  ["gold",             "INTEGER NOT NULL DEFAULT 0"],
  ["referral_code",    "TEXT NULL"],
  ["invited_by",       "TEXT NULL"],
  ["invited_count",    "INTEGER NOT NULL DEFAULT 0"],
  ["clicks_today",     "INTEGER NOT NULL DEFAULT 0"],
  ["clicks_date",      "TEXT NULL"],
  ["login_days",       "INTEGER NOT NULL DEFAULT 0"],
  ["last_login_date",  "TEXT NULL"],
  ["claimed_tasks",    "TEXT NOT NULL DEFAULT '[]'"],
];
for (const [name, type] of extraCols) {
  if (!existingCols.has(name)) db.exec(`ALTER TABLE tg_clicker ADD COLUMN ${name} ${type};`);
}

// ─── Prepared statements ──────────────────────────────────────────────────────
const FULL_USER_COLS =
  `telegram, score, last_daily_reward, gold, referral_code, invited_by, invited_count, ` +
  `clicks_today, clicks_date, login_days, last_login_date, claimed_tasks`;

const stmts = {
  upsertUser:        db.prepare(`INSERT INTO tg_clicker (telegram, score, last_daily_reward) VALUES (?, 0, NULL) ON CONFLICT(telegram) DO NOTHING`),
  getUser:           db.prepare(`SELECT ${FULL_USER_COLS} FROM tg_clicker WHERE telegram = ?`),
  setScore:          db.prepare(`UPDATE tg_clicker SET score = ? WHERE telegram = ?`),
  setDailyScore:     db.prepare(`UPDATE tg_clicker SET score = ?, last_daily_reward = ? WHERE telegram = ?`),
  setReferralCode:   db.prepare(`UPDATE tg_clicker SET referral_code = ? WHERE telegram = ?`),
  setLoginStreak:    db.prepare(`UPDATE tg_clicker SET login_days = ?, last_login_date = ? WHERE telegram = ?`),
  setClicksToday:    db.prepare(`UPDATE tg_clicker SET clicks_today = ?, clicks_date = ? WHERE telegram = ?`),
  setExchange:       db.prepare(`UPDATE tg_clicker SET score = ?, gold = ? WHERE telegram = ?`),
  setInvitedBy:      db.prepare(`UPDATE tg_clicker SET invited_by = ? WHERE telegram = ?`),
  incInvitedCount:   db.prepare(`UPDATE tg_clicker SET invited_count = invited_count + 1, score = score + ? WHERE telegram = ?`),
  findByRefCode:     db.prepare(`SELECT telegram FROM tg_clicker WHERE referral_code = ?`),
  setClaimedTasks:   db.prepare(`UPDATE tg_clicker SET score = ?, claimed_tasks = ? WHERE telegram = ?`),
  getMiners:         db.prepare(`SELECT miners FROM tg_miners WHERE wallet_address = ?`),
  upsertMiners:      db.prepare(`INSERT INTO tg_miners (wallet_address, miners) VALUES (?, ?) ON CONFLICT(wallet_address) DO UPDATE SET miners = excluded.miners`),
};

// Full row type returned by getUser — matches FULL_USER_COLS order.
type FullUserRow = {
  telegram: string;
  score: number;
  last_daily_reward: string | null;
  gold: number;
  referral_code: string | null;
  invited_by: string | null;
  invited_count: number;
  clicks_today: number;
  clicks_date: string | null;
  login_days: number;
  last_login_date: string | null;
  claimed_tasks: string;
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

function makeRefCode(telegram: string): string {
  // Short deterministic code from telegram id
  let h = 5381;
  for (let i = 0; i < telegram.length; i++) h = ((h << 5) + h + telegram.charCodeAt(i)) | 0;
  const tail = (Math.abs(h) % 0xffffff).toString(36).toUpperCase().padStart(5, "0");
  return `LUX-${tail}`;
}

// Daily task definitions (mirrored client-side as labels)
const TASKS = {
  click100:    { id: "click100",    reward: 500,    target: 100 },
  login7:      { id: "login7",      reward: 2000,   target: 7   },
  invite1:     { id: "invite1",     reward: 50000,  target: 1   },
  invite3:     { id: "invite3",     reward: 200000, target: 3   },
  invite5:     { id: "invite5",     reward: 350000, target: 5   },
} as const;
const REFERRAL_BONUS = 50_000; // gems credited to inviter when a friend activates their code

function publicUserView(row: FullUserRow) {
  return {
    telegram:        row.telegram,
    score:           row.score,
    lastDailyReward: row.last_daily_reward,
    gold:            row.gold,
    referralCode:    row.referral_code,
    invitedBy:       row.invited_by,
    invitedCount:    row.invited_count,
    clicksToday:     row.clicks_today,
    clicksDate:      row.clicks_date,
    loginDays:       row.login_days,
    lastLoginDate:   row.last_login_date,
    claimedTasks:    JSON.parse(row.claimed_tasks ?? "[]") as string[],
  };
}

// ─── Miner types ──────────────────────────────────────────────────────────────
interface MinerInstance { isActive: boolean; lastTimeReset: string }
interface MinerGroup    { tokenId: string;   miners: MinerInstance[] }
interface NftMiner      { tokenId: string;   count: number }

const MINERS_STATS: Record<string, number> = {
  "4": 30_000,
  "5": 70_000,
  "6": 150_000,
  "7": 350_000,
};

const DAILY_REWARD      = 5000;
const DAILY_REWARD_TIME = 60 * 60 * 3; // 3 hours in seconds

function syncMiners(existing: MinerGroup[], nftMiners: NftMiner[]): MinerGroup[] {
  const now = new Date().toISOString();
  const result: MinerGroup[] = [];
  for (const nft of nftMiners) {
    if (nft.count === 0) continue;
    const ex = existing.find(g => g.tokenId === nft.tokenId);
    if (ex) {
      if (nft.count < ex.miners.length) {
        result.push({ tokenId: nft.tokenId, miners: ex.miners.slice(0, nft.count) });
      } else if (nft.count > ex.miners.length) {
        const extra = Array.from(
          { length: nft.count - ex.miners.length },
          () => ({ isActive: false, lastTimeReset: now }),
        );
        result.push({ tokenId: nft.tokenId, miners: [...ex.miners, ...extra] });
      } else {
        result.push(ex);
      }
    } else {
      result.push({
        tokenId: nft.tokenId,
        miners: Array.from({ length: nft.count }, () => ({ isActive: false, lastTimeReset: now })),
      });
    }
  }
  return result;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function ok(res: ServerResponse, data: unknown) {
  const body = JSON.stringify({ success: true, data });
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}
function fail(res: ServerResponse, msg: string, status = 400) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ success: false, data: msg }));
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

// ─── Game API Vite plugin ─────────────────────────────────────────────────────
function gameApiPlugin(): Plugin {
  return {
    name: "game-api",
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url   = new URL(req.url ?? "/", "http://localhost");
        const path_ = url.pathname;

        if (req.method === "OPTIONS" && path_.startsWith("/__mockup/api/")) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          res.end();
          return;
        }

        if (req.method !== "POST" || !path_.startsWith("/__mockup/api/")) {
          return next();
        }

        console.log(`[API] ${req.method} ${path_}`);

        // ── POST /__mockup/api/game-config ──────────────────────────────────
        if (path_ === "/__mockup/api/game-config") {
          try {
            const configPath = path.resolve(import.meta.dirname, "public/miners-config.json");
            const config = JSON.parse(readFileSync(configPath, "utf-8"));
            return ok(res, config);
          } catch {
            return fail(res, "Config read error", 500);
          }
        }

        const body = await readBody(req);
        console.log(`[API] body keys: ${Object.keys(body).join(", ")}`);

        // ── POST /__mockup/api/user ─────────────────────────────────────────
        if (path_ === "/__mockup/api/user") {
          const telegram = String(body.telegram ?? "").trim();
          if (!telegram) return fail(res, "telegram required");

          stmts.upsertUser.run(telegram);
          let row = stmts.getUser.get(telegram) as FullUserRow;

          // Backfill referral code on first login
          if (!row.referral_code) {
            stmts.setReferralCode.run(makeRefCode(telegram), telegram);
            row = stmts.getUser.get(telegram) as FullUserRow;
          }

          // Bump login streak (first visit today only)
          const today = todayStr();
          if (row.last_login_date !== today) {
            const nextStreak = row.last_login_date === yesterdayStr() ? row.login_days + 1 : 1;
            stmts.setLoginStreak.run(nextStreak, today, telegram);
            row = stmts.getUser.get(telegram) as FullUserRow;
          }

          // Reset clicks_today counter if date rolled over
          if (row.clicks_date !== today) {
            stmts.setClicksToday.run(0, today, telegram);
            row = stmts.getUser.get(telegram) as FullUserRow;
          }

          return ok(res, publicUserView(row));
        }

        // ── POST /__mockup/api/save-score ───────────────────────────────────
        if (path_ === "/__mockup/api/save-score") {
          const telegram = String(body.telegram ?? "").trim();
          const score    = Number(body.score);
          const clicksDelta = Math.max(0, Number(body.clicksDelta ?? 0));
          if (!telegram) return fail(res, "telegram required");
          if (isNaN(score) || score < 0) return fail(res, "valid score required");

          stmts.upsertUser.run(telegram);
          stmts.setScore.run(score, telegram);

          // Increment clicks_today (resetting if day rolled over)
          if (clicksDelta > 0) {
            const row = stmts.getUser.get(telegram) as FullUserRow;
            const today = todayStr();
            const next = (row.clicks_date === today ? row.clicks_today : 0) + clicksDelta;
            stmts.setClicksToday.run(next, today, telegram);
          }
          return ok(res, { telegram, score });
        }

        // ── POST /__mockup/api/claim-daily ──────────────────────────────────
        if (path_ === "/__mockup/api/claim-daily") {
          const telegram = String(body.telegram ?? "").trim();
          if (!telegram) return fail(res, "telegram required");

          stmts.upsertUser.run(telegram);
          const row = stmts.getUser.get(telegram) as { telegram: string; score: number; last_daily_reward: string | null };

          const now       = Math.floor(Date.now() / 1000);
          const lastMs    = row.last_daily_reward ? Math.floor(new Date(row.last_daily_reward).getTime() / 1000) : 0;
          const elapsed   = now - lastMs;

          if (elapsed < DAILY_REWARD_TIME) {
            const nextClaimIn = DAILY_REWARD_TIME - elapsed;
            return fail(res, JSON.stringify({ nextClaimIn, score: row.score }));
          }

          const newScore = row.score + DAILY_REWARD;
          const nowStr   = new Date().toISOString();
          stmts.setDailyScore.run(newScore, nowStr, telegram);
          return ok(res, { score: newScore, reward: DAILY_REWARD, nextClaimIn: DAILY_REWARD_TIME });
        }

        // ── POST /__mockup/api/miners ───────────────────────────────────────
        if (path_ === "/__mockup/api/miners") {
          const walletAddress = String(body.walletAddress ?? "").trim();
          const nftMinersRaw  = String(body.nftMiners     ?? "-").trim();
          if (!walletAddress) return fail(res, "walletAddress required");

          const row = stmts.getMiners.get(walletAddress) as { miners: string } | undefined;
          const existingMiners: MinerGroup[] = row ? JSON.parse(row.miners) : [];

          if (nftMinersRaw === "-") return ok(res, existingMiners);

          const nftMiners: NftMiner[] = JSON.parse(nftMinersRaw);
          const synced = syncMiners(existingMiners, nftMiners);
          stmts.upsertMiners.run(walletAddress, JSON.stringify(synced));
          return ok(res, synced);
        }

        // ── POST /__mockup/api/set-miner-active ─────────────────────────────
        if (path_ === "/__mockup/api/set-miner-active") {
          const walletAddress = String(body.walletAddress ?? "").trim();
          const minerId       = String(body.minerId       ?? "").trim();
          const minerIndex    = Number(body.minerIndex);
          const active        = body.active === true || body.active === "true";
          if (!walletAddress || !minerId) return fail(res, "walletAddress and minerId required");

          const now      = new Date().toISOString();
          const instance: MinerInstance = { isActive: active, lastTimeReset: now };

          const row    = stmts.getMiners.get(walletAddress) as { miners: string } | undefined;
          const miners: MinerGroup[] = row ? JSON.parse(row.miners) : [];

          let found = false;
          const updated = miners.map(g => {
            if (g.tokenId !== minerId) return g;
            found = true;
            const arr = [...g.miners];
            while (arr.length <= minerIndex) arr.push({ isActive: false, lastTimeReset: now });
            arr[minerIndex] = instance;
            return { ...g, miners: arr };
          });
          if (!found) {
            const arr: MinerInstance[] = [];
            for (let i = 0; i <= minerIndex; i++) {
              arr.push(i === minerIndex ? instance : { isActive: false, lastTimeReset: now });
            }
            updated.push({ tokenId: minerId, miners: arr });
          }
          stmts.upsertMiners.run(walletAddress, JSON.stringify(updated));
          return ok(res, instance);
        }

        // ── POST /__mockup/api/exchange-gold ──────────────────────────────
        if (path_ === "/__mockup/api/exchange-gold") {
          const telegram = String(body.telegram ?? "").trim();
          const gemsAmount = Math.floor(Number(body.gems ?? 0));
          const rate = 1000; // exchangeGemsPerGold; mirrors miners-config.json
          if (!telegram) return fail(res, "telegram required");
          if (!Number.isFinite(gemsAmount) || gemsAmount < rate) return fail(res, "minimum 1000 gems");

          const row = stmts.getUser.get(telegram) as FullUserRow | undefined;
          if (!row) return fail(res, "user not found");
          if (row.score < gemsAmount) return fail(res, "insufficient gems");

          const goldGained = Math.floor(gemsAmount / rate);
          const newScore = row.score - goldGained * rate;
          const newGold = row.gold + goldGained;
          stmts.setExchange.run(newScore, newGold, telegram);
          return ok(res, { score: newScore, gold: newGold, exchanged: goldGained });
        }

        // ── POST /__mockup/api/referral-info ────────────────────────────
        if (path_ === "/__mockup/api/referral-info") {
          const telegram = String(body.telegram ?? "").trim();
          if (!telegram) return fail(res, "telegram required");
          stmts.upsertUser.run(telegram);
          let row = stmts.getUser.get(telegram) as FullUserRow;
          if (!row.referral_code) {
            stmts.setReferralCode.run(makeRefCode(telegram), telegram);
            row = stmts.getUser.get(telegram) as FullUserRow;
          }
          return ok(res, {
            code:          row.referral_code,
            invitedCount:  row.invited_count,
            invitedBy:     row.invited_by,
            bonusPerInvite: REFERRAL_BONUS,
          });
        }

        // ── POST /__mockup/api/activate-referral ─────────────────────────
        if (path_ === "/__mockup/api/activate-referral") {
          const telegram = String(body.telegram ?? "").trim();
          const code     = String(body.code ?? "").trim().toUpperCase();
          if (!telegram) return fail(res, "telegram required");
          if (!code)     return fail(res, "code required");

          stmts.upsertUser.run(telegram);
          const row = stmts.getUser.get(telegram) as FullUserRow;
          if (row.invited_by) return fail(res, "already activated");
          if (row.referral_code === code) return fail(res, "cannot use your own code");

          const inviter = stmts.findByRefCode.get(code) as { telegram: string } | undefined;
          if (!inviter) return fail(res, "invalid code");

          stmts.setInvitedBy.run(inviter.telegram, telegram);
          stmts.incInvitedCount.run(REFERRAL_BONUS, inviter.telegram);
          return ok(res, { invitedBy: inviter.telegram, bonusAwarded: REFERRAL_BONUS });
        }

        // ── POST /__mockup/api/tasks ───────────────────────────────────────
        if (path_ === "/__mockup/api/tasks") {
          const telegram = String(body.telegram ?? "").trim();
          if (!telegram) return fail(res, "telegram required");
          stmts.upsertUser.run(telegram);
          const row = stmts.getUser.get(telegram) as FullUserRow;
          const claimed = JSON.parse(row.claimed_tasks ?? "[]") as string[];
          const tasks = [
            { id: TASKS.click100.id, label: "Click 100 times today",  progress: Math.min(row.clicks_today, TASKS.click100.target),  target: TASKS.click100.target,  reward: TASKS.click100.reward, claimed: claimed.includes(TASKS.click100.id) },
            { id: TASKS.login7.id,   label: "Login 7 days in a row",   progress: Math.min(row.login_days,   TASKS.login7.target),   target: TASKS.login7.target,   reward: TASKS.login7.reward,   claimed: claimed.includes(TASKS.login7.id) },
            { id: TASKS.invite1.id,  label: "Invite 1 friend",          progress: Math.min(row.invited_count, TASKS.invite1.target),  target: TASKS.invite1.target,  reward: TASKS.invite1.reward,  claimed: claimed.includes(TASKS.invite1.id) },
            { id: TASKS.invite3.id,  label: "Invite 3 friends",         progress: Math.min(row.invited_count, TASKS.invite3.target),  target: TASKS.invite3.target,  reward: TASKS.invite3.reward,  claimed: claimed.includes(TASKS.invite3.id) },
            { id: TASKS.invite5.id,  label: "Invite 5 friends",         progress: Math.min(row.invited_count, TASKS.invite5.target),  target: TASKS.invite5.target,  reward: TASKS.invite5.reward,  claimed: claimed.includes(TASKS.invite5.id) },
          ];
          return ok(res, { tasks, score: row.score });
        }

        // ── POST /__mockup/api/claim-task ────────────────────────────────
        if (path_ === "/__mockup/api/claim-task") {
          const telegram = String(body.telegram ?? "").trim();
          const taskId   = String(body.taskId ?? "").trim();
          if (!telegram) return fail(res, "telegram required");
          if (!taskId)   return fail(res, "taskId required");
          const def = Object.values(TASKS).find(t => t.id === taskId);
          if (!def) return fail(res, "unknown task");

          stmts.upsertUser.run(telegram);
          const row = stmts.getUser.get(telegram) as FullUserRow;
          const claimed = JSON.parse(row.claimed_tasks ?? "[]") as string[];
          if (claimed.includes(taskId)) return fail(res, "already claimed");

          const progress =
            taskId === TASKS.click100.id ? row.clicks_today :
            taskId === TASKS.login7.id   ? row.login_days   :
            taskId === TASKS.invite1.id  ? row.invited_count :
            taskId === TASKS.invite3.id  ? row.invited_count :
            taskId === TASKS.invite5.id  ? row.invited_count :
            0;
          if (progress < def.target) return fail(res, "not completed yet");

          const newScore = row.score + def.reward;
          const newClaimed = [...claimed, taskId];
          stmts.setClaimedTasks.run(newScore, JSON.stringify(newClaimed), telegram);
          return ok(res, { score: newScore, reward: def.reward, taskId });
        }

        // ── POST /__mockup/api/withdrawal-miners ────────────────────────────
        if (path_ === "/__mockup/api/withdrawal-miners") {
          const telegram      = String(body.telegram      ?? "").trim();
          const walletAddress = String(body.walletAddress ?? "").trim();
          const nftMinersRaw  = String(body.nftMiners     ?? "[]");
          if (!telegram || !walletAddress) return fail(res, "telegram and walletAddress required");

          const userRow = stmts.getUser.get(telegram) as { score: number } | undefined;
          if (!userRow) return fail(res, "User not found");

          const minersRow = stmts.getMiners.get(walletAddress) as { miners: string } | undefined;
          if (!minersRow) return ok(res, 0);

          const nftMiners: NftMiner[] = JSON.parse(nftMinersRaw);
          const miners    = syncMiners(JSON.parse(minersRow.miners), nftMiners);
          const now       = new Date();
          let miningScore = 0;

          const updatedMiners = miners.map(group => {
            const gemsPerDay = MINERS_STATS[group.tokenId] ?? 0;
            return {
              ...group,
              miners: group.miners.map(m => {
                if (!m.isActive) return m;
                const elapsed = (now.getTime() - new Date(m.lastTimeReset).getTime()) / 86_400_000;
                miningScore  += Math.floor(gemsPerDay * elapsed);
                return { ...m, lastTimeReset: now.toISOString() };
              }),
            };
          });
          stmts.upsertMiners.run(walletAddress, JSON.stringify(updatedMiners));

          if (miningScore > 0) {
            stmts.setScore.run(userRow.score + miningScore, telegram);
          }
          return ok(res, miningScore);
        }

        next();
      });
    },
  };
}

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error("BASE_PATH environment variable is required but was not provided.");

export default defineConfig({
  base: basePath,
  plugins: [
    gameApiPlugin(),
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
