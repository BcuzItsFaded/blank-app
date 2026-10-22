/*
 * 1080×1920 canvas renderer. Everything is a pure function of time t (no per-frame state),
 * so scrubbing, seeking and recording always produce identical frames.
 *
 * Layers per scene (back → front): blurred panel backdrop (slow parallax) → panel art (camera) →
 * subject depth layer (2.5D pop) → light / shadows / weather / particles → grade.
 * Frame: scene A/B transition → film grain + halftone + vignette → captions, title, subtitles.
 */
(function () {
  const W = 1080, H = 1920;
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const wobble = (t, s) => Math.sin(t * 1.3 + s) * 0.5 + Math.sin(t * 2.7 + s * 2.1) * 0.3 + Math.sin(t * 5.1 + s * 3.7) * 0.2;

  const CAMS = {
    push: { z: [1.0, 1.15], f: [[0.5, 0.5], [0.5, 0.47]] },
    "push-slow": { z: [1.0, 1.09], f: [[0.5, 0.5], [0.5, 0.5]] },
    pull: { z: [1.2, 1.02], f: [[0.5, 0.47], [0.5, 0.5]] },
    "pan-left": { z: [1.14, 1.16], f: [[0.66, 0.5], [0.34, 0.5]] },
    "pan-right": { z: [1.14, 1.16], f: [[0.34, 0.5], [0.66, 0.5]] },
    drift: { z: [1.05, 1.13], f: [[0.43, 0.52], [0.57, 0.48]] }
  };
  const TRANS = { cut: 0.08, flash: 0.36, glitch: 0.4, dip: 0.7, fade: 0.55, zoom: 0.5 };
  const ACCENT = /^(nightmares?|corpse|died|death|dead|buried|price|ill|wish(es)?|million|rich|love|kiddies|life)$/i;

  // Candle flicker: layered sines plus occasional gutters, deterministic in t.
  const flicker = t => {
    let f = 0.86 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.7 + 1) + 0.03 * Math.sin(t * 23.1 + 2);
    const gate = hash(Math.floor(t * 6));
    if (gate > 0.88) f -= 0.18 * Math.sin(((t * 6) % 1) * Math.PI);
    return clamp(f, 0.4, 1);
  };

  class Renderer {
    constructor(canvas) {
      this.cv = canvas; this.g = canvas.getContext("2d");
      this.A = mk(W, H); this.B = mk(W, H);
      this.panels = []; this.meta = []; this.sections = []; this.chunks = [];
      this.tinted = new Map(); this.settings = {}; this.project = {};
      this.prepStatic();
    }

    prepStatic() {
      this.grain = [0, 1, 2, 3].map(() => {
        const c = mk(360, 640), g = c.getContext("2d"), im = g.createImageData(360, 640);
        for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
        g.putImageData(im, 0, 0); return c;
      });
      const v = mk(W, H), vg = v.getContext("2d");
      const rg = vg.createRadialGradient(W / 2, H * 0.47, H * 0.22, W / 2, H * 0.47, H * 0.68);
      rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.7, "rgba(0,0,0,0.35)"); rg.addColorStop(1, "rgba(0,0,0,0.85)");
      vg.fillStyle = rg; vg.fillRect(0, 0, W, H); this.vignette = v;
      this.fogTex = [11, 29].map(seed => {
        const c = mk(512, 512), g = c.getContext("2d");
        for (let i = 0; i < 90; i++) {
          const x = hash(seed + i) * 512, y = hash(seed + i * 3.1) * 512, r = 40 + hash(seed + i * 7.7) * 120, a = 0.04 + hash(seed + i * 1.9) * 0.08;
          for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
            const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
            gr.addColorStop(0, `rgba(205,212,225,${a})`); gr.addColorStop(1, "rgba(205,212,225,0)");
            g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
          }
        }
        return c;
      });
      const ht = mk(10, 10), hg = ht.getContext("2d");
      hg.fillStyle = "#000"; hg.beginPath(); hg.arc(5, 5, 2.2, 0, Math.PI * 2); hg.fill();
      this.halftone = this.g.createPattern(ht, "repeat");
      const sl = mk(4, 6), sg = sl.getContext("2d"); sg.fillStyle = "rgba(0,0,0,0.55)"; sg.fillRect(0, 0, 4, 2);
      this.scan = this.g.createPattern(sl, "repeat");
    }

    camOf(p) {
      const c = typeof p.camera === "string" ? CAMS[p.camera] : p.camera;
      return c && c.z ? { z: c.z, f: c.f || [[0.5, 0.5], [0.5, 0.5]] } : CAMS.drift;
    }

    setPanels(canvases, meta) {
      this.meta = meta; this.tinted.clear();
      this.panels = canvases.map((src, i) => {
        const w = src.width, h = src.height;
        const fg = mk(w, h), fgc = fg.getContext("2d");
        fgc.drawImage(src, 0, 0);
        fgc.globalCompositeOperation = "destination-in";
        const lg = fgc.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.12, "#000"); lg.addColorStop(0.88, "#000"); lg.addColorStop(1, "rgba(0,0,0,0)");
        fgc.fillStyle = lg; fgc.fillRect(0, 0, w, h);
        // soft-blurred backdrop (ctx.filter where available, else repeated down/upscaling)
        const ar = 9 / 16, sw = Math.min(w, h * ar), sh = Math.min(h, sw / ar), bg = mk(270, 480), bgc = bg.getContext("2d");
        if ("filter" in bgc) {
          bgc.filter = "blur(14px) saturate(1.2)";
          bgc.drawImage(src, (w - sw) / 2, (h - sh) / 2, sw, sh, -40, -40, 350, 560);
          bgc.filter = "none";
        } else {
          const t1 = mk(27, 48), t2 = mk(90, 160);
          t1.getContext("2d").drawImage(src, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, 27, 48);
          t2.getContext("2d").drawImage(t1, 0, 0, 90, 160);
          bgc.drawImage(t2, 0, 0, 270, 480);
        }
        bgc.fillStyle = "rgba(0,0,0,0.5)"; bgc.fillRect(0, 0, 270, 480);
        // depth layer: the subject region the camera travels towards, radially masked
        const cam = this.camOf(meta[i] || {}), [fx, fy] = cam.f[1];
        const dp = mk(w, h), dc = dp.getContext("2d");
        dc.drawImage(src, 0, 0); dc.globalCompositeOperation = "destination-in";
        const r = Math.max(w, h) * 0.32, rg = dc.createRadialGradient(fx * w, fy * h, r * 0.35, fx * w, fy * h, r);
        rg.addColorStop(0, "#000"); rg.addColorStop(1, "rgba(0,0,0,0)");
        dc.fillStyle = rg; dc.fillRect(0, 0, w, h);
        return { src, fg, bg, depth: dp, w, h };
      });
    }

    tint(i, color) {
      const key = i + color;
      if (!this.tinted.has(key)) {
        const p = this.panels[i], c = mk(p.w, p.h), g = c.getContext("2d");
        g.drawImage(p.fg, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = color; g.fillRect(0, 0, p.w, p.h);
        g.globalCompositeOperation = "destination-in"; g.drawImage(p.fg, 0, 0);
        this.tinted.set(key, c);
      }
      return this.tinted.get(key);
    }

    // ---------------------------------------------------------------- scene
    scene(c, i, t) {
      const g = c.getContext("2d"), p = this.meta[i], pc = this.panels[i], S = this.settings;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      if (!p || !pc) return;
      const d = p.end - p.start, lt = t - p.start, u = lt / d, fx = p.fxSet;
      const cam = this.camOf(p);
      const k = ease(u) + (u < 0 ? u * 0.4 : u > 1 ? (u - 1) * 0.4 : 0);
      let z = lerp(cam.z[0], cam.z[1], k);
      const fX = lerp(cam.f[0][0], cam.f[1][0], k), fY = lerp(cam.f[0][1], cam.f[1][1], k);

      const rvT = d * (p.revealAt ?? 0.3), since = lt - rvT, undead = fx.has("undead");
      if (undead && since > 0) z += 0.16 * easeOut(since / 0.35);
      if (fx.has("heartbeat")) { const ph = (lt % 0.85) / 0.85; z *= 1 + 0.008 * Math.exp(-ph * 9); }

      let amp = 0;
      if (fx.has("shake")) amp += 7 + 6 * Math.max(0, Math.sin(lt * 2.1));
      if (undead && since > 0) amp += 30 * Math.exp(-since * 2.6);
      if (fx.has("thunder") || fx.has("lightning")) amp += 18 * Math.exp(-Math.max(0, lt - 0.05) * 3);
      if (p.n === 1 || fx.has("title")) amp += 10 * Math.exp(-lt * 4);
      amp *= S.shake ?? 1;
      const sx = (Math.sin(t * 41.3) + Math.sin(t * 27.1 + 1)) * amp * 0.5 + wobble(t * 0.6, 1) * 7;
      const sy = (Math.sin(t * 37.9 + 2) + Math.sin(t * 19.3)) * amp * 0.5 + wobble(t * 0.5, 4) * 6;

      // panel placement (always fills width; band height = fill × frame height)
      const base = Math.max(W / pc.w, (H * (p.fill || S.fill || 0.42)) / pc.h) * 1.04;
      const s = base * z, dw = pc.w * s, dh = pc.h * s;
      let left = clamp(W / 2 - fX * dw, W - dw, 0);
      const cy = H * 0.45;
      let top = dh < H ? cy - dh / 2 + (0.5 - fY) * dh * 0.3 : clamp(cy - fY * dh, H - dh, 0);

      // background (parallax: moves 30% as much and counter to the pan)
      const bs = Math.max(W / 270, H / 480) * (1.15 + (z - 1) * 0.35);
      const bx = (W - 270 * bs) / 2 + (fX - 0.5) * 90 + sx * 0.3, by = (H - 480 * bs) / 2 + (fY - 0.5) * 60 + sy * 0.3;
      g.drawImage(pc.bg, bx, by, 270 * bs, 480 * bs);
      left += sx; top += sy;

      // chromatic split around the undead reveal and on TV glitches
      let split = 0;
      if (undead && since > -0.05) split = 16 * Math.exp(-Math.max(0, since) * 2) + 3;
      if (fx.has("tv")) split = Math.max(split, hash(Math.floor(t * 12)) > 0.8 ? 10 : 2);
      g.drawImage(pc.fg, left, top, dw, dh);
      if (split) {
        g.globalCompositeOperation = "screen"; g.globalAlpha = 0.5;
        g.drawImage(this.tint(i, "#ff2020"), left + split, top, dw, dh);
        g.drawImage(this.tint(i, "#20e0ff"), left - split, top, dw, dh);
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      }
      // depth pop: subject layer scales a touch faster than the plate → 2.5D parallax
      if (S.depth) {
        const dz = 1 + 0.035 * ease(u), ox = left + cam.f[1][0] * dw, oy = top + cam.f[1][1] * dh;
        const dx = (cam.f[1][0] - fX) * dw * 0.02;
        g.drawImage(pc.depth, ox - cam.f[1][0] * dw * dz + dx, oy - cam.f[1][1] * dh * dz, dw * dz, dh * dz);
      }

      const L = p.light ? [left + p.light[0] * dw, top + p.light[1] * dh] : [W / 2, H * 0.4];
      this.fx(g, p, fx, t, lt, d, u, L, { left, top, dw, dh, rvT, since });
    }

    fx(g, p, fx, t, lt, d, u, [lx, ly], box) {
      const S = this.settings, fl = flicker(t);
      // ---- grades
      const grade = (op, color, a) => { g.globalCompositeOperation = op; g.globalAlpha = a; g.fillStyle = color; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; };
      if (fx.has("warm")) grade("soft-light", "#ff8a3a", 0.45);
      if (fx.has("cold")) { grade("saturation", "#777", 0.35); grade("soft-light", "#2f6fb0", 0.55); }
      if (fx.has("gold")) grade("soft-light", "#ffb020", 0.3);
      if (fx.has("undead-grade")) { grade("saturation", "#777", 0.3); grade("soft-light", "#3f8f4a", 0.45); }

      // ---- candle light + flicker-driven moving shadows
      if (fx.has("candle")) {
        const jx = lx + Math.sin(t * 3.1) * 10, jy = ly + Math.sin(t * 4.3) * 6, R = 900 * (0.85 + 0.2 * fl);
        const dark = g.createRadialGradient(jx, jy, 60, jx, jy, R);
        dark.addColorStop(0, "rgba(0,0,0,0)"); dark.addColorStop(0.45, `rgba(0,0,0,${0.12 + (1 - fl) * 0.2})`); dark.addColorStop(1, `rgba(0,0,0,${0.6 + (1 - fl) * 0.3})`);
        g.fillStyle = dark; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = "lighter";
        const glow = g.createRadialGradient(jx, jy, 0, jx, jy, 420 * fl);
        glow.addColorStop(0, `rgba(255,170,70,${0.45 * fl})`); glow.addColorStop(0.3, `rgba(255,120,40,${0.18 * fl})`); glow.addColorStop(1, "rgba(255,90,20,0)");
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        // embers
        for (let k = 0; k < 18; k++) {
          const life = 2.2 + hash(k) * 1.5, ph = ((t + hash(k * 3) * life) % life) / life;
          const ex = jx + (hash(k * 7) - 0.5) * 120 + Math.sin(t * 2 + k) * 30 * ph, ey = jy - ph * 520;
          g.fillStyle = `rgba(255,${150 + hash(k) * 80},60,${(1 - ph) * 0.8})`;
          g.beginPath(); g.arc(ex, ey, 2 + hash(k * 5) * 3, 0, 7); g.fill();
        }
        g.globalCompositeOperation = "source-over";
        g.fillStyle = `rgba(0,0,0,${(1 - fl) * 0.35})`; g.fillRect(0, 0, W, H);
      }

      // ---- sweeping shadow (something passing the light)
      if (fx.has("shadow")) {
        g.save(); g.translate(W / 2, H / 2); g.rotate(-0.38);
        const x = lerp(-1500, 1500, ease(u));
        const sg = g.createLinearGradient(x - 380, 0, x + 380, 0);
        sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(0.5, "rgba(0,0,0,0.55)"); sg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = sg; g.fillRect(-2000, -2000, 4000, 4000);
        g.restore();
        const tg = g.createLinearGradient(0, 0, 0, H * 0.5);
        tg.addColorStop(0, `rgba(0,0,0,${0.35 + 0.15 * Math.sin(t * 1.7)})`); tg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = tg; g.fillRect(0, 0, W, H);
      }

      // ---- rain
      if (fx.has("rain")) {
        g.strokeStyle = "rgba(190,210,240,0.35)"; g.lineWidth = 2; g.beginPath();
        for (let k = 0; k < 160; k++) {
          const sp = 2400 + hash(k) * 900, len = 50 + hash(k * 2) * 90;
          const y = ((t * sp + hash(k * 3) * 5000) % (H + 300)) - 150, x = hash(k * 5) * W * 1.3 - y * 0.18;
          g.moveTo(x, y); g.lineTo(x - len * 0.18, y + len);
        }
        g.stroke();
        g.fillStyle = "rgba(40,60,90,0.18)"; g.fillRect(0, 0, W, H);
      }

      // ---- dust motes in the light
      if (fx.has("dust")) {
        g.globalCompositeOperation = "lighter";
        for (let k = 0; k < 70; k++) {
          const x = (hash(k) * W + Math.sin(t * 0.3 + k) * 60 + t * 12) % W, y = (hash(k * 9) * H - t * (8 + hash(k) * 14) + H * 4) % H;
          const a = 0.25 + 0.25 * Math.sin(t * 2 + k * 1.7);
          g.fillStyle = `rgba(255,225,170,${a})`; g.beginPath(); g.arc(x, y, 1.5 + hash(k * 4) * 2.5, 0, 7); g.fill();
        }
        g.globalCompositeOperation = "source-over";
      }

      // ---- golden wish glow + rising sparkles
      if (fx.has("gold")) {
        g.globalCompositeOperation = "lighter";
        const pulse = 0.75 + 0.25 * Math.sin(t * 5);
        const gg = g.createRadialGradient(lx, ly, 0, lx, ly, 520);
        gg.addColorStop(0, `rgba(255,215,90,${0.5 * pulse})`); gg.addColorStop(1, "rgba(255,170,0,0)");
        g.fillStyle = gg; g.fillRect(0, 0, W, H);
        for (let k = 0; k < 36; k++) {
          const life = 1.6 + hash(k) * 1.4, ph = ((lt + hash(k * 2) * life) % life) / life;
          const x = lx + (hash(k * 3) - 0.5) * 700 + Math.sin(lt * 3 + k) * 20, y = ly + 200 - ph * 900;
          this.sparkle(g, x, y, (6 + hash(k * 5) * 14) * Math.sin(ph * Math.PI), `rgba(255,236,150,${Math.sin(ph * Math.PI)})`);
        }
        g.globalCompositeOperation = "source-over";
      }

      // ---- money rain
      if (fx.has("money")) this.money(g, lt);

      // ---- warm bokeh
      if (fx.has("bokeh")) {
        g.globalCompositeOperation = "lighter";
        for (let k = 0; k < 22; k++) {
          const r = 30 + hash(k) * 70, x = (hash(k * 2) * W + Math.sin(t * 0.4 + k) * 50) % W, y = (hash(k * 3) * H * 1.2 - t * (20 + hash(k) * 30) + H * 6) % (H * 1.2) - 100;
          const a = 0.1 + 0.1 * Math.sin(t * 1.5 + k);
          const bg = g.createRadialGradient(x, y, 0, x, y, r);
          bg.addColorStop(0, `rgba(255,${150 + hash(k) * 70},110,${a})`); bg.addColorStop(0.8, `rgba(255,140,90,${a * 0.6})`); bg.addColorStop(1, "rgba(255,140,90,0)");
          g.fillStyle = bg; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        g.globalCompositeOperation = "source-over";
      }

      // ---- TV: scanlines, roll bar, brightness jitter
      if (fx.has("tv")) {
        g.fillStyle = this.scan; g.globalAlpha = 0.35; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
        const ry = ((t * 420) % (H + 400)) - 200, rb = g.createLinearGradient(0, ry - 120, 0, ry + 120);
        rb.addColorStop(0, "rgba(180,220,255,0)"); rb.addColorStop(0.5, "rgba(180,220,255,0.12)"); rb.addColorStop(1, "rgba(180,220,255,0)");
        g.fillStyle = rb; g.fillRect(0, ry - 120, W, 240);
        g.fillStyle = `rgba(120,170,255,${0.06 + hash(Math.floor(t * 20)) * 0.08})`; g.fillRect(0, 0, W, H);
      }

      // ---- hospital monitor pulse
      if (fx.has("beep")) {
        const flat = fx.has("flatline") && lt > d - 1.5;
        const ph = ((lt - 0.3) % 0.8 + 0.8) % 0.8, a = flat ? 0.12 + 0.05 * Math.sin(t * 20) : 0.14 * Math.exp(-ph * 12);
        g.fillStyle = `rgba(80,255,170,${a})`; g.globalCompositeOperation = "soft-light"; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = "source-over";
        if (flat) { g.fillStyle = `rgba(0,0,0,${clamp((lt - (d - 1.5)) / 1.5) * 0.35})`; g.fillRect(0, 0, W, H); }
      }

      // ---- pulsing red dark glow
      if (fx.has("darkglow")) {
        const a = 0.35 + 0.2 * Math.sin(t * 4.5);
        const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.45, H * 0.65);
        rg.addColorStop(0, "rgba(120,0,0,0)"); rg.addColorStop(1, `rgba(110,0,0,${a})`);
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
      }

      // ---- undead reveal: dread build → flash → cold green rot
      if (fx.has("undead")) {
        const { rvT, since } = box;
        if (since < 0) { g.fillStyle = `rgba(0,0,0,${clamp(lt / rvT) * 0.45})`; g.fillRect(0, 0, W, H); }
        else {
          g.globalCompositeOperation = "color"; g.globalAlpha = clamp(since / 0.4) * 0.45;
          g.fillStyle = "#3c8a50"; g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
          const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.1, W / 2, H * 0.45, H * 0.6);
          rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(0,20,5,0.6)");
          g.fillStyle = rg; g.fillRect(0, 0, W, H);
          g.fillStyle = `rgba(230,255,235,${Math.exp(-since * 7)})`; g.fillRect(0, 0, W, H);
        }
      }

      // ---- fog (two drifting layers at different depths)
      if (fx.has("fog") && S.fog > 0) {
        // rendered at half resolution into one buffer, then screened over the scene once
        const fc = this.fogC || (this.fogC = mk(W / 2, H / 2)), f = fc.getContext("2d");
        f.clearRect(0, 0, W / 2, H / 2);
        [[0, 18, 1.2, 0.55], [1, -32, 1.7, 0.45]].forEach(([n, speed, scale, a]) => {
          const tw = 512 * scale, off = ((((t * speed) / 2) % tw) + tw) % tw;
          f.globalAlpha = Math.min(1, a * S.fog * (0.85 + 0.15 * Math.sin(t * 0.7 + n)));
          for (let x = -tw + off; x < W / 2; x += tw) for (let y = H * 0.125 + n * 100; y < H / 2; y += tw) f.drawImage(this.fogTex[n], x, y, tw, tw);
        });
        g.globalCompositeOperation = "screen"; g.drawImage(fc, 0, 0, W, H);
        g.globalCompositeOperation = "source-over";
      }

      // ---- lightning double-flash
      if (fx.has("lightning")) {
        const a = Math.max(Math.exp(-Math.abs(lt - 0.06) * 30), 0.8 * Math.exp(-Math.abs(lt - 0.24) * 25));
        g.fillStyle = `rgba(220,230,255,${a * 0.85})`; g.fillRect(0, 0, W, H);
      }
    }

    sparkle(g, x, y, r, color) {
      if (r <= 0.5) return;
      g.fillStyle = color; g.beginPath();
      g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
      g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
    }

    money(g, lt) {
      for (let k = 0; k < 54; k++) {
        const depth = 0.6 + hash(k * 1.3) * 0.9, delay = hash(k * 2.1) * 2.2;
        if (lt < delay) continue;
        const sp = (300 + hash(k * 3.7) * 300) * depth, y = -160 + ((lt - delay) * sp) % (H + 320);
        const x = hash(k * 5.3) * W + Math.sin(lt * (1 + hash(k)) + k) * 80 * depth;
        const rot = hash(k * 7.1) * 6 + lt * (hash(k * 8.3) - 0.5) * 3, flip = Math.cos(lt * (2 + hash(k * 9.7) * 4) + k);
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(depth, depth * flip);
        if (k % 4 === 0) {
          const cg = g.createLinearGradient(-26, -26, 26, 26);
          cg.addColorStop(0, "#fff3a0"); cg.addColorStop(0.5, "#e2a91c"); cg.addColorStop(1, "#8a5a08");
          g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill();
          g.strokeStyle = "#7a4a00"; g.lineWidth = 3; g.stroke();
        } else {
          g.fillStyle = flip > 0 ? "#7fae68" : "#5d8a4c"; g.fillRect(-70, -32, 140, 64);
          g.strokeStyle = "#2c4a24"; g.lineWidth = 4; g.strokeRect(-64, -26, 128, 52);
          g.fillStyle = "#b9d8a6"; g.beginPath(); g.ellipse(0, 0, 18, 22, 0, 0, 7); g.fill();
          g.fillStyle = "#2c4a24"; g.font = "bold 26px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 0, 1);
        }
        g.restore();
      }
      // floor glint
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 14; k++) {
        const ph = (lt * 0.9 + hash(k)) % 1;
        this.sparkle(g, hash(k * 4) * W, H * 0.3 + hash(k * 6) * H * 0.4, 22 * Math.sin(ph * Math.PI), `rgba(255,240,170,${Math.sin(ph * Math.PI)})`);
      }
      g.globalCompositeOperation = "source-over";
    }

    // ---------------------------------------------------------------- frame
    frame(t) {
      const g = this.g, P = this.meta, S = this.settings;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      if (!P.length || !this.panels.length) return;
      let i = 0;
      while (i < P.length - 1 && t >= P[i + 1].start) i++;
      let a = i, b = -1, k = 0;
      const tw = j => TRANS[P[j].transitionType] || 0.5;
      if (i < P.length - 1 && t > P[i].end - tw(i + 1) / 2) { a = i; b = i + 1; }
      else if (i > 0 && t < P[i].start + tw(i) / 2) { a = i - 1; b = i; }
      if (b >= 0) { const w = tw(b), E = P[b].start; k = clamp((t - (E - w / 2)) / w); }

      this.scene(this.A, a, t);
      if (b < 0) g.drawImage(this.A, 0, 0);
      else {
        this.scene(this.B, b, t);
        this.transition(P[b].transitionType, k, t);
      }
      this.overlays(t, i);
    }

    transition(type, k, t) {
      const g = this.g, A = this.A, B = this.B;
      switch (type) {
        case "cut": g.drawImage(k < 0.5 ? A : B, 0, 0); break;
        case "flash": {
          g.drawImage(k < 0.5 ? A : B, 0, 0);
          g.fillStyle = `rgba(255,255,255,${Math.pow(1 - Math.abs(k - 0.5) * 2, 1.5)})`; g.fillRect(0, 0, W, H);
          break;
        }
        case "dip":
          g.globalAlpha = k < 0.5 ? 1 - k * 2 : k * 2 - 1; g.drawImage(k < 0.5 ? A : B, 0, 0); g.globalAlpha = 1; break;
        case "glitch": {
          const src = k < 0.5 ? A : B, strength = 1 - Math.abs(k - 0.5) * 2, seed = Math.floor(t * 30);
          let y = 0;
          while (y < H) {
            const h = 20 + hash(seed + y) * 140, dx = (hash(seed * 3 + y) - 0.5) * 260 * strength;
            g.drawImage(src, 0, y, W, h, dx, y, W, h); y += h;
          }
          g.globalCompositeOperation = "screen"; g.globalAlpha = 0.35 * strength;
          g.drawImage(src === A ? B : A, 18 * strength, 0);
          g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
          break;
        }
        case "zoom": {
          g.drawImage(B, 0, 0);
          const z = 1 + 0.35 * ease(k);
          g.globalAlpha = 1 - ease(k);
          g.drawImage(A, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z);
          g.globalAlpha = 1; break;
        }
        default:
          g.drawImage(A, 0, 0); g.globalAlpha = ease(k); g.drawImage(B, 0, 0); g.globalAlpha = 1;
      }
    }

    overlays(t, i) {
      const g = this.g, S = this.settings, P = this.meta, p = P[i];
      // film texture
      if (S.halftone > 0) { g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.22 * S.halftone; g.fillStyle = this.halftone; g.fillRect(0, 0, W, H); }
      if (S.grain > 0) { g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.12 * S.grain; g.drawImage(this.grain[Math.floor(t * 24) % 4], 0, 0, W, H); }
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      g.drawImage(this.vignette, 0, 0);
      // gate weave: subtle global exposure breathing
      g.fillStyle = `rgba(0,0,0,${0.04 + 0.04 * Math.sin(t * 9.1) * Math.sin(t * 3.3)})`; g.fillRect(0, 0, W, H);

      const titleOn = S.titleCard && p && p.fxSet.has("title");
      if (titleOn) this.title(t - p.start, p.end - p.start);
      else if (S.captions) this.caption(t);
      if (S.watermark && !(p && p.fxSet.has("end"))) this.watermark(t);
      if (S.subtitles) this.subtitles(t);
    }

    title(lt, d) {
      const g = this.g, P = this.project, text = P.title || "THE WISH";
      const out = clamp((d - 0.25 - lt) / 0.35);
      g.save(); g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.font = "190px Creepster, Impact, sans-serif";
      const full = g.measureText(text).width;
      let x = W / 2 - full / 2;
      const y = 350;
      [...text].forEach((ch, j) => {
        const w = g.measureText(ch).width, start = 0.15 + j * 0.09, a = clamp((lt - start) / 0.25) * out;
        const fl = hash(Math.floor(lt * 18) + j) > 0.93 ? 0.4 : 1;
        if (a > 0) {
          const sc = 1 + 0.6 * (1 - easeOut((lt - start) / 0.3));
          g.save(); g.translate(x + w / 2, y + Math.sin(lt * 2 + j) * 4); g.scale(sc, sc); g.globalAlpha = a * fl;
          g.shadowColor = "rgba(255,0,0,0.8)"; g.shadowBlur = 40;
          g.lineWidth = 14; g.strokeStyle = "#1a0000"; g.strokeText(ch, 0, 0);
          const gr = g.createLinearGradient(0, -150, 0, 0); gr.addColorStop(0, "#ff4a3a"); gr.addColorStop(1, "#8a0008");
          g.fillStyle = gr; g.fillText(ch, 0, 0);
          g.restore();
        }
        x += w;
      });
      // drips
      g.fillStyle = "#8a0008"; g.globalAlpha = out;
      for (let j = 0; j < 7; j++) {
        const dx = W / 2 - full / 2 + full * (0.08 + j * 0.14), len = clamp((lt - 0.8 - j * 0.1) / 1.5) * (40 + hash(j) * 90);
        if (len > 0) { g.fillRect(dx - 4, y - 8, 8, len); g.beginPath(); g.arc(dx, y - 8 + len, 7, 0, 7); g.fill(); }
      }
      g.globalAlpha = clamp((lt - 1.1) / 0.4) * out;
      g.font = "40px 'Special Elite', 'Courier New', monospace"; g.fillStyle = "#f2e6c8";
      g.shadowColor = "#000"; g.shadowBlur = 12;
      g.fillText(P.tagline || "", W / 2, y + 80);
      g.restore();
    }

    caption(t) {
      const sec = this.sections.find(s => t >= s.start && t < s.end);
      if (!sec || !sec.heading) return;
      const g = this.g, lt = t - sec.start, a = clamp(lt / 0.2) * clamp((sec.end - t) / 0.25);
      if (a <= 0) return;
      const sc = 1 + 0.3 * (1 - easeOut(lt / 0.25));
      g.save(); g.translate(W / 2, 250); g.rotate(-0.03); g.scale(sc, sc); g.globalAlpha = a;
      g.font = "64px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      const text = sec.heading.toUpperCase(), w = g.measureText(text).width + 70;
      g.fillStyle = "#000"; g.fillRect(-w / 2 + 10, -48 + 10, w, 96);
      g.fillStyle = "#ffd400"; g.fillRect(-w / 2, -48, w, 96);
      g.lineWidth = 5; g.strokeStyle = "#000"; g.strokeRect(-w / 2, -48, w, 96);
      g.fillStyle = "#000"; g.fillText(text, 0, 4);
      g.restore();
    }

    watermark(t) {
      const g = this.g, name = this.project.channel || "";
      g.save(); g.globalAlpha = 0.78; g.font = "34px Anton, Impact, sans-serif"; g.textBaseline = "middle";
      const w = g.measureText(name).width, x = W - w - 60, y = 130;
      g.fillStyle = "#e01b24"; g.beginPath(); g.roundRect ? g.roundRect(x - 64, y - 20, 50, 40, 10) : g.rect(x - 64, y - 20, 50, 40); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x - 46, y - 10); g.lineTo(x - 28, y); g.lineTo(x - 46, y + 10); g.fill();
      g.shadowColor = "#000"; g.shadowBlur = 10; g.fillText(name, x, y + 2);
      g.restore();
    }

    subtitles(t) {
      const c = this.chunks.find(c => t >= c.start - 0.05 && t < c.end + 0.12) ;
      if (!c) return;
      const g = this.g, S = this.settings, y = H * (S.subtitleY || 0.7);
      const pop = 1 + 0.22 * (1 - easeOut((t - c.start + 0.05) / 0.14));
      g.save(); g.textAlign = "left"; g.textBaseline = "middle"; g.lineJoin = "round";
      let size = 104; g.font = `${size}px Anton, Impact, sans-serif`;
      const words = c.words.map(w => w.w.toUpperCase()), space = size * 0.28;
      let total = words.reduce((s, w) => s + g.measureText(w).width, 0) + space * (words.length - 1);
      if (total > W - 120) { size *= (W - 120) / total; g.font = `${size}px Anton, Impact, sans-serif`; total = (W - 120); }
      g.translate(W / 2, y); g.scale(pop, pop);
      let x = -total / 2;
      c.words.forEach((w, j) => {
        const txt = words[j], ww = g.measureText(txt).width, active = t >= w.start && t < w.end + 0.05;
        const clean = w.w.replace(/[^\w']/g, "");
        g.save(); g.translate(x + ww / 2, 0);
        if (active) g.scale(1.08, 1.08);
        g.lineWidth = size * 0.17; g.strokeStyle = "#000"; g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
        g.strokeText(txt, -ww / 2, 0);
        g.shadowBlur = 0; g.shadowOffsetY = 0;
        g.fillStyle = active ? (ACCENT.test(clean) ? "#ff2a2a" : "#ffd400") : t > w.end ? "#ffffff" : "#e8e8e8";
        g.fillText(txt, -ww / 2, 0);
        g.restore();
        x += ww + space;
      });
      g.restore();
    }
  }

  Renderer.W = W; Renderer.H = H;
  window.WishRenderer = Renderer;
})();
