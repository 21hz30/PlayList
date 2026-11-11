export type ThemeId = "acid" | "blue" | "amber";
export type FontId = "sans" | "mono" | "serif";
export type CreativeSelection = {
  name: string;
  theme: ThemeId;
  font: FontId;
  musicId: string;
  note: string;
};
export const CREATIVE_STORAGE = "zimo-creative-choices-v1";
export const NAME_OPTIONS = ["ZIMO SESSIONS", "OWN TEMPO", "SIDE A"];
export const STYLE_OPTIONS: { id: ThemeId; name: string; english: string; description: string; accent: string; background: string; font: FontId }[] = [
  { id: "acid", name: "After Hours", english: "AFTER HOURS", description: "Black and acid yellow. Your own DJ record sleeve.", accent: "#d5f36b", background: "#0c0d0f", font: "sans" },
  { id: "blue", name: "Blue Frequency", english: "BLUE FREQUENCY", description: "Midnight tones and cool blue. A clean studio feel.", accent: "#92c4ff", background: "#0a0e15", font: "mono" },
  { id: "amber", name: "Warm Tape", english: "WARM TAPE", description: "Deep charcoal and amber. A little vintage warmth.", accent: "#edb875", background: "#130e0f", font: "serif" },
];
export const FONT_OPTIONS: { id: FontId; name: string; description: string }[] = [
  { id: "sans", name: "Modern Sans", description: "Clean, direct, and easy to read." },
  { id: "mono", name: "Studio Mono", description: "Even spacing with a studio feel." },
  { id: "serif", name: "Editorial Serif", description: "A touch of classic record-sleeve style." },
];
export const DEFAULT_SELECTION: CreativeSelection = { name: "ZIMO SESSIONS", theme: "acid", font: "sans", musicId: "paper-window", note: "" };
export function normalizeSelection(value: unknown): CreativeSelection {
  if (!value || typeof value !== "object") return { ...DEFAULT_SELECTION };
  const input = value as Partial<CreativeSelection>;
  return {
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 32) : DEFAULT_SELECTION.name,
    theme: STYLE_OPTIONS.some(s => s.id === input.theme) ? input.theme! : DEFAULT_SELECTION.theme,
    font: FONT_OPTIONS.some(f => f.id === input.font) ? input.font! : DEFAULT_SELECTION.font,
    musicId: ["paper-window", "own-tempo", "blue-hour"].includes(input.musicId || "") ? input.musicId! : DEFAULT_SELECTION.musicId,
    note: typeof input.note === "string" ? input.note.slice(0, 300) : "",
  };
}
