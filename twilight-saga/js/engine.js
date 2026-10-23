/*
 * Timeline + compositor: one scene full-screen at a time (16:9, 1920×1080), crossfades between
 * scenes, camera moves, effects, word-synced subtitles and the storyboard-style scene caption.
 * Every frame is a pure function of t, so preview, scrubbing and offline rendering always match.
 */
(function () {
  const W = 1920, H = 1080;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = x => Math.pow(clamp(x), 2.2);
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const TRANS = 0.8;

  class Engine {
    constructor(canvas, data) {
      this.cv = canvas; this.g = canvas.getContext("2d");
      this.A = mk(); this.B = mk();
      this.d = data;                 // {timing, plates, images, sprites}
      this.sections = data.timing.sections;
      this.duration = data.timing.duration;
      this.chunks = this.sections.flatMap((s, i) => chunkWords(s.words).map(c => Object.assign(c, { sec: i })));
    }

    // ---------------------------------------------------------------- helpers for a scene
    ctx(sec, lt, g) {
      const meta = this.d.plates[sec.plate] || { box: [0, 0, W, H], sprites: {}, occluders: {} };
      const [bx, by, bw, bh] = meta.box;
      const words = sec.words.map(([w, s, e]) => [w, s - sec.start, e - sec.start]);
      const S = {
        g, lt, t: sec.start + lt, dur: sec.end - sec.start, sec, W, H,
        speech: [sec.speech[0] - sec.start, sec.speech[1] - sec.start],
        P: (u, v) => [bx + u * bw, by + v * bh],
        X: u => bx + u * bw, Y: v => by + v * bh, ph: bh,
        cue: (word, n = 1, edge = 0) => {   // local time of the n-th word starting with `word`
          const w = word.toLowerCase(); let k = 0;
          for (const [x, s, e] of words) if (x.toLowerCase().replace(/[^a-z']/g, "").startsWith(w) && ++k === n) return edge ? e : s;
          console.warn("cue not found", word, sec.id); return S.dur * 0.5;
        },
        k: (a, b) => ease((lt - a) / (b - a)), ko: (a, b) => easeOut((lt - a) / (b - a)), lin: (a, b) => clamp((lt - a) / (b - a)),
        lerp, ease, easeOut, easeIn, clamp, hash,
        img: name => this.d.sprites[name],
        sprite: (name, o = {}) => this.sprite(g, meta, name, o),
        occluder: name => { const o = meta.occluders[name]; const im = this.d.sprites[name]; if (o && im) g.drawImage(im, o.x, o.y, o.w, o.h); },
        spriteBox: name => meta.sprites[name] || meta.occluders[name],
        char: (spec, p) => Rig.draw(g, typeof spec === "string" ? Rig.CAST[spec] : spec, Rig.pose(Object.assign({ t: sec.start + lt }, p))),
        fx: FX(g, sec.start + lt),
      };
      return S;
    }

    sprite(g, meta, name, o) {
      const box = meta.sprites[name], im = this.d.sprites[name];
      if (!box || !im) return;
      const s = o.scale ?? 1, cx = box.x + box.w / 2 + (o.dx || 0), cy = box.y + box.h + (o.dy || 0); // anchor bottom-center
      g.save(); g.globalAlpha = o.alpha ?? 1;
      g.translate(cx, cy); g.rotate(o.rot || 0); g.scale(s * (o.flip ? -1 : 1) * (o.sx || 1), s * (o.sy || 1));
      if (o.warp) {   // gentle mesh sway in vertical strips (fur/banners) — real deformation, not a zoom
        const n = 24, sw = box.w / n;
        for (let i = 0; i < n; i++) {
          const k = i / n, off = Math.sin(o.warp.t * o.warp.f + k * o.warp.k) * o.warp.a * (o.warp.fromTop ? 1 : k);
          g.drawImage(im, i * (im.width / n), 0, im.width / n + 1, im.height, -box.w / 2 + i * sw, -box.h + off, sw + 1, box.h);
        }
      } else g.drawImage(im, -box.w / 2, -box.h, box.w, box.h);
      g.restore();
    }

    // ---------------------------------------------------------------- frame
    scene(canvas, i, t) {
      const g = canvas.getContext("2d"), sec = this.sections[i], spec = window.SCENES[sec.id];
      const lt = t - sec.start;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      sec.plate = spec.plate;
      const S = this.ctx(sec, lt, g);
      // camera
      const cam = spec.cam ? spec.cam(S) : { x: 0, y: 0, z: 1.02 };
      const z = Math.max(1, cam.z || 1);
      const mx = (W * (z - 1)) / 2, my = (H * (z - 1)) / 2;
      const cx = clamp(cam.x || 0, -mx, mx), cy = clamp(cam.y || 0, -my, my);
      g.save();
      g.translate(W / 2 - cx, H / 2 - cy); g.scale(z, z); g.translate(-W / 2, -H / 2);
      if (cam.shake) g.translate(Math.sin(t * 61) * cam.shake, Math.cos(t * 47) * cam.shake);
      const plate = this.d.images[spec.plate];
      if (plate) g.drawImage(plate, 0, 0, W, H);
      spec.draw(S);
      g.restore();
      if (spec.overlay) spec.overlay(S);   // screen-space effects (flash, vignette, texts)
    }

    frame(t) {
      const g = this.g, n = this.sections.length;
      t = clamp(t, 0, this.duration - 0.001);
      let i = 0; while (i < n - 1 && t >= this.sections[i + 1].start) i++;
      let a = i, b = -1, k = 0;
      if (i < n - 1 && t > this.sections[i].end - TRANS / 2) { a = i; b = i + 1; }
      else if (i > 0 && t < this.sections[i].start + TRANS / 2) { a = i - 1; b = i; }
      if (b >= 0) k = clamp((t - (this.sections[b].start - TRANS / 2)) / TRANS);
      this.scene(this.A, a, t);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      g.drawImage(this.A, 0, 0);
      if (b >= 0) { this.scene(this.B, b, t); g.globalAlpha = ease(k); g.drawImage(this.B, 0, 0); g.globalAlpha = 1; }
      this.caption(t, i);
      this.subtitles(t);
    }

    caption(t, i) {   // "Scene N: …" box styled like the storyboard headers
      const sec = this.sections[i], lt = t - sec.start, spec = window.SCENES[sec.id];
      if (!spec.caption) return;
      const a = clamp(lt / 0.4) * clamp((4.2 - lt) / 0.5);
      if (a <= 0) return;
      const g = this.g, [lab, txt] = spec.caption;
      g.save(); g.globalAlpha = a; g.translate(40, 34 - (1 - easeOut(lt / 0.5)) * 30);
      g.font = "700 44px 'Patrick Hand', 'Comic Sans MS', cursive"; const w1 = g.measureText(lab).width + 36;
      g.font = "400 40px 'Patrick Hand', 'Comic Sans MS', cursive"; const w2 = g.measureText(txt).width + 40;
      g.fillStyle = "#fff"; g.fillRect(0, 0, w1 + w2, 66); g.lineWidth = 5; g.strokeStyle = "#111"; g.strokeRect(0, 0, w1 + w2, 66);
      g.beginPath(); g.moveTo(w1, 0); g.lineTo(w1, 66); g.stroke();
      g.fillStyle = "#111"; g.textBaseline = "middle";
      g.font = "700 44px 'Patrick Hand', 'Comic Sans MS', cursive"; g.fillText(lab, 18, 35);
      g.font = "400 40px 'Patrick Hand', 'Comic Sans MS', cursive"; g.fillText(txt, w1 + 20, 35);
      g.restore();
    }

    subtitles(t) {
      const c = this.chunks.find(c => t >= c.start - 0.05 && t < c.end + 0.25);
      if (!c) return;
      const g = this.g;
      g.save(); g.textBaseline = "middle"; g.lineJoin = "round";
      let size = 60; g.font = `800 ${size}px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif`;
      const sp = size * 0.26, ws = c.words.map(w => w[0]);
      let total = ws.reduce((s, w) => s + g.measureText(w).width, 0) + sp * (ws.length - 1);
      if (total > W - 240) { size *= (W - 240) / total; g.font = `800 ${size}px 'Baloo 2', sans-serif`; total = W - 240; }
      let x = (W - total) / 2; const y = H - 92;
      // soft band for legibility
      g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.roundRect ? g.roundRect(x - 28, y - size * 0.62, total + 56, size * 1.24, 20) : g.rect(x - 28, y - size * 0.62, total + 56, size * 1.24); g.fill();
      c.words.forEach(([w, s, e]) => {
        const active = t >= s && t < e + 0.06, ww = g.measureText(w).width;
        g.lineWidth = size * 0.2; g.strokeStyle = "#111"; g.strokeText(w, x, y);
        g.fillStyle = active ? "#ffd53d" : "#ffffff"; g.fillText(w, x, y);
        x += ww + sp;
      });
      g.restore();
    }
  }

  function chunkWords(words) {
    const out = []; let c = [];
    for (const w of words) {
      c.push(w);
      const len = c.map(x => x[0]).join(" ").length;
      if (/[.!?]$/.test(w[0]) || (/[,;:—]$/.test(w[0]) && c.length >= 3) || c.length >= 7 || len >= 38) { out.push(c); c = []; }
    }
    if (c.length) out.push(c);
    return out.map(ws => ({ words: ws, start: ws[0][1], end: ws[ws.length - 1][2] }));
  }

  // ---------------------------------------------------------------- effects library
  function FX(g, t) {
    return {
      rain(n = 260, slant = 0.22, alpha = 0.45, speed = 2400, ground = 1000) {
        g.save(); g.strokeStyle = `rgba(210,225,245,${alpha})`; g.lineWidth = 2.2; g.beginPath();
        for (let i = 0; i < n; i++) {
          const sp = speed * (0.8 + hash(i) * 0.5), len = 40 + hash(i * 2) * 60;
          const y = ((t * sp + hash(i * 3) * 4000) % (H + 200)) - 100, x = hash(i * 5) * (W + 400) - 200 - y * slant;
          g.moveTo(x, y); g.lineTo(x - len * slant, y + len);
        }
        g.stroke();
        g.fillStyle = `rgba(220,235,255,${alpha * 0.8})`;      // splashes
        for (let i = 0; i < n / 5; i++) {
          const ph = (t * 3 + hash(i * 7)) % 1, x = hash(i * 9 + Math.floor(t * 3 + hash(i * 7))) * W, y = ground - hash(i * 11) * 160;
          g.beginPath(); g.ellipse(x, y, 4 + ph * 16, (1 + ph * 4) * 0.5, 0, 0, 7); g.globalAlpha = 1 - ph; g.fill();
        }
        g.restore();
      },
      snow(n = 160, alpha = 0.9, wind = 30) {
        g.save(); g.fillStyle = `rgba(255,255,255,${alpha})`;
        for (let i = 0; i < n; i++) {
          const sp = 40 + hash(i) * 90, r = 2 + hash(i * 3) * 5, y = ((t * sp + hash(i * 5) * 3000) % (H + 40)) - 20;
          const x = (hash(i * 7) * W + Math.sin(t * 0.8 + i) * 30 + t * wind + W * 4) % W;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }
        g.restore();
      },
      glow(x, y, r, color, a = 1) {
        g.save(); g.globalCompositeOperation = "lighter";
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, color.replace("A", a)); gr.addColorStop(1, color.replace("A", 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
      },
      shade(color, a) { g.save(); g.globalAlpha = a; g.fillStyle = color; g.fillRect(-200, -200, W + 400, H + 400); g.restore(); },
      sparks(x, y, r, n, color, t0 = 0, rise = 260) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < n; i++) {
          const life = 1 + hash(i) * 1.2, ph = ((t - t0 + hash(i * 2) * life) % life) / life;
          const px = x + (hash(i * 3) - 0.5) * r * 2 + Math.sin(t * 3 + i) * 12, py = y + (hash(i * 4) - 0.3) * r - ph * rise;
          g.fillStyle = color.replace("A", (1 - ph).toFixed(2));
          g.beginPath(); g.arc(px, py, 2 + hash(i * 5) * 4, 0, 7); g.fill();
        }
        g.restore();
      },
      star(x, y, s, a = 1) {
        g.save(); g.globalAlpha = a; g.fillStyle = "#fff"; g.translate(x, y);
        g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(0, 0, s, 0); g.quadraticCurveTo(0, 0, 0, s); g.quadraticCurveTo(0, 0, -s, 0); g.quadraticCurveTo(0, 0, 0, -s); g.fill(); g.restore();
      },
      heart(x, y, s, a = 1, color = "#e8384f") {
        g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s / 30, s / 30);
        g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-30, -10, -15, -32, 0, -16); g.bezierCurveTo(15, -32, 30, -10, 0, 10);
        g.fillStyle = color; g.fill(); g.lineWidth = 3; g.strokeStyle = "#111"; g.stroke(); g.restore();
      },
      exclaim(x, y, s, a = 1, rot = 0) {   // the storyboard's "!" mark
        g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.fillStyle = "#111";
        g.beginPath(); g.moveTo(-s * 0.18, -s); g.lineTo(s * 0.18, -s); g.lineTo(s * 0.08, -s * 0.25); g.lineTo(-s * 0.08, -s * 0.25); g.closePath(); g.fill();
        g.beginPath(); g.arc(0, 0, s * 0.11, 0, 7); g.fill(); g.restore();
      },
      ticks(x, y, s, a = 1, dir = 1) {     // little surprise strokes around a head
        g.save(); g.globalAlpha = a; g.strokeStyle = "#111"; g.lineWidth = s * 0.12; g.lineCap = "round";
        for (const [ang, l] of [[-2.3, 1], [-1.7, 1.2], [-1.1, 1]]) {
          const a2 = dir > 0 ? ang : Math.PI - ang;
          g.beginPath(); g.moveTo(x + Math.cos(a2) * s, y + Math.sin(a2) * s); g.lineTo(x + Math.cos(a2) * s * (1 + 0.45 * l), y + Math.sin(a2) * s * (1 + 0.45 * l)); g.stroke();
        }
        g.restore();
      },
      waves(x, y, dir, n, a, t0, spacing = 46, color = "rgba(190,150,255,A)") {   // mind-reading / mental-power waves
        g.save(); g.lineWidth = 6; g.lineCap = "round";
        for (let i = 0; i < n; i++) {
          const ph = ((t - t0) * 0.9 + i / n) % 1, r = 30 + ph * spacing * n;
          g.strokeStyle = color.replace("A", (a * (1 - ph)).toFixed(2));
          g.beginPath(); g.arc(x, y, r, dir > 0 ? -0.6 : Math.PI - 0.6, dir > 0 ? 0.6 : Math.PI + 0.6); g.stroke();
        }
        g.restore();
      },
      shield(cx, cy, rx, ry, a, ripple = 0) {
        if (a <= 0) return;
        g.save();
        const gr = g.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.2, cx, cy, Math.max(rx, ry));
        gr.addColorStop(0, `rgba(170,215,255,${0.05 * a})`); gr.addColorStop(0.85, `rgba(150,205,255,${0.22 * a})`); gr.addColorStop(1, `rgba(200,235,255,${0.5 * a})`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
        g.lineWidth = 6 + 4 * ripple; g.strokeStyle = `rgba(225,245,255,${0.85 * a})`;
        g.shadowColor = "rgba(160,220,255,0.9)"; g.shadowBlur = 30; g.stroke();
        g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = `rgba(255,255,255,${0.35 * a})`;
        for (let i = 0; i < 9; i++) {   // shimmer arcs
          const s0 = t * 0.6 + i * 0.7;
          g.beginPath(); g.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, s0, s0 + 0.35); g.stroke();
        }
        g.restore();
      },
      streak(drawFn, n, dx, alpha) {   // motion blur trail: draws ghosts behind a fast mover
        for (let i = n; i >= 1; i--) { g.save(); g.globalAlpha = alpha * (1 - i / (n + 1)) * 0.5; g.translate(-dx * i, 0); drawFn(); g.restore(); }
      },
      impact(x, y, r, a) {
        g.save(); g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 6; g.lineCap = "round";
        for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + 0.2; g.beginPath(); g.moveTo(x + Math.cos(an) * r * 0.5, y + Math.sin(an) * r * 0.5); g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); g.stroke(); }
        g.restore();
      },
      petals(n, a = 1) {
        g.save(); g.globalAlpha = a;
        for (let i = 0; i < n; i++) {
          const sp = 60 + hash(i) * 70, y = ((t * sp + hash(i * 3) * 3000) % (H + 60)) - 30, x = (hash(i * 5) * W + Math.sin(t + i) * 60) % W;
          g.save(); g.translate(x, y); g.rotate(t * 2 + i); g.fillStyle = i % 3 ? "#fff6f2" : "#f6c9d4";
          g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, 7); g.fill(); g.restore();
        }
        g.restore();
      },
      suitcase(x, y, s, handle) {   // rolling suitcase; handle = [hx, hy] hand position
        g.save();
        g.lineWidth = 5; g.strokeStyle = "#151515"; g.lineCap = "round";
        g.beginPath(); g.moveTo(x + 0.05 * s, y - 0.8 * s); g.lineTo(handle[0], handle[1]); g.stroke();
        g.fillStyle = "#9aa3ab"; g.beginPath(); g.roundRect ? g.roundRect(x - 0.32 * s, y - 0.95 * s, 0.64 * s, 0.85 * s, 0.08 * s) : g.rect(x - 0.32 * s, y - 0.95 * s, 0.64 * s, 0.85 * s);
        g.fill(); g.stroke();
        g.strokeStyle = "#6f7880"; g.lineWidth = 3; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(x - 0.32 * s + i * 0.16 * s, y - 0.9 * s); g.lineTo(x - 0.32 * s + i * 0.16 * s, y - 0.15 * s); } g.stroke();
        g.fillStyle = "#151515"; for (const dx of [-0.2, 0.2]) { g.beginPath(); g.arc(x + dx * s, y - 0.05 * s, 0.06 * s, 0, 7); g.fill(); }
        g.restore();
      },
      baby(x, y, s, t2, pale = 0) {   // swaddled Renesmee
        g.save(); g.translate(x, y); g.rotate(Math.sin(t2 * 1.3) * 0.05);
        g.fillStyle = "#f2c6cf"; g.strokeStyle = "#111"; g.lineWidth = 0.05 * s;
        g.beginPath(); g.ellipse(0.25 * s, 0.1 * s, 0.55 * s, 0.32 * s, -0.25, 0, 7); g.fill(); g.stroke();
        g.fillStyle = "#f3d9c4"; g.beginPath(); g.arc(-0.22 * s, -0.12 * s, 0.26 * s, 0, 7); g.fill(); g.stroke();
        g.fillStyle = "#6b3f22"; g.beginPath(); g.arc(-0.24 * s, -0.24 * s, 0.2 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill();
        g.fillStyle = "#111"; const bl = Math.sin(t2 * 2.2) > 0.97;
        for (const dx of [-0.31, -0.15]) { g.beginPath(); g.ellipse(dx * s, -0.1 * s, 0.03 * s, bl ? 0.006 * s : 0.035 * s, 0, 0, 7); g.fill(); }
        g.restore();
      },
    };
  }

  window.Engine = Engine;
  window.EngineUtil = { W, H, clamp, lerp, ease, easeOut, hash };
})();
