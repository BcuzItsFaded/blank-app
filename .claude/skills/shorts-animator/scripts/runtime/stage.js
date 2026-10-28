/*
 * THE STAGE: which shot is on screen at a frame, the camera, the paint pass
 * and the caption. window.SHORT (the timeline the CLI builds) and
 * window.SCENES (the project's scenes.js) are loaded before this.
 *
 *   window.drawing(d) → paints drawing d (held `twos` frames) and returns it as a JPEG data URL
 *   window.still(i, at) → shot i at progress `at` (0..1), for contact sheets
 */
(function () {
  const S = window.SHORT;
  const { W, H, fps, twos } = S;
  const flat = document.createElement("canvas");
  flat.width = W; flat.height = H;
  const fg = flat.getContext("2d");
  const under = document.createElement("canvas");
  under.width = W; under.height = H;
  const ug = under.getContext("2d");
  const glc = document.createElement("canvas");
  glc.width = W; glc.height = H;
  const painter = window.ShortsPaint.Painter(glc);
  const out = document.getElementById("out");
  out.width = W; out.height = H;
  const og = out.getContext("2d");

  const ease = (x) => x * x * (3 - 2 * x);

  /** The camera, as a transform about the frame centre. Moves are slow on purpose. */
  function camera(g, move, p, amount) {
    const a = amount ?? 1;
    const e = ease(Math.min(1, Math.max(0, p)));
    let s = 1, x = 0, y = 0;
    switch (move) {
      case "push": s = 1 + 0.08 * a * e; break;
      case "pull": s = 1 + 0.08 * a * (1 - e); break;
      case "pan-left": s = 1.12; x = W * 0.05 * a * (1 - 2 * e); break;
      case "pan-right": s = 1.12; x = -W * 0.05 * a * (1 - 2 * e); break;
      case "rise": s = 1.1; y = H * 0.04 * a * (1 - 2 * e); break;
      case "fall": s = 1.1; y = -H * 0.04 * a * (1 - 2 * e); break;
      case "drift": s = 1.05; x = W * 0.015 * a * Math.sin(p * 2.2); y = H * 0.008 * a * Math.cos(p * 1.7); break;
      default: s = 1;
    }
    g.setTransform(s, 0, 0, s, W / 2 - (W / 2) * s + x, H / 2 - (H / 2) * s + y);
  }

  function drawBeat(g, i, t) {
    const b = S.beats[i];
    const fn = window.SCENES[b.scene];
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    camera(g, b.move, t / b.dur, b.moveAmount);
    if (!fn) {
      g.fillStyle = "#c33"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff"; g.font = `${60 * H / 1920}px sans-serif`;
      g.fillText(`no scene "${b.scene}"`, 40, H / 2);
      console.error(`no scene "${b.scene}" in scenes.js`);
    } else {
      const k = window.ShortsKit.make(g, W, H, t, Math.min(1, t / b.dur), window.ShortsKit.hashStr(b.scene + (b.seed ?? "")), S.look.palette, b);
      try { fn(k); } catch (e) { console.error(`scene "${b.scene}": ${e.message}`); }
    }
    g.restore();
  }

  function beatAt(time) {
    let i = 0;
    while (i < S.beats.length - 1 && time >= S.beats[i + 1].start) i++;
    return i;
  }

  function caption(text) {
    const C = S.captions || {};
    if (!text || C.style === "none") return;
    const size = (C.size ?? 44) * (H / 1920) * (W > H ? 1.25 : 1);
    og.font = `${C.weight ?? 500} ${size}px ${C.font ?? '"Helvetica Neue", Helvetica, Arial, sans-serif'}`;
    og.textAlign = "center";
    og.textBaseline = "middle";
    const lines = wrap(C.case === "upper" ? text.toUpperCase() : C.case === "lower" ? text.toLowerCase() : text, W * (C.width ?? 0.78), og);
    const lh = size * 1.3;
    const y0 = H * (C.y ?? 0.775) - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, j) => {
      const y = y0 + j * lh;
      if ((C.style ?? "box") === "box") {
        const w = og.measureText(ln).width + size * 0.7;
        og.fillStyle = C.box ?? "rgba(20,20,20,0.62)";
        og.fillRect(W / 2 - w / 2, y - lh / 2 + size * 0.04, w, lh - size * 0.08);
      } else {
        og.shadowColor = "rgba(0,0,0,0.75)";
        og.shadowBlur = size * 0.35;
      }
      og.fillStyle = C.color ?? "#ffffff";
      og.fillText(ln, W / 2, y + size * 0.04);
      og.shadowBlur = 0;
    });
  }
  function wrap(text, max, g) {
    const words = text.split(/\s+/), lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? cur + " " + w : w;
      if (g.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** The words on screen at a time: the caption track (chunks of the line, timed to the voice). */
  function captionFor(time, b) {
    if (S.track) {
      for (const c of S.track) if (time >= c.at && time < c.end) return c.text;
      return "";
    }
    return b.caption ?? b.say;
  }

  function render(time, tick) {
    const i = beatAt(time);
    const b = S.beats[i];
    const t = time - b.start;
    drawBeat(fg, i, t);
    // a soft cut: the end of the previous shot fades under this one ("fade"), or through black ("dip")
    const fade = b.transition === "fade" ? (b.fadeDur ?? 0.5) : b.transition === "dip" ? (b.fadeDur ?? 0.7) : 0;
    if (fade && i > 0 && t < fade) {
      const prev = S.beats[i - 1];
      fg.save();
      if (b.transition === "dip") {
        fg.globalAlpha = 1 - t / fade;
        fg.fillStyle = "#000";
        fg.fillRect(0, 0, W, H);
      } else {
        drawBeat(ug, i - 1, prev.dur);
        fg.globalAlpha = 1 - t / fade;
        fg.drawImage(under, 0, 0);
      }
      fg.restore();
    }
    painter.paint(flat, S.look, tick);
    og.drawImage(glc, 0, 0);
    caption(captionFor(time, b));
  }

  window.drawing = (d) => {
    const time = (d * twos) / fps + 0.0001;
    render(time, d);
    return out.toDataURL("image/jpeg", 0.93);
  };
  window.still = (i, at) => {
    const b = S.beats[i];
    const time = b.start + b.dur * at;
    render(time, Math.round((time * fps) / twos));
    return out.toDataURL("image/jpeg", 0.9);
  };
  window.ready = true;
})();
