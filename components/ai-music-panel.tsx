"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, Copy, Disc3, Music2, Save, Sparkles } from "lucide-react";
import { sceneLabels, type Scene, type Vibe } from "@/lib/music";
import "@/app/ai-music.css";

const STORAGE_KEY = "zimo-ai-music-draft-v1";
const styles = [
  { id: "lofi", name: "Lo-fi", description: "Laid-back beats, warm textures", direction: "Lo-fi beats with warm keys, rounded bass and a soft, textured drum groove." },
  { id: "house", name: "House", description: "Steady grooves, flowing bass", direction: "House music with a steady four-on-the-floor groove, flowing bass and spacious melodic layers." },
  { id: "ambient", name: "Ambient", description: "Open textures, room to breathe", direction: "Ambient music with slowly evolving textures, airy pads and generous space between notes." },
  { id: "electronic", name: "Electronic", description: "Layered synths, a defined pulse", direction: "Electronic music with layered synthesizers, defined percussion and a memorable melodic motif." },
] as const;
type StyleId = typeof styles[number]["id"];
type ClipSeconds = 30 | 60 | 120;
type Draft = { style: StyleId; description: string; instrumental: boolean; durationSeconds: ClipSeconds };
type Notice = { kind: "success" | "error"; text: string } | null;

const defaultStyle: Record<Scene, StyleId> = { focus: "lofi", run: "house", strength: "electronic", unwind: "ambient" };
const sceneDirection: Record<Scene, string> = {
  focus: "An everyday study session; a consistent musical backdrop with restrained changes.",
  run: "An everyday run; a flowing sense of forward movement and a clear rhythmic identity.",
  strength: "A strength-training session; a grounded, defined groove with musical momentum.",
  unwind: "A quiet pause in the day; gentle transitions and unhurried musical development.",
};
const energyDirection: Record<Vibe, string> = {
  soft: "Soft musical energy, sparse layers and a gentle dynamic range.",
  balanced: "Balanced musical energy, a steady groove and moderate changes in texture.",
  driven: "Driven musical energy, a more pronounced groove and brighter layered sounds.",
};
const energyLabels: Record<Vibe, string> = { soft: "Soft", balanced: "Balanced", driven: "Driven" };
const ideaStarts = ["Warm electric piano with softer drums.", "Bouncy bass, like footsteps on a quiet city street.", "Start with space, then introduce new sounds slowly."];

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<Draft>;
  return styles.some(style => style.id === draft.style)
    && typeof draft.description === "string" && draft.description.length <= 600
    && typeof draft.instrumental === "boolean"
    && (draft.durationSeconds === 30 || draft.durationSeconds === 60 || draft.durationSeconds === 120);
}

