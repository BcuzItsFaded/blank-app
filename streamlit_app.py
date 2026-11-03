import streamlit as st

st.set_page_config(page_title="My new app", page_icon="🌊", layout="centered")

# --- Palette: a handful of flat, unblended inks ------------------------------
WASHI = "#EFE4CC"      # paper
SUMI = "#1C1A17"       # key-block black
AI = "#1F3A5F"         # indigo
AI_LIGHT = "#5B7FA6"   # pale indigo (second pass of the same block)
SHU = "#B83A2B"        # vermilion
FOAM = "#F6EEDC"       # unprinted paper used as wave foam

# Paper grain: fractal noise + long horizontal fibres, multiplied over the page.
GRAIN_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>"
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/>"
    "<feColorMatrix values='0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .55 0'/></filter>"
    "<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.004 .25' numOctaves='2' stitchTiles='stitch'/>"
    "<feColorMatrix values='0 0 0 0 .45  0 0 0 0 .36  0 0 0 0 .22  0 0 0 .35 0'/></filter>"
    "<rect width='100%' height='100%' filter='url(#n)'/>"
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>"
)

# Seigaiha (blue-ocean-wave) tile: nested arcs, two inks.
SEIGAIHA_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'>"
    "<g fill='none' stroke-width='1.6'>"
    + "".join(
        f"<g transform='translate({x},{y})'>"
        f"<circle r='19' fill='{AI}' stroke='{FOAM}'/>"
        f"<circle r='13.5' stroke='{FOAM}'/><circle r='8' stroke='{FOAM}'/>"
        f"<circle r='3' fill='{FOAM}' stroke='none'/></g>"
        for x, y in [(0, 0), (40, 0), (20, 10), (0, 20), (40, 20), (20, 30)]
    )
    + "</g></svg>"
)


def flat(html: str) -> str:
    """Strip indentation and blank lines so Markdown passes the HTML through untouched."""
    return "\n".join(line.strip() for line in html.splitlines() if line.strip())


def data_uri(svg: str) -> str:
    return "url(\"data:image/svg+xml;utf8," + svg.replace("#", "%23").replace('"', "'") + "\")"


