// audio: the soundtrack, composed and mixed offline for each video.
// A music bed in the style's genre, in tempo, warm and low (played instruments, not beeps); soft designed
// sound effects pitched to the same key, only on the moments that matter; one stereo mix, −16 LUFS.
// Pure JS synthesis (no samples), seeded so a rebuild sounds identical. ffmpeg measures loudness.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const SR = 48000;
const TAU = Math.PI * 2;

// ---------- small DSP kit ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const dbToGain = (db) => Math.pow(10, db / 20);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

class Bus {
  constructor(sec) { this.n = Math.ceil(sec * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  // mix a mono or stereo voice in at time `at` (seconds), equal-power pan −1…1
  add(v, at, gain = 1, pan = 0) {
    const i0 = Math.round(at * SR);
    const pl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, pr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    const vl = v.L || v, vr = v.R || v;
    for (let i = 0; i < vl.length; i++) {
      const j = i0 + i;
      if (j < 0) continue;
      if (j >= this.n) break;
      this.L[j] += vl[i] * gain * pl;
      this.R[j] += vr[i] * gain * pr;
    }
  }
  mixFrom(b, gain = 1) { for (let i = 0; i < this.n && i < b.n; i++) { this.L[i] += b.L[i] * gain; this.R[i] += b.R[i] * gain; } }
}

// RBJ biquad
function coef(type, f, q = 0.707, db = 0) {
  const w = TAU * clamp(f, 10, SR / 2.2) / SR, cs = Math.cos(w), sn = Math.sin(w), a = sn / (2 * q), A = Math.pow(10, db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + a; a1 = -2 * cs; a2 = 1 - a; }
  else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + a; a1 = -2 * cs; a2 = 1 - a; }
  else if (type === "bp") { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * cs; a2 = 1 - a; }
  else if (type === "peak") { b0 = 1 + a * A; b1 = -2 * cs; b2 = 1 - a * A; a0 = 1 + a / A; a1 = -2 * cs; a2 = 1 - a / A; }
  else if (type === "lowshelf" || type === "highshelf") {
    const s = Math.sqrt(A) * 2 * a, sg = type === "lowshelf" ? 1 : -1;
    b0 = A * ((A + 1) - sg * (A - 1) * cs + s); b1 = 2 * sg * A * ((A - 1) - sg * (A + 1) * cs); b2 = A * ((A + 1) - sg * (A - 1) * cs - s);
    a0 = (A + 1) + sg * (A - 1) * cs + s; a1 = -2 * sg * ((A - 1) + sg * (A + 1) * cs); a2 = (A + 1) + sg * (A - 1) * cs - s;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function biquad(type, f, q = 0.707, db = 0) {
  let c = coef(type, f, q, db);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f1 = (x) => { const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  f1.set = (nf, nq = q) => { c = coef(type, nf, nq, db); };
  return f1;
}
const filt = (buf, ...fs) => { for (const f of fs) for (let i = 0; i < buf.length; i++) buf[i] = f(buf[i]); return buf; };

// band-limited saw / square (polyBLEP)
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function osc(kind, freq, sec, opts = {}) {
  const n = Math.ceil(sec * SR), out = new Float32Array(n);
  let ph = opts.phase || 0;
  const vib = opts.vib || 0, vibF = opts.vibF || 5;
  for (let i = 0; i < n; i++) {
    const f = freq * (1 + vib * Math.sin(TAU * vibF * i / SR)) * (opts.glide ? Math.pow(opts.glide, i / n) : 1);
    const dt = f / SR;
    let v;
    if (kind === "sine") v = Math.sin(TAU * ph);
    else if (kind === "tri") v = 1 - 4 * Math.abs(Math.round(ph - 0.25) - (ph - 0.25));
    else if (kind === "saw") v = 2 * ph - 1 - blep(ph, dt);
    else { v = ph < 0.5 ? 1 : -1; v += blep(ph, dt); v -= blep((ph + 0.5) % 1, dt); }
    out[i] = v;
    ph += dt; if (ph >= 1) ph -= 1;
  }
  return out;
}
// attack / decay / sustain / release envelope over `sec`
function adsr(sec, a, d, s, r) {
  const n = Math.ceil(sec * SR), out = new Float32Array(n);
  const A = a * SR, D = d * SR, R = r * SR, hold = n - R;
  for (let i = 0; i < n; i++) {
    let v = i < A ? i / A : i < A + D ? 1 - (1 - s) * ((i - A) / D) : s;
    if (i > hold) v *= Math.max(0, 1 - (i - hold) / R);
    out[i] = v;
  }
  return out;
}
const mul = (a, b) => { for (let i = 0; i < a.length; i++) a[i] *= b[i] ?? 0; return a; };
const scale = (a, g) => { for (let i = 0; i < a.length; i++) a[i] *= g; return a; };
function expDecay(sec, tau) { const n = Math.ceil(sec * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.exp(-i / (tau * SR)); return o; }
function noise(sec, r, pink = false) {
  const n = Math.ceil(sec * SR), o = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    if (!pink) { o[i] = w; continue; }
    b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
    o[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return o;
}

// Freeverb (Jezar), stereo, tuned for 48 kHz
function reverb(bus, { room = 0.82, damp = 0.35, wet = 1 } = {}) {
  const k = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * k));
  const apT = [556, 441, 341, 225].map((x) => Math.round(x * k));
  const out = new Bus(bus.n / SR);
  for (const [src, dst, spread] of [[bus.L, out.L, 0], [bus.R, out.R, Math.round(23 * k)]]) {
    const combs = combT.map((t) => ({ b: new Float32Array(t + spread), i: 0, f: 0 }));
    const aps = apT.map((t) => ({ b: new Float32Array(t + spread), i: 0 }));
    for (let n = 0; n < bus.n; n++) {
      const x = src[n] * 0.015;
      let y = 0;
      for (const c of combs) {
        const o = c.b[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.b[c.i] = x + c.f * room;
        c.i = (c.i + 1) % c.b.length;
        y += o;
      }
      for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = v; }
      dst[n] = y * wet;
    }
  }
  return out;
}
// ping-pong delay
function delay(bus, time, fb = 0.35, lp = 4500) {
  const d = Math.round(time * SR), out = new Bus(bus.n / SR);
  const bl = new Float32Array(d), br = new Float32Array(d);
  const fl = biquad("lp", lp), fr = biquad("lp", lp);
  for (let i = 0, j = 0; i < bus.n; i++, j = (j + 1) % d) {
    const ol = bl[j], or = br[j];
    bl[j] = fl(bus.L[i] + or * fb); br[j] = fr(bus.R[i] * 0.4 + ol * fb);
    out.L[i] = ol; out.R[i] = or;
  }
  return out;
}

// ---------- instruments ----------
// Voiced to sound played, not like a ringtone: electric piano, felt plucks, warm pads, a round sub and
// soft drums, all in the low and middle register. Nothing melodic sits above about B4, no bare sine or
// square plays up high, and every source is low-passed before it reaches the mix.
const human = (r, amt = 0.1) => 1 - amt / 2 + r() * amt;
let rngHam = rng(3); // the electric piano's hammer noise (re-seeded per soundtrack)

// round kick: a short sweep down to the fundamental, a felt click, a little saturation
function kick(r, { pitch = 50, dec = 0.36, punch = 1 } = {}) {
  const sec = dec + 0.12, n = Math.ceil(sec * SR), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += pitch * (1 + 1.1 * punch * Math.exp(-t / 0.035)) / SR;
    o[i] = Math.sin(TAU * ph) * Math.exp(-t / (dec * 0.45)) * Math.min(1, i / 48);
  }
  const click = filt(mul(noise(0.01, r), expDecay(0.01, 0.002)), biquad("lp", 1400));
  for (let i = 0; i < click.length; i++) o[i] += click[i] * 0.18 * punch;
  for (let i = 0; i < n; i++) o[i] = Math.tanh(o[i] * 1.3) / Math.tanh(1.3);
  return o;
}
// a soft, dusty snare: a short tuned body and a band of noise with the top rolled off
function snare(r, { tone = 190, dec = 0.14, top = 7000 } = {}) {
  const sec = dec * 3, n = Math.ceil(sec * SR), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += tone * (1 + 0.25 * Math.exp(-t / 0.01)) / SR; o[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.045) * 0.7; }
  const nz = filt(mul(noise(sec, r, true), expDecay(sec, dec * 0.6)), biquad("bp", 1700, 0.6), biquad("lp", top), biquad("hp", 300));
  for (let i = 0; i < n; i++) o[i] = (o[i] + nz[i] * 3.2) * Math.min(1, i / 72);
  return o;
}
// brush: a slow-onset sweep of noise, no crack
function brush(r) {
  const sec = 0.28, n = Math.ceil(sec * SR);
  const o = filt(noise(sec, r, true), biquad("bp", 2200, 0.5), biquad("lp", 7000), biquad("hp", 450));
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] *= Math.min(1, t / 0.018) * Math.exp(-t / 0.09) * 2.4; }
  return o;
}
// a closed hat with the fizz taken off (nothing above ~9 kHz)
function hat(r) {
  const sec = 0.07, n = Math.ceil(sec * SR);
  const o = filt(noise(sec, r), biquad("hp", 5600, 0.7), biquad("lp", 11000));
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] *= Math.min(1, i / 96) * Math.exp(-t / 0.018); }
  return o;
}
// shaker: a short grain of high noise with a soft onset (the light percussion of a calm bed)
function shaker(r) {
  const sec = 0.09, n = Math.ceil(sec * SR);
  const o = filt(noise(sec, r), biquad("bp", 4200, 1.1), biquad("lp", 9000));
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] *= Math.min(1, t / 0.008) * Math.exp(-t / 0.03) * 1.6; }
  return o;
}
// vinyl: sparse soft crackle and a little low hiss (the lofi bed's air)
function vinyl(sec, r) {
  const n = Math.ceil(sec * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) if (r() < 0.00035) { const a = (r() * 0.6 + 0.2) * (r() < 0.5 ? -1 : 1); for (let k = 0; k < 30 && i + k < n; k++) o[i + k] += a * Math.exp(-k / 6); }
  const h = noise(sec, r, true);
  for (let i = 0; i < n; i++) o[i] += h[i] * 0.05;
  return filt(o, biquad("lp", 3200), biquad("hp", 250));
}
// sub bass: a sine with a touch of its own second harmonic, so it still reads on a phone speaker
function bass(note, sec, { a = 0.006, r = 0.08, drive = 1.3, tone = 0.18 } = {}) {
  const f = mtof(note), n = Math.ceil(sec * SR), o = new Float32Array(n), env = adsr(sec, a, 0.18, 0.75, r);
  for (let i = 0; i < n; i++) { const t = i / SR; const x = Math.sin(TAU * f * t) + tone * Math.sin(TAU * 2 * f * t + 0.6); o[i] = Math.tanh(x * drive) / Math.tanh(drive) * env[i]; }
  return filt(o, biquad("lp", 520));
}
// electric piano (FM, Rhodes-like): a 1:1 pair for the body and the bark of a harder hit, the tine
// short and quiet, rounder the softer it's played; low notes ring longer
function ep(note, sec, vel = 0.6) {
  const f = mtof(note), n = Math.ceil(sec * SR), o = new Float32Array(n);
  const ham = filt(mul(noise(0.03, rngHam), expDecay(0.03, 0.006)), biquad("bp", 2600, 0.7));
  for (let i = 0; i < ham.length; i++) ham[i] *= 1.6 * vel;
  const idx = 0.5 + 1.7 * vel, tau = 0.7 + 1.8 * Math.exp(-(note - 48) / 16), rel = Math.min(n, Math.round(0.09 * SR));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const I = idx * Math.exp(-t / 0.25) + 0.15;
    const body = Math.sin(TAU * f * t + I * Math.sin(TAU * f * t));
    const tine = Math.sin(TAU * f * 4 * t) * Math.exp(-t / 0.025) * 0.12 * vel + (ham[i] || 0);
    let e = Math.min(1, i / (0.003 * SR)) * Math.exp(-t / tau);
    if (i > n - rel) e *= (n - i) / rel;
    o[i] = (body + tine) * e * (0.55 + 0.45 * vel);
  }
  return filt(o, biquad("lp", 2200 + 3000 * vel, 0.6), biquad("hp", 70));
}
// a chord on the electric piano: slightly rolled, with a slow stereo tremolo
function epChord(notes, sec, vel, r, { roll = 0.012, trem = 0.18 } = {}) {
  const n = Math.ceil((sec + roll * notes.length) * SR), L = new Float32Array(n), R = new Float32Array(n);
  notes.forEach((m, k) => {
    const v = ep(m, sec, vel * human(r, 0.16)), off = Math.round(k * roll * SR * human(r, 0.6));
    for (let i = 0; i < v.length && i + off < n; i++) { L[i + off] += v[i] / notes.length * 1.8; R[i + off] += v[i] / notes.length * 1.8; }
  });
  const ph = r() * TAU;
  for (let i = 0; i < n; i++) { const p = trem * Math.sin(TAU * 4.6 * i / SR + ph); L[i] *= 1 - p; R[i] *= 1 + p; }
  return { L, R };
}
// felt pluck (Karplus–Strong, dark): muted guitar, kalimba or felt piano, with a warm body under it
function pluck(note, sec, r, { bright = 0.25, decay = 0.995 } = {}) {
  const f = mtof(note), p = Math.max(2, Math.round(SR / f)), n = Math.ceil(sec * SR), o = new Float32Array(n);
  const buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = r() * 2 - 1;
  const pre = biquad("lp", 500 + bright * 3000);
  for (let k = 0; k < 2; k++) for (let i = 0; i < p; i++) buf[i] = pre(buf[i]);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const j = i % p, v = buf[j];
    buf[j] = (v + last) * 0.5 * decay;
    last = v; o[i] = v;
  }
  for (let i = 0; i < n; i++) o[i] += Math.sin(TAU * f * i / SR) * Math.exp(-i / SR / 0.25) * 0.25;
  return filt(mul(o, adsr(sec, 0.003, 0.05, 1, 0.1)), biquad("hp", 90), biquad("lp", 5200));
}
// a strummed chord on the felt pluck (the guitar's ending)
function strum(notes, sec, r, o = {}) {
  const n = Math.ceil((sec + 0.2) * SR), out = new Float32Array(n);
  notes.forEach((m, k) => { const s = pluck(m, sec, r, o), off = Math.round(k * 0.028 * SR); for (let i = 0; i < s.length && i + off < n; i++) out[i + off] += s[i] * 0.55; });
  return out;
}
// a warm pad: detuned saws through a steep low-pass, a sine an octave under, slow in and out, stereo
function pad(notes, sec, r, { cutoff = 2600, attack = 0.8, release = 1.4, detune = 0.07 } = {}) {
  const n = Math.ceil(sec * SR), L = new Float32Array(n), R = new Float32Array(n);
  for (const m of notes) {
    for (let k = 0; k < 4; k++) {
      const v = osc("saw", mtof(m + (k - 1.5) * detune / 1.5), sec, { phase: r() });
      const dst = k % 2 ? R : L;
      for (let i = 0; i < n; i++) dst[i] += v[i] * 0.16;
    }
  }
  const lo = osc("sine", mtof(notes[0] - 12), sec);
  const env = adsr(sec, attack, 0.5, 0.85, release);
  const f = [biquad("lp", cutoff, 0.55), biquad("lp", cutoff, 0.55), biquad("lp", cutoff * 1.1, 0.55), biquad("lp", cutoff * 1.1, 0.55)], h = [biquad("hp", 110), biquad("hp", 110)];
  const g = 2.2 / notes.length;
  const air = filt(noise(sec, r, true), biquad("bp", 3800, 0.6), biquad("lp", 9000));
  for (let i = 0; i < n; i++) { L[i] = (h[0](f[2](f[0](L[i]))) * g + lo[i] * 0.12 + air[i] * 0.1) * env[i]; R[i] = (h[1](f[3](f[1](R[i]))) * g + lo[i] * 0.12 - air[i] * 0.1) * env[i]; }
  return { L, R };
}
// a soft, low synth note (Terminal's arpeggio): a triangle through a low filter
function softSynth(note, sec, cut = 1800) {
  const o = osc("saw", mtof(note), sec), f = biquad("lp", cut, 0.7);
  for (let i = 0; i < o.length; i++) { const t = i / SR; o[i] = f(o[i]) * Math.min(1, i / 120) * Math.exp(-t / (sec * 0.6)); }
  return o;
}

