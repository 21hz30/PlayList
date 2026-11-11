"use client";

import { useId, useRef, type CSSProperties, type PointerEvent } from "react";
import "@/app/landing-turntable.css";

type LandingTurntableProps = {
  playing: boolean;
  motionEnabled: boolean;
  energy?: number;
};

/** Decorative, CSS-built turntable. The landing page owns audio and its controls. */
export default function LandingTurntable({ playing, motionEnabled, energy = 0.35 }: LandingTurntableProps) {
  const id = useId().replaceAll(":", "");
  const surface = useRef<HTMLDivElement>(null);
  const level = Number.isFinite(energy) ? Math.min(1, Math.max(0, energy)) : 0.35;

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!motionEnabled || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    surface.current?.style.setProperty("--zt-tilt-x", `${-y * 7}deg`);
    surface.current?.style.setProperty("--zt-tilt-y", `${x * 7}deg`);
    surface.current?.style.setProperty("--zt-light-x", `${50 + x * 22}%`);
  }

  function reset() {
    surface.current?.style.setProperty("--zt-tilt-x", "0deg");
    surface.current?.style.setProperty("--zt-tilt-y", "0deg");
    surface.current?.style.setProperty("--zt-light-x", "50%");
  }

  return <div ref={surface} className={`zt-scene ${playing ? "zt-is-playing" : ""} ${motionEnabled ? "zt-motion-on" : "zt-motion-off"}`} style={{ "--zt-energy": level } as CSSProperties} onPointerMove={move} onPointerLeave={reset} aria-hidden="true">
    <div className="zt-ambient" />
    <div className="zt-grid" />
    <div className="zt-coordinate zt-coordinate-top"><i /> Z / SOUND STUDIES</div>
    <div className="zt-coordinate zt-coordinate-side">INDEPENDENT SPIRIT. EVERYDAY SOUND.</div>
    <div className="zt-orbit zt-orbit-one" />
    <div className="zt-orbit zt-orbit-two" />
    <svg className="zt-orbit-type" viewBox="0 0 600 600">
      <defs><path id={`zt-type-${id}`} d="M300,300 m-272,0 a272,272 0 1,1 544,0 a272,272 0 1,1 -544,0" /></defs>
      <text><textPath href={`#zt-type-${id}`} startOffset="4%">A LITTLE MUSIC. A LITTLE MORE YOU.</textPath></text>
      <text><textPath href={`#zt-type-${id}`} startOffset="57%">FIND YOUR OWN FREQUENCY. ↗</textPath></text>
    </svg>
    <div className="zt-record-stage">
      <div className="zt-platter-shadow" />
      <div className="zt-platter">
        <div className="zt-platter-rim" />
        <div className="zt-vinyl">
          <div className="zt-grooves" />
          <div className="zt-runout" />
          <div className="zt-label">
            <div className="zt-label-top"><span>INDEPENDENT<br />SOUND EXPLORER</span><span>STEREO<br />33⅓ RPM</span></div>
            <div className="zt-label-name">ZIMO<span>SESSIONS</span></div>
            <div className="zt-label-rule" />
            <div className="zt-label-bottom"><span>YOUR DAILY<br />SOUNDTRACK</span><b>A</b><span>VOL. 01<br />PLAY IT YOUR WAY</span></div>
          </div>
        </div>
        <div className="zt-vinyl-sheen" />
        <div className="zt-spindle"><i /></div>
      </div>
      <svg className="zt-tonearm" viewBox="0 0 160 290">
        <defs>
          <linearGradient id={`zt-metal-${id}`} x1="0" x2="1"><stop stopColor="#3b403b" /><stop offset=".28" stopColor="#c7cec1" /><stop offset=".46" stopColor="#f0f2e7" /><stop offset=".7" stopColor="#777f72" /><stop offset="1" stopColor="#252d23" /></linearGradient>
        </defs>
        <circle cx="108" cy="47" r="37" fill="#0d100d" stroke="#3c4337" />
        <circle cx="108" cy="47" r="29" fill="#20261e" stroke="#606857" />
        <circle cx="108" cy="47" r="17" fill={`url(#zt-metal-${id})`} />
        <path d="M108 28V162Q108 185 89 200L49 237" fill="none" stroke="#000" strokeWidth="13" transform="translate(3 5)" />
        <path d="M108 28V162Q108 185 89 200L49 237" fill="none" stroke={`url(#zt-metal-${id})`} strokeWidth="9" />
        <path d="M106 31V162Q106 183 88 198L49 234" fill="none" stroke="#d4d9ce" strokeOpacity=".4" strokeWidth="1" />
        <rect x="91" y="2" width="34" height="28" rx="4" fill={`url(#zt-metal-${id})`} />
        <path d="M49 222L63 236L39 263L22 247Z" fill="#242c1f" stroke="#727d61" />
        <path d="M26 246L40 260L32 269L18 255Z" fill="#d5f36b" />
        <path d="M26 264L21 272" stroke="#e3e8db" strokeWidth="2" />
        <circle cx="108" cy="47" r="4" fill="#262e22" />
      </svg>
    </div>
    <div className="zt-sticker"><span>NO SKIPS.</span><strong>Just<br />your vibe.</strong><svg viewBox="0 0 28 28"><path d="M4 24L24 4M5 4h19v19" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg></div>
    <div className="zt-signal-card">
      <div className="zt-signal-label"><span className="zt-live-light" /><span>{playing ? "SOUND ON" : "READY WHEN YOU ARE"}</span><b>01</b></div>
      <div className="zt-signal-body"><span className="zt-bars">{[.32,.59,.84,.46,.95,.68,.39,.76,.52,.91,.63,.35,.71,.46,.82,.54].map((height, index) => <i key={index} style={{ "--zt-bar": height, "--zt-delay": `${index * -.137}s` } as CSSProperties} />)}</span><span className="zt-signal-side">L<br />R</span></div>
      <div className="zt-signal-foot"><span>EVERYDAY / REIMAGINED</span><span>↗</span></div>
    </div>
    <div className="zt-crosshair zt-crosshair-one" /><div className="zt-crosshair zt-crosshair-two" />
    <div className="zt-bottom-code"><span>ZIMO SESSIONS</span><span>PRESS PLAY ON YOUR DAY</span></div>
  </div>;
}
