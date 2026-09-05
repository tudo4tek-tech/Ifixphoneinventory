// One-off helper: generates a fresh TOTP secret for the Google
// Authenticator login step (see src/lib/auth.ts). Run with:
//   npx tsx scripts/generate-totp-secret.ts
import * as OTPAuth from "otpauth";

const secret = new OTPAuth.Secret({ size: 20 });
const totp = new OTPAuth.TOTP({
  issuer: "iFix Inventory",
  label: "iFix Inventory",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
  secret,
});

console.log("SITE_TOTP_SECRET (set this env var):\n");
console.log("  " + secret.base32);
console.log("\nManual entry key for your authenticator app (same value as above).");
console.log("\nOr paste this URI into any otpauth:// QR generator to get a scannable code:\n");
console.log("  " + totp.toString());
console.log("\nCurrent code (to sanity-check your app after adding it):", totp.generate());