// ---------- designed effects ----------
// Soft and low, like the music: air moving, a felt tap, a deep thump. Nothing sharp, nothing up high.
// Every effect's hit is at its start (t = 0) unless it says so (the riser: its end).
function fxWhoosh(r, { dur = 0.55, from = 160, to = 1400, level = 1 } = {}) {
  const n = Math.ceil(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  const src = noise(dur, r, true), bl = biquad("bp", from, 0.9), br = biquad("bp", from, 0.9), ll = biquad("lp", 4500), lr = biquad("lp", 4500);
  for (let i = 0; i < n; i++) {
    const k = i / n, f = from * Math.pow(to / from, Math.sin(k * Math.PI / 2));
    if (i % 32 === 0) { bl.set(f, 0.9); br.set(f * 1.05, 0.9); }
    const env = Math.pow(Math.sin(Math.PI * Math.pow(k, 0.75)), 2) * level;
    const pan = (k - 0.5) * 0.7;
    L[i] = ll(bl(src[i])) * env * (1 - pan) * 2.4; R[i] = lr(br(src[i])) * env * (1 + pan) * 2.4;
  }
  return { L, R, peak: dur * 0.55 };
}
function fxThump(r, note) { const o = filt(kick(r, { pitch: mtof(note - 24), punch: 0.5, dec: 0.3 }), biquad("lp", 900)); return { L: o, R: o, peak: 0.01 }; }
// a felt tap: a wooden, marimba-like note in the middle register (never a high beep)
function fxTap(note, soft = false) {
  const f = mtof(note), sec = 0.45, n = Math.ceil(sec * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t / (soft ? 0.12 : 0.16)) + 0.18 * Math.sin(TAU * f * 3.9 * t) * Math.exp(-t / 0.02)) * Math.min(1, i / 60); }
  const out = filt(o, biquad("lp", 2200), biquad("hp", 120));
  return { L: out, R: out, peak: 0.003 };
}
function fxKey(r) {
  const o = filt(mul(noise(0.035, r), adsr(0.035, 0.002, 0.01, 0.2, 0.02)), biquad("bp", 900 + r() * 500, 1.2), biquad("lp", 2500));
  return { L: scale(o, 0.9), R: o, peak: 0.003 };
}
function fxImpact(r, note) {
  const sec = 2.4, n = Math.ceil(sec * SR), L = new Float32Array(n), R = new Float32Array(n);
  const boom = filt(kick(r, { pitch: mtof(note - 24) * 0.9, punch: 0.4, dec: 1.4 }), biquad("lp", 700));
  const air = filt(mul(noise(1.3, r, true), expDecay(1.3, 0.3)), biquad("lp", 1100), biquad("hp", 90));
  for (let i = 0; i < n; i++) { const b = boom[i] || 0, a = air[i] || 0; L[i] = b * 0.9 + a * 0.45; R[i] = b * 0.9 + a * 0.4; }
  return { L, R, peak: 0.01 };
}
// a low, dark swell that grows into its end (a hiss climbing to the sky is what sounds cheap)
function fxRiser(r, sec = 1.4) {
  const n = Math.ceil(sec * SR), L = new Float32Array(n), R = new Float32Array(n);
  const src = noise(sec, r, true), bl = biquad("bp", 140, 0.8), br = biquad("bp", 140, 0.8), ll = biquad("lp", 2200), lr = biquad("lp", 2200);
  const fo = Math.round(0.04 * SR);
  for (let i = 0; i < n; i++) {
    const k = i / n, f = 140 * Math.pow(1600 / 140, k * k);
    if (i % 32 === 0) { bl.set(f, 0.8); br.set(f * 1.04, 0.8); }
    const env = Math.pow(k, 2.2) * (i > n - fo ? (n - i) / fo : 1) * 2.6;
    L[i] = ll(bl(src[i])) * env; R[i] = lr(br(src[i])) * env;
  }
  return { L, R, peak: sec };
}

