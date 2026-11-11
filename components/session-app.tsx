"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Bookmark, Check, CheckCheck, ChevronRight, Disc3, Download, Dumbbell, ExternalLink, Footprints, Headphones, Heart, Library, Moon, Music2, Palette, Pause, Play, Plus, Radio, RotateCcw, SlidersHorizontal, Sparkles, SkipBack, SkipForward, Sun, Timer, Trash2, Volume2, X } from "lucide-react";
import DesignLab from "@/components/design-lab";
import "@/app/themes.css";
import "@/app/session-account.css";
import { CREATIVE_STORAGE, DEFAULT_SELECTION, STYLE_OPTIONS, normalizeSelection, type CreativeSelection } from "@/lib/creative-choices";
import AiMusicPanel from "@/components/ai-music-panel";
import { DEMO_TRACKS, DemoAudioEngine, buildSession, localizeLegacySession, sceneLabels, type Scene, type Session, type Track } from "@/lib/music";

type View = "discover" | "saved" | "studio" | "ai" | "design";
const LEGACY_STORAGE = "zimo-sessions-v1";
const STORAGE = "zimo-sessions-admin-v2";
const ADMIN_CREATIVE_STORAGE = `${CREATIVE_STORAGE}:admin`;
const scenes = [
  { id: "focus" as Scene, label: "Focus", sub: "Clear your mind", icon: Headphones },
  { id: "run" as Scene, label: "Run", sub: "Find your stride", icon: Footprints },
  { id: "strength" as Scene, label: "Strength", sub: "Build your momentum", icon: Dumbbell },
  { id: "unwind" as Scene, label: "Unwind", sub: "Take a little time", icon: Moon },
];
const vibes = [{ id: "soft" as const, label: "Soft", desc: "Gentle · Spacious" }, { id: "balanced" as const, label: "Balanced", desc: "Steady · Flowing" }, { id: "driven" as const, label: "Driven", desc: "Bright · Bold" }];
function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
function initialSession() { return { ...buildSession("focus", 25, "balanced", DEMO_TRACKS), id: "first-session", createdAt: 0 }; }
function safeUrl(url: string) { try { return ["https:", "http:"].includes(new URL(url).protocol); } catch { return false; } }

type SessionAppProps = { role: "guest" | "admin"; displayName: string; initialView?: "discover" | "studio" };

export default function SessionApp(props: SessionAppProps) {
  // Drop the entire in-memory workspace if the server changes the active role.
  return <SessionWorkspace key={props.role} {...props} />;
}

