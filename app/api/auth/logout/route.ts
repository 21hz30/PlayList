import { adminCookie, isSameOriginRequest } from "@/lib/admin-auth-core";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) {
    return Response.json({ code: "origin_not_allowed", message: "Sign out from this application." }, { status: 403, headers });
  }
  return Response.json({ ok: true }, {
    headers: { ...headers, "Set-Cookie": adminCookie("", new URL(request.url).protocol === "https:", true) },
  });
}