// the old library names map onto designed sounds (styles keep their vocabulary)
const KIND = {
  whoosh: "whoosh", "whoosh-up": "whoosh", "whoosh-down": "whoosh", "whoosh-long": "whoosh", "whoosh-short": "swish", swish: "swish", swipe: "swish", "panel-in": "swish", "panel-out": "swish", "card-slide": "swish", "card-slide-2": "swish", "card-fan": "swish", "card-shuffle": "swish",
  punch: "thump", land: "thump", "land-light": "thump", drop: "thump", "impact-bass-1": "impact", "impact-bass-2": "impact", "sub-drop": "impact", bong: "impact", bell: "bell", chime: "bell", glass: "bell", sparkle: "bell",
  tick: "blip", "tick-2": "blip", select: "blip", toggle: "blip", switch: "blip", confirm: "blip", "click-ui": "blip", "click-release": "blip", "click-soft": "blip", click: "blip", tap: "blip", pluck: "blip", pop: "blip", "two-tone": "blip", "tone-up": "blip", "tone-down": "blip", open: "blip", "card-place": "blip", "card-place-2": "blip", "chips-stack": "blip", ping: "blip", notification: "blip",
  "key-press": "key", typing: "key", scroll: "key", "glitch-ui": "key", glitch: "key", scratch: "swish", "error-soft": "blip",
  "riser-air": "riser", riser: "riser",
  thump: "thump", impact: "impact", blip: "blip", key: "key",
};

