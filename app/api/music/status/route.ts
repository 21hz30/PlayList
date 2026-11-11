import { musicGenerationStatus } from "@/lib/music-generation";

export function GET() {
  return Response.json(musicGenerationStatus, { headers: { "Cache-Control": "no-store" } });
}
