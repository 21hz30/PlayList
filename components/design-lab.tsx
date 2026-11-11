"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, AudioLines, Check, Copy, Download, Headphones, Pause, Play, Sparkles } from "lucide-react";
import { FONT_OPTIONS, NAME_OPTIONS, STYLE_OPTIONS, type CreativeSelection, type ThemeId } from "@/lib/creative-choices";
import { MUSIC_SAMPLES } from "@/lib/music-samples";
import "@/app/design-lab.css";

type Props = {
  selection: CreativeSelection;
  draftSelection?: CreativeSelection;
  onDraftChange?: (selection: CreativeSelection) => void;
  onApply: (selection: CreativeSelection) => void;
  onAuditionStart: () => void;
  onOpenAi: () => void;
  sessionPlaying?: boolean;
};
const bars = [22, 42, 30, 64, 48, 78, 55, 91, 68, 100, 73, 85, 57, 76, 44, 61, 35, 48, 24, 39, 52, 32, 62, 44, 78, 50, 34, 57, 28, 43, 20, 30];

/** A small but complete page composition, not just a palette swatch. */
function PagePreview({ theme, name, font, compact = false }: { theme: ThemeId; name: string; font: CreativeSelection["font"]; compact?: boolean }) {
  const style = STYLE_OPTIONS.find(item => item.id === theme)!;
  return <div className={`dl-preview dl-preview-${theme} ${compact ? "dl-preview-compact" : ""}`} data-preview-font={font} style={{ "--preview-accent": style.accent, "--preview-bg": style.background } as CSSProperties}>
    <div className="dl-preview-nav"><strong>{name || "YOUR NAME"}</strong><span>YOUR DAILY SOUNDTRACK <i /></span></div>
    {theme === "acid" && <div className="dl-preview-hero dl-vinyl-hero"><div className="dl-preview-copy"><small>01 / FIND YOUR FREQUENCY</small><h3>Make it<br /><em>your rhythm.</em></h3><p>A soundtrack for your day.</p><span className="dl-preview-cta">Find my rhythm <ArrowRight size={12} /></span></div><div className="dl-vinyl"><div className="dl-vinyl-ring" /><div className="dl-vinyl-disc"><span>SIDE A<i />PLAY YOUR DAY</span></div><b>✳</b><small>33⅓ RPM / EVERYDAY</small></div></div>}
    {theme === "blue" && <div className="dl-preview-hero dl-blue-hero"><div className="dl-blue-reading"><span><i /> ON YOUR FREQUENCY</span><span>STEREO / 01</span></div><div className="dl-preview-copy"><small>THE EVERYDAY TRANSMISSION</small><h3>Find your<br /><em>own frequency.</em></h3><p>Tune in to the moment.</p></div><div className="dl-waveform">{bars.map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="dl-blue-foot"><span>● 25:00 / FOCUS MODE</span><span className="dl-preview-cta">Press play <Play size={10} /></span></div></div>}
    {theme === "amber" && <div className="dl-preview-hero dl-tape-hero"><div className="dl-tape-top"><span>VOL. 01 / THE EVERYDAY EDIT</span><span>BY YOU</span></div><div className="dl-preview-copy"><small>A SOUNDTRACK FOR SMALL MOMENTS</small><h3>A little music.<br /><em>A little more you.</em></h3><p>Make time for what you love.</p></div><div className="dl-tape"><div className="dl-tape-label"><span>MY EVERYDAY MIX</span><b>A</b></div><div className="dl-tape-reels"><i /><span /><i /></div><small>HIGH POSITION / PERSONAL SELECTION</small></div><span className="dl-preview-cta">Play today's mix <ArrowRight size={12} /></span></div>}
    <div className="dl-preview-bottom"><div><small>WHAT'S YOUR MOMENT?</small><strong>What's next?</strong></div><div className="dl-preview-scenes"><span className="selected">Focus</span><span>Run</span><span>Unwind</span></div></div>
  </div>;
}

export default function DesignLab({ selection, draftSelection, onDraftChange, onApply, onAuditionStart, onOpenAi, sessionPlaying = false }: Props) {
  const [localDraft, setLocalDraft] = useState<CreativeSelection>(selection);
  const draft = draftSelection ?? localDraft;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [notice, setNotice] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef(0);
  const callbackRef = useRef(onAuditionStart);
  callbackRef.current = onAuditionStart;
  const selectedStyle = STYLE_OPTIONS.find(style => style.id === draft.theme)!;
  const selectedFont = FONT_OPTIONS.find(font => font.id === draft.font)!;
  const selectedMusic = MUSIC_SAMPLES.find(sample => sample.id === draft.musicId);
  const activeMusic = MUSIC_SAMPLES.find(sample => sample.id === activeId);
  const normalizedDraft = { ...draft, name: draft.name.trim() };
  const hasChanges = JSON.stringify(normalizedDraft) !== JSON.stringify(selection);
  const validName = !!draft.name.trim();

  useEffect(() => { setLocalDraft(selection); }, [selection]);
  useEffect(() => { if (sessionPlaying) { requestRef.current++; audioRef.current?.pause(); setLoading(false); } }, [sessionPlaying]);
  useEffect(() => {
    const audio = audioRef.current;
    return () => { requestRef.current++; audio?.pause(); audio?.removeAttribute("src"); audio?.load(); };
  }, []);

  function update(patch: Partial<CreativeSelection>) {
    const next = { ...draft, ...patch };
    if (onDraftChange) onDraftChange(next);
    else setLocalDraft(next);
    setNotice("");
  }
  async function audition(id: string) {
    const sample = MUSIC_SAMPLES.find(item => item.id === id);
    const audio = audioRef.current;
    if (!sample?.src || !audio) return;
    if (id === activeId && !audio.paused) { requestRef.current++; audio.pause(); setLoading(false); return; }
    const request = ++requestRef.current;
    setAudioError(""); setLoading(true);
    if (id !== activeId) { audio.pause(); audio.crossOrigin = "anonymous"; audio.src = sample.src; setActiveId(id); }
    callbackRef.current();
    try { await audio.play(); if (request === requestRef.current) setLoading(false); }
    catch (error) {
      if (request !== requestRef.current) return;
      setLoading(false); setPlaying(false);
      if (!(error instanceof DOMException && error.name === "AbortError")) setAudioError("This sample could not play. Check your connection and try again.");
    }
  }
  function selectionText() {
    return ["ZIMO / My creative choices", "", `Project name: ${draft.name.trim() || "Undecided"}`, `Page style: ${selectedStyle.name}`, `Accent color: ${selectedStyle.accent}`, `Typeface: ${selectedFont.name}`, `Music direction: ${selectedMusic?.title || "Undecided"} / ${selectedMusic?.subtitle || ""}`, `Vocals: ${selectedMusic?.language || "Undecided"}`, "", `My notes: ${draft.note.trim() || "I'll start here and keep exploring."}`, "", "These are starting choices. Everything can change."].join("\n");
  }
  async function copySelection() {
    try { await navigator.clipboard.writeText(selectionText()); setNotice("Copied. Share your choices with your teacher."); }
    catch { setNotice("Copying failed. Use Download choices to keep a copy."); }
  }
  function downloadSelection() {
    const url = URL.createObjectURL(new Blob([selectionText()], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "zimo-my-creative-choices.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Choices downloaded. Share them with your teacher.");
  }

  return <section className="design-lab">
    <header className="dl-intro"><div><div className="dl-kicker"><span /> YOUR FIRST CREATIVE DECISIONS</div><h1>Start with <span>your vibe.</span></h1><p>A name, a look, a sound. Pick what feels like you.</p></div><div className="dl-intro-note"><span>THE CREATIVE LAB</span><b>01 — 03</b><small>No right answer. Change it anytime.</small><ArrowDown size={18} /></div></header>

    <section className="dl-section" aria-labelledby="dl-style-heading"><div className="dl-section-heading"><div><span className="dl-step">01</span><h2 id="dl-style-heading">Which page feels like your music?</h2></div><p>Pick a look. Fine-tune the name and type below.</p></div>
      <div className="dl-style-options">{STYLE_OPTIONS.map((style, i) => <button key={style.id} className={`dl-style-option ${draft.theme === style.id ? "is-selected" : ""}`} aria-pressed={draft.theme === style.id} aria-label={`Choose ${style.name} style`} onClick={() => update({ theme: style.id, font: style.font })} style={{ "--option-accent": style.accent } as CSSProperties}><div aria-hidden="true"><PagePreview theme={style.id} name={draft.name} font={style.font} compact /></div><div className="dl-style-caption"><div><small>0{i + 1} / {style.english}</small><strong>{style.name}</strong><p>{style.description}</p></div><span className="dl-radio">{draft.theme === style.id && <Check size={13} />}</span></div></button>)}</div>
    </section>

    <section className="dl-section" aria-labelledby="dl-brand-heading"><div className="dl-section-heading"><div><span className="dl-step">02</span><h2 id="dl-brand-heading">Give it a name. Set the tone.</h2></div><p>Try a choice and watch the preview change.</p></div>
      <div className="dl-brand-workspace"><div className="dl-brand-controls"><div className="dl-field"><label>NAME</label><div className="dl-name-options">{NAME_OPTIONS.map(name => <button key={name} className={draft.name === name ? "is-selected" : ""} aria-pressed={draft.name === name} onClick={() => update({ name })}>{name}</button>)}</div><label htmlFor="dl-custom-name" className="dl-small-label">Or write your own name</label><input id="dl-custom-name" value={draft.name} onChange={event => update({ name: event.target.value.slice(0, 32) })} maxLength={32} placeholder="What is your music space called?" autoComplete="off" /><small className="dl-field-hint">Name draft · Up to 32 characters</small></div><div className="dl-field"><label>TYPEFACE</label><div className="dl-font-options">{FONT_OPTIONS.map(font => <button key={font.id} className={draft.font === font.id ? "is-selected" : ""} onClick={() => update({ font: font.id })} aria-pressed={draft.font === font.id}><span className={`dl-font-specimen dl-font-${font.id}`}>Aa<span>Rhythm</span></span><span><strong>{font.name}</strong><small>{font.description}</small></span><span className="dl-radio">{draft.font === font.id && <Check size={12} />}</span></button>)}</div></div></div><div className="dl-live-preview"><div className="dl-preview-label"><span><i /> Live preview</span><span>{selectedStyle.name} / {selectedFont.name}</span></div><PagePreview theme={draft.theme} name={draft.name} font={draft.font} /><div className="dl-preview-foot"><span>A look to make your own.</span><span>MADE BY YOUR CHOICES ↗</span></div></div></div>
    </section>

    <section className="dl-section" aria-labelledby="dl-music-heading"><div className="dl-section-heading"><div><span className="dl-step">03</span><h2 id="dl-music-heading">What do you want to sound like?</h2></div><p>Listen first. Pick a sound to explore.</p></div><div className="dl-music-options">{MUSIC_SAMPLES.map((sample, i) => <article className={`dl-music-card ${draft.musicId === sample.id ? "is-selected" : ""}`} key={sample.id}><div className={`dl-music-art dl-music-art-${i}`}><div className="dl-album-number">0{i + 1}<span>{sample.kind === "instrumental" ? "INSTRUMENTAL" : "ORIGINAL SONG"}</span></div><div className="dl-album-shape" aria-hidden="true" /><div className="dl-album-title">{sample.title.split(" ").map((word, index) => <span key={index}>{word}</span>)}</div><button className="dl-audition" onClick={() => void audition(sample.id)} disabled={!sample.src || (activeId === sample.id && loading)} aria-label={`${activeId === sample.id && playing ? "Pause" : "Listen to"} ${sample.title}`}>{activeId === sample.id && playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button></div><div className="dl-music-info"><div className="dl-music-meta"><span>{sample.subtitle}</span><span>{sample.language}</span></div><h3>{sample.title}</h3><p>{sample.description}</p><div className="dl-sample-status"><Sparkles size={12} /><span>{sample.src ? "AI-generated sample" : "Audio preview coming soon"}{sample.src && sample.duration ? ` · ${Math.floor(sample.duration / 60)}:${Math.floor(sample.duration % 60).toString().padStart(2, "0")}` : ""}</span></div><button className="dl-choose-music" onClick={() => update({ musicId: sample.id })} aria-pressed={draft.musicId === sample.id}>{draft.musicId === sample.id ? <><Check size={15} />Sound selected</> : <>Explore this sound<ArrowRight size={15} /></>}</button></div></article>)}</div>
      <div className={`dl-audio-player ${activeMusic ? "has-sample" : ""}`}><div className="dl-audio-description"><Headphones size={18} /><div><strong>{activeMusic ? activeMusic.title : MUSIC_SAMPLES.some(sample => sample.src) ? "Headphones on. Try a sample." : "Audio preview coming soon"}</strong><span>{activeMusic ? `${activeMusic.language} · ${loading ? "Loading…" : playing ? "Playing" : "Ready to play"}` : "Listening does not change your selection."}</span></div></div><audio ref={audioRef} crossOrigin="anonymous" controls preload="none" aria-label={activeMusic ? `${activeMusic.title} sample player` : "AI music sample player"} hidden={!activeMusic} onPlay={() => { setPlaying(true); callbackRef.current(); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setLoading(false); setAudioError("This sample could not load. Please try again."); }} />{!activeMusic && <AudioLines className="dl-idle-audio" size={30} />}</div>
      {audioError && <p className="dl-error" role="alert">{audioError}</p>}
      {activeMusic?.lyrics && <details className="dl-lyrics"><summary>{activeMusic.title} · Lyric draft</summary><p>{activeMusic.lyrics}</p></details>}
      <div className="dl-music-next"><p>These samples are a starting point. Shape the beat, vocals, and mood of your next idea.</p><button onClick={onOpenAi}>Write a music idea <ArrowRight size={14} /></button></div>
    </section>

    <section className="dl-decision" aria-labelledby="dl-decision-heading"><div className="dl-decision-main"><div className="dl-kicker">YOUR STARTING POINT</div><h2 id="dl-decision-heading">My starting choices.</h2><div className="dl-selection-summary"><div><span>Name</span><strong>{draft.name.trim() || "Add a name"}</strong></div><div><span>Look</span><strong><i style={{ background: selectedStyle.accent }} />{selectedStyle.name}</strong></div><div><span>Type</span><strong>{selectedFont.name}</strong></div><div><span>Sound</span><strong>{selectedMusic?.title || "Not selected"}</strong></div></div><label className="dl-note-label" htmlFor="dl-choice-note">What do you like about it?<span>Optional</span></label><textarea id="dl-choice-note" rows={2} maxLength={300} placeholder="For example: stronger bass, less detail, and a simple dark look." value={draft.note} onChange={event => update({ note: event.target.value })} /></div><div className="dl-decision-actions"><button className="dl-apply" disabled={!validName} onClick={() => { onApply(normalizedDraft); setNotice(""); }}>{hasChanges ? "Start with this" : "Choices applied"}{hasChanges ? <ArrowRight size={18} /> : <Check size={18} />}</button><p>Apply your name, colors, and type. Keep your sound choice.<br />Saved in this browser. Come back and change it anytime.</p><div className="dl-share-actions"><button onClick={() => void copySelection()}><Copy size={14} />Copy choices</button><button onClick={downloadSelection}><Download size={14} />Download choices</button></div><small>Share your choices with your teacher to keep creating together.</small>{!validName && <p className="dl-error">Give your space a name first.</p>}{notice && <p className="dl-notice" role="status">{notice}</p>}</div></section>
  </section>;
}
