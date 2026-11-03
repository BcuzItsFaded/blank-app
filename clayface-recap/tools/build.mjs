// Generates index.html and compositions/*.html for the Clayface recap.
// Run: node tools/build.mjs   (re-run after editing this file)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 1080, H = 1920;
const VO_OFFSET = 0.3;
const VO_DUR = [6.38, 8.98, 10.84, 7.45, 8.43, 9.71];
const SFX_DUR = { "pop": 0.72, "whoosh": 0.57, "whoosh-short": 0.57, "whoosh-cinematic": 5.54, "sparkle": 1.8, "glitch-1": 2.64, "glitch-2": 3.5, "impact-bass-1": 2.12, "impact-bass-2": 2.59 };

// Scene lengths (seconds) — fitted to the narration.
const SCENES = [
  { id: "s1", dur: 7.5 },
  { id: "s2", dur: 10.0 },
  { id: "s3", dur: 11.8 },
  { id: "s4", dur: 8.5 },
  { id: "s5", dur: 10.0 },
  { id: "s6", dur: 11.7 },
];
let acc = 0;
for (const s of SCENES) { s.start = +acc.toFixed(2); acc += s.dur; }
const TOTAL = +acc.toFixed(2);

// ---------- palette ----------
const C = {
  ink: "#14161b",
  red: "#E8322B",
  redDark: "#B81F19",
  yellow: "#FFD21F",
  cyan: "#19C3F0",
  blue: "#2F7BFF",
  clay: "#C46A45",
  clayDark: "#8E4428",
  clayLight: "#D9906E",
  gold: "#F5B82E",
  gray: "#8A94A3",
  grayDark: "#5D6672",
  coat: "#9FB3C8",
  coatDark: "#6F8399",
  charcoal: "#3A3F47",
};

// ---------- seeded random ----------
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- shared drawing ----------
// Both rigs share one skeleton (hip at 0,0; feet at y=156). Joint origins:
const RIG = {
  armL: [-38, -138], foreL: [-40, -82],
  armR: [38, -138], foreR: [40, -82],
  legL: [-15, 0], shinL: [-15, 80],
  legR: [15, 0], shinR: [15, 80],
  head: [0, -170],
};
const rotAttr = (k, a = 0) => `rotate(${a} ${RIG[k][0]} ${RIG[k][1]})`;
const SVG_BOX = { w: 320, h: 480, vx: -160, vy: -310 }; // feet (y=156) sit 466px below the top

// Wrapper placement: feet centre at (fx, fy) at scale s.
function wrap(id, fx, fy, s, inner, extra = "") {
  const left = fx - 160, top = fy - 466;
  return `<div id="${id}" class="fig" style="left:${left}px;top:${top}px;width:320px;height:480px;--s:${s}" ${extra}>
  <svg viewBox="${SVG_BOX.vx} ${SVG_BOX.vy} ${SVG_BOX.w} ${SVG_BOX.h}" width="320" height="480" overflow="visible">${inner}</svg></div>`;
}

function zeke(id, fx, fy, s = 0.85) {
  const st = `stroke="${C.ink}" stroke-linecap="round" stroke-linejoin="round"`;
  const limb = (k, x1, y1, x2, y2, child = "") =>
    `<g id="${id}-${k}" transform="${rotAttr(k)}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${st} stroke-width="10"/>${child}</g>`;
  const inner = `<g id="${id}-body" transform="translate(0 0)">
    ${limb("legL", -15, 0, -15, 80, limb("shinL", -15, 80, -17, 156, `<line x1="-17" y1="156" x2="-34" y2="158" ${st} stroke-width="10"/>`))}
    ${limb("legR", 15, 0, 15, 80, limb("shinR", 15, 80, 17, 156, `<line x1="17" y1="156" x2="34" y2="158" ${st} stroke-width="10"/>`))}
    <path d="M-32,-16 L32,-16 L36,32 L5,32 L0,12 L-5,32 L-36,32 Z" fill="#23252b" ${st} stroke-width="5"/>
    ${limb("armL", -38, -138, -40, -82, limb("foreL", -40, -82, -42, -28))}
    ${limb("armR", 38, -138, 40, -82, limb("foreR", 40, -82, 42, -28))}
    <path d="M-34,-150 Q0,-160 34,-150 L58,-120 L42,-104 L33,-116 L32,-12 L-32,-12 L-33,-116 L-42,-104 L-58,-120 Z" fill="${C.yellow}" ${st} stroke-width="5"/>
    <line x1="0" y1="-158" x2="0" y2="-172" ${st} stroke-width="10"/>
    <g id="${id}-head" transform="${rotAttr("head")}">
      <circle cx="0" cy="-214" r="46" fill="#fff" ${st} stroke-width="6"/>
      <g id="${id}-eyes" transform="translate(0 -210) scale(1 1) translate(0 210)">
        <ellipse cx="-15" cy="-210" rx="5.5" ry="6.5" fill="${C.ink}"/><ellipse cx="15" cy="-210" rx="5.5" ry="6.5" fill="${C.ink}"/>
      </g>
      <path id="${id}-m-smile" d="M-13,-192 Q0,-181 13,-192" fill="none" ${st} stroke-width="5"/>
      <ellipse id="${id}-m-o" cx="0" cy="-189" rx="7" ry="9" fill="${C.ink}" style="opacity:0"/>
      <line id="${id}-m-flat" x1="-11" y1="-189" x2="11" y2="-189" ${st} stroke-width="5" style="opacity:0"/>
      <path id="${id}-m-worry" d="M-13,-185 Q0,-195 13,-185" fill="none" ${st} stroke-width="5" style="opacity:0"/>
      <path d="M-50,-226 C-52,-284 52,-284 50,-226 Z" fill="${C.red}" ${st} stroke-width="5"/>
      <rect x="-54" y="-238" width="108" height="20" rx="9" fill="${C.redDark}" ${st} stroke-width="4"/>
    </g>
  </g>`;
  return wrap(id, fx, fy, s, inner, `data-rig="zeke"`);
}

// Clay / hologram figure. opts: fill, edge, hat, hatFill, hair, coat, skirt, badge, lumps
function figure(id, fx, fy, s, o = {}) {
  const fill = o.fill || C.clay, edge = o.edge || C.clayDark;
  const body = `class="${id}-fill" style="fill:${fill};stroke:${edge}" stroke-width="4" stroke-linejoin="round"`;
  const limbSt = `class="${id}-limb" style="stroke:${fill}" stroke-linecap="round"`;
  const limb = (k, x1, y1, x2, y2, w, child = "") =>
    `<g id="${id}-${k}" transform="${rotAttr(k)}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${limbSt} stroke-width="${w}"/>${child}</g>`;
  let torso = `M-36,-152 Q0,-168 36,-152 L30,-4 Q0,8 -30,-4 Z`;
  if (o.coat) torso = `M-40,-152 Q0,-168 40,-152 L50,74 Q0,84 -50,74 Z`;
  if (o.skirt) torso = `M-30,-152 Q0,-166 30,-152 L26,-46 L52,44 Q0,56 -52,44 L-26,-46 Z`;
  const hair = o.hair
    ? `<path d="M-46,-196 C-54,-276 54,-276 46,-196 L46,-170 L30,-170 L32,-214 C30,-246 -30,-246 -32,-214 L-30,-170 L-46,-170 Z" class="${id}-hair" style="fill:${o.hairFill || edge}"/>`
    : "";
  const hat = o.hat
    ? `<g id="${id}-hat"><ellipse cx="0" cy="-248" rx="64" ry="11" style="fill:${o.hatFill || C.charcoal}"/><path d="M-36,-250 L-32,-292 Q0,-300 32,-292 L36,-250 Z" style="fill:${o.hatFill || C.charcoal}"/><rect x="-35" y="-262" width="70" height="9" style="fill:${C.ink}"/></g>`
    : "";
  const badge = o.badge
    ? `<g id="${id}-badge"><path d="M14,-118 l6,12 13,2 -9,9 2,13 -12,-6 -12,6 2,-13 -9,-9 13,-2 Z" fill="${C.gold}" stroke="#9a6b00" stroke-width="2"/></g>`
    : "";
  const lumps = o.lumps
    ? `<g id="${id}-lumps" style="opacity:0">${[
        [-48, -120, 30], [46, -96, 34], [-30, -40, 26], [40, -10, 24], [-56, -230, 26], [52, -250, 30], [10, -280, 24], [-14, 40, 30],
      ].map(([x, y, r], i) => `<circle id="${id}-lump${i}" cx="${x}" cy="${y}" r="${r}" class="${id}-fill" style="fill:${fill};stroke:${edge}" stroke-width="4"/>`).join("")}</g>`
    : "";
  const inner = `<g id="${id}-body" transform="translate(0 0)">
    ${limb("legL", -16, 0, -16, 80, 26, limb("shinL", -16, 80, -18, 152, 24))}
    ${limb("legR", 16, 0, 16, 80, 26, limb("shinR", 16, 80, 18, 152, 24))}
    ${limb("armL", -40, -140, -44, -82, 22, limb("foreL", -44, -82, -46, -24, 20))}
    ${limb("armR", 40, -140, 44, -82, 22, limb("foreR", 44, -82, 46, -24, 20))}
    <path d="${torso}" ${body}/>
    ${badge}
    <rect x="-12" y="-178" width="24" height="30" rx="8" class="${id}-fill" style="fill:${fill}"/>
    <g id="${id}-head" transform="${rotAttr("head")}">
      <ellipse cx="0" cy="-212" rx="38" ry="46" ${body}/>
      ${hair}${hat}
    </g>
    ${lumps}
  </g>`;
  const glow = o.glow === false ? "" : ` data-glow="1"`;
  return wrap(id, fx, fy, s, inner, `data-rig="fig"${glow}`);
}