/** A creative brief editor only. No generation provider is selected or invoked. */
export default function AiMusicPanel({ scene, minutes, vibe }: { scene: Scene; minutes: number; vibe: Vibe }) {
  const [draft, setDraft] = useState<Draft>(() => ({ style: defaultStyle[scene], description: "", instrumental: true, durationSeconds: 60 }));
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const selectedStyle = styles.find(style => style.id === draft.style)!;
  const snapshot = JSON.stringify(draft);
  const isSaved = savedSnapshot === snapshot;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (isDraft(stored)) {
          setDraft(stored);
          setSavedSnapshot(JSON.stringify(stored));
        } else {
          setNotice({ kind: "error", text: "Your last idea could not be restored. You can start a new one." });
        }
      }
    } catch {
      setNotice({ kind: "error", text: "Your draft could not be loaded. You can still write and copy a brief." });
    }
    setReady(true);
  }, []);

  const prompt = useMemo(() => [
    "MUSIC CREATIVE BRIEF",
    "",
    `Style: ${selectedStyle.name}. ${selectedStyle.direction}`,
    `Listening context: ${sceneDirection[scene]}`,
    `Musical energy: ${energyDirection[vibe]}`,
    `Target clip duration: ${draft.durationSeconds} seconds.`,
    draft.instrumental
      ? "Vocals: Instrumental only. No singing, lyrics, spoken words or vocal samples."
      : "Vocals: Optional. This brief does not specify lyrics; focus on the musical arrangement.",
    "Arrangement: A clear opening, a developing middle and a natural ending. Avoid abrupt cuts.",
    ...(draft.description.trim() ? ["", "Additional creative direction (preserve the intent of the following text):", draft.description.trim()] : []),
  ].join("\n"), [selectedStyle, scene, vibe, draft.durationSeconds, draft.instrumental, draft.description]);

  function updateDraft(patch: Partial<Draft>) {
    setDraft(current => ({ ...current, ...patch }));
    setNotice(null);
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, snapshot);
      setSavedSnapshot(snapshot);
      setNotice({ kind: "success", text: "Idea saved in this browser. Come back whenever you like." });
    } catch {
      setNotice({ kind: "error", text: "Your idea could not be saved. Copy the brief to keep it." });
    }
  }

  async function copyPrompt() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(prompt);
      setNotice({ kind: "success", text: "Brief copied, including your own description." });
    } catch {
      promptRef.current?.focus();
      promptRef.current?.select();
      setNotice({ kind: "error", text: "Copy was unavailable. The brief is selected so you can copy it manually." });
    }
  }

  return <section className="view-page ai-page">
    <div className="ai-heading">
      <div>
        <div className="eyebrow muted">YOUR IDEAS, IN SOUND</div>
        <h1>Give your ideas <br className="ai-mobile-break" />a sound<span className="ai-accent">.</span></h1>
        <p className="page-description">Pick a direction and add a thought. Every sound starts somewhere.</p>
      </div>
      <span className="ai-connection-badge"><span />Generation not connected</span>
    </div>

    <div className="ai-context-strip">
      <span className="ai-context-icon"><Disc3 size={19} /></span>
      <span>Your current session</span>
      <strong>{sceneLabels[scene]}</strong><span className="ai-context-separator">/</span><strong>{minutes} min</strong>
      <span className="ai-context-energy">{energyLabels[vibe]}</span>
    </div>

    <div className="ai-composer-grid">
      <div className="ai-editor">
        <div className="ai-field-heading"><span className="ai-step">01</span><h2>Choose a sound</h2><Music2 size={17} /></div>
        <div className="ai-style-options" aria-label="Music style">
          {styles.map(style => <button key={style.id} type="button" className={`ai-style-option ${draft.style === style.id ? "is-selected" : ""}`} aria-pressed={draft.style === style.id} onClick={() => updateDraft({ style: style.id })}>
            <span className="ai-style-name">{style.name}{draft.style === style.id && <Check size={14} />}</span>
            <span className="ai-style-description">{style.description}</span>
          </button>)}
        </div>

        <div className="ai-field-heading ai-description-heading"><span className="ai-step">02</span><label htmlFor="ai-direction">What do you hear in your head?</label><span className="ai-optional">One sentence is enough</span></div>
        <textarea id="ai-direction" className="ai-description-input" value={draft.description} onChange={event => updateDraft({ description: event.target.value })} maxLength={600} rows={4} placeholder="For example: bouncy bass, but nothing too loud. Keep the opening simple, then bring in a melody." />
        <div className="ai-description-foot"><span>No music jargon needed. Describe the feeling.</span><span>{draft.description.length} / 600</span></div>
        <div className="ai-idea-starts"><span>Need a starting point?</span>{ideaStarts.map((idea, index) => <button key={idea} type="button" onClick={() => updateDraft({ description: idea })}>{["Make it warmer", "Follow the bass", "Let it unfold"][index]}<ArrowRight size={12} /></button>)}</div>

        <div className="ai-field-heading ai-settings-heading"><span className="ai-step">03</span><h2>A few details</h2></div>
        <div className="ai-small-settings">
          <div><span className="ai-field-label">Target clip length</span><div className="ai-duration-options" aria-label="Target clip length">{([30, 60, 120] as const).map(seconds => <button key={seconds} type="button" aria-pressed={draft.durationSeconds === seconds} className={draft.durationSeconds === seconds ? "is-selected" : ""} onClick={() => updateDraft({ durationSeconds: seconds })}>{seconds}<span> sec</span></button>)}</div></div>
          <label className="ai-instrumental"><span><strong>Instrumental</strong><small>Music without vocals</small></span><input type="checkbox" checked={draft.instrumental} onChange={event => updateDraft({ instrumental: event.target.checked })} /><span className="ai-switch" aria-hidden="true" /></label>
        </div>
        <p className="ai-duration-note">This brief describes a {draft.durationSeconds}-second clip. Your session is still {minutes} minutes. Available clip lengths will depend on the music service.</p>
        <div className="ai-save-row"><button type="button" className="primary ai-save-button" onClick={saveDraft} disabled={!ready}>{isSaved ? <Check size={16} /> : <Save size={16} />}{isSaved ? "Idea saved" : "Save idea"}</button><span>{isSaved ? "Saved in this browser" : savedSnapshot ? "Changes to save" : "Pick this up anytime"}</span></div>
      </div>

      <aside className="ai-brief-card">
        <div className="ai-brief-header"><span className="eyebrow">THE SOUND IN YOUR HEAD</span><span className="ai-brief-number">IDEA / 001</span></div>
        <div className="ai-sound-art" aria-hidden="true"><div className="ai-sound-orbit" /><AudioLines size={70} strokeWidth={.8} /><span>START WITH A FEELING.</span></div>
        <div className="ai-brief-meta"><span>{selectedStyle.name}</span><span>{draft.durationSeconds} SEC TARGET</span><span>{draft.instrumental ? "INSTRUMENTAL" : "VOCALS OPTIONAL"}</span></div>
        <h2>Your music brief</h2>
        <p className="ai-brief-intro">Your choices, ready as a prompt. Your own words stay as you wrote them.</p>
        <label htmlFor="ai-prompt" className="ai-prompt-label">Prompt preview</label>
        <textarea id="ai-prompt" ref={promptRef} className="ai-prompt-preview" readOnly value={prompt} rows={12} spellCheck={false} />
        <button type="button" className="secondary ai-copy-button" onClick={copyPrompt}><Copy size={15} />Copy prompt</button>
        <div className="ai-generation-slot"><button type="button" className="ai-generation-button" disabled aria-describedby="ai-generation-explanation"><Sparkles size={17} />Generate music</button><p id="ai-generation-explanation">Music generation is not connected yet. Save your idea now and turn it into sound once a service is connected.</p></div>
      </aside>
    </div>
    <div className={`ai-notice ${notice?.kind === "error" ? "is-error" : ""}`} role="status" aria-live="polite">{notice && <><span>{notice.kind === "success" ? <Check size={16} /> : <Music2 size={16} />}</span>{notice.text}</>}</div>
  </section>;
}