st.markdown(
    flat(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;800&display=swap');

.stApp {{
  background-color: {WASHI};
  background-image: {data_uri(GRAIN_SVG)};
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
}}
/* faint uneven ink absorption across the sheet */
.stApp::before {{
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(120,90,40,.10), transparent 55%),
    radial-gradient(ellipse at 90% 85%, rgba(120,90,40,.12), transparent 50%);
}}
/* seigaiha border along the foot of the page */
.stApp::after {{
  content: ""; position: fixed; left: 0; right: 0; bottom: 0; height: 56px;
  pointer-events: none; z-index: 0;
  background-image: {data_uri(SEIGAIHA_SVG)};
  background-size: 40px 20px;
  border-top: 3px solid {SUMI};
  opacity: .95;
}}
header[data-testid="stHeader"] {{ background: transparent; }}
.block-container {{ position: relative; z-index: 1; padding-bottom: 110px; }}

h1, h2, h3, p, li {{ font-family: inherit !important; color: {SUMI}; }}

/* The print itself: a framed block with a key-line border */
.print-frame {{
  border: 3px solid {SUMI};
  outline: 1px solid {SUMI}; outline-offset: 5px;
  margin: 8px 6px 28px; position: relative; line-height: 0;
  box-shadow: 0 0 0 10px {WASHI};
}}
.print-frame svg {{ width: 100%; height: auto; display: block; }}

/* Cartouche: the tall title slip printed in the corner of ukiyo-e */
.cartouche {{
  position: absolute; top: 14px; right: 14px; line-height: 1.2;
  background: {FOAM}; border: 2px solid {SUMI};
  padding: 10px 6px; writing-mode: vertical-rl;
  font-weight: 800; font-size: 1.05rem; letter-spacing: .18em; color: {SUMI};
  box-shadow: inset 0 0 0 3px {FOAM}, inset 0 0 0 4px {SUMI};
}}

/* Vermilion hanko seal */
.hanko {{
  display: inline-grid; place-items: center; width: 54px; height: 54px;
  background: {SHU}; color: {FOAM}; border-radius: 6px;
  font-weight: 800; font-size: .95rem; line-height: 1.05; text-align: center;
  transform: rotate(-4deg); box-shadow: inset 0 0 0 3px {SHU}, inset 0 0 0 5px {FOAM};
  vertical-align: middle; margin-left: 14px;
}}
.title-row {{ display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 4px; }}
.title-row h1 {{ margin: 0; padding: 0; font-weight: 800; letter-spacing: .04em; }}
.lede {{ text-align: center; font-size: 1.08rem; max-width: 34rem; margin: 10px auto 0; }}
.lede a {{ color: {AI}; text-decoration: none; border-bottom: 2px solid {SHU}; }}

@media (max-width: 640px) {{
  .cartouche {{ font-size: .85rem; top: 8px; right: 8px; padding: 8px 4px; }}
  .hanko {{ width: 44px; height: 44px; font-size: .8rem; }}
}}
</style>
"""),
    unsafe_allow_html=True,
)


def wave_crest(x: float, y: float, s: float) -> str:
    """One curling crest: an indigo body, a pale inner band and foam claws."""
    return f"""
<g transform="translate({x},{y}) scale({s})">
  <path d="M-120 60 C -80 -10, 10 -70, 80 -40 C 115 -25, 120 15, 92 25
           C 75 32, 60 18, 70 6 C 40 -10, 0 10, -20 60 Z" fill="{AI}" stroke="{SUMI}" stroke-width="3"/>
  <path d="M-80 52 C -50 0, 10 -42, 60 -30 C 30 -18, -5 10, -30 55 Z" fill="{AI_LIGHT}"/>
  <path d="M80 -40 C 115 -25, 120 15, 92 25 C 75 32, 60 18, 70 6
           C 82 8, 95 -2, 88 -16 Z" fill="{FOAM}" stroke="{SUMI}" stroke-width="2.5"/>
  <g fill="{FOAM}" stroke="{SUMI}" stroke-width="2">
    <path d="M58 -36 q 8 -14 18 -6 q -6 2 -6 8 z"/>
    <path d="M40 -42 q 6 -14 16 -8 q -6 3 -5 9 z"/>
    <path d="M22 -42 q 4 -13 14 -9 q -5 3 -4 9 z"/>
  </g>
</g>"""


def wave_band(y: float, color: str, amp: float, period: float, phase: float) -> str:
    """A rolling band of water, filled flat, with a single foam line along its top."""
    x = -period + phase
    d = f"M{x:.0f} {y}"
    while x < 900:
        d += f" q {period/4:.0f} {-amp} {period/2:.0f} 0 t {period/2:.0f} 0"
        x += period
    path = d + " L 900 520 L -200 520 Z"
    return (
        f'<path d="{path}" fill="{color}" stroke="{SUMI}" stroke-width="3"/>'
        f'<path d="{d}" fill="none" stroke="{FOAM}" stroke-width="2" '
        f'stroke-dasharray="2 9" stroke-linecap="round" transform="translate(0,9)"/>'
    )


scene = f"""
<svg viewBox="0 0 800 460" xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Woodblock-style seascape: indigo waves, a red sun and distant island">
  <defs>
    <pattern id="seigaiha" width="40" height="20" patternUnits="userSpaceOnUse">
      {SEIGAIHA_SVG.split('viewBox=\'0 0 40 20\'>')[1].replace('</svg>', '')}
    </pattern>
    <!-- slightly ragged edges, as if inked with a hand-cut block -->
    <filter id="rough"><feTurbulence baseFrequency=".04" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="3"/></filter>
    <!-- bokashi: the one graded wipe a printer allows, across the sky -->
    <linearGradient id="bokashi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{AI}" stop-opacity=".85"/>
      <stop offset=".45" stop-color="{AI}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="800" height="460" fill="#E9D9B6"/>
  <rect width="800" height="460" fill="url(#bokashi)"/>

  <g filter="url(#rough)">
    <!-- sun -->
    <circle cx="200" cy="130" r="58" fill="{SHU}" stroke="{SUMI}" stroke-width="3"/>
    <!-- distant island -->
    <path d="M430 300 L 520 210 Q 535 198 550 210 L 640 300 Z" fill="{AI_LIGHT}" stroke="{SUMI}" stroke-width="3"/>
    <path d="M498 232 L 520 210 Q 535 198 550 210 L 572 232 Q 556 240 546 228 Q 535 242 522 228 Q 512 240 498 232 Z"
          fill="{FOAM}" stroke="{SUMI}" stroke-width="2"/>
    <!-- cranes -->
    <g fill="none" stroke="{SUMI}" stroke-width="3" stroke-linecap="round">
      <path d="M330 110 q 14 -12 26 0 q 12 -12 26 0"/>
      <path d="M380 80 q 10 -9 20 0 q 9 -9 20 0"/>
      <path d="M300 70 q 8 -7 16 0 q 7 -7 16 0"/>
    </g>

    {wave_band(300, AI_LIGHT, 22, 160, 40)}
    {wave_band(345, AI, 28, 200, 0)}
    <rect x="0" y="380" width="800" height="80" fill="url(#seigaiha)"/>
    <path d="M0 380 H 800" stroke="{SUMI}" stroke-width="3"/>

    {wave_crest(150, 330, 1.25)}
    {wave_crest(640, 345, 0.9)}
  </g>
</svg>
"""

st.markdown(
    flat(f"""
<div class="print-frame">
  {scene}
  <div class="cartouche">新しいアプリ</div>
</div>
<div class="title-row"><h1>My new app</h1><span class="hanko">新<br>作</span></div>
<p class="lede">Let's start building! For help and inspiration, head over to
<a href="https://docs.streamlit.io/" target="_blank">docs.streamlit.io</a>.</p>
"""),
    unsafe_allow_html=True,
)