const panel = (id, x, y, w, h, inner = "", cls = "") =>
  `<div id="${id}" class="panel ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px" data-layout-allow-overflow>${inner}</div>`;

const bg = (id) => `<div id="${id}-bg" class="bg"></div>
<svg id="${id}-floor" class="floor" viewBox="0 0 1080 900" width="1080" height="900" style="top:1040px">
  ${(() => {
    let out = "";
    for (let i = -10; i <= 10; i++) out += `<line x1="${540 + i * 150}" y1="900" x2="${540 + i * 22}" y2="0" />`;
    for (let k = 1; k <= 9; k++) { const y = Math.pow(k / 9, 1.8) * 900; out += `<line x1="0" y1="${y.toFixed(1)}" x2="1080" y2="${y.toFixed(1)}" />`; }
    return out;
  })()}
</svg>`;

// ---------- shared scene CSS + rig JS ----------
const SCENE_CSS = `
#root { position:absolute; inset:0; overflow:hidden; font-family: Montserrat, sans-serif; }
.bg { position:absolute; inset:0; background: radial-gradient(ellipse 120% 70% at 50% 28%, #ffffff 0%, #f1f5f8 55%, #e4ebf1 100%); }
.floor { position:absolute; left:0; }
.floor line { stroke:#d4dce4; stroke-width:2; }
.stage { position:absolute; inset:0; }
.fig { position:absolute; transform-origin: 50% 97%; }
.fig[data-glow] svg { filter: drop-shadow(0 0 14px rgba(255,140,90,.45)); }
.panel { position:absolute; border-radius:30px; border:3px solid rgba(25,195,240,.85);
  background: linear-gradient(160deg, rgba(225,248,255,.78) 0%, rgba(170,228,255,.38) 60%, rgba(140,210,255,.30) 100%);
  box-shadow: 0 0 46px rgba(25,180,255,.35), inset 0 0 34px rgba(255,255,255,.8); overflow:hidden; }
.panel::after { content:""; position:absolute; left:-20%; top:-30%; width:60%; height:160%; transform: rotate(18deg);
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.45), rgba(255,255,255,0)); pointer-events:none; }
.abs { position:absolute; }
.dark { position:absolute; inset:0; background:#0d1117; opacity:0; border-radius:27px; }
.icon { position:absolute; }
`;

const RIG_JS = `
const RIG = ${JSON.stringify(RIG)};
const tl = gsap.timeline({ paused: true });
function rot(sel, k, a, d, t, ease) {
  tl.to(sel, { attr: { transform: "rotate(" + a + " " + RIG[k][0] + " " + RIG[k][1] + ")" }, duration: d, ease: ease || "power2.inOut" }, t);
}
function pose(id, t, p, d, ease) {
  d = d == null ? 0.3 : d;
  for (const k in p) rot("#" + id + "-" + k, k, p[k], d, t, ease);
}
const REST = { armL: 8, foreL: -6, armR: -8, foreR: 6, legL: 0, shinL: 0, legR: 0, shinR: 0, head: 0 };
function rest(id, t, d) { pose(id, t, REST, d == null ? 0.35 : d); }
function mouth(id, t, name) {
  for (const n of ["smile", "o", "flat", "worry"]) tl.to("#" + id + "-m-" + n, { opacity: n === name ? 1 : 0, duration: 0.1 }, t);
}
function blink(id, t) {
  const el = "#" + id + "-eyes";
  tl.to(el, { attr: { transform: "translate(0 -210) scale(1 0.12) translate(0 210)" }, duration: 0.07, ease: "power1.in" }, t)
    .to(el, { attr: { transform: "translate(0 -210) scale(1 1) translate(0 210)" }, duration: 0.09, ease: "power1.out" }, t + 0.07);
}
function walk(id, t0, dur, x0, x1, y) {
  const v = { x: x1, duration: dur, ease: "power1.inOut" };
  if (y != null) v.y = y;
  tl.fromTo("#" + id, { x: x0 }, v, t0);
  const steps = Math.max(2, Math.round(dur / 0.26));
  const sd = dur / steps;
  for (let i = 0; i < steps; i++) {
    const s = i % 2 ? 1 : -1, t = t0 + i * sd;
    pose(id, t, { legL: 24 * s, shinL: s > 0 ? 0 : 18, legR: -24 * s, shinR: s > 0 ? 18 : 0, armL: -16 * s + 8, armR: -16 * s - 8 }, sd, "sine.inOut");
    tl.to("#" + id + "-body", { attr: { transform: "translate(0 -6)" }, duration: sd / 2, ease: "sine.out" }, t)
      .to("#" + id + "-body", { attr: { transform: "translate(0 0)" }, duration: sd / 2, ease: "sine.in" }, t + sd / 2);
  }
  pose(id, t0 + dur, { legL: 0, shinL: 0, legR: 0, shinR: 0 }, 0.18);
}
function hop(id, t, dx, dy, d, peak) {
  peak = peak || 90;
  const el = "#" + id;
  tl.to(el, { scaleY: 0.86 * S(id), scaleX: 1.08 * S(id), duration: 0.1, ease: "power2.out" }, t);
  tl.to(el, { x: "+=" + dx, duration: d, ease: "none" }, t + 0.1);
  tl.to(el, { y: "+=" + (dy - peak), duration: d * 0.5, ease: "power2.out" }, t + 0.1)
    .to(el, { y: "+=" + peak, duration: d * 0.5, ease: "power2.in" }, t + 0.1 + d * 0.5);
  tl.to(el, { scaleY: 1.06 * S(id), scaleX: 0.96 * S(id), duration: 0.12 }, t + 0.1)
    .to(el, { scaleY: 0.9 * S(id), scaleX: 1.06 * S(id), duration: 0.08 }, t + 0.1 + d)
    .to(el, { scaleY: S(id), scaleX: S(id), duration: 0.16, ease: "back.out(2)" }, t + 0.18 + d);
  pose(id, t + 0.1, { legL: 18, shinL: 30, legR: -14, shinR: 26, armL: 50, armR: -50 }, d * 0.5);
  pose(id, t + 0.1 + d * 0.5, { legL: 0, shinL: 0, legR: 0, shinR: 0, armL: 8, armR: -8 }, d * 0.5);
}
function breathe(id, t, d) {
  const n = Math.max(1, Math.floor(d / 1.6));
  tl.to("#" + id + "-body", { attr: { transform: "translate(0 -3)" }, duration: 0.8, ease: "sine.inOut", repeat: n * 2 - 1, yoyo: true }, t);
}
function S(id) { const e = document.getElementById(id); return parseFloat(getComputedStyle(e).getPropertyValue("--s")) || 1; }
function initFigs() {
  document.querySelectorAll("#root .fig").forEach((e) => {
    const s = parseFloat(getComputedStyle(e).getPropertyValue("--s")) || 1;
    gsap.set(e, { scale: s });
  });
  document.querySelectorAll("#root [data-rig='zeke']").forEach((e) => {
    for (const k in REST) gsap.set("#" + e.id + "-" + k, { attr: { transform: "rotate(" + REST[k] + " " + RIG[k][0] + " " + RIG[k][1] + ")" } });
  });
}
function pop(sel, t, s) {
  tl.fromTo(sel, { scale: 0, opacity: 0 }, { scale: s || 1, opacity: 1, duration: 0.42, ease: "back.out(2.2)" }, t);
}
function out(sel, t, d) { tl.to(sel, { opacity: 0, duration: d || 0.3, ease: "power2.in" }, t); }
`;

function scene(id, dur, markup, script, extraCss = "") {
  return `<template>
<style>${SCENE_CSS}${extraCss}</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-start="0" data-duration="${dur}">
${markup}
</div>
<script>
(function(){
${RIG_JS}
initFigs();
${script}
window.__timelines["${id}"] = tl;
})();
</script>
</template>
`;
}

// ---------- icons ----------
const heartPath = "M0,30 C-40,0 -60,-30 -40,-50 C-25,-65 -5,-58 0,-42 C5,-58 25,-65 40,-50 C60,-30 40,0 0,30 Z";
const starPath = (r1, r2) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += (i ? "L" : "M") + (r * Math.cos(a)).toFixed(1) + "," + (r * Math.sin(a)).toFixed(1);
  }
  return d + "Z";
};
// A generic bat silhouette (not any studio's logo).
const batPath = "M0,-38 L10,-60 L16,-30 C40,-44 80,-44 110,-20 C92,-14 84,0 86,18 C64,4 40,8 26,28 C18,14 8,10 0,30 C-8,10 -18,14 -26,28 C-40,8 -64,4 -86,18 C-84,0 -92,-14 -110,-20 C-80,-44 -40,-44 -16,-30 L-10,-60 Z";

