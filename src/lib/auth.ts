/**
 * Admin authentication.
 *
 * Uses Web Crypto (globalThis.crypto.subtle) exclusively so this file runs
 * identically on Cloudflare Workers and in local Next.js dev — no Node-only
 * `crypto` module, which is not available in the Workers runtime.
 *
 * Password hashing: PBKDF2-SHA256, 100k iterations, random 16-byte salt.
 * Session tokens: 32 random bytes, base64url-encoded, stored in D1 with an
 * expiry; the raw token is also set as an httpOnly cookie.
 */

const PBKDF2_ITERATIONS = 100_000;
const SESSION_COOKIE_NAME = "dd_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    b64url.length + ((4 - (b64url.length % 4)) % 4),
    "="
  );
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

/** Hash a plaintext password into a storable string: "pbkdf2$<iterations>$<saltB64>$<hashB64>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new Uint8Array(salt).slice().buffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

/** Verify a plaintext password against a stored hash produced by hashPassword(). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: new Uint8Array(salt).slice().buffer, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    )
  );

  if (derived.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

export function generateSessionToken(): string {
  return toBase64Url(randomBytes(32));
}

export function sessionExpiryFromNow(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE_NAME;
export const ADMIN_SESSION_TTL_MS = SESSION_TTL_MS;
