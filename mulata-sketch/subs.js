// Subtitle cues shared by the page and the .srt writer: each narration line split into readable chunks,
// timed by their share of the line's characters.
export function chunk(s, max = 112) {
  const out = []; let cur = '';
  for (const w of s.split(' ')) {
    const nx = cur ? cur + ' ' + w : w;
    if (nx.length > max && cur) { out.push(cur); cur = w; continue; }
    cur = nx;
    if (/[,.;:?]$/.test(w) && cur.length > max * .5) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}
export function cues(lines, S, D, max = 112) {
  const out = [];
  lines.forEach((l, i) => {
    const parts = chunk(l.text0 || l.text, max), total = parts.reduce((a, p) => a + p.length, 0);
    let t = S[i];
    for (const p of parts) { const d = D[i] * p.length / total; out.push({ t0: t, t1: t + d, text: p }); t += d; }
  });
  for (let k = 0; k < out.length; k++) out[k].t1 = k + 1 < out.length ? Math.min(out[k].t1 + .25, out[k + 1].t0 - .02) : out[k].t1 + .25;
  return out;
}
export function wrap(s, n) {
  const out = []; let cur = '';
  for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) out.push(cur);
  return out;
}