// ======================= SCENE 1 =======================
function s1() {
  const id = "s1";
  const P = { x: 200, y: 250, w: 600, h: 720 };
  const markup = `
${bg(id)}
<div id="s1-stage" class="stage">
  ${panel("s1-panel", P.x, P.y, P.w, P.h, `
    ${figure("s1-man", 200, 640, 0.95)}
    ${figure("s1-woman", 400, 640, 0.95, { skirt: true, hair: true, fill: C.clayLight, edge: "#a8664a", hairFill: "#a8664a" })}
    <svg class="abs" style="left:0;top:0" width="${P.w}" height="${P.h}" viewBox="0 0 ${P.w} ${P.h}" overflow="visible">
      <ellipse id="s1-bridge" cx="300" cy="318" rx="26" ry="16" style="fill:${C.clay};opacity:0"/>
      <path id="s1-drip1" d="M330,360 q10,0 10,30 l0,70 q0,18 -10,18 q-10,0 -10,-18 l0,-70 q0,-30 10,-30 Z" style="fill:${C.clay};opacity:0"/>
      <path id="s1-drip2" d="M352,430 q8,0 8,24 l0,46 q0,14 -8,14 q-8,0 -8,-14 l0,-46 q0,-24 8,-24 Z" style="fill:${C.clay};opacity:0"/>
      <g id="s1-heart" transform="translate(300 170)"><path d="${heartPath}" fill="${C.cyan}" stroke="#fff" stroke-width="5" style="opacity:0" id="s1-heartp"/></g>
    </svg>
  `)}
  <svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920" overflow="visible">
    <circle id="s1-ripple" cx="792" cy="760" r="40" fill="none" stroke="${C.cyan}" stroke-width="8" style="opacity:0"/>
    <circle id="s1-ripple2" cx="792" cy="760" r="40" fill="none" stroke="${C.blue}" stroke-width="5" style="opacity:0"/>
  </svg>
  ${zeke("s1-z", 900, 1110, 0.85)}
</div>
<div id="s1-chip" class="chip">SPOILERS</div>
`;
  const css = `.chip{position:absolute;left:0;right:0;margin:auto;top:178px;width:330px;height:66px;border-radius:33px;background:${C.red};color:#fff;
  font:800 38px/66px Montserrat,sans-serif;letter-spacing:.12em;text-align:center;box-shadow:0 8px 24px rgba(232,50,43,.35);}`;
  const vo = VO_OFFSET;
  const script = `
tl.fromTo("#s1-panel", { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(1.6)" }, 0);
tl.fromTo("#s1-chip", { scale: 1.12 }, { scale: 1, duration: 0.35, ease: "power3.out" }, 0);
tl.to("#s1-chip", { opacity: 0, y: -16, duration: 0.3 }, 3.0);
// lean toward each other
tl.fromTo("#s1-man", { x: -20, rotation: 0 }, { x: 18, rotation: 7, duration: 2.2, ease: "power1.inOut" }, 0.3);
tl.fromTo("#s1-woman", { x: 20, rotation: 0 }, { x: -18, rotation: -7, duration: 2.2, ease: "power1.inOut" }, 0.3);
pose("s1-man", 0.6, { armR: -55, foreR: -30 }, 1.2);
pose("s1-woman", 0.6, { armL: 55, foreL: 30 }, 1.2);
pop("#s1-heartp", ${vo + 2.16}, 1);
tl.to("#s1-heartp", { scale: 1.15, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${vo + 2.6});
tl.to("#s1-heartp", { opacity: 0, duration: 0.3 }, ${vo + 4.6});
// Zeke walks in
walk("s1-z", 0.1, 1.4, 260, 0);
mouth("s1-z", 0.1, "smile");
pose("s1-z", 1.6, { head: -10 }, 0.4);
blink("s1-z", 2.2);
// "The catch?" -> tap
pose("s1-z", ${vo + 2.8}, { armL: 128, foreL: 18, head: -14 }, 0.32, "power3.out");
mouth("s1-z", ${vo + 2.8}, "flat");
tl.fromTo("#s1-ripple", { attr: { r: 20 }, opacity: 1 }, { attr: { r: 260 }, opacity: 0, duration: 1.1, ease: "power2.out", immediateRender: false }, ${vo + 3.1});
tl.fromTo("#s1-ripple2", { attr: { r: 10 }, opacity: 0.8 }, { attr: { r: 180 }, opacity: 0, duration: 1.0, ease: "power2.out", immediateRender: false }, ${vo + 3.25});
tl.fromTo("#s1-panel", { x: 0 }, { x: -6, duration: 0.06, yoyo: true, repeat: 3 }, ${vo + 3.1});
pose("s1-z", ${vo + 3.5}, { armL: 30, foreL: 0 }, 0.4);
// "made of his own clay" — woman turns into the same clay, drips join them
tl.to(".s1-woman-fill", { fill: "${C.clay}", stroke: "${C.clayDark}", duration: 0.9, ease: "power1.inOut" }, ${vo + 4.9});
tl.to(".s1-woman-limb", { stroke: "${C.clay}", duration: 0.9 }, ${vo + 4.9});
tl.to(".s1-woman-hair", { fill: "${C.clayDark}", duration: 0.9 }, ${vo + 4.9});
tl.fromTo("#s1-bridge", { opacity: 0, scaleX: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scaleX: 1.4, duration: 0.6, ease: "power2.out" }, ${vo + 5.1});
tl.fromTo("#s1-drip1", { opacity: 1, scaleY: 0, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: 0.9, ease: "power1.in" }, ${vo + 5.2});
tl.fromTo("#s1-drip2", { opacity: 1, scaleY: 0, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: 0.8, ease: "power1.in" }, ${vo + 5.5});
// Zeke jumps back in shock
mouth("s1-z", ${vo + 5.6}, "o");
pose("s1-z", ${vo + 5.6}, { armL: 160, foreL: 10, armR: -160, foreR: -10, head: 8 }, 0.18, "power3.out");
hop("s1-z", ${vo + 5.6}, 70, 0, 0.45, 70);
pose("s1-z", ${vo + 6.15}, { armL: 160, foreL: 10, armR: -160, foreR: -10 }, 0.01);
// camera pushes up
tl.to("#s1-stage", { y: 620, duration: 0.75, ease: "power3.in" }, 6.75);
tl.to("#s1-floor", { y: 620, duration: 0.75, ease: "power3.in" }, 6.75);
`;
  return scene(id, SCENES[0].dur, markup, script, css);
}

// ======================= SCENE 2 =======================
function s2() {
  const id = "s2";
  const r = rng(7);
  const shards = [];
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2, d = 160 + r() * 260;
    const s = 22 + r() * 30;
    shards.push({ i, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8, rot: (r() - 0.5) * 540, s,
      toLeft: i % 2 === 0, pts: `0,${-s} ${s * 0.8},${s * 0.6} ${-s * 0.7},${s * 0.5}` });
  }
  const markup = `
${bg(id)}
<div id="s2-stage" class="stage">
  <svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920" overflow="visible">
    <defs>
      <linearGradient id="s2-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff1ff"/><stop offset="1" stop-color="#2fb7ec"/></linearGradient>
      <radialGradient id="s2-spot" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="#fff6d6" stop-opacity=".95"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient>
    </defs>
    <path id="s2-cone" d="M700,170 L640,170 L520,820 L960,820 Z" fill="url(#s2-spot)" style="opacity:0"/>
    <g transform="translate(540 540)"><g id="s2-bat" transform="scale(2.1)"><path d="${batPath}" fill="url(#s2-glass)" stroke="#fff" stroke-width="3"/></g></g>
    <g id="s2-ghost" transform="translate(540 520) scale(1.9)" style="opacity:0"><path d="${batPath}" fill="none" stroke="#b9c2cc" stroke-width="3" stroke-dasharray="8 8"/></g>
    <g id="s2-no" transform="translate(540 520)" style="opacity:0">
      <circle id="s2-noc" r="230" fill="none" stroke="${C.red}" stroke-width="22" stroke-dasharray="1446" stroke-dashoffset="1446"/>
      <line id="s2-nol" x1="-163" y1="-163" x2="163" y2="163" stroke="${C.red}" stroke-width="22" stroke-linecap="round" stroke-dasharray="462" stroke-dashoffset="462"/>
    </g>
    ${shards.map((s) => `<g transform="translate(540 540)"><g id="s2-sh${s.i}" style="opacity:0"><polygon points="${s.pts}" fill="${s.i % 3 ? C.cyan : "#9fe6ff"}" stroke="#fff" stroke-width="2"/></g></g>`).join("")}
    <g transform="translate(320 560)"><g id="s2-clap" style="opacity:0">
      <rect x="-110" y="-40" width="220" height="150" rx="14" fill="${C.ink}"/>
      <g id="s2-clapTop" transform="rotate(0 -110 -46)"><rect x="-110" y="-92" width="220" height="44" rx="8" fill="${C.ink}"/>
      ${[0, 1, 2, 3].map((k) => `<path d="M${-90 + k * 52},-92 l30,0 l-22,44 l-30,0 Z" fill="#fff"/>`).join("")}</g>
      <rect x="-86" y="-10" width="172" height="10" rx="5" fill="#fff" opacity=".85"/><rect x="-86" y="22" width="120" height="10" rx="5" fill="#fff" opacity=".6"/>
    </g></g>
    <g transform="translate(770 520)"><g id="s2-star" style="opacity:0"><path d="${starPath(120, 52)}" fill="${C.gold}" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></g></g>
  </svg>
  ${zeke("s2-z", 540, 1110, 0.85)}
</div>
`;
  const vo = VO_OFFSET;
  const shardJs = shards.map((s) => {
    const tx = s.toLeft ? 320 : 770, ty = s.toLeft ? 560 : 520;
    return `tl.fromTo("#s2-sh${s.i}", { x: 0, y: 0, rotation: 0, opacity: 1 }, { opacity: 1, x: ${s.dx.toFixed(1)}, y: ${s.dy.toFixed(1)}, rotation: ${s.rot.toFixed(0)}, duration: 0.7, ease: "power3.out", immediateRender: false }, ${vo + 2.76});
tl.to("#s2-sh${s.i}", { x: ${(tx - 540).toFixed(0)}, y: ${(ty - 540).toFixed(0)}, rotation: 0, scale: 0.4, duration: 0.75, ease: "power3.in" }, ${(vo + 5.25 + (s.i % 6) * 0.03).toFixed(2)});
tl.to("#s2-sh${s.i}", { opacity: 0, duration: 0.12 }, ${(vo + 5.95 + (s.i % 6) * 0.03).toFixed(2)});`;
  }).join("\n");
  const script = `
