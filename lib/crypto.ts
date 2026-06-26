/**
 * lib/crypto.ts — application-layer field encryption (server master-key model)
 *
 * This is what makes the "Security Vault" claim true. Sensitive fields (balance,
 * salary, age) are encrypted HERE, on the server, before they ever reach the
 * database. The key lives only in the ENCRYPTION_MASTER_KEY environment variable
 * (server-only, never NEXT_PUBLIC). A database dump therefore contains only
 * ciphertext, and Supabase/anyone with DB access cannot read the figures.
 *
 * ⚠️ SERVER-ONLY. This file must never be imported into a client component.
 * It reads a secret env var and uses Node crypto. If you see it in a "use client"
 * file, that's a bug — the key would leak to the browser.
 *
 * Algorithm: AES-256-GCM (authenticated encryption — tampering is detectable).
 * Each value gets a fresh random 12-byte IV. Output format (base64):
 *   [12-byte IV][16-byte auth tag][ciphertext]
 *
 * Threat model (be honest about it):
 *  - Stops: DB dump, leaked connection string, malicious/curious DBA, the DB
 *    provider — none can read the plaintext.
 *  - Does NOT stop: a full compromise of the running server while it holds the
 *    key in memory. That's the documented trade-off of the server master-key
 *    model (vs. the password-derived model). See the blueprint, section 5.
 */

import crypto from "crypto";

const ALGO = "aes-256-gcm";

/** Derive a stable 32-byte key from the env var (accepts hex, base64, or raw). */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    // Fail loud and early. We must NEVER silently fall back to storing plaintext.
    throw new Error(
      "ENCRYPTION_MASTER_KEY is not set. Refusing to encrypt/decrypt. " +
        "Set it as a server-only (non-NEXT_PUBLIC) environment variable in Vercel."
    );
  }
  // If it's a 64-char hex or valid base64 of 32 bytes, use directly; otherwise
  // hash it to a stable 32 bytes so any sufficiently-long secret works.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const asB64 = Buffer.from(raw, "base64");
  if (asB64.length === 32) return asB64;
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/** Encrypt a number (or null). Returns base64 string, or null for null input. */
export function encryptValue(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a base64 string back to a number (or null). Returns null on any failure. */
export function decryptValue(payload: string | null): number | null {
  if (!payload) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    const n = Number(dec.toString("utf8"));
    return Number.isFinite(n) ? n : null;
  } catch {
    // Wrong key, tampered data, or corrupt payload — never throw raw, never
    // return a wrong number. Caller treats null as "no saved value".
    return null;
  }
}

/** Deterministic hash of an email for lookup/uniqueness (not reversible). */
export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase(), "utf8")
    .digest("hex");
}
