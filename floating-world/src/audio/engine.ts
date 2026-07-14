// Room tone for a woodblock print. Not a soundtrack you sit and listen to —
// the sound the print makes while it breathes on a second monitor. Everything
// here is SYNTHESIZED live from the Web Audio graph (no audio files, ever, the
// same no-external-fetch rule the HUD keeps) and, like the paint, it is
// HONEST: the same real state that drives the visuals drives the sound —
//
//   sun phase   → the pad opens toward day, closes to a warm lantern hum at
//                 night (world/sun.ts, the palette's own key).
//   weather     → real rain patters on the paper, fog lengthens the reverb
//                 tail and muffles the top end, snow rolls the highs off
//                 (world/weather.ts, WEATHER — only ever real conditions).
//   trains      → every arrival strikes a koto pluck, pitched by line
//                 (1 Line low, 2 Line bright: Hokusai's duo as two registers);
//                 the transit hour is the music's tempo — busy at rush, sparse
//                 at 2am, silent when the network rests.
//   the breath  → the global ~9 s clock breath swells the pad, so the sheet
//                 itself is audibly alive (world/clock.ts).
//
// Off by default (one ink toggle in the HUD, and browsers block autoplay
// anyway). The hot render path never touches React; this engine is a plain
// singleton and only `useAudioUi` — the toggle's on/off mirror — is React
// state. `audioTick()` is called once per frame by the single driver
// (Trains.tsx) and returns immediately when the engine is asleep, so the
// silent path is free.

import { create } from "zustand";
import { WEATHER } from "../world/weather";
import { TRAINS } from "../trains/store";
import { CLOCK } from "../world/clock";
import { TIER } from "../world/device";

// --- musical material -------------------------------------------------------

// A warm major pentatonic — the koto/woodblock idiom without the cliché, and
// gentle enough to sit under a drone without ever souring. Semitone offsets
// within an octave; the pool below stacks two octaves of them.
const PENTATONIC = [0, 2, 4, 7, 9];
const ROOT_MIDI = 48; // C3 — the pad's fundamental

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// The pluck note pool: two octaves of the pentatonic above the pad. 1 Line
// draws from the lower half (matcha, grounded), 2 Line from the upper (Prussian,
// bright) — the two lines ring as two registers of the same scale.
const PLUCK_POOL: number[] = [];
for (let oct = 0; oct < 2; oct++) {
  for (const step of PENTATONIC) PLUCK_POOL.push(ROOT_MIDI + 24 + oct * 12 + step);
}

// A tiny self-contained PRNG (mulberry32): musical variation that doesn't
// depend on Math.random, seeded once so the piece has its own quiet character.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- engine -----------------------------------------------------------------

