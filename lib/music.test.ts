import assert from "node:assert/strict";
import test from "node:test";
import type { Scene, Track, Vibe } from "./music";

// Dynamic URL keeps this runnable with Node's native TypeScript stripping.
const sourceUrl = new URL("./music.ts", import.meta.url).href;
const { buildSession, DEMO_TRACKS, DemoAudioEngine } = await import(sourceUrl) as typeof import("./music");

test("every supported scene produces valid, unique, relevant tracks", () => {
  for (const scene of ["focus", "run", "strength", "unwind"] as Scene[]) {
    for (const vibe of ["soft", "balanced", "driven"] as Vibe[]) {
      const session = buildSession(scene, 30, vibe, DEMO_TRACKS);
      assert.ok(session.id);
      assert.equal(session.minutes, 30);
      assert.ok(session.trackIds.length >= 3);
      assert.equal(new Set(session.trackIds).size, session.trackIds.length);
      assert.ok(session.trackIds.every((id) => DEMO_TRACKS.find((track) => track.id === id)?.scene.includes(scene)));
      const energies = session.trackIds.map((id) => DEMO_TRACKS.find((track) => track.id === id)!.energy);
      assert.ok(energies[0] <= Math.max(...energies));
      assert.ok(energies.at(-1)! <= Math.max(...energies.slice(1, -1)));
    }
  }
});

test("duration edge cases are bounded and empty collections are explicit", () => {
  for (const [input, expected] of [[0, 5], [-30, 5], [500, 120], [NaN, 30], [Infinity, 30], [22.8, 23]]) {
    assert.equal(buildSession("focus", input, "balanced", DEMO_TRACKS).minutes, expected);
  }
  assert.throws(() => buildSession("focus", 30, "balanced", []), /Your library is empty/);
});

test("small personal libraries and unmatched scenes remain usable without invented tracks", () => {
  const custom: Track = { ...DEMO_TRACKS[0], id: "mine", source: "custom", scene: ["run"] };
  const session = buildSession("focus", 30, "soft", [custom, custom]);
  assert.deepEqual(session.trackIds, ["mine"]);
  assert.match(session.note, /No tracks are tagged/);
});

test("musical preference changes selection when enough tracks are available", () => {
  const average = (ids: string[]) => ids.reduce((sum, id) => sum + DEMO_TRACKS.find((track) => track.id === id)!.energy, 0) / ids.length;
  for (const scene of ["focus", "run", "strength", "unwind"] as Scene[]) {
    const soft = buildSession(scene, 30, "soft", DEMO_TRACKS);
    const driven = buildSession(scene, 30, "driven", DEMO_TRACKS);
    assert.ok(average(soft.trackIds) < average(driven.trackIds));
  }
});

test("audio engine imports and disposes in SSR without creating browser resources", async () => {
  const engine = new DemoAudioEngine();
  engine.setVolume(0);
  engine.pause();
  await assert.rejects(engine.unlock(), /browser/);
  await assert.rejects(engine.play(DEMO_TRACKS[0]), /browser/);
  engine.dispose();
  await assert.rejects(engine.unlock(), /The player is closed/);
  await assert.rejects(engine.play(DEMO_TRACKS[0]), /The player is closed/);
});

test("unlock creates and resumes synchronously without pausing or recreating the context", async () => {
  let constructions = 0;
  let resumes = 0;
  let suspends = 0;
  let completeResume: () => void = () => undefined;
  const node = () => ({ connect() {}, disconnect() {} });
  class ActivationAudioContext {
    state = "suspended";
    currentTime = 0;
    sampleRate = 8;
    destination = node();
    constructor() { constructions += 1; }
    createGain() { return { ...node(), gain: { value: 0 } }; }
    createDynamicsCompressor() { return { ...node(), threshold: { value: 0 }, ratio: { value: 0 } }; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    resume() { resumes += 1; return new Promise<void>((resolve) => { completeResume = resolve; }); }
    suspend() { suspends += 1; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: ActivationAudioContext } });
  const engine = new DemoAudioEngine();
  try {
    const firstUnlock = engine.unlock();
    // No asynchronous boundary before these assertions: the user activation
    // must already have reached AudioContext.resume in the click handler.
    assert.equal(constructions, 1);
    assert.equal(resumes, 1);
    assert.equal(suspends, 0);
    completeResume();
    await firstUnlock;
    const secondUnlock = engine.unlock();
    assert.equal(constructions, 1);
    assert.equal(resumes, 2);
    assert.equal(suspends, 0);
    completeResume();
    await secondUnlock;
  } finally {
    engine.dispose();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("cancelled audio activation cannot reject a newer player state", async () => {
  let rejectResume: (error: Error) => void = () => undefined;
  let onResume: () => void = () => undefined;
  const node = () => ({ connect() {}, disconnect() {} });
  class PendingAudioContext {
    state = "suspended";
    currentTime = 0;
    sampleRate = 8;
    destination = node();
    createGain() { return { ...node(), gain: { value: 0, setTargetAtTime() {} } }; }
    createDynamicsCompressor() { return { ...node(), threshold: { value: 0 }, ratio: { value: 0 } }; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    resume() { return new Promise<void>((_, reject) => { rejectResume = reject; onResume(); }); }
    suspend() { return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: PendingAudioContext } });
  const engine = new DemoAudioEngine();
  try {
    const firstActivation = new Promise<void>((resolve) => { onResume = resolve; });
    const supersededPlay = engine.play(DEMO_TRACKS[0]);
    await firstActivation;
    engine.pause();
    rejectResume(new Error("Activation cancelled"));
    await assert.doesNotReject(supersededPlay);

    const secondActivation = new Promise<void>((resolve) => { onResume = resolve; });
    const activePlay = engine.play(DEMO_TRACKS[1]);
    await secondActivation;
    rejectResume(new Error("Actual browser failure"));
    await assert.rejects(activePlay, /Actual browser failure/);
  } finally {
    engine.dispose();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
