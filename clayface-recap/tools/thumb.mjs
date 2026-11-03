// Renders publishing/thumbnail-16x9.png (1280x720) and publishing/cover-9x16.png (1080x1920).
// Run: node tools/thumb.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { C, zeke, figure, panel, heartPath } from "./build.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "publishing");
const FONT = (w) => {
  const dir = path.join(process.env.HOME, ".cache/hyperframes/fonts/montserrat");
  const f = fs.readdirSync(dir).filter((n) => n.startsWith(w + "-")).map((n) => path.join(dir, n));
  return f.map((p) => `url(data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}) format("woff2")`);
};

const css = (w, h) => `
${FONT(900).map((src) => `@font-face{font-family:M;font-weight:900;src:${src};}`).join("\n")}
${FONT(800).map((src) => `@font-face{font-family:M;font-weight:800;src:${src};}`).join("\n")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
#c{position:relative;width:${w}px;height:${h}px;overflow:hidden;
  background: radial-gradient(ellipse 120% 80% at 50% 30%, #ffffff 0%, #eef3f7 60%, #dfe7ee 100%);font-family:M,sans-serif}
.fig{position:absolute;transform-origin:50% 97%;transform:scale(var(--s))}
.fig[data-glow] svg{filter:drop-shadow(0 0 14px rgba(255,140,90,.5))}
.panel{position:absolute;border-radius:30px;border:4px solid rgba(25,195,240,.9);
  background:linear-gradient(160deg,rgba(225,248,255,.85),rgba(170,228,255,.42) 60%,rgba(140,210,255,.32));
  box-shadow:0 0 50px rgba(25,180,255,.4), inset 0 0 34px rgba(255,255,255,.8);overflow:hidden}
.floor line{stroke:#d2dae3;stroke-width:2}
.head{position:absolute;color:${C.ink};font-weight:900;letter-spacing:-.02em;line-height:.95;text-transform:uppercase;
  text-shadow:0 0 18px #fff,0 0 6px #fff}
.head .r{color:${C.red}}
.chip{position:absolute;background:${C.red};color:#fff;font-weight:800;letter-spacing:.08em;border-radius:999px;text-align:center;
  box-shadow:0 8px 24px rgba(232,50,43,.35)}
`;
const floor = (w, top, h) => `<svg class="floor" style="position:absolute;left:0;top:${top}px" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${Array.from({ length: 21 }, (_, k) => { const i = k - 10; return `<line x1="${w / 2 + i * 150}" y1="${h}" x2="${w / 2 + i * 22}" y2="0"/>`; }).join("")}
${Array.from({ length: 8 }, (_, k) => { const y = Math.pow((k + 1) / 8, 1.8) * h; return `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}"/>`; }).join("")}
</svg>`;

// The kissing pair, the woman dripping into him: the film's real final image.
const pair = (pfx) => `
  ${figure(pfx + "man", 230, 470, 0.78)}
  ${figure(pfx + "wom", 360, 470, 0.78, { skirt: true, hair: true })}
  <svg style="position:absolute;left:0;top:0" width="600" height="560" viewBox="0 0 600 560" overflow="visible">
    <ellipse cx="296" cy="230" rx="30" ry="15" fill="${C.clay}"/>
    <ellipse cx="300" cy="455" rx="120" ry="14" fill="${C.clay}" opacity=".85"/>
    <g transform="translate(296 92) scale(1.1)"><path d="${heartPath}" fill="${C.cyan}" stroke="#fff" stroke-width="5"/></g>
  </svg>`;

const POSE = `
const set=(id,k,a)=>{const e=document.getElementById(id+'-'+k);if(!e)return;const t=e.getAttribute('transform').match(/rotate\\(([-\\d.]+) ([-\\d.]+) ([-\\d.]+)\\)/);e.setAttribute('transform','rotate('+a+' '+t[2]+' '+t[3]+')');};
const mouth=(id,n)=>['smile','o','flat','worry'].forEach(m=>{const e=document.getElementById(id+'-m-'+m);if(e)e.style.opacity=m===n?1:0;});
const lean=(id,deg,dx)=>{const e=document.getElementById(id);e.style.transform='translateX('+dx+'px) rotate('+deg+'deg) scale('+getComputedStyle(e).getPropertyValue('--s')+')';};
`;

function wide() {
  const W = 1280, H = 720;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(W, H)}</style></head><body><div id="c">
  ${floor(W, 470, 250)}
  ${panel("p", 40, 70, 600, 560, pair("a-"))}
  ${zeke("z", 640, 700, 0.8)}
  <div class="head" style="left:745px;top:80px;width:520px;font-size:100px">SHE'S<br>MADE<br>OF <span class="r">HIM</span></div>
  <div class="chip" style="left:748px;top:420px;width:400px;height:58px;font-size:30px;line-height:58px">CLAYFACE ENDING</div>
  </div><script>${POSE}
  lean('a-man',7,14);lean('a-wom',-7,-14);set('a-man','armR',-55);set('a-man','foreR',-30);set('a-wom','armL',55);set('a-wom','foreL',30);
  set('z','armL',150);set('z','foreL',-90);set('z','armR',-150);set('z','foreR',90);mouth('z','o');set('z','head',-10);
  </script></body></html>`;
}

function tall() {
  const W = 1080, H = 1920;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(W, H)}</style></head><body><div id="c">
  ${floor(W, 1060, 860)}
  <div class="chip" style="left:330px;top:200px;width:420px;height:66px;font-size:34px;line-height:66px">CLAYFACE ENDING</div>
  <div class="head" style="left:0;top:300px;width:${W}px;text-align:center;font-size:128px">SHE'S MADE<br>OF <span class="r">HIM</span></div>
  ${panel("p", 140, 590, 600, 560, pair("b-"))}
  ${zeke("z", 860, 1320, 1.05)}
  </div><script>${POSE}
  lean('b-man',7,14);lean('b-wom',-7,-14);set('b-man','armR',-55);set('b-man','foreR',-30);set('b-wom','armL',55);set('b-wom','foreL',30);
  set('z','armL',150);set('z','foreL',-90);set('z','armR',-150);set('z','foreR',90);mouth('z','o');set('z','head',-10);
  </script></body></html>`;
}

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [name, html, w, h] of [["thumbnail-16x9", wide(), 1280, 720], ["cover-9x16", tall(), 1080, 1920]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  await page.close();
  console.log("wrote", name + ".png");
}
await browser.close();
