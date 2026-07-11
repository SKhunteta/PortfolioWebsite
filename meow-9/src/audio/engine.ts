import { AUDIO } from "../world/config";

// The station's soundscape — synthesized entirely with the Web Audio API
// (no external assets, like everything else on Meow-9):
//   • hum    — looped brown noise through a lowpass + two detuned low sines
//              whose slow beat is the spin motors working. Rides the dial:
//              loud at 1g, near-silent in the drift.
//   • purr   — triangle fundamental + bandpass noise, both amplitude-
//              modulated ~23 Hz (the classic purr flutter). Pooled.
//   • thump  — a lowpass noise burst for touchdown paws. Rate-limited so a
//              whole roster re-landing doesn't become a drum roll.
//   • whoosh — bandpass noise that swells with |dg/dt| as the dial scrubs.
//
// The AudioContext is created lazily and ONLY from user-gesture handlers
// (autoplay policy). Every exported call no-ops until unlocked, so call
// sites never need to check.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let humGain: GainNode | null = null;
let whooshGain: GainNode | null = null;
let muted = false;

/** Loopable noise buffer. `brown` integrates the samples for a deep rumble. */
function makeNoiseBuffer(c: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

function startLoop(c: AudioContext, buf: AudioBuffer, filter: BiquadFilterNode, out: GainNode) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(filter);
  filter.connect(out);
  src.start();
}

function buildVoices(c: AudioContext, out: GainNode) {
  // Station hum: brown noise floor + the spin-motor fundamental. Two sines a
  // couple of hertz apart give a slow, live beat-frequency throb.
  humGain = c.createGain();
  humGain.gain.value = 0;
  humGain.connect(out);
  const humLP = c.createBiquadFilter();
  humLP.type = "lowpass";
  humLP.frequency.value = 120;
  startLoop(c, makeNoiseBuffer(c, 2.5, true), humLP, humGain);
  for (const [freq, level] of [
    [55, 0.5],
    [57.3, 0.22],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const og = c.createGain();
    og.gain.value = level;
    osc.connect(og);
    og.connect(humGain);
    osc.start();
  }

  // Gravity whoosh: air rushing while the dial moves.
  whooshGain = c.createGain();
  whooshGain.gain.value = 0;
  whooshGain.connect(out);
  const whooshBP = c.createBiquadFilter();
  whooshBP.type = "bandpass";
  whooshBP.frequency.value = 620;
  whooshBP.Q.value = 0.8;
  startLoop(c, makeNoiseBuffer(c, 2, false), whooshBP, whooshGain);
}

/** Create (or resume) the AudioContext. Call ONLY from a user gesture. */
export function unlockAudio(): void {
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : AUDIO.master;
    master.connect(ctx.destination);
    buildVoices(ctx, master);
    // iOS pauses the context when the tab backgrounds; also save battery.
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }
  // iOS can leave a gesture-created context suspended — resume is idempotent.
  if (ctx.state !== "running") void ctx.resume();
}

export function audioReady(): boolean {
  return !!ctx && ctx.state === "running";
}

/** Mute ramps the master bus (no clicks) but keeps the graph warm. */
export function setMuted(m: boolean): void {
  muted = m;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(m ? 0 : AUDIO.master, ctx.currentTime, 0.06);
}

/** Hum rides the dial: the spin motors work at 1g, the drift is hushed. */
export function setHumLevel(g: number): void {
  if (!ctx || !humGain) return;
  const level = AUDIO.humFloor + (AUDIO.hum - AUDIO.humFloor) * g;
  humGain.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
}

/** Whoosh follows how fast the dial is moving (|dg/dt|). */
export function setWhoosh(rate: number): void {
  if (!ctx || !whooshGain) return;
  const level = Math.min(1, rate * 2.2) * AUDIO.whoosh;
  whooshGain.gain.setTargetAtTime(level, ctx.currentTime, 0.12);
}

// --- Purr pool -------------------------------------------------------------

interface PurrVoice {
  amp: GainNode;
  stopAt: number;
  ends: number;
}
const purrs: PurrVoice[] = [];

/** A contented purr for `durationSec`; re-calling extends an active voice. */
export function purr(durationSec: number): void {
  if (!ctx || !master || muted) return;
  const now = ctx.currentTime;
  // Extend a live voice instead of stacking a new one.
  for (const v of purrs) {
    if (v.ends > now) {
      v.ends = now + durationSec;
      v.amp.gain.cancelScheduledValues(now);
      v.amp.gain.setTargetAtTime(AUDIO.purr, now, 0.15);
      v.amp.gain.setTargetAtTime(0, v.ends - 0.5, 0.22);
      return;
    }
  }
  if (purrs.filter((v) => v.ends > now).length >= 2) return; // pool cap
  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(master);
  // The flutter: everything through one LFO-driven gain at purr rate.
  const flutter = ctx.createGain();
  flutter.gain.value = 0.55;
  flutter.connect(amp);
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 23;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.45;
  lfo.connect(lfoDepth);
  lfoDepth.connect(flutter.gain);
  // Fundamental + a breathy band of noise.
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 70;
  const oscG = ctx.createGain();
  oscG.gain.value = 0.6;
  osc.connect(oscG);
  oscG.connect(flutter);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 240;
  bp.Q.value = 0.9;
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 1.2, false);
  noise.loop = true;
  const noiseG = ctx.createGain();
  noiseG.gain.value = 0.28;
  noise.connect(bp);
  bp.connect(noiseG);
  noiseG.connect(flutter);

  const ends = now + durationSec;
  const stopAt = ends + 1.5;
  amp.gain.setTargetAtTime(AUDIO.purr, now, 0.3); // settle in
  amp.gain.setTargetAtTime(0, ends - 0.5, 0.22); // release
  osc.start(now);
  lfo.start(now);
  noise.start(now);
  osc.stop(stopAt);
  lfo.stop(stopAt);
  noise.stop(stopAt);
  const voice: PurrVoice = { amp, stopAt, ends };
  purrs.push(voice);
  osc.onended = () => {
    amp.disconnect();
    const i = purrs.indexOf(voice);
    if (i >= 0) purrs.splice(i, 1);
  };
}

// --- Thumps ------------------------------------------------------------------

// When the breathe crosses the landing band the whole roster touches down in
// a burst — keep the first few and drop the rest of the drum roll.
let thumpTimes: number[] = [];

/** A soft paw-touchdown thud. `strength` in [0, 1]. */
export function thump(strength: number): void {
  if (!ctx || !master || muted) return;
  const now = ctx.currentTime;
  thumpTimes = thumpTimes.filter((t) => now - t < 0.3);
  if (thumpTimes.length >= 6) return;
  thumpTimes.push(now);

  const burst = ctx.createBufferSource();
  burst.buffer = makeNoiseBuffer(ctx, 0.09, true);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  const amp = ctx.createGain();
  const peak = AUDIO.thump * Math.min(1, Math.max(0.1, strength));
  amp.gain.setValueAtTime(peak, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  burst.connect(lp);
  lp.connect(amp);
  amp.connect(master);
  burst.start(now);
  burst.stop(now + 0.18);
  burst.onended = () => amp.disconnect();
}
