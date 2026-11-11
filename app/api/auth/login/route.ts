import { adminCookie, createLoginAttemptLimiter, isSameOriginRequest, issueAdminSession, readAdminAuthConfig, readBoundedJson, verifyAdminPassword } from "@/lib/admin-auth-core";

export const dynamic = "force-dynamic";
const limiter = createLoginAttemptLimiter();
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ code: "origin_not_allowed", message: "Sign in from this application." }, { status: 403, headers });
  }
  const config = readAdminAuthConfig(process.env);
  if (!config) {
    return Response.json({ code: "admin_not_configured", message: "Admin sign-in is not available yet." }, { status: 503, headers });
  }
  const retryAfter = limiter.take();
  if (retryAfter) {
    return Response.json({ code: "too_many_attempts", message: "Too many sign-in attempts. Please try again later." }, { status: 429, headers: { ...headers, "Retry-After": String(retryAfter) } });
  }
  let input: unknown;
  try { input = await readBoundedJson(request); }
  catch { return Response.json({ code: "invalid_request", message: "Enter your username and password." }, { status: 400, headers }); }
  if (!input || typeof input !== "object" || !("username" in input) || !("password" in input)
    || typeof input.username !== "string" || typeof input.password !== "string"
    || input.username.length > 128 || Buffer.byteLength(input.password) > 1024) {
    return Response.json({ code: "invalid_request", message: "Enter your username and password." }, { status: 400, headers });
  }
  // Run the password derivation for unknown usernames as well.
  const passwordMatches = verifyAdminPassword(input.password, config.passwordHash);
  if (input.username !== "admin" || !passwordMatches) {
    return Response.json({ code: "invalid_credentials", message: "Username or password is incorrect." }, { status: 401, headers });
  }
  limiter.reset();
  return Response.json({ ok: true }, {
    headers: { ...headers, "Set-Cookie": adminCookie(issueAdminSession(config), new URL(request.url).protocol === "https:") },
  });
}
