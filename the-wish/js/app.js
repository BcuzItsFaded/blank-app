/* Player wiring: project loading, transport, UI, TTS, in-browser export, OBS record mode. */
(async function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  // Inside an OBS Browser Source (window.obsstudio) record mode + 3 s autoplay are automatic.
  const OBS = !!window.obsstudio;
  const RECORD = params.has("record") || OBS;
  if (OBS && !params.has("autoplay")) params.set("autoplay", "3");

  // ---------- project ----------
  const merge = (a, b) => {
    if (Array.isArray(a) || Array.isArray(b) || typeof a !== "object" || typeof b !== "object" || !a || !b) return b === undefined ? a : b;
    const o = { ...a };
    for (const k of Object.keys(b)) o[k] = merge(a[k], b[k]);
    return o;
  };
  const DEFAULT = JSON.parse(JSON.stringify(window.WISH_DEFAULT_PROJECT));
  const project = merge(DEFAULT, window.WISH_PROJECT || {});
  const S = project.settings;

  const canvas = $("stage");
  const renderer = new WishRenderer(canvas);
  const audio = new WishAudio();
  let board = null, boardSrc = null, voiceData = null, sources = [];
  let t = 0, playing = false, lastUi = 0, sections = [];

  // ---------- fonts (canvas text needs them loaded first) ----------
  await Promise.race([
    Promise.all(["104px Anton", "190px Creepster", "40px 'Special Elite'"].map(f => document.fonts.load(f).catch(() => {}))),
    new Promise(r => setTimeout(r, 2500))
  ]);

  // ---------- storyboard ----------
  const status = (id, msg) => { $(id).textContent = msg; };
  const editor = new WishStoryboard.CropEditor($("cropCanvas"), i => { recrop(i); });

  async function loadBoard() {
    if (project.storyboard) {
      try { board = await WishStoryboard.loadImage(project.storyboard); boardSrc = project.storyboard; } catch (e) { board = null; }
    }
    if (!board) {
      const f = await WishStoryboard.findAsset("storyboard", ["png", "jpg", "jpeg", "webp"]);
      if (f) { board = f.img; boardSrc = f.src; }
    }
    await cropAll();
  }

  async function cropAll() {
    if (board) {
      sources = project.panels.map(p => WishStoryboard.cropPanel(board, p.rect, project.inset));
      status("boardStatus", `Storyboard ${board.naturalWidth}×${board.naturalHeight} loaded · ${sources.length} panels cropped.`);
    } else {
      sources = await WishPlaceholders.make(project.panels);
      status("boardStatus", "No storyboard yet: showing SVG placeholder panels. Upload the image or save it as the-wish/assets/storyboard.png.");
    }
    editor.set(board, project.panels);
    applyPanels();
  }

  function recrop(i) {
    if (!board) return;
    sources[i] = WishStoryboard.cropPanel(board, project.panels[i].rect, project.inset);
    applyPanels();
  }

  function applyPanels() {
    rebuild();
    renderer.setPanels(sources, renderer.meta);
    drawPanelList();
    drawScrub();
  }

  // ---------- timeline ----------
  function rebuild() {
    project.panels.sort((a, b) => a.start - b.start);
    project.duration = Math.max(...project.panels.map(p => p.end));
    renderer.meta = project.panels.map((p, i) => ({
      ...p,
      fxSet: new Set(p.fx || []),
      transitionType: p.transition || (i % 2 ? "zoom" : "fade")
    }));
    sections = WishParser.parse(project.script, project.duration);
    // Real narration timing (from prepare_voice.py): [[speechStart, speechEnd], …] per section.
    (project.speech || []).forEach((sp, i) => {
      const s = sections[i];
      if (s && sp) s.words = WishParser.timeWords(s.text, sp[0] - 0.08, sp[1] + 0.25);
    });
    // Exact per-word times (from fit_narration.py's Whisper alignment) win when they line up.
    (project.wordTimes || []).forEach((wt, i) => {
      const s = sections[i];
      if (s && wt && wt.length === s.words.length) s.words.forEach((w, j) => { w.start = wt[j][0]; w.end = wt[j][1]; });
    });
    renderer.sections = sections;
    renderer.chunks = sections.flatMap(s => WishParser.chunk(s.words));
    renderer.settings = S;
    renderer.project = project;
    audio.useGenerative = S.generativeMusic && !audio.musicEl;
    audio.build(project);
    drawSections();
  }

  // ---------- transport ----------
  async function play() {
    if (t >= project.duration - 0.05) t = 0;
    audio.useGenerative = S.generativeMusic && !audio.musicEl;
    audio.build(project);
    await audio.play(t, project.voiceOffset || 0);
    audio.setLevels(S);
    playing = true; spoken = -1;
    $("startOverlay").hidden = true;
    setPlayIcon();
  }
  function pause() {
    audio.stop(); playing = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
    setPlayIcon();
  }
  function seek(nt) {
    t = Math.max(0, Math.min(project.duration, nt));
    if (playing) { if (window.speechSynthesis) speechSynthesis.cancel(); play(); }
  }
  const toggle = () => (playing ? pause() : play());
  function setPlayIcon() { $("playBtn").innerHTML = `<svg width="22" height="22"><use href="#i-${playing ? "pause" : "play"}"/></svg>`; }

  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

  // ---------- free browser TTS narrator ----------
  let spoken = -1;
  function pickVoice() {
    const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    return vs.find(v => /daniel|george|arthur|male|david|guy|ryan/i.test(v.name)) || vs[0] || null;
  }
  function tts() {
    if (!S.tts || !window.speechSynthesis || !playing) return;
    const i = sections.findIndex(s => t >= s.start && t < s.end);
    if (i < 0 || i === spoken || t - sections[i].start > 0.6) return;
    spoken = i;
    const s = sections[i], words = s.text.split(/\s+/).length;
    const u = new SpeechSynthesisUtterance(s.text);
    u.voice = pickVoice(); u.pitch = 0.55;
    u.rate = Math.max(0.8, Math.min(1.6, words / Math.max(1, s.end - s.start - 0.4) / 2.6));
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // ---------- render loop ----------
  let exportDone = null;
  function loop(now) {
    if (playing) {
      t = audio.time();
      if (t >= project.duration + 0.4) {
        if (params.has("loop") && !exportDone) { t = 0; play(); }
        else { pause(); t = project.duration; if (exportDone) exportDone(); }
      }
      tts();
    }
    renderer.frame(Math.max(0, Math.min(t, project.duration - 0.001)));
    if (!RECORD && now - lastUi > 50) {
      lastUi = now;
      $("clock").textContent = `${fmt(Math.min(t, project.duration))} / ${fmt(project.duration)}`;
      $("playhead").style.left = (100 * Math.min(t, project.duration)) / project.duration + "%";
      const live = renderer.meta.findIndex(p => t >= p.start && t < p.end);
      document.querySelectorAll(".pcard").forEach((el, i) => el.classList.toggle("live", i === live));
    }
    requestAnimationFrame(loop);
  }

  // ---------- UI: scrubber ----------
  function drawScrub() {
    const D = project.duration;
    $("scrubPanels").innerHTML = renderer.meta.map((p, i) =>
      `<div class="pan" style="left:${(100 * p.start) / D}%;width:${(100 * (p.end - p.start)) / D}%;background-image:url(${thumb(i)})">${p.n}</div>`).join("");
  }
  function drawSections() {
    const D = project.duration;
    $("scrubSections").innerHTML = sections.map(s =>
      `<div class="sec" style="left:${(100 * s.start) / D}%;width:${(100 * (s.end - s.start)) / D}%">${esc(s.heading || "")}</div>`).join("");
    $("sectionList").innerHTML = sections.map((s, i) =>
      `<div class="sec-card" data-t="${s.start}"><b>${fmt(s.start)}–${fmt(s.end)} ${esc(s.heading || "")}</b><br>${esc(s.text)}<br><i>${s.words.length} words · ${(s.words.length / (s.end - s.start)).toFixed(1)} w/s</i></div>`).join("");
    document.querySelectorAll(".sec-card").forEach(el => el.onclick = () => seek(+el.dataset.t));
  }
  const thumbs = new Map();
  function thumb(i) {
    const src = sources[i]; if (!src) return "";
    const key = i + ":" + src.width + ":" + project.panels[i].rect.join(",");
    if (!thumbs.has(key)) {
      const c = document.createElement("canvas"); c.width = 192; c.height = 124;
      const g = c.getContext("2d"), k = Math.max(192 / src.width, 124 / src.height);
      g.drawImage(src, (192 - src.width * k) / 2, (124 - src.height * k) / 2, src.width * k, src.height * k);
      try { thumbs.set(key, c.toDataURL("image/jpeg", 0.7)); } catch (e) { thumbs.set(key, ""); } // file:// taint
    }
    return thumbs.get(key);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const scrub = $("scrub");
  const scrubTo = e => { const r = scrub.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * project.duration); };
  scrub.addEventListener("pointerdown", e => { scrub.setPointerCapture(e.pointerId); scrubTo(e); scrub.onpointermove = scrubTo; });
  scrub.addEventListener("pointerup", () => { scrub.onpointermove = null; });

  // ---------- UI: panel list ----------
  const CAMS = ["push", "push-slow", "pull", "pan-left", "pan-right", "drift"];
  const TRS = ["fade", "zoom", "dip", "flash", "glitch", "cut"];
  function drawPanelList() {
    $("panelList").innerHTML = renderer.meta.map((p, i) => {
      const cam = typeof p.camera === "string" ? p.camera : "custom";
      return `<div class="pcard" data-i="${i}"><img src="${thumb(i)}" alt="">
        <div class="meta"><b>${p.n}. ${esc(p.title || "")}</b>
          <input class="t" data-k="start" type="number" step="0.1" value="${p.start}">–<input class="t" data-k="end" type="number" step="0.1" value="${p.end}">
          <select data-k="camera">${(cam === "custom" ? ["custom"] : []).concat(CAMS).map(c => `<option ${c === cam ? "selected" : ""}>${c}</option>`).join("")}</select>
          <select data-k="transition">${TRS.map(c => `<option ${c === p.transitionType ? "selected" : ""}>${c}</option>`).join("")}</select>
          <input class="fx" data-k="fx" value="${esc((p.fx || []).join(", "))}" title="Effects">
        </div></div>`;
    }).join("");
    document.querySelectorAll(".pcard").forEach(card => {
      const i = +card.dataset.i, p = project.panels[i];
      card.querySelector("img").onclick = () => seek(p.start + 0.01);
      card.querySelectorAll("[data-k]").forEach(inp => inp.onchange = () => {
        const k = inp.dataset.k;
        if (k === "start" || k === "end") p[k] = parseFloat(inp.value) || 0;
        else if (k === "fx") p.fx = inp.value.split(/[,\s]+/).filter(Boolean);
        else if (k === "camera") { if (inp.value !== "custom") p.camera = inp.value; }
        else p[k] = inp.value;
        applyPanels();
      });
    });
  }

  // ---------- UI: tabs, settings ----------
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll("#tabs button, section[data-pane]").forEach(x => x.classList.remove("on"));
    b.classList.add("on"); document.querySelector(`section[data-pane=${b.dataset.tab}]`).classList.add("on");
    if (b.dataset.tab === "board") editor.set(board, project.panels);
  });
  for (const k of Object.keys(S)) {
    const el = $(k); if (!el) continue;
    if (el.type === "checkbox") { el.checked = !!S[k]; el.onchange = () => { S[k] = el.checked; if (k === "generativeMusic") rebuild(); if (k === "tts" && !el.checked) speechSynthesis.cancel(); }; }
    else { el.value = S[k]; el.oninput = () => { S[k] = parseFloat(el.value); audio.setLevels(S); }; }
  }
  $("inset").value = project.inset;
  $("inset").onchange = () => { project.inset = parseFloat($("inset").value); cropAll(); };
  $("resetCrops").onclick = () => { project.panels.forEach(p => { const d = DEFAULT.panels.find(x => x.n === p.n); if (d) p.rect = [...d.rect]; }); cropAll(); };
  $("scriptText").value = project.script;
  let scriptTimer;
  $("scriptText").oninput = () => { clearTimeout(scriptTimer); scriptTimer = setTimeout(() => { project.script = $("scriptText").value; rebuild(); }, 300); };
  $("voiceOffset").value = project.voiceOffset || 0;
  $("voiceOffset").onchange = () => { project.voiceOffset = parseFloat($("voiceOffset").value) || 0; };

  const readURL = (file, asData) => new Promise(res => {
    if (!asData) return res(URL.createObjectURL(file));
    const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file);
  });
  $("boardFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    boardSrc = await readURL(f, true);
    board = await WishStoryboard.loadImage(boardSrc);
    project.storyboard = null;
    await cropAll();
  };
  $("voiceFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    voiceData = f;
    audio.setVoice(await readURL(f));
    status("voiceStatus", `Voice: ${f.name} · ducking music under narration.`);
  };
  $("musicFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    audio.setMusic(await readURL(f)); rebuild();
  };

  // ---------- transport buttons / keys ----------
  $("playBtn").onclick = toggle;
  $("restartBtn").onclick = () => seek(0);
  $("startOverlay").onclick = () => play();
  $("fullBtn").onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $("stageBox").requestFullscreen());
  $("recModeBtn").onclick = () => document.body.classList.toggle("record");
  window.addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.code === "ArrowRight") seek(t + 1);
    else if (e.code === "ArrowLeft") seek(t - 1);
    else if (e.code === "Home") seek(0);
    else if (e.key === "f") $("fullBtn").click();
    else if (e.key === "r") document.body.classList.toggle("record");
  });

  // ---------- export: in-browser recording ----------
  $("exportBtn").onclick = async () => {
    if (!window.MediaRecorder) return status("exportStatus", "MediaRecorder not supported here: use OBS.");
    audio.init(); await audio.ctx.resume();
    const types = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = types.find(m => MediaRecorder.isTypeSupported(m));
    let stream;
    try { stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audio.rec.stream.getAudioTracks()]); }
    catch (e) { return status("exportStatus", "This browser blocks recording pages opened from file://. Upload the storyboard with the button (or serve the folder over http) and try again."); }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14e6, audioBitsPerSecond: 192e3 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `the-wish-short.${mime.includes("mp4") ? "mp4" : "webm"}`; a.click();
      status("exportStatus", `Done: ${(blob.size / 1e6).toFixed(1)} MB ${a.download}`);
      exportDone = null; $("exportBtn").disabled = false;
    };
    exportDone = () => setTimeout(() => rec.state === "recording" && rec.stop(), 300);
    $("exportBtn").disabled = true;
    status("exportStatus", `Recording (${mime})… keep this tab in front for 60 s.${S.tts ? " Note: browser TTS is not captured; upload a voice file instead." : ""}`);
    if (playing) pause();
    t = 0; rec.start(250); await play();
  };

  $("projectBtn").onclick = async () => {
    const out = JSON.parse(JSON.stringify(project));
    if (board) out.storyboard = boardSrc && boardSrc.startsWith("data:") ? boardSrc : toData(board);
    if (voiceData) out.voice = await readURL(voiceData, true);
    const js = "/* THE WISH: exported project. Save as the-wish/assets/project.js */\nwindow.WISH_PROJECT = " + JSON.stringify(out, null, 1) + ";\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([js], { type: "text/javascript" })); a.download = "project.js"; a.click();
  };
  function toData(img) {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    try { return c.toDataURL("image/png"); } catch (e) { return boardSrc; }
  }

  // ---------- voice asset probe ----------
  async function loadVoice() {
    const tryUrl = url => new Promise(res => {
      const a = new Audio(); const done = ok => { a.onloadedmetadata = a.onerror = null; res(ok); };
      a.onloadedmetadata = () => done(true); a.onerror = () => done(false); a.src = url; setTimeout(() => done(false), 1500);
    });
    if (project.music) audio.setMusic(project.music);
    const list = project.voice ? [project.voice] : ["mp3", "wav", "m4a", "ogg"].map(x => `assets/voice.${x}`);
    for (const url of list) if (await tryUrl(url)) { audio.setVoice(url); status("voiceStatus", `Voice: ${url.slice(0, 40)} · ducking music under narration.`); return; }
  }

  // ---------- boot ----------
  if (RECORD) document.body.classList.add("record");
  await loadBoard();
  await loadVoice();
  rebuild();
  requestAnimationFrame(loop);
  if (window.speechSynthesis) speechSynthesis.getVoices();

  if (params.has("autoplay")) {
    const delay = parseFloat(params.get("autoplay")) || 0;
    setTimeout(async () => {
      await play();
      if (audio.ctx.state !== "running") { pause(); $("startOverlay").hidden = false; }
    }, delay * 1000);
  } else if (RECORD) $("startOverlay").hidden = false;

  window.WishPlayer = { project, renderer, audio, seek, play, pause, get t() { return t; }, set t(v) { t = v; } };
})();
