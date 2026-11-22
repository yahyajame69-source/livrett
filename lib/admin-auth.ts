import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "lmdpl_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

interface AuthStateStore {
  sessionSecret?: string;
  claimedCodeHash?: string;
  attempts: Map<string, { count: number; lockedUntil: number }>;
}

const globalForAuth = globalThis as unknown as {
  __lmdplAuthStore?: AuthStateStore;
};

function getStore(): AuthStateStore {
  if (!globalForAuth.__lmdplAuthStore) {
    globalForAuth.__lmdplAuthStore = {
      attempts: new Map(),
    };
  }
  return globalForAuth.__lmdplAuthStore;
}

function getSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  const store = getStore();
  if (!store.sessionSecret) {
    store.sessionSecret = crypto.randomBytes(32).toString("hex");
  }
  return store.sessionSecret;
}

export function isValidSixDigitCode(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code);
}

export function getEnvAdminPasscode(): string | null {
  const raw = process.env.ADMIN_PASSCODE?.trim();
  if (!raw) return null;
  return raw;
}

export function isAdminCodeConfigured(): boolean {
  if (getEnvAdminPasscode() !== null) return true;
  return Boolean(getStore().claimedCodeHash);
}

function hashCodeScrypt(code: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyScryptHash(code: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(code, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function timingSafeStringMatch(input: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function claimInitialAdminCode(code: string): { ok: boolean; error?: string } {
  if (!isValidSixDigitCode(code)) {
    return { ok: false, error: "Le code doit contenir exactement 6 chiffres." };
  }
  const store = getStore();
  if (getEnvAdminPasscode() !== null || store.claimedCodeHash) {
    return { ok: false, error: "Un code administrateur est déjà configuré." };
  }
  store.claimedCodeHash = hashCodeScrypt(code);
  return { ok: true };
}

export function verifyAdminCode(code: string): boolean {
  if (!isValidSixDigitCode(code)) return false;

  // Configured env passcode always overrides any claimed fallback hash
  const envCode = getEnvAdminPasscode();
  if (envCode !== null) {
    return timingSafeStringMatch(code, envCode);
  }

  const storedHash = getStore().claimedCodeHash;
  if (!storedHash) return false;
  return verifyScryptHash(code, storedHash);
}

export function getClientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return fwd || realIp || "local";
}

export function checkRateLimit(clientKey: string): { allowed: boolean; retryAfterSec?: number } {
  const store = getStore();
  const entry = store.attempts.get(clientKey);
  if (!entry) return { allowed: true };

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }
  if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) {
    store.attempts.delete(clientKey);
  }
  return { allowed: true };
}

export function recordFailedAttempt(clientKey: string): void {
  const store = getStore();
  const now = Date.now();
  const prev = store.attempts.get(clientKey);
  const count = (prev && prev.lockedUntil <= now ? prev.count : 0) + 1;
  if (count >= MAX_ATTEMPTS) {
    store.attempts.set(clientKey, { count, lockedUntil: now + LOCKOUT_MS });
  } else {
    store.attempts.set(clientKey, { count, lockedUntil: 0 });
  }
}

export function clearFailedAttempts(clientKey: string): void {
  getStore().attempts.delete(clientKey);
}

export function signAdminSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sigHex] = parts;
  if (!expStr || !nonce || !sigHex) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${expStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest();
  const providedSig = Buffer.from(sigHex, "hex");
  if (expectedSig.length !== providedSig.length) return false;
  return crypto.timingSafeEqual(expectedSig, providedSig);
}

export function isAdminAuthenticatedFromCookies(): boolean {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function isAdminAuthenticatedFromRequest(req: NextRequest): boolean {
  const bearer = extractBearerToken(req);
  if (bearer && verifyAdminSessionToken(bearer)) {
    return true;
  }
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(cookieToken);
}

export function verifySameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {
      return false;
    }
  }
  return req.headers.get("x-requested-with") === "XMLHttpRequest";
}

export function buildSessionSetCookieHeader(req: NextRequest, token: string, maxAge = SESSION_TTL_SECONDS): string {
  const fwdProto = (req.headers.get("x-forwarded-proto") || "").toLowerCase();
  const isHttps =
    fwdProto.includes("https") ||
    req.nextUrl.protocol === "https:";
  const base = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly`;
  if (isHttps) {
    return `${base}; Secure; SameSite=None; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}
