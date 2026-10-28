/*
 * THE DRAWING KIT: what a scene is drawn with, flat, before the paint pass.
 *
 * A scene is a function (k) => { ... } that draws one shot. It gets:
 *   k.g        the 2D context, in frame pixels (k.W × k.H), camera applied
 *   k.W, k.H   the frame size; k.u = k.H / 1920 (so sizes read the same at any size)
 *   k.t        seconds into this shot (already on twos), k.p its progress 0→1
 *   k.r()      a random number, the same on every drawing of this shot
 *   k.pal      the short's palette (look.palette), k.beat the line being said
 * and every helper below. Helpers take an options object; anything left out
 * has a sensible default. Positions are fractions of the frame (x: 0.5 is the
 * middle, y: 0.7 is 70% down) unless a name ends in Px.
 *
 * Shapes are kept simple and readable, with clear silhouettes and big
 * value contrast: the paint pass adds the texture, so nothing here should.
 */
(function () {
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  function hashStr(s) {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  // smooth 1D noise for ridgelines
  function noise1(seed) {
    const r = rng(seed), v = Array.from({ length: 512 }, r);
    return (x) => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      return v[i & 511] * (1 - u) + v[(i + 1) & 511] * u;
    };
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`;
  }
  function rgb(c) {
    if (c.startsWith("rgb")) return c.match(/[\d.]+/g).slice(0, 3).map(Number);
    let h = c.replace("#", "");
    if (h.length === 3) h = [...h].map((x) => x + x).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function alpha(c, a) {
    return `rgba(${rgb(c).join(",")},${a})`;
  }

  function make(g0, W, H, t, p, seed, pal, beat) {
    let g = g0;
    const u = H / 1920;
    const X = (x) => x * W, Y = (y) => y * H;
    const r = rng(seed);
    const k = { g, W, H, u, t, p, r, pal: pal || {}, beat, mix, alpha, rng, noise1, X, Y };

    /* ---------- sky and light ---------- */

    /** A vertical gradient: stops = ["#top", "#mid", "#bottom"] or [[0,"#a"],[1,"#b"]]. */
    k.sky = ({ stops = ["#8fb7e8", "#dfe9f2"], y0 = 0, y1 = 1 } = {}) => {
      const gr = g.createLinearGradient(0, Y(y0), 0, Y(y1));
      stops.forEach((s, i) => (Array.isArray(s) ? gr.addColorStop(s[0], s[1]) : gr.addColorStop(i / Math.max(1, stops.length - 1), s)));
      g.fillStyle = gr;
      g.fillRect(-W, Y(y0) - H, W * 3, Y(y1 - y0) + 2 * H);
    };

    /** Soft cumulus: clusters of ellipses in a band, drifting with t. */
    k.clouds = ({ y = 0.04, band = 0.3, n = 26, color = "#ffffff", shade = "#c9d6e6", size = 1, drift = 6, seed: s = 1, opacity = 0.95, perspective = true } = {}) => {
      const rr = rng(hashStr("clouds" + s));
      for (let i = 0; i < n; i++) {
        const f = rr();
        // nearer the horizon (lower in the band) they are smaller and flatter
        const depth = perspective ? 1 - f * 0.6 : 1;
        const cx = X(-0.15 + 1.3 * rr()) + t * drift * u * (0.6 + rr()) * depth;
        const cy = Y(y + band * f);
        const w = (70 + 170 * rr()) * size * u * depth;
        const puffs = 4 + Math.floor(rr() * 5);
        const P = [];
        for (let j = 0; j < puffs; j++) P.push([cx + (rr() - 0.5) * w, cy + (rr() - 0.7) * w * 0.18, w * (0.12 + 0.14 * rr())]);
        if (shade) {
          g.fillStyle = alpha(shade, opacity);
          for (const [px, py, pr] of P) { g.beginPath(); g.ellipse(px + pr * 0.15, py + pr * 0.3, pr * 1.25, pr * 0.55, 0, 0, 7); g.fill(); }
        }
        g.fillStyle = alpha(color, opacity);
        for (const [px, py, pr] of P) { g.beginPath(); g.ellipse(px, py, pr * 1.2, pr * 0.58, 0, 0, 7); g.fill(); }
      }
    };

    /** A disc with a glow: the sun, the moon, a street lamp's bulb. */
    k.sun = ({ x = 0.7, y = 0.2, r: rad = 70, color = "#fff6d8", glow = "#ffe9a8", glowSize = 5, glowAlpha = 0.55 } = {}) => {
      const R = rad * u;
      const gr = g.createRadialGradient(X(x), Y(y), R * 0.5, X(x), Y(y), R * glowSize);
      gr.addColorStop(0, alpha(glow, glowAlpha)); gr.addColorStop(1, alpha(glow, 0));
      g.fillStyle = gr; g.fillRect(X(x) - R * glowSize, Y(y) - R * glowSize, R * glowSize * 2, R * glowSize * 2);
      g.fillStyle = color; g.beginPath(); g.arc(X(x), Y(y), R, 0, 7); g.fill();
    };

    /** A soft light anywhere (lamps, windows, fireflies, a candle). */
    k.glow = ({ x, y, r: rad = 60, color = "#ffd27a", a = 0.8 } = {}) => {
      const R = rad * u;
      const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), R);
      gr.addColorStop(0, alpha(color, a)); gr.addColorStop(1, alpha(color, 0));
      g.fillStyle = gr; g.fillRect(X(x) - R, Y(y) - R, 2 * R, 2 * R);
    };

    /** Stars on a night sky, twinkling slowly. */
    k.stars = ({ n = 120, y1 = 0.5, color = "#fffbe8", size = 2.4, seed: s = 3 } = {}) => {
      const rr = rng(hashStr("stars" + s));
      for (let i = 0; i < n; i++) {
        const x = rr() * W, y = rr() * Y(y1), tw = 0.5 + 0.5 * Math.sin(t * (1 + rr() * 2) + rr() * 6);
        g.fillStyle = alpha(color, 0.35 + 0.65 * tw * rr());
        g.beginPath(); g.arc(x, y, size * u * (0.4 + rr()), 0, 7); g.fill();
      }
    };

    /** Shafts of light, from a point, in a fan. */
    k.rays = ({ x = 0.8, y = -0.05, angle = 115, spread = 22, n = 4, length = 1.4, color = "#fff3c4", a = 0.28, width = 60 } = {}) => {
      const rr = rng(hashStr("rays" + x + y));
      g.save();
      g.globalCompositeOperation = "screen";
      g.filter = `blur(${Math.round(18 * u)}px)`;
      for (let i = 0; i < n; i++) {
        const ang = ((angle + (i / Math.max(1, n - 1) - 0.5) * spread) * Math.PI) / 180;
        const w = width * u * (0.5 + rr());
        const L = length * H;
        const ex = X(x) + Math.cos(ang) * L, ey = Y(y) + Math.sin(ang) * L;
        const gr = g.createLinearGradient(X(x), Y(y), ex, ey);
        gr.addColorStop(0, alpha(color, a)); gr.addColorStop(1, alpha(color, 0));
        g.fillStyle = gr;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        g.beginPath();
        g.moveTo(X(x) + nx * w * 0.2, Y(y) + ny * w * 0.2);
        g.lineTo(ex + nx * w, ey + ny * w);
        g.lineTo(ex - nx * w, ey - ny * w);
        g.lineTo(X(x) - nx * w * 0.2, Y(y) - ny * w * 0.2);
        g.fill();
      }
      g.restore();
    };

    /** Rain: slanted streaks that fall with t. */
    k.rain = ({ n = 260, color = "#dfe8f2", a = 0.45, slant = 0.18, length = 46, speed = 1, seed: s = 12 } = {}) => {
      const rr = rng(hashStr("rain" + s));
      g.strokeStyle = alpha(color, a);
      g.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const L = length * u * (0.5 + rr()), sp = (1400 + rr() * 900) * u * speed;
        const x0 = rr() * W * 1.3 - W * 0.15, y0 = ((rr() * H * 1.2 + t * sp) % (H * 1.2)) - H * 0.1;
        g.lineWidth = (1.5 + rr() * 2) * u;
        g.beginPath(); g.moveTo(x0 - y0 * slant, y0); g.lineTo(x0 - (y0 + L) * slant, y0 + L); g.stroke();
      }
    };

    /** Small lights drifting: fireflies, embers, lanterns far off. */
    k.motes = ({ n = 24, y0 = 0.4, y1 = 0.9, color = "#ffcf6a", r: rad = 5, seed: s = 13 } = {}) => {
      const rr = rng(hashStr("motes" + s));
      for (let i = 0; i < n; i++) {
        const x = rr() + Math.sin(t * (0.3 + rr() * 0.4) + i) * 0.02, y = y0 + (y1 - y0) * rr() + Math.cos(t * 0.4 + i * 2) * 0.01;
        k.glow({ x, y, r: rad * 6, color, a: 0.35 });
        g.fillStyle = color; g.beginPath(); g.arc(X(x), Y(y), rad * u, 0, 7); g.fill();
      }
    };

    /** A band of haze: lays air between planes, so distance reads. */
    k.haze = ({ y = 0.5, h = 0.12, color = "#ffffff", a = 0.4 } = {}) => {
      const gr = g.createLinearGradient(0, Y(y - h), 0, Y(y + h));
      gr.addColorStop(0, alpha(color, 0)); gr.addColorStop(0.5, alpha(color, a)); gr.addColorStop(1, alpha(color, 0));
      g.fillStyle = gr; g.fillRect(-W, Y(y - h), W * 3, Y(2 * h));
    };

    /* ---------- land ---------- */

    /**
     * A ridge filled down to the bottom: hills, mountains, a far treeline.
     * shape: "soft" rolling, "peaks" mountains, "pines" a conifer line,
     * "bush" a broadleaf line, "rocky".
     */
    k.ridge = ({ y = 0.55, amp = 0.06, freq = 3, color = "#3d6b3a", shape = "soft", seed: s = 1, to = 1.2, x0 = -0.2, x1 = 1.2, top = null } = {}) => {
      const n = noise1(hashStr("ridge" + s + shape));
      g.fillStyle = top ? (() => { const gr = g.createLinearGradient(0, Y(y - amp), 0, Y(y + amp * 2)); gr.addColorStop(0, top); gr.addColorStop(1, color); return gr; })() : color;
      g.beginPath();
      g.moveTo(X(x0), Y(to));
      const steps = 220;
      for (let i = 0; i <= steps; i++) {
        const fx = x0 + ((x1 - x0) * i) / steps;
        let h;
        if (shape === "peaks") h = Math.pow(n(fx * freq), 1.6) * 1.4 + 0.25 * n(fx * freq * 4 + 9);
        else if (shape === "pines") {
          const cw = 1 / (freq * 4), ci = Math.floor(fx / cw), cf = (fx / cw) - ci;
          const ch = 0.55 + 0.45 * n(ci * 0.77 + 3);
          h = 0.35 * n(fx * freq) + ch * (1 - Math.abs(cf - 0.5) * 2) * 0.9;
        } else if (shape === "bush") h = 0.5 * n(fx * freq) + 0.35 * Math.abs(Math.sin(fx * freq * 18 + n(fx * 30) * 3)) + 0.15 * n(fx * freq * 9);
        else if (shape === "rocky") h = n(fx * freq) * 0.8 + 0.3 * Math.abs(n(fx * freq * 6) - 0.5) * 2;
        else h = n(fx * freq) * 0.85 + 0.15 * n(fx * freq * 3 + 4);
        g.lineTo(X(fx), Y(y - amp * h));
      }
      g.lineTo(X(x1), Y(to));
      g.closePath();
      g.fill();
    };

    /** The ground plane from y down, with an optional gradient, mown stripes and flowers. */
    k.ground = ({ y = 0.62, color = "#5d9a3b", far = null, stripes = 0, stripe = null, flowers = 0, flower = "#f7f3e6", seed: s = 2 } = {}) => {
      if (far) {
        const gr = g.createLinearGradient(0, Y(y), 0, H);
        gr.addColorStop(0, far); gr.addColorStop(1, color);
        g.fillStyle = gr;
      } else g.fillStyle = color;
      g.fillRect(-W, Y(y), W * 3, H * 2);
      if (stripes) {
        const rr = rng(hashStr("stripes" + s));
        for (let i = 0; i < stripes; i++) {
          const f = i / stripes;
          const yy = y + (1 - y) * Math.pow(f, 1.6);
          const hh = (1 - y) * (Math.pow((i + 1) / stripes, 1.6) - Math.pow(f, 1.6)) * 0.5;
          g.fillStyle = alpha(stripe || mix(color, "#000000", 0.12), 0.5 + 0.3 * rr());
          g.fillRect(-W, Y(yy), W * 3, Y(hh));
        }
      }
      if (flowers) {
        const rr = rng(hashStr("flowers" + s));
        for (let i = 0; i < flowers; i++) {
          const fy = y + (1 - y) * Math.pow(rr(), 0.7), sz = (2 + 7 * (fy - y) / (1 - y)) * u;
          g.fillStyle = alpha(flower, 0.85);
          g.beginPath(); g.arc(rr() * W, Y(fy), sz, 0, 7); g.fill();
        }
      }
    };

    /** A path or road narrowing to a vanishing point. */
    k.path = ({ x = 0.5, y = 0.62, near = 0.5, far = 0.04, color = "#b59b72", to = 1.02, bend = 0 } = {}) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(X(x - far / 2), Y(y));
      g.quadraticCurveTo(X(x - near / 4 + bend), Y((y + to) / 2), X(x - near / 2), Y(to));
      g.lineTo(X(x + near / 2), Y(to));
      g.quadraticCurveTo(X(x + near / 4 + bend), Y((y + to) / 2), X(x + far / 2), Y(y));
      g.closePath(); g.fill();
    };

    /* ---------- water ---------- */

    /** A lake or sea band, with sparkling horizontal glints that move. */
    k.water = ({ y0 = 0.45, y1 = 0.62, color = "#2f8fc9", deep = "#1d5f97", glint = "#e9f6ff", glints = 90, seed: s = 4, speed = 1 } = {}) => {
      const gr = g.createLinearGradient(0, Y(y0), 0, Y(y1));
      gr.addColorStop(0, color); gr.addColorStop(1, deep);
      g.fillStyle = gr; g.fillRect(-W, Y(y0), W * 3, Y(y1 - y0));
      const rr = rng(hashStr("glint" + s));
      for (let i = 0; i < glints; i++) {
        const fy = rr(), yy = Y(y0 + (y1 - y0) * fy);
        const ph = rr() * 6.28, sp = (0.6 + rr()) * speed;
        const vis = 0.5 + 0.5 * Math.sin(t * 2.2 * sp + ph);
        const len = (14 + 60 * rr()) * u * (0.4 + fy);
        const xx = rr() * W + Math.sin(t * sp + ph) * 10 * u;
        g.fillStyle = alpha(glint, 0.25 + 0.6 * vis);
        g.fillRect(xx, yy, len, (2 + 3 * fy) * u);
      }
    };

    /** A falling column of water, with a churn of foam at its foot. */
    k.waterfall = ({ x = 0.5, w = 0.2, y0 = 0.1, y1 = 0.7, color = "#e8f4f6", shade = "#a9cfd8", speed = 1 } = {}) => {
      g.fillStyle = shade; g.fillRect(X(x - w / 2), Y(y0), X(w), Y(y1 - y0));
      const rr = rng(hashStr("fall" + x));
      for (let i = 0; i < 26; i++) {
        const lx = X(x - w / 2) + rr() * X(w), lw = (4 + rr() * 16) * u;
        const off = ((t * 900 * speed * (0.7 + rr() * 0.6) * u + rr() * H) % (Y(y1 - y0)));
        g.fillStyle = alpha(color, 0.75);
        g.fillRect(lx, Y(y0), lw, Y(y1 - y0));
        g.fillStyle = alpha("#ffffff", 0.6);
        g.fillRect(lx, Y(y0) + off, lw, 40 * u);
      }
      for (let i = 0; i < 14; i++) {
        g.fillStyle = alpha("#ffffff", 0.7);
        g.beginPath();
        g.ellipse(X(x - w / 2 - 0.03) + rr() * X(w + 0.06), Y(y1) + (rr() - 0.3) * 30 * u, (30 + rr() * 50) * u, (10 + rr() * 16) * u, 0, 0, 7);
        g.fill();
      }
    };

    /* ---------- plants ---------- */

    /** One tree. kind: "round", "pine", "autumn", "bare", "palm", "column" (cypress). */
    k.tree = ({ x = 0.5, y = 0.7, h = 0.3, kind = "round", crown = "#3f7d34", trunk = "#5b3b25", fruit = null, seed: s = 5 } = {}) => {
      const rr = rng(hashStr("tree" + s + x));
      const base = Y(y), top = Y(y - h), cx = X(x), th = (top - base);
      g.fillStyle = trunk;
      const tw = Math.max(6 * u, -th * 0.05);
      if (kind !== "pine" && kind !== "column") g.fillRect(cx - tw / 2, base + th * 0.55, tw, -th * 0.55);
      if (kind === "pine" || kind === "column") {
        g.fillRect(cx - tw / 2, base, tw, th * 0.15);
        g.fillStyle = crown;
        const wide = kind === "column" ? 0.12 : 0.32;
        g.beginPath();
        g.moveTo(cx, top);
        const tiers = kind === "column" ? 1 : 5;
        for (let i = 1; i <= tiers; i++) {
          const yy = top - th * (i / tiers) * 0.92, ww = -th * wide * (i / tiers);
          g.lineTo(cx + ww, yy); g.lineTo(cx + ww * 0.45, yy - th * 0.04);
        }
        for (let i = tiers; i >= 1; i--) {
          const yy = top - th * (i / tiers) * 0.92, ww = -th * wide * (i / tiers);
          g.lineTo(cx - ww * 0.45, yy - th * 0.04); g.lineTo(cx - ww, yy);
        }
        g.closePath(); g.fill();
        return;
      }
      if (kind === "bare") {
        g.strokeStyle = trunk; g.lineCap = "round";
        const branch = (x0, y0, ang, len, wd, d) => {
          if (d > 5 || len < 6 * u) return;
          const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
          g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          branch(x1, y1, ang - 0.4 - rr() * 0.3, len * 0.72, wd * 0.68, d + 1);
          branch(x1, y1, ang + 0.4 + rr() * 0.3, len * 0.72, wd * 0.68, d + 1);
        };
        branch(cx, base, -Math.PI / 2, -th * 0.35, tw, 0);
        return;
      }
      if (kind === "palm") {
        g.strokeStyle = trunk; g.lineWidth = tw; g.lineCap = "round";
        g.beginPath(); g.moveTo(cx, base); g.quadraticCurveTo(cx + th * 0.1, base + th * 0.5, cx - th * 0.05, top); g.stroke();
        g.strokeStyle = crown; g.lineWidth = 10 * u;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.beginPath(); g.moveTo(cx - th * 0.05, top);
          g.quadraticCurveTo(cx - th * 0.05 + Math.cos(a) * -th * 0.2, top + Math.sin(a) * -th * 0.06 + th * 0.04, cx - th * 0.05 + Math.cos(a) * -th * 0.32, top - th * 0.1);
          g.stroke();
        }
        return;
      }
      // round / autumn: a cluster of blobs
      g.fillStyle = crown;
      const R = -th * 0.32;
      const ccy = top + R;
      for (let i = 0; i < 9; i++) {
        const a = rr() * 6.28, d = rr() * R * 0.6;
        g.beginPath(); g.arc(cx + Math.cos(a) * d, ccy + Math.sin(a) * d * 0.8, R * (0.45 + 0.3 * rr()), 0, 7); g.fill();
      }
      if (fruit || kind === "autumn") {
        g.fillStyle = fruit || "#e0862f";
        for (let i = 0; i < 40; i++) {
          const a = rr() * 6.28, d = rr() * R;
          g.beginPath(); g.arc(cx + Math.cos(a) * d, ccy + Math.sin(a) * d * 0.8, (3 + rr() * 5) * u, 0, 7); g.fill();
        }
      }
    };

    /** A row of trees along a line, sized by depth. */
    k.trees = ({ n = 6, y = 0.62, h = 0.18, x0 = 0, x1 = 1, kind = "round", crown = "#3f7d34", trunk = "#4a3020", jitter = 0.4, seed: s = 7 } = {}) => {
      const rr = rng(hashStr("trees" + s));
      for (let i = 0; i < n; i++) {
        const fx = x0 + ((x1 - x0) * (i + 0.5 + (rr() - 0.5) * jitter)) / n;
        k.tree({ x: fx, y: y + (rr() - 0.5) * 0.01, h: h * (0.75 + rr() * 0.5), kind, crown: mix(crown, "#000000", rr() * 0.18), trunk, seed: s * 31 + i });
      }
    };

    /** Foliage hanging into the frame from a side: a ragged, leafy mass. */
    k.foliage = ({ side = "left", x = null, y0 = -0.05, y1 = 0.7, depth = 0.22, color = "#2f6a2c", light = "#5c9a3c", seed: s = 8 } = {}) => {
      const rr = rng(hashStr("fol" + s + side));
      const edge = x ?? (side === "left" ? 0 : 1);
      const dir = side === "left" ? 1 : -1;
      const dark = mix(color, "#000000", 0.35);
      // the mass, then clumps of small leaves in three values, lit from the top
      g.fillStyle = dark;
      g.fillRect(side === "left" ? X(-0.3) : X(edge), Y(y0), X(0.3) + (side === "left" ? X(edge) : W), Y(y1 - y0));
      const clumps = [];
      for (let i = 0; i < 46; i++) {
        const fy = y0 + (y1 - y0) * rr();
        const reach = depth * (0.35 + 0.65 * Math.sin(Math.PI * (fy - y0) / (y1 - y0))) * (0.55 + 0.6 * rr());
        clumps.push([X(edge + dir * reach * (0.55 + 0.45 * rr())), Y(fy), (30 + 50 * rr()) * u]);
      }
      for (const [tone, shift, n] of [[dark, 0, 30], [color, -0.25, 26], [light, -0.55, 12]]) {
        g.fillStyle = tone;
        for (const [cx, cy, R] of clumps) {
          for (let j = 0; j < n; j++) {
            const a = rr() * 6.28, d = Math.sqrt(rr()) * R;
            const lx = cx + Math.cos(a) * d - dir * R * 0.2 * -shift, ly = cy + Math.sin(a) * d * 0.8 + R * shift;
            const lr = (5 + rr() * 9) * u;
            g.beginPath(); g.ellipse(lx, ly, lr * 1.5, lr, rr() * 3.14, 0, 7); g.fill();
          }
        }
      }
    };

    /** Tall trunks rising out of frame: a forest seen from inside. */
    k.trunks = ({ n = 5, color = "#7a5534", light = "#a9784a", y1 = 1, seed: s = 9, x0 = 0, x1 = 1, width = 0.08 } = {}) => {
      const rr = rng(hashStr("trunks" + s));
      for (let i = 0; i < n; i++) {
        const fx = x0 + ((x1 - x0) * (i + 0.2 + rr() * 0.6)) / n, w = X(width) * (0.6 + rr() * 0.7);
        g.fillStyle = color; g.fillRect(X(fx) - w / 2, -H, w, Y(y1) + H);
        g.fillStyle = light; g.fillRect(X(fx) - w / 2, -H, w * 0.28, Y(y1) + H);
      }
    };

    /* ---------- built things ---------- */

    /** A house: box, pitched roof, windows (lit at night). */
    k.house = ({ x = 0.5, y = 0.7, w = 0.3, h = 0.16, wall = "#efe6d8", roof = "#3b3a45", window = "#3c3b46", lit = false, litColor = "#ffcf6b", floors = 2, aFrame = false } = {}) => {
      const L = X(x - w / 2), R = X(x + w / 2), B = Y(y), T = Y(y - h);
      g.fillStyle = wall;
      if (aFrame) {
        g.beginPath(); g.moveTo(L, B); g.lineTo(X(x), Y(y - h * 2)); g.lineTo(R, B); g.closePath(); g.fill();
      } else g.fillRect(L, T, R - L, B - T);
      g.fillStyle = roof;
      g.beginPath();
      if (aFrame) { g.moveTo(L - X(0.03), B); g.lineTo(X(x), Y(y - h * 2.15)); g.lineTo(R + X(0.03), B); g.lineTo(R, B); g.lineTo(X(x), Y(y - h * 1.95)); g.lineTo(L, B); }
      else { g.moveTo(L - X(0.02), T); g.lineTo(X(x), T - Y(h * 0.5)); g.lineTo(R + X(0.02), T); }
      g.closePath(); g.fill();
      const cols = Math.max(2, Math.round(w / 0.07));
      const rows = aFrame ? 1 : floors;
      for (let ry = 0; ry < rows; ry++)
        for (let cx = 0; cx < cols; cx++) {
          const ww = ((R - L) / cols) * 0.42, wh = ((B - T) / rows) * 0.42;
          const wx = L + ((R - L) * (cx + 0.5)) / cols - ww / 2, wy = (aFrame ? B - (B - T) * 0.7 : T + ((B - T) * (ry + 0.5)) / rows - wh / 2);
          g.fillStyle = lit ? litColor : window;
          g.fillRect(wx, wy, ww, wh);
          if (lit) k.glow({ x: (wx + ww / 2) / W, y: (wy + wh / 2) / H, r: 70, color: litColor, a: 0.35 });
        }
    };

    /** A skyline of towers; at night their windows are lit dots. */
    k.city = ({ y = 0.62, h = 0.22, color = "#1b2740", lit = true, litColor = "#ffd66b", density = 0.35, n = 16, seed: s = 11, x0 = -0.05, x1 = 1.05 } = {}) => {
      const rr = rng(hashStr("city" + s));
      const bw = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        const bx = x0 + i * bw + (rr() - 0.5) * bw * 0.4, bh = h * (0.35 + rr() * 0.75), ww = bw * (0.7 + rr() * 0.6);
        g.fillStyle = mix(color, "#000000", rr() * 0.25);
        g.fillRect(X(bx), Y(y - bh), X(ww), Y(bh) + 2);
        if (!lit) continue;
        const cols = Math.max(2, Math.round(ww * W / (14 * u))), rows = Math.round(bh * H / (18 * u));
        for (let ry = 1; ry < rows; ry++)
          for (let cx = 0; cx < cols; cx++) {
            if (rr() > density) continue;
            const on = Math.sin(t * 0.6 + i * 3 + ry * 7 + cx) > -0.85;
            if (!on) continue;
            g.fillStyle = alpha(litColor, 0.6 + rr() * 0.4);
            g.fillRect(X(bx) + (cx + 0.25) * (X(ww) / cols), Y(y - bh) + ry * (Y(bh) / rows), (X(ww) / cols) * 0.45, (Y(bh) / rows) * 0.4);
          }
      }
    };

    /** A pagoda or tower of stacked roofs. */
    k.pagoda = ({ x = 0.5, y = 0.6, h = 0.3, color = "#3b2a22", tiers = 5 } = {}) => {
      g.fillStyle = color;
      for (let i = 0; i < tiers; i++) {
        const f = i / tiers, w = X(0.16 * (1 - f * 0.6)), yy = Y(y - h * f);
        g.fillRect(X(x) - w * 0.32, yy - Y(h / tiers), w * 0.64, Y(h / tiers));
        g.beginPath(); g.moveTo(X(x) - w * 0.62, yy - Y(h / tiers) * 0.45); g.lineTo(X(x), yy - Y(h / tiers) * 1.05); g.lineTo(X(x) + w * 0.62, yy - Y(h / tiers) * 0.45); g.closePath(); g.fill();
      }
      g.fillRect(X(x) - 3 * u, Y(y - h) - Y(h * 0.18), 6 * u, Y(h * 0.18));
    };

    /** A utility pole with sagging wires running out of frame. */
    k.pole = ({ x = 0.75, y = 0.75, h = 0.6, color = "#2a2626", wires = 3 } = {}) => {
      g.fillStyle = color; g.fillRect(X(x) - 5 * u, Y(y - h), 10 * u, Y(h));
      g.fillRect(X(x) - 40 * u, Y(y - h) + 30 * u, 80 * u, 7 * u);
      g.strokeStyle = color; g.lineWidth = 2.5 * u;
      for (let i = 0; i < wires; i++) {
        const yy = Y(y - h) + 34 * u;
        const ex = -0.1, ey = yy + (i - 1) * 30 * u - 60 * u;
        g.beginPath(); g.moveTo(X(x) + (i - 1) * 35 * u, yy); g.quadraticCurveTo((X(x) + X(ex)) / 2, yy + 80 * u, X(ex), ey); g.stroke();
      }
    };

    /** A wall, a doorway or a block: any flat rectangle with a lit edge. */
    k.block = ({ x0, y0, x1, y1, color = "#283a5a", edge = null, edgeWidth = 4 } = {}) => {
      g.fillStyle = color; g.fillRect(X(x0), Y(y0), X(x1 - x0), Y(y1 - y0));
      if (edge) { g.fillStyle = edge; g.fillRect(X(x0), Y(y0), edgeWidth * u, Y(y1 - y0)); }
    };

    /** A lamp post with its pool of light. */
    k.lamp = ({ x = 0.5, y = 0.8, h = 0.4, color = "#1d1d24", light = "#fff1c2", pool = true } = {}) => {
      g.fillStyle = color; g.fillRect(X(x) - 4 * u, Y(y - h), 8 * u, Y(h));
      k.sun({ x, y: y - h, r: 16, color: light, glow: light, glowSize: 9, glowAlpha: 0.4 });
      if (pool) {
        g.fillStyle = alpha(light, 0.16);
        g.beginPath(); g.ellipse(X(x), Y(y), 220 * u, 40 * u, 0, 0, 7); g.fill();
      }
    };

    /** Any closed shape from points [[x,y],...] (fractions); smooth: true rounds it. */
    k.shape = ({ pts, color = "#000", smooth = false } = {}) => {
      g.fillStyle = color; g.beginPath();
      if (!smooth) pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      else {
        const P = pts.map(([x, y]) => [X(x), Y(y)]);
        g.moveTo((P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2);
        for (let i = 1; i <= P.length; i++) {
          const a = P[i % P.length], b = P[(i + 1) % P.length];
          g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
      }
      g.closePath(); g.fill();
    };

    /** A heart (a pond, a sign, a balloon). */
    k.heart = ({ x = 0.5, y = 0.5, s: size = 0.2, color = "#7ec8ef" } = {}) => {
      const S = X(size), cx = X(x), cy = Y(y);
      g.fillStyle = color; g.beginPath();
      g.moveTo(cx, cy + S * 0.35);
      g.bezierCurveTo(cx - S * 0.9, cy - S * 0.1, cx - S * 0.45, cy - S * 0.62, cx, cy - S * 0.25);
      g.bezierCurveTo(cx + S * 0.45, cy - S * 0.62, cx + S * 0.9, cy - S * 0.1, cx, cy + S * 0.35);
      g.fill();
    };

    /* ---------- people ---------- */

    /**
     * A person, flat and readable, head to feet h tall (fraction of frame),
     * feet at (x, y).
     *   pose: "stand" | "walk" | "cheer" (arms up) | "open" (arms out) | "sit" |
     *         "wave" | "point" | "kneel" | "pray" | "reach" (one arm up to the sky) | "hug"
     *   facing: "front" | "back" (no face drawn; the back of the head)
     *   hair: "short" | "long" | "curly" | "bun" | "afro" | "bald" | "hood" | "hat"
     *   skin, hairColor, top, bottom, shoes: colours
     *   robe: true draws a long garment to the ankles (in `top`)
     *   rim: a colour for a thin light around the figure (night scenes)
     *   silhouette: one colour for everything (backlit)
     *   walk: steps per second when pose is "walk"; dx moves the figure over the shot
     */
    k.person = (o = {}) => {
      const {
        x = 0.5, y = 0.85, h = 0.3, pose = "stand", facing = "front", hair = "short",
        skin = "#b9825a", hairColor = "#2a1d16", top = "#c9a27e", bottom = "#2c2a35", shoes = "#1d1a1a",
        robe = false, rim = null, silhouette = null, walk = 1.5, dx = 0, scale = 1, flip = false, build = 1,
      } = o;
      const target = g;
      let layer = null;
      if (rim) {
        layer = k._layer || (k._layer = document.createElement("canvas"));
        layer.width = target.canvas.width; layer.height = target.canvas.height;
        g = layer.getContext("2d");
        g.setTransform(target.getTransform());
      }
      const c = (col) => silhouette || col;
      const U = (Y(h) * scale) / 7.4; // ~7.4 heads tall, measured in heads
      const ph = t * walk * Math.PI * 2;
      g.save();
      g.translate(X(x + dx * p), Y(y));
      if (flip) g.scale(-1, 1);
      g.lineCap = "round"; g.lineJoin = "round";
      const kneel = pose === "kneel", sit = pose === "sit";
      const lift = kneel ? U * 1.6 : sit ? U * 1.9 : 0; // how far the hips drop
      const hipY = -U * 3.55 + lift, shY = -U * 6.05 + lift, neckY = -U * 6.3 + lift;
      const bw = build;
      // a tapered limb through three points
      const limb = (pts, w0, w1, col) => {
        g.strokeStyle = col;
        for (let i = 0; i < pts.length - 1; i++) {
          g.lineWidth = w0 + (w1 - w0) * (i / Math.max(1, pts.length - 2));
          g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.stroke();
        }
      };
      // legs
      const legs = () => {
        if (robe && pose !== "walk" && !sit && !kneel) return;
        const thigh = U * 1.75, shin = U * 1.75;
        const sides = [-1, 1];
        for (const s of sides) {
          let a = 0, bend = 0;
          if (pose === "walk") { a = Math.sin(ph + (s > 0 ? Math.PI : 0)) * 0.36; bend = Math.max(0, -Math.cos(ph + (s > 0 ? Math.PI : 0))) * 0.55; }
          let hx = s * U * 0.42 * bw, hy = hipY + U * 0.2, kx, ky, fx, fy;
          if (sit) { kx = hx + U * 1.7; ky = hy + U * 0.1; fx = kx + U * 0.15; fy = ky + shin; }
          else if (kneel) {
            if (s < 0) { kx = hx - U * 0.1; ky = hy + thigh * 0.95; fx = kx - U * 1.7; fy = ky + U * 0.05; }
            else { kx = hx + U * 1.2; ky = hy + U * 1.0; fx = kx; fy = 0; }
          } else {
            kx = hx + Math.sin(a) * thigh; ky = hy + Math.cos(a) * thigh;
            fx = kx + Math.sin(a - bend) * shin; fy = ky + Math.cos(a - bend) * shin;
          }
          limb([[hx, hy], [kx, ky], [fx, fy - U * 0.1]], U * 0.78 * bw, U * 0.56 * bw, c(bottom));
          g.fillStyle = c(shoes);
          g.beginPath(); g.ellipse(fx + (facing === "back" ? 0 : U * 0.08), fy - U * 0.1, U * 0.36, U * 0.2, 0, 0, 7); g.fill();
        }
      };
      // torso: rounded shoulders, a waist, the hips; a robe falls to the ankles
      const torso = () => {
        const sw = U * 1.05 * bw, ww = U * 0.78 * bw, hw = U * 0.86 * bw;
        g.fillStyle = c(top);
        g.beginPath();
        g.moveTo(-U * 0.3, neckY + U * 0.1);
        g.quadraticCurveTo(-sw, shY - U * 0.05, -sw, shY + U * 0.55);
        if (robe) {
          g.quadraticCurveTo(-ww, hipY, -hw * 1.35, -U * 0.15);
          g.lineTo(hw * 1.35, -U * 0.15);
          g.quadraticCurveTo(ww, hipY, sw, shY + U * 0.55);
        } else {
          g.quadraticCurveTo(-ww * 0.98, hipY - U * 0.9, -hw, hipY + U * 0.45);
          g.lineTo(hw, hipY + U * 0.45);
          g.quadraticCurveTo(ww * 0.98, hipY - U * 0.9, sw, shY + U * 0.55);
        }
        g.quadraticCurveTo(sw, shY - U * 0.05, U * 0.3, neckY + U * 0.1);
        g.closePath(); g.fill();
        if (!robe && !silhouette) { g.fillStyle = bottom; g.fillRect(-hw, hipY + U * 0.05, hw * 2, U * 0.45); }
      };
      // arms: [upper angle, forearm bend] in radians from hanging straight down, + = away from the body
      const A = {
        stand: [[0.1, 0.05], [0.1, 0.05]], walk: null, cheer: [[2.75, 0.15], [2.75, 0.15]], open: [[1.45, 0.08], [1.45, 0.08]],
        wave: [[0.1, 0.05], [2.4, 0.55]], point: [[0.1, 0.05], [1.5, 0]], reach: [[0.1, 0.05], [2.9, 0.05]],
        pray: [[0.25, -1.9], [0.25, -1.9]], hug: [[0.7, -1.6], [0.7, -1.6]], sit: [[0.25, -0.9], [0.25, -0.9]],
        kneel: [[0.15, -0.5], [0.15, -0.5]], hold: [[0.12, -0.5], [0.12, -0.5]],
      };
      const arms = () => {
        const upper = U * 1.5, fore = U * 1.4;
        let set = A[pose] || A.stand;
        if (pose === "walk") { const sw = Math.sin(ph) * 0.38; set = [[0.06 + sw, -0.15], [0.06 - sw, -0.15]]; }
        if (pose === "wave") set = [set[0], [2.4, 0.55 + Math.sin(t * 8) * 0.35]];
        [-1, 1].forEach((s, i) => {
          const [a1, a2] = set[i];
          const sx = s * U * 0.88 * bw, sy = shY + U * 0.45;
          const ex = sx + s * Math.sin(a1) * upper, ey = sy + Math.cos(a1) * upper;
          const a = a1 + a2;
          const hx = ex + s * Math.sin(a) * fore, hy = ey + Math.cos(a) * fore;
          limb([[sx, sy], [ex, ey], [hx, hy]], U * 0.5 * bw, U * 0.4 * bw, c(top));
          g.fillStyle = c(skin);
          g.beginPath(); g.arc(hx, hy, U * 0.22, 0, 7); g.fill();
        });
      };
      const head = () => {
        g.fillStyle = c(skin);
        g.fillRect(-U * 0.2, neckY - U * 0.15, U * 0.4, U * 0.4);
        const hy = neckY - U * 0.62, hr = U * 0.58;
        const back = facing === "back";
        if (hair === "long") { g.fillStyle = c(hairColor); g.beginPath(); g.ellipse(0, hy + U * 0.55, hr * 1.02, U * 1.35, 0, 0, 7); g.fill(); }
        g.fillStyle = c(back && hair !== "bald" ? hairColor : skin);
        g.beginPath(); g.ellipse(0, hy, hr * 0.86, hr, 0, 0, 7); g.fill();
        g.fillStyle = c(hairColor);
        if (hair === "short") { g.beginPath(); g.ellipse(0, hy - hr * 0.25, hr * 0.92, hr * 0.8, 0, Math.PI * 1.02, -0.02); g.fill(); }
        else if (hair === "long") { g.beginPath(); g.ellipse(0, hy - hr * 0.2, hr * 0.98, hr * 0.88, 0, Math.PI, 0); g.fill(); }
        else if (hair === "curly" || hair === "afro") {
          const big = hair === "afro" ? 1.35 : 1;
          for (let i = 0; i < 11; i++) { const a = Math.PI * 0.9 + (i / 10) * Math.PI * 1.2; g.beginPath(); g.arc(Math.cos(a) * hr * 0.82 * big, hy - hr * 0.15 + Math.sin(a) * hr * 0.8 * big, hr * 0.36 * big, 0, 7); g.fill(); }
        } else if (hair === "bun") { g.beginPath(); g.ellipse(0, hy - hr * 0.25, hr * 0.92, hr * 0.78, 0, Math.PI, 0); g.fill(); g.beginPath(); g.arc(0, hy - hr * 1.05, hr * 0.4, 0, 7); g.fill(); }
        else if (hair === "hood") { g.fillStyle = c(top); g.beginPath(); g.ellipse(0, hy, hr * 1.1, hr * 1.15, 0, 0, 7); g.fill(); g.fillStyle = c(back ? top : skin); g.beginPath(); g.ellipse(0, hy + hr * 0.12, hr * 0.68, hr * 0.78, 0, 0, 7); g.fill(); }
        else if (hair === "hat") { g.beginPath(); g.moveTo(-hr * 2.1, hy - hr * 0.3); g.lineTo(0, hy - hr * 1.55); g.lineTo(hr * 2.1, hy - hr * 0.3); g.closePath(); g.fill(); }
        else if (hair === "cap") { g.beginPath(); g.ellipse(0, hy - hr * 0.3, hr * 0.95, hr * 0.75, 0, Math.PI, 0); g.fill(); g.fillRect(-hr * 0.2, hy - hr * 0.35, hr * 1.4, hr * 0.18); }
      };
      // back-facing: arms behind the torso read wrong, so they go first only when facing away is false
      legs();
      if (facing === "back") { arms(); torso(); } else { torso(); arms(); }
      head();
      g.restore();
      if (layer) {
        // the rim: the figure's own outline, lit, then the figure over it
        target.save();
        target.setTransform(1, 0, 0, 1, 0, 0);
        target.shadowColor = rim; target.shadowBlur = 7 * u;
        for (const [ox, oy] of [[-2.5, 0], [2.5, 0], [0, -2.5]]) { target.shadowOffsetX = ox * u; target.shadowOffsetY = oy * u; target.drawImage(layer, 0, 0); }
        target.shadowColor = "transparent";
        target.drawImage(layer, 0, 0);
        target.restore();
        g = target;
      }
    };

    /** Several people walking or standing together. people: [{...person options}] */
    k.people = (list) => list.forEach((o) => k.person(o));

    return k;
  }

  window.ShortsKit = { make, rng, hashStr, mix, alpha };
})();
