import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";

/* ─── In-memory mock backend (mirrors react-web-ui/vite.config.ts) ────── */

type UserRow = {
  telegram: string;
  score: number;
  lastDailyReward: string | null;
  gold: number;
  referralCode: string | null;
  invitedBy: string | null;
  invitedCount: number;
  clicksToday: number;
  clicksDate: string | null;
  loginDays: number;
  lastLoginDate: string | null;
  claimedTasks: string[];
};
type MinerInst = { isActive: boolean; lastTimeReset: string };
type MinerGroup = { tokenId: string; miners: MinerInst[] };
type NftMiner = { tokenId: string; count: number };

const users = new Map<string, UserRow>();
const minersByWallet = new Map<string, MinerGroup[]>();

const MINERS_STATS: Record<string, number> = { "4": 30_000, "5": 70_000, "6": 150_000, "7": 350_000 };
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
} as const;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

function makeRefCode(telegram: string): string {
  let h = 5381;
  for (let i = 0; i < telegram.length; i++) h = ((h << 5) + h + telegram.charCodeAt(i)) | 0;
  return `LUX-${(Math.abs(h) % 0xffffff).toString(36).toUpperCase().padStart(5, "0")}`;
}

function newUser(telegram: string): UserRow {
  return {
    telegram, score: 0, lastDailyReward: null, gold: 0,
    referralCode: makeRefCode(telegram), invitedBy: null, invitedCount: 0,
    clicksToday: 0, clicksDate: null,
    loginDays: 0, lastLoginDate: null,
    claimedTasks: [],
  };
}

function ok(res: ServerResponse, data: unknown) {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ success: true, data }));
}
function fail(res: ServerResponse, msg: string, status = 400) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ success: false, data: msg }));
}
function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

