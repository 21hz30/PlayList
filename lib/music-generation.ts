import { z } from "zod";

/** Provider-neutral draft. Session length never controls a paid generation request. */
export const musicGenerationInputSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  scene: z.enum(["focus", "run", "strength", "unwind"]),
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(120)]),
  style: z.string().trim().min(1).max(80),
  energy: z.enum(["soft", "balanced", "driven"]),
  instrumental: z.boolean(),
  targetSessionMinutes: z.number().int().min(5).max(120),
}).strict();

export type MusicGenerationInput = z.infer<typeof musicGenerationInputSchema>;
export type MusicGenerationJob = {
  id: string;
  status: "queued" | "generating" | "ready" | "failed";
  provider: string;
  model?: string;
  audio?: { url: string; durationSeconds: number; mimeType: string; expiresAt?: string };
  error?: { code: string; message: string };
};

/** Implement on the server when a provider has been selected and configured. */
export interface MusicGenerationProvider {
  readonly id: string;
  generate(input: MusicGenerationInput, options: { signal: AbortSignal }): Promise<MusicGenerationJob>;
  getJob?(id: string, options: { signal: AbortSignal }): Promise<MusicGenerationJob>;
}

export const musicGenerationStatus = {
  configured: false,
  provider: null,
  status: "not_connected",
  message: "Music generation is not connected. You can save your creative brief for later.",
  draftDurationOptionsSeconds: [30, 60, 120],
} as const;