// Phones carry a lighter graph: the drone loses its top oscillator, the water
// wash drops its slow filter sweep. It still breathes — just cheaper.
const LIGHT = TIER === "phone";

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private running = false;
  private rng = makeRng(0x50554e44); // "SOUND"

  // Master chain: everything → muffle (weather rolls off the top) → master
  // gain (fades the whole print in and out) → speakers.
  private master!: GainNode;
  private muffle!: BiquadFilterNode;
  private reverbReturn!: GainNode;

  // Drone: a small stack of detuned oscillators through a filter the sun opens.
  private droneOscs: OscillatorNode[] = [];
  private droneGain!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private droneRootMidi = ROOT_MIDI;

  // Water: filtered noise, the seigaiha wash breathing across the middle
  // distance; thins after dark. Rain is its own patter on the paper.
  private waterGain!: GainNode;
  private waterFilter!: BiquadFilterNode;
  private rainGain!: GainNode;

  // Lookahead scheduler for the generative drift (chord moves, the occasional
  // unbidden koto note so a resting network is never dead silence).
  private schedTimer: number | null = null;
  private nextDriftT = 0;
  private nextIdleNoteT = 0;

  // Arrival plucks are rate-limited: the first poll marks half the network
  // "dwelling" at once, and a departure board would be noise. A short global
  // gap plus a warm-up delay thins the burst to a murmur.
  private lastPluckT = 0;
  private startedAt = 0;

  get isRunning() {
    return this.running;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.build(ctx);
    return ctx;
  }

  private build(ctx: AudioContext) {
    // Master fade + the weather muffle sitting just before it.
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = "lowpass";
    this.muffle.frequency.value = 6000;
    this.muffle.Q.value = 0.3;
    this.muffle.connect(this.master);
    this.master.connect(ctx.destination);

    // Reverb: a generated decaying-noise impulse — the paper's room. Fog will
    // lift the wet return; the muffle rolls its top off with everything else.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx, LIGHT ? 1.8 : 2.8);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.5;
    convolver.connect(this.reverbReturn);
    this.reverbReturn.connect(this.muffle);
    // A pre-reverb bus every voice can send to.
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(convolver);

    this.buildDrone(ctx);
    this.buildWater(ctx);

    const now = ctx.currentTime;
    this.nextDriftT = now + 18;
    this.nextIdleNoteT = now + 6;
  }

  private reverbSend!: GainNode;

  // A decaying stereo noise burst — a cheap, warm impulse response. Longer tail
  // on the bigger tiers.
  private makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.6);
        data[i] = (this.rng() * 2 - 1) * decay;
      }
    }
    return buf;
  }

  private buildDrone(ctx: AudioContext) {
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.16;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = 700;
    this.droneFilter.Q.value = 0.6;
    this.droneGain.connect(this.droneFilter);
    this.droneFilter.connect(this.muffle);
    this.droneFilter.connect(this.reverbSend);

    // Root, fifth, octave (+ a high fifth on the bigger tiers): a warm open
    // chord, each voice a hair detuned so the pad shimmers rather than beats.
    const intervals = LIGHT ? [0, 7, 12] : [0, 7, 12, 19];
    const detune = [0, 4, -3, 6];
    const types: OscillatorType[] = ["sine", "sine", "triangle", "sine"];
    intervals.forEach((iv, k) => {
      const osc = ctx.createOscillator();
      osc.type = types[k];
      osc.frequency.value = midiToFreq(this.droneRootMidi + iv);
      osc.detune.value = detune[k];
      const g = ctx.createGain();
      g.gain.value = k === 0 ? 1 : 0.5 / (k + 1);
      osc.connect(g);
      g.connect(this.droneGain);
      osc.start();
      this.droneOscs.push(osc);
    });
  }

  private buildWater(ctx: AudioContext) {
    // A long looping noise buffer, bandpassed into a soft wash. A slow LFO on
    // the band centre is the seigaiha fans breathing (desktop/tablet only).
    const noise = ctx.createBufferSource();
    noise.buffer = this.makeNoise(ctx, 3);
    noise.loop = true;
    this.waterFilter = ctx.createBiquadFilter();
    this.waterFilter.type = "bandpass";
    this.waterFilter.frequency.value = 480;
    this.waterFilter.Q.value = 0.7;
    this.waterGain = ctx.createGain();
    this.waterGain.gain.value = 0.05;
    noise.connect(this.waterFilter);
    this.waterFilter.connect(this.waterGain);
    this.waterGain.connect(this.muffle);
    this.waterGain.connect(this.reverbSend);
    noise.start();

    if (!LIGHT) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07; // one slow breath every ~14 s
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(this.waterFilter.frequency);
      lfo.start();
    }

    // Rain on paper: high, soft patter, gated entirely by real rain.
    const rain = ctx.createBufferSource();
    rain.buffer = this.makeNoise(ctx, 3);
    rain.loop = true;
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = "highpass";
    rainHp.frequency.value = 2400;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rainHp);
    rainHp.connect(this.rainGain);
    this.rainGain.connect(this.muffle);
    rain.start();
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = this.rng() * 2 - 1;
    return buf;
  }

  // --- lifecycle ------------------------------------------------------------

  setEnabled(on: boolean) {
    if (on) this.start();
    else this.stop();
  }

  private start() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    void ctx.resume(); // inside the toggle's click gesture — satisfies autoplay
    this.running = true;
    this.startedAt = ctx.currentTime;
    // A slow swell up: the print fades IN, it never snaps on.
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 1.4);
    if (this.schedTimer == null) {
      this.schedTimer = window.setInterval(() => this.schedule(), 200);
    }
    document.addEventListener("visibilitychange", this.onVisibility);
    useAudioUi.setState({ enabled: true });
  }

  private stop() {
    this.running = false;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.6);
    }
    if (this.schedTimer != null) {
      window.clearInterval(this.schedTimer);
      this.schedTimer = null;
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
    useAudioUi.setState({ enabled: false });
  }

  // A hidden tab is silent — the render loop pauses too, so nothing drifts.
  private onVisibility = () => {
    if (!this.ctx || !this.running) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  // --- per-frame ------------------------------------------------------------

  // Called by the single driver (Trains.tsx) with the frame's sun phase. Free
  // when the engine is asleep. All moves are setTargetAtTime glides so a fast
  // weather ease or a sunset never zips a filter.
  tick(phase: number) {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    const w = WEATHER;

    // Day opens the pad toward air; night pulls it down to a lantern hum.
    const droneCut = 380 + phase * 1200;
    this.droneFilter.frequency.setTargetAtTime(droneCut, now, 0.5);
    // The breath swells the pad — the sheet is audibly alive.
    const droneLvl = 0.14 + 0.03 * CLOCK.breath;
    this.droneGain.gain.setTargetAtTime(droneLvl, now, 0.4);

    // Water is a daytime signature (gold-thread by lantern light after dark):
    // present by day, thinned at night, and it swells a touch in the wet.
    const waterLvl = (0.03 + 0.045 * phase) * (1 + 0.4 * w.rain);
    this.waterGain.gain.setTargetAtTime(waterLvl, now, 0.7);

    // Real rain patters; nothing invented (WEATHER only moves on a real fetch).
    this.rainGain.gain.setTargetAtTime(0.06 * w.rain, now, 0.8);

    // Fog lengthens the room (more wet return) and, with rain/snow/overcast,
    // rolls the top end off — weather you can hear muffling the paper.
    this.reverbReturn.gain.setTargetAtTime(0.45 + 0.5 * w.fog, now, 0.9);
    const muffleCut = 6500 - 3600 * w.fog - 2400 * w.rain - 3000 * w.snow - 1200 * w.overcast;
    this.muffle.frequency.setTargetAtTime(Math.max(1400, muffleCut), now, 0.9);
  }

  // A dwell rising edge (Stations.tsx): strike a koto pluck, pitched by line.
  arrival(lineId: string) {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.startedAt < 1.6) return; // let the pad settle before the first note
    if (now - this.lastPluckT < 0.32) return; // thin the first-poll burst
    // A little chance-gate so a cluster of near-simultaneous arrivals reads as
    // a few scattered notes, not a chord stack.
    if (this.rng() > 0.7) return;
    this.lastPluckT = now;
    // 1 Line draws low, everything else bright — the duet as two registers.
    const low = lineId === "100479" || /1/.test(lineId);
    const half = PLUCK_POOL.length / 2;
    const idx = low
      ? Math.floor(this.rng() * half)
      : half + Math.floor(this.rng() * half);
    this.pluck(midiToFreq(PLUCK_POOL[idx]), 0.14);
  }

  // A single struck note: fundamental + a couple of decaying partials with a
  // fast attack and a long-ish tail, sent through the room. A faint inharmonic
  // partial gives it the metal of a struck kane bell rather than a pure pluck.
  private pluck(freq: number, level: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.muffle);
    out.connect(this.reverbSend);

    const partials: [number, number, OscillatorType][] = [
      [1, 1, "sine"],
      [2.01, 0.4, "sine"],
      [2.76, 0.18, "triangle"], // inharmonic — a hint of struck metal
    ];
    for (const [mult, amp, type] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = 0;
      const peak = level * amp;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.006); // struck attack
      g.gain.setTargetAtTime(0, now + 0.006, 0.9 / mult); // higher partials die first
      osc.connect(g);
      g.connect(out);
      osc.start(now);
      osc.stop(now + 4);
    }
    // Free the summing node once the tail is gone.
    out.gain.setValueAtTime(1, now);
    setTimeout(() => out.disconnect(), 4200);
  }

  // --- generative drift (lookahead) ----------------------------------------

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.running || ctx.state !== "running") return;
    const now = ctx.currentTime;

    // Every ~20-34 s the pad drifts by a pentatonic step — slow, generative
    // movement so the drone is never a held dead chord.
    if (now >= this.nextDriftT) {
      // Nudge the root a pentatonic step, kept within a small warm band around
      // C3 so the pad wanders without ever climbing off into a new key.
      const dir = this.rng() < 0.5 ? -1 : 1;
      const step = PENTATONIC[1 + Math.floor(this.rng() * (PENTATONIC.length - 1))];
      const target = this.droneRootMidi + dir * step;
      this.droneRootMidi = Math.max(ROOT_MIDI - 3, Math.min(ROOT_MIDI + 5, target));
      const intervals = LIGHT ? [0, 7, 12] : [0, 7, 12, 19];
      this.droneOscs.forEach((osc, k) => {
        osc.frequency.setTargetAtTime(midiToFreq(this.droneRootMidi + intervals[k]), now, 3.5);
      });
      this.nextDriftT = now + 20 + this.rng() * 14;
    }

    // When the tracks are quiet, let an occasional unbidden koto note fall — a
    // resting network still murmurs. Sparse, and only when few trains run so it
    // never fights the arrival plucks.
    if (now >= this.nextIdleNoteT) {
      if (TRAINS.size < 3 && this.rng() < 0.6) {
        const idx = Math.floor(this.rng() * PLUCK_POOL.length);
        this.pluck(midiToFreq(PLUCK_POOL[idx]), 0.08);
      }
      this.nextIdleNoteT = now + 8 + this.rng() * 10;
    }
  }
}

const engine = new AmbientEngine();

// --- public surface ---------------------------------------------------------

interface AudioUi {
  enabled: boolean;
  toggle: () => void;
}

export const useAudioUi = create<AudioUi>((set, get) => ({
  enabled: false,
  toggle: () => engine.setEnabled(!get().enabled),
}));

/** Per-frame update from the single driver (Trains.tsx). No-op when asleep. */
export function audioTick(phase: number) {
  engine.tick(phase);
}

/** A train arrival (dwell rising edge) — Stations.tsx. No-op when asleep. */
export function audioArrival(lineId: string) {
  engine.arrival(lineId);
}

/** Force the engine on/off (the __linkMap dev handle). */
export function setAudioEnabled(on: boolean) {
  engine.setEnabled(on);
}
