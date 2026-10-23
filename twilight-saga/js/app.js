/* Player boot: loads plates/sprites, builds the timeline + soundtrack, preview transport, render API. */
(async function () {
  const $ = id => document.getElementById(id);
  const canvas = $("stage");
  const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  await Promise.race([
    Promise.all(["800 60px 'Baloo 2'", "700 44px 'Patrick Hand'", "400 40px 'Patrick Hand'"].map(f => document.fonts.load(f).catch(() => {}))),
    new Promise(r => setTimeout(r, 4000)),
  ]);

  const images = {}, sprites = {};
  const plateIds = [...new Set(Object.values(window.SCENES).map(s => s.plate))];
  await Promise.all(plateIds.map(async id => { images[id] = await load(`assets/plates/scene${String(id).padStart(2, "0")}.jpg`); }));
  const names = new Set();
  Object.values(window.PLATES).forEach(m => { Object.keys(m.sprites).forEach(n => names.add(n)); Object.keys(m.occluders).forEach(n => names.add(n)); });
  await Promise.all([...names].map(async n => { sprites[n] = await load(`assets/sprites/${n}.png`); }));

  const engine = new Engine(canvas, { timing: window.TIMING, plates: window.PLATES, images, sprites });

  // ---- soundtrack plan: music mood + effects per scene, effects locked to narration words
  const SOUND = {
    "1": { mood: "sad", fx: ["rain"], sfx: [["forks", "chime", 0.1]] },
    "2": { mood: "eerie", fx: [], sfx: [["edward", "sting", 0.1, 0.12], ["terrifying", "lowboom", 0]] },
    "3": { mood: "intense", fx: ["rain"], sfx: [["van", "skid", -0.3], ["suddenly", "zoom", -0.1], ["stops", "crash", 0]] },
    "4": { mood: "eerie", fx: [], sfx: [["vampire", "shimmer", 0], ["read", "wish", 0.2], ["except", "boom", 0]] },
    "5": { mood: "intense", fx: ["heartbeat"], sfx: [["hunting", "sting", 0], ["saves", "zoom", -0.2], ["saves", "hit", 0.1]] },
    "6": { mood: "sad", fx: ["rain"], sfx: [["heartbroken", "thunder", 0], ["another", "howl", 0.4, 0.18]] },
    "7": { mood: "romantic", fx: [], sfx: [["dangerous", "lowboom", 0.1]] },
    "8": { mood: "intense", fx: [], sfx: [["transforms", "rise", -0.2], ["wolf", "boom", -0.1], ["wolf", "howl", 0.6, 0.5]] },
    "9": { mood: "sad", fx: [], sfx: [["died", "wish", -0.4], ["volturi", "lowboom", 0]] },
    "10": { mood: "creepy", fx: [], sfx: [["rushes", "zoom", 0], ["volturi", "sting", 0], ["future", "heartbeat", 0], ["balance", "heartbeat", 0]] },
    "11": { mood: "intense", fx: [], sfx: [["army", "lowboom", 0], ["newborn", "sting", 0], ["together", "howl", 0, 0.35]] },
    "12": { mood: "romantic", fx: [], sfx: [["chooses", "shimmer", 0], ["eternity", "chime", 0]] },
    "13": { mood: "romantic", fx: [], sfx: [["marry", "bells", -0.2], ["happiness", "lowboom", 0.3], ["threatens", "heartbeat", 0]] },
    "14": { mood: "somber", fx: [], sfx: [["nearly", "beep", 0], ["transforms", "boom", 0], ["twist", "sting", 0], ["shield", "shimmer", 0]] },
    "15": { mood: "intense", fx: [], sfx: [["arrive", "lowboom", 0], ["destroy", "sting", 0], ["alice", "zoom", -0.3]] },
    "16": { mood: "shock", fx: [], sfx: [["shield", "shimmer", -0.4], ["mental", "glitch", 0], ["biggest", "boom", 0], ["retreat", "wish", 0.3]] },
    "17": { mood: "romantic", fx: [], sfx: [["clue", "chime", 0], ["lets", "shimmer", 0]] },
    "18": { mood: "happy", fx: [], sfx: [["subscribe", "chime", 0.7]] },
  };
  const cueAbs = (sec, word) => {
    const w = word.toLowerCase();
    for (const [x, s] of sec.words) if (x.toLowerCase().replace(/[^a-z']/g, "").startsWith(w)) return s;
    return sec.start + 1;
  };
  const panels = window.TIMING.sections.map((sec, i) => {
    const snd = SOUND[sec.id] || { mood: "eerie", fx: [], sfx: [] };
    return {
      n: i + 1, start: sec.start, end: sec.end, mood: snd.mood, fx: snd.fx, transition: "fade",
      sfx: snd.sfx.map(([w, kind, off, lvl]) => ({ t: cueAbs(sec, w) + off, kind, lvl })),
    };
  });
  const project = {
    duration: window.TIMING.duration, panels, voice: "assets/voice.wav", voiceOffset: 0,
    settings: { generativeMusic: true, musicVol: 0.5, sfxVol: 0.75, voiceVol: 1.0, duck: 0.42 },
  };
  const audio = new WishAudio();
  audio.useGenerative = true;
  audio.setVoice(project.voice);
  audio.build(project);

  // ---- transport
  let t = 0, playing = false;
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  async function play() { if (t >= project.duration - 0.1) t = 0; audio.build(project); await audio.play(t, 0); audio.setLevels(project.settings); playing = true; ui(); }
  function pause() { audio.stop(); playing = false; ui(); }
  function ui() { const b = $("play"); if (b) b.textContent = playing ? "❚❚ Pause" : "▶ Play"; }
  function loop() {
    if (playing) { t = audio.time(); if (t >= project.duration) { pause(); t = project.duration; } }
    engine.frame(Math.min(t, project.duration - 0.001));
    if ($("clock")) $("clock").textContent = `${fmt(Math.min(t, project.duration))} / ${fmt(project.duration)}`;
    if ($("scrub") && !$("scrub").matches(":active")) $("scrub").value = (t / project.duration) * 1000;
    requestAnimationFrame(loop);
  }
  if ($("play")) $("play").onclick = () => (playing ? pause() : play());
  if ($("scrub")) $("scrub").oninput = e => { t = (e.target.value / 1000) * project.duration; if (playing) play(); };
  window.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); playing ? pause() : play(); } });
  requestAnimationFrame(loop);

  window.WishPlayer = { project, audio, engine, renderer: { frame: x => engine.frame(x) }, play, pause, get t() { return t; }, set t(v) { t = v; } };
  $("boardStatus").textContent = "Storyboard loaded";
})();
