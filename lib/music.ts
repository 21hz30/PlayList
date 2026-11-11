/** Original browser-synthesized examples. These are not recordings by Zimo. */
export type Scene = "focus" | "run" | "strength" | "unwind";
export type Vibe = "soft" | "balanced" | "driven";

export type Track = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** Relative musical energy, from 0 to 1. */
  energy: number;
  scene: Scene[];
  color: string;
  seed: number;
  note: string;
  source: "demo" | "custom";
  url?: string;
};

export type Session = {
  id: string;
  title: string;
  scene: Scene;
  minutes: number;
  vibe: Vibe;
  trackIds: string[];
  note: string;
  createdAt: number;
};

export const sceneLabels: Record<Scene, string> = {
  focus: "Focus",
  run: "Run",
  strength: "Strength",
  unwind: "Unwind",
};

export const DEMO_TRACKS: Track[] = [
  { id: "demo-paper", title: "Paper Window", artist: "Synth demo", bpm: 72, energy: 0.22, scene: ["focus", "unwind"], color: "#d9dfba", seed: 11, note: "Gentle chords ease you into the music.", source: "demo" },
  { id: "demo-pencil", title: "Pencil Notes", artist: "Synth demo", bpm: 82, energy: 0.42, scene: ["focus"], color: "#e6cfa5", seed: 23, note: "Simple melodies leave room to think.", source: "demo" },
  { id: "demo-late", title: "Late Afternoon", artist: "Synth demo", bpm: 78, energy: 0.32, scene: ["focus", "unwind"], color: "#cbbfd9", seed: 37, note: "A steady afternoon by the window.", source: "demo" },
  { id: "demo-flow", title: "In the Flow", artist: "Synth demo", bpm: 90, energy: 0.58, scene: ["focus"], color: "#b7cec3", seed: 41, note: "A little more groove, with a light touch.", source: "demo" },
  { id: "demo-first", title: "First Steps", artist: "Synth demo", bpm: 108, energy: 0.38, scene: ["run"], color: "#f2c986", seed: 53, note: "Start moving with an easy rhythm.", source: "demo" },
  { id: "demo-street", title: "Open Streets", artist: "Synth demo", bpm: 120, energy: 0.65, scene: ["run", "strength"], color: "#dc9d82", seed: 67, note: "Clear drums and a bright sense of motion.", source: "demo" },
  { id: "demo-motion", title: "Motion Blur", artist: "Synth demo", bpm: 128, energy: 0.82, scene: ["run"], color: "#c3c79b", seed: 79, note: "A fuller rhythm carries the middle section.", source: "demo" },
  { id: "demo-home", title: "Home Stretch", artist: "Synth demo", bpm: 102, energy: 0.3, scene: ["run", "unwind"], color: "#a9cbd0", seed: 83, note: "Keep the groove as the music winds down.", source: "demo" },
  { id: "demo-ground", title: "Groundwork", artist: "Synth demo", bpm: 100, energy: 0.45, scene: ["strength"], color: "#c1b6a5", seed: 97, note: "Bass and drums set a grounded opening.", source: "demo" },
  { id: "demo-weight", title: "Heavy Light", artist: "Synth demo", bpm: 116, energy: 0.74, scene: ["strength"], color: "#e8ad89", seed: 101, note: "Weighty bass with a bright melodic touch.", source: "demo" },
  { id: "demo-pulse", title: "Steady Pulse", artist: "Synth demo", bpm: 124, energy: 0.9, scene: ["strength", "run"], color: "#acb7d0", seed: 113, note: "A steady beat keeps things moving.", source: "demo" },
  { id: "demo-reset", title: "Soft Reset", artist: "Synth demo", bpm: 94, energy: 0.28, scene: ["strength", "unwind"], color: "#d4c6a4", seed: 127, note: "Fewer layers for an easy landing.", source: "demo" },
  { id: "demo-blue", title: "Blue Hour", artist: "Synth demo", bpm: 64, energy: 0.12, scene: ["unwind", "focus"], color: "#b5c4d7", seed: 139, note: "Slower chords and softer beats.", source: "demo" },
  { id: "demo-cloud", title: "Cloud Watching", artist: "Synth demo", bpm: 68, energy: 0.18, scene: ["unwind"], color: "#e5d5bf", seed: 149, note: "Gentle sounds and space to breathe.", source: "demo" },
  { id: "demo-golden", title: "Golden Detour", artist: "Synth demo", bpm: 84, energy: 0.4, scene: ["unwind", "focus"], color: "#edc26c", seed: 157, note: "A warm groove for a little wandering.", source: "demo" },
  { id: "demo-after", title: "After the Rain", artist: "Synth demo", bpm: 76, energy: 0.25, scene: ["unwind"], color: "#b8c9b2", seed: 163, note: "Let the final notes settle softly.", source: "demo" },
];