function syncMiners(existing: MinerGroup[], nfts: NftMiner[]): MinerGroup[] {
  const now = new Date().toISOString();
  const out: MinerGroup[] = [];
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

function gameApiPlugin(): Plugin {
  return {
    name: "game-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const p = url.pathname;

        if (req.method === "OPTIONS" && p.startsWith("/__mockup/api/")) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          return res.end();
        }
        if (req.method !== "POST" || !p.startsWith("/__mockup/api/")) return next();

        if (p === "/__mockup/api/game-config") {
          try {
            const raw = fs.readFileSync(path.resolve(import.meta.dirname, "public/miners-config.json"), "utf8");
            return ok(res, raw);
          } catch { return fail(res, "Config read error"); }
        }

        const body = await readBody(req);

        if (p === "/__mockup/api/user") {
          const tg = String(body.telegram ?? "");
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
          return ok(res, u);
        }

        if (p === "/__mockup/api/save-score") {
          const tg = String(body.telegram ?? "");
          const score = Number(body.score ?? 0);
          const clicksDelta = Math.max(0, Number(body.clicksDelta ?? 0));
          const u = users.get(tg); if (!u) return fail(res, "user not found");
          u.score = score;
          if (clicksDelta > 0) {
            const today = todayStr();
            if (u.clicksDate !== today) { u.clicksToday = 0; u.clicksDate = today; }
            u.clicksToday += clicksDelta;
          }
          return ok(res, { telegram: tg, score });
        }

        if (p === "/__mockup/api/exchange-gold") {
          const tg = String(body.telegram ?? "");
          const gems = Math.floor(Number(body.gems ?? 0));
          const u = users.get(tg); if (!u) return fail(res, "user not found");
          if (!Number.isFinite(gems) || gems < EXCHANGE_RATE) return fail(res, "minimum 1000 gems");
          if (u.score < gems) return fail(res, "insufficient gems");
          const exchanged = Math.floor(gems / EXCHANGE_RATE);
          u.score -= exchanged * EXCHANGE_RATE;
          u.gold  += exchanged;
          return ok(res, { score: u.score, gold: u.gold, exchanged });
        }

        if (p === "/__mockup/api/referral-info") {
          const tg = String(body.telegram ?? "");
          let u = users.get(tg); if (!u) { u = newUser(tg); users.set(tg, u); }
          if (!u.referralCode) u.referralCode = makeRefCode(tg);
          return ok(res, {
            code: u.referralCode, invitedCount: u.invitedCount,
            invitedBy: u.invitedBy, bonusPerInvite: REFERRAL_BONUS,
          });
        }

        if (p === "/__mockup/api/activate-referral") {
          const tg = String(body.telegram ?? "");
          const code = String(body.code ?? "").trim().toUpperCase();
          if (!code) return fail(res, "code required");
          let u = users.get(tg); if (!u) { u = newUser(tg); users.set(tg, u); }
          if (u.invitedBy) return fail(res, "already activated");
          if (u.referralCode === code) return fail(res, "cannot use your own code");
          const inviter = Array.from(users.values()).find(x => x.referralCode === code);
          if (!inviter) return fail(res, "invalid code");
          u.invitedBy = inviter.telegram;
          inviter.invitedCount += 1;
          inviter.score += REFERRAL_BONUS;
          return ok(res, { invitedBy: inviter.telegram, bonusAwarded: REFERRAL_BONUS });
        }

        if (p === "/__mockup/api/tasks") {
          const tg = String(body.telegram ?? "");
          let u = users.get(tg); if (!u) { u = newUser(tg); users.set(tg, u); }
          const tasks = [
            { id: TASKS.click100.id, label: "Click 100 times today", progress: Math.min(u.clicksToday, TASKS.click100.target), target: TASKS.click100.target, reward: TASKS.click100.reward, claimed: u.claimedTasks.includes(TASKS.click100.id) },
            { id: TASKS.login7.id,   label: "Login 7 days in a row",  progress: Math.min(u.loginDays,   TASKS.login7.target),   target: TASKS.login7.target,   reward: TASKS.login7.reward,   claimed: u.claimedTasks.includes(TASKS.login7.id) },
            { id: TASKS.invite1.id,  label: "Invite 1 friend",         progress: Math.min(u.invitedCount, TASKS.invite1.target),  target: TASKS.invite1.target,  reward: TASKS.invite1.reward,  claimed: u.claimedTasks.includes(TASKS.invite1.id) },
            { id: TASKS.invite3.id,  label: "Invite 3 friends",        progress: Math.min(u.invitedCount, TASKS.invite3.target),  target: TASKS.invite3.target,  reward: TASKS.invite3.reward,  claimed: u.claimedTasks.includes(TASKS.invite3.id) },
            { id: TASKS.invite5.id,  label: "Invite 5 friends",        progress: Math.min(u.invitedCount, TASKS.invite5.target),  target: TASKS.invite5.target,  reward: TASKS.invite5.reward,  claimed: u.claimedTasks.includes(TASKS.invite5.id) },
          ];
          return ok(res, { tasks, score: u.score });
        }

        if (p === "/__mockup/api/claim-task") {
          const tg = String(body.telegram ?? "");
          const taskId = String(body.taskId ?? "");
          const def = Object.values(TASKS).find(t => t.id === taskId);
          if (!def) return fail(res, "unknown task");
          const u = users.get(tg); if (!u) return fail(res, "user not found");
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
          return ok(res, { score: u.score, reward: def.reward, taskId });
        }

        if (p === "/__mockup/api/claim-daily") {
          const tg = String(body.telegram ?? "");
          const u = users.get(tg); if (!u) return fail(res, "user not found");
          const now = Date.now();
          const last = u.lastDailyReward ? new Date(u.lastDailyReward).getTime() : 0;
          const elapsed = (now - last) / 1000;
          if (last && elapsed < DAILY_REWARD_TIME) {
            return fail(res, JSON.stringify({ nextClaimIn: DAILY_REWARD_TIME - elapsed, score: u.score }));
          }
          u.score += DAILY_REWARD;
          u.lastDailyReward = new Date(now).toISOString();
          return ok(res, { score: u.score, reward: DAILY_REWARD, nextClaimIn: DAILY_REWARD_TIME });
        }

        if (p === "/__mockup/api/miners") {
          const wa = String(body.walletAddress ?? "");
          const nftRaw = body.nftMiners as string | undefined;
          if (!wa) return fail(res, "walletAddress required");
          const nfts: NftMiner[] = nftRaw && nftRaw !== "-" ? JSON.parse(nftRaw) : [];
          const existing = minersByWallet.get(wa) ?? [];
          const synced = nfts.length ? syncMiners(existing, nfts) : existing;
          minersByWallet.set(wa, synced);
          return ok(res, synced);
        }

        if (p === "/__mockup/api/set-miner-active") {
          const wa = String(body.walletAddress ?? "");
          const id = String(body.minerId ?? "");
          const idx = Number(body.minerIndex ?? -1);
          const active = Boolean(body.active);
          const groups = minersByWallet.get(wa) ?? [];
          const g = groups.find((x) => x.tokenId === id);
          if (!g || !g.miners[idx]) return fail(res, "miner not found");
          g.miners[idx].isActive = active;
          if (active) g.miners[idx].lastTimeReset = new Date().toISOString();
          minersByWallet.set(wa, groups);
          return ok(res, groups);
        }

        if (p === "/__mockup/api/withdrawal-miners") {
          const tg = String(body.telegram ?? "");
          const wa = String(body.walletAddress ?? "");
          const u = users.get(tg); if (!u) return fail(res, "user not found");
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
          return ok(res, gained);
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), gameApiPlugin()],
  resolve: {
    preserveSymlinks: false,
    // LuxUI.tsx is symlinked into ../repos/clicker/react-web-ui which has its
    // own node_modules with a slightly different react version. Without dedupe,
    // Vite ends up bundling two copies of React, breaking useState/useEffect
    // with "Cannot read properties of null (reading 'useState')".
    dedupe: ["react", "react-dom", "react-dom/client", "scheduler"],
    alias: {
      react:       path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ["ethers", "react", "react-dom", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    fs: { allow: [path.resolve(import.meta.dirname), path.resolve(import.meta.dirname, "../repos/clicker/react-web-ui")] },
  },
});
