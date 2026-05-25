/**
 * Thirdweb client + wallet list for LUX clicker.
 *
 * Provides:
 *  - `client`  — shared ThirdwebClient instance, read from VITE_THIRDWEB_CLIENT_ID
 *  - `polygonChain` — polygon mainnet definition
 *  - `wallets` — supported wallet list used by ConnectButton / useConnectModal
 *
 * The clientId is a *public* identifier (it is allowed in browser bundles by
 * design — Thirdweb authorises requests via the `clientId`). We still load it
 * from an env var so the value can be rotated without a code change.
 */
import { createThirdwebClient } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { createWallet, inAppWallet } from "thirdweb/wallets";

const CLIENT_ID =
  (import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined) ??
  // Fallback for environments where env vars are not wired; this is the
  // public clientId of the LUX clicker thirdweb project.
  "2f46f446e2b06ddad0a6875b18062e24";

export const client = createThirdwebClient({ clientId: CLIENT_ID });

export const polygonChain = polygon;

// Social/email login (in-app wallet) — opens real OAuth popups via Thirdweb.
// Returns a real EOA controlled by the user's social account.
export const inApp = inAppWallet({
  auth: {
    options: ["google", "telegram", "x", "discord", "email", "passkey"],
  },
});

// All wallets shown in the Thirdweb Connect modal.
export const wallets = [
  inApp,
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
];

// Map our internal provider IDs to the thirdweb in-app auth strategy.
export const SOCIAL_STRATEGY: Record<string, "google" | "telegram" | "x" | "discord" | "email"> = {
  google:   "google",
  telegram: "telegram",
  twitter:  "x",
  discord:  "discord",
  email:    "email",
};