const sceneTitles: Record<Scene, string> = {
  focus: "Room to focus",
  run: "Find your stride",
  strength: "Find your drive",
  unwind: "Slow this moment down",
};

/** Update only known prototype copy; preserve titles and notes written by users. */
export function localizeLegacySession(session: Session): Session {
  const titles: Record<string, string> = {
    "留一点空间给专注": sceneTitles.focus,
    "让脚步遇见节奏": sceneTitles.run,
    "找到今天的推动感": sceneTitles.strength,
    "把这一刻放慢": sceneTitles.unwind,
  };
  const notes: Record<string, string> = {
    "从轻一点的声音进入，中段增加层次，再慢慢收束。你可以随时调整这段音乐。": "Start softly, build through the middle, and ease into the finish. Make this session your own.",
    "这个场景还没有专属选曲，先从现有曲库为你组合一段音乐。": "No tracks are tagged for this activity yet. Here is a selection from your library.",
  };
  return {
    ...session,
    title: Object.hasOwn(titles, session.title) ? titles[session.title] : session.title,
    note: Object.hasOwn(notes, session.note) ? notes[session.note] : session.note,
  };
}

export function buildSession(scene: Scene, minutes: number, vibe: Vibe, tracks: Track[]): Session {
  const unique = [...new Map(tracks.filter((track) => track.id).map((track) => [track.id, track])).values()];
  if (!unique.length) throw new Error("Your library is empty. Add a track to get started.");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(5, Math.min(120, Math.round(minutes))) : 30;
  const matching = unique.filter((track) => track.scene.includes(scene));
  const pool = matching.length ? matching : unique;
  const target = { soft: 0.25, balanced: 0.5, driven: 0.8 }[vibe];
  const ranked = [...pool].sort((a, b) => Math.abs(a.energy - target) - Math.abs(b.energy - target) || a.id.localeCompare(b.id));
  const withinPreference = ranked.filter((track) => Math.abs(track.energy - target) <= 0.3);
  const candidates = withinPreference.length >= 3 ? withinPreference : ranked.slice(0, 3);
  const count = Math.min(candidates.length, Math.max(3, Math.min(8, Math.ceil(safeMinutes / 6))));
  const selected = candidates.slice(0, count)
    .sort((a, b) => a.energy - b.energy || a.id.localeCompare(b.id));
  // Open gently, build through the middle, then return to a lower-energy close.
  const closing = selected.length >= 3 ? selected.splice(1, 1)[0] : null;
  if (closing) selected.push(closing);
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: sceneTitles[scene],
    scene,
    minutes: safeMinutes,
    vibe,
    trackIds: selected.map((track) => track.id),
    note: matching.length
      ? "Start softly, build through the middle, and ease into the finish. Make this session your own."
      : "No tracks are tagged for this activity yet. Here is a selection from your library.",
    createdAt: Date.now(),
  };
}