// ---------- the music presets ----------
// key = MIDI root; prog = chords as scale degrees in the key, one per bar; ext = chord size (4 = sevenths,
// 5 = ninths). Chords are voiced in the middle register with the root left to the bass.
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const chord = (root, scale, deg, size = 4) => Array.from({ length: size }, (_, k) => { const s = deg + k * 2; return root + scale[s % 7] + 12 * Math.floor(s / 7); });
const bassNote = (root, scale, deg) => { let m = root + scale[deg % 7]; while (m > 45) m -= 12; while (m < 33) m += 12; return m; };
// rootless close voicing that tops out by B4, as near as it can to the last chord's lowest note
function voicing(root, scale, deg, size, prev) {
  const tones = chord(root, scale, deg, size).map((m) => ((m % 12) + 12) % 12);
  const pcs = size >= 4 ? tones.slice(1) : tones;
  const want = prev ? (prev[0] + 56) / 2 : 56; // led by the last chord, pulled back toward the middle
  let best = null;
  for (let lo = 51; lo <= 64; lo++) {
    if (lo % 12 !== pcs[0]) continue;
    const v = [lo];
    for (const pc of pcs.slice(1)) { let m = v[v.length - 1] + 1; while (m % 12 !== pc) m++; v.push(m); }
    const score = Math.abs(lo - want) + (v[v.length - 1] > 71 ? 100 : 0);
    if (!best || score < best.score) best = { v, score };
  }
  return best.v;
}
export const _voicing = voicing;
export const PRESETS = {
  kinetic: { bpm: 118, root: 57, scale: MIN, prog: [0, 5, 2, 6], ext: 5, parts: ["kick4", "snare", "hatOff", "bassHouse", "epStab", "pad"], swing: 0, verb: 0.2, duck: 0.6 },
  keynote: { bpm: 100, root: 60, scale: MAJ, prog: [0, 5, 3, 4], ext: 4, parts: ["kickHalf", "shaker16", "epPulse", "epHold", "pad", "bassLong"], swing: 0, verb: 0.3, duck: 0.85 },
  aura: { bpm: 78, root: 63, scale: MAJ, prog: [0, 3, 5, 4], ext: 5, parts: ["pad", "epArp", "bassSwell"], swing: 0, verb: 0.45, duck: 1 },
  paper: { bpm: 104, root: 65, scale: MAJ, prog: [0, 4, 5, 3], ext: 4, parts: ["kickSoft", "brush", "hat8", "pluck8", "bassBounce"], swing: 0.14, verb: 0.22, duck: 0.85 },
  terminal: { bpm: 112, root: 62, scale: MIN, prog: [0, 5, 6, 0], ext: 4, parts: ["kick4", "hat16", "bass8", "synthArp", "pad"], swing: 0, verb: 0.2, duck: 0.65, low: 0.7, drums: 0.85 },
  data: { bpm: 86, root: 67, scale: MAJ, prog: [1, 4, 0, 5], ext: 5, parts: ["kickBoom", "snareBoom", "hat8", "epHold", "bassBoom", "vinyl"], swing: 0.18, verb: 0.25, duck: 0.85 },
  story: { bpm: 96, root: 62, scale: MAJ, prog: [0, 4, 5, 3], ext: 4, parts: ["kickSoft", "brush", "shaker8", "guitar8", "epHold", "bassLong"], swing: 0.08, verb: 0.3, duck: 0.9 },
  // Shorts Animator's moods: beds for a voice to sit on, no drums in the quiet ones
  tender: { bpm: 70, root: 60, scale: MAJ, prog: [0, 5, 3, 4], ext: 5, parts: ["pad", "epArp", "bassSwell"], swing: 0, verb: 0.5, duck: 1 },
  hopeful: { bpm: 84, root: 62, scale: MAJ, prog: [0, 4, 5, 3], ext: 4, parts: ["pad", "guitar8", "bassLong"], swing: 0.06, verb: 0.38, duck: 1 },
  night: { bpm: 64, root: 57, scale: MIN, prog: [0, 5, 3, 6], ext: 5, parts: ["pad", "epHold", "bassSwell"], swing: 0, verb: 0.55, duck: 1 },
  wonder: { bpm: 76, root: 65, scale: MAJ, prog: [3, 4, 0, 5], ext: 5, parts: ["pad", "epArp", "bassSwell"], swing: 0, verb: 0.5, duck: 1 },
  playful: { bpm: 100, root: 65, scale: MAJ, prog: [0, 4, 5, 3], ext: 4, parts: ["kickSoft", "brush", "pluck8", "bassBounce"], swing: 0.14, verb: 0.22, duck: 0.9 },
};

