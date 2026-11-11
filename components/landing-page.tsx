"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, AudioLines, Check, Disc3, Headphones, MoveUpRight, Pause, Play, Plus, Volume2, Waves } from "lucide-react";
import LandingTurntable from "@/components/landing-turntable";
import { ZIMO_PROFILE } from "@/lib/project-profile";
import { MUSIC_SAMPLES } from "@/lib/music-samples";
import "@/app/landing.css";
import "@/app/session-account.css";

type LandingProps = { isAdmin: boolean };
const moments = [
  { id: "focus", name: "Focus", number: "01", cue: "LESS NOISE. MORE ROOM.", title: "Find your flow.", copy: "A soft landing for your next chapter, your next idea, or the thing you have been putting off.", track: "Paper Window", genre: "LO-FI / INSTRUMENTAL", src: MUSIC_SAMPLES.find(sample => sample.id === "paper-window")?.src, color: "#d5f36b", length: "2:32", bars: [18,30,45,27,58,71,38,55,82,61,43,65,91,73,52,84,60,40,64,44,31,59,38,26,46,20,37,16] },
  { id: "move", name: "Move", number: "02", cue: "A LITTLE MORE MOMENTUM.", title: "Move your own way.", copy: "Out the door, into a workout, or just around your room. Give your next move a soundtrack.", track: "Own Tempo", genre: "ELECTRONIC POP / MANDARIN + ENGLISH", src: MUSIC_SAMPLES.find(sample => sample.id === "own-tempo")?.src, color: "#94bcff", length: "1:06", bars: [30,52,76,42,80,54,96,70,45,90,62,100,72,90,54,86,100,65,85,56,91,68,40,70,50,82,43,26] },
  { id: "unwind", name: "Unwind", number: "03", cue: "LET THE DAY FADE OUT.", title: "Take the long way home.", copy: "Warm textures, softer edges. A little space to leave the day behind and come back to yourself.", track: "Blue Hour", genre: "DOWNTEMPO / MANDARIN + ENGLISH", src: MUSIC_SAMPLES.find(sample => sample.id === "blue-hour")?.src, color: "#eabb88", length: "1:31", bars: [13,24,35,30,44,58,48,42,65,49,75,58,68,82,60,70,55,76,53,45,60,42,55,30,40,24,33,15] },
] as const;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2,"0")}`;

function Brand({ footer = false }: { footer?: boolean }) {
  return <a className={`lp-brand ${footer ? "lp-brand-footer" : ""}`} href="/" aria-label="Zimo Sessions home"><span className="lp-brand-bars" aria-hidden="true"><i /><i /><i /><i /></span><span>ZIMO<span>SESSIONS</span></span><sup>✳</sup></a>;
}

export default function LandingPage({ isAdmin }: LandingProps) {
  const entryHref = "/app";
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [motion, setMotion] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [energy, setEnergy] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const request = useRef(0);
  const moment = moments[selected];
  const motionEnabled = motion && !reducedMotion;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    // Keep links shared before the landing page was introduced working.
    if (window.location.hash === "#design") window.location.replace(isAdmin ? "/admin#design" : "/admin/login");
    const page = root.current;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    page?.querySelectorAll(".lp-reveal").forEach(element => observer.observe(element));
    page?.classList.add("lp-enhanced");
    const stop = () => { request.current += 1; audio.current?.pause(); };
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => { media.removeEventListener("change", update); observer.disconnect(); document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", stop); stop(); if(audioContext.current) void audioContext.current.close().catch(() => undefined); };
  }, [isAdmin]);

  useEffect(() => {
    if (!playing || !motionEnabled || !analyser.current) { setEnergy(0); return; }
    const meter = analyser.current;
    const values = new Uint8Array(meter.frequencyBinCount);
    let frame = 0, last = 0;
    const tick = (time: number) => {
      if (time - last > 65) { meter.getByteFrequencyData(values); setEnergy(values.reduce((sum,value) => sum + value, 0) / values.length / 255); last = time; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, motionEnabled]);

  async function playSample(index = selected) {
    const element = audio.current;
    if (!element) return;
    const version = ++request.current;
    const src = moments[index].src;
    setAudioError("");
    setSelected(index);
    if (!src) {
      element.pause();
      if (element.hasAttribute("src")) { element.removeAttribute("src"); element.load(); }
      setPlaying(false); setElapsed(0);
      return;
    }
    if (element.getAttribute("src") !== src) {
      element.pause(); element.crossOrigin = "anonymous";
      element.src = src; element.load(); setElapsed(0);
    }
    element.volume = .48;
    try {
      if (!audioContext.current && typeof AudioContext !== "undefined") {
        const context = new AudioContext();
        const meter = context.createAnalyser(); meter.fftSize = 64; meter.smoothingTimeConstant = .85;
        const source = context.createMediaElementSource(element); source.connect(meter); meter.connect(context.destination);
        audioContext.current = context; analyser.current = meter;
      }
      // Keep both activation calls within the originating click.
      const activation = audioContext.current?.resume();
      const playback = element.play();
      await Promise.all([activation, playback]);
      if (request.current === version) setPlaying(true);
    } catch {
      if (request.current !== version) return;
      setPlaying(false); setAudioError("The sample could not start. Give it another try.");
    }
  }
  function toggleAudio() { if (playing) { request.current += 1; audio.current?.pause(); } else void playSample(); }
  function selectMoment(index: number) {
    if (selected === index) return;
    if (playing) void playSample(index);
    else {
      request.current += 1; setSelected(index); setElapsed(0); setAudioError("");
      const element = audio.current;
      const src = moments[index].src;
      if (element) {
        element.pause();
        if (src) { element.crossOrigin = "anonymous"; element.src = src; element.load(); }
        else if (element.hasAttribute("src")) { element.removeAttribute("src"); element.load(); }
      }
    }
  }

  return <div ref={root} className="lp" data-motion={motionEnabled ? "on" : "off"}>
    <a href="#project" className="lp-skip">Skip to the project</a>
    <header className="lp-nav">
      <Brand />
      <nav aria-label="Homepage navigation"><a href="#project">The project</a><a href="#sound">Find your sound</a><a href="#zimo">Meet Zimo <span>↗</span></a></nav>
      <div className="lp-nav-actions"><button className="lp-motion-toggle" onClick={() => setMotion(value => !value)} aria-label={motionEnabled ? "Pause animations" : "Enable animations"} aria-pressed={!motionEnabled} disabled={reducedMotion} title={reducedMotion ? "Your reduced-motion preference is active" : motionEnabled ? "Pause animations" : "Enable animations"}>{motionEnabled ? <Pause size={13} /> : <Play size={13} />}<span>Motion {motionEnabled ? "on" : "off"}</span></button><a className="lp-admin-link" href={isAdmin ? "/admin" : "/admin/login"}>{isAdmin ? "Studio" : "Admin sign in"}</a><a className="lp-nav-login" href={entryHref} target="_top">Start listening<ArrowUpRight size={17} /></a></div>
    </header>

    <main>
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-grid" aria-hidden="true" /><div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-top"><span><i /> AN INDEPENDENT MUSIC PROJECT</span><span>CURATED BY CURIOSITY. / VOL. 001</span></div>
        <div className="lp-hero-content"><div className="lp-hero-copy"><div className="lp-overline"><span>FOR YOUR EVERYDAY</span><span className="lp-short-line" /></div><h1 id="lp-hero-title">YOUR DAY.<br /><span>YOUR <em>TEMPO.</em></span></h1><p>Life has a rhythm.<br />Find the music that makes it yours.</p><div className="lp-hero-actions"><a className="lp-button lp-button-accent" href={entryHref} target="_top">Find my rhythm <ArrowUpRight size={21} /></a><button className="lp-hero-listen" onClick={toggleAudio} disabled={!moment.src} title={!moment.src ? "Audio preview coming soon" : undefined} style={!moment.src ? { opacity: .5, cursor: "not-allowed" } : undefined}><span>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span>{playing ? "Pause the vibe" : "Hear the vibe"}</button></div><div className="lp-hero-note"><span className="lp-mini-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span><span>{moment.src ? "A LITTLE MUSIC. A LITTLE MORE YOU." : "Audio preview coming soon"}</span></div></div>
          <div className="lp-hero-art"><LandingTurntable playing={playing} motionEnabled={motionEnabled} energy={energy} /></div>
        </div>
        <div className="lp-hero-bottom"><a href="#project"><span className="lp-scroll-icon"><ArrowDown size={16} /></span>SCROLL TO FIND YOUR FREQUENCY</a><button onClick={toggleAudio} className="lp-sound-switch" disabled={!moment.src} title={!moment.src ? "Audio preview coming soon" : undefined} style={!moment.src ? { opacity: .5, cursor: "not-allowed" } : undefined}><Volume2 size={14} /><span>SOUND {playing ? "ON" : "OFF"}</span><i className={playing ? "is-on" : ""}><b /></i></button></div>
      </section>

      <div className="lp-marquee" aria-hidden="true"><div>{[0,1,2,3].map(i=><span key={i}>FOCUS <i>✳</i> MOVE <i>✳</i> RESET <i>✳</i> REPEAT <i>✳</i> </span>)}</div></div>

      <section className="lp-project lp-section" id="project" aria-labelledby="project-title">
        <div className="lp-section-index lp-reveal"><span>01 / THE IDEA</span><Plus size={19} /></div>
        <div className="lp-project-intro lp-reveal"><h2 id="project-title">Not every day feels the same.<br /><span>Why should it sound the same?</span></h2><div><p>Ten minutes to focus. A run around the block. A quiet moment after everything.</p><p>Zimo Sessions starts with what you want to do, then helps you shape a soundtrack around it. Your time. Your energy. Your own way of listening.</p></div></div>
        <div className="lp-process">
          <article className="lp-reveal"><span className="lp-process-number">01<span> / PRESS START</span></span><div className="lp-process-art lp-process-moment" aria-hidden="true"><span>FOCUS</span><span>MOVE</span><span>UNWIND</span><MoveUpRight size={35} /></div><h3>Choose your moment.</h3><p>Studying, running, lifting, or slowing down. Start with what comes next.</p></article>
          <article className="lp-reveal"><span className="lp-process-number">02<span> / SET THE LEVEL</span></span><div className="lp-process-art lp-process-level" aria-hidden="true"><span>SOFT</span><div>{Array.from({length:17},(_,i)=><i key={i} style={{height:18+i*3,animationDelay:`${i*-.14}s`}} />)}</div><span>DRIVEN</span></div><h3>Find your energy.</h3><p>Pick your time and your pace. Build a session that feels right for you.</p></article>
          <article className="lp-reveal"><span className="lp-process-number">03<span> / MAKE YOUR MIX</span></span><div className="lp-process-art lp-process-mix" aria-hidden="true"><div /><div /><div /><Disc3 size={37} /><span>YOUR<br />OWN MIX.</span></div><h3>Make it personal.</h3><p>Pick a track, press play, and find the sound that fits your moment.</p></article>
        </div>
      </section>

      <section className="lp-sound lp-section" id="sound" aria-labelledby="sound-title" style={{"--sample-accent":moment.color} as React.CSSProperties}>
        <div className="lp-section-index lp-reveal"><span>02 / A TASTE OF THE SOUND</span><AudioLines size={19} /></div>
        <div className="lp-sound-layout"><div className="lp-sound-copy lp-reveal"><span className="lp-overline">DIFFERENT MOMENTS. DIFFERENT FREQUENCIES.</span><h2 id="sound-title">What does<br /><em>your day</em><br />sound like?</h2><p>Three sounds to start a conversation.<br />Try one on. See where it takes you.</p><div className="lp-moment-tabs" role="group" aria-label="Choose a listening moment">{moments.map((item,index)=><button key={item.id} aria-pressed={selected===index} className={selected===index?"is-active":""} onClick={()=>selectMoment(index)}><span>{item.number}</span>{item.name}{selected===index?<Check size={15}/>:<ArrowUpRight size={15}/>}</button>)}</div></div>
          <div className="lp-listening-deck lp-reveal"><div className="lp-deck-top"><span><i /> {playing ? "NOW PLAYING" : "ON THE DECK"}</span><span>{moment.number} / 03</span></div><div className="lp-sample-visual" data-playing={playing}><div className="lp-sample-grid" /><span className="lp-sample-orbit" /><div className="lp-sample-record"><div><Disc3 size={33} strokeWidth={.7}/><span>{moment.name.toUpperCase()}<small>ZIMO SESSIONS</small></span></div></div><span className="lp-sample-caption">{moment.cue}</span><span className="lp-sample-star">✳</span><span className="lp-sample-code">ZS—00{selected+1}<br />EVERYDAY EDIT</span></div><div className="lp-deck-body"><div className="lp-deck-title"><div><span>{moment.genre}</span><h3>{moment.track}</h3></div><button onClick={toggleAudio} disabled={!moment.src} aria-label={!moment.src ? "Audio preview coming soon" : playing ? `Pause ${moment.track}` : `Play ${moment.track}`} className="lp-deck-play" style={!moment.src ? { opacity: .5, cursor: "not-allowed" } : undefined}>{playing?<Pause size={24} fill="currentColor"/>:<Play size={24} fill="currentColor"/>}</button></div><div className="lp-sample-wave" aria-hidden="true">{moment.bars.map((height,index)=><i key={index} style={{height:`${height}%`,animationDelay:`${index*-.095}s`}} className={playing?"is-playing":""}/>)}</div><div className="lp-deck-time"><span>{clock(elapsed)}</span><span>{moment.length}</span></div><p className="lp-track-description">{moment.copy}</p><div className="lp-ai-label"><span>{moment.src ? "AI-GENERATED SAMPLE" : "Audio preview coming soon"}</span><span>A starting point for exploration <ArrowUpRight size={12}/></span></div></div></div>
        </div>
      </section>

      <section className="lp-zimo lp-section" id="zimo" aria-labelledby="zimo-title"><div className="lp-section-index lp-reveal"><span>03 / THE PERSON BEHIND THE PLAYLIST</span><span>MEET THE CREATOR ↙</span></div><div className="lp-zimo-layout"><div className="lp-portrait-wrap lp-reveal"><div className="lp-portrait" role={ZIMO_PROFILE.portrait?undefined:"img"} aria-label={ZIMO_PROFILE.portrait?undefined:"Portrait space reserved for Zimo"}>{ZIMO_PROFILE.portrait?<img src={ZIMO_PROFILE.portrait} alt="Zimo, the student behind Zimo Sessions"/>:<><div className="lp-portrait-grid"/><span className="lp-portrait-cross lp-cross-one">+</span><span className="lp-portrait-cross lp-cross-two">+</span><div className="lp-portrait-initial">Z<span>✳</span></div><div className="lp-portrait-placeholder"><span>THE FACE BEHIND THE FREQUENCY.</span><strong>Zimo's portrait goes here.</strong></div></>}<div className="lp-portrait-tag"><span>STUDENT. MUSIC LOVER.</span><span>EXPLORING WHAT'S NEXT.</span></div></div><span className="lp-portrait-tape">ALWAYS LISTENING.</span><div className="lp-portrait-caption"><span>FIG. 01 — ZIMO</span><span>A WORK IN PROGRESS, LIKE ALL GOOD THINGS.</span></div></div><div className="lp-zimo-copy lp-reveal"><span className="lp-overline"><i/>THE HUMAN SIDE</span><h2 id="zimo-title">Meet Zimo.<br /><em>Always curious.</em></h2><p className="lp-zimo-lead">A love for music.<br />An idea worth pressing play on.</p><p>Zimo is a student with a love for music and a curiosity for DJing. He is exploring how different sounds can change the feel of an everyday moment.</p><p>This project is his starting point: a space to collect inspiration, experiment with playlists, and discover a musical style of his own.</p><div className="lp-zimo-tags"><span><Headphones size={14}/> LISTEN</span><span><Waves size={14}/> EXPERIMENT</span><span><Disc3 size={14}/> MAKE IT YOURS</span></div><a className="lp-inline-link" href={entryHref} target="_top">Step inside the project <ArrowUpRight size={19}/></a></div></div></section>

      <section className="lp-finale" aria-labelledby="finale-title"><div className="lp-finale-orbits" aria-hidden="true"><i/><i/><i/></div><div className="lp-finale-inner lp-reveal"><span className="lp-overline">THERE IS NO RIGHT RHYTHM. ONLY YOURS.</span><h2 id="finale-title">Good things<br />start with <em>play.</em><span>✳</span></h2><a className="lp-button lp-button-accent" href={entryHref} target="_top">Find my rhythm<ArrowUpRight size={23}/></a><p>Choose your moment. Start listening. No account needed.</p></div><span className="lp-finale-coordinate">FIND YOUR FREQUENCY / STAY CURIOUS</span></section>
    </main>
    <footer className="lp-footer"><div><Brand footer/><span>AN INDEPENDENT PROJECT BY ZIMO.</span></div><div><a href="#project">The project</a><a href="#zimo">Meet Zimo</a><a href={entryHref} target="_top">Start listening<ArrowUpRight size={13}/></a><a href={isAdmin ? "/admin" : "/admin/login"}>{isAdmin ? "Studio" : "Admin sign in"}</a></div><span>MADE FOR YOUR EVERYDAY. <span>✳</span></span></footer>
    <audio ref={audio} crossOrigin="anonymous" preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={event=>setElapsed(event.currentTarget.currentTime)} onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setAudioError("This sample is unavailable. Please try another sound.");}} />
    {audioError&&<div className="lp-audio-error" role="status">{audioError}<button onClick={()=>setAudioError("")} aria-label="Dismiss audio message">×</button></div>}
    {playing&&<div className="lp-mini-player"><button onClick={toggleAudio} aria-label="Pause homepage music"><Pause size={16} fill="currentColor"/></button><div><span>{moment.track}</span><small>AI SAMPLE · {moment.name.toUpperCase()}</small></div><span className="lp-mini-meter" aria-hidden="true"><i/><i/><i/><i/></span><a href="#sound" aria-label="Go to the sample player"><ArrowUpRight size={18}/></a></div>}
  </div>;
}
