import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { useConnect } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client as twClient, polygonChain, SOCIAL_STRATEGY } from "./thirdweb-config";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes blob-drift {
  0%   { transform: translate(0px,0px) scale(1) rotate(0deg); }
  33%  { transform: translate(60px,-40px) scale(1.15) rotate(120deg); }
  66%  { transform: translate(-30px,50px) scale(0.9) rotate(240deg); }
  100% { transform: translate(0px,0px) scale(1) rotate(360deg); }
}
@keyframes blob-drift2 {
  0%   { transform: translate(0px,0px) scale(1); }
  50%  { transform: translate(-80px,60px) scale(1.2); }
  100% { transform: translate(0px,0px) scale(1); }
}
@keyframes gem-float {
  0%,100% { transform: translateY(0px) scale(1); filter: brightness(1); }
  50%      { transform: translateY(-12px) scale(1.03); filter: brightness(1.2); }
}
@keyframes gem-tap {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.88); }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
@keyframes neon-pulse {
  0%,100% { opacity: 0.7; }
  50%      { opacity: 1; }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes ring-spin     { from { transform: rotate(0deg); }  to { transform: rotate(360deg); } }
@keyframes ring-spin-rev { from { transform: rotate(0deg); }  to { transform: rotate(-360deg); } }
@keyframes spin          { from { transform: rotate(0deg); }  to { transform: rotate(360deg); } }
@keyframes fly-up {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-80px); }
}
@keyframes slide-in {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lux-root { font-family: 'Inter', system-ui, sans-serif; color: #fff; }

.glass {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.08);
}
.glass-strong {
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.12);
}
.shimmer-text {
  background: linear-gradient(90deg, #c9a227 0%, #fff8dc 25%, #ffd700 50%, #fff8dc 75%, #c9a227 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s linear infinite;
}
.neon-blue  { text-shadow: 0 0 12px #00d4ff, 0 0 30px #00d4ff88; color: #00d4ff; }
.neon-gold  { text-shadow: 0 0 14px #ffd700, 0 0 35px #ffd70066; color: #ffd700; }
.neon-cyan  { text-shadow: 0 0 12px #00fff7, 0 0 28px #00fff766; color: #00fff7; }

.lux-btn {
  background: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(124,58,237,0.2) 100%);
  border: 1px solid rgba(0,212,255,0.35);
  box-shadow: 0 0 20px rgba(0,212,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 0.2s;
  cursor: pointer;
  color: #00d4ff;
  font-family: 'Inter', system-ui, sans-serif;
}
.lux-btn:hover {
  background: linear-gradient(135deg, rgba(0,212,255,0.25) 0%, rgba(124,58,237,0.35) 100%);
  box-shadow: 0 0 35px rgba(0,212,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
  transform: translateY(-1px);
}
.lux-btn:active { transform: scale(0.97); }

.gem-float { animation: gem-float 3.5s ease-in-out infinite; }
.gem-tapped { animation: gem-tap 0.35s ease forwards !important; }
.slide-in { animation: slide-in 0.3s ease both; }

/* Hide native scrollbar everywhere in the app */
.lux-scroll::-webkit-scrollbar { display: none; }
.lux-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`;

function useStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);
}

/* ─── BG ─────────────────────────────────────────────────────── */
function LuxBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 20%, #0d1f3c 0%, #02060f 60%, #000208 100%)" }} />
      <div style={{ position: "absolute", width: 700, height: 700, top: "-15%", left: "-10%", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,255,0.13) 0%, transparent 70%)", animation: "blob-drift 18s ease-in-out infinite", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 600, height: 600, bottom: "-10%", right: "5%", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)", animation: "blob-drift2 14s ease-in-out infinite", filter: "blur(50px)" }} />
      <div style={{ position: "absolute", width: 400, height: 400, top: "40%", left: "55%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,180,0,0.08) 0%, transparent 70%)", animation: "blob-drift 22s ease-in-out infinite reverse", filter: "blur(35px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
    </div>
  );
}

/* ─── FLY TEXT ───────────────────────────────────────────────── */
function FlyText({ x, y, id }: { x: number; y: number; id: number }) {
  return (
    <div key={id} style={{ position: "absolute", left: x - 15, top: y - 30, color: "#00fff7", fontWeight: 800, fontSize: 22, pointerEvents: "none", zIndex: 50, animation: "fly-up 0.9s ease forwards", textShadow: "0 0 14px #00fff7" }}>
      +1 💎
    </div>
  );
}

/* ─── NAV ────────────────────────────────────────────────────── */
type Tab = "home" | "mining" | "tasks" | "profile";
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home",    icon: "◈", label: "Home" },
  { id: "mining",  icon: "⬡", label: "Mining" },
  { id: "tasks",   icon: "◉", label: "Tasks" },
  { id: "profile", icon: "◎", label: "Profile" },
];

function Nav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="glass" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px 18px", borderTop: "1px solid rgba(0,212,255,0.12)", display: "flex", justifyContent: "space-around" }}>
      {TABS.map(({ id, icon, label }) => {
        const active = tab === id;
        return (
          <button key={id} onClick={() => setTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", background: active ? "linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,237,0.15))" : "none", border: active ? "1px solid rgba(0,212,255,0.25)" : "none", boxShadow: active ? "0 0 20px rgba(0,212,255,0.15)" : "none", padding: "8px 14px", borderRadius: 16, transition: "all 0.2s" }}>
            <span style={{ fontSize: 20, lineHeight: 1, color: active ? "#00d4ff" : "rgba(255,255,255,0.25)", filter: active ? "drop-shadow(0 0 6px #00d4ff)" : "none", transition: "all 0.2s" }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#00d4ff" : "rgba(255,255,255,0.25)", letterSpacing: "0.05em", textShadow: active ? "0 0 10px #00d4ff" : "none" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── TYPES ──────────────────────────────────────────────────── */
type GameConfig = {
  exchangeGemsPerGold: number;
  dailyReward: number;
  dailyRewardTime: number;
  minersStats: { tokenId: string; gemsPerDay: string }[];
};
type TgUser    = { id: number; username?: string; first_name?: string };
type UserData  = {
  telegram: string;
  score: number;
  lastDailyReward: string | null;
  gold?: number;
  referralCode?: string | null;
  invitedBy?: string | null;
  invitedCount?: number;
  clicksToday?: number;
  loginDays?: number;
  claimedTasks?: string[];
};
type MinerInst = { isActive: boolean; lastTimeReset: string };
type MinerGrp  = { tokenId: string;  miners: MinerInst[] };
type NftMiner  = { tokenId: string;  count: number };
type TaskRow   = { id: string; label: string; progress: number; target: number; reward: number; claimed: boolean };
type RefInfo   = { code: string; invitedCount: number; invitedBy: string | null; bonusPerInvite: number };

/* ─── API config ─────────────────────────────────────────────── */
// Dev  → VITE_API_BASE not set → uses Vite mock at /__mockup/api
// Prod → set VITE_API_BASE=/api/v2 (or absolute URL) in .env.production
// VITE_API_SUFFIX is appended to every endpoint name — e.g. set it to ".php"
// when serving the backend as plain PHP files (saves you from URL rewriting).
const API_BASE: string   = import.meta.env.VITE_API_BASE   ?? "/__mockup/api";
const API_SUFFIX: string = import.meta.env.VITE_API_SUFFIX ?? "";
const api = (name: string): string => `${API_BASE}/${name}${API_SUFFIX}`;

// Image paths — BASE_URL = "/__mockup/" in dev, "/" in prod
const CRYSTAL_IMG = `${import.meta.env.BASE_URL}crystal.png`;
const POLYGON_IMG = `${import.meta.env.BASE_URL}polygon.png`;

/* ─── API helpers ────────────────────────────────────────────── */
async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    const json = JSON.parse(text);
    return json.success ? (json.data as T) : null;
  } catch {
    return null;
  }
}

function canClaimDaily(userData: UserData, config: GameConfig): boolean {
  if (!userData.lastDailyReward) return true;
  const elapsed = (Date.now() - new Date(userData.lastDailyReward).getTime()) / 1000;
  return elapsed >= config.dailyRewardTime;
}

// Session-storage-backed string state that synchronizes across components in
// the same tab via a CustomEvent bus. Used so Profile + Mining stay in lockstep
// on the connected wallet address without prop-drilling through every render.
function useSyncedSessionString(key: string): [string | null, (v: string | null) => void] {
  const [val, setVal] = useState<string | null>(() => sessionStorage.getItem(key));
  useEffect(() => {
    function onEv(e: Event) {
      const ce = e as CustomEvent<{ key: string; value: string | null }>;
      if (ce.detail?.key === key) setVal(ce.detail.value);
    }
    window.addEventListener("lux:session-sync", onEv);
    return () => window.removeEventListener("lux:session-sync", onEv);
  }, [key]);
  const update = (next: string | null) => {
    setVal(next);
    if (next) sessionStorage.setItem(key, next); else sessionStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("lux:session-sync", { detail: { key, value: next } }));
  };
  return [val, update];
}

/* Decides between the desktop "phone-mockup" frame (390x780 with rounded
   corners) and a viewport-filling mobile/Telegram layout. Compact wins
   when running inside a Telegram WebApp, on a narrow viewport, or on a
   coarse-pointer device (mobile/tablet). Re-evaluates on resize. */
function useIsCompactViewport(forceCompact: boolean): boolean {
  const compute = () => {
    if (typeof window === "undefined") return false;
    if (forceCompact) return true;
    // The Telegram WebApp SDK creates `window.Telegram.WebApp` even in a
    // regular desktop browser, so its mere presence is not a reliable
    // "inside Telegram" signal. The discriminator is initData length:
    // populated only when Telegram itself opened the page as a Mini App.
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.initData === "string" && tg.initData.length > 0) return true;
    const narrow = window.innerWidth < 500;
    const coarse =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return narrow || coarse;
  };
  const [v, setV] = useState<boolean>(compute);
  useEffect(() => {
    const onResize = () => setV(compute());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceCompact]);
  return v;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}ч ${m}м` : m > 0 ? `${m}м ${s}с` : `${s}с`;
}

const DEFAULT_CONFIG: GameConfig = {
  exchangeGemsPerGold: 1000,
  dailyReward: 5000,
  dailyRewardTime: 10800,
  minersStats: [
    { tokenId: "4", gemsPerDay: "30000" },
    { tokenId: "5", gemsPerDay: "70000" },
    { tokenId: "6", gemsPerDay: "150000" },
    { tokenId: "7", gemsPerDay: "350000" },
  ],
};

/* ─── MINING CONSTANTS ───────────────────────────────────────── */
const DEMO_WALLET = "0x3365Demo48587";
const DEMO_NFT_MINERS: NftMiner[] = [
  { tokenId: "4", count: 2 },
  { tokenId: "5", count: 1 },
];
type MinerMeta = { name: string; gemsDay: number; color: string; luxPrice: number };
const MINER_META: Record<string, MinerMeta> = {
  "4": { name: "Basic",    gemsDay: 30_000,  color: "#00d4ff", luxPrice: 50  },
  "5": { name: "Advanced", gemsDay: 70_000,  color: "#a855f7", luxPrice: 100  },
  "6": { name: "Elite",    gemsDay: 150_000, color: "#f59e0b", luxPrice: 200  },
  "7": { name: "Pro",      gemsDay: 350_000, color: "#ff4cf2", luxPrice: 500  },
};
const SHOP_MINERS = Object.entries(MINER_META).map(([id, m]) => ({ tokenId: id, ...m }));

function calcPending(inst: MinerInst, gemsPerDay: number): number {
  if (!inst.isActive) return 0;
  const elapsed = (Date.now() - new Date(inst.lastTimeReset).getTime()) / 86_400_000;
  return Math.floor(gemsPerDay * elapsed);
}

/* ─── AUTH ───────────────────────────────────────────────────── */
// Telegram Login Widget callback type
declare global {
  interface Window {
    onTelegramAuth?: (user: { id: number; first_name?: string; username?: string; auth_date?: number; hash?: string }) => void;
  }
}

const TG_BOT_USERNAME: string = import.meta.env.VITE_TELEGRAM_BOT_NAME ?? "LUX_Clicker_bot";

function AuthScreen({
  onLogin, config, tgUser, loginError,
}: {
  onLogin: (telegramId: string) => Promise<void>;
  config: GameConfig;
  tgUser: TgUser | null;
  loginError: string | null;
}) {
  const [busy, setBusy]           = useState(false);
  const [manualId, setManualId]   = useState("");
  const widgetRef                 = useRef<HTMLDivElement>(null);
  const daily    = config.dailyReward.toLocaleString("ru-RU");
  const exchange = config.exchangeGemsPerGold.toLocaleString("ru-RU");
  const goldEq   = Math.round(config.dailyReward / config.exchangeGemsPerGold);

  // If in Telegram WebApp context — use real user ID directly (no widget needed)
  const inTelegram = !!tgUser;
  const telegramId = tgUser?.id?.toString() ?? "";
  const displayName = tgUser
    ? (tgUser.first_name ?? tgUser.username ?? `ID ${tgUser.id}`)
    : null;

  // ── Real Telegram Login Widget ────────────────────────────────────
  // When the user is NOT already inside a Telegram WebApp (e.g. opened in a
  // regular browser), try to inject the official Login Widget. It only
  // renders if the bot's domain is registered with @BotFather → /setdomain.
  // If the widget fails (which is the common dev case) we fall through to
  // a prominent "Open bot in Telegram" CTA + manual ID input.
  useEffect(() => {
    if (inTelegram) return;
    if (!widgetRef.current) return;
    widgetRef.current.innerHTML = "";

    window.onTelegramAuth = (user) => {
      if (!user?.id) return;
      setBusy(true);
      onLogin(String(user.id)).finally(() => setBusy(false));
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", TG_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    widgetRef.current.appendChild(script);

    return () => {
      if (widgetRef.current) widgetRef.current.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [inTelegram, onLogin]);

  async function handleClick() {
    if (!telegramId) return;
    setBusy(true);
    await Promise.all([
      onLogin(telegramId),
      new Promise(r => setTimeout(r, 800)),
    ]);
    setBusy(false);
  }

  async function handleManual() {
    const id = manualId.trim();
    if (!id) return;
    setBusy(true);
    await onLogin(id);
    setBusy(false);
  }

  return (
    <div className="slide-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 24px 32px" }}>
      {/* Crystal — centered */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <img src={CRYSTAL_IMG} style={{ width: 220, height: 198, objectFit: "contain", filter: "drop-shadow(0 0 32px rgba(0,180,255,0.7)) drop-shadow(0 0 70px rgba(124,58,237,0.5))", animation: "gem-float 3.5s ease-in-out infinite" }} alt="crystal" />
        <h1 className="shimmer-text" style={{ fontSize: 26, fontWeight: 900, marginBottom: 4, marginTop: 16 }}>AliTerra Miner</h1>
        <p style={{ fontSize: 10, color: "rgba(0,212,255,0.4)", letterSpacing: "0.15em" }}>P2E · TELEGRAM MINI APP · POLYGON</p>
      </div>

      {/* Telegram login */}
      <div className="glass-strong" style={{ borderRadius: 24, padding: "22px 20px", border: "1px solid rgba(0,212,255,0.15)", boxShadow: "0 0 50px rgba(0,212,255,0.06)", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 700 }}>Telegram Authorization</p>

        {inTelegram ? (
          /* Inside a real Telegram Mini App we already have the user — one
             click confirms and logs them in. */
          <button onClick={handleClick} disabled={busy} style={{ width: "100%", padding: "12px 0", borderRadius: 14, background: busy ? "rgba(0,136,204,0.4)" : "linear-gradient(135deg, #0088cc, #005fa3)", border: "1px solid rgba(0,136,204,0.4)", boxShadow: "0 0 24px rgba(0,136,204,0.35)", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#fff", transition: "all 0.2s", opacity: busy ? 0.7 : 1 }}>
            {busy ? (
              <span style={{ fontSize: 13 }}>Connecting…</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 18, height: 18 }}>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.03 9.564c-.153.68-.553.847-1.12.527l-3.1-2.285-1.495 1.437c-.165.165-.304.304-.623.304l.223-3.162 5.748-5.192c.25-.222-.054-.345-.388-.123L6.8 14.51l-3.051-.952c-.663-.207-.676-.663.138-.98l11.916-4.595c.55-.2 1.033.134.759.265z" />
                </svg>
                Войти как {displayName}
              </>
            )}
          </button>
        ) : (
          /* Regular browser. Show the official Telegram Login Widget, plus
             a compact manual-ID fallback for QA/testing (e.g. when the
             tester doesn't want to OAuth through Telegram). */
          <>
            <div
              ref={widgetRef}
              style={{
                minHeight: 44,
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.4, margin: "4px 0 -4px" }}>
              или введи Telegram ID вручную для теста
            </p>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Telegram ID или demo_user"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,212,255,0.25)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 13 }}
                onKeyDown={(e) => { if (e.key === "Enter" && manualId.trim()) handleManual(); }}
              />
              <button
                onClick={handleManual}
                disabled={busy || !manualId.trim()}
                className="lux-btn"
                style={{ padding: "0 18px", borderRadius: 12, border: "1px solid rgba(0,212,255,0.35)", background: "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(124,58,237,0.22))", color: "#00d4ff", fontSize: 12, fontWeight: 700, opacity: (busy || !manualId.trim()) ? 0.5 : 1, cursor: busy ? "default" : "pointer" }}
              >
                {busy ? "…" : "Login"}
              </button>
            </div>
          </>
        )}
        {loginError && (
          <p style={{ fontSize: 11, color: "#ff6b6b", textAlign: "center", lineHeight: 1.4 }}>
            ⚠ {loginError}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        {[
          { icon: "💎", val: "∞", label: "Gems" },
          { icon: "⬡", val: "4 NFT", label: "Miners" },
        ].map(s => (
          <div key={s.label} className="glass" style={{ flex: 1, borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#00d4ff" }}>{s.val}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{s.label}</p>
          </div>
        ))}
        <div className="glass" style={{ flex: 1, borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
          <img src={POLYGON_IMG} style={{ width: 22, height: 22, margin: "0 auto 3px", display: "block", objectFit: "contain" }} alt="polygon" />
          <p style={{ fontSize: 11, fontWeight: 700, color: "#00d4ff" }}>Polygon</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>Chain</p>
        </div>
      </div>

      {/* Daily / Exchange — real backend values */}
      <div className="glass" style={{ borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Daily Reward</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#00d4ff" }}>{daily} 💎</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>= {goldEq} Gold</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Exchange Rate</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#00d4ff" }}>{exchange} 💎</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>= 1 Gold</p>
        </div>
      </div>
    </div>
  );
}

/* ─── HOME ───────────────────────────────────────────────────── */
function HomeScreen({
  initScore, initLastDaily, telegram, config, onScoreUpdate,
}: {
  initScore: number;
  initLastDaily: string | null;
  telegram: string;
  config: GameConfig;
  onScoreUpdate: (s: number, lastDaily?: string | null) => void;
}) {
  const [score, setScore]         = useState(initScore);
  const [flies, setFlies]         = useState<{ id: number; x: number; y: number }[]>([]);
  const [tapped, setTapped]       = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMsg, setClaimMsg]   = useState<string | null>(null);
  const [lastDaily, setLastDaily]  = useState<string | null>(initLastDaily);
  // Anti-cheat: when uniform tap cadence is detected, taps are locked for a
  // few seconds and the user sees a brief warning.
  const [tapLockUntil, setTapLockUntil] = useState(0);
  const [tapLockMsg,   setTapLockMsg]   = useState<string | null>(null);
  const ref    = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  // Auto-save score to backend at most once per second while tapping is
  // active. We also flush *immediately* on unmount, tab hide, and beforeunload
  // so that the user never loses unsaved taps when they switch tab/refresh.
  // Each save sends the absolute score + the delta of clicks since the last
  // save so the backend can increment clicks_today (used by Daily Tasks).
  const pendingSave   = useRef(false);
  const pendingClicks = useRef(0);
  const lastSavedAt   = useRef(0);
  const scoreRef      = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const flushSave = useCallback((opts?: { keepalive?: boolean }) => {
    if (!pendingSave.current || !telegram) return;
    const delta = pendingClicks.current;
    const s = scoreRef.current;
    pendingSave.current = false;
    pendingClicks.current = 0;
    lastSavedAt.current = Date.now();
    const body = JSON.stringify({ telegram, score: s, clicksDelta: delta });
    if (opts?.keepalive && "sendBeacon" in navigator) {
      // beforeunload — use a fire-and-forget transport that the browser
      // guarantees to deliver even as the tab unloads.
      navigator.sendBeacon(api("save-score"), new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(api("save-score"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: opts?.keepalive,
    }).then(() => onScoreUpdate(s, undefined)).catch(() => {});
  }, [telegram, onScoreUpdate]);

  // Periodic flush + flush on tab hide / unload / unmount.
  useEffect(() => {
    const interval = setInterval(() => flushSave(), 1000);
    const onHide   = () => { if (document.visibilityState === "hidden") flushSave({ keepalive: true }); };
    const onUnload = () => flushSave({ keepalive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      flushSave({ keepalive: true });
    };
  }, [flushSave]);

  // Anti-cheat: keep the last few tap timestamps. If the most recent intervals
  // are uniformly spaced (low variance) AND fast, treat as an autoclicker and
  // lock the crystal for 3 seconds. Real human tapping has natural jitter,
  // so a 12 ms standard-deviation window catches autoclickers without
  // false-flagging fast humans.
  const tapTimes = useRef<number[]>([]);
  const ANTI_CHEAT_WINDOW = 6;     // sample size
  const ANTI_CHEAT_STDDEV = 12;    // ms — lower stddev = more uniform = bot-like
  const ANTI_CHEAT_MAX_INT = 220;  // only police *fast* tapping (>4.5 cps)
  const ANTI_CHEAT_BLOCK   = 3000; // ms lockout

  function tap(e: React.MouseEvent) {
    const now = Date.now();
    if (now < tapLockUntil) return; // locked — ignore

    // Rolling sample of intervals
    tapTimes.current.push(now);
    if (tapTimes.current.length > ANTI_CHEAT_WINDOW) tapTimes.current.shift();
    if (tapTimes.current.length === ANTI_CHEAT_WINDOW) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimes.current.length; i++) intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / intervals.length;
      const stddev = Math.sqrt(variance);
      if (mean < ANTI_CHEAT_MAX_INT && stddev < ANTI_CHEAT_STDDEV) {
        // Bot-like cadence detected
        const until = now + ANTI_CHEAT_BLOCK;
        setTapLockUntil(until);
        setTapLockMsg("Слишком ровный темп — пауза 3 сек");
        tapTimes.current = [];
        setTimeout(() => setTapLockMsg(null), ANTI_CHEAT_BLOCK);
        return;
      }
    }

    const rect = ref.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setScore(s => s + 1);
    pendingSave.current = true;
    pendingClicks.current += 1;
    setFlies(f => [...f, { id, x, y }]);
    setTapped(true);
    setTimeout(() => setTapped(false), 350);
    setTimeout(() => setFlies(f => f.filter(fly => fly.id !== id)), 900);
  }

  const canClaim = !lastDaily || (Date.now() - new Date(lastDaily).getTime()) / 1000 >= config.dailyRewardTime;

  async function claimDaily() {
    if (!canClaim || claimBusy) return;
    setClaimBusy(true);
    const res = await apiPost<{ score: number; reward: number }>(api("claim-daily"), { telegram });
    if (res) {
      const ts = new Date().toISOString();
      setScore(res.score);
      setLastDaily(ts);
      onScoreUpdate(res.score, ts);
      setClaimMsg(`+${res.reward.toLocaleString("ru-RU")} 💎 Daily Reward!`);
      setTimeout(() => setClaimMsg(null), 3500);
    }
    setClaimBusy(false);
  }

  return (
    <div className="slide-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "28px 20px 100px" }}>

      {/* Score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span className="shimmer-text" style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
          {score.toLocaleString("ru-RU")}
        </span>
        <span style={{ fontSize: 38, lineHeight: 1, filter: "drop-shadow(0 0 10px rgba(0,200,255,0.8))" }}>💎</span>
      </div>

      {/* Daily Claim banner / button */}
      {canClaim ? (
        <button onClick={claimDaily} disabled={claimBusy} style={{ marginTop: -8, padding: "7px 20px", borderRadius: 20, background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.25))", border: "1px solid rgba(0,212,255,0.4)", boxShadow: "0 0 18px rgba(0,212,255,0.3)", cursor: claimBusy ? "default" : "pointer", fontSize: 12, fontWeight: 700, color: "#00d4ff", letterSpacing: "0.05em", transition: "all 0.2s", opacity: claimBusy ? 0.6 : 1 }}>
          {claimBusy ? "Claiming…" : `🎁 Daily +${config.dailyReward.toLocaleString("ru-RU")} 💎`}
        </button>
      ) : (
        <p style={{ marginTop: -8, fontSize: 10, color: "rgba(0,212,255,0.3)", letterSpacing: "0.05em" }}>Next daily reward available soon</p>
      )}

      {/* Fly-reward toast */}
      {claimMsg && (
        <div style={{ position: "absolute", top: 90, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(124,58,237,0.3))", border: "1px solid rgba(0,212,255,0.5)", borderRadius: 14, padding: "10px 20px", fontSize: 14, fontWeight: 800, color: "#00d4ff", boxShadow: "0 0 30px rgba(0,212,255,0.4)", whiteSpace: "nowrap", animation: "slide-in 0.3s ease", zIndex: 100 }}>
          {claimMsg}
        </div>
      )}

      {/* Anti-cheat lock toast */}
      {tapLockMsg && (
        <div style={{ position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.3))", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 14, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fca5a5", boxShadow: "0 0 30px rgba(239,68,68,0.35)", whiteSpace: "nowrap", animation: "slide-in 0.3s ease", zIndex: 100 }}>
          ⏸ {tapLockMsg}
        </div>
      )}

      {/* Crystal tap button */}
      <button ref={ref} onClick={tap} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: 0, marginTop: 8, flexShrink: 0 }}>
        {/* outer orbit ring with 4 dots at cardinal points */}
        <div style={{ position: "absolute", inset: -28, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.15)", animation: "ring-spin 12s linear infinite" }}>
          {[
            { top: "calc(50% - 3px)", left: -3 },
            { top: "calc(50% - 3px)", right: -3 },
            { top: -3, left: "calc(50% - 3px)" },
            { bottom: -3, left: "calc(50% - 3px)" },
          ].map((pos, i) => (
            <div key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 8px #00d4ff, 0 0 16px #00d4ff88", ...pos }} />
          ))}
        </div>
        {/* inner orbit ring */}
        <div style={{ position: "absolute", inset: -14, borderRadius: "50%", border: "1px solid rgba(124,58,237,0.25)", animation: "ring-spin-rev 8s linear infinite" }} />

        <div className={tapped ? "gem-tapped" : "gem-float"} style={{ position: "relative", zIndex: 2 }}>
          <img
            src={CRYSTAL_IMG}
            style={{
              width: 320, height: 260,
              objectFit: "contain", objectPosition: "center",
              display: "block",
              filter: [
                "drop-shadow(0 0 20px rgba(0,200,255,1))",
                "drop-shadow(0 0 50px rgba(0,180,255,0.8))",
                "drop-shadow(0 0 90px rgba(124,58,237,0.7))",
                "brightness(1.2)",
                "saturate(1.3)",
              ].join(" "),
            }}
            alt="crystal"
          />
        </div>

        {flies.map(f => <FlyText key={f.id} {...f} />)}
      </button>

      {/* Tap hint */}
      <p style={{ fontSize: 11, color: "rgba(0,212,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", animation: "neon-pulse 2s ease-in-out infinite" }}>
        ◈ ТАП ДЛЯ ДОБЫЧИ ◈
      </p>
    </div>
  );
}

/* ─── THIRDWEB / BLOCKCHAIN CONFIG ────────────────────────────── */
const TW_CLIENT_ID        = "2f46f446e2b06ddad0a6875b18062e24";
const CHAIN_ID            = 137; // Polygon
const NFT_ADDRESS         = "0x815AFC2bcDec02d5b0447508EE41476fFa3817FF";
const MARKETPLACE_ADDR    = "0x289e25Ef58C00cE66eb726a8a4672B706e2f2691";
const LUX_TOKEN_ADDR      = "0x7324c346b47250A3e147a3c43B7A1545D0dC0796";
const ACCOUNT_FACTORY_ADDR = "0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8";
const SELLER_WALLET       = "0xB19aEe699eb4D2Af380c505E4d6A108b055916eB".toLowerCase();

// ── Listing type ───────────────────────────────────────────────
type Listing = {
  listingId:      bigint;
  listingCreator: string;
  assetContract:  string;
  tokenId:        bigint;
  pricePerToken:  bigint;
  currency:       string;
  quantity:       bigint;
};

// ── Function selectors (keccak4 precomputed) ───────────────────
const SEL: Record<string, string> = {
  "balanceOf(address,uint256)":                              "00fdd58e",
  "totalListings()":                                         "c78b616c",
  "getAllValidListings(uint256,uint256)":                     "c5275fb0",
  "balanceOf(address)":                                      "70a08231",
  "decimals()":                                              "313ce567",
  "allowance(address,address)":                              "dd62ed3e",
  "approve(address,uint256)":                                "095ea7b3",
  "buyFromListing(uint256,address,uint256,address,uint256)": "704232dc",
  // AccountFactory (0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8)
  "getAddress(address,bytes)":                               "8878ed33",
  // SmartWallet Account — execute call (delegates tx through smart wallet)
  "execute(address,uint256,bytes)":                          "b61d27f6",
};

// ── Raw JSON-RPC via Thirdweb RPC endpoint ─────────────────────
const RPC_URL = `https://${CHAIN_ID}.rpc.thirdweb.com/${TW_CLIENT_ID}`;

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const resp = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const { result, error } = await resp.json();
  if (error) throw new Error(error.message ?? JSON.stringify(error));
  return result;
}

// ── ABI encode helpers ─────────────────────────────────────────
function pad32(v: string): string {
  return v.replace(/^0x/, "").padStart(64, "0");
}
function encodeUint(n: bigint | number): string {
  return BigInt(n).toString(16).padStart(64, "0");
}
function encodeAddr(a: string): string {
  return a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}
function encodeCalldata(sig: string, ...args: Array<bigint | number | string>): string {
  const sel = SEL[sig];
  if (!sel) throw new Error(`No selector for: ${sig}`);
  const encoded = args.map(a => {
    if (typeof a === "string") return encodeAddr(a);
    return encodeUint(BigInt(a));
  }).join("");
  return "0x" + sel + encoded;
}

async function ethCall(to: string, sig: string, ...args: Array<bigint | number | string>): Promise<string> {
  const data = encodeCalldata(sig, ...args);
  return (await rpcCall("eth_call", [{ to, data }, "latest"])) as string;
}

// ── ABI decode helpers ─────────────────────────────────────────
function decodeBigInt(hex: string): bigint {
  const clean = hex.replace(/^0x/, "");
  return clean ? BigInt("0x" + clean) : 0n;
}
function decodeWord(hex: string, wordIndex: number): string {
  const clean = hex.replace(/^0x/, "");
  const start = wordIndex * 64;
  return clean.slice(start, start + 64);
}
function wordBigInt(hex: string, wordIndex: number): bigint {
  return BigInt("0x" + (decodeWord(hex, wordIndex) || "0"));
}
function wordAddr(hex: string, wordIndex: number): string {
  return "0x" + decodeWord(hex, wordIndex).slice(24);
}

// ── Manual decode for getAllValidListings ──────────────────────
// Thirdweb DirectListings V3 Listing struct (12 words each):
//  base+0:  listingId      (uint256)
//  base+1:  tokenId        (uint256)
//  base+2:  quantity       (uint256)
//  base+3:  pricePerToken  (uint256)
//  base+4:  startTimestamp (uint128)
//  base+5:  endTimestamp   (uint128)
//  base+6:  listingCreator (address)
//  base+7:  assetContract  (address)
//  base+8:  currency       (address)
//  base+9:  tokenType      (enum uint8)
//  base+10: status         (enum uint8)  1=CREATED 2=COMPLETED 3=CANCELLED
//  base+11: reserved       (bool)
function decodeListings(hex: string): Listing[] {
  const data = hex.replace(/^0x/, "");
  if (!data || data.length < 128) return [];
  // word 0 = array data offset (0x20), word 1 = array length
  const count = Number(wordBigInt(hex, 1));
  if (count === 0) return [];
  const listings: Listing[] = [];
  for (let i = 0; i < count; i++) {
    const base = 2 + i * 12;
    const status        = wordBigInt(hex, base + 10);
    if (status !== 1n) continue; // skip COMPLETED / CANCELLED
    const listingId      = wordBigInt(hex, base + 0);
    const tokenId        = wordBigInt(hex, base + 1);
    const quantity       = wordBigInt(hex, base + 2);
    const pricePerToken  = wordBigInt(hex, base + 3);
    const listingCreator = wordAddr(hex, base + 6);
    const assetContract  = wordAddr(hex, base + 7);
    const currency       = wordAddr(hex, base + 8);
    listings.push({ listingId, listingCreator, assetContract, tokenId, quantity, currency, pricePerToken });
  }
  return listings;
}

// ── On-chain reads (pure JSON-RPC, no package needed) ─────────
async function getNftBalance(wallet: string, tokenId: number): Promise<number> {
  const res = await ethCall(NFT_ADDRESS, "balanceOf(address,uint256)", wallet, BigInt(tokenId));
  return Number(decodeBigInt(res));
}

async function getLuxBalance(wallet: string): Promise<number> {
  const [balHex, decHex] = await Promise.all([
    ethCall(LUX_TOKEN_ADDR, "balanceOf(address)", wallet),
    ethCall(LUX_TOKEN_ADDR, "decimals()"),
  ]);
  const bal = decodeBigInt(balHex);
  const dec = Number(decodeBigInt(decHex));
  return Number(bal) / 10 ** dec;
}

async function getLuxAllowance(owner: string): Promise<bigint> {
  const res = await ethCall(LUX_TOKEN_ADDR, "allowance(address,address)", owner, MARKETPLACE_ADDR);
  return decodeBigInt(res);
}

// ── Encode SmartWallet.execute(address target, uint256 value, bytes data) ──
// ABI layout: sel(4) + target(32) + value(32) + offset(32=96) + bytesLen(32) + bytesData(padded)
function encodeExecute(target: string, innerCalldata: string): string {
  const inner   = innerCalldata.replace(/^0x/, "");
  const innerLen = BigInt(inner.length / 2);
  const padded  = inner.padEnd(Math.ceil(inner.length / 64) * 64, "0");
  return (
    "0x" +
    SEL["execute(address,uint256,bytes)"] +
    encodeAddr(target) +
    encodeUint(0n) +          // value = 0
    encodeUint(96n) +         // offset to bytes arg = 3 × 32
    encodeUint(innerLen) +    // bytes length
    padded                    // bytes data
  );
}

// ── AccountFactory: get SmartWallet address for a given EOA ──
// Calls: getAddress(address admin, bytes data) with empty bytes
// Returns counterfactual address (may not be deployed yet)
async function getSmartWalletAddress(eoa: string): Promise<string> {
  const calldata =
    "0x" +
    SEL["getAddress(address,bytes)"] +
    encodeAddr(eoa) +   // address admin
    encodeUint(64n) +   // offset to bytes arg = 2 × 32
    encodeUint(0n);     // bytes length = 0 (empty)
  const result = (await rpcCall("eth_call", [{ to: ACCOUNT_FACTORY_ADDR, data: calldata }, "latest"])) as string;
  // Result is 32-byte right-padded address; last 20 bytes = address
  return "0x" + result.slice(-40);
}

async function getTotalListings(): Promise<bigint> {
  const res = await ethCall(MARKETPLACE_ADDR, "totalListings()");
  return decodeBigInt(res);
}

async function getListingsFromChain(): Promise<Listing[]> {
  try {
    const total = await getTotalListings();
    if (total === 0n) return [];
    const endId = total - 1n;
    const data   = encodeCalldata("getAllValidListings(uint256,uint256)", 0n, endId);
    const result = (await rpcCall("eth_call", [{ to: MARKETPLACE_ADDR, data }, "latest"])) as string;
    return decodeListings(result);
  } catch (e) {
    console.error("getListings error", e);
    return [];
  }
}

// ── window.ethereum wallet connection ─────────────────────────
declare global {
  interface Window { ethereum?: any; }
}

// ── Social wallet singleton (ethers.Wallet in memory for this session) ─────
// Populated by connectSocial(); cleared on disconnect.
// Private key is kept only in memory (+ sessionStorage for tab-switch restore).
let _socialWallet: ethers.Wallet | null = null;

/** Restore a previously-created social wallet from localStorage on page load.
 *  Falls back to sessionStorage for backwards compatibility with old sessions. */
function restoreSocialWallet(): ethers.Wallet | null {
  try {
    const pk = localStorage.getItem("lux_social_pk") ?? sessionStorage.getItem("lux_social_pk");
    if (!pk) return null;
    return new ethers.Wallet(pk);
  } catch { return null; }
}
_socialWallet = restoreSocialWallet();

/** Derive a real EOA from SHA-256(seed) used as a secp256k1 private key.
 *  ethers.Wallet performs: secp256k1.getPublicKey(pk) → keccak256 → address.
 *  The resulting address IS a valid Polygon/Ethereum account — any MATIC/LUX
 *  sent to it is accessible once the private key is used to sign transactions. */
async function deriveSocialWallet(providerId: string): Promise<ethers.Wallet> {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  // Anon ID lives in localStorage so the same browser always yields the same
  // wallet for the same provider+telegram pair. Migrate from sessionStorage if
  // present (older sessions stored it there).
  let anonId = localStorage.getItem("lux_anon_id") ?? sessionStorage.getItem("lux_anon_id");
  if (!anonId) { anonId = Math.random().toString(36).slice(2, 18); }
  localStorage.setItem("lux_anon_id", anonId);
  const seed = tgUser?.id
    ? `lux:${providerId}:tg:${tgUser.id}`
    : `lux:${providerId}:anon:${anonId}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  const pkHex = "0x" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  // ethers.Wallet derives the correct Ethereum address via secp256k1 + keccak256
  return new ethers.Wallet(pkHex);
}

async function requestAccounts(): Promise<string> {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts.length) throw new Error("No accounts returned");
  // Switch to Polygon
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
  } catch (switchErr: any) {
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x89", chainName: "Polygon Mainnet",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: [RPC_URL], blockExplorerUrls: ["https://polygonscan.com"],
        }],
      });
    }
  }
  // Clear any social wallet when connecting via MetaMask
  _socialWallet = null;
  sessionStorage.removeItem("lux_social_pk");
  sessionStorage.removeItem("lux_social_provider");
  localStorage.removeItem("lux_social_pk");
  localStorage.removeItem("lux_social_provider");
  return accounts[0];
}

/** Send a transaction — supports both MetaMask (injected) and social wallet (ethers signer).
 *  Social wallet: signs the raw tx locally with the stored private key, broadcasts via RPC. */
async function sendTx(from: string, to: string, data: string): Promise<string> {
  // ── Path 1: MetaMask / injected provider ──────────────────────────────────
  if (window.ethereum && !_socialWallet) {
    const txHash: string = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from, to, data, chainId: "0x89" }],
    });
    return await waitForReceipt(txHash);
  }

  // ── Path 2: Social wallet — sign locally, broadcast via Thirdweb RPC ─────
  if (_socialWallet) {
    const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: 137, name: "polygon" });
    const signer   = _socialWallet.connect(provider);
    // Fetch nonce + gas price from chain
    const [nonce, feeData] = await Promise.all([
      provider.getTransactionCount(signer.address),
      provider.getFeeData(),
    ]);
    const tx = await signer.sendTransaction({
      to, data, nonce,
      chainId: 137,
      gasLimit: 350_000n,
      maxFeePerGas:         feeData.maxFeePerGas         ?? ethers.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? ethers.parseUnits("30", "gwei"),
    });
    return await waitForReceipt(tx.hash);
  }

  throw new Error("No wallet available for signing");
}

async function waitForReceipt(txHash: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]) as any;
    if (receipt) {
      if (receipt.status === "0x1") return txHash;
      throw new Error("Transaction reverted on chain");
    }
  }
  throw new Error("Transaction timeout (120s)");
}

/* ─── MINING ─────────────────────────────────────────────────── */
const RARITY_LABEL: Record<string, string> = {
  "4": "COMMON", "5": "RARE", "6": "EPIC", "7": "LEGENDARY",
};

/* ── WalletModal — social sign-in (deterministic addr) OR real wallet ── */
// Step "home"    → social icons + email + "Connect a Wallet" button
// Step "wallets" → specific wallet list (MetaMask / mobile deep links)
// Social login: SHA-256(provider + telegramId) → deterministic EOA-style address
//   • Same user + same provider → same address every session
//   • Score/miners stored in SQLite by wallet_address (works like any wallet)
function WalletModal({ onConnect, onClose }: { onConnect: (addr: string) => void; onClose: () => void }) {
  const [step,        setStep]        = useState<"home" | "wallets">("home");
  const [status,      setStatus]      = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [connecting,  setConnecting]  = useState<string | null>(null); // which social is loading

  const hasInjected = typeof window !== "undefined" && !!window.ethereum;
  const pageUrl  = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
  const pageHost = typeof window !== "undefined" ? window.location.host + window.location.pathname : "";

  // Thirdweb v5 hooks — real OAuth-based wallet connect.
  const { connect: twConnect } = useConnect();

  async function connectInjected() {
    setStatus("Connecting…");
    setError(null);
    try {
      // Prefer Thirdweb's MetaMask wallet (handles chain-switch, signing,
      // proper provider events). Falls back to direct window.ethereum if
      // Thirdweb fails for any reason.
      try {
        const mm = createWallet("io.metamask");
        const account = await twConnect(async () => {
          await mm.connect({ client: twClient, chain: polygonChain });
          return mm;
        });
        if (account?.address) {
          setStatus(null);
          onConnect(account.address);
          return;
        }
      } catch {
        // Fall through to direct injection
      }
      const addr = await requestAccounts();
      setStatus(null);
      onConnect(addr);
    } catch (e: any) {
      setError(e?.message ?? "Connection failed");
      setStatus(null);
    }
  }

  function openDeepLink(url: string) {
    window.open(url, "_blank");
  }

  /** Connect via a *real* social OAuth flow through Thirdweb's in-app wallet.
   *  Opens the provider's OAuth popup (google.com, telegram.org, etc.),
   *  authenticates the user, and returns a real EOA that the user controls
   *  through their social account.
   *  Falls back to deterministic derivation if Thirdweb fails (offline /
   *  blocked / unsupported strategy). */
  async function connectSocial(providerId: string) {
    setConnecting(providerId);
    setError(null);
    const strategy = SOCIAL_STRATEGY[providerId];
    try {
      if (strategy) {
        const wallet = inAppWallet();
        const account = await twConnect(async () => {
          await wallet.connect({ client: twClient, chain: polygonChain, strategy });
          return wallet;
        });
        if (account?.address) {
          // Clear the legacy deterministic wallet — Thirdweb manages signing
          // through its own session now.
          _socialWallet = null;
          localStorage.setItem("lux_social_provider", providerId);
          localStorage.setItem("lux_thirdweb_addr", account.address);
          setConnecting(null);
          onConnect(account.address);
          return;
        }
      }
      throw new Error(`Strategy ${providerId} not supported by Thirdweb`);
    } catch (err: any) {
      // Fallback: deterministic SHA-256-based EOA so the user still has a
      // working wallet even when Thirdweb is unreachable (offline /
      // popup-blocked).
      try {
        const wallet = await deriveSocialWallet(providerId);
        localStorage.setItem("lux_social_pk",       wallet.privateKey);
        localStorage.setItem("lux_social_provider", providerId);
        sessionStorage.setItem("lux_social_pk",     wallet.privateKey);
        sessionStorage.setItem("lux_social_provider", providerId);
        _socialWallet = wallet;
        setConnecting(null);
        onConnect(wallet.address);
      } catch {
        setError(err?.message ?? "Connection failed. Please try again.");
        setConnecting(null);
      }
    }
  }

  type SocialEntry = { id: string; label: string; color: string; svg: React.ReactNode };
  const SOCIAL: SocialEntry[] = [
    {
      id: "google", label: "Google", color: "#4285F4",
      svg: (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
    },
    {
      id: "telegram", label: "Telegram", color: "#0088cc",
      svg: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.13.57-.47.71-.94.44l-2.6-1.92-1.26 1.21c-.14.14-.26.26-.53.26l.19-2.66 4.83-4.36c.21-.19-.05-.29-.32-.11L7.6 14.53l-2.55-.8c-.55-.17-.56-.55.12-.82l9.96-3.84c.46-.17.86.11.51.73z" fill="#0088cc"/>
        </svg>
      ),
    },
    {
      id: "twitter", label: "Twitter", color: "#e7e7e7",
      svg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#e7e7e7">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      id: "linkedin", label: "LinkedIn", color: "#0077b5",
      svg: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#0077b5">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      id: "discord", label: "Discord", color: "#5865f2",
      svg: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#5865f2">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ),
    },
  ];

  const WALLETS = [
    { id: "mm",       icon: "🦊", label: "MetaMask",         sub: hasInjected ? "Detected" : "Extension",  color: "#f6851b", action: hasInjected ? connectInjected : () => openDeepLink(`https://metamask.app.link/dapp/${pageHost}`) },
    { id: "trust",    icon: "🛡", label: "Trust Wallet",    sub: "Mobile",    color: "#3375bb", action: () => openDeepLink(`https://link.trustwallet.com/open_url?coin_id=60&url=${pageUrl}`) },
    { id: "coinbase", icon: "🔵", label: "Coinbase Wallet", sub: "Mobile",    color: "#0052ff", action: () => openDeepLink(`https://go.cb-w.com/dapp?cb_url=${pageUrl}`) },
    { id: "rainbow",  icon: "🌈", label: "Rainbow",         sub: "Mobile",    color: "#7c3aed", action: () => openDeepLink(`https://rnbwapp.com/wc?uri=${pageUrl}`) },
  ];

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
  };
  const sheet: React.CSSProperties = {
    width: 360, background: "#111827",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 20, padding: "24px 20px 28px",
    display: "flex", flexDirection: "column", gap: 12,
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  };

  // ── Home screen ──
  if (step === "home") {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={sheet} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Sign in</p>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 19, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {/* Social buttons — unified glassmorphism style, each triggers connectSocial() */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {SOCIAL.map(s => {
              const isActive = connecting === s.id;
              return (
                <button key={s.id} title={s.label}
                  disabled={!!connecting}
                  onClick={() => connectSocial(s.id)}
                  style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${isActive ? s.color : "rgba(255,255,255,0.1)"}`,
                    boxShadow: isActive ? `0 0 14px ${s.color}55` : "none",
                    cursor: connecting ? "default" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 3,
                    transition: "all 0.18s",
                    opacity: connecting && !isActive ? 0.45 : 1,
                  }}>
                  {isActive
                    ? <span style={{ fontSize: 18, animation: "spin 0.8s linear infinite" }}>⟳</span>
                    : s.svg}
                </button>
              );
            })}
          </div>
          {connecting && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", margin: "-4px 0" }}>
              Connecting via {SOCIAL.find(s => s.id === connecting)?.label}…
            </p>
          )}

          {/* Email field */}
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "0 14px", height: 46, gap: 8 }}
            onClick={() => setError("Email login requires Thirdweb InAppWallet — connect via wallet below")}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", flex: 1, cursor: "pointer" }}>Email address</span>
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.2)" }}>→</span>
          </div>

          {/* Phone + Passkey */}
          {(["📞  Phone number", "🔑  Passkey"] as const).map(label => (
            <button key={label}
              onClick={() => setError("Requires Thirdweb InAppWallet — connect via wallet below")}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
              {label}
            </button>
          ))}

          {error && (
            <p style={{ fontSize: 10, color: "rgba(255,180,0,0.7)", background: "rgba(255,180,0,0.06)", borderRadius: 8, padding: "7px 10px", lineHeight: 1.4 }}>⚠ {error}</p>
          )}

          {/* OR divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Connect a Wallet — the WORKING path */}
          <button onClick={() => { setError(null); setStep("wallets"); }}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 13, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 0 20px rgba(0,212,255,0.1)" }}>
            <span style={{ fontSize: 20 }}>⬡</span>
            <span>Connect a Wallet</span>
            <span style={{ marginLeft: "auto", fontSize: 16, opacity: 0.5 }}>›</span>
          </button>

          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center" }}>
            Powered by <strong>thirdweb</strong> · Polygon Mainnet
          </p>
        </div>
      </div>
    );
  }

  // ── Wallets screen ──
  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setStep("home"); setError(null); setStatus(null); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>‹</button>
          <p style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Connect a Wallet</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 19, cursor: "pointer", lineHeight: 1, marginLeft: "auto" }}>✕</button>
        </div>

        {status && <p style={{ fontSize: 12, color: "#00d4ff", textAlign: "center", padding: "4px 0" }}>⏳ {status}</p>}
        {error  && <p style={{ fontSize: 11, color: "#ff6b6b", background: "rgba(255,60,60,0.07)", borderRadius: 9, padding: "8px 12px" }}>⚠ {error}</p>}

        {WALLETS.map(w => (
          <button key={w.id} onClick={w.action}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.18s" }}>
            <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{w.icon}</span>
            <span style={{ flex: 1, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#fff" }}>{w.label}</span>
              <span style={{ display: "block", fontSize: 10, color: w.id === "mm" && hasInjected ? "#4ade80" : "rgba(255,255,255,0.3)", marginTop: 1 }}>{w.sub}</span>
            </span>
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.2)" }}>›</span>
          </button>
        ))}

        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", marginTop: 2 }}>
          Powered by <strong>thirdweb</strong> · Polygon · Chain ID: {CHAIN_ID}
        </p>
      </div>
    </div>
  );
}

/* ── Buy confirmation modal ─────────────────────────────────── */
// walletAddr = the connected wallet (signs & pays, receives NFT)
// Flow: walletAddr → LUX.approve(marketplace, price) → marketplace.buyFromListing(...)
function BuyModal({
  listing, meta, walletAddr, luxBal, onDone, onClose,
}: {
  listing: Listing;
  meta: MinerMeta & { tokenId: string };
  walletAddr: string;
  luxBal: number;
  onDone: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase]   = useState<"idle" | "checking" | "approving" | "buying" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const priceLux   = Number(listing.pricePerToken) / 1e18;
  const canAfford  = luxBal >= priceLux;
  const luxDisplay = priceLux >= 1000 ? `${(priceLux/1000).toFixed(2)}K` : priceLux.toFixed(2);

  async function handleBuy() {
    setPhase("checking");
    setErrMsg(null);
    try {
      // 1. Check wallet's current LUX allowance for the Marketplace
      const allowance = await getLuxAllowance(walletAddr);

      if (allowance < listing.pricePerToken) {
        // 2. Approve directly: walletAddr → LUX.approve(marketplace, price×10)
        setPhase("approving");
        await sendTx(
          walletAddr,
          LUX_TOKEN_ADDR,
          encodeCalldata("approve(address,uint256)", MARKETPLACE_ADDR, listing.pricePerToken * 10n),
        );
      }

      // 3. Buy directly: walletAddr → marketplace.buyFromListing(id, walletAddr, 1, LUX, price)
      setPhase("buying");
      await sendTx(
        walletAddr,
        MARKETPLACE_ADDR,
        encodeCalldata(
          "buyFromListing(uint256,address,uint256,address,uint256)",
          listing.listingId,
          walletAddr,       // buyFor = connected wallet (receives NFT)
          1n,
          LUX_TOKEN_ADDR,
          listing.pricePerToken,
        ),
      );

      setPhase("done");
      setTimeout(() => { onDone(); onClose(); }, 2000);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Transaction failed");
      setPhase("error");
    }
  }

  const phaseLabel: Record<string, string> = {
    checking: "Checking allowance…",
    approving: "Approving LUX spend…",
    buying: "Buying NFT…",
    done: "✓ NFT purchased!",
    error: "Transaction failed",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 320, background: "linear-gradient(160deg, #0d1e38, #060f1e)", border: `1px solid ${meta.color}33`, borderRadius: 24, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800 }}>Buy NFT Miner</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {/* NFT info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: `${meta.color}0a`, border: `1px solid ${meta.color}22`, borderRadius: 14, padding: "12px 14px" }}>
          <img src={CRYSTAL_IMG} style={{ width: 44, height: 40, objectFit: "contain", filter: `drop-shadow(0 0 10px ${meta.color}cc)` }} alt="nft" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800 }}>{meta.name} Miner</p>
            <p style={{ fontSize: 10, color: meta.color }}>{RARITY_LABEL[meta.tokenId]} · Token #{meta.tokenId}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{meta.gemsDay.toLocaleString("ru-RU")} 💎/день</p>
          </div>
        </div>
        {/* Price row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Price</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#ffd700", textShadow: "0 0 14px #ffd70066" }}>{luxDisplay} LUX</span>
        </div>
        {/* Balance */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.35)", padding: "0 2px" }}>
          <span>Your balance: {luxBal.toFixed(2)} LUX</span>
          {!canAfford && <span style={{ color: "#ff6b6b" }}>Insufficient funds</span>}
        </div>
        {/* Status */}
        {phase !== "idle" && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: phase === "done" ? "rgba(74,222,128,0.1)" : phase === "error" ? "rgba(255,60,60,0.1)" : "rgba(0,212,255,0.08)", border: `1px solid ${phase === "done" ? "rgba(74,222,128,0.3)" : phase === "error" ? "rgba(255,60,60,0.3)" : "rgba(0,212,255,0.2)"}`, fontSize: 12, color: phase === "done" ? "#4ade80" : phase === "error" ? "#ff6b6b" : "#00d4ff", textAlign: "center" }}>
            {phase !== "idle" && phase !== "done" && phase !== "error" && <span style={{ marginRight: 6 }}>⏳</span>}
            {phaseLabel[phase] ?? ""}
          </div>
        )}
        {errMsg && <p style={{ fontSize: 10, color: "#ff6b6b", lineHeight: 1.4 }}>{errMsg}</p>}
        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={!canAfford || (phase !== "idle" && phase !== "error")}
          style={{ padding: "14px 0", borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: (canAfford && (phase === "idle" || phase === "error")) ? "pointer" : "default", opacity: (canAfford && (phase === "idle" || phase === "error")) ? 1 : 0.5, transition: "all 0.2s", color: "#ffd700", border: "1px solid rgba(255,215,0,0.4)", background: "linear-gradient(135deg, rgba(255,180,0,0.18), rgba(255,215,0,0.25))", boxShadow: "0 0 24px rgba(255,180,0,0.2)" }}
        >
          {phase === "idle" || phase === "error" ? `Buy for ${luxDisplay} LUX` : phaseLabel[phase]}
        </button>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center" }}>Polygon · ERC1155 · LUX ERC20</p>
      </div>
    </div>
  );
}

function MiningScreen({
  telegram, onScoreUpdate, eoaAddr, setEoaAddr, luxBal, setLuxBal, openWalletModal,
}: {
  telegram: string;
  onScoreUpdate: (s: number, lastDaily?: string | null) => void;
  eoaAddr: string | null;
  setEoaAddr: (addr: string | null) => void;
  luxBal: number;
  setLuxBal: (n: number) => void;
  openWalletModal: () => void;
}) {
  // Default to Marketplace when no wallet — gives newcomers something to browse
  // immediately, matching the Replit reference layout. We switch back to Owned
  // NFTs once a wallet is connected and the user actually owns miners.
  const [subTab, setSubTab]               = useState<"owned" | "shop">(eoaAddr ? "owned" : "shop");
  const persistEoa = setEoaAddr;
  const [miners, setMiners]               = useState<MinerGrp[]>([]);
  const [listings, setListings]           = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const setShowWalletModal = (open: boolean) => { if (open) openWalletModal(); };
  const [buyTarget, setBuyTarget]         = useState<{ listing: Listing; meta: MinerMeta & { tokenId: string } } | null>(null);
  const [withdrawing, setWithdrawing]     = useState(false);
  const [withdrawMsg, setWithdrawMsg]     = useState<string | null>(null);
  const [togglingKey, setTogglingKey]     = useState<string | null>(null);
  const [nowMs, setNowMs]                 = useState(Date.now());
  const [nftLoadErr, setNftLoadErr]       = useState<string | null>(null);
  const prevEoaRef                        = useRef<string | null>(eoaAddr);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load listings from blockchain eagerly on mount (so Buy buttons are ready immediately)
  useEffect(() => {
    loadListings();
  }, []);

  // Reload LUX balance + owned NFTs whenever the connected wallet changes.
  // If the wallet was just connected (null → addr), default the marketplace tab
  // to "shop" so the user can browse — switched back to "owned" if NFTs exist.
  useEffect(() => {
    if (!eoaAddr) {
      setMiners([]);
      prevEoaRef.current = null;
      // No wallet: force Marketplace as the visible tab so the user always sees
      // the miner catalog (matches Replit reference).
      setSubTab("shop");
      return;
    }
    const justConnected = prevEoaRef.current !== eoaAddr;
    prevEoaRef.current = eoaAddr;
    const addr = eoaAddr;
    if (justConnected) setSubTab("shop");
    setNftLoadErr(null);
    getLuxBalance(addr).then(setLuxBal).catch(() => {});
    (async () => {
      try {
        const tokenIds = ["4", "5", "6", "7"];
        const balances = await Promise.all(tokenIds.map(id => getNftBalance(addr, Number(id))));
        const nftMiners: NftMiner[] = tokenIds
          .map((id, i) => ({ tokenId: id, count: balances[i] }))
          .filter(n => n.count > 0);
        if (nftMiners.length === 0) return;
        const data = await apiPost<MinerGrp[]>(api("miners"), {
          walletAddress: addr,
          nftMiners: JSON.stringify(nftMiners),
        });
        if (data !== null) {
          setMiners(Array.isArray(data) ? data : JSON.parse(data as unknown as string));
          if (justConnected) setSubTab("owned");
        }
      } catch { setNftLoadErr("Failed to load NFTs from chain"); }
    })();
  }, [eoaAddr, setLuxBal]);

  async function loadListings() {
    setListingsLoading(true);
    try {
      const all = await getListingsFromChain();
      // Active listings from seller for our NFT, with quantity > 0
      const sellerListings = all.filter(l =>
        l.listingCreator?.toLowerCase() === SELLER_WALLET &&
        l.assetContract?.toLowerCase() === NFT_ADDRESS.toLowerCase() &&
        l.quantity > 0n
      );
      // If no seller listings found, show any active listing for our NFT
      const result = sellerListings.length > 0
        ? sellerListings
        : all.filter(l =>
            l.assetContract?.toLowerCase() === NFT_ADDRESS.toLowerCase() &&
            l.quantity > 0n
          );
      setListings(result);
    } catch {
      setListings([]);
    }
    setListingsLoading(false);
  }

  function calcPendingLive(inst: MinerInst, gemsPerDay: number): number {
    if (!inst.isActive) return 0;
    const elapsed = (nowMs - new Date(inst.lastTimeReset).getTime()) / 86_400_000;
    return Math.floor(gemsPerDay * elapsed);
  }

  async function refreshMiners() {
    if (!eoaAddr) return;
    try {
      const tokenIds = ["4", "5", "6", "7"];
      const balances = await Promise.all(tokenIds.map(id => getNftBalance(eoaAddr, Number(id))));
      const nftMiners: NftMiner[] = tokenIds
        .map((id, i) => ({ tokenId: id, count: balances[i] }))
        .filter(n => n.count > 0);
      if (nftMiners.length === 0) { setMiners([]); return; }
      const data = await apiPost<MinerGrp[]>(api("miners"), {
        walletAddress: eoaAddr,
        nftMiners: JSON.stringify(nftMiners),
      });
      if (data !== null) setMiners(Array.isArray(data) ? data : JSON.parse(data as unknown as string));
      getLuxBalance(eoaAddr).then(setLuxBal).catch(() => {});
    } catch {}
  }

  async function toggleMiner(tokenId: string, minerIndex: number, active: boolean) {
    if (!eoaAddr) return;
    const key = `${tokenId}-${minerIndex}`;
    if (togglingKey === key) return;
    setTogglingKey(key);
    const data = await apiPost<MinerInst>(api("set-miner-active"), {
      walletAddress: eoaAddr,
      minerId: tokenId,
      minerIndex,
      active,
    });
    if (data !== null) {
      const result: MinerInst = typeof data === "string" ? JSON.parse(data) : data;
      setMiners(prev => prev.map(g =>
        g.tokenId === tokenId
          ? { ...g, miners: g.miners.map((m, i) => i === minerIndex ? result : m) }
          : g,
      ));
    }
    setTogglingKey(null);
  }

  async function withdraw() {
    if (!eoaAddr || withdrawing) return;
    setWithdrawing(true);
    const tokenIds = ["4", "5", "6", "7"];
    const balances = await Promise.all(tokenIds.map(id => getNftBalance(eoaAddr, Number(id)).catch(() => 0)));
    const nftMiners: NftMiner[] = tokenIds.map((id, i) => ({ tokenId: id, count: balances[i] })).filter(n => n.count > 0);

    const earned = await apiPost<number>(api("withdrawal-miners"), {
      telegram,
      walletAddress: eoaAddr,
      nftMiners: JSON.stringify(nftMiners),
    });
    if (earned !== null) {
      const data = await apiPost<MinerGrp[]>(api("miners"), {
        walletAddress: eoaAddr,
        nftMiners: JSON.stringify(nftMiners),
      });
      if (data !== null) setMiners(Array.isArray(data) ? data : JSON.parse(data as unknown as string));
      const user = await apiPost<UserData>(api("user"), { telegram });
      if (user) onScoreUpdate(user.score, undefined);
      const n = typeof earned === "number" ? earned : Number(earned);
      setWithdrawMsg(n > 0 ? `+${n.toLocaleString("ru-RU")} 💎 добыто!` : "Нет накопленных гемов");
      setTimeout(() => setWithdrawMsg(null), 4_000);
    }
    setWithdrawing(false);
  }

  function getListingForToken(tokenId: string): Listing | undefined {
    return listings.find(l => l.tokenId.toString() === tokenId);
  }

  // Live aggregates
  const totalPending = miners.reduce((sum, g) => {
    const gpd = MINER_META[g.tokenId]?.gemsDay ?? 0;
    return sum + g.miners.reduce((s2, m) => s2 + calcPendingLive(m, gpd), 0);
  }, 0);
  const activeCount  = miners.reduce((sum, g) => sum + g.miners.filter(m => m.isActive).length, 0);
  const ratePerHour  = miners.reduce((sum, g) => {
    const gpd = MINER_META[g.tokenId]?.gemsDay ?? 0;
    return sum + g.miners.filter(m => m.isActive).length * Math.round(gpd / 24);
  }, 0);
  const ratePerSec   = miners.reduce((sum, g) => {
    const gpd = MINER_META[g.tokenId]?.gemsDay ?? 0;
    return sum + g.miners.filter(m => m.isActive).length * (gpd / 86400);
  }, 0);

  const wallet   = eoaAddr; // the single connected account
  const shortAddr = eoaAddr ? `${eoaAddr.slice(0, 6)}…${eoaAddr.slice(-4)}` : "";

  return (
    <div className="slide-in lux-scroll" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 14px 100px", gap: 10, overflowY: "auto" }}>

      {/* ── Wallet header ── */}
      <div className="glass" style={{ borderRadius: 18, padding: "12px 16px" }}>
        {eoaAddr ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f6851b22, #f6851b11)", border: "1px solid rgba(246,133,27,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🦊</div>
                <div>
                  <p style={{ fontSize: 9, color: "rgba(246,133,27,0.7)", letterSpacing: "0.12em" }}>METAMASK · POLYGON</p>
                  <p style={{ fontSize: 11, fontFamily: "monospace", color: "#fff" }}>{shortAddr}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,215,0,0.6)", marginTop: 2 }}>{luxBal.toFixed(2)} LUX</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={refreshMiners} title="Refresh" style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff", cursor: "pointer", fontSize: 14 }}>↻</button>
                <button onClick={() => {
                  persistEoa(null);
                  setMiners([]); setLuxBal(0);
                  _socialWallet = null;
                  sessionStorage.removeItem("lux_social_pk");
                  sessionStorage.removeItem("lux_social_provider");
                  localStorage.removeItem("lux_social_pk");
                  localStorage.removeItem("lux_social_provider");
                }} style={{ fontSize: 10, color: "rgba(255,80,80,0.6)", background: "none", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                  Disconnect
                </button>
              </div>
            </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Connect your wallet</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>MetaMask · WalletConnect · Polygon</p>
            </div>
            <button onClick={() => setShowWalletModal(true)} className="lux-btn" style={{ padding: "9px 20px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              Connect
            </button>
          </div>
        )}
      </div>

      {/* ── Live stats row — only on owned tab ── */}
      {wallet && activeCount > 0 && subTab === "owned" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Active",  value: `${activeCount}`,                                                                    sub: "miners",  color: "#4ade80" },
            { label: "Rate",    value: ratePerHour >= 1000 ? `${(ratePerHour/1000).toFixed(1)}K` : `${ratePerHour}`,        sub: "💎/hour", color: "#00d4ff" },
            { label: "Speed",   value: ratePerSec < 1 ? ratePerSec.toFixed(3) : ratePerSec.toFixed(2),                      sub: "💎/sec",  color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22`, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3, letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: s.color, textShadow: `0 0 10px ${s.color}66` }}>{s.value}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Sub tabs — sticky so always visible while scrolling ── */}
      <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,212,255,0.2)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        {(["owned", "shop"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.2s", border: "none", ...(subTab === t ? { background: "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(124,58,237,0.28))", color: "#00d4ff", boxShadow: "inset 0 0 20px rgba(0,212,255,0.08)", outline: "none" } : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", outline: "none" }), ...(t === "owned" ? { borderRight: "1px solid rgba(0,212,255,0.18)" } : {}) }}>
            {t === "owned" ? "⬡ Owned NFTs" : "🛒 Marketplace"}
          </button>
        ))}
      </div>

      {subTab === "shop" ? (
        /* ══════════ MARKETPLACE (real blockchain prices) ══════════ */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}>NFT MINERS · POLYGON · LUX TOKEN</p>
            <button onClick={loadListings} disabled={listingsLoading} style={{ fontSize: 10, color: "rgba(0,212,255,0.5)", background: "none", border: "none", cursor: "pointer" }}>
              {listingsLoading ? "⏳" : "↻ refresh"}
            </button>
          </div>

          {listingsLoading && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(0,212,255,0.4)", fontSize: 12 }}>
              ⏳ Loading from blockchain…
            </div>
          )}

          {/* Connect wallet CTA when no wallet */}
          {!eoaAddr && (
            <div style={{ borderRadius: 16, padding: "14px 16px", background: "linear-gradient(135deg, rgba(0,212,255,0.07), rgba(124,58,237,0.1))", border: "1px solid rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Подключите кошелёк</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Чтобы купить NFT-майнеры за LUX</p>
              </div>
              <button onClick={() => setShowWalletModal(true)} className="lux-btn" style={{ padding: "9px 18px", borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                Connect
              </button>
            </div>
          )}

          {SHOP_MINERS.map(m => {
            const rarity   = RARITY_LABEL[m.tokenId] ?? "COMMON";
            const gemsHr   = Math.round(m.gemsDay / 24).toLocaleString("ru-RU");
            const gemsSec  = (m.gemsDay / 86400).toFixed(3);
            const pct      = (m.gemsDay / 350_000) * 100;
            const listing  = getListingForToken(m.tokenId);
            const priceLux = listing ? Number(listing.pricePerToken) / 1e18 : m.luxPrice;
            const priceStr = priceLux >= 1000 ? `${(priceLux/1000).toFixed(1)}K` : priceLux.toFixed(priceLux < 1 ? 4 : 0);

            // Button state logic
            const noWallet  = !eoaAddr;
            const loading   = listingsLoading;
            const noListing = !listingsLoading && !listing;
            const canBuy    = !!eoaAddr && !!listing;

            const btnLabel  = noWallet ? "Connect" : loading ? "⏳" : noListing ? "No listing" : "Buy NFT";
            const btnColor  = noWallet ? "#00d4ff" : canBuy ? m.color : "rgba(255,255,255,0.25)";
            const btnCursor = (noWallet || canBuy) ? "pointer" : "default";

            return (
              <div key={m.tokenId} className="glass" style={{ borderRadius: 18, padding: "14px 15px", border: `1px solid ${m.color}28`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`, opacity: 0.6 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 14, background: `radial-gradient(circle at 40% 35%, ${m.color}22, transparent 70%)`, border: `1px solid ${m.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={CRYSTAL_IMG} style={{ width: 38, height: 34, objectFit: "contain", filter: `drop-shadow(0 0 10px ${m.color}cc)` }} alt="miner" />
                    </div>
                    <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", background: `${m.color}22`, border: `1px solid ${m.color}55`, borderRadius: 5, padding: "1px 5px", fontSize: 7, fontWeight: 800, color: m.color, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                      {rarity}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{m.name} Miner</span>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: m.color, opacity: 0.5 }}>#{m.tokenId}</span>
                      {listing && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>● LIVE</span>}
                      {listingsLoading && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "rgba(0,212,255,0.08)", color: "rgba(0,212,255,0.5)", border: "1px solid rgba(0,212,255,0.15)" }}>⏳ loading…</span>}
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 5 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}66, ${m.color})`, boxShadow: `0 0 6px ${m.color}` }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div><p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Per day</p><p style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.gemsDay.toLocaleString("ru-RU")} 💎</p></div>
                      <div><p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Per hour</p><p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{gemsHr} 💎</p></div>
                      <div><p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Per sec</p><p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{gemsSec} 💎</p></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 9, color: listing ? "#4ade80" : listingsLoading ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.3)" }}>
                        {listing ? "🔗 On-chain" : listingsLoading ? "⏳ Loading…" : "~Price"}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 900, color: "#ffd700", textShadow: "0 0 10px #ffd70066" }}>{priceStr} LUX</p>
                    </div>
                    <button
                      disabled={loading || noListing}
                      onClick={() => {
                        if (noWallet) { setShowWalletModal(true); return; }
                        if (canBuy && listing) setBuyTarget({ listing, meta: m });
                      }}
                      style={{ padding: "7px 14px", borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: btnCursor, whiteSpace: "nowrap", color: btnColor, border: `1px solid ${btnColor}44`, background: canBuy ? `linear-gradient(135deg, ${m.color}11, ${m.color}22)` : noWallet ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)", boxShadow: canBuy ? `0 0 12px ${m.color}22` : "none", opacity: loading || noListing ? 0.5 : 1 }}
                    >
                      {btnLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", textAlign: "center", marginTop: 4 }}>
            Contract: {NFT_ADDRESS.slice(0, 10)}…{NFT_ADDRESS.slice(-6)} · Marketplace: {MARKETPLACE_ADDR.slice(0, 10)}…
          </p>
        </div>
      ) : wallet ? (
        /* ══════════ OWNED NFTs ══════════ */
        <>
          {nftLoadErr && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", fontSize: 11, color: "#ff6b6b" }}>
              ⚠ {nftLoadErr}
            </div>
          )}

          {miners.length > 0 && (
            <div style={{ borderRadius: 18, padding: "14px 18px", background: "linear-gradient(135deg, rgba(0,212,255,0.07), rgba(124,58,237,0.1))", border: "1px solid rgba(0,212,255,0.2)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 9, color: "rgba(0,212,255,0.5)", letterSpacing: "0.15em", marginBottom: 4 }}>НАКОПЛЕНО ГЕМОВ</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: "#00d4ff", textShadow: "0 0 20px #00d4ff66", lineHeight: 1 }}>
                    {totalPending.toLocaleString("ru-RU")} 💎
                  </p>
                  {ratePerSec > 0 && <p style={{ fontSize: 10, color: "rgba(0,212,255,0.4)", marginTop: 3 }}>+{ratePerSec.toFixed(3)} 💎/сек</p>}
                </div>
                {withdrawMsg ? (
                  <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, paddingTop: 4 }}>✓ {withdrawMsg}</div>
                ) : (
                  <button onClick={withdraw} disabled={withdrawing} style={{ padding: "10px 16px", borderRadius: 12, fontSize: 11, fontWeight: 800, cursor: withdrawing ? "default" : "pointer", color: "#ffd700", border: "1px solid rgba(255,215,0,0.35)", background: "linear-gradient(135deg, rgba(255,180,0,0.15), rgba(255,215,0,0.2))", opacity: withdrawing ? 0.6 : 1, whiteSpace: "nowrap" }}>
                    {withdrawing ? "…" : "⬇ Withdraw All"}
                  </button>
                )}
              </div>
              {ratePerHour > 0 && (
                <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((totalPending / (ratePerHour * 24)) * 100, 100)}%`, background: "linear-gradient(90deg, #00d4ff88, #00d4ff)", transition: "width 1s linear" }} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {miners.flatMap(group => {
              const meta   = MINER_META[group.tokenId] ?? { name: `Miner #${group.tokenId}`, gemsDay: 0, color: "#888", luxPrice: 0 };
              const rarity = RARITY_LABEL[group.tokenId] ?? "COMMON";
              return group.miners.map((inst, idx) => {
                const key     = `${group.tokenId}-${idx}`;
                const pending = calcPendingLive(inst, meta.gemsDay);
                const busy    = togglingKey === key;
                const secRate = meta.gemsDay / 86400;
                return (
                  <div key={key} style={{ borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.025)", border: `1px solid ${inst.isActive ? meta.color + "33" : "rgba(255,255,255,0.06)"}`, boxShadow: inst.isActive ? `0 0 16px ${meta.color}12` : "none", transition: "all 0.3s", position: "relative", overflow: "hidden" }}>
                    {inst.isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`, opacity: 0.5 }} />}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `radial-gradient(circle, ${meta.color}18, transparent 70%)`, border: `1px solid ${meta.color}${inst.isActive ? "44" : "22"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <img src={CRYSTAL_IMG} style={{ width: 30, height: 27, objectFit: "contain", filter: `drop-shadow(0 0 8px ${meta.color}${inst.isActive ? "cc" : "44"})`, opacity: inst.isActive ? 1 : 0.5 }} alt="miner" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.name} #{idx + 1}</span>
                        <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 5, background: inst.isActive ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", color: inst.isActive ? "#4ade80" : "rgba(255,255,255,0.25)", border: `1px solid ${inst.isActive ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                          {inst.isActive ? "● MINING" : "○ IDLE"}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: meta.color, fontWeight: 600, marginBottom: 2 }}>{meta.gemsDay.toLocaleString("ru-RU")} 💎/день</p>
                      {inst.isActive ? (
                        <p style={{ fontSize: 10, color: "rgba(255,215,0,0.8)", fontWeight: 700 }}>
                          +{pending.toLocaleString("ru-RU")} 💎 <span style={{ fontWeight: 400, color: "rgba(255,215,0,0.4)", fontSize: 9 }}>({secRate.toFixed(3)}/сек)</span>
                        </p>
                      ) : (
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{rarity} · #{group.tokenId}</p>
                      )}
                    </div>
                    <button onClick={() => toggleMiner(group.tokenId, idx, !inst.isActive)} disabled={busy} style={{ padding: "7px 13px", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, transition: "all 0.2s", flexShrink: 0, ...(inst.isActive ? { background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "rgba(255,100,100,0.8)" } : { background: `linear-gradient(135deg, ${meta.color}15, ${meta.color}25)`, border: `1px solid ${meta.color}44`, color: meta.color, boxShadow: `0 0 12px ${meta.color}22` }) }}>
                      {busy ? "…" : inst.isActive ? "Stop" : "Start"}
                    </button>
                  </div>
                );
              });
            })}
          </div>

          {miners.length === 0 && !nftLoadErr && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 30 }}>
              <p style={{ fontSize: 40, opacity: 0.4 }}>⛏️</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
                На кошельке нет NFT-майнеров<br/>
                <span style={{ fontSize: 10 }}>{shortAddr}</span>
              </p>
              <button onClick={() => setSubTab("shop")} className="lux-btn" style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>🛒 Открыть Marketplace</button>
            </div>
          )}
        </>
      ) : (
        /* ── No wallet ── */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 20 }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.1), transparent)", border: "1px solid rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>⬡</div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Кошелёк не подключён</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>MetaMask, WalletConnect<br/>или любой браузерный кошелёк</p>
          </div>
          <button onClick={() => setShowWalletModal(true)} className="lux-btn" style={{ padding: "12px 30px", borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
            Connect Wallet
          </button>
          <button onClick={() => setSubTab("shop")} style={{ fontSize: 11, color: "rgba(0,212,255,0.4)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Посмотреть Marketplace →</button>
        </div>
      )}

      {/* ── Modals (WalletModal lifted to root; only marketplace-specific BuyModal stays here) ── */}
      {buyTarget && eoaAddr && (
        <BuyModal
          listing={buyTarget.listing}
          meta={buyTarget.meta}
          walletAddr={eoaAddr}
          luxBal={luxBal}
          onDone={refreshMiners}
          onClose={() => setBuyTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── EXCHANGE MODAL ─────────────────────────────────────────── */
function ExchangeModal({
  config, telegram, gems, gold, onClose, onExchanged,
}: {
  config: GameConfig;
  telegram: string;
  gems: number;
  gold: number;
  onClose: () => void;
  onExchanged: (score: number, gold: number) => void;
}) {
  const rate = config.exchangeGemsPerGold;
  const maxGold = Math.floor(gems / rate);
  const [goldQty, setGoldQty] = useState<number>(maxGold > 0 ? 1 : 0);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [msg, setMsg]         = useState<string | null>(null);

  const gemsNeeded = goldQty * rate;
  const canSubmit  = goldQty >= 1 && gemsNeeded <= gems && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setErr(null);
    const res = await apiPost<{ score: number; gold: number; exchanged: number }>(
      api("exchange-gold"), { telegram, gems: gemsNeeded }
    );
    setBusy(false);
    if (!res) { setErr("Exchange failed. Try again."); return; }
    setMsg(`+${res.exchanged.toLocaleString("ru-RU")} ◈ Gold`);
    onExchanged(res.score, res.gold);
    setTimeout(onClose, 1200);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-strong" style={{ width: "100%", maxWidth: 340, borderRadius: 24, padding: "22px 20px", border: "1px solid rgba(255,215,0,0.3)", boxShadow: "0 0 50px rgba(255,180,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#ffd700", textShadow: "0 0 10px #ffd70055" }}>⇄ Exchange Gems → Gold</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: "rgba(199,125,255,0.05)", border: "1px solid rgba(199,125,255,0.15)", borderRadius: 12, padding: "10px 12px" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>You have</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#c77dff" }}>{gems.toLocaleString("ru-RU")} 💎</p>
          </div>
          <div style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12, padding: "10px 12px" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>Gold</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#ffd700" }}>{gold.toLocaleString("ru-RU")} ◈</p>
          </div>
        </div>

        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Rate · {rate.toLocaleString("ru-RU")} 💎 = 1 ◈</p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setGoldQty(q => Math.max(1, q - 1))} className="lux-btn" style={{ width: 36, height: 36, padding: 0, borderRadius: 10, fontSize: 18, fontWeight: 700 }} disabled={busy}>−</button>
          <input
            type="number" min={1} max={maxGold} value={goldQty}
            onChange={e => setGoldQty(Math.max(1, Math.min(maxGold || 1, Math.floor(Number(e.target.value) || 1))))}
            style={{ flex: 1, textAlign: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.2)", color: "#ffd700", fontSize: 16, fontWeight: 700 }}
            disabled={busy || maxGold === 0}
          />
          <button onClick={() => setGoldQty(q => Math.min(maxGold, q + 1))} className="lux-btn" style={{ width: 36, height: 36, padding: 0, borderRadius: 10, fontSize: 18, fontWeight: 700 }} disabled={busy}>+</button>
          <button onClick={() => setGoldQty(maxGold)} className="lux-btn" style={{ padding: "9px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700 }} disabled={busy || maxGold === 0}>Max</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
          <span>Cost</span>
          <span style={{ color: gemsNeeded > gems ? "#ff6b6b" : "#fff", fontWeight: 700 }}>{gemsNeeded.toLocaleString("ru-RU")} 💎</span>
        </div>

        {err && <p style={{ fontSize: 11, color: "#ff6b6b", textAlign: "center", marginBottom: 10 }}>{err}</p>}
        {msg && <p style={{ fontSize: 12, color: "#4ade80", textAlign: "center", marginBottom: 10, fontWeight: 700 }}>{msg}</p>}

        <button onClick={submit} disabled={!canSubmit} className="lux-btn" style={{ width: "100%", padding: "12px 0", borderRadius: 14, fontSize: 13, fontWeight: 800, color: "#ffd700", border: "1px solid rgba(255,215,0,0.4)", background: "linear-gradient(135deg, rgba(255,180,0,0.18), rgba(255,215,0,0.22))", opacity: canSubmit ? 1 : 0.5 }}>
          {busy ? "Exchanging…" : maxGold === 0 ? "Insufficient gems" : `Exchange for ${goldQty} ◈`}
        </button>
      </div>
    </div>
  );
}

/* ─── REFERRALS MODAL ────────────────────────────────────────── */
function ReferralsModal({
  telegram, onClose, onActivated,
}: {
  telegram: string;
  onClose: () => void;
  onActivated: (score: number) => void;
}) {
  const [info, setInfo]    = useState<RefInfo | null>(null);
  const [code, setCode]    = useState("");
  const [busy, setBusy]    = useState(false);
  const [msg, setMsg]      = useState<string | null>(null);
  const [err, setErr]      = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!telegram) return;
    apiPost<RefInfo>(api("referral-info"), { telegram }).then(d => { if (d) setInfo(d); });
  }, [telegram]);

  async function copyCode() {
    if (!info?.code) return;
    try { await navigator.clipboard.writeText(info.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  async function activate() {
    if (!code.trim() || busy) return;
    setBusy(true); setErr(null); setMsg(null);
    const res = await apiPost<{ invitedBy: string; bonusAwarded: number }>(api("activate-referral"), { telegram, code: code.trim() });
    setBusy(false);
    if (!res) { setErr("Invalid or already used code."); return; }
    setMsg(`Linked to ${res.invitedBy}. Inviter received +${res.bonusAwarded.toLocaleString("ru-RU")} 💎`);
    const refreshed = await apiPost<RefInfo>(api("referral-info"), { telegram });
    if (refreshed) setInfo(refreshed);
    const user = await apiPost<UserData>(api("user"), { telegram });
    if (user) onActivated(user.score);
    setCode("");
  }

  const tgLink = info?.code ? `https://t.me/${TG_BOT_USERNAME}?start=${info.code}` : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-strong" style={{ width: "100%", maxWidth: 340, borderRadius: 24, padding: "22px 20px", border: "1px solid rgba(0,212,255,0.3)", boxShadow: "0 0 50px rgba(0,212,255,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#00d4ff", textShadow: "0 0 10px #00d4ff55" }}>◎ Referrals</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Your referral code</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", fontSize: 14, fontWeight: 800, color: "#00d4ff", textAlign: "center", letterSpacing: "0.08em" }}>
            {info?.code ?? "…"}
          </div>
          <button onClick={copyCode} className="lux-btn" style={{ padding: "0 14px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{copied ? "Copied!" : "Copy"}</button>
        </div>

        {tgLink && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", marginBottom: 14, wordBreak: "break-all" }}>{tgLink}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>Invited</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#00d4ff" }}>{info?.invitedCount ?? 0}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>Bonus / invite</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#c77dff" }}>{(info?.bonusPerInvite ?? 50000).toLocaleString("ru-RU")} 💎</p>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Have a friend's code?</p>
        {info?.invitedBy ? (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", fontSize: 11, color: "#4ade80" }}>
            ✓ You were invited by <b>{info.invitedBy}</b>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="LUX-XXXXX"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textAlign: "center" }}
                disabled={busy}
              />
              <button onClick={activate} disabled={busy || !code.trim()} className="lux-btn" style={{ padding: "0 14px", borderRadius: 10, fontSize: 11, fontWeight: 700, opacity: busy || !code.trim() ? 0.5 : 1 }}>
                {busy ? "…" : "Apply"}
              </button>
            </div>
            {err && <p style={{ fontSize: 11, color: "#ff6b6b", textAlign: "center" }}>{err}</p>}
            {msg && <p style={{ fontSize: 11, color: "#4ade80", textAlign: "center" }}>{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── TASKS ──────────────────────────────────────────────────── */
function TasksScreen({
  config, telegram, userData, onScoreUpdate, openReferrals,
}: {
  config: GameConfig;
  telegram: string;
  userData: UserData | null;
  onScoreUpdate: (s: number, lastDaily?: string | null) => void;
  openReferrals: () => void;
}) {
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMsg,  setClaimMsg]  = useState<string | null>(null);
  const [tasks, setTasks]         = useState<TaskRow[]>([]);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);

  const lastDaily = userData?.lastDailyReward ?? null;
  const canClaim  = !lastDaily || (Date.now() - new Date(lastDaily).getTime()) / 1000 >= config.dailyRewardTime;

  const daily     = config.dailyReward.toLocaleString("ru-RU");
  const cooldownH = Math.round(config.dailyRewardTime / 3600);

  // Fetch tasks once on mount and again whenever score/userData changes (so
  // progress reflects fresh clicks_today / login_days / invited_count).
  useEffect(() => {
    if (!telegram) return;
    apiPost<{ tasks: TaskRow[]; score: number }>(api("tasks"), { telegram }).then(d => {
      if (d) setTasks(d.tasks);
    });
  }, [telegram, userData?.score, userData?.invitedCount, userData?.loginDays]);

  async function handleClaim() {
    if (!canClaim || claimBusy || !telegram) return;
    setClaimBusy(true);
    const res = await apiPost<{ score: number; reward: number }>(api("claim-daily"), { telegram });
    if (res) {
      const ts = new Date().toISOString();
      onScoreUpdate(res.score, ts);
      setClaimMsg(`+${res.reward.toLocaleString("ru-RU")} 💎`);
      setTimeout(() => setClaimMsg(null), 3500);
    }
    setClaimBusy(false);
  }

  async function claimTask(taskId: string) {
    if (!telegram || taskBusyId) return;
    setTaskBusyId(taskId);
    const res = await apiPost<{ score: number; reward: number; taskId: string }>(
      api("claim-task"), { telegram, taskId }
    );
    if (res) {
      onScoreUpdate(res.score, undefined);
      // Refresh tasks so claimed=true is reflected
      const fresh = await apiPost<{ tasks: TaskRow[]; score: number }>(api("tasks"), { telegram });
      if (fresh) setTasks(fresh.tasks);
    }
    setTaskBusyId(null);
  }

  return (
    <div className="slide-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 16px 100px", gap: 12, overflowY: "auto" }}>
      {/* Daily */}
      <div className="glass-strong" style={{ borderRadius: 22, padding: "20px", border: "1px solid rgba(255,180,0,0.2)", boxShadow: "0 0 40px rgba(255,180,0,0.08)" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,180,0,0.5)", marginBottom: 8 }}>DAILY REWARD · КАЖДЫЕ {cooldownH} ЧАСА</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="shimmer-text" style={{ fontSize: 36, fontWeight: 900 }}>{daily}</span>
              <span style={{ fontSize: 28 }}>💎</span>
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>= {Math.round(config.dailyReward / config.exchangeGemsPerGold)} Gold после обмена</p>
          </div>
          {claimMsg ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4ade80" }}>
              <span>✓</span><span style={{ fontSize: 12, fontWeight: 700 }}>{claimMsg}</span>
            </div>
          ) : canClaim ? (
            <button onClick={handleClaim} disabled={claimBusy} className="lux-btn" style={{ padding: "10px 22px", borderRadius: 14, fontSize: 13, fontWeight: 800, color: "#ffd700", border: "1px solid rgba(255,215,0,0.35)", background: "linear-gradient(135deg, rgba(255,180,0,0.15), rgba(255,215,0,0.2))", boxShadow: "0 0 24px rgba(255,180,0,0.2)", opacity: claimBusy ? 0.6 : 1 }}>{claimBusy ? "…" : "Take"}</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.3)" }}>
              <span style={{ fontSize: 11 }}>Cooldown</span>
            </div>
          )}
        </div>
      </div>

      {/* Referrals teaser */}
      <div className="glass" style={{ borderRadius: 20, padding: "16px 18px" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Приглашай друзей — получай бонусы</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[{ l: "1 друг", v: "50K" }, { l: "3 друга", v: "200K" }, { l: "5 друзей", v: "350K" }].map(r => (
            <div key={r.l} style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{r.l}</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#00d4ff", textShadow: "0 0 10px #00d4ff88" }}>{r.v} 💎</p>
            </div>
          ))}
        </div>
        <button onClick={openReferrals} className="lux-btn" style={{ width: "100%", padding: "10px 0", borderRadius: 14, fontSize: 12, fontWeight: 700 }}>⊕ Invite Friend</button>
      </div>

      {/* Tasks list */}
      <div className="glass" style={{ borderRadius: 20, padding: "16px 18px" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>DAILY TASKS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.length === 0 && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "12px 0" }}>Loading…</p>
          )}
          {tasks.map(t => {
            const complete = t.progress >= t.target;
            const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
            const busy = taskBusyId === t.id;
            return (
              <div key={t.id} style={{ padding: "10px 12px", borderRadius: 12, background: t.claimed ? "rgba(74,222,128,0.05)" : complete ? "rgba(255,215,0,0.05)" : "rgba(255,255,255,0.02)", border: t.claimed ? "1px solid rgba(74,222,128,0.2)" : complete ? "1px solid rgba(255,215,0,0.25)" : "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{t.claimed ? "✅" : complete ? "🎁" : "⬜"}</span>
                  <span style={{ flex: 1, fontSize: 11, color: t.claimed ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)" }}>{t.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ffd700", textShadow: "0 0 10px #ffd70066" }}>{t.reward.toLocaleString("ru-RU")} 💎</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: complete ? "linear-gradient(90deg,#ffd700,#ff9800)" : "linear-gradient(90deg,#00d4ff,#7c3aed)", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", minWidth: 50, textAlign: "right" }}>{t.progress}/{t.target}</span>
                  {t.claimed ? (
                    <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 700, minWidth: 50, textAlign: "center" }}>Claimed</span>
                  ) : complete ? (
                    <button onClick={() => claimTask(t.id)} disabled={busy} className="lux-btn" style={{ padding: "5px 12px", borderRadius: 9, fontSize: 10, fontWeight: 700, color: "#ffd700", border: "1px solid rgba(255,215,0,0.4)", background: "rgba(255,215,0,0.1)", opacity: busy ? 0.5 : 1 }}>
                      {busy ? "…" : "Claim"}
                    </button>
                  ) : (t.id === "invite1" || t.id === "invite3" || t.id === "invite5") ? (
                    <button onClick={openReferrals} className="lux-btn" style={{ padding: "5px 10px", borderRadius: 9, fontSize: 10, fontWeight: 700, minWidth: 50 }}>Go</button>
                  ) : (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", minWidth: 50, textAlign: "center" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── PROFILE ────────────────────────────────────────────────── */
function ProfileScreen({
  tgUser, config, userData, eoaAddr, setEoaAddr, luxBal, setLuxBal, openWalletModal, openExchange, openReferrals,
}: {
  tgUser: TgUser | null;
  config: GameConfig;
  userData: UserData | null;
  eoaAddr: string | null;
  setEoaAddr: (addr: string | null) => void;
  luxBal: number;
  setLuxBal: (n: number) => void;
  openWalletModal: () => void;
  openExchange: () => void;
  openReferrals: () => void;
}) {
  const displayName = tgUser?.username
    ? `@${tgUser.username}`
    : tgUser?.first_name ?? "LUXury_CEO";

  const gems = userData?.score ?? 0;
  const gold = userData?.gold ?? 0;
  const shortAddr = eoaAddr ? `${eoaAddr.slice(0, 6)}…${eoaAddr.slice(-4)}` : null;

  // Live referral info — refreshed every time the Profile screen mounts so
  // the invited-friends counter reflects any referral activated on Tasks
  // or via the Referrals modal in another tab.
  const [refInfo, setRefInfo] = useState<RefInfo | null>(null);
  const telegram = userData?.telegram;
  useEffect(() => {
    if (!telegram) return;
    apiPost<RefInfo>(api("referral-info"), { telegram }).then(d => {
      if (d) setRefInfo(d);
    });
  }, [telegram, userData?.invitedCount]);

  function disconnect() {
    setEoaAddr(null);
    setLuxBal(0);
    sessionStorage.removeItem("lux_social_pk");
    sessionStorage.removeItem("lux_social_provider");
    localStorage.removeItem("lux_social_pk");
    localStorage.removeItem("lux_social_provider");
  }

  return (
    <div className="slide-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 16px 100px", gap: 12, overflowY: "auto" }}>
      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 8 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, rgba(0,212,255,0.6) 0%, rgba(100,40,200,0.8) 60%, rgba(10,0,40,0.95) 100%)", border: "2px solid rgba(0,212,255,0.4)", boxShadow: "0 0 30px rgba(0,212,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 10 }}>👤</div>
        <p style={{ fontSize: 20, fontWeight: 800, color: "#00d4ff", textShadow: "0 0 12px #00d4ff88" }}>{displayName}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
          {tgUser?.id ? `Telegram ID: ${tgUser.id}` : `Telegram · @${TG_BOT_USERNAME}`}
        </p>
      </div>

      {/* Stats */}
      <div className="glass" style={{ borderRadius: 20, padding: "16px 18px" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>АККАУНТ</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Game Account", val: "Active",                                    color: "#4ade80" },
            { label: "Gold Balance", val: `${gold.toLocaleString("ru-RU")} ◈`,         color: "#ffd700" },
            { label: "Username",     val: tgUser?.first_name ?? userData?.telegram ?? "—", color: "#00d4ff" },
            { label: "Gems",         val: `${gems.toLocaleString("ru-RU")} 💎`,         color: "#c77dff" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 4, letterSpacing: "0.08em" }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="glass" style={{ borderRadius: 20, padding: "16px 18px", border: eoaAddr ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,80,80,0.15)" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>WALLET</p>
        {eoaAddr ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>{shortAddr}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Polygon · Connected</p>
              </div>
              <button onClick={disconnect} className="lux-btn" style={{ padding: "7px 14px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: "rgba(255,100,100,0.8)", border: "1px solid rgba(255,100,100,0.3)" }}>Disconnect</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>LUX balance</p>
                <p style={{ fontSize: 12, color: "#c77dff", fontWeight: 700 }}>{luxBal.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} LUX</p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 12, color: "rgba(255,100,100,0.6)" }}>Not connected</p>
            <button onClick={openWalletModal} className="lux-btn" style={{ padding: "8px 18px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Connect</button>
          </div>
        )}
      </div>

      {/* Actions */}
      <button onClick={openExchange} className="lux-btn" style={{ width: "100%", padding: "14px 18px", borderRadius: 16, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>⇄ Exchange Gems → Gold</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{config.exchangeGemsPerGold.toLocaleString("ru-RU")} 💎 = 1 ◈ Gold</p>
        </div>
        <span style={{ color: "rgba(0,212,255,0.5)", fontSize: 16 }}>›</span>
      </button>
      <button onClick={openReferrals} className="lux-btn" style={{ width: "100%", padding: "14px 18px", borderRadius: 16, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>◎ Referrals</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            {refInfo
              ? `Приглашено: ${refInfo.invitedCount} · +${(refInfo.bonusPerInvite / 1000).toFixed(0)}K 💎 за каждого`
              : "Пригласи друзей · +50K 💎 за каждого"}
          </p>
        </div>
        <span style={{ color: "rgba(0,212,255,0.5)", fontSize: 16 }}>›</span>
      </button>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────── */
export function LuxUI() {
  useStyles();
  const [authed, setAuthed]     = useState(false);
  const [tab, setTab]           = useState<Tab>("home");
  const [config, setConfig]     = useState<GameConfig>(DEFAULT_CONFIG);
  const [tgUser, setTgUser]     = useState<TgUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // ── Shared wallet state (Mining + Profile both observe this) ───
  const [eoaAddr, setEoaAddr] = useSyncedSessionString("lux_eoa");
  const [luxBal, setLuxBal]   = useState<number>(0);

  // ── Modal state lifted to root ─────────────────────────────────
  const [showWalletModal,    setShowWalletModal]    = useState(false);
  const [showExchangeModal,  setShowExchangeModal]  = useState(false);
  const [showReferralsModal, setShowReferralsModal] = useState(false);

  // Whenever the connected wallet changes (incl. Profile→Connect), refresh
  // the LUX balance shown on Profile.
  useEffect(() => {
    if (!eoaAddr) { setLuxBal(0); return; }
    getLuxBalance(eoaAddr).then(setLuxBal).catch(() => {});
  }, [eoaAddr]);

  // ── Fetch game config on mount ──────────────────────────────────
  useEffect(() => {
    const BACKEND = api("game-config");
    const STATIC  = `${import.meta.env.BASE_URL}miners-config.json`;

    const parseConfig = (raw: unknown): GameConfig => {
      const obj: Partial<GameConfig> =
        typeof raw === "string" ? JSON.parse(raw) : (raw as Partial<GameConfig>);
      return {
        exchangeGemsPerGold: Number(obj.exchangeGemsPerGold) || DEFAULT_CONFIG.exchangeGemsPerGold,
        dailyReward:         Number(obj.dailyReward)         || DEFAULT_CONFIG.dailyReward,
        dailyRewardTime:     Number(obj.dailyRewardTime)     || DEFAULT_CONFIG.dailyRewardTime,
        minersStats:         obj.minersStats                 ?? DEFAULT_CONFIG.minersStats,
      };
    };
    const applyResponse = (json: unknown) => {
      const payload = (json as any)?.data ?? json;
      setConfig(parseConfig(payload));
    };

    fetch(BACKEND, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(applyResponse)
      .catch(() => fetch(STATIC).then(r => r.json()).then(applyResponse).catch(() => {}));
  }, []);

  // ── Detect Telegram WebApp context + expand viewport ──────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand?.();
      // Theme the Telegram chrome to match the app's dark background so the
      // status-bar / header don't show as a stark light strip.
      tg.setHeaderColor?.("#000000");
      tg.setBackgroundColor?.("#000000");
    } catch { /* older Telegram clients */ }
    const user: TgUser | undefined = tg.initDataUnsafe?.user;
    if (user?.id) setTgUser(user);
  }, []);

  // ── Login: create/get user from backend ────────────────────────
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleLogin(telegramId: string) {
    setLoginError(null);
    const data = await apiPost<UserData>(api("user"), { telegram: telegramId });
    if (data) {
      setUserData(data);
      setAuthed(true);
    } else {
      setLoginError("Backend unavailable. Try again.");
    }
  }

  // ── Auto-login when running inside a Telegram Mini App ──────────
  // initDataUnsafe.user is populated by Telegram for every Mini App launch,
  // so the player should never see the AuthScreen inside Telegram — we log
  // them in straight away with their real Telegram ID.
  useEffect(() => {
    if (authed) return;
    if (!tgUser?.id) return;
    handleLogin(String(tgUser.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgUser?.id, authed]);

  // ── Shared score+lastDaily updater ─────────────────────────────
  function handleScoreUpdate(score: number, lastDailyReward?: string | null) {
    setUserData(u => u ? {
      ...u,
      score,
      ...(lastDailyReward !== undefined ? { lastDailyReward } : {}),
    } : u);
  }

  // ── Refresh full userData from backend (used on tab switch) ────
  // Pulls the canonical row so gold/invitedCount/loginDays/clicksToday
  // stay in sync after actions done on other tabs (claim task, referral
  // activation, exchange, etc.).
  async function refreshUserData() {
    if (!userData?.telegram) return;
    const fresh = await apiPost<UserData>(api("user"), { telegram: userData.telegram });
    if (fresh) setUserData(fresh);
  }

  // When the user navigates to Profile or Tasks, refresh once so they see
  // fresh balances/streaks/invite counts without having to relogin.
  useEffect(() => {
    if (!authed) return;
    if (tab === "profile" || tab === "tasks") {
      refreshUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);

  // Responsive: on mobile (narrow viewport) or inside Telegram Mini App,
  // fill the whole viewport without the desktop phone-mockup frame. The
  // 390×780 framed mode is only used on wide desktop screens.
  const isCompact = useIsCompactViewport(!!tgUser);
  const frameStyle: React.CSSProperties = isCompact
    ? { width: "100vw", height: "100dvh", maxWidth: "100vw", maxHeight: "100dvh", borderRadius: 0, border: "none", boxShadow: "none", overflow: "hidden", position: "relative" }
    : { width: 390, height: 780, borderRadius: 44, overflow: "hidden", position: "relative", border: "1.5px solid rgba(0,212,255,0.2)", boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 0 60px rgba(0,212,255,0.15), 0 0 120px rgba(124,58,237,0.1), 0 40px 80px rgba(0,0,0,0.8)" };
  const rootStyle: React.CSSProperties = isCompact
    ? { width: "100vw", height: "100dvh", background: "#000", display: "flex", justifyContent: "center", alignItems: "stretch" }
    : { width: "100vw", height: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center" };

  return (
    <div className="lux-root" style={rootStyle}>
      <div style={frameStyle}>
        <LuxBg />
        <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column" }}>
          {!authed ? (
            <AuthScreen onLogin={handleLogin} config={config} tgUser={tgUser} loginError={loginError} />
          ) : (
            <>
              {tab === "home" && (
                <HomeScreen
                  initScore={userData?.score ?? 0}
                  initLastDaily={userData?.lastDailyReward ?? null}
                  telegram={userData?.telegram ?? ""}
                  config={config}
                  onScoreUpdate={handleScoreUpdate}
                />
              )}
              {tab === "mining"  && (
                <MiningScreen
                  telegram={userData?.telegram ?? ""}
                  onScoreUpdate={handleScoreUpdate}
                  eoaAddr={eoaAddr}
                  setEoaAddr={setEoaAddr}
                  luxBal={luxBal}
                  setLuxBal={setLuxBal}
                  openWalletModal={() => setShowWalletModal(true)}
                />
              )}
              {tab === "tasks"   && (
                <TasksScreen
                  config={config}
                  telegram={userData?.telegram ?? ""}
                  userData={userData}
                  onScoreUpdate={handleScoreUpdate}
                  openReferrals={() => setShowReferralsModal(true)}
                />
              )}
              {tab === "profile" && (
                <ProfileScreen
                  tgUser={tgUser}
                  config={config}
                  userData={userData}
                  eoaAddr={eoaAddr}
                  setEoaAddr={setEoaAddr}
                  luxBal={luxBal}
                  setLuxBal={setLuxBal}
                  openWalletModal={() => setShowWalletModal(true)}
                  openExchange={() => setShowExchangeModal(true)}
                  openReferrals={() => setShowReferralsModal(true)}
                />
              )}
              <Nav tab={tab} setTab={setTab} />
            </>
          )}
        </div>

        {/* ── Root-level modals: accessible from any tab ── */}
        {authed && showWalletModal && (
          <WalletModal
            onConnect={(addr) => { setEoaAddr(addr); setShowWalletModal(false); }}
            onClose={() => setShowWalletModal(false)}
          />
        )}
        {authed && showExchangeModal && userData && (
          <ExchangeModal
            config={config}
            telegram={userData.telegram}
            gems={userData.score ?? 0}
            gold={userData.gold ?? 0}
            onClose={() => setShowExchangeModal(false)}
            onExchanged={(score, gold) => setUserData(u => u ? { ...u, score, gold } : u)}
          />
        )}
        {authed && showReferralsModal && userData && (
          <ReferralsModal
            telegram={userData.telegram}
            onClose={() => setShowReferralsModal(false)}
            onActivated={(score) => setUserData(u => u ? { ...u, score } : u)}
          />
        )}
      </div>
    </div>
  );
}

export default LuxUI;