function compose_music(P, plan, r) {
  const { duration } = plan;
  const spb = 60 / P.bpm, bar = spb * 4, s16 = spb / 4;
  const total = duration + 3; // ring-out
  const drums = new Bus(total), inst = new Bus(total), low = new Bus(total), send = new Bus(total);
  const end = plan.outroAt ?? Math.max(0, duration - 3);
  const nBars = Math.ceil(duration / bar) + 1;
  const has = (p) => P.parts.includes(p);
  const voices = [], roots = [];
  for (let b = 0, prev = null; b < nBars; b++) { const deg = P.prog[b % P.prog.length]; prev = voicing(P.root, P.scale, deg, P.ext || 4, prev); voices.push(prev); roots.push(bassNote(P.root, P.scale, deg)); }
  const kicks = [];
  const swingAt = (q) => (q % 2 ? P.swing * s16 * 2 : 0);
  const hum = () => (r() - 0.5) * 0.01;
  const intro = (b) => b === 0 && P.bpm < 90; // slow beds open on the harmony alone
  for (let b = 0; b < nBars; b++) {
    const t0 = b * bar;
    if (t0 >= end - 0.01) break;
    const ch = voices[b], rt = roots[b], len = Math.min(bar, end - t0);
    const at = (q) => t0 + q * s16 + swingAt(q) + hum();
    const before = (t) => t < end - 0.02;
    // drums
    if (!intro(b)) for (let q = 0; q < 16; q++) {
      const t = Math.max(0, at(q));
      if (!before(t)) break;
      if (has("kick4") && q % 4 === 0) { drums.add(kick(r), t, 0.75 * human(r, 0.08)); kicks.push(t); }
      if (has("kickHalf") && (q === 0 || q === 8)) { drums.add(kick(r, { punch: 0.6, dec: 0.32 }), t, 0.45); kicks.push(t); }
      if (has("kickSoft") && (q === 0 || q === 8 || (q === 6 && b % 2))) { drums.add(kick(r, { punch: 0.7, dec: 0.3 }), t, 0.55); kicks.push(t); }
      if (has("kickBoom") && (q === 0 || q === 7 || q === 10)) { drums.add(kick(r, { pitch: 48, dec: 0.4 }), t, q === 7 ? 0.4 : 0.65); kicks.push(t); }
      if (has("snare") && (q === 4 || q === 12)) { const s = snare(r, { tone: 200, top: 8000 }); drums.add(s, t, 0.42); send.add(s, t, 0.18); }
      if (has("snareBoom") && (q === 4 || q === 12)) { const s = snare(r, { dec: 0.16, top: 6000 }); drums.add(s, t, 0.5); send.add(s, t, 0.12); }
      if (has("brush") && (q === 4 || q === 12)) { const s = brush(r); drums.add(s, t, 0.5, 0.1); send.add(s, t, 0.2); }
      if (has("hatOff") && q % 4 === 2) drums.add(hat(r), t, 0.3 * human(r, 0.3), 0.25);
      if (has("hat8") && q % 2 === 0) drums.add(hat(r), t, (q % 4 === 2 ? 0.2 : 0.11) * human(r, 0.4), 0.3);
      if (has("shaker16")) drums.add(shaker(r), t, (q % 4 === 2 ? 0.2 : q % 2 ? 0.07 : 0.12) * human(r, 0.4), 0.35);
      if (has("shaker8") && q % 2 === 0) drums.add(shaker(r), t, (q % 4 === 2 ? 0.2 : 0.1) * human(r, 0.4), 0.35);
      if (has("hat16")) drums.add(hat(r), t, (q % 4 === 2 ? 0.16 : 0.08) * human(r, 0.4), -0.2);
    }
    // harmony
    if (has("pad")) { const p = pad(ch, len + 1.2, r, { cutoff: P.bpm < 90 ? 2800 : 2400, attack: intro(b) ? 1.4 : 0.5 }); inst.add(p, t0, has("epArp") ? 0.5 : 0.28); send.add(p, t0, 0.4); }
    if (has("epHold")) for (const q of b % 2 ? [0, 10] : [0]) { const t = at(q); if (!before(t)) continue; const c = epChord(ch, q ? spb * 1.5 : len + 0.3, 0.42, r); inst.add(c, Math.max(0, t), q ? 0.3 : 0.45); send.add(c, Math.max(0, t), 0.3); }
    if (has("epStab") && !intro(b)) for (const q of [3, 6, 10, 14]) { const t = at(q); if (before(t)) { const c = epChord(ch, spb * 0.55, 0.5, r, { roll: 0.004 }); inst.add(c, t, 0.5, q % 2 ? 0.15 : -0.15); send.add(c, t, 0.25); } }
    if (has("epPulse")) for (let q = 0; q < 16; q += 2) { const t = Math.max(0, at(q)); if (!before(t)) break; const m = q % 8 === 0 ? ch[0] : q % 4 === 0 ? ch[2] ?? ch[1] : ch[1]; const v = ep(m - 12 >= 48 ? m - 12 : m, spb * 0.9, 0.38 * human(r, 0.15)); inst.add(v, t, 0.38, q % 4 ? 0.2 : -0.2); send.add(v, t, 0.25); }
    if (has("epArp")) for (let q = 0; q < 16; q += 4) { const t = Math.max(0, at(q)); if (!before(t)) break; const v = ep(ch[(q / 4) % ch.length], spb * 3, 0.3 * human(r, 0.2)); inst.add(v, t, 0.42, (q / 4 - 1.5) * 0.3); send.add(v, t, 0.5); }
    if (has("pluck8") && !intro(b)) { const pat = [0, 2, 1, 3, 2, 1, 0, 2]; for (let k = 0; k < 8; k++) { if (k === 3 || k === 7) continue; const t = Math.max(0, at(k * 2)); if (!before(t)) break; const s = pluck(ch[pat[k] % ch.length], 0.8, r, { bright: 0.28, decay: 0.993 }); inst.add(s, t, human(r, 0.2), (k % 3 - 1) * 0.3); send.add(s, t, 0.3); } }
    if (has("guitar8")) { const pat = [0, 1, 2, 3, 2, 1, 2, 3]; for (let k = 0; k < 8; k++) { const t = Math.max(0, at(k * 2)); if (!before(t)) break; const m = k === 0 ? (ch[0] - 12 >= 45 ? ch[0] - 12 : ch[0]) : ch[pat[k] % ch.length]; const s = pluck(m, 1.2, r, { bright: 0.22, decay: 0.996 }); inst.add(s, t, 0.9 * human(r, 0.2), k % 2 ? 0.25 : -0.25); send.add(s, t, 0.3); } }
    if (has("synthArp") && !intro(b)) for (let q = 0; q < 16; q++) { const t = Math.max(0, at(q)); if (!before(t)) break; const m = ch[[0, 1, 2, 1, 3, 2][q % 6] % ch.length] - 12; const s = softSynth(m < 45 ? m + 12 : m, s16 * 1.6, 1900 + 700 * Math.sin((b * 16 + q) / 10)); inst.add(s, t, 0.22, q % 2 ? 0.25 : -0.25); send.add(s, t, 0.22); }
    // bass
    if (has("bassHouse") && !intro(b)) for (const q of [2, 6, 10, 14]) { const t = at(q); if (before(t)) low.add(bass(q === 14 ? rt + 7 : rt, spb * 0.45), t, 0.55); }
    if (has("bassLong")) for (const q of [0, 8]) { const t = Math.max(0, at(q)); if (before(t)) low.add(bass(rt, spb * 1.9, { a: 0.02, r: 0.2 }), t, 0.45); }
    if (has("bassSwell")) low.add(bass(rt, len + 0.4, { a: 0.6, r: 0.6, drive: 1 }), t0, 0.4);
    if (has("bassBounce") && !intro(b)) for (const [q, d] of [[0, 0], [6, 7], [8, 0], [14, 7]]) { const t = Math.max(0, at(q)); if (before(t)) low.add(bass(rt + d, spb * 0.45, { tone: 0.3 }), t, 0.5); }
    if (has("bass8") && !intro(b)) for (let q = 0; q < 16; q += 2) { const t = Math.max(0, at(q)); if (before(t)) low.add(bass(rt, spb * 0.4), t, 0.34); }
    if (has("bassBoom")) for (const q of [0, 10]) { const t = Math.max(0, at(q)); if (before(t)) low.add(bass(rt, spb * (q ? 1.2 : 1.5), { a: 0.01, r: 0.15 }), t, 0.55); }
  }
  if (has("vinyl")) inst.add(vinyl(duration + 1, r), 0, 0.5);
  // the end: a low swell, one deep hit, the home chord left ringing
  const home = voicing(P.root, P.scale, 0, P.ext || 4, voices[voices.length - 1]);
  const rs = fxRiser(r, Math.min(1.6, spb * 3));
  inst.add(rs, end - rs.peak, 0.14);
  const hit = fxImpact(r, P.root);
  inst.add(hit, end, 0.3); send.add(hit, end, 0.2);
  const tail = Math.max(2.4, duration - end + 1.8);
  if (has("guitar8") || has("pluck8")) { const s = strum([bassNote(P.root, P.scale, 0) + 12, ...home], tail, r, { bright: 0.24, decay: 0.998 }); inst.add(s, end, 1.1); send.add(s, end, 0.4); }
  else { const c = epChord(home, tail, 0.45, r, { roll: 0.03 }); inst.add(c, end, 0.55); send.add(c, end, 0.5); }
  const p = pad(home, tail, r, { cutoff: 2200, attack: 0.05, release: 1.8 });
  inst.add(p, end, 0.22); send.add(p, end, 0.4);
  low.add(bass(bassNote(P.root, P.scale, 0), Math.max(1.5, duration - end + 0.6), { a: 0.005, r: 1.2 }), end, 0.45);
  if (P.parts.some((x) => x.startsWith("kick"))) drums.add(kick(r, { dec: 0.5 }), end, 0.7);

  // sidechain: the harmony breathes under each kick (deep for the dance beds, barely for the gentle ones)
  const depth = 1 - (P.duck ?? 0.85);
  if (depth > 0.01) {
    const duck = new Float32Array(inst.n).fill(1);
    for (const t of kicks) { const i0 = Math.round(t * SR); for (let i = 0; i < 0.22 * SR && i0 + i < duck.length; i++) duck[i0 + i] = Math.min(duck[i0 + i], 1 - depth + depth * Math.pow(i / (0.22 * SR), 0.6)); }
    for (let i = 0; i < inst.n; i++) { inst.L[i] *= duck[i]; inst.R[i] *= duck[i]; low.L[i] *= duck[i] * 0.7 + 0.3; low.R[i] *= duck[i] * 0.7 + 0.3; }
  }
  // a dark room: the reverb only hears the middle of the spectrum
  const sl = [biquad("lp", 6500), biquad("lp", 6500)], sh = [biquad("hp", 220), biquad("hp", 220)];
  for (let i = 0; i < send.n; i++) { send.L[i] = sl[0](sh[0](send.L[i])); send.R[i] = sl[1](sh[1](send.R[i])); }
  const wet = reverb(send, { room: P.verb > 0.4 ? 0.88 : 0.82, damp: 0.45 });
  const echo = P.bpm >= 100 ? delay(send, spb * 0.75, 0.28, 2400) : null;
  const music = new Bus(total);
  music.mixFrom(drums, P.drums ?? 1); music.mixFrom(inst, 1); music.mixFrom(low, P.low ?? 1); music.mixFrom(wet, P.verb * 2.2); if (echo) music.mixFrom(echo, 0.1);
  // fade in over half a beat, out after the ring
  const fin = Math.round(spb * SR * 0.5), fout0 = Math.round((duration + 0.2) * SR), fout1 = Math.round((duration + 2.6) * SR);
  for (let i = 0; i < music.n; i++) { let g = i < fin ? i / fin : 1; if (i > fout0) g *= Math.max(0, 1 - (i - fout0) / (fout1 - fout0)); music.L[i] *= g; music.R[i] *= g; }
  return music;
}

