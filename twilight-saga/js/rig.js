/*
 * Stick-figure character rig in the storyboard's style: big round beige heads with thick black
 * outlines, dot eyes, simple clothes, thick limb strokes. Everything is drawn procedurally from a
 * pose, so characters can walk, turn, blink, gesture, crouch, sit, fight and react.
 *
 * Units: u = H/100 (H = standing height in px). Origin = ground point between the feet.
 * The rig always faces +x internally; facing < 0 mirrors it.
 */
(function () {
  const K = "#151515";             // outline ink
  const SKIN = "#f2dcbf", PALE = "#f6e8da", TAN = "#c58c5c";

  const CAST = {
    bella:    { skin: SKIN, hair: { style: "long", c: "#5a3420", c2: "#3a2112" }, top: { style: "jacket", c: "#4f7d46", c2: "#3c6235", hood: true },
                legs: { style: "jeans", c: "#3e5f93" }, shoes: "#222" },
    edward:   { skin: PALE, hair: { style: "spiky", c: "#b98a52", c2: "#7d5a30", c3: "rgba(255,230,170,0.35)" }, top: { style: "coat", c: "#2b2b30", c2: "#4a4a52", shirt: "#d9d9de" },
                legs: { style: "stick", c: K }, shoes: "#111" },
    jacob:    { skin: TAN, hair: { style: "messy", c: "#1b1715", c2: "#3d3430", c3: "rgba(255,255,255,0.12)" }, top: { style: "tee", c: "#6f5643", c2: "#5a4535" },
                legs: { style: "jeans", c: "#2f4f7f" }, shoes: "#3a2a20" },
    james:    { skin: PALE, hair: { style: "pony", c: "#ecdcab", c2: "#c2ad73" }, top: { style: "longcoat", c: "#1c1c1f", c2: "#3a3a40", shirt: "#f0f0f0" },
                legs: { style: "stick", c: K }, shoes: "#111" },
    victoria: { skin: PALE, hair: { style: "wild", c: "#a9461e", c2: "#d0682f" }, top: { style: "longcoat", c: "#1e1414", c2: "#6e1717", shirt: "#3a1010" },
                legs: { style: "stick", c: K }, shoes: "#111", eyes: "#b3121a" },
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---- default pose ---------------------------------------------------------------------------
  function pose(p = {}) {
    return Object.assign({
      x: 0, y: 0, H: 600, face: 0.6, back: false, lean: 0, tilt: 0, look: 0,
      hip: null,                         // explicit hip height above ground (sitting); null = auto-ground
      legL: [0.05, 0.05], legR: [-0.05, 0.05],   // [thigh angle from down (+ = forward), knee bend]
      armL: [0.05, 0.15], armR: [-0.05, 0.15],   // [upper arm angle, elbow bend]
      blink: 0, mouth: "line", brows: 0, eyeGlow: 0, wind: 0, t: 0, alpha: 1, sparkle: 0,
    }, p);
  }

  // walking: phase in radians, amount 0..1
  function walk(p, phase, amt = 1, stride = 0.42) {
    const s = Math.sin(phase), c = Math.cos(phase);
    p.legL = [stride * s * amt, (0.15 + 0.55 * Math.max(0, -c)) * amt + 0.05];
    p.legR = [-stride * s * amt, (0.15 + 0.55 * Math.max(0, c)) * amt + 0.05];
    p.armL = [-0.45 * s * amt + 0.1, 0.35];
    p.armR = [0.45 * s * amt - 0.1, 0.35];
    p.bob = Math.abs(Math.cos(phase)) * 1.6 * amt;
    p.lean = (p.lean || 0) + 0.05 * amt;
    return p;
  }

  function blinkAt(t, seed = 0) {             // natural blinking, deterministic in t
    const period = 3.1 + hash(seed) * 1.7, ph = (t + hash(seed + 9) * period) % period;
    return ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
  }

  // ---- drawing helpers ------------------------------------------------------------------------
  function limb(g, pts, w, color, u, outline = true) {
    g.lineCap = "round"; g.lineJoin = "round";
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
    if (outline) { path(); g.strokeStyle = K; g.lineWidth = w + 3.2 * u; g.stroke(); }
    path(); g.strokeStyle = color; g.lineWidth = w; g.stroke();
  }
  function blob(g, pts, fill, u, lw = 1.7) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i], [px, py] = pts[i - 1];
      g.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = lw * u; g.strokeStyle = K; g.stroke();
  }
  function poly(g, pts, fill, u, lw = 1.7, stroke = true) {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw * u; g.strokeStyle = K; g.lineJoin = "round"; g.stroke(); }
  }

  // ---- hair (drawn in the storyboard's 3/4-profile convention: rig faces +x, back of head at -x) ----
  const isLong = s => s === "long" || s === "wild";
  const isFluffy = s => s === "spiky" || s === "messy" || s === "short";
  const prof = p => !p.back && Math.abs(p.face) >= 0.35;

  function strands(g, c2, u, pts, n, jit) {
    g.strokeStyle = c2; g.lineWidth = 0.75 * u; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const [x0, y0, x1, y1, bend] = pts(i);
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + bend + jit(i), (y0 + y1) / 2, x1 + jit(i + 5), y1); g.stroke();
    }
  }

  function hairBack(g, c, p, hx, hy, u) {
    const h = c.hair, w = p.wind, t = p.t;
    const sw = k => Math.sin(t * 2.1 + k) * (1 + 3 * w) * u + w * 5 * u * (k % 3) * 0.3;
    if (isLong(h.style)) {
      const L = (h.style === "wild" ? 66 : 52) * u, side = prof(p) ? 1 : 0;
      const bx = side ? hx - 7 * u : hx, wid = (h.style === "wild" ? 22 : (p.back ? 18 : 20)) * u;
      // a full, wavy mass falling behind the shoulders
      const pts = [[bx - wid * 0.75, hy - 12 * u], [bx - wid, hy + 2 * u], [bx - wid - 3 * u + sw(1), hy + 18 * u], [bx - wid + 1 * u + sw(2), hy + L * 0.45], [bx - wid - 2.5 * u + sw(4), hy + L * 0.72]];
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const k = i / n, x = bx - wid + k * wid * 2;
        pts.push([x + sw(i + 3) + (i % 2 ? 2 : -2) * u, hy + L - (i % 2 ? 7 : 0) * u + sw(i) * 0.6]);
      }
      pts.push([bx + wid - 1 * u + sw(9), hy + L * 0.65], [bx + wid * 0.85 + sw(10) * 0.5, hy + 14 * u], [bx + wid * 0.7, hy - 2 * u], [bx + wid * 0.45, hy - 15 * u], [bx, hy - 19.5 * u]);
      blob(g, pts, h.c, u, 1.7);
      strands(g, h.c2, u, i => {
        const x = bx - wid * 0.8 + i * wid * 0.22;
        return [x, hy - 6 * u, x + sw(i) * 0.6, hy + L * (0.78 + 0.12 * Math.sin(i * 2.3)), (i % 2 ? 2 : -2) * u];
      }, 8, i => sw(i) * 0.3);
    } else if (h.style === "pony") {
      blob(g, [[hx - 9 * u, hy - 4 * u], [hx - 15 * u + sw(1), hy + 10 * u], [hx - 17 * u + sw(2), hy + 24 * u], [hx - 11 * u + sw(3), hy + 22 * u], [hx - 6 * u, hy + 4 * u]], h.c, u, 1.7);
    }
  }

  function fluffyPath(g, h, p, hx, hy, u, full) {
    const t = p.t, w = p.wind, P = prof(p) && !full;
    const amp = h.style === "spiky" ? 0.3 : h.style === "messy" ? 0.24 : 0.09;
    const cx = P ? hx - 2.5 * u : hx, cy = full ? hy - 0.5 * u : hy - 5.2 * u, rx = (full ? 14.6 : 15) * u, ry = (full ? 16.2 : 12.8) * u;
    const jit = k => Math.sin(t * 2.6 + k * 1.9) * (0.35 + w) * u;
    // outer tufted edge: from the front of the forehead, over the top, down the back
    const a0 = full ? -0.55 : P ? -0.25 : -0.05, a1 = full ? Math.PI + 0.55 : P ? Math.PI + 1.05 : Math.PI + 0.05, n = 30;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = -(a0 + (a1 - a0) * (i / n)), tip = i % 2 === 1;
      const r = tip ? 1 + amp * (0.45 + hash(i * 1.37 + 3) * 0.9) : 0.93;
      const sk = tip ? (hash(i + 17) - 0.5) * 0.22 : 0;
      pts.push([cx + Math.cos(a + sk) * rx * r + (tip ? jit(i) : 0), cy + Math.sin(a + sk) * ry * r + (tip ? jit(i + 4) * 0.7 : 0)]);
    }
    // inner edge: hairline at the nape/ear, then fringe tufts falling over the forehead
    if (full) pts.push([hx - 8 * u, hy + 14 * u], [hx, hy + 15 * u], [hx + 8 * u, hy + 14 * u]);   // nape
    else if (P) pts.push([hx - 9 * u, hy + 9 * u], [hx - 6.5 * u, hy + 4 * u], [hx - 5.5 * u, hy - 1 * u], [hx - 2 * u, hy - 4 * u],
      [hx + 0 * u + jit(1), hy - 1.5 * u], [hx + 2.5 * u, hy - 5 * u], [hx + 5 * u + jit(2), hy - 1.5 * u], [hx + 7 * u, hy - 5.2 * u],
      [hx + 10 * u + jit(3), hy - 2.6 * u], [hx + 11 * u, hy - 6.5 * u]);
    else pts.push([hx - 12.6 * u, hy + 3 * u], [hx - 10 * u, hy - 4 * u], [hx - 7 * u + jit(1), hy - 1 * u], [hx - 4.5 * u, hy - 5.5 * u],
      [hx - 1.5 * u + jit(2), hy - 1.6 * u], [hx + 1.5 * u, hy - 5.5 * u], [hx + 4.5 * u + jit(3), hy - 1.2 * u], [hx + 7 * u, hy - 5 * u],
      [hx + 10 * u + jit(4), hy - 1.5 * u], [hx + 12.6 * u, hy + 3 * u]);
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = h.c; g.fill(); g.lineWidth = 1.7 * u; g.strokeStyle = K; g.lineJoin = "round"; g.stroke();
    // texture: short flowing strokes, darker and a few highlights
    for (const [col, n2, off] of [[h.c2, 14, 0], [h.c3 || "rgba(255,255,255,0.22)", 6, 7]]) {
      g.strokeStyle = col; g.lineWidth = 0.75 * u;
      for (let i = 0; i < n2; i++) {
        const a = -(a0 + (a1 - a0) * hash(i + off * 3.1)), r = 0.25 + 0.6 * hash(i * 2.7 + off);
        const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 2 * u + jit(i), y + Math.sin(a) * 2 * u, x + Math.cos(a + 0.4) * 4.5 * u, y + Math.sin(a + 0.4) * 4.5 * u + 1.5 * u); g.stroke();
      }
    }
  }

  function hairFront(g, c, p, hx, hy, u) {
    const h = c.hair, t = p.t, w = p.wind, P = prof(p);
    const jit = k => Math.sin(t * 3 + k * 1.7) * (0.4 + w) * u;
    if (isFluffy(h.style)) return fluffyPath(g, h, p, hx, hy, u, p.back);
    if (h.style === "hood") {
      g.beginPath(); g.moveTo(hx - 12.5 * u, hy + 7 * u); g.bezierCurveTo(hx - 13.5 * u, hy - 18 * u, hx + 13.5 * u, hy - 18 * u, hx + 12.5 * u, hy + 7 * u);
      g.quadraticCurveTo(hx + 7 * u, hy - 10 * u, hx, hy - 10 * u); g.quadraticCurveTo(hx - 7 * u, hy - 10 * u, hx - 12.5 * u, hy + 7 * u);
      g.fillStyle = h.c; g.fill(); g.lineWidth = 1.7 * u; g.strokeStyle = K; g.stroke(); return;
    }
    if (h.style === "pony") {
      g.beginPath(); g.moveTo(hx - 12.8 * u, hy + 2 * u);
      g.bezierCurveTo(hx - 13.5 * u, hy - 19 * u, hx + 13.5 * u, hy - 20 * u, hx + 12.6 * u, hy - 4 * u);
      g.quadraticCurveTo(hx + 4 * u, hy - 11 * u, hx - 12.8 * u, hy + 2 * u);
      g.fillStyle = h.c; g.fill(); g.lineWidth = 1.7 * u; g.strokeStyle = K; g.stroke();
      strands(g, h.c2, u, i => [hx + 9 * u - i * 4 * u, hy - 10 * u, hx - 10 * u - i * u, hy - 5 * u, -3 * u], 4, jit); return;
    }
    if (!isLong(h.style)) return;
    const big = h.style === "wild" ? 1.2 : 1;
    if (p.back) {   // from behind: the long hair covers the whole head and runs down the back
      g.beginPath(); g.ellipse(hx, hy - 1 * u, 13.2 * big * u, 15.4 * u, 0, 0, Math.PI * 2); g.fillStyle = h.c; g.fill(); g.lineWidth = 1.7 * u; g.strokeStyle = K; g.stroke();
      strands(g, h.c2, u, i => [hx + (i - 3.5) * 2 * u, hy - 14 * u, hx + (i - 3.5) * 3.6 * u, hy + 14 * u, 0], 8, jit); return;
    }
    g.beginPath();
    if (P) {   // profile: cap over the top and back of the head, fringe swept toward the face
      g.moveTo(hx + 11.8 * u, hy - 3 * u);
      g.bezierCurveTo(hx + 10 * u, hy - 19 * u, hx - 8 * u, hy - 21 * u, hx - 13.5 * big * u, hy - 8 * u);
      g.quadraticCurveTo(hx - 16 * big * u, hy + 6 * u, hx - 13 * u + jit(1), hy + 18 * u);
      g.quadraticCurveTo(hx - 8 * u, hy + 14 * u, hx - 6.5 * u, hy + 4 * u);
      g.quadraticCurveTo(hx - 6 * u, hy - 4 * u, hx - 1 * u, hy - 7.5 * u);
      g.quadraticCurveTo(hx + 6 * u + jit(2), hy - 9 * u, hx + 11.8 * u, hy - 3 * u);
    } else {   // facing us: centre part, both sides framing the face
      g.moveTo(hx - 13.6 * big * u, hy + 16 * u);
      g.bezierCurveTo(hx - 17 * big * u, hy - 20 * u, hx + 17 * big * u, hy - 20 * u, hx + 13.6 * big * u, hy + 16 * u);
      g.quadraticCurveTo(hx + 9 * u, hy + 8 * u, hx + 8.5 * u, hy - 1 * u);
      g.quadraticCurveTo(hx + 6 * u, hy - 8 * u, hx + 0.5 * u, hy - 10 * u);
      g.quadraticCurveTo(hx - 6 * u, hy - 8 * u, hx - 8.5 * u, hy - 1 * u);
      g.quadraticCurveTo(hx - 9 * u, hy + 8 * u, hx - 13.6 * big * u, hy + 16 * u);
    }
    g.closePath(); g.fillStyle = h.c; g.fill(); g.lineWidth = 1.7 * u; g.strokeStyle = K; g.stroke();
    strands(g, h.c2, u, P ? (i => [hx + 9 * u - i * 3.2 * u, hy - 14 * u + Math.abs(i - 2) * u, hx + 4 * u - i * 3.8 * u, hy - 3 * u + i * 2.6 * u, -2 * u])
                          : (i => { const sd = i < 3 ? -1 : 1, k = i % 3; return [hx + sd * (2 + k * 3) * u, hy - 14 * u + k * u, hx + sd * (10 + k * 1.6) * u, hy + 10 * u + k * 2 * u, sd * 1.5 * u]; }), 6, jit);
  }

  // ---- torso / clothes ------------------------------------------------------------------------
  function torso(g, c, p, sh, hipY, u) {
    const top = c.top, w = p.wind, t = p.t;
    const flap = k => Math.sin(t * 2.4 + k) * (0.6 + 4 * w) * u;
    const [sx, sy] = sh;                        // neck base
    if (top.style === "cloak") return;          // drawn separately
    if (top.style === "dress") {
      const hem = 35 * u, wHem = 22 * u;
      const pts = [[sx - 6 * u, sy], [sx - 9 * u, sy + 4 * u], [sx - 7 * u, hipY - 4 * u], [-wHem + flap(1), hem - 1 * u], [-wHem * 1.6 + flap(2), hem], [wHem + flap(3), hem], [sx + 9 * u, hipY - 6 * u], [sx + 8 * u, sy + 4 * u], [sx + 6 * u, sy]];
      poly(g, pts, top.c, u);
      g.strokeStyle = "#d8cfc2"; g.lineWidth = 0.8 * u;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(sx - 4 * u + i * 1.5 * u, hipY - 4 * u); g.quadraticCurveTo(-20 * u + i * 6 * u, hipY * 0.4, -28 * u + i * 9 * u + flap(i), -1 * u); g.stroke(); }
      return;
    }
    const long = top.style === "longcoat" ? 1 : top.style === "coat" ? 0.45 : 0;
    const hemY = lerp(hipY + 3 * u, 33 * u, long);
    const hw = (top.style === "tee" ? 9 : 10.5) * u, ww = (top.style === "tee" ? 8.5 : 11) * u + long * 7 * u;
    const pts = [[sx - 5 * u, sy - 1 * u], [sx - hw, sy + 3 * u], [sx - hw - 0.5 * u, hipY - 6 * u], [-ww + flap(1) * long, hemY], [ww + flap(2) * long, hemY + flap(3) * 0.3], [sx + hw + 0.5 * u, hipY - 6 * u], [sx + hw, sy + 3 * u], [sx + 5 * u, sy - 1 * u]];
    if (top.hood) blob(g, [[sx - 7 * u, sy - 2 * u], [sx - 9 * u, sy - 7 * u], [sx - 2 * u, sy - 9 * u], [sx + 6 * u, sy - 6 * u], [sx + 7 * u, sy - 1 * u]], top.c2, u);
    poly(g, pts, top.c, u);
    // shading panel + details
    g.save(); g.clip();
    g.fillStyle = top.c2; g.globalAlpha = 0.55;
    g.beginPath(); g.moveTo(sx - hw, sy + 3 * u); g.lineTo(sx - hw * 0.4, sy + 3 * u); g.lineTo(-ww * 0.4, hemY); g.lineTo(-ww - 2 * u, hemY); g.closePath(); g.fill();
    g.restore(); g.globalAlpha = 1;
    if (top.shirt) {     // open coat: shirt V and lapels
      poly(g, [[sx - 3.5 * u, sy - 0.5 * u], [sx + 3.5 * u, sy - 0.5 * u], [sx + 1.2 * u, sy + 13 * u], [sx - 1.2 * u, sy + 13 * u]], top.shirt, u, 0.8);
      g.strokeStyle = K; g.lineWidth = 0.9 * u;
      g.beginPath(); g.moveTo(sx, sy + 13 * u); g.lineTo(lerp(sx, 0, 0.5), hemY - 1 * u); g.stroke();
      if (top.tie) { poly(g, [[sx - 0.9 * u, sy + 0.5 * u], [sx + 0.9 * u, sy + 0.5 * u], [sx + 1.2 * u, sy + 10 * u], [sx, sy + 12 * u], [sx - 1.2 * u, sy + 10 * u]], top.tie, u, 0.6); }
    } else if (top.style === "jacket") {
      g.strokeStyle = K; g.lineWidth = 0.8 * u;
      g.beginPath(); g.moveTo(sx + 1.5 * u, sy + 1 * u); g.lineTo(lerp(sx, 0, 1) + 1.5 * u, hemY - 0.5 * u); g.stroke();
    } else if (top.style === "tee") {
      g.strokeStyle = K; g.lineWidth = 0.8 * u;
      g.beginPath(); g.arc(sx, sy - 0.5 * u, 3.4 * u, 0.2, Math.PI - 0.2); g.stroke();
    }
  }

  function legs(g, c, p, hips, feet, knees, u) {
    const L = c.legs;
    if (L.style === "none") return;
    const wide = L.style === "jeans" ? 7.4 * u : 4.2 * u;
    const col = L.style === "jeans" ? L.c : (L.c || K);
    for (let i = 0; i < 2; i++) {
      limb(g, [hips[i], knees[i], feet[i]], wide, col, u, L.style === "jeans");
      // shoe
      g.save(); g.translate(feet[i][0], feet[i][1]);
      g.beginPath(); g.ellipse(2.6 * u, -0.6 * u, 4.6 * u, 2.3 * u, 0, 0, Math.PI * 2);
      g.fillStyle = c.shoes || K; g.fill(); g.lineWidth = 1 * u; g.strokeStyle = K; g.stroke(); g.restore();
    }
    if (L.style === "jeans") {   // seat joining the legs
      g.beginPath(); g.ellipse(0, hips[0][1], 8.4 * u, 4.2 * u, 0, 0, Math.PI * 2); g.fillStyle = L.c; g.fill();
    }
  }

  function arm(g, c, p, sh, ang, u, side) {
    const [a, e] = ang, up = 13.5 * u, fo = 12.5 * u;
    const el = [sh[0] + Math.sin(a) * up, sh[1] + Math.cos(a) * up];
    const a2 = a + e;
    const wr = [el[0] + Math.sin(a2) * fo, el[1] + Math.cos(a2) * fo];
    const sleeve = c.top.style === "tee" ? [sh, [lerp(sh[0], el[0], 0.55), lerp(sh[1], el[1], 0.55)]] : [sh, el, wr];
    const sleeveCol = c.top.style === "cloak" ? c.top.c : c.top.style === "dress" ? c.skin : (c.top.style === "none" ? c.skin : c.top.c);
    if (c.top.style === "tee" || c.top.style === "none") limb(g, [sh, el, wr], 4.2 * u, c.skin, u);
    if (c.top.style !== "none") limb(g, sleeve, (c.top.style === "tee" ? 6.6 : 6.2) * u, sleeveCol, u);
    // hand
    g.beginPath(); g.arc(wr[0], wr[1], 1.75 * u, 0, Math.PI * 2); g.fillStyle = c.gloves || c.skin; g.fill(); g.lineWidth = 1.1 * u; g.strokeStyle = K; g.stroke();
    return wr;
  }

  function face(g, c, p, hx, hy, u) {
    if (p.back) return;
    const P = prof(p), look = p.look * 1.6 * u, bl = Math.max(p.blink, 0);
    // the storyboard draws a single dot eye in 3/4 profile, two when facing us
    const eyes = P ? [[hx + 6.2 * u + look, hy + 1.2 * u]] : [[hx - 4.2 * u + look, hy + 1 * u], [hx + 4.2 * u + look, hy + 1 * u]];
    for (const [x, ey] of eyes) {
      if (p.eyesClosed) { g.strokeStyle = K; g.lineWidth = 1 * u; g.beginPath(); g.arc(x, ey - 0.8 * u, 1.9 * u, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); continue; }
      g.save(); g.translate(x, ey); g.scale(1, Math.max(0.12, 1 - bl));
      if (p.eyeGlow > 0) { g.shadowColor = c.eyes || "#c0101a"; g.shadowBlur = 8 * u * p.eyeGlow; }
      g.beginPath(); g.ellipse(0, 0, 1.55 * u, 1.85 * u, 0, 0, Math.PI * 2);
      g.fillStyle = p.eyeGlow > 0.3 ? (c.eyes || "#c0101a") : K; g.fill(); g.restore();
      if (p.brows) {   // + angry / - sad
        g.strokeStyle = K; g.lineWidth = 1 * u; g.beginPath();
        g.moveTo(x - 2 * u, ey - 3.8 * u - p.brows * 0.9 * u); g.lineTo(x + 2 * u, ey - 3.8 * u + p.brows * 0.9 * u); g.stroke();
      }
    }
    // mouths only when there's an expression (the art leaves neutral faces without one)
    const mx = P ? hx + 7.6 * u + look : hx + look, my = hy + 7.6 * u;
    g.strokeStyle = K; g.lineWidth = 1 * u; g.beginPath();
    if (p.mouth === "smile") { g.arc(mx, my - 1.6 * u, 2.1 * u, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    else if (p.mouth === "sad") { g.arc(mx, my + 1.6 * u, 1.8 * u, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
    else if (p.mouth === "o") { g.ellipse(mx, my, 1.1 * u, 1.5 * u, 0, 0, Math.PI * 2); g.fillStyle = "#3a1810"; g.fill(); }
    else if (p.mouth === "talk") { const o = 0.4 + Math.abs(Math.sin(p.t * 14)) * 1.1; g.ellipse(mx, my, 1.3 * u, o * u, 0, 0, Math.PI * 2); g.fillStyle = "#3a1810"; g.fill(); }
    if (p.blush) { g.fillStyle = "rgba(230,120,120,0.35)"; g.beginPath(); g.arc(eyes[0][0] - 1 * u, my - 2.5 * u, 2 * u, 0, 7); if (!P) g.arc(eyes[1][0] + 1 * u, my - 2.5 * u, 2 * u, 0, 7); g.fill(); }
    if (p.tear) { g.fillStyle = "rgba(150,200,255,0.9)"; g.beginPath(); g.ellipse(eyes[0][0] + 0.5 * u, eyes[0][1] + 3 * u + (p.t * 8 % 6) * u, 0.7 * u, 1.1 * u, 0, 0, 7); g.fill(); }
  }

  function cloak(g, c, p, neck, u) {   // Volturi cloak: hooded bell with red lining
    const t = p.t, w = p.wind, flap = k => Math.sin(t * 1.8 + k) * (0.8 + 3 * w) * u;
    const [nx, ny] = neck;
    poly(g, [[nx - 9 * u, ny - 2 * u], [nx - 13 * u, ny + 8 * u], [-19 * u + flap(1), 35.5 * u], [19 * u + flap(2), 35.5 * u], [nx + 13 * u, ny + 8 * u], [nx + 9 * u, ny - 2 * u]], c.top.c, u);
    g.strokeStyle = c.top.c2; g.lineWidth = 1.6 * u;
    g.beginPath(); g.moveTo(nx - 2 * u, ny + 3 * u); g.lineTo(-5 * u + flap(3) * 0.3, 35 * u); g.moveTo(nx + 2 * u, ny + 3 * u); g.lineTo(5 * u + flap(4) * 0.3, 35 * u); g.stroke();
    if (c.top.clasp) { g.beginPath(); g.arc(nx, ny + 3 * u, 1.5 * u, 0, 7); g.fillStyle = c.top.clasp; g.fill(); g.lineWidth = 0.6 * u; g.strokeStyle = K; g.stroke(); }
  }

  // ---- main draw ------------------------------------------------------------------------------
  function draw(g, c, p) {
    if (p.alpha <= 0) return;
    if (!p.still) {   // idle life: breathing sway and a slow drift in the arms
      const seed = (p.x * 0.013) % 7;
      p.lean = (p.lean || 0) + Math.sin(p.t * 1.15 + seed) * 0.012;
      p.armL = [p.armL[0] + Math.sin(p.t * 1.3 + seed) * 0.05, p.armL[1] + Math.sin(p.t * 0.9 + seed) * 0.06];
      p.armR = [p.armR[0] + Math.sin(p.t * 1.2 + seed + 2) * 0.05, p.armR[1] + Math.sin(p.t * 1.0 + seed + 1) * 0.06];
      p.tilt = (p.tilt || 0) + Math.sin(p.t * 0.7 + seed) * 0.02;
    }
    const u = p.H / 100, s = p.face < 0 ? -1 : 1;
    g.save();
    g.globalAlpha = p.alpha;
    g.translate(p.x, p.y);
    if (p.scaleX) g.scale(p.scaleX, 1);
    g.scale(s, 1);
    // legs: FK from hips, then ground
    const hipY0 = -36 * u, th = 18.5 * u, sn = 17.5 * u;
    const leg = (L, ox) => {
      const [a, b] = L, k = [ox + Math.sin(a) * th, hipY0 + Math.cos(a) * th];
      const a2 = a - b, f = [k[0] + Math.sin(a2) * sn, k[1] + Math.cos(a2) * sn];
      return [k, f];
    };
    let [kL, fL] = leg(p.legL, -3.6 * u), [kR, fR] = leg(p.legR, 3.6 * u);
    let lift = p.hip != null ? (hipY0 + p.hip * u) : Math.max(fL[1], fR[1]);   // shift so lowest foot is on the ground
    lift -= (p.bob || 0) * u * -1;
    const shift = pt => [pt[0], pt[1] - lift];
    const hips = [[-3.6 * u, hipY0 - lift], [3.6 * u, hipY0 - lift]];
    kL = shift(kL); fL = shift(fL); kR = shift(kR); fR = shift(fR);
    const hipC = [0, hipY0 - lift];
    // upper body around the hip pivot
    g.save(); g.translate(hipC[0], hipC[1]); g.rotate(p.lean);
    const neck = [0, -34 * u], shL = [-8.4 * u, -31 * u], shR = [8.4 * u, -31 * u];
    const head = [0 + 1 * u, -50 * u];
    const hx = head[0], hy = head[1];
    g.restore();
    // draw order
    const upper = fn => { g.save(); g.translate(hipC[0], hipC[1]); g.rotate(p.lean); fn(); g.restore(); };
    const headDo = fn => upper(() => { g.save(); g.translate(hx, hy + 13 * u); g.rotate(p.tilt); g.translate(-hx, -hy - 13 * u); fn(); g.restore(); });
    if (!(p.back && (c.hair.style === "long" || c.hair.style === "wild"))) headDo(() => hairBack(g, c, p, hx, hy, u));
    if (p.back) upper(() => { arm(g, c, p, shL, p.armL, u, 0); arm(g, c, p, shR, p.armR, u, 1); });
    if (c.top.style !== "cloak" && c.top.style !== "dress") legs(g, c, p, hips, [fL, fR], [kL, kR], u);
    upper(() => (c.top.style === "cloak" ? cloak(g, c, p, neck, u) : torso(g, c, p, neck, 0, u)));
    if (p.back && (c.hair.style === "long" || c.hair.style === "wild")) headDo(() => hairBack(g, c, p, hx, hy, u));
    const hands = {};
    if (!p.back) upper(() => {
      if (c.top.style !== "cloak" || p.showHands) { hands.L = arm(g, c, p, shL, p.armL, u, 0); hands.R = arm(g, c, p, shR, p.armR, u, 1); }
    });
    // head
    headDo(() => {
      g.beginPath(); g.ellipse(hx, hy, 12.4 * u, 14.6 * u, 0, 0, Math.PI * 2);
      g.fillStyle = c.skin; g.fill(); g.lineWidth = 1.9 * u; g.strokeStyle = K; g.stroke();
      if (p.sparkle > 0) sparkles(g, hx, hy, u, p);
      face(g, c, p, hx, hy, u);
      hairFront(g, c, p, hx, hy, u);
      if (c.veil) { g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.moveTo(hx - 4 * u, hy - 12 * u); g.quadraticCurveTo(hx - 30 * u, hy + 20 * u, hx - 34 * u + Math.sin(p.t * 1.5) * 3 * u, hy + 52 * u); g.lineTo(hx - 8 * u, hy + 50 * u); g.quadraticCurveTo(hx - 14 * u, hy + 10 * u, hx + 2 * u, hy - 12 * u); g.fill(); }
    });
    g.restore();
    return { hands, u, s, origin: [p.x, p.y], hipC, lift };
  }

  function sparkles(g, hx, hy, u, p) {   // diamond-skin sparkle
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const a = hash(i) * 6.28, r = hash(i + 7) * 12 * u, x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r * 1.1;
      const k = Math.max(0, Math.sin(p.t * 6 + i * 2.1)) * p.sparkle, s = (1.2 + 2.4 * k) * u;
      g.fillStyle = `rgba(255,255,255,${0.9 * k})`;
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.3, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.3, y); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y + s * 0.3); g.lineTo(x + s, y); g.lineTo(x, y - s * 0.3); g.closePath(); g.fill();
    }
    g.restore();
  }

  // a character spec builder for extras
  function extra(o) {
    return Object.assign({ skin: PALE, hair: { style: "short", c: "#3a2a20", c2: "#5a4535" }, top: { style: "coat", c: "#2a2a2e", c2: "#45454c", shirt: "#cfcfd4" },
      legs: { style: "stick", c: K }, shoes: "#111" }, o);
  }
  const VOLTURI = (hairC = "#151515") => ({ skin: "#f1ebe6", hair: { style: "hood", c: hairC, c2: "#333" }, top: { style: "cloak", c: "#121214", c2: "#8c1414", clasp: "#c9a23a" },
    legs: { style: "none" }, eyes: "#c40f1a" });

  window.Rig = { CAST, pose, walk, blinkAt, draw, extra, VOLTURI, hash, SKIN, PALE, TAN, K, limb, blob, poly };
})();