/** Small original synth loops for the prototype; never imitates a linked recording. */
export class DemoAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sources = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private generation = 0;
  private volume = 0.55;
  private disposed = false;
  private pendingSuspend: Promise<void> = Promise.resolve();

  /** Call directly inside an interaction handler, before React schedules effects. */
  async unlock(): Promise<void> {
    if (this.disposed) throw new Error("The player is closed. Please reopen the page.");
    const context = this.getContext();
    try {
      // Creation and resume both happen before the first await so browsers see
      // the user's activation. This does not start, stop, or replace any track.
      await context.resume();
    } catch (error) {
      if (this.disposed) return;
      throw error;
    }
  }

  async play(track: Track): Promise<void> {
    if (this.disposed) throw new Error("The player is closed. Please reopen the page.");
    this.pause();
    if (track.source === "custom") throw new Error("Listen to this track through its original link.");
    const generation = this.generation;
    const context = this.getContext();
    try {
      await this.pendingSuspend;
      if (generation !== this.generation || this.disposed) return;
      await context.resume();
    } catch (error) {
      // A superseded play can reject after a newer track has started or after
      // React unmounted the player. It must not fail the new UI's playback.
      if (generation !== this.generation || this.disposed) return;
      throw error;
    }
    if (generation !== this.generation || this.disposed) return;
    if (context.state !== "running") throw new Error("Press play to enable audio.");
    const bpm = Math.max(40, Math.min(180, Number.isFinite(track.bpm) ? track.bpm : 80));
    const energy = Math.max(0, Math.min(1, track.energy));
    const seed = Number.isFinite(track.seed) ? Math.abs(Math.floor(track.seed)) : 11;
    const stepDuration = 60 / bpm / 2;
    const rootMidi = [48, 50, 53, 55][seed % 4];
    const progression = [0, 5, 9, 7];
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    let step = 0;
    let nextTime = context.currentTime + 0.05;

    const schedule = () => {
      if (generation !== this.generation || context.state !== "running") return;
      // A backgrounded tab must not burst through every missed beat on return.
      if (nextTime < context.currentTime - 0.1) nextTime = context.currentTime + 0.03;
      while (nextTime < context.currentTime + 0.12) {
        const chordIndex = Math.floor(step / 16) % progression.length;
        const chordRoot = rootMidi + progression[chordIndex];
        const inBar = step % 8;
        if (step % 16 === 0) {
          const notes = chordIndex === 2 ? [0, 3, 7, 10] : [0, 4, 7, 11];
          for (const interval of notes) {
            this.tone(chordRoot + interval, nextTime, stepDuration * 15.4, 0.025, "sine", 0.25);
          }
        }
        if (inBar === 0 || inBar === 4 || (energy > 0.6 && inBar % 2 === 0)) {
          this.kick(nextTime, 0.12 + energy * 0.12);
        }
        if (energy > 0.18 && (inBar === 2 || inBar === 6)) this.hat(nextTime, 0.025 + energy * 0.028, 0.1);
        if (energy > 0.5 && inBar % 2 === 1) this.hat(nextTime, 0.018, 0.04);
        if (inBar === 0 || inBar === 4) this.tone(chordRoot - 12, nextTime, stepDuration * 1.6, 0.07, "sine", 0.015);
        if ((step + seed) % (energy > 0.6 ? 2 : 3) === 0) {
          const index = (Math.floor(step / 2) * 3 + seed + chordIndex) % scale.length;
          this.tone(rootMidi + 12 + scale[index], nextTime, stepDuration * 1.65, 0.028 + energy * 0.012, "triangle", 0.02);
        }
        step += 1;
        nextTime += stepDuration;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 30);
  }

  pause(): void {
    this.generation += 1;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const [source, nodes] of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* A source may already have ended. */ }
      for (const node of nodes) node.disconnect();
    }
    this.sources.clear();
    if (this.context && this.context.state !== "closed") {
      this.pendingSuspend = this.context.suspend().catch(() => undefined);
    }
  }

  setVolume(value: number): void {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.55;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume * 0.7, this.context.currentTime, 0.025);
  }

  dispose(): void {
    this.pause();
    this.disposed = true;
    this.master?.disconnect();
    this.compressor?.disconnect();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => undefined);
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noise = null;
  }

  private getContext(): AudioContext {
    if (this.context) return this.context;
    if (typeof window === "undefined") throw new Error("Open this page in a browser to listen.");
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("This browser does not support Web Audio. Please try another browser.");
    this.context = new AudioContextConstructor();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * 0.7;
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.ratio.value = 4;
    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);
    this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    const samples = this.noise.getChannelData(0);
    let state = 107;
    for (let index = 0; index < samples.length; index += 1) {
      state = (state * 16807) % 2147483647;
      samples[index] = (state / 2147483647) * 2 - 1;
    }
    return this.context;
  }

  private register(source: AudioScheduledSourceNode, nodes: AudioNode[], start: number, stop: number): void {
    this.sources.set(source, nodes);
    source.onended = () => {
      this.sources.delete(source);
      for (const node of nodes) node.disconnect();
    };
    source.start(start);
    source.stop(stop);
  }

  private tone(midi: number, start: number, duration: number, volume: number, waveform: OscillatorType, attack: number): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master!);
    this.register(oscillator, [oscillator, gain], start, start + duration + 0.02);
  }

  private kick(start: number, volume: number): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(130, start);
    oscillator.frequency.exponentialRampToValueAtTime(42, start + 0.13);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    oscillator.connect(gain);
    gain.connect(this.master!);
    this.register(oscillator, [oscillator, gain], start, start + 0.26);
  }

  private hat(start: number, volume: number, duration: number): void {
    const context = this.context!;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noise;
    filter.type = "highpass";
    filter.frequency.value = 7200;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    this.register(source, [source, filter, gain], start, start + duration + 0.01);
  }
}