// ---------- mix, master, write ----------
function writeWav(file, bus, seconds) {
  const n = Math.min(bus.n, Math.round(seconds * SR));
  const b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(clamp(bus.L[i], -1, 1) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(clamp(bus.R[i], -1, 1) * 32767), 46 + i * 4); }
  fs.writeFileSync(file, b);
}
function readAudio(file, seconds) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-t", String(seconds), "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) return null;
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
  const bus = new Bus(f.length / 2 / SR);
  for (let i = 0; i < bus.n; i++) { bus.L[i] = f[i * 2]; bus.R[i] = f[i * 2 + 1]; }
  return bus;
}
function loudness(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
  const m = (r.stderr || "").match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m[0]); return { I: +j.input_i, TP: +j.input_tp }; } catch { return null; }
}
// gentle bus glue + brickwall: peaks held under −1 dBFS without pumping
function master(bus, eq = true) {
  // presence (the instruments are voiced dark, so the top is lifted broadly, never a narrow treble boost)
  // and a little tape saturation
  const hp = [biquad("hp", 32), biquad("hp", 32)], lo = [biquad("lowshelf", 110, 0.7, -1.5), biquad("lowshelf", 110, 0.7, -1.5)], hi = [biquad("highshelf", 2200, 0.6, 5), biquad("highshelf", 2200, 0.6, 5)];
  if (eq) for (let i = 0; i < bus.n; i++) { bus.L[i] = Math.tanh(1.15 * hi[0](lo[0](hp[0](bus.L[i])))) / Math.tanh(1.15); bus.R[i] = Math.tanh(1.15 * hi[1](lo[1](hp[1](bus.R[i])))) / Math.tanh(1.15); }
  // a soft knee on the loudest transients first, so the limiter barely has to work
  const knee = dbToGain(-6);
  for (let i = 0; i < bus.n; i++) for (const ch of [bus.L, bus.R]) { const x = ch[i], a = Math.abs(x); if (a > knee) ch[i] = Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee))); }
  // look-ahead limiter: the exact max over the next 5 ms (monotonic queue), gain glides down before a
  // peak arrives and recovers slowly after — every sample under the ceiling
  const look = Math.round(0.005 * SR), ceil = dbToGain(-2.3), n = bus.n;
  const amp = new Float32Array(n);
  // sample peaks and the half-sample peaks between them (cubic interpolation ≈ true peak)
  const half = (x, i) => (-(x[i - 1] || 0) + 9 * x[i] + 9 * (x[i + 1] || 0) - (x[i + 2] || 0)) / 16;
  for (let i = 0; i < n; i++) amp[i] = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]), Math.abs(half(bus.L, i)), Math.abs(half(bus.R, i)));
  const want = new Float32Array(n);
  const q = new Int32Array(n); let h = 0, t = 0;
  for (let i = 0, j = 0; i < n; i++) {
    for (; j < Math.min(n, i + look); j++) { while (t > h && amp[q[t - 1]] <= amp[j]) t--; q[t++] = j; }
    while (q[h] < i) h++;
    const pk = amp[q[h]];
    want[i] = pk > ceil ? ceil / pk : 1;
  }
  // smooth: attack over the look-ahead (min of upcoming wants), release ~120 ms
  const rel = Math.exp(-1 / (0.12 * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    const w = want[i];
    g = w < g ? w : w - (w - g) * rel;
    bus.L[i] *= g; bus.R[i] *= g;
  }
  for (let i = 0; i < n; i++) { if (bus.L[i] > ceil) bus.L[i] = ceil; else if (bus.L[i] < -ceil) bus.L[i] = -ceil; if (bus.R[i] > ceil) bus.R[i] = ceil; else if (bus.R[i] < -ceil) bus.R[i] = -ceil; }
}

