"use client";

import { useCallback, useRef, useState } from "react";

type SoundName = "tick" | "correct" | "wrong" | "reveal" | "fanfare";

/** Nodes used by the looping countdown music so we can stop them cleanly */
interface MusicNodes {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  interval: ReturnType<typeof setInterval>;
}

const STORAGE_KEY = "sound-muted";

/** Synthesize short sounds using Web Audio API — no MP3 files needed */
function createSound(ctx: AudioContext, name: SoundName) {
  switch (name) {
    case "tick": {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
      break;
    }
    case "correct": {
      // Two ascending tones
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 523; // C5
      osc2.type = "sine";
      osc2.frequency.value = 659; // E5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain).connect(ctx.destination);
      osc2.connect(gain);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.3);
      break;
    }
    case "wrong": {
      // Descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      break;
    }
    case "reveal": {
      // Drum roll effect — rapid ticks ascending
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      gain.connect(ctx.destination);
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 400 + i * 80;
        osc.connect(gain);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.05);
      }
      break;
    }
    case "fanfare": {
      // Triumphant chord: C-E-G ascending
      const notes = [523, 659, 784]; // C5, E5, G5
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      gain.connect(ctx.destination);
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + 1.2);
      });
      break;
    }
  }
}

/**
 * Start a looping Kahoot-style countdown music track.
 * Returns a MusicNodes handle so we can stop it later.
 *
 * The loop is a 4-beat pattern (~1.6s) that repeats:
 *   beat 1: bass note (low)
 *   beat 2: mid note
 *   beat 3: bass note (low)
 *   beat 4: high note (tension)
 */
function startCountdownMusic(ctx: AudioContext): MusicNodes {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.12; // keep it subtle
  masterGain.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [masterGain];

  // Pattern: bass-mid-bass-high, repeating
  const pattern = [
    { freq: 220, type: "square" as OscillatorType },  // A3 bass
    { freq: 330, type: "triangle" as OscillatorType }, // E4 mid
    { freq: 220, type: "square" as OscillatorType },   // A3 bass
    { freq: 440, type: "sawtooth" as OscillatorType }, // A4 high tension
  ];

  const beatDuration = 0.4; // seconds per beat
  let beatIndex = 0;

  function playBeat() {
    const beat = pattern[beatIndex % pattern.length];
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = beat.type;
    osc.frequency.value = beat.freq;
    noteGain.gain.setValueAtTime(0.6, ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + beatDuration * 0.9);
    osc.connect(noteGain).connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + beatDuration * 0.9);
    oscillators.push(osc);
    beatIndex++;
  }

  // Play first beat immediately, then loop
  playBeat();
  const interval = setInterval(() => {
    try {
      playBeat();
    } catch {
      // Context may have been closed
    }
  }, beatDuration * 1000);

  return { oscillators, gains, interval };
}

/** Stop countdown music and clean up nodes */
function stopCountdownMusic(nodes: MusicNodes) {
  clearInterval(nodes.interval);
  nodes.oscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped
    }
  });
  nodes.gains.forEach((g) => {
    try {
      g.disconnect();
    } catch {
      // Already disconnected
    }
  });
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<MusicNodes | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  function getContext(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  const play = useCallback(
    (name: SoundName) => {
      if (muted) return;
      try {
        const ctx = getContext();
        createSound(ctx, name);
      } catch {
        // Audio not available — fail silently
      }
    },
    [muted]
  );

  /** Start looping countdown music (call when question phase begins) */
  const startMusic = useCallback(() => {
    if (muted) return;
    // Stop any existing music first
    if (musicRef.current) {
      stopCountdownMusic(musicRef.current);
      musicRef.current = null;
    }
    try {
      const ctx = getContext();
      musicRef.current = startCountdownMusic(ctx);
    } catch {
      // Audio not available
    }
  }, [muted]);

  /** Stop the countdown music (call when question phase ends) */
  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      stopCountdownMusic(musicRef.current);
      musicRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      // If muting, stop any playing music immediately
      if (next && musicRef.current) {
        stopCountdownMusic(musicRef.current);
        musicRef.current = null;
      }
      return next;
    });
  }, []);

  return { play, muted, toggleMute, startMusic, stopMusic };
}