tl.fromTo("#s2-stage", { y: -620 }, { y: 0, duration: 0.7, ease: "power3.out" }, 0);
tl.fromTo("#s2-floor", { y: -620 }, { y: 0, duration: 0.7, ease: "power3.out" }, 0);
pose("s2-z", 0, { armL: 160, foreL: 10, armR: -160, foreR: -10 }, 0.01);
mouth("s2-z", 0, "o");
rest("s2-z", 0.6, 0.4); mouth("s2-z", 0.7, "smile");
tl.fromTo("#s2-bat", { y: -300, rotation: -6, transformOrigin: "50% 50%" }, { y: 0, rotation: 0, duration: 1.5, ease: "sine.out" }, 0.3);
tl.to("#s2-bat", { y: -14, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.8);
// reach on tiptoe
pose("s2-z", ${vo + 1.3}, { armR: -168, foreR: -8, head: -12 }, 0.4, "power2.out");
tl.to("#s2-z", { y: -16, duration: 0.3, ease: "power2.out" }, ${vo + 1.4});
// shatter on "It isn't"
tl.to("#s2-bat", { opacity: 0, scale: 1.2, duration: 0.08 }, ${vo + 2.76});
${shardJs}
tl.to("#s2-z", { y: 0, duration: 0.2 }, ${vo + 2.8});
pose("s2-z", ${vo + 2.8}, { armL: 150, foreL: -95, armR: -150, foreR: 95, head: 6 }, 0.18, "power3.out");
mouth("s2-z", ${vo + 2.8}, "worry");
tl.to("#s2-z", { x: -18, duration: 0.05, yoyo: true, repeat: 5 }, ${vo + 2.85});
// "There's no Batman"
tl.to("#s2-ghost", { opacity: 1, duration: 0.25 }, ${vo + 3.6});
tl.to("#s2-no", { opacity: 1, duration: 0.01 }, ${vo + 3.9});
tl.to("#s2-noc", { attr: { "stroke-dashoffset": 0 }, duration: 0.4, ease: "power2.inOut" }, ${vo + 3.9});
tl.to("#s2-nol", { attr: { "stroke-dashoffset": 0 }, duration: 0.22, ease: "power2.out" }, ${vo + 4.25});
rest("s2-z", ${vo + 3.7}, 0.4); mouth("s2-z", ${vo + 3.8}, "flat");
pose("s2-z", ${vo + 4.1}, { head: 12 }, 0.2); pose("s2-z", ${vo + 4.3}, { head: -12 }, 0.2); pose("s2-z", ${vo + 4.5}, { head: 0 }, 0.2);
tl.to(["#s2-no", "#s2-ghost"], { opacity: 0, duration: 0.3 }, ${vo + 4.95});
// shards rebuild into clapperboard + star: "body-horror tragedy about an actor"
pop("#s2-clap", ${vo + 5.85}, 1);
pop("#s2-star", ${vo + 6.0}, 1);
tl.fromTo("#s2-clapTop", { attr: { transform: "rotate(-26 -110 -46)" } }, { attr: { transform: "rotate(0 -110 -46)" }, duration: 0.18, ease: "power4.in" }, ${vo + 6.5});
tl.fromTo("#s2-z", { scaleX: 0.85 }, { scaleX: -0.85, duration: 0.25, ease: "power2.inOut" }, ${vo + 5.3});
tl.to("#s2-z", { scaleX: 0.85, duration: 0.25, ease: "power2.inOut" }, ${vo + 6.1});
mouth("s2-z", ${vo + 5.6}, "o");
pose("s2-z", ${vo + 6.2}, { armR: -120, foreR: -20, head: -10 }, 0.35);
mouth("s2-z", ${vo + 6.6}, "smile");
// "actor" — spotlight on the star
tl.to("#s2-cone", { opacity: 1, duration: 0.4 }, ${vo + 6.9});
tl.to("#s2-star", { scale: 1.1, duration: 0.35, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${vo + 7.0});
// "loses his face" — star droops
tl.to("#s2-star", { rotation: 18, y: 30, duration: 0.5, ease: "power2.in" }, ${vo + 7.8});
mouth("s2-z", ${vo + 7.9}, "worry");
blink("s2-z", ${vo + 7.2});
tl.to("#s2-clap", { opacity: 0, duration: 0.3 }, ${vo + 8.3});
tl.to("#s2-cone", { opacity: 0, duration: 0.3 }, ${vo + 8.3});
// star flies at the lens
tl.to("#s2-star", { x: -230, y: 280, scale: 16, rotation: 40, duration: 0.95, ease: "power3.in" }, 9.0);
`;
  return scene(id, SCENES[1].dur, markup, script);
}

// ======================= SCENE 3 =======================
function s3() {
  const id = "s3";
  const mask = (pid, fill, stroke, extra = "") => `<g id="${pid}" ${extra}>
    <path d="M0,-230 C120,-230 175,-140 170,-30 C166,80 110,210 0,232 C-110,210 -166,80 -170,-30 C-175,-140 -120,-230 0,-230 Z" fill="${fill}" stroke="${stroke}" stroke-width="7"/>
    <path d="M-110,-70 Q-70,-95 -30,-72 M30,-72 Q70,-95 110,-70" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/>
    <path d="M-100,-30 Q-70,-12 -40,-30 M40,-30 Q70,-12 100,-30" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
    <path d="M0,-20 L-14,60 Q0,70 14,60" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-60,120 Q0,160 60,120" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/>
  </g>`;
  const cracks = [
    "M-150,-150 L-90,-110 L-60,-40 L-10,0 L30,40 L80,110 L140,150",
    "M-60,-40 L-110,10 L-150,40",
    "M30,40 L70,10 L120,0",
    "M-10,0 L-30,80 L-60,140",
    "M80,110 L60,190",
  ];
  const r = rng(11);
  const parts = Array.from({ length: 20 }, (_, i) => ({ i, tx: (r() - 0.5) * 260, ty: -60 - r() * 180, d: 0.5 + r() * 0.4, t: (i * 0.045) }));
  const markup = `
${bg(id)}
<div id="s3-stage" class="stage">
  ${panel("s3-p-sz", 720, 190, 280, 290, `${figure("s3-sz", 140, 270, 0.5, { fill: C.charcoal, edge: "#1d2026", hat: true, hatFill: "#1d2026", coat: true, glow: false })}`, "danger")}
  ${panel("s3-p-cc", 80, 190, 280, 290, `${figure("s3-cc", 140, 270, 0.5, { fill: C.coat, edge: C.coatDark, hair: true, hairFill: "#4d5866", coat: true, glow: false })}
    <svg class="abs" style="left:170px;top:140px" width="80" height="100" viewBox="-40 -50 80 100"><path d="M-12,-40 L12,-40 L12,-8 L32,34 Q36,44 24,44 L-24,44 Q-36,44 -32,34 L-12,-8 Z" fill="#e9fbff" stroke="${C.cyan}" stroke-width="5"/><path d="M-26,24 L26,24 L30,34 Q32,40 24,40 L-24,40 Q-32,40 -30,34 Z" fill="${C.cyan}"/></svg>`)}
  <svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920" overflow="visible">
    <g transform="translate(540 560)"><g id="s3-maskwrap">
      <g id="s3-maskg">
        ${mask("s3-mask", "rgba(205,244,255,.85)", "#36b6e0")}
        ${mask("s3-maskclay", C.clay, C.clayDark, `style="opacity:0"`)}
        <g id="s3-cracks" stroke="#2b6f8a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          ${cracks.map((d, i) => `<path id="s3-cr${i}" d="${d}" stroke-dasharray="600" stroke-dashoffset="600"/>`).join("")}
        </g>
        <path id="s3-slash" d="M-190,-190 L190,190" stroke="${C.red}" stroke-width="16" stroke-linecap="round" stroke-dasharray="540" stroke-dashoffset="540"/>
        ${[[-110, 205], [-40, 228], [40, 228], [112, 200]].map(([x, y], i) => `<path id="s3-dr${i}" d="M${x - 18},${y - 10} q18,-8 36,0 l-4,${60 + i * 14} q-14,22 -28,0 Z" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4" style="opacity:0"/>`).join("")}
      </g>
      <g id="s3-blob" style="opacity:0"><ellipse cx="0" cy="280" rx="44" ry="54" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4"/></g>
    </g></g>
    ${parts.map((p) => `<circle id="s3-pt${p.i}" cx="540" cy="830" r="${7 + (p.i % 3) * 2}" fill="${C.cyan}" style="opacity:0"/>`).join("")}
    <circle id="s3-flash" cx="540" cy="760" r="600" fill="${C.gold}"/>
  </svg>
  <svg id="s3-vial" class="abs" style="left:430px;top:770px" width="90" height="150" viewBox="-45 -75 90 150" overflow="visible">
    <rect x="-24" y="-66" width="48" height="16" rx="5" fill="#9aa4b0"/>
    <rect x="-20" y="-52" width="40" height="120" rx="20" fill="rgba(225,250,255,.9)" stroke="${C.cyan}" stroke-width="5"/>
    <rect x="-15" y="-10" width="30" height="72" rx="15" fill="${C.cyan}"/>
    <circle cx="-4" cy="10" r="5" fill="#fff"/><circle cx="6" cy="34" r="4" fill="#fff"/>
  </svg>
  ${zeke("s3-z", 300, 1110, 0.85)}
</div>
`;
  const css = `.panel.danger{border-color:rgba(232,50,43,.85);box-shadow:0 0 46px rgba(232,50,43,.35), inset 0 0 34px rgba(255,255,255,.8);}
#s3-vial{filter:drop-shadow(0 0 16px rgba(25,195,240,.7));}`;
  const vo = VO_OFFSET;
  const ptJs = parts.map((p) => `tl.fromTo("#s3-pt${p.i}", { x: 0, y: 0, opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.05 }, { x: ${p.tx.toFixed(0)}, y: ${(p.ty - 60).toFixed(0)}, duration: ${p.d.toFixed(2)}, ease: "power2.inOut" }, { opacity: 0, duration: 0.15 }] }, ${(vo + 7.2 + p.t).toFixed(2)});`).join("\n");
  const script = `
tl.fromTo("#s3-flash", { attr: { r: 1300 }, opacity: 1 }, { attr: { r: 0 }, opacity: 0.0, duration: 0.55, ease: "power3.out" }, 0);
tl.fromTo("#s3-maskwrap", { opacity: 0, scale: 0.9, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }, 0.1);
tl.to("#s3-maskg", { y: -10, duration: 1.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.4);
gsap.set("#s3-vial", { opacity: 0 });
mouth("s3-z", 0, "smile");
pose("s3-z", 0.3, { head: -14, armL: 30, armR: -30 }, 0.5);
blink("s3-z", 0.9);
// Szabo
tl.fromTo("#s3-p-sz", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, ${vo + 0.7});
pose("s3-sz", ${vo + 1.2}, { armR: -100, foreR: -30 }, 0.3, "power3.out");
// slash
tl.to("#s3-slash", { attr: { "stroke-dashoffset": 0 }, duration: 0.16, ease: "power4.in" }, ${vo + 1.7});
${[0, 1, 2, 3, 4].map((i) => `tl.to("#s3-cr${i}", { attr: { "stroke-dashoffset": 0 }, duration: 0.35, ease: "power2.out" }, ${(vo + 1.85 + i * 0.06).toFixed(2)});`).join("\n")}
tl.fromTo("#s3-maskwrap", { x: 0 }, { x: 14, duration: 0.05, yoyo: true, repeat: 5 }, ${vo + 1.86});
mouth("s3-z", ${vo + 1.86}, "o");
pose("s3-z", ${vo + 1.86}, { armL: 140, foreL: -90, armR: -140, foreR: 90, head: 4 }, 0.15, "power3.out");
tl.to("#s3-z", { x: -40, duration: 0.25, ease: "power2.out" }, ${vo + 1.86});
tl.to("#s3-p-sz", { opacity: 0, x: 60, duration: 0.35, ease: "power2.in" }, ${vo + 3.3});
// desperate
rest("s3-z", ${vo + 3.2}, 0.4); mouth("s3-z", ${vo + 3.5}, "worry");
tl.to("#s3-maskg", { opacity: 0.7, duration: 0.4 }, ${vo + 3.6});
// scientist Caitlyn Corr
tl.fromTo("#s3-p-cc", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, ${vo + 4.75});
pose("s3-cc", ${vo + 5.3}, { armR: -70, foreR: -50 }, 0.35);
// Zeke grabs the vial and carries it up
tl.fromTo("#s3-vial", { opacity: 0, scale: 0.4, x: -170, y: 40 }, { opacity: 1, scale: 1, x: -170, y: 40, duration: 0.35, ease: "back.out(2)" }, ${vo + 5.3});
pose("s3-z", ${vo + 5.3}, { armL: -40, foreL: -50, armR: 40, foreR: 50 }, 0.3);
mouth("s3-z", ${vo + 5.4}, "flat");
walk("s3-z", ${vo + 5.75}, 0.8, -40, 170);
pose("s3-z", ${vo + 6.56}, { armL: -40, foreL: -50, armR: 40, foreR: 50 }, 0.01);
tl.to("#s3-vial", { x: 0, duration: 0.8, ease: "power1.inOut" }, ${vo + 5.75});
pose("s3-z", ${vo + 6.6}, { armL: 160, foreL: 10, armR: -160, foreR: -10, head: -14 }, 0.35, "power2.out");
tl.to("#s3-vial", { x: 20, y: -110, rotation: -20, duration: 0.35, ease: "power2.out" }, ${vo + 6.6});
// nanotech particles heal the cracks
${ptJs}
tl.to("#s3-maskg", { opacity: 1, duration: 0.4 }, ${vo + 7.4});
tl.to(["#s3-cracks", "#s3-slash"], { opacity: 0, duration: 0.5 }, ${vo + 7.9});
tl.fromTo("#s3-maskwrap", { filter: "drop-shadow(0 0 0px rgba(25,195,240,0))" }, { filter: "drop-shadow(0 0 30px rgba(25,195,240,.9))", duration: 0.4, yoyo: true, repeat: 1 }, ${vo + 8.4});
mouth("s3-z", ${vo + 8.5}, "smile");
tl.to("#s3-vial", { opacity: 0, duration: 0.3 }, ${vo + 8.7});
rest("s3-z", ${vo + 8.8}, 0.4);
tl.to("#s3-p-cc", { opacity: 0, x: -60, duration: 0.35 }, ${vo + 8.9});
// until he starts melting
mouth("s3-z", ${vo + 9.4}, "flat");
pose("s3-z", ${vo + 9.4}, { head: -16 }, 0.3);
tl.to("#s3-maskclay", { opacity: 1, duration: 0.8, ease: "power1.inOut" }, ${vo + 9.5});
tl.to("#s3-maskg", { scaleY: 1.07, transformOrigin: "50% 0%", duration: 1.4, ease: "power1.in" }, ${vo + 9.6});
${[0, 1, 2, 3].map((i) => `tl.fromTo("#s3-dr${i}", { opacity: 1, scaleY: 0, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: ${0.8 + i * 0.12}, ease: "power1.in" }, ${(vo + 9.8 + i * 0.12).toFixed(2)});`).join("\n")}
mouth("s3-z", ${vo + 9.9}, "worry");
walk("s3-z", ${vo + 10.0}, 0.55, 170, 90);
// a drip falls out of frame
tl.to("#s3-blob", { opacity: 1, duration: 0.05 }, 11.2);
tl.fromTo("#s3-blob", { y: 0 }, { y: 1500, duration: 0.55, ease: "power3.in" }, 11.22);
`;
  return scene(id, SCENES[2].dur, markup, script, css);
}

// ======================= SCENE 4 =======================
function s4() {
  const id = "s4";
  const PX = 330, PW = 380, PH = 250;
  const tops = [830, 565, 300];
  const markup = `
${bg(id)}
<div id="s4-stage" class="stage">
  ${panel("s4-p0", PX, tops[0], PW, PH, `
     ${figure("s4-f0", 150, 232, 0.5)}
     ${figure("s4-v0", 280, 232, 0.5, { fill: C.gray, edge: C.grayDark, glow: false })}
     <div class="dark" id="s4-d0"></div>`)}
  ${panel("s4-p1", PX, tops[1], PW, PH, `
     ${figure("s4-f1", 150, 232, 0.56, { skirt: true, hair: true })}
     ${figure("s4-v1", 280, 232, 0.5, { fill: C.gray, edge: C.grayDark, glow: false })}
     <div class="dark" id="s4-d1"></div>`)}
  ${panel("s4-p2", PX, tops[2], PW, PH, `
     ${figure("s4-f2", 150, 232, 0.5, { hat: true, hatFill: C.clayDark, coat: true })}
     ${figure("s4-v2", 280, 232, 0.5, { fill: C.gray, edge: C.grayDark, glow: false })}
     <div class="dark" id="s4-d2"></div>`)}
  <svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920" overflow="visible">
    <g transform="translate(520 228)"><g id="s4-rays" style="opacity:0">
      ${Array.from({ length: 12 }, (_, i) => `<path d="M0,0 L${(Math.cos((i * Math.PI) / 6) * 520).toFixed(0)},${(Math.sin((i * Math.PI) / 6) * 520).toFixed(0)} L${(Math.cos((i * Math.PI) / 6 + 0.12) * 520).toFixed(0)},${(Math.sin((i * Math.PI) / 6 + 0.12) * 520).toFixed(0)} Z" fill="${C.red}" opacity=".35"/>`).join("")}
    </g></g>
    <g transform="translate(520 228)"><g id="s4-disco" style="opacity:0">
      <line x1="0" y1="-60" x2="0" y2="-46" stroke="${C.ink}" stroke-width="5"/>
      <circle r="46" fill="#dfe6ee" stroke="${C.ink}" stroke-width="5"/>
      ${[-30, -10, 10, 30].map((y) => `<line x1="-44" y1="${y}" x2="44" y2="${y}" stroke="#9aa6b3" stroke-width="3"/>`).join("")}
      ${[-30, -10, 10, 30].map((x) => `<line x1="${x}" y1="-44" x2="${x}" y2="44" stroke="#9aa6b3" stroke-width="3"/>`).join("")}
      <circle id="s4-discoglow" r="46" fill="${C.red}" style="opacity:0"/>
    </g></g>
    <ellipse id="s4-blob" cx="${PX + 150}" cy="${tops[0] + 200}" rx="46" ry="40" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4"/>
    ${[0, 1].map((i) => `<rect id="s4-ledge${i}" x="760" y="${[818, 553][i]}" width="170" height="22" rx="11" fill="rgba(170,228,255,.85)" stroke="${C.cyan}" stroke-width="3"/>`).join("")}
  </svg>
  ${zeke("s4-z", 845, 1110, 0.7)}
</div>
`;
  const vo = VO_OFFSET;
  const script = `
gsap.set(["#s4-p1", "#s4-p2", "#s4-ledge0", "#s4-ledge1"], { opacity: 0 });
gsap.set(["#s4-f0", "#s4-v0", "#s4-v1", "#s4-v2"], { opacity: 0 });
tl.fromTo("#s4-blob", { y: -1200 }, { y: 0, duration: 0.38, ease: "power3.in" }, 0);
tl.fromTo("#s4-blob", { scaleY: 1, scaleX: 1, transformOrigin: "50% 100%" }, { scaleY: 0.55, scaleX: 1.4, duration: 0.1, yoyo: true, repeat: 1 }, 0.38);
tl.to("#s4-blob", { opacity: 0, duration: 0.15 }, 0.75);
tl.fromTo("#s4-f0", { opacity: 1, scaleY: 0.12, scaleX: 0.9 }, { opacity: 1, scaleY: 0.5, scaleX: 0.5, duration: 0.7, ease: "back.out(1.8)", immediateRender: false }, 0.7);
mouth("s4-z", 0, "flat");
pose("s4-z", 0.4, { head: -12 }, 0.3);
tl.to("#s4-z", { rotation: -6, duration: 0.4 }, 0.5);
// "become anyone" — panels stack up, each a different body
tl.fromTo("#s4-p1", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${vo + 0.7});
tl.fromTo("#s4-p2", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${vo + 1.05});
mouth("s4-z", ${vo + 0.9}, "o");
// climb
tl.to("#s4-z", { rotation: 0, duration: 0.2 }, ${vo + 1.5});
tl.to(["#s4-ledge0", "#s4-ledge1"], { opacity: 1, duration: 0.25 }, ${vo + 1.4});
hop("s4-z", ${vo + 1.7}, 0, -270, 0.42, 70);
hop("s4-z", ${vo + 2.4}, 0, -265, 0.42, 70);
// "hunts everyone who helped ruin him": victims appear, the clay closes in
${[0, 1, 2].map((i) => `tl.fromTo("#s4-v${i}", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.3 }, ${(vo + 2.4 + i * 0.35).toFixed(2)});
tl.to("#s4-f${i}", { x: 60, duration: 0.5, ease: "power2.in" }, ${(vo + 3.7 + i * 0.12).toFixed(2)});
pose("s4-f${i}", ${(vo + 3.7 + i * 0.12).toFixed(2)}, { armR: -90, foreR: -10 }, 0.35);
pose("s4-v${i}", ${(vo + 3.8 + i * 0.12).toFixed(2)}, { armL: 140, armR: -140 }, 0.25);`).join("\n")}
mouth("s4-z", ${vo + 3.0}, "worry");
pose("s4-z", ${vo + 3.1}, { head: 10, armL: 40, armR: -40 }, 0.3);
// nightclub
pop("#s4-disco", ${vo + 4.7}, 1);
tl.to("#s4-disco", { rotation: 360, svgOrigin: "0 0", duration: 3, ease: "none" }, ${vo + 4.7});
tl.to("#s4-rays", { opacity: 1, duration: 0.1 }, ${vo + 5.3});
tl.to("#s4-rays", { rotation: 40, svgOrigin: "0 0", duration: 2.6, ease: "none" }, ${vo + 5.3});
tl.to("#s4-discoglow", { keyframes: [{ opacity: 0.9, duration: 0.1 }, { opacity: 0.2, duration: 0.15 }, { opacity: 0.9, duration: 0.1 }, { opacity: 0.3, duration: 0.2 }, { opacity: 0.9, duration: 0.1 }] }, ${vo + 5.3});
// panels go dark, bottom to top
${[0, 1, 2].map((i) => `tl.to("#s4-d${i}", { opacity: 0.94, duration: 0.12, ease: "power4.in" }, ${(6.1 + i * 0.4).toFixed(2)});
tl.fromTo("#s4-p${i}", { x: 0 }, { x: 8, duration: 0.04, yoyo: true, repeat: 3 }, ${(6.12 + i * 0.4).toFixed(2)});`).join("\n")}
mouth("s4-z", 6.2, "o");
pose("s4-z", 6.2, { armL: 140, foreL: -90, armR: -140, foreR: 90 }, 0.2);
// top dark panel swallows the frame
tl.to("#s4-rays", { opacity: 0, duration: 0.2 }, 7.3);
tl.to("#s4-p2", { y: 360, scale: 7, duration: 0.85, ease: "power3.in" }, 7.6);
tl.to("#s4-d2", { opacity: 1, borderRadius: 0, duration: 0.3 }, 7.6);
`;
  return scene(id, SCENES[3].dur, markup, script);
}