// plan: { duration, style, preset?, bpm?, boundaries[], outroAt, cues: [{name, at, gain}], music: "auto"|"none"|path, musicVolume, musicStart }
export function renderSoundtrack(plan, outFile, { seed = 7 } = {}) {
  const r = rng(seed);
  rngHam = rng(seed + 1);
  const P = { ...(PRESETS[plan.preset] || PRESETS[plan.style] || PRESETS.keynote) };
  if (plan.bpm) P.bpm = plan.bpm;
  const total = plan.duration + 3;
  const mix = new Bus(total);
  const report = { music: plan.music || "auto", preset: plan.preset || plan.style, bpm: P.bpm, sfx: 0 };
  // music
  if (plan.music === "auto" || plan.music == null) {
    const m = compose_music(P, plan, r);
    mix.mixFrom(m, 0.9);
  } else if (plan.music && plan.music !== "none") {
    const m = readAudio(plan.music, plan.duration + (plan.musicStart || 0) + 3);
    if (m) {
      const off = Math.round((plan.musicStart || 0) * SR), fo = Math.round(Math.min(2, plan.duration * 0.1) * SR), end = Math.round(plan.duration * SR);
      for (let i = 0; i < end && i + off < m.n; i++) { const g = Math.min(1, i / (0.25 * SR)) * (i > end - fo ? (end - i) / fo : 1) * (plan.musicVolume ?? 0.8); mix.L[i] += m.L[i + off] * g; mix.R[i] += m.R[i + off] * g; }
    }
  }
  // effects: pitched to the key, in the middle register, under the music, never piling up
  const base = 60 + (((P.root % 12) + 12) % 12) - (P.root % 12 > 5 ? 12 : 0);
  const scaleNotes = P.scale.map((x) => base + x);
  let blipN = 0;
  for (const c of plan.cues || []) {
    const kind = KIND[c.name] || "blip";
    let v;
    if (kind === "whoosh") v = fxWhoosh(r, { dur: 0.6, from: 150, to: 1300, level: 0.9 });
    else if (kind === "swish") v = fxWhoosh(r, { dur: 0.32, from: 300, to: 1800, level: 0.7 });
    else if (kind === "thump") v = fxThump(r, P.root);
    else if (kind === "impact") v = fxImpact(r, P.root);
    else if (kind === "riser") v = fxRiser(r, 1.4);
    else if (kind === "key") v = fxKey(r);
    else if (kind === "bell") v = fxTap(scaleNotes[4] + 12, true);
    else v = fxTap(scaleNotes[[0, 2, 4, 5, 4, 2][blipN++ % 6]], c.gain < 0.6);
    const g = { whoosh: 0.2, swish: 0.13, thump: 0.38, impact: 0.3, riser: 0.18, key: 0.12, bell: 0.12, blip: 0.13 }[kind] * clamp(c.gain ?? 1, 0.3, 1.1);
    mix.add(v, c.at - (v.peak || 0), g, kind === "blip" ? (blipN % 3 - 1) * 0.25 : 0);
    report.sfx++;
  }
  master(mix);
  const tmp = outFile.replace(/\.wav$/, ".pre.wav");
  writeWav(tmp, mix, plan.duration + 0.05);
  // loudness: −16 LUFS integrated (full, not loud) with peaks under −2 dBTP (headroom for the AAC encode). A few passes of
  // gain → soft knee + limiter → measure, so transient-heavy styles get there too
  let L2 = loudness(tmp);
  for (let pass = 0; pass < 4 && L2 && isFinite(L2.I); pass++) {
    const g = clamp(-16 - L2.I, -20, 20);
    if (Math.abs(g) < 0.25 && L2.TP <= -1.95) break;
    const k = dbToGain(g);
    for (let i = 0; i < mix.n; i++) { mix.L[i] *= k; mix.R[i] *= k; }
    master(mix, false);
    writeWav(outFile, mix, plan.duration + 0.05);
    L2 = loudness(outFile);
    if (L2 && L2.TP > -1.95) {
      const t = dbToGain(-2.05 - L2.TP);
      for (let i = 0; i < mix.n; i++) { mix.L[i] *= t; mix.R[i] *= t; }
      writeWav(outFile, mix, plan.duration + 0.05);
      L2 = loudness(outFile);
    }
  }
  if (!fs.existsSync(outFile)) writeWav(outFile, mix, plan.duration + 0.05);
  fs.rmSync(tmp, { force: true });
  report.lufs = L2 ? L2.I : null; report.truePeak = L2 ? L2.TP : null;
  return report;
}