function SessionWorkspace({ role, displayName, initialView = "discover" }: SessionAppProps) {
  const isAdmin = role === "admin";
  const [view, setView] = useState<View>(isAdmin ? initialView : "discover");
  const [signingOut, setSigningOut] = useState(false);
  const [creative, setCreative] = useState<CreativeSelection>(DEFAULT_SELECTION);
  const [draftCreative, setDraftCreative] = useState<CreativeSelection>(DEFAULT_SELECTION);
  const [scene, setScene] = useState<Scene>("focus");
  const [minutes, setMinutes] = useState(25);
  const [vibe, setVibe] = useState<Session["vibe"]>("balanced");
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [session, setSession] = useState<Session>(initialSession);
  const [saved, setSaved] = useState<Session[]>([]);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clockVersion, setClockVersion] = useState(0);
  const [volume, setVolume] = useState(55);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"track" | "edit" | null>(null);
  const [formError, setFormError] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "custom">("all");
  const engine = useRef<DemoAudioEngine | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const queue = session.trackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => !!t);
  const total = session.minutes * 60;
  const segment = total / Math.max(queue.length, 1);
  const index = Math.min(Math.floor(elapsed / segment), queue.length - 1);
  const current = queue[Math.max(0, index)];
  const isSaved = saved.some(s => s.id === session.id);

  useEffect(() => {
    const revalidatePage = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", revalidatePage);
    const dispose = () => {
      window.removeEventListener("pageshow", revalidatePage);
      engine.current?.dispose(); engine.current = null;
    };
    // Guest listening stays in memory and never restores the admin workspace.
    if (!isAdmin) { setReady(true); return dispose; }
    try {
      const choice = localStorage.getItem(ADMIN_CREATIVE_STORAGE) ?? localStorage.getItem(CREATIVE_STORAGE);
      if (choice) { const restored = normalizeSelection(JSON.parse(choice)); setCreative(restored); setDraftCreative(restored); localStorage.setItem(ADMIN_CREATIVE_STORAGE, JSON.stringify(restored)); }
    } catch { /* Keep the default visual direction if this browser cannot restore it. */ }
    if (window.location.hash === "#design") setView("design");
    try {
      const raw = localStorage.getItem(STORAGE) ?? localStorage.getItem(LEGACY_STORAGE);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.customTracks)) setTracks([...DEMO_TRACKS, ...data.customTracks.filter((t: Track) => t && t.source === "custom" && typeof t.id === "string" && typeof t.title === "string" && Array.isArray(t.scene) && (!t.url || safeUrl(t.url)))]);
        if (Array.isArray(data.saved)) setSaved(data.saved.filter((s: Session) => s && typeof s.title === "string" && Array.isArray(s.trackIds) && s.minutes >= 5 && s.minutes <= 120).map(localizeLegacySession));
        if (Array.isArray(data.liked)) setLiked(data.liked.filter((id: unknown) => typeof id === "string"));
        if (data.feedback && typeof data.feedback === "object") {
          const legacyFeedback: Record<string, string> = { "刚刚好": "Just right", "想更轻一点": "Softer", "想更有劲": "More energy" };
          setFeedback(Object.fromEntries(Object.entries(data.feedback).filter((entry): entry is [string, string] => typeof entry[1] === "string").map(([id, value]) => [id, legacyFeedback[value] || value])));
        }
        if (data.currentSession && Array.isArray(data.currentSession.trackIds) && data.currentSession.trackIds.length && data.currentSession.minutes >= 5 && data.currentSession.minutes <= 120 && scenes.some(s => s.id === data.currentSession.scene)) {
          const restored = localizeLegacySession(data.currentSession as Session); setSession(restored); setScene(restored.scene); setMinutes(restored.minutes); setVibe(restored.vibe);
        }
      }
    } catch { setToast("Could not load saved sessions. You can still listen."); }
    setReady(true);
    return dispose;
  }, [isAdmin]);
  useEffect(() => {
    if (!ready || !isAdmin) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ customTracks: tracks.filter(t => t.source === "custom"), saved, liked, feedback, currentSession: session })); }
    catch { setToast("Could not save changes. Use Export backup in the Studio."); }
  }, [tracks, saved, liked, feedback, session, ready, isAdmin]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!playing || !current) { engine.current?.pause(); return; }
    if (current.source === "custom") { engine.current?.pause(); setPlaying(false); setToast("Open the link beside this track to listen on its original platform."); return; }
    if (!engine.current) engine.current = new DemoAudioEngine();
    engine.current.setVolume(volume / 100);
    engine.current.play(current).catch(() => { setPlaying(false); setToast("Could not start audio. Try pressing play again."); });
    return () => engine.current?.pause();
  }, [playing, current?.id]);
  useEffect(() => { engine.current?.setVolume(volume / 100); }, [volume]);
  useEffect(() => {
    if (!playing) return;
    const start = Date.now(); const from = elapsed;
    const timer = setInterval(() => {
      const next = Math.min(total, from + (Date.now() - start) / 1000);
      setElapsed(next);
      if (next >= total) { setPlaying(false); setToast("Session complete. A little moment, well spent."); }
    }, 250);
    return () => clearInterval(timer);
  }, [playing, session.id, total, clockVersion]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);

  function applyCreative(next: CreativeSelection) {
    if (!isAdmin) return;
    const normalized = normalizeSelection(next);
    setCreative(normalized);
    setDraftCreative(normalized);
    try { localStorage.setItem(ADMIN_CREATIVE_STORAGE, JSON.stringify(normalized)); setToast("Saved in this browser. Download your choice card to share it."); }
    catch { setToast("Style applied, but could not save. Download your choice card to keep it."); }
  }
  function pauseForAudition() { setPlaying(false); engine.current?.pause(); }
  useEffect(() => {
    document.title = `${creative.name} · Your daily rhythm`;
    document.body.style.backgroundColor = STYLE_OPTIONS.find(style => style.id === creative.theme)?.background || "#0c0d0f";
  }, [creative.name, creative.theme]);
  function loadSession(next: Session) { setPlaying(false); setElapsed(0); setSession(next); setScene(next.scene); setMinutes(next.minutes); setVibe(next.vibe); }
  function generate() { loadSession(buildSession(scene, minutes, vibe, tracks)); setToast("Your session is ready. Put on your headphones and press play."); }
  function saveSession() { if (!isAdmin) return; if (isSaved) { setSaved(saved.map(s => s.id === session.id ? session : s)); setToast("Session updated and saved in this browser."); } else { setSaved([session, ...saved]); setToast("Saved in this browser. Find it in My Sessions."); } }
  function seekTrack(i: number) { setPlaying(false); setElapsed(Math.max(0, Math.min(queue.length - 1, i)) * segment); setClockVersion(v => v + 1); }
  function togglePlay() { if (!current) return; if (!playing && current.source === "demo") { if (!engine.current) engine.current = new DemoAudioEngine(); void engine.current.unlock().catch(() => { setPlaying(false); setToast("Audio could not start. Try pressing play again."); }); } if (elapsed >= total) { setElapsed(0); setClockVersion(v => v + 1); } setPlaying(!playing); }
  function reorder(i: number, delta: number) { if (!isAdmin) return; const ids = [...session.trackIds]; if (i + delta < 0 || i + delta >= ids.length) return; [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]]; loadSession({ ...session, trackIds: ids }); }
  function toggleLike(id: string) { if (!isAdmin) return; setLiked(liked.includes(id) ? liked.filter(x => x !== id) : [...liked, id]); }
  function addToSession(track: Track) { if (!isAdmin) return; if (session.trackIds.includes(track.id)) { setToast("This track is already in your session."); return; } loadSession({ ...session, trackIds: [...session.trackIds, track.id] }); setToast("Added to your session. Reorder it in the Studio."); }
  function exportData() { if (!isAdmin) return; const blob = new Blob([JSON.stringify({ version: 1, creative, customTracks: tracks.filter(t => t.source === "custom"), saved, currentSession: session, liked, feedback }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "zimo-sessions-backup.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function submitTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!isAdmin) return; const data = new FormData(event.currentTarget); const url = String(data.get("url") || "").trim();
    if (!safeUrl(url)) { setFormError("Enter a full music URL starting with http or https."); return; }
    const title = String(data.get("title") || "").trim(); const artist = String(data.get("artist") || "").trim() || "My picks";
    if (!title) { setFormError("Enter a track title."); return; }
    const track: Track = { id: crypto.randomUUID(), title, artist, bpm: 100, energy: Number(data.get("energy")), scene: [String(data.get("scene")) as Scene], color: "#c9d9b8", seed: 0, source: "custom", url, note: String(data.get("note") || "").trim() };
    setTracks([...tracks, track]); setModal(null); setFormError(""); setFilter("custom"); setToast("Your track is saved in this browser.");
  }
  function editSession(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!isAdmin) return; const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); if (!title) return; const next = { ...session, title, note: String(data.get("note") || "").trim() }; setSession(next); setSaved(isSaved ? saved.map(s => s.id === next.id ? next : s) : [next, ...saved]); setModal(null); setToast("Your session name and notes are saved in this browser."); }

  async function signOut() {
    if (!isAdmin || signingOut) return;
    setSigningOut(true);
    setPlaying(false);
    engine.current?.pause();
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Sign out failed");
      window.location.assign("/app");
    } catch { setToast("Could not sign out. Please try again."); setSigningOut(false); }
  }

  return <div className="app-shell" data-theme={creative.theme} data-font={creative.font}>
    <aside className="sidebar">
      <button className="brand" onClick={() => setView("discover")} aria-label={`${creative.name} home`}><span className="brand-symbol"><span /><span /><span /><span /></span><span className="brand-wordmark">{creative.name.split(" ")[0]}<span className="brand-sub">{creative.name.split(" ").slice(1).join(" ") || "BY ZIMO"}</span></span><span className="brand-dot">✳</span></button>
      <div className="nav-caption">YOUR DAILY SOUNDTRACK</div>
      <nav aria-label="Main navigation">
        <button className={view === "discover" ? "nav-link active" : "nav-link"} onClick={() => setView("discover")}><Radio size={19} />Discover<ChevronRight size={15} /></button>
        {isAdmin && <>
        <button className={view === "saved" ? "nav-link active" : "nav-link"} onClick={() => setView("saved")}><Library size={19} />My Sessions<span className="nav-count">{saved.length}</span></button>
        <button className={view === "design" ? "nav-link active" : "nav-link"} onClick={() => setView("design")}><Palette size={19} />Style Lab<span className="nav-count">NEW</span></button>
        <button className={view === "ai" ? "nav-link active" : "nav-link"} onClick={() => setView("ai")}><Sparkles size={19} />AI Music<span className="nav-count">LAB</span></button>
        <div className="nav-divider" />
        <button className={view === "studio" ? "nav-link active" : "nav-link"} onClick={() => setView("studio")}><SlidersHorizontal size={19} />Zimo's Studio<span className="tiny-dot" /></button>
        </>}
      </nav>
      <div className="sidebar-bottom"><div className="little-disc"><Disc3 size={27} /></div><p>Good music.<br />A little of your own taste.</p>{isAdmin ? <button onClick={() => { setView("studio"); setModal("track"); }} className="text-button">Add a favorite track <ArrowUp size={14} className="diagonal" /></button> : <a className="text-button" href="/#sound">Hear the samples <ArrowRight size={14} /></a>}<div className="sidebar-foot"><span className="status-dot" /> YOUR SPACE, YOUR PACE.</div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Your music space <span>/</span> <strong>{view === "discover" ? "Discover" : view === "saved" ? "My Sessions" : view === "ai" ? "AI Music" : view === "design" ? "Style Lab" : "Zimo's Studio"}</strong></div><div className="top-right session-account"><a className="session-home-link" href="/">Home</a>{isAdmin ? <button className="session-signout-link" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button> : <a className="session-signout-link" href="/admin/login">Admin sign in</a>}<span className="session-role">{isAdmin ? "Admin" : "Guest"}</span><span className="avatar" aria-label={isAdmin ? `Signed in as ${displayName}` : "Guest listener"} title={displayName}>{displayName.slice(0, 1).toUpperCase()}</span></div></header>
      {view === "discover" && <>
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> A LITTLE MUSIC. A BETTER MOMENT.</div><h1>Find your<br /><span>own rhythm.</span></h1><p>Start with what comes next.<br />Find the music that fits your moment.</p><div className="hero-foot"><span className="mini-line" /> PRESS PLAY ON YOUR DAY</div></div><div className="hero-art" aria-hidden="true">{creative.theme === "acid" ? <><div className="art-grid" /><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="art-star">✳</span><div className="record"><div className="record-label"><span>{creative.name}</span><span>FIND YOUR<br />OWN FREQUENCY</span><i /></div></div><span className="record-caption">SIDE A — EVERYDAY, REIMAGINED.</span><div className="art-sticker">made for<br /><em>your moment.</em><ArrowRight size={22} /></div></> : creative.theme === "blue" ? <div className="home-studio-art"><div className="home-studio-top"><span>● ON YOUR FREQUENCY</span><span>STEREO / 01</span></div><h2>Find your<br /><em>own frequency.</em></h2><div className="home-waveform">{[22,42,30,64,48,78,55,91,68,100,73,85,57,76,44,61,35,48,24,39,52,32,62,44,78,50,34,57,28,43,20,30].map((height,i) => <i key={i} style={{height:`${height}%`}} />)}</div><div className="home-studio-bottom"><span>● {minutes}:00 / YOUR MOMENT</span><span>PLAY YOUR DAY ↗</span></div></div> : <div className="home-tape-art"><div className="home-tape-top"><span>VOL. 01 / THE EVERYDAY EDIT</span><span>BY YOU</span></div><h2>A little music.<br /><em>A little more you.</em></h2><div className="home-cassette"><div className="home-cassette-label"><span>{creative.name}</span><b>A</b></div><div className="home-cassette-reels"><i /><span /><i /></div><small>HIGH POSITION / PERSONAL SELECTION</small></div><span className="home-tape-caption">A SOUNDTRACK FOR SMALL MOMENTS</span></div>}</div></section>
        {isAdmin && <button className="creative-invite" onClick={() => setView("design")}><span><Palette size={20} /><span><strong>Make this space your own.</strong><small>Pick a name, explore three styles, and find your sound.</small></span></span><span>Open Style Lab <ArrowRight size={17} /></span></button>}
        <div className="workspace-grid"><section className="builder"><div className="section-heading"><div><div className="eyebrow muted">MAKE IT YOURS</div><h2>What's next?</h2></div><span className="step-indicator">01 / CHOOSE YOUR MOMENT</span></div>
          <div className="scene-grid">{scenes.map(s => <button key={s.id} className={`scene-card ${scene === s.id ? "selected" : ""}`} onClick={() => setScene(s.id)} aria-pressed={scene === s.id}><s.icon size={23} strokeWidth={1.65} /><strong>{s.label}</strong><span>{s.sub}</span>{scene === s.id && <span className="selected-tick"><Check size={11} /></span>}</button>)}</div>
          <div className="control-row"><div><label className="field-label"><Timer size={15} />How much time?</label><div className="duration-options">{[10, 25, 45, 60].map(m => <button key={m} onClick={() => setMinutes(m)} className={minutes === m ? "selected" : ""} aria-pressed={minutes === m}>{m}<span> min</span></button>)}</div></div><div className="custom-duration"><label htmlFor="duration">Custom</label><div><input id="duration" type="number" min="5" max="120" value={minutes} onChange={e => setMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 5)))} /><span>min</span></div></div></div>
          <div className="vibe-heading"><span className="field-label"><Sun size={15} />How should it feel?</span><span>Go with your mood</span></div><div className="vibe-options">{vibes.map(v => <button key={v.id} className={vibe === v.id ? "selected" : ""} onClick={() => setVibe(v.id)} aria-pressed={vibe === v.id}><strong>{v.label}</strong><span>{v.desc}</span>{vibe === v.id && <Check size={14} />}</button>)}</div>
          <button className="primary generate-button" onClick={generate}><Sparkles size={18} />Find my rhythm<ArrowRight size={18} /></button><p className="helper">{isAdmin ? "Try a demo, or add your own tracks in the Studio." : "Choose your moment, find a rhythm, and press play."}</p>
        </section><section className="session-card"><div className="session-top"><span><span className="status-dot" /> YOUR SESSION</span>{isAdmin && <button aria-label={isSaved ? "Update saved session" : "Save current session"} className={`icon-button ${isSaved ? "saved-icon" : ""}`} onClick={saveSession}><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button>}</div><div className={`session-cover scene-${session.scene}`}><div className="cover-circle" /><div className="cover-lines" /><span>THE EVERYDAY<br />COLLECTION</span><strong>{session.scene === "focus" ? "Quiet\nfocus." : session.scene === "run" ? "Keep\nmoving." : session.scene === "strength" ? "Find\nyour drive." : "Slow\nit down."}</strong><div className="cover-meta"><span>Z / 0{scenes.findIndex(s => s.id === session.scene) + 1}</span><span>{session.minutes} MIN</span></div></div><div className="session-title"><h3>{session.title}</h3><span>{sceneLabels[session.scene]} · {queue.length} {queue.length === 1 ? "track" : "tracks"} · {session.minutes} min session</span></div><div className="energy-flow"><span style={{ flex: 1 }}>Start</span><span style={{ flex: 3 }}>Flow</span><span style={{ flex: 1 }}>Close</span></div><button className="session-play" onClick={togglePlay}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}{playing ? "Pause" : elapsed >= total ? "Play again" : "Start listening"}</button><div className="demo-label">{queue.some(t => t.source === "custom") ? "Includes links · Listen on the original platform" : "Synth demo loops · Instrumental"}</div></section></div>
        <section className="queue-section"><div className="section-heading"><div><div className="eyebrow muted">A SMALL JOURNEY</div><h2>Your session, track by track</h2></div>{isAdmin && <button className="text-button" onClick={() => setView("studio")}>Edit in Studio <ArrowRight size={15} /></button>}</div><TrackList queue={queue} currentId={current?.id} playing={playing} liked={liked} segment={segment} onSelect={seekTrack} onLike={isAdmin ? toggleLike : undefined} />{isAdmin && <div className="feedback"><span>Does this fit your mood?</span>{["Just right", "Softer", "More energy"].map(f => <button key={f} className={feedback[session.id] === f ? "chosen" : ""} onClick={() => { if (!isAdmin) return; setFeedback({ ...feedback, [session.id]: f }); setToast("Noted. Thanks for sharing how it feels."); }}>{feedback[session.id] === f && <Check size={12} />}{f}</button>)}</div>}</section>
      </>}
      {isAdmin && view === "design" && <DesignLab selection={creative} draftSelection={draftCreative} onDraftChange={next => { if (isAdmin) setDraftCreative(next); }} onApply={applyCreative} onAuditionStart={pauseForAudition} sessionPlaying={playing} onOpenAi={() => setView("ai")} />}
      {isAdmin && view === "ai" && <AiMusicPanel scene={scene} minutes={minutes} vibe={vibe} />}
      {isAdmin && view === "saved" && <section className="view-page"><div className="eyebrow muted">KEEP YOUR FAVORITES CLOSE</div><h1>Keep your favorite rhythms<span className="orange-dot">.</span></h1><p className="page-description">Come back to the moments that feel like you.</p>{saved.length === 0 ? <div className="empty-state"><div className="empty-art"><Bookmark size={38} strokeWidth={1} /></div><h2>Your first favorite belongs here.</h2><p>Tap the bookmark on a session to save it here.</p><button className="primary" onClick={() => setView("discover")}>Discover a session <ArrowRight size={17} /></button></div> : <div className="saved-grid">{saved.map(s => <article className="saved-card" key={s.id}><div className={`saved-art scene-${s.scene}`}><Disc3 size={78} strokeWidth={0.7} /><span>{s.minutes}<small>MINUTES</small></span></div><div className="saved-content"><span className="eyebrow muted">{sceneLabels[s.scene]} / {s.trackIds.length} {s.trackIds.length === 1 ? "track" : "tracks"}</span><h2>{s.title}</h2><p>{s.note || "A soundtrack for your everyday."}</p><div><button className="text-button" onClick={() => { loadSession(s); setView("discover"); setToast("Session loaded. Press play when you are ready."); }}>Open session <ArrowRight size={16} /></button><button className="icon-button" aria-label={`Unsave ${s.title}`} onClick={() => { if (!isAdmin) return; setSaved(saved.filter(x => x.id !== s.id)); setToast("Removed from My Sessions."); }}><Trash2 size={16} /></button></div></div></article>)}</div>}<p className="storage-note">Sessions are saved in this browser. Export a backup from the Studio.</p></section>}
      {isAdmin && view === "studio" && <section className="view-page studio"><div className="studio-heading"><div><div className="eyebrow muted">A SPACE FOR YOUR TASTE</div><h1>Your turn, Zimo<span className="orange-dot">.</span></h1><p className="page-description">Pick one small thing below and make it yours.</p></div><span className="studio-stamp">WORK<br />IN PLAY ✳</span></div><div className="starter-actions"><button onClick={() => { setFormError(""); setModal("track"); }}><span>01 <Plus size={18} /></span><strong>Add a track you love</strong><small>One link is a start.</small><ArrowRight size={19} /></button><button onClick={() => setModal("edit")}><span>02 <Music2 size={18} /></span><strong>Name your session</strong><small>Leave a note about your choices.</small><ArrowRight size={19} /></button><button onClick={() => document.getElementById("arrangement")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>03 <SlidersHorizontal size={18} /></span><strong>Switch it up. Listen again.</strong><small>Trust your ears.</small><ArrowRight size={19} /></button></div>
      <section className="studio-panel" id="arrangement"><div className="section-heading"><div><div className="eyebrow muted">ON YOUR DECK</div><h2>{session.title}</h2><p className="panel-description">{session.note || "Reorder the tracks and find a flow you like."}</p></div><div className="inline-actions"><button className="secondary" onClick={() => setModal("edit")}>Edit details</button><button className="primary compact" onClick={saveSession}><Check size={15} />{isSaved ? "Save changes" : "Save session"}</button></div></div><TrackList queue={queue} currentId={current?.id} playing={playing} liked={liked} segment={segment} onSelect={seekTrack} onLike={toggleLike} onMove={reorder} onRemove={i => { if (!isAdmin) return; if (queue.length <= 1) { setToast("Keep at least one track in your session."); return; } loadSession({ ...session, trackIds: session.trackIds.filter((_, j) => j !== i) }); }} /><div className="arrange-foot"><span>{queue.length} {queue.length === 1 ? "track" : "tracks"} · {session.minutes} min session · Equal demo segments; links play separately</span><button className="text-button" onClick={togglePlay}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "Pause preview" : "Preview session"}</button></div></section>
      <section className="library-section"><div className="section-heading"><div><div className="eyebrow muted">YOUR GROWING COLLECTION</div><h2>Build a collection that feels like you</h2></div><button className="secondary" onClick={() => { setModal("track"); setFormError(""); }}><Plus size={16} />Add track</button></div><div className="library-toolbar"><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All tracks <span>{tracks.length}</span></button><button className={filter === "custom" ? "active" : ""} onClick={() => setFilter("custom")}>My picks <span>{tracks.filter(t => t.source === "custom").length}</span></button></div><span>Play demos here · Open your picks on their original platform</span></div><div className="library-grid">{tracks.filter(t => filter === "all" || t.source === "custom").map(t => <article key={t.id} className="library-card"><div className="track-art" style={{ background: t.color }}><Music2 size={21} /></div><div><strong>{t.title}</strong><span>{t.artist} · {t.source === "demo" ? `${t.bpm} BPM` : "Your pick"}</span><p>{t.note || "Your notes can come later."}</p></div><button className="icon-button" aria-label={`Add ${t.title} to the current session`} onClick={() => addToSession(t)}><Plus size={18} /></button>{t.url && <a className="library-external" href={t.url} target="_blank" rel="noopener noreferrer">Open track <ExternalLink size={12} /></a>}</article>)}</div>{filter === "custom" && !tracks.some(t => t.source === "custom") && <div className="small-empty"><Music2 size={25} /><h3>Start with the track you most want to share.</h3><button className="text-button" onClick={() => setModal("track")}>Add your first track <Plus size={15} /></button></div>}</section><footer className="studio-footer"><p>Your space to explore. Tracks, saved sessions, and feedback stay in this browser.</p><button className="text-button" onClick={exportData}><Download size={15} />Export backup</button></footer>
      </section>}
      <footer className="page-footer"><span>{creative.name}</span><span>For the things you do. And the way you feel.</span><span>VOL. 003 / A WORK IN PROGRESS</span></footer>
    </main>
    <div className="player-bar"><div className="player-track"><div className={`player-art ${playing ? "is-playing" : ""}`} style={{ background: current?.color || "#dedfcd" }}><Disc3 size={28} strokeWidth={1.3} /></div><div><strong>{current?.title || "No track yet"}</strong><span>{current?.artist || "Add a track to begin"} <span>·</span> {sceneLabels[session.scene]}</span></div>{isAdmin && <button className="icon-button player-like" aria-label="Like current track" onClick={() => current && toggleLike(current.id)}><Heart size={16} fill={current && liked.includes(current.id) ? "currentColor" : "none"} /></button>}</div><div className="player-center"><div className="player-controls"><button className="icon-button" aria-label="Previous track" disabled={index <= 0} onClick={() => seekTrack(index - 1)}><SkipBack size={17} fill="currentColor" /></button><button className="round-play" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="icon-button" aria-label="Next track" disabled={index >= queue.length - 1} onClick={() => seekTrack(index + 1)}><SkipForward size={17} fill="currentColor" /></button></div><div className="player-progress"><span>{formatTime(elapsed)}</span><div className="progress-track" role="progressbar" aria-label="Session playback progress" aria-valuenow={Math.floor(elapsed)} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${elapsed / total * 100}%` }} /></div><span>{formatTime(total)}</span></div></div><div className="player-volume">{current?.url ? <a href={current.url} target="_blank" rel="noopener noreferrer" className="text-button">Open track <ExternalLink size={14} /></a> : <span className="audio-source">Synth demo</span>}<Volume2 size={17} /><input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} /><button className="icon-button" aria-label="Back to the start" onClick={() => { setPlaying(false); setElapsed(0); }}><RotateCcw size={15} /></button></div></div>
    {toast && <div className="toast" role="status"><CheckCheck size={17} />{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15} /></button></div>}
    {isAdmin && <dialog ref={dialog} className="modal" onCancel={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null); }}><div className="modal-inner"><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={20} /></button>{modal === "track" ? <><div className="eyebrow muted">ONE SONG IS A START</div><h2>Add a track you love.</h2><p>Keep the original music link and add your pick to this space.</p><form onSubmit={submitTrack}><label>Track title<input name="title" required maxLength={80} placeholder="What is the track called?" autoFocus /></label><label>Music link<input name="url" required type="url" placeholder="https://…" /><small>Paste a music platform share link. It opens on the original platform.</small></label><label>Artist <span>optional</span><input name="artist" maxLength={80} placeholder="Who is the artist?" /></label><div className="form-row"><label>Best for<select name="scene" defaultValue={scene}>{scenes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label>Energy<select name="energy" defaultValue="0.5"><option value="0.25">Soft and spacious</option><option value="0.5">Balanced and flowing</option><option value="0.85">Bright and driven</option></select></label></div><label>Why this track? <span>optional</span><textarea name="note" maxLength={280} rows={2} placeholder="For example: The drums kick in and I just want to move." /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button type="submit" className="primary">Add to my library <Plus size={17} /></button></form></> : modal === "edit" ? <><div className="eyebrow muted">PUT YOUR NAME ON IT</div><h2>Give this session your own touch.</h2><form onSubmit={editSession}><label>Session name<input name="title" required maxLength={60} defaultValue={session.title} autoFocus /></label><label>Your selection notes<textarea aria-label="Your selection notes" name="note" rows={4} maxLength={400} defaultValue={session.note} placeholder="When would you listen? Why this order? One sentence is enough." /></label><button className="primary" type="submit">Save notes <Check size={17} /></button></form></> : null}</div></dialog>}
  </div>;
}

function TrackList({ queue, currentId, playing, liked, segment, onSelect, onLike, onMove, onRemove }: { queue: Track[]; currentId?: string; playing: boolean; liked: string[]; segment: number; onSelect: (i: number) => void; onLike?: (id: string) => void; onMove?: (i: number, delta: number) => void; onRemove?: (i: number) => void }) {
  return <div className="track-list">{queue.map((t, i) => <div key={t.id} className={`track-row ${currentId === t.id ? "current" : ""}`}><button className="track-number" aria-label={`Select ${t.title}`} onClick={() => onSelect(i)}>{currentId === t.id && playing ? <span className="equalizer"><i /><i /><i /></span> : String(i + 1).padStart(2, "0")}</button><div className="track-art" style={{ background: t.color }}><Music2 size={19} /></div><button className="track-info" onClick={() => onSelect(i)}><strong>{t.title}</strong><span>{t.artist}{t.source === "custom" ? " · External track" : ""}</span></button><span className="track-stage">{i === 0 ? "Start" : i === queue.length - 1 ? "Close" : "Flow"}</span><span className="track-bpm">{t.source === "demo" ? `${t.bpm} BPM` : "External"}</span><span className="track-time">{t.source === "custom" ? "External" : formatTime(segment)}</span>{t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label={`Listen to ${t.title} on its original platform`}><ExternalLink size={15} /></a>}{onMove ? <div className="reorder-actions"><button className="icon-button" disabled={i === 0} aria-label={`Move ${t.title} up`} onClick={() => onMove(i, -1)}><ArrowUp size={15} /></button><button className="icon-button" disabled={i === queue.length - 1} aria-label={`Move ${t.title} down`} onClick={() => onMove(i, 1)}><ArrowDown size={15} /></button><button className="icon-button" aria-label={`Remove ${t.title}`} onClick={() => onRemove?.(i)}><X size={15} /></button></div> : onLike ? <button className="icon-button heart-button" aria-label={`Like ${t.title}`} aria-pressed={liked.includes(t.id)} onClick={() => onLike(t.id)}><Heart size={16} fill={liked.includes(t.id) ? "currentColor" : "none"} /></button> : null}</div>)}</div>;
}
