/* Narration script parser → timed sections and per-word subtitle timings. */
(function () {
  const T = String.raw`(\d{1,2}:\d{2}(?:[.,]\d+)?)`;
  const RANGE = new RegExp(T + String.raw`\s*(?:-|–|—|to|→)\s*` + T);
  const RANGE_SEC = /(\d+(?:\.\d+)?)\s*s\s*(?:-|–|—|to|→)\s*(\d+(?:\.\d+)?)\s*s\b/i;
  const LABEL = /^([A-Z][A-Z .'()\-]{1,30}):\s*(.*)$/;
  const SKIP_LABELS = /^(VISUAL|SHOT|IMAGE|CAMERA|FX|SFX|SOUND|MUSIC|AUDIO|NOTE|NOTES)\b/;

  function toSec(s) {
    s = s.replace(",", ".");
    if (s.includes(":")) {
      const [m, x] = s.split(":");
      return +m * 60 + parseFloat(x);
    }
    return parseFloat(s);
  }

  function clean(s) {
    return s.replace(/\*\*|__|`|#+\s*/g, "").replace(/^[\s:|\-–—.]+|[\s:|\-–—]+$/g, "").trim();
  }

  function parse(text, duration) {
    const lines = text.replace(/\r/g, "").split("\n");
    const sections = [];
    let cur = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(RANGE) || line.match(RANGE_SEC);
      if (m) {
        cur = { start: toSec(m[1]), end: toSec(m[2]), heading: clean(line.replace(m[0], "")), lines: [] };
        sections.push(cur);
        continue;
      }
      if (!cur) continue;
      let body = clean(line);
      const lab = body.match(LABEL);
      if (lab) {
        if (SKIP_LABELS.test(lab[1])) continue;
        body = lab[2]; // NARRATOR:, V.O.:, character names → spoken text
      }
      if (body) cur.lines.push(body);
    }

    // No timestamps at all: spread paragraphs evenly.
    if (!sections.length) {
      const paras = text.split(/\n\s*\n/).map(clean).filter(Boolean);
      const d = duration / Math.max(1, paras.length);
      paras.forEach((p, i) => sections.push({ start: i * d, end: (i + 1) * d, heading: "", lines: [p] }));
    }

    sections.sort((a, b) => a.start - b.start);
    sections.forEach((s, i) => {
      // A heading line with no body is the narration itself.
      if (!s.lines.length && s.heading) { s.lines.push(s.heading); s.heading = ""; }
      s.text = s.lines.join(" ").replace(/\s+/g, " ").trim();
      if (!(s.end > s.start)) s.end = sections[i + 1] ? sections[i + 1].start : duration;
      s.words = timeWords(s.text, s.start, s.end);
    });
    return sections;
  }

  // Distribute words over the section, weighted by length, with pauses after punctuation.
  function timeWords(text, start, end) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lead = Math.min(0.15, (end - start) * 0.05);
    const tail = Math.min(0.35, (end - start) * 0.08);
    const span = end - start - lead - tail;
    const weights = words.map(w => {
      let k = w.replace(/[^\w']/g, "").length + 2.5;
      if (/[.!?…]$/.test(w)) k += 5;
      else if (/[,;:—–]$/.test(w)) k += 2.5;
      return k;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let t = start + lead;
    return words.map((w, i) => {
      const d = (weights[i] / total) * span;
      const o = { w, start: t, end: t + d, stop: /[.!?…,;:]$/.test(w) };
      t += d;
      return o;
    });
  }

  // Group words into 1–3 word subtitle chunks, breaking on punctuation.
  function chunk(words) {
    const out = [];
    let c = [];
    for (const w of words) {
      c.push(w);
      const len = c.map(x => x.w).join(" ").length;
      if (w.stop || c.length >= 3 || len >= 15) { out.push(c); c = []; }
    }
    if (c.length) out.push(c);
    return out.map(ws => ({ words: ws, start: ws[0].start, end: ws[ws.length - 1].end }));
  }

  window.WishParser = { parse, chunk, toSec };
})();
