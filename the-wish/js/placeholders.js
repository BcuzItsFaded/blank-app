/*
 * Fallback SVG panels, used only until the real storyboard image is loaded.
 * Every character is one reusable SVG symbol (Keeper, Henry, Woman, Corpse, Statue), so
 * placeholder continuity matches the storyboard cast.
 */
(function () {
  const PW = 1200, PH = 760;

  const KEEPER = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-150 260 Q-120 60 0 40 Q120 60 150 260Z" fill="#3a2a1c"/>
    <path d="M-120 -40 Q-170 60 -150 170 M120 -40 Q170 60 150 170 M-90 -90 Q-160 -20 -175 90 M90 -90 Q160 -20 175 90" stroke="#d8d2c0" stroke-width="10" fill="none"/>
    <ellipse cx="0" cy="-10" rx="95" ry="120" fill="#b8a98a"/>
    <path d="M-95 -60 Q0 -150 95 -60" stroke="#e8e2d2" stroke-width="18" fill="none"/>
    <ellipse cx="-38" cy="-20" rx="24" ry="20" fill="#1a0f08"/><ellipse cx="38" cy="-20" rx="24" ry="20" fill="#1a0f08"/>
    <circle cx="-38" cy="-20" r="7" fill="#ffd36a"/><circle cx="38" cy="-20" r="7" fill="#ffd36a"/>
    <path d="M-50 50 Q0 95 50 50 Q0 70 -50 50Z" fill="#2a120a"/>
    <path d="M-40 55 L-40 66 M-24 60 L-24 74 M-8 62 L-8 78 M8 62 L8 78 M24 60 L24 74 M40 55 L40 66" stroke="#e9dfb8" stroke-width="7"/>
  </g>`;
  const HENRY = (x, y, s, mood = "") => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-140 300 Q-130 120 0 110 Q130 120 140 300Z" fill="#1f2a3c"/>
    <path d="M-30 100 L0 150 L30 100" fill="#e8c9a6"/>
    <ellipse cx="0" cy="0" rx="72" ry="92" fill="#e2b48c"/>
    <path d="M-78 -20 Q-90 -110 0 -105 Q90 -110 78 -20 Q60 -70 0 -66 Q-55 -72 -78 -20Z" fill="#1b1410"/>
    <circle cx="-26" cy="-4" r="7" fill="#20140c"/><circle cx="26" cy="-4" r="7" fill="#20140c"/>
    <path d="M-40 -26 L-14 ${mood === "sad" ? -16 : -22} M40 -26 L14 ${mood === "sad" ? -16 : -22}" stroke="#1b1410" stroke-width="6"/>
    ${mood === "shock" ? '<ellipse cx="0" cy="48" rx="16" ry="22" fill="#3b1208"/>'
      : mood === "happy" ? '<path d="M-30 38 Q0 70 30 38Z" fill="#fff" stroke="#3b1208" stroke-width="4"/>'
      : '<path d="M-24 46 Q0 36 24 46" stroke="#3b1208" stroke-width="5" fill="none"/>'}
    <path d="M-60 20 Q0 90 60 20 Q40 80 0 86 Q-40 80 -60 20Z" fill="#000" opacity="0.18"/>
  </g>`;
  const WOMAN = (x, y, s, sick) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-95 -60 Q-130 120 -110 250 L110 250 Q130 120 95 -60Z" fill="#4a2414"/>
    <path d="M-120 300 Q-110 140 0 130 Q110 140 120 300Z" fill="${sick ? "#cfd8e0" : "#7a1f2b"}"/>
    <ellipse cx="0" cy="10" rx="66" ry="86" fill="${sick ? "#d9d0c4" : "#efc29c"}"/>
    <path d="M-80 0 Q-70 -110 0 -100 Q70 -110 80 0 Q50 -60 0 -62 Q-50 -60 -80 0Z" fill="#5a2c16"/>
    ${sick ? '<path d="M-36 4 L-14 4 M14 4 L36 4" stroke="#3a2a20" stroke-width="5"/>'
      : '<circle cx="-24" cy="4" r="7" fill="#1f120a"/><circle cx="24" cy="4" r="7" fill="#1f120a"/><path d="M-20 50 Q0 64 20 50" stroke="#a5303a" stroke-width="6" fill="none"/>'}
  </g>`;
  const CORPSE = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-100 -60 Q-140 120 -120 260 L120 260 Q140 120 100 -60Z" fill="#3b2a1e"/>
    <path d="M-125 300 Q-110 140 0 130 Q110 140 125 300Z" fill="#8e8c7a"/>
    <ellipse cx="0" cy="10" rx="68" ry="88" fill="#8fa27e"/>
    <path d="M-84 0 Q-70 -112 0 -102 Q70 -112 84 0 Q40 -70 0 -60 Q-40 -70 -84 0Z" fill="#4b3424"/>
    <ellipse cx="-26" cy="0" rx="17" ry="14" fill="#140c08"/><ellipse cx="26" cy="0" rx="17" ry="14" fill="#140c08"/>
    <circle cx="-26" cy="0" r="6" fill="#d7ff8a"/><circle cx="26" cy="0" r="6" fill="#d7ff8a"/>
    <path d="M-34 50 Q0 80 34 50 Q0 62 -34 50Z" fill="#200a06"/>
    <path d="M-50 -30 L-30 30 M40 -20 L56 40 M-10 70 L-4 100" stroke="#5c4a36" stroke-width="5"/>
  </g>`;
  const STATUE = (x, y, s, glow) => `<g transform="translate(${x} ${y}) scale(${s})">
    ${glow ? '<circle r="140" fill="url(#gold)"/>' : ""}
    <ellipse cx="0" cy="70" rx="70" ry="60" fill="#3a2c1c"/>
    <circle cx="0" cy="-10" r="48" fill="#4a3824"/>
    <circle cx="-48" cy="-14" r="18" fill="#4a3824"/><circle cx="48" cy="-14" r="18" fill="#4a3824"/>
    <ellipse cx="0" cy="4" rx="28" ry="22" fill="#6a5236"/>
    <circle cx="-16" cy="-18" r="7" fill="${glow ? "#ffe680" : "#c0302a"}"/><circle cx="16" cy="-18" r="7" fill="${glow ? "#ffe680" : "#c0302a"}"/>
    <path d="M-10 14 Q0 22 10 14" stroke="#20160c" stroke-width="4" fill="none"/>
  </g>`;
  const CANDLE = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="0" cy="-70" r="120" fill="url(#flame)"/>
    <rect x="-16" y="-40" width="32" height="120" fill="#efe4c4"/>
    <path d="M0 -84 Q14 -60 0 -44 Q-14 -60 0 -84Z" fill="#ffcc4a"/>
  </g>`;
  const room = (top, bot) => `<rect width="${PW}" height="${PH}" fill="url(#wall)"/>
    <defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
  const DEFS = `<defs>
    <radialGradient id="flame"><stop offset="0" stop-color="#ffcf6a" stop-opacity="0.9"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
    <radialGradient id="gold"><stop offset="0" stop-color="#ffe680" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
    <radialGradient id="tv"><stop offset="0" stop-color="#9fd0ff"/><stop offset="1" stop-color="#2a4a6a"/></radialGradient>
  </defs>`;
  const BILLS = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 157) % 1150, y = 470 + ((i * 89) % 260);
    return `<g transform="translate(${x} ${y}) rotate(${(i * 37) % 40 - 20})"><rect width="130" height="58" rx="4" fill="#6e9a5a" stroke="#2f4a26" stroke-width="4"/><ellipse cx="65" cy="29" rx="18" ry="20" fill="#a9c99a"/></g>`;
  }).join("");

  const SCENES = {
    1: () => room("#20140c", "#050302") + CANDLE(110, 420, 1.2) + KEEPER(620, 380, 1.6),
    2: () => room("#1c2230", "#07090e") + `<rect x="80" y="90" width="300" height="360" fill="#33465e"/><path d="M80 270 H380 M230 90 V450" stroke="#0b0f16" stroke-width="12"/>` + HENRY(720, 320, 1.6, "sad") + `<rect x="420" y="620" width="560" height="140" fill="#2b1d12"/>`,
    3: () => room("#2a1c10", "#0a0604") + `<path d="M760 120 H1160 M760 260 H1160 M760 400 H1160" stroke="#4a3018" stroke-width="16"/>` + HENRY(330, 330, 1.5) + STATUE(900, 500, 1.4),
    4: () => room("#3b2a1a", "#130c06") + `<g transform="rotate(-6 600 380)"><rect x="230" y="230" width="740" height="300" fill="#8a6a40" stroke="#3a2610" stroke-width="16"/><text x="600" y="360" font-family="serif" font-weight="bold" font-size="76" fill="#2a1808" text-anchor="middle">THREE WISHES</text><text x="600" y="460" font-family="serif" font-weight="bold" font-size="66" fill="#2a1808" text-anchor="middle">BUT AT A PRICE</text></g>`,
    5: () => room("#2e2010", "#0a0604") + STATUE(260, 470, 1.5, true) + HENRY(720, 340, 1.7, "happy"),
    6: () => room("#183028", "#060c0a") + HENRY(620, 300, 1.4, "happy") + BILLS,
    7: () => room("#141a24", "#05070a") + `<rect x="420" y="80" width="700" height="460" rx="20" fill="#222"/><rect x="450" y="110" width="640" height="400" fill="url(#tv)"/><rect x="520" y="380" width="500" height="70" fill="#f2f2f2"/><text x="770" y="430" font-family="Arial Black,sans-serif" font-size="44" text-anchor="middle" fill="#111">BUS CRASH KILLS 12</text>` + HENRY(230, 420, 1.6, "shock"),
    8: () => room("#3a2010", "#120804") + HENRY(400, 340, 1.5, "happy") + WOMAN(800, 340, 1.5),
    9: () => room("#3a2414", "#140a04") + HENRY(380, 360, 1.45, "happy") + WOMAN(760, 380, 1.45),
    10: () => room("#26323e", "#0a0e12") + `<rect x="300" y="460" width="800" height="300" fill="#e2e8ee"/>` + WOMAN(720, 380, 1.3, true) + HENRY(170, 380, 1.4, "sad"),
    11: () => room("#1c1008", "#050302") + HENRY(480, 360, 1.7, "sad") + STATUE(820, 560, 1.1, true) + CANDLE(1090, 450, 1),
    12: () => room("#141812", "#040604") + HENRY(260, 380, 1.5, "shock") + CORPSE(860, 360, 1.65),
    13: () => room("#141812", "#040604") + HENRY(330, 360, 1.8, "shock") + CORPSE(900, 370, 1.7),
    14: () => room("#20140c", "#050302") + KEEPER(520, 380, 1.6) + CANDLE(1060, 440, 1.1) + `<path d="M680 520 L980 420" stroke="#b8a98a" stroke-width="34" stroke-linecap="round"/>`,
    15: () => room("#0c1424", "#020306") + `<circle cx="900" cy="140" r="90" fill="#e8eef8"/><path d="M0 640 Q300 560 600 620 T1200 600 V760 H0Z" fill="#06080a"/><path d="M780 640 V420 Q860 340 940 420 V640Z" fill="#14181c"/><text x="380" y="380" font-family="Creepster,Impact,sans-serif" font-size="200" fill="#d0161e" text-anchor="middle">THE END</text>`
  };

  function svgFor(n) {
    const body = (SCENES[n] || SCENES[1])();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">${DEFS}${body}
      <rect x="18" y="${PH - 64}" width="250" height="46" fill="#ffd400"/>
      <text x="32" y="${PH - 30}" font-family="Arial Black,Arial,sans-serif" font-size="28" fill="#000">PLACEHOLDER ${String(n).padStart(2, "0")}</text></svg>`;
  }

  async function make(panels) {
    const out = [];
    for (const p of panels) {
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFor(p.n));
      const img = await WishStoryboard.loadImage(url);
      const c = document.createElement("canvas");
      c.width = PW; c.height = PH;
      c.getContext("2d").drawImage(img, 0, 0);
      out.push(c);
    }
    return out;
  }

  window.WishPlaceholders = { make, svgFor };
})();