// ======================= SCENE 5 =======================
function s5() {
  const id = "s5";
  const P = { x: 90, y: 250, w: 900, h: 700 };
  const markup = `
${bg(id)}
<div id="s5-stage" class="stage">
  ${panel("s5-panel", P.x, P.y, P.w, P.h, `
    ${figure("s5-det", 330, 640, 0.92, { fill: C.gray, edge: C.grayDark, hat: true, hatFill: C.grayDark, coat: true, badge: true, glow: false })}
    ${figure("s5-cc", 700, 640, 0.92, { fill: C.coat, edge: C.coatDark, hair: true, hairFill: "#4d5866", coat: true, glow: false })}
    ${figure("s5-clay", 330, 640, 0.92, { hat: true, hatFill: C.grayDark, coat: true, badge: true, lumps: true })}
    <svg class="abs" style="left:0;top:0" width="${P.w}" height="${P.h}" viewBox="0 0 ${P.w} ${P.h}" overflow="visible">
      <g id="s5-heart" transform="translate(640 270)"><path d="${heartPath}" fill="${C.cyan}" stroke="#fff" stroke-width="5"/></g>
      <g transform="translate(410 120)"><g id="s5-bolt"><path d="M20,-90 L-40,10 L-4,10 L-24,100 L44,-14 L8,-14 L30,-90 Z" fill="${C.blue}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></g></g>
      <rect id="s5-flash" x="0" y="0" width="${P.w}" height="${P.h}" fill="#e6f6ff" style="opacity:0"/>
    </svg>
  `)}
  ${zeke("s5-z", 170, 1120, 0.95)}
  <div id="s5-dark" style="position:absolute;inset:0;background:#0d1117"></div>
</div>
`;
  const vo = VO_OFFSET;
  const script = `
gsap.set(["#s5-cc", "#s5-heart", "#s5-bolt"], { opacity: 0 });
gsap.set(["#s5-clay-hat", "#s5-clay-badge"], { opacity: 0 });
tl.fromTo("#s5-dark", { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power2.out" }, 0);
tl.fromTo("#s5-panel", { scale: 1.25 }, { scale: 1, duration: 0.6, ease: "power3.out" }, 0);
gsap.set("#s5-z", { x: -320 });
// the clay walks in and absorbs the detective
walk("s5-clay", 0.2, 0.9, -330, -40);
tl.to("#s5-clay", { x: 0, duration: 0.3, ease: "power3.in" }, ${vo + 0.7});
tl.to("#s5-det", { scale: 0.8, opacity: 0, duration: 0.45, ease: "power2.in" }, ${vo + 0.85});
tl.to("#s5-clay svg", { filter: "drop-shadow(0 0 26px rgba(232,50,43,.85))", duration: 0.2, yoyo: true, repeat: 1 }, ${vo + 0.85});
// Caitlyn and her heart
tl.fromTo("#s5-cc", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.4 }, ${vo + 2.0});
pose("s5-cc", ${vo + 2.4}, { armL: 60, foreL: 70 }, 0.4);
pop("#s5-heart", ${vo + 2.9}, 1);
tl.to("#s5-heart", { scale: 1.1, duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${vo + 3.4});
// wears his face
tl.to(".s5-clay-fill", { fill: "${C.gray}", stroke: "${C.grayDark}", duration: 0.5 }, ${vo + 3.6});
tl.to(".s5-clay-limb", { stroke: "${C.gray}", duration: 0.5 }, ${vo + 3.6});
tl.fromTo(["#s5-clay-hat", "#s5-clay-badge"], { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(2)" }, ${vo + 3.7});
// hoping she'll love him back
walk("s5-clay", ${vo + 4.6}, 0.75, 0, 150);
pose("s5-clay", ${vo + 5.4}, { armR: -75, foreR: -15 }, 0.45);
// Zeke: no, no
walk("s5-z", ${vo + 4.6}, 0.6, -320, 0);
mouth("s5-z", ${vo + 4.7}, "worry");
pose("s5-z", ${vo + 5.3}, { armL: -60, foreL: -80, armR: 60, foreR: 80 }, 0.3);
${[0, 1, 2, 3].map((k) => `pose("s5-z", ${(vo + 5.5 + k * 0.22).toFixed(2)}, { head: ${k % 2 ? -14 : 14} }, 0.2, "sine.inOut");`).join("\n")}
pose("s5-z", ${vo + 6.4}, { head: 0 }, 0.2);
// silence, then the kill switch
pose("s5-cc", ${vo + 7.0}, { armL: -80, foreL: -10 }, 0.25, "power3.out");
tl.to("#s5-heart", { opacity: 0, scale: 0.6, duration: 0.25 }, ${vo + 7.0});
tl.fromTo("#s5-bolt", { opacity: 0, y: -120, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power4.in" }, ${vo + 7.6});
tl.to("#s5-flash", { keyframes: [{ opacity: 0.95, duration: 0.05 }, { opacity: 0.1, duration: 0.08 }, { opacity: 0.8, duration: 0.05 }, { opacity: 0, duration: 0.25 }] }, ${vo + 7.78});
tl.to("#s5-bolt", { opacity: 0, duration: 0.25 }, ${vo + 8.2});
tl.fromTo("#s5-panel", { x: 0 }, { x: 12, duration: 0.04, yoyo: true, repeat: 7 }, ${vo + 7.8});
mouth("s5-z", ${vo + 7.8}, "o");
pose("s5-z", ${vo + 7.8}, { armL: 150, foreL: -100, armR: -150, foreR: 100 }, 0.15);
// swells into a monster, then sinks
tl.to(["#s5-clay-hat", "#s5-clay-badge"], { opacity: 0, duration: 0.15 }, ${vo + 7.85});
tl.to(".s5-clay-fill", { fill: "${C.clay}", stroke: "${C.clayDark}", duration: 0.2 }, ${vo + 7.85});
tl.to(".s5-clay-limb", { stroke: "${C.clay}", duration: 0.2 }, ${vo + 7.85});
tl.to("#s5-clay-lumps", { opacity: 1, duration: 0.05 }, ${vo + 7.95});
${Array.from({ length: 8 }, (_, i) => `tl.fromTo("#s5-clay-lump${i}", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, ${(vo + 7.95 + i * 0.05).toFixed(2)});`).join("\n")}
tl.to("#s5-clay", { scale: 1.3, duration: 0.6, ease: "back.out(2)" }, ${vo + 7.95});
pose("s5-clay", ${vo + 8.0}, { armL: 150, foreL: 30, armR: -150, foreR: -30, head: 10 }, 0.35);
tl.to("#s5-clay", { y: 560, duration: 0.85, ease: "power2.in" }, 9.1);
`;
  return scene(id, SCENES[4].dur, markup, script);
}

