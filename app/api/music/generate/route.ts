import { getAdminSession, isSameOriginRequest } from "@/app/admin-auth";
import { readBoundedJson } from "@/lib/admin-auth-core";
import { musicGenerationInputSchema } from "@/lib/music-generation";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) {
    return Response.json({ code: "origin_not_allowed", message: "Submit music requests from this application." }, { status: 403, headers });
  }
  if (!(await getAdminSession())) {
    return Response.json({ code: "admin_required", message: "Admin access is required to create music." }, { status: 401, headers });
  }
  let input: unknown;
  try { input = await readBoundedJson(request, 16384); }
  catch { return Response.json({ code: "invalid_request", message: "The music request is not valid JSON." }, { status: 400, headers }); }
  if (!musicGenerationInputSchema.safeParse(input).success) {
    return Response.json({ code: "invalid_request", message: "Check the music description, activity, and clip length." }, { status: 400, headers });
  }
  // Intentionally no adapter, credentials, provider requests or mock audio.
  // Enable only after a provider is selected, secrets configured, and the full
  // paid generation + storage + playback path has been implemented and tested.
  return Response.json({ code: "provider_not_configured", message: "Music generation is not connected. No music has been generated." }, { status: 503, headers });
}
