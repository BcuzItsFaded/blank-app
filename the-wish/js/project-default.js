/*
 * THE WISH: default project.
 *
 * Two tracks drive the Short:
 *   panels  → the visual track, using the timestamps printed on the 15-panel storyboard
 *   script  → the narration/subtitle track, using the timestamps in the narration script
 *
 * Panel rects are normalized [x, y, w, h] (0..1) crop boxes on the combined storyboard image,
 * measured for the 4-4-4-3 layout of "THE WISH" storyboard (art area only: number/title bar and
 * NARRATOR/CAMERA/FX caption are excluded). Fine-tune them in the Storyboard tab if needed.
 *
 * camera: preset name (push | push-slow | pull | pan-left | pan-right | drift | snap)
 *         or { z: [from, to], f: [[x, y], [x, y]] } with focus points in panel coordinates.
 * fx:     visual + sound cues, see README for the full list.
 * light:  candle/glow source position in panel coordinates.
 * mood:   music mood for the generative score.
 */
window.WISH_DEFAULT_PROJECT = {
  version: 2,
  title: "THE WISH",
  tagline: "BE CAREFUL WHAT YOU WISH FOR",
  channel: "DON'T SPOIL IT RG",
  duration: 60,
  storyboard: null, // data URL / path; otherwise assets/storyboard.{png,jpg,jpeg,webp} is tried
  inset: 0.6, // extra % trimmed inside every crop box

  panels: [
    { n: 1, start: 0, end: 3, title: "Crypt Keeper Intro", rect: [0.006, 0.1615, 0.240, 0.1000],
      camera: { z: [1.0, 1.16], f: [[0.5, 0.45], [0.55, 0.42]] }, light: [0.07, 0.5],
      fx: ["candle", "fog", "title", "laugh"], mood: "creepy" },
    { n: 2, start: 3, end: 7, title: "The Frustrated Man", rect: [0.260, 0.1615, 0.238, 0.1000],
      camera: "drift", fx: ["rain", "shadow"], mood: "sad" },
    { n: 3, start: 7, end: 11, title: "The Mysterious Statue", rect: [0.510, 0.1615, 0.236, 0.1000],
      camera: { z: [1.0, 1.22], f: [[0.5, 0.5], [0.72, 0.6]] }, light: [0.72, 0.4],
      fx: ["dust", "chime", "shop"], mood: "eerie" },
    { n: 4, start: 11, end: 15, title: "The Warning", rect: [0.761, 0.1615, 0.233, 0.1000],
      camera: "push-slow", fx: ["shadow", "lowboom", "dust"], mood: "eerie" },
    { n: 5, start: 15, end: 19, title: "The First Wish", rect: [0.006, 0.3870, 0.240, 0.1000],
      camera: { z: [1.05, 1.22], f: [[0.45, 0.5], [0.55, 0.42]] }, light: [0.2, 0.62],
      fx: ["gold", "wish"], mood: "eerie" },
    { n: 6, start: 19, end: 23, title: "The Million Dollars", rect: [0.260, 0.3870, 0.238, 0.1000],
      camera: "pull", fx: ["money", "gold", "coins"], mood: "happy" },
    { n: 7, start: 23, end: 27, title: "The Price", rect: [0.510, 0.3870, 0.236, 0.1000],
      camera: { z: [1.05, 1.25], f: [[0.4, 0.5], [0.62, 0.42]] },
      fx: ["tv", "news", "sting"], mood: "somber", transition: "glitch" },
    { n: 8, start: 27, end: 31, title: "The Second Wish", rect: [0.761, 0.3870, 0.233, 0.1000],
      camera: "drift", fx: ["warm", "bokeh", "wish"], mood: "romantic" },
    { n: 9, start: 31, end: 35, title: "Love Comes True", rect: [0.006, 0.6080, 0.240, 0.0900],
      camera: "pan-left", fx: ["warm", "bokeh"], mood: "romantic" },
    { n: 10, start: 35, end: 39, title: "Another Price", rect: [0.260, 0.6080, 0.238, 0.0900],
      camera: "push-slow", fx: ["cold", "beep", "flatline"], mood: "sad", transition: "dip" },
    { n: 11, start: 39, end: 43, title: "The Final Wish", rect: [0.510, 0.6080, 0.236, 0.0900],
      camera: { z: [1.0, 1.2], f: [[0.4, 0.45], [0.38, 0.4]] }, light: [0.93, 0.42],
      fx: ["candle", "darkglow", "heartbeat", "shadow"], mood: "intense" },
    { n: 12, start: 43, end: 47, title: "The Twist", rect: [0.761, 0.6080, 0.233, 0.0900],
      camera: { z: [1.0, 1.28], f: [[0.5, 0.5], [0.78, 0.45]] }, revealAt: 0.22,
      fx: ["undead", "fog", "sting"], mood: "shock", transition: "flash" },
    { n: 13, start: 47, end: 56, title: "The Realization", rect: [0.006, 0.8150, 0.318, 0.0910],
      camera: { z: [1.08, 1.3], f: [[0.3, 0.5], [0.72, 0.45]] },
      fx: ["fog", "shadow", "scream", "shake", "darkglow", "undead-grade"], mood: "intense" },
    { n: 14, start: 56, end: 59, title: "Crypt Keeper Outro", rect: [0.336, 0.8150, 0.300, 0.0910],
      camera: "push", light: [0.9, 0.62], fx: ["candle", "fog", "laugh"], mood: "creepy", transition: "dip" },
    { n: 15, start: 59, end: 60, title: "The End", rect: [0.648, 0.8080, 0.346, 0.1880],
      camera: "pull", fill: 0.36, fx: ["lightning", "thunder", "fog", "end"], mood: "end", transition: "flash" }
  ],

  script: `**0:00–0:07 — The Hook**

Tonight's twisted tale is about Henry, a broke man who discovers that wishes really do come true. Unfortunately, so do nightmares.

**0:07–0:15 — The Statue**

Inside an antique shop, Henry finds a strange statue promising three wishes. But the warning says every wish comes with a price.

**0:15–0:27 — The First Wish**

Henry wishes for a million dollars. The next morning, he's rich! But the money came from an inheritance after his boss died in a terrible accident.

**0:27–0:39 — The Second Wish**

His second wish? True love. He meets the perfect woman. But their happiness ends when she suddenly becomes fatally ill.

**0:39–0:47 — The Final Wish**

Desperate, Henry begs the statue to bring her back to life. And it grants his wish.

**0:47–0:56 — The Twist**

She returns as a walking corpse! Henry finally understands. The statue gives him exactly what he asks for, never what he actually wants.

**0:56–1:00 — The Ending**

Be careful what you wish for, kiddies. Some dreams are better left buried!`,

  voice: null, // URL/data URL of a recorded narration; assets/voice.{mp3,wav,m4a,ogg} is tried
  voiceOffset: 0,
  music: null, // URL of a music bed; replaces the generative score when set

  settings: {
    generativeMusic: true,
    tts: false,
    musicVol: 0.75,
    sfxVol: 0.9,
    voiceVol: 1,
    subtitles: true,
    subtitleY: 0.70,
    captions: true, // comic caption box with the script section heading
    titleCard: true,
    watermark: true,
    fill: 0.42, // fraction of frame height the panel band fills (panel always fills width); per-panel `fill` overrides
    fog: 1,
    grain: 1,
    halftone: 0.5,
    depth: true,
    shake: 1
  }
};