// ======================= SCENE 6 =======================
function s6() {
  const id = "s6";
  const PY = 1300; // underground world offset
  const P = { x: 120, y: 330, w: 840, h: 640 };
  const markup = `
<div id="s6-world" class="stage" style="height:${H + PY}px">
  <div class="bg" style="height:${H}px"></div>
  <svg class="floor" viewBox="0 0 1080 900" width="1080" height="900" style="top:1040px">
    ${(() => { let o = ""; for (let i = -10; i <= 10; i++) o += `<line x1="${540 + i * 150}" y1="900" x2="${540 + i * 22}" y2="0" />`; for (let k = 1; k <= 9; k++) { const y = Math.pow(k / 9, 1.8) * 900; o += `<line x1="0" y1="${y.toFixed(1)}" x2="1080" y2="${y.toFixed(1)}" />`; } return o; })()}
  </svg>
  <div class="under" style="top:${H - 40}px;height:${PY + 40}px"></div>
  <svg class="abs" style="left:0;top:0" width="1080" height="${H + PY}" viewBox="0 0 1080 ${H + PY}" overflow="visible">
    <ellipse cx="540" cy="1070" rx="170" ry="40" fill="#bdf0ff" stroke="${C.cyan}" stroke-width="6" style="filter:drop-shadow(0 0 18px rgba(25,195,240,.9))"/>
    ${[-120, -72, -24, 24, 72, 120].map((x) => `<line x1="${540 + x}" y1="${1070 - Math.sqrt(1 - (x / 170) ** 2) * 36}" x2="${540 + x}" y2="${1070 + Math.sqrt(1 - (x / 170) ** 2) * 36}" stroke="#2a8db0" stroke-width="7" stroke-linecap="round"/>`).join("")}
    <g id="s6-lump" transform="translate(540 1050)">
      <g id="s6-lumpin"><path d="M-120,10 C-130,-60 -80,-120 -30,-110 C-10,-170 60,-160 70,-100 C130,-100 140,-20 120,10 Z" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="5"/>
      <circle cx="-60" cy="-70" r="26" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4"/><circle cx="50" cy="-120" r="24" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4"/></g>
    </g>
    <path id="s6-stream" d="M520,1080 Q540,1070 560,1080 L556,${PY + P.y + 560} Q540,${PY + P.y + 580} 524,${PY + P.y + 560} Z" fill="${C.clay}" style="opacity:0"/>
  </svg>
  <div style="position:absolute;left:0;top:${PY}px;width:1080px;height:${H}px">
    ${panel("s6-panel", P.x, P.y, P.w, P.h, `
      <svg class="abs" style="left:0;top:0" width="${P.w}" height="${P.h}" viewBox="0 0 ${P.w} ${P.h}">
        <rect x="40" y="520" width="300" height="70" rx="26" fill="#c9d6e3" stroke="#8fa3b8" stroke-width="5"/>
        <rect x="56" y="500" width="110" height="36" rx="18" fill="#eef4fa" stroke="#8fa3b8" stroke-width="4"/>
        <rect x="640" y="150" width="150" height="400" rx="70" fill="#dff6ff" stroke="#8fa3b8" stroke-width="7"/>
        <path d="M670,210 L700,180 M670,260 L740,190" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
        <line x1="715" y1="550" x2="715" y2="600" stroke="#8fa3b8" stroke-width="8"/><line x1="670" y1="600" x2="760" y2="600" stroke="#8fa3b8" stroke-width="8" stroke-linecap="round"/>
        <ellipse id="s6-puddle" cx="430" cy="592" rx="70" ry="16" fill="${C.clay}" style="opacity:0"/>
        <ellipse id="s6-piece" cx="470" cy="420" rx="22" ry="26" fill="${C.clay}" stroke="${C.clayDark}" stroke-width="4" style="opacity:0"/>
      </svg>
      <div id="s6-refl" style="position:absolute;left:640px;top:150px;width:150px;height:400px;overflow:hidden;border-radius:70px;opacity:0">
        <div style="position:absolute;left:-200px;top:-50px">${figure("s6-rf", 260, 420, 0.62, { glow: false })}</div>
      </div>
      ${figure("s6-man", 400, 600, 0.95)}
      ${figure("s6-wom", 560, 600, 0.95, { skirt: true, hair: true })}
    `)}
  </div>
</div>
<svg class="abs" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920" overflow="visible">
  <g id="s6-mon" transform="translate(220 1020)" style="opacity:0">
    <path d="M-70,-60 C-90,-120 -20,-140 0,-110 C30,-150 100,-110 76,-50 C110,-10 90,60 40,72 C10,96 -40,90 -60,60 C-100,40 -100,-20 -70,-60 Z" fill="${C.red}" stroke="#fff" stroke-width="6"/>
    <path d="M-44,-30 L-14,-14 M44,-30 L14,-14" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
    <path d="M-36,34 L-22,20 L-8,34 L6,20 L20,34 L34,20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g id="s6-vic" transform="translate(860 1020)" style="opacity:0">
    <g id="s6-vicL"><path d="M0,30 C-40,0 -60,-30 -40,-50 C-25,-65 -5,-58 0,-42 L-10,-20 L6,-4 L-6,14 Z" transform="scale(1.6)" fill="${C.cyan}" stroke="#fff" stroke-width="4"/></g>
    <g id="s6-vicR"><path d="M0,30 C40,0 60,-30 40,-50 C25,-65 5,-58 0,-42 L-10,-20 L6,-4 L-6,14 Z" transform="scale(1.6)" fill="${C.cyan}" stroke="#fff" stroke-width="4"/></g>
  </g>
</svg>
${zeke("s6-z", 540, 1120, 0.85)}
<div id="s6-title" class="endtitle"><span class="m">MONSTER</span> <span class="o">or</span> <span class="v">VICTIM?</span></div>
`;
  const css = `.under{position:absolute;left:0;width:1080px;background:linear-gradient(180deg,#e9eff4 0%,#d6dee7 25%,#cdd6e0 100%);}
.endtitle{position:absolute;left:0;right:0;top:186px;text-align:center;font:900 76px/1.1 Montserrat,sans-serif;color:${C.ink};letter-spacing:-.01em;opacity:0}
.endtitle .m{color:${C.red}} .endtitle .v{color:${C.blue}} .endtitle .o{font-weight:700;font-size:56px}`;
  const vo = VO_OFFSET;
  const script = `
gsap.set(["#s6-man", "#s6-wom", "#s6-z"], { opacity: 0 });
// the lump drips through the grate
tl.fromTo("#s6-lumpin", { scaleY: 1, scaleX: 1, transformOrigin: "50% 100%" }, { scaleY: 0.05, scaleX: 0.5, duration: 1.3, ease: "power2.in" }, 0.1);
tl.to("#s6-stream", { opacity: 1, duration: 0.1 }, 0.25);
tl.fromTo("#s6-stream", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 1.8, ease: "power1.in" }, 0.3);
// camera follows it down
tl.to("#s6-world", { y: -${PY}, duration: 1.25, ease: "power2.inOut" }, 1.0);
tl.to("#s6-stream", { opacity: 0, duration: 0.2 }, 2.15);
tl.fromTo("#s6-puddle", { opacity: 0, scaleX: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scaleX: 1, duration: 0.3 }, 2.0);
// he survives: rises from the puddle
tl.set("#s6-man", { opacity: 1 }, 2.4);
tl.fromTo("#s6-man", { scaleY: 0.1, scaleX: 1.3 }, { scaleY: 0.95, scaleX: 0.95, duration: 0.9, ease: "back.out(1.6)" }, 2.4);
tl.to("#s6-puddle", { opacity: 0, duration: 0.3 }, 2.7);
tl.to("#s6-refl", { opacity: 0.5, duration: 0.6 }, 3.1);
pose("s6-man", 3.3, { head: 12, armL: 10, armR: -10 }, 0.6);
pose("s6-rf", 3.3, { head: 12 }, 0.6);
// builds his own Caitlyn
pose("s6-man", ${vo + 3.9}, { armR: -100, foreR: -20 }, 0.3);
tl.fromTo("#s6-piece", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.25 }, ${vo + 4.0});
tl.to("#s6-piece", { attr: { cx: 560, cy: 580 }, duration: 0.5, ease: "power2.inOut" }, ${vo + 4.3});
tl.to("#s6-piece", { opacity: 0, duration: 0.1 }, ${vo + 4.8});
tl.set("#s6-wom", { opacity: 1 }, ${vo + 4.8});
tl.fromTo("#s6-wom", { scaleY: 0.1, scaleX: 1.2 }, { scaleY: 0.95, scaleX: 0.95, duration: 1.0, ease: "back.out(1.4)" }, ${vo + 4.8});
// the embrace, like the opening
tl.to("#s6-man", { x: 30, rotation: 7, duration: 0.8, ease: "power1.inOut" }, ${vo + 5.9});
tl.to("#s6-wom", { x: -30, rotation: -7, duration: 0.8, ease: "power1.inOut" }, ${vo + 5.9});
pose("s6-man", ${vo + 5.9}, { armR: -60, foreR: -40 }, 0.6);
pose("s6-wom", ${vo + 5.9}, { armL: 60, foreL: 40 }, 0.6);
tl.to("#s6-refl", { opacity: 0.2, duration: 0.5 }, ${vo + 6.0});
// Zeke steps in: monster or victim?
tl.set("#s6-z", { opacity: 1 }, ${vo + 6.0});
walk("s6-z", ${vo + 6.0}, 0.6, 520, 0);
mouth("s6-z", ${vo + 6.0}, "flat");
pop("#s6-mon", ${vo + 6.64}, 1);
pose("s6-z", ${vo + 6.64}, { armL: 110, foreL: 20 }, 0.3);
pop("#s6-vic", ${vo + 7.56}, 1);
pose("s6-z", ${vo + 7.56}, { armL: 8, foreL: -6, armR: -110, foreR: -20 }, 0.3);
tl.fromTo("#s6-vicL", { x: 0, rotation: 0 }, { x: -8, rotation: -8, transformOrigin: "50% 100%", duration: 0.3 }, ${vo + 7.9});
tl.fromTo("#s6-vicR", { x: 0, rotation: 0 }, { x: 8, rotation: 8, transformOrigin: "50% 100%", duration: 0.3 }, ${vo + 7.9});
// tell me below — open palms to the viewer
pose("s6-z", ${vo + 8.4}, { armL: 50, foreL: 40, armR: -50, foreR: -40, head: 0 }, 0.35);
mouth("s6-z", ${vo + 8.5}, "smile");
blink("s6-z", ${vo + 9.4});
tl.fromTo("#s6-title", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 10.0);
tl.to(["#s6-mon", "#s6-vic"], { scale: 1.08, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 10.2);
breathe("s6-z", 10.0, 1.6);
blink("s6-z", 11.0);
`;
  return scene(id, SCENES[5].dur, markup, script, css);
}

