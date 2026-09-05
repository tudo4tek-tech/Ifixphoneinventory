export const AUTH_COOKIE = "ifix_auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  // Folding the TOTP secret into the session token means any existing
  // cookie stops matching the moment SITE_TOTP_SECRET is added, changed,
  // or removed -- so already-logged-in browsers are forced back through
  // /login (and its now-current requirements) instead of a stale
  // password-only session silently continuing to work forever.
  return sha256Hex(`${password}|${process.env.SITE_TOTP_SECRET ?? ""}`);
}

// Whether an authenticator (TOTP) code is required in addition to the
// password. Only true once SITE_TOTP_SECRET is configured, so local dev
// without it set behaves exactly as before.
export function totpRequired(): boolean {
  return !!process.env.SITE_TOTP_SECRET;
}

export async function verifyTotp(code: string): Promise<boolean> {
  const secret = process.env.SITE_TOTP_SECRET;
  if (!secret) return true; // not configured -- nothing to check
  if (!code || !/^\d{6}$/.test(code)) return false;

  // Dynamic import: otpauth is only needed on this (Node) code path, and
  // this module is also imported from proxy.ts, which must stay light.
  const { TOTP, Secret } = await import("otpauth");
  const totp = new TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  // window: 1 allows the previous/next 30s step, tolerating minor clock drift.
  return totp.validate({ token: code, window: 1 }) !== null;
}
