import assert from "node:assert/strict";
import test from "node:test";

const sourceUrl = new URL("./admin-auth-core.ts", import.meta.url).href;
const auth = await import(sourceUrl) as typeof import("./admin-auth-core");
const password = "unit-test-passphrase-not-a-real-account";
const passwordHash = auth.hashAdminPassword(password);
const config = { passwordHash, sessionSecret: "unit-test-signing-secret-not-for-deployment" };

test("admin configuration fails closed when secrets are missing or malformed", () => {
  assert.equal(auth.readAdminAuthConfig({}), null);
  assert.equal(auth.readAdminAuthConfig({ ADMIN_PASSWORD_HASH: passwordHash }), null);
  assert.equal(auth.readAdminAuthConfig({ ADMIN_PASSWORD_HASH: "plaintext", ADMIN_SESSION_SECRET: config.sessionSecret }), null);
  assert.equal(auth.readAdminAuthConfig({ ADMIN_PASSWORD_HASH: passwordHash, ADMIN_SESSION_SECRET: "short" }), null);
  assert.deepEqual(auth.readAdminAuthConfig({ ADMIN_PASSWORD_HASH: passwordHash, ADMIN_SESSION_SECRET: config.sessionSecret }), config);
});

test("password verification checks a salted hash and rejects wrong or excessive passwords", () => {
  assert.equal(auth.verifyAdminPassword(password, passwordHash), true);
  assert.equal(auth.verifyAdminPassword("a different password", passwordHash), false);
  assert.equal(auth.verifyAdminPassword(password, "invalid"), false);
  assert.equal(auth.verifyAdminPassword("a".repeat(1025), passwordHash), false);
  assert.notEqual(auth.hashAdminPassword(password), passwordHash);
});

test("sessions require a valid signature, exact role and a live expiry", () => {
  const issuedAt = 1_800_000_000;
  const token = auth.issueAdminSession(config, issuedAt);
  assert.deepEqual(auth.verifyAdminSession(token, config, issuedAt), { role: "admin", username: "admin" });
  assert.deepEqual(auth.verifyAdminSession(token, config, issuedAt + auth.ADMIN_SESSION_SECONDS - 1), { role: "admin", username: "admin" });
  assert.equal(auth.verifyAdminSession(token, config, issuedAt + auth.ADMIN_SESSION_SECONDS), null);
  assert.equal(auth.verifyAdminSession(token, config, issuedAt - 31), null);
  assert.equal(auth.verifyAdminSession(token, null, issuedAt), null);
  assert.equal(auth.verifyAdminSession(undefined, config, issuedAt), null);
  assert.equal(auth.verifyAdminSession("not.a.valid.token", config, issuedAt), null);
  const [payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const changedPayload = Buffer.from(JSON.stringify({ ...claims, exp: issuedAt + 10 * auth.ADMIN_SESSION_SECONDS })).toString("base64url");
  assert.equal(auth.verifyAdminSession(`${changedPayload}.${signature}`, config, issuedAt), null);
  const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal(auth.verifyAdminSession(`${payload}.${changedSignature}`, config, issuedAt), null);
});

test("password or signing-secret rotation invalidates previous admin sessions", () => {
  const now = 1_800_000_000;
  const token = auth.issueAdminSession(config, now);
  assert.equal(auth.verifyAdminSession(token, { ...config, passwordHash: auth.hashAdminPassword("replacement-unit-test-password") }, now), null);
  assert.equal(auth.verifyAdminSession(token, { ...config, sessionSecret: "another-unit-test-signing-secret-for-rotation" }, now), null);
});

test("state-changing requests require an exact same-site Origin", () => {
  const request = (origin?: string, site?: string) => new Request("https://music.example/api/auth/login", { method: "POST", headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) } });
  assert.equal(auth.isSameOriginRequest(request("https://music.example")), true);
  assert.equal(auth.isSameOriginRequest(request()), false);
  assert.equal(auth.isSameOriginRequest(request("null")), false);
  assert.equal(auth.isSameOriginRequest(request("https://evil.example")), false);
  assert.equal(auth.isSameOriginRequest(request("https://music.example.evil.example")), false);
  assert.equal(auth.isSameOriginRequest(request("https://music.example", "cross-site")), false);
});

test("origin validation uses the actual Host when Next.js normalizes its internal URL", () => {
  const request = (origin: string, host: string, extra: Record<string, string> = {}) => new Request("http://localhost:3107/api/auth/login", {
    method: "POST", headers: { origin, host, ...extra },
  });
  assert.equal(auth.isSameOriginRequest(request("http://127.0.0.1:3107", "127.0.0.1:3107")), true);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example")), true);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "MUSIC.EXAMPLE:80")), true);
  assert.equal(auth.isSameOriginRequest(request("http://[::1]:3107", "[::1]:3107")), true);
  assert.equal(auth.isSameOriginRequest(request("https://music.example", "music.example")), false);
  assert.equal(auth.isSameOriginRequest(request("http://localhost:3107", "music.example")), false);
  assert.equal(auth.isSameOriginRequest(request("http://evil.example", "music.example", { "x-forwarded-host": "evil.example" })), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example:3107")), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example/path")), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "user@music.example")), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example,evil.example")), false);
  assert.equal(auth.isSameOriginRequest(request("http://localhost:3107", "")), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example:99999")), false);
  assert.equal(auth.isSameOriginRequest(request("http://music.example", "music.example", { "sec-fetch-site": "cross-site" })), false);
});

test("admin cookies are HttpOnly and Strict, secure over HTTPS and cleared on sign-out", () => {
  const secure = auth.adminCookie("signed-token", true);
  assert.match(secure, /HttpOnly/);
  assert.match(secure, /SameSite=Strict/);
  assert.match(secure, /; Secure$/);
  assert.match(secure, /Max-Age=28800/);
  assert.doesNotMatch(auth.adminCookie("local-token", false), /; Secure/);
  assert.match(auth.adminCookie("", true, true), /^zimo_admin_session=;.*Max-Age=0; Secure$/);
});

test("login attempt backstop cannot be bypassed with a fresh request identifier", () => {
  const limiter = auth.createLoginAttemptLimiter(2, 60);
  assert.equal(limiter.take(100), 0);
  assert.equal(limiter.take(101), 0);
  assert.equal(limiter.take(102), 58);
  assert.equal(limiter.take(160), 0);
  limiter.reset();
  assert.equal(limiter.take(160), 0);
});

test("JSON body limits apply to real content even without Content-Length", async () => {
  const make = (body: string, headers: Record<string, string> = {}) => new Request("https://music.example/api/auth/login", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
  assert.deepEqual(await auth.readBoundedJson(make('{"username":"admin"}')), { username: "admin" });
  await assert.rejects(auth.readBoundedJson(make(JSON.stringify({ value: "x".repeat(100) })), 50));
  await assert.rejects(auth.readBoundedJson(make("{}", { "content-length": "5000" })));
  await assert.rejects(auth.readBoundedJson(make("{}", { "content-type": "text/plain" })));
  await assert.rejects(auth.readBoundedJson(make("invalid JSON")));
});