// ======================= CAPTIONS =======================
const FIX = { "Clay": "CLAYFACE", "Marcos": "Markos", "Shabo": "Szabo", "Shabo's": "Szabo's", "Hagin's": "Hagen's", "Caitlin": "Caitlyn", "Carr": "Corr", "Borelli,": "Borrelli,", "you'd": "You'd", "catch,": "catch?", "victim,": "victim?", "works,": "works…", "drain": "drain…", "So": "So", "body": "body-", "horror": "horror" };
function captions() {
  const groups = [];
  SCENES.forEach((s, si) => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/voice/vo${si + 1}.json`), "utf8"));
    let words = (Array.isArray(j) ? j : j.words).map((w) => ({ ...w }));
    // merge "Clay"+"Face"
    const merged = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.text === "Clay" && words[i + 1] && /^Face/.test(words[i + 1].text)) { merged.push({ text: "Clayface", start: w.start, end: words[i + 1].end }); i++; continue; }
      if (w.text === "body" && words[i + 1] && words[i + 1].text === "horror") { merged.push({ text: "body-horror", start: w.start, end: words[i + 1].end }); i++; continue; }
      merged.push(w);
    }
    words = merged.map((w) => ({ ...w, text: FIX[w.text] && w.text !== "Clay" ? FIX[w.text] : w.text }));
    const off = s.start + VO_OFFSET;
    let cur = [];
    const flush = () => { if (cur.length) groups.push(cur); cur = []; };
    words.forEach((w, i) => {
      const prev = words[i - 1];
      if (cur.length && (cur.length >= 4 || (prev && w.start - prev.end > 0.15 && cur.length >= 2) || /[.?!…]$/.test(prev?.text || ""))) flush();
      cur.push({ text: w.text, start: +(w.start + off).toFixed(3), end: +(w.end + off).toFixed(3) });
    });
    flush();
  });
  // timing per group
  groups.forEach((g, i) => {
    g.s = Math.max(0.15, g[0].start - 0.08);
    const next = groups[i + 1];
    g.e = Math.min(g[g.length - 1].end + 0.35, next ? next[0].start - 0.1 : TOTAL);
  });
  const markup = groups.map((g, i) => `<div id="cap${i}" class="clip cap" data-start="${g.s.toFixed(2)}" data-duration="${(g.e - g.s).toFixed(2)}" data-track-index="1"><div class="line" id="cap${i}-l">${g.map((w, k) => `<span id="cap${i}-w${k}" class="w">${w.text}</span>`).join(" ")}</div></div>`).join("\n");
  const js = groups.map((g, i) => {
    const dur = g.e - g.s;
    let s = `tl.fromTo("#cap${i}-l", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.16, ease: "power3.out" }, ${g.s.toFixed(2)});\n`;
    g.forEach((w, k) => { s += `tl.fromTo("#cap${i}-w${k}", { color: "${C.ink}" }, { color: "${C.red}", duration: 0.06 }, ${w.start.toFixed(2)});\n`; if (k < g.length - 1) s += `tl.to("#cap${i}-w${k}", { color: "${C.ink}", duration: 0.04 }, ${Math.max(w.start + 0.07, g[k + 1].start - 0.04).toFixed(2)});\n`; });
    s += `tl.to("#cap${i}-l", { opacity: 0, duration: 0.1, ease: "power2.in" }, ${(g.s + dur - 0.1).toFixed(2)});\n`;
    return s;
  }).join("");
  return `<template>
<style>
#root { position:absolute; inset:0; }
.cap { position:absolute; left:0; top:1196px; width:1080px; height:150px; text-align:center; overflow:visible; }
.line { display:inline-block; max-width:980px; font: 900 64px/1.12 Montserrat, sans-serif; color:${C.ink}; text-transform:uppercase; letter-spacing:-.01em;
  text-shadow: 0 0 10px #fff, 0 0 4px #fff, 0 0 2px #fff; }
</style>
<div id="root" data-composition-id="captions" data-width="${W}" data-height="${H}" data-start="0" data-duration="${TOTAL}">
${markup}
</div>
<script>
(function(){
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines["captions"] = tl;
})();
</script>
</template>
`;
}

// ======================= ROOT =======================
const SFX = [
  // [scene index, local time, file, volume]
  [0, 3.35, "pop", 0.45], [0, 6.8, "whoosh-cinematic", 0.35],
  [1, 3.05, "glitch-1", 0.45], [1, 6.1, "sparkle", 0.4], [1, 8.95, "whoosh", 0.5],
  [2, 1.0, "pop", 0.4], [2, 2.0, "impact-bass-1", 0.55], [2, 5.05, "pop", 0.4], [2, 9.15, "sparkle", 0.4], [2, 11.2, "whoosh-short", 0.5],
  [3, 0.36, "impact-bass-2", 0.35], [3, 1.0, "pop", 0.35], [3, 1.35, "pop", 0.35], [3, 2.0, "whoosh-short", 0.35], [3, 2.7, "whoosh", 0.3],
  [3, 5.0, "pop", 0.4], [3, 6.1, "impact-bass-1", 0.5], [3, 6.5, "impact-bass-2", 0.5], [3, 6.9, "impact-bass-1", 0.5], [3, 7.6, "whoosh-cinematic", 0.35],
  [4, 1.15, "glitch-2", 0.4], [4, 3.2, "sparkle", 0.35], [4, 8.08, "glitch-1", 0.5], [4, 8.1, "impact-bass-2", 0.6], [4, 9.1, "whoosh-short", 0.4],
  [5, 0.9, "whoosh", 0.4], [5, 5.1, "sparkle", 0.4], [5, 6.94, "pop", 0.45], [5, 7.86, "pop", 0.45], [5, 10.0, "whoosh-short", 0.35],
];

function root() {
  const hosts = SCENES.map((s, i) => `<div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.dur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}"></div>`).join("\n      ");
  const vo = SCENES.map((s, i) => `<audio id="vo${i + 1}" class="clip" src="assets/voice/vo${i + 1}.wav" data-start="${(s.start + VO_OFFSET).toFixed(2)}" data-duration="${VO_DUR[i]}" data-track-index="3" data-volume="1"></audio>`).join("\n      ");
  const lanes = [];
  const sfx = SFX.map(([si, t, f, v], k) => {
    const st = SCENES[si].start + t, du = Math.min(SFX_DUR[f], TOTAL - st);
    let lane = lanes.findIndex((e) => e <= st - 0.01);
    if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = st + du;
    return `<audio id="fx${k}" class="clip" src="assets/sfx/${f}.mp3" data-start="${st.toFixed(2)}" data-duration="${du.toFixed(2)}" data-track-index="${4 + lane}" data-volume="${v}"></audio>`;
  }).join("\n      ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #f1f5f8; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
      ${hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:10"></div>
      ${vo}
      ${sfx}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

fs.mkdirSync(path.join(ROOT, "compositions"), { recursive: true });
const out = { s1: s1(), s2: s2(), s3: s3(), s4: s4(), s5: s5(), s6: s6(), captions: captions() };
for (const [k, v] of Object.entries(out)) fs.writeFileSync(path.join(ROOT, `compositions/${k}.html`), v);
fs.writeFileSync(path.join(ROOT, "index.html"), root());
console.log("built", Object.keys(out).join(", "), "total", TOTAL, "s");
