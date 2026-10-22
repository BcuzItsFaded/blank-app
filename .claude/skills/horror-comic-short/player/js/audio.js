/*
 * Audio engine: generative horror score + synthesized SFX (Web Audio only, no samples, no APIs),
 * optional narration/music files, all scheduled against the timeline so seeking stays in sync.
 */
(function () {
  const CH = {
    Am: [220, 261.63, 329.63], F: [174.61, 220, 261.63], Dm: [146.83, 174.61, 220], E: [164.81, 207.65, 246.94],
    C: [261.63, 329.63, 392], G: [196, 246.94, 293.66], Fmaj7: [174.61, 220, 261.63, 329.63],
    Cmaj7: [130.81, 164.81, 196, 246.94], Bdim: [246.94, 293.66, 349.23], Clus: [155.56, 164.81, 233.08, 246.94]
  };
  const MOODS = {
    creepy: { chords: ["Am", "Bdim"], drone: 0.9, cutoff: 260, arp: { every: 0.42, notes: [880, 1046.5, 987.77, 830.61, 659.25], lvl: 0.045, prob: 0.85, detune: 0.992 } },
    sad: { chords: ["Am", "F"], drone: 0.35, cutoff: 200, arp: { every: 0.7, notes: [440, 392, 349.23, 329.63], lvl: 0.055, type: "triangle", prob: 1 } },
    eerie: { chords: ["Dm"], drone: 0.6, cutoff: 320, arp: { every: 0.55, notes: [1046.5, 1174.66, 1318.5, 1479.98, 1661.2], lvl: 0.03, prob: 0.6 } },
    happy: { chords: ["C", "G"], drone: 0, cutoff: 600, arp: { every: 0.2, notes: [523.25, 659.25, 783.99, 1046.5], lvl: 0.04, prob: 1 } },
    somber: { chords: ["Dm", "Am"], drone: 0.7, cutoff: 220, arp: { every: 1, notes: [146.83, 220, 174.61], lvl: 0.05, type: "triangle", prob: 1 } },
    romantic: { chords: ["Fmaj7", "Cmaj7"], drone: 0, cutoff: 500, arp: { every: 0.33, notes: [523.25, 659.25, 698.46, 880, 783.99, 659.25], lvl: 0.035, prob: 1 } },
    intense: { chords: ["Am", "E"], drone: 1, cutoff: 420, pulse: { every: 0.25, f: 110, lvl: 0.05 } },
    shock: { chords: ["Clus"], drone: 1, cutoff: 700 },
    end: { chords: ["Am"], drone: 0.5, cutoff: 200 }
  };

  function rng(seed) {
    let s = seed * 9301 + 49297;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }

  class WishAudio {
    constructor() {
      this.ctx = null; this.live = new Set(); this.events = []; this.timer = null; this.playing = false;
      this.voiceEl = null; this.musicEl = null; this.useGenerative = true;
    }

    init(offline) {
      if (this.ctx) return;
      const ctx = (this.ctx = offline || new (window.AudioContext || window.webkitAudioContext)());
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
      this.out = ctx.createGain(); this.out.gain.value = 0.8;
      // makeup gain → brick-wall limiter keeps the mix loud for Shorts without clipping
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
      const ceil = this.gain(0.9);
      this.out.connect(comp); comp.connect(this.gain(1.5, lim)); lim.connect(ceil); ceil.connect(ctx.destination);
      if (ctx.createMediaStreamDestination) { this.rec = ctx.createMediaStreamDestination(); ceil.connect(this.rec); }
      this.musicBus = this.gain(0.75, this.out);
      this.sfxBus = this.gain(0.9, this.out);
      this.voiceBus = this.gain(1, this.out);
      this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(3.4, 2.4);
      this.reverb.connect(this.gain(0.55, this.out));
      const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = nb;
      if (offline) return;
      if (this.voiceEl) this.attachMedia(this.voiceEl, this.voiceBus);
      if (this.musicEl) this.attachMedia(this.musicEl, this.musicBus);
    }

    // Sample-accurate render of the whole soundtrack (score, SFX, voice/music files) to an AudioBuffer,
    // used for frame-by-frame video rendering where real-time playback can't keep up.
    async renderOffline(project, settings, seconds, rate = 48000) {
      const off = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
      const a = new WishAudio();
      a.useGenerative = this.useGenerative;
      a.init(off);
      const hasVoice = !!this.voiceEl;
      a.musicBus.gain.value = settings.musicVol * (hasVoice ? 0.6 : 1);
      a.sfxBus.gain.value = settings.sfxVol;
      a.voiceBus.gain.value = settings.voiceVol;
      const file = async (el, bus, at) => {
        if (!el) return;
        const buf = await off.decodeAudioData(await (await fetch(el.src)).arrayBuffer());
        const src = off.createBufferSource(); src.buffer = buf; src.connect(bus);
        if (at >= 0) src.start(at); else src.start(0, -at);
      };
      await file(this.voiceEl, a.voiceBus, project.voiceOffset || 0);
      await file(this.musicEl, a.musicBus, 0);
      a.build(project);
      a.startBeds(0);
      for (const e of a.events) e.fn(Math.max(0, e.t), Math.max(0, -e.t));
      return off.startRendering();
    }

    // ---------- small building blocks ----------
    gain(v, dest) { const g = this.ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
    impulse(sec, decay) {
      const r = this.ctx.sampleRate, len = r * sec, b = this.ctx.createBuffer(2, len, r);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return b;
    }
    track(src, t0, t1) {
      this.live.add(src); src.onended = () => this.live.delete(src);
      src.start(t0); if (t1 != null) src.stop(t1);
      return src;
    }
    osc(type, f, t0, t1) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return this.track(o, t0, t1); }
    noise(t0, t1) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.loopStart = Math.random(); return this.track(s, t0, t1); }
    filt(type, f, q = 1) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
    out2(node, bus, dry = 1, wet = 0.3) {
      node.connect(this.gain(dry, bus)); if (wet) node.connect(this.gain(wet, this.reverb));
    }
    env(g, t, a, peak, d, hold = 0) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      if (hold) g.gain.setValueAtTime(peak, t + a + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
      return t + a + hold + d + 0.05;
    }

    // ---------- music ----------
    pad(t, dur, freqs, lvl, skip = 0) {
      dur -= skip; if (dur <= 0.05) return;
      const g = this.gain(0), lp = this.filt("lowpass", 1300, 0.5);
      lp.connect(g); this.out2(g, this.musicBus, 0.6, 0.6);
      const end = t + dur + 1.2;
      freqs.forEach(f => [-7, 7].forEach(c => { const o = this.osc("triangle", f, t, end); o.detune.value = c; o.connect(lp); }));
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + (skip ? 0.2 : 0.9));
      g.gain.setValueAtTime(lvl, t + dur);
      g.gain.linearRampToValueAtTime(0, end);
    }
    note(t, f, lvl, type = "sine", decay = 1.4) {
      const g = this.gain(0); this.out2(g, this.musicBus, 0.7, 0.6);
      const end = this.env(g, t, 0.005, lvl, decay);
      this.osc(type, f, t, end).connect(g);
      const h = this.gain(0.3, g); this.osc("sine", f * 2.01, t, end).connect(h);
    }
    stab(t, f, lvl) {
      const g = this.gain(0), lp = this.filt("lowpass", 500, 4); lp.connect(g); this.out2(g, this.musicBus, 1, 0.2);
      const end = this.env(g, t, 0.005, lvl, 0.18);
      this.osc("sawtooth", f, t, end).connect(lp);
    }
    startBeds(t) {
      const ctx = this.ctx;
      this.droneG = this.gain(0, this.musicBus);
      this.droneLP = this.filt("lowpass", 260, 2); this.droneLP.connect(this.droneG);
      [55, 55.4].forEach(f => this.osc("sawtooth", f, t).connect(this.droneLP));
      this.osc("sine", 27.5, t).connect(this.gain(0.8, this.droneG));
      const lfo = this.osc("sine", 0.08, t); lfo.connect(this.gain(80, this.droneLP.frequency));
      this.windG = this.gain(0, this.sfxBus);
      const bp = this.filt("bandpass", 500, 0.7); bp.connect(this.windG);
      this.noise(t).connect(bp);
      const wl = this.osc("sine", 0.05, t); wl.connect(this.gain(260, bp.frequency));
      void ctx;
    }
    setBeds(t, drone, cutoff, wind) {
      if (!this.droneG) return;
      this.droneG.gain.setTargetAtTime(this.useGenerative ? drone * 0.16 : 0, t, 0.5);
      this.droneLP.frequency.setTargetAtTime(cutoff, t, 0.6);
      this.windG.gain.setTargetAtTime(wind * 0.05, t, 0.8);
    }

    // ---------- sfx ----------
    whoosh(t, lvl = 0.35, dur = 0.7) {
      const bp = this.filt("bandpass", 250, 1.3), g = this.gain(0); bp.connect(g); this.out2(g, this.sfxBus, 1, 0.25);
      bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(350, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      this.noise(t, t + dur + 0.05).connect(bp);
    }
    hit(t, lvl = 0.8) {
      const g = this.gain(0); this.out2(g, this.sfxBus, 1, 0.5);
      const end = this.env(g, t, 0.005, lvl, 1.6);
      const o = this.osc("sine", 75, t, end); o.frequency.exponentialRampToValueAtTime(32, t + 0.9); o.connect(g);
      const ng = this.gain(0), lp = this.filt("lowpass", 900); lp.connect(ng); ng.connect(this.sfxBus);
      this.noise(t, this.env(ng, t, 0.003, lvl * 0.6, 0.35)).connect(lp);
    }
    sting(t, lvl = 0.25) {
      this.hit(t, 0.7);
      const lp = this.filt("lowpass", 6000), g = this.gain(0); lp.connect(g); this.out2(g, this.sfxBus, 0.8, 0.9);
      lp.frequency.exponentialRampToValueAtTime(1200, t + 2.2);
      const end = this.env(g, t, 0.02, lvl, 2.4);
      [440, 466.16, 622.25, 932.33, 987.77].forEach(f => this.osc("sawtooth", f, t, end).connect(lp));
    }
    glitch(t) {
      const r = rng(Math.floor(t * 100));
      for (let i = 0; i < 9; i++) {
        const s = t + i * 0.045, g = this.gain(0); g.connect(this.sfxBus);
        this.osc("square", 80 + r() * 1900, s, this.env(g, s, 0.002, 0.08, 0.03)).connect(g);
      }
    }
    voiceSyl(t, f0, f1, len, lvl, formants, bus = this.sfxBus, wet = 0.7) {
      const g = this.gain(0); this.out2(g, bus, 1, wet);
      const end = this.env(g, t, 0.025, lvl, len * 0.55, len * 0.4);
      const src = this.osc("sawtooth", f0, t, end); src.frequency.exponentialRampToValueAtTime(f1, t + len);
      const vib = this.osc("sine", 6.5, t, end); vib.connect(this.gain(f0 * 0.03, src.frequency));
      const nz = this.noise(t, end), ng = this.gain(0.15); nz.connect(ng);
      formants.forEach(([f, q, a]) => { const bp = this.filt("bandpass", f, q), fg = this.gain(a, g); bp.connect(fg); src.connect(bp); ng.connect(bp); });
    }
    laugh(t, base = 135) {
      const ah = [[750, 7, 1.2], [1150, 9, 0.8], [2600, 12, 0.4]];
      for (let i = 0; i < 7; i++) {
        const f = base * (1.25 - i * 0.04);
        this.voiceSyl(t + i * 0.2, f * 1.12, f * 0.88, 0.15, 0.55, ah);
      }
      this.voiceSyl(t + 1.45, base * 1.3, base * 0.7, 0.9, 0.5, ah);
    }
    scream(t) {
      this.voiceSyl(t, 520, 820, 1.5, 0.55, [[850, 6, 1.3], [1250, 8, 0.9], [2900, 10, 0.5]], this.sfxBus, 0.9);
      this.voiceSyl(t + 0.1, 700, 980, 1.3, 0.3, [[900, 6, 1], [1400, 8, 0.7]], this.sfxBus, 0.9);
    }
    ambient(t, dur, skip, kind) {
      dur -= skip; if (dur <= 0.05) return;
      const g = this.gain(0); g.connect(this.sfxBus);
      const end = t + dur;
      let lvl = 0.06;
      if (kind === "rain") {
        const hp = this.filt("highpass", 900), lp = this.filt("lowpass", 7000); hp.connect(lp); lp.connect(g);
        this.noise(t, end + 0.1).connect(hp); lvl = 0.09;
      } else if (kind === "static") {
        const hp = this.filt("highpass", 2500); hp.connect(g); this.noise(t, end + 0.1).connect(hp); lvl = 0.035;
      } else if (kind === "babble") {
        // muffled newscaster: band-limited noise with syllabic amplitude bursts
        const bp = this.filt("bandpass", 900, 2.5), am = this.gain(0); bp.connect(am); am.connect(g);
        this.noise(t, end + 0.1).connect(bp);
        const r = rng(Math.floor(t));
        for (let s = t; s < end; s += 0.09 + r() * 0.12) am.gain.setTargetAtTime(r() < 0.75 ? 0.6 + r() * 0.6 : 0.02, s, 0.025);
        lvl = 0.09;
      }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + (skip ? 0.1 : 0.5));
      g.gain.setValueAtTime(lvl, Math.max(t + 0.1, end - 0.4)); g.gain.linearRampToValueAtTime(0, end);
    }
    bellPartials(t, base, partials, lvl, decay, wet = 0.6) {
      partials.forEach((p, i) => {
        const g = this.gain(0); this.out2(g, this.sfxBus, 1, wet);
        this.osc("sine", base * p, t, this.env(g, t, 0.003, lvl / (i + 1), decay / (1 + i * 0.3))).connect(g);
      });
    }
    chime(t) { this.bellPartials(t, 1320, [1, 2.76, 5.4, 8.93], 0.12, 2.4); this.bellPartials(t + 0.2, 1480, [1, 2.76, 5.4], 0.08, 2); }
    toll(t) { this.bellPartials(t, 98, [1, 2, 2.4, 3, 4.2, 5.4], 0.35, 5, 0.8); }
    wish(t) {
      const notes = [1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093, 2349.3, 2637];
      notes.forEach((f, i) => this.bellPartials(t + i * 0.07, f, [1, 2.01], 0.06, 1.4, 0.9));
      this.whoosh(t, 0.15, 1.2);
    }
    coins(t) {
      const r = rng(7);
      for (let i = 0; i < 16; i++) { const s = t + r() * 1.4; this.bellPartials(s, 2800 + r() * 2600, [1, 1.47], 0.07, 0.18, 0.2); }
      this.cash(t + 0.2);
    }
    cash(t) {
      const bp = this.filt("bandpass", 2500, 1), g = this.gain(0), am = this.gain(0.5);
      bp.connect(am); am.connect(g); g.connect(this.sfxBus);
      this.osc("square", 22, t, t + 1).connect(this.gain(0.5, am.gain));
      this.noise(t, this.env(g, t, 0.05, 0.25, 0.6, 0.2)).connect(bp);
    }
    beep(t, len = 0.11, lvl = 0.12) {
      const g = this.gain(0); g.connect(this.sfxBus);
      this.osc("sine", 1000, t, this.env(g, t, 0.005, lvl, 0.03, len)).connect(g);
    }
    heartbeat(t, lvl = 0.9) {
      [[0, 1], [0.24, 0.7]].forEach(([o, k]) => {
        const g = this.gain(0); g.connect(this.sfxBus);
        const s = t + o, x = this.osc("sine", 62, s, this.env(g, s, 0.008, lvl * k, 0.22));
        x.frequency.exponentialRampToValueAtTime(38, s + 0.15); x.connect(g);
      });
    }
    thunder(t) {
      const hg = this.gain(0), hp = this.filt("highpass", 1500); hp.connect(hg); this.out2(hg, this.sfxBus, 1, 0.4);
      this.noise(t, this.env(hg, t, 0.002, 0.6, 0.25)).connect(hp);
      const g = this.gain(0), lp = this.filt("lowpass", 300); lp.connect(g); this.out2(g, this.sfxBus, 1, 0.6);
      this.osc("sine", 5, t, t + 4).connect(this.gain(160, lp.frequency));
      this.noise(t, this.env(g, t + 0.05, 0.1, 0.9, 3.4)).connect(lp);
    }
    lowboom(t) {
      const g = this.gain(0); this.out2(g, this.sfxBus, 1, 0.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      this.osc("sine", 42, t, t + 3.6).connect(g);
      this.osc("triangle", 63, t, t + 3.6).connect(this.gain(0.3, g));
    }
    riser(t, dur) {
      const bp = this.filt("bandpass", 200, 2), g = this.gain(0); bp.connect(g); this.out2(g, this.sfxBus, 1, 0.4);
      bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(4500, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur); g.gain.setValueAtTime(0.0001, t + dur + 0.01);
      this.noise(t, t + dur + 0.02).connect(bp);
    }
    tick(t) {
      const g = this.gain(0), hp = this.filt("highpass", 3000); hp.connect(g); g.connect(this.sfxBus);
      this.noise(t, this.env(g, t, 0.001, 0.08, 0.02)).connect(hp);
    }

    // ---------- timeline → events ----------
    build(project) {
      const ev = [];
      const add = (t, fn, dur = 0, bed = false) => ev.push({ t, fn, dur, bed });
      const P = project.panels;
      P.forEach((p, i) => {
        const s = p.start, e = p.end, d = e - s, fx = new Set(p.fx || []);
        const mood = MOODS[p.mood] || MOODS.creepy, r = rng(p.n * 31);
        add(s, (w) => this.setBeds(w, mood.drone, mood.cutoff, fx.has("fog") || fx.has("rain") ? 1 : 0.4), 0, true);
        if (this.useGenerative) {
          const per = Math.max(2, d / mood.chords.length);
          mood.chords.forEach((c, k) => { const cs = s + k * per; if (cs < e) add(cs, (w, sk) => this.pad(w, Math.min(per, e - cs), CH[c], 0.05, sk), Math.min(per, e - cs)); });
          if (mood.arp) for (let tt = s + 0.1, k = 0; tt < e - 0.1; tt += mood.arp.every, k++) {
            if (r() > mood.arp.prob) continue;
            const f = mood.arp.notes[k % mood.arp.notes.length] * (mood.arp.detune && k % 3 === 2 ? mood.arp.detune : 1);
            add(tt, (w) => this.note(w, f, mood.arp.lvl, mood.arp.type || "sine"));
          }
          if (mood.pulse) for (let tt = s; tt < e - 0.05; tt += mood.pulse.every) add(tt, (w) => this.stab(w, mood.pulse.f, mood.pulse.lvl));
        }
        // transitions
        if (i > 0) {
          const tr = p.transition;
          if (tr === "flash") add(s, (w) => this.hit(w, 0.6));
          else if (tr === "glitch") add(s - 0.05, (w) => this.glitch(w));
          else add(s - 0.35, (w) => this.whoosh(w, 0.25));
        }
        // per-panel cues
        if (fx.has("title")) { add(s + 0.05, (w) => this.hit(w, 0.7)); add(s + 0.1, (w) => this.whoosh(w, 0.3, 1.4)); }
        if (fx.has("candle")) for (let tt = s + 0.2; tt < e; tt += 0.25 + r() * 0.4) add(tt, (w) => this.tick(w));
        if (fx.has("laugh")) add(s + (fx.has("title") ? 1.0 : 0.6), (w) => this.laugh(w, 120));
        if (fx.has("rain")) add(s, (w, sk) => this.ambient(w, d + 0.4, sk, "rain"), d);
        if (fx.has("chime")) add(s + 0.35, (w) => this.chime(w));
        if (fx.has("shop")) for (let tt = s + 0.5; tt < e; tt += 1) add(tt, (w) => this.tick(w));
        if (fx.has("lowboom")) add(s + 0.2, (w) => this.lowboom(w));
        if (fx.has("wish")) add(s + 0.4, (w) => this.wish(w));
        if (fx.has("coins")) add(s + 0.3, (w) => this.coins(w));
        if (fx.has("money")) add(s + 1.6, (w) => this.cash(w));
        if (fx.has("news")) { add(s, (w) => { this.beep(w, 0.15, 0.08); this.beep(w + 0.2, 0.15, 0.08); }); add(s + 0.5, (w, sk) => this.ambient(w, d - 0.5, sk, "babble"), d - 0.5); add(s, (w, sk) => this.ambient(w, d, sk, "static"), d); }
        if (fx.has("sting")) add(s + (fx.has("undead") ? d * (p.revealAt ?? 0.3) : 0.6), (w) => this.sting(w));
        if (fx.has("beep")) for (let tt = s + 0.3; tt < e - (fx.has("flatline") ? 1.6 : 0); tt += 0.8) add(tt, (w) => this.beep(w));
        if (fx.has("flatline")) add(e - 1.5, (w) => this.beep(w, 1.6, 0.1));
        if (fx.has("heartbeat")) for (let tt = s + 0.2, k = 0; tt < e; tt += Math.max(0.55, 0.95 - k * 0.07), k++) add(tt, (w) => this.heartbeat(w));
        if (fx.has("undead")) {
          const rv = s + d * (p.revealAt ?? 0.3);
          add(Math.max(s - 1.2, rv - 1.6), (w) => this.riser(w, Math.min(1.6, rv - Math.max(s - 1.2, rv - 1.6))));
          add(rv, (w) => { this.hit(w, 1); this.glitch(w + 0.05); });
        }
        if (fx.has("scream")) add(s + 0.4, (w) => this.scream(w));
        if (fx.has("shake")) add(s + 0.3, (w) => this.lowboom(w));
        if (fx.has("thunder")) add(s + 0.05, (w) => this.thunder(w));
        if (fx.has("end")) add(s + 0.1, (w) => this.toll(w));
      });
      ev.sort((a, b) => a.t - b.t);
      this.events = ev;
    }

    // ---------- transport ----------
    attachMedia(el, bus) {
      if (!this.ctx || el._wishSrc) return;
      el._wishSrc = this.ctx.createMediaElementSource(el); el._wishSrc.connect(bus);
    }
    setVoice(url) {
      if (this.voiceEl) { this.voiceEl.pause(); this.voiceEl = null; }
      if (!url) return;
      this.voiceEl = new Audio(); this.voiceEl.src = url; this.voiceEl.preload = "auto";
      if (this.ctx) this.attachMedia(this.voiceEl, this.voiceBus);
    }
    setMusic(url) {
      if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
      if (!url) return;
      this.musicEl = new Audio(); this.musicEl.src = url; this.musicEl.preload = "auto";
      if (this.ctx) this.attachMedia(this.musicEl, this.musicBus);
    }
    setLevels(s) {
      if (!this.ctx) return;
      const duck = this.voiceEl ? 0.6 : 1;
      this.musicBus.gain.value = s.musicVol * duck;
      this.sfxBus.gain.value = s.sfxVol;
      this.voiceBus.gain.value = s.voiceVol;
    }
    async play(from, voiceOffset = 0) {
      this.init();
      if (this.ctx.state !== "running") await this.ctx.resume();
      this.stop();
      const ctx = this.ctx;
      this.t0 = ctx.currentTime + 0.06; this.from = from; this.playing = true;
      this.startBeds(this.t0);
      // resume sustained events (pads, ambiences) that began before the seek point
      this.idx = 0;
      let bed = null;
      for (const e of this.events) {
        if (e.t >= from) break;
        this.idx++;
        if (e.bed) bed = e;
        else if (e.dur && e.t + e.dur > from + 0.1) e.fn(this.t0, from - e.t);
      }
      if (bed) bed.fn(this.t0);
      this.timer = setInterval(() => this.pump(), 40); this.pump();
      const media = (el, offset) => {
        if (!el) return;
        const at = from - offset;
        if (at >= 0) { try { el.currentTime = at; } catch (e) { /* not seekable yet */ } el.play().catch(() => {}); }
        else { el.currentTime = 0; this.mediaTimer = setTimeout(() => el.play().catch(() => {}), -at * 1000); }
      };
      media(this.voiceEl, voiceOffset);
      media(this.musicEl, 0);
    }
    pump() {
      const now = this.time(), horizon = now + 0.3;
      while (this.idx < this.events.length && this.events[this.idx].t < horizon) {
        const e = this.events[this.idx++];
        const when = this.t0 + (e.t - this.from);
        if (when < this.ctx.currentTime - 0.05) continue;
        e.fn(Math.max(when, this.ctx.currentTime), 0);
      }
    }
    time() { return this.ctx ? this.ctx.currentTime - this.t0 + this.from : 0; }
    stop() {
      clearInterval(this.timer); clearTimeout(this.mediaTimer); this.playing = false;
      for (const n of this.live) { try { n.stop(); } catch (e) { /* already stopped */ } }
      this.live.clear(); this.droneG = null;
      if (this.voiceEl) this.voiceEl.pause();
      if (this.musicEl) this.musicEl.pause();
    }
  }

  window.WishAudio = WishAudio;
})();
