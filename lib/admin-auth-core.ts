import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "zimo_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export type AdminIdentity = { role: "admin"; username: "admin" };
export type AdminAuthConfig = { passwordHash: string; sessionSecret: string };

const HASH_PATTERN = /^scrypt\$16384\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{64})$/;

/** No built-in credentials: an unconfigured deployment cannot issue admin sessions. */
export function readAdminAuthConfig(env: Record<string, string | undefined>): AdminAuthConfig | null {
  const passwordHash = env.ADMIN_PASSWORD_HASH;
  const sessionSecret = env.ADMIN_SESSION_SECRET;
  if (!passwordHash || !HASH_PATTERN.test(passwordHash) || !sessionSecret || Buffer.byteLength(sessionSecret) < 32) return null;
  return { passwordHash, sessionSecret };
}

/** Provisioning helper; callers must keep the result in server-side secret storage. */
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, Buffer.from(salt, "hex"), 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${key.toString("hex")}`;
}

export function verifyAdminPassword(password: string, encoded: string): boolean {
  const match = HASH_PATTERN.exec(encoded);
  if (!match || typeof password !== "string" || Buffer.byteLength(password) > 1024) return false;
  const candidate = scryptSync(password, Buffer.from(match[1], "hex"), 32, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(candidate, Buffer.from(match[2], "hex"));
}

function signature(payload: string, config: AdminAuthConfig): Buffer {
  // Changing either secret or the password invalidates previously issued sessions.
  const key = createHmac("sha256", config.sessionSecret).update(config.passwordHash).digest();
  return createHmac("sha256", key).update(payload).digest();
}

export function issueAdminSession(config: AdminAuthConfig, now = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, sub: "admin", role: "admin", iat: now, exp: now + ADMIN_SESSION_SECONDS, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, config).toString("base64url")}`;
}

export function verifyAdminSession(token: string | undefined, config: AdminAuthConfig | null, now = Math.floor(Date.now() / 1000)): AdminIdentity | null {
  if (!config || !token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [payload, encodedSignature] = parts;
  try {
    const expected = signature(payload, config);
    const received = Buffer.from(encodedSignature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.v !== 1 || claims.sub !== "admin" || claims.role !== "admin"
      || !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp)
      || claims.iat > now + 30 || claims.exp !== claims.iat + ADMIN_SESSION_SECONDS || claims.exp <= now) return null;
    return { role: "admin", username: "admin" };
  } catch { return null; }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const parsed = new URL(origin);
    const destination = new URL(request.url);
    const host = request.headers.get("host");
    // Next.js can construct request.url using its bind address. The browser's
    // Host header identifies the public destination; forwarded host is not used.
    if (host !== null && !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/i.test(host)) return false;
    const expectedOrigin = host !== null ? new URL(`${destination.protocol}//${host}`).origin : destination.origin;
    return ["http:", "https:"].includes(parsed.protocol) && parsed.origin === origin && origin === expectedOrigin;
  } catch { return false; }
}

export function adminCookie(token: string, secure: boolean, clear = false): string {
  return `${ADMIN_COOKIE_NAME}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : ADMIN_SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

/** Bounds the actual streamed bytes, including requests without Content-Length. */
export async function readBoundedJson(request: Request, maxBytes = 4096): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("invalid_body");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error("invalid_body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new Error("invalid_body"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Per-process backstop, not a shared rate limit across serverless instances. */
export function createLoginAttemptLimiter(limit = 10, windowSeconds = 15 * 60) {
  let attempts = 0;
  let windowEnd = 0;
  return {
    take(now = Math.floor(Date.now() / 1000)): number {
      if (now >= windowEnd) { attempts = 0; windowEnd = now + windowSeconds; }
      if (attempts >= limit) return Math.max(1, windowEnd - now);
      attempts += 1;
      return 0;
    },
    reset() { attempts = 0; windowEnd = 0; },
  };
}
