#!/usr/bin/env python3
"""Build a narrated, animated video from a storyboard JSON using only free tools (ffmpeg + free TTS).

Usage: build_video.py storyboard.json --out final.mp4

storyboard.json:
{
  "size": [1080, 1920],            # optional, default vertical 9:16
  "fps": 30,                       # optional
  "voice": "en-US-AndrewNeural",   # optional edge-tts voice; falls back to gTTS
  "captions": true,                # optional, burn narration as on-screen captions
  "music": "music.mp3",            # optional background track (e.g. Pixabay Music), mixed quietly
  "scenes": [
    {"media": "scene1.jpg", "narration": "Every morning, Max waits by the door.", "motion": "zoom_in"},
    {"media": "scene2.mp4", "narration": "But today, nobody came.", "duration": 5}
  ]
}
motion (photos only): zoom_in, zoom_out, pan_left, pan_right, pan_up, pan_down, still.
fit (photos, top-level or per scene): "cover" (default) crops to fill the frame;
"contain" shows the whole image over a blurred fill — use it when cropping would cut off text or subjects;
it also shrinks the image so zooms and pans never crop it.
zoom (top-level or per scene): how far photos zoom/pan, default 0.12 (12%).
music_volume: background music level under the voice, default 0.12.
caption_size: "normal" (whole line in a box) or "large" (big Shorts-style words, a few at a time).
voice_speed: narration speed multiplier, e.g. 1.15 to tighten a long script (keep it at or below 1.25).
caption_y (top-level or per scene): vertical center of captions as a fraction of height (default 0.75).
Per scene: media "black" or "#rrggbb" for a solid frame (e.g. a cut to black); "fade_in"/"fade_out": false
for hard cuts; "sfx": [{"file": "snap.wav", "at": 5.2, "volume": 1.0}] (at = seconds into the scene).
"pause_before": seconds of silence before a scene's narration starts (captions wait too).
If narration is longer than a scene's duration, it is sped up slightly (max 1.15x), then the scene is extended.
duration: optional; defaults to narration length + 0.5 s (or 4 s with no narration).
"keys" (photos): a keyframed camera path instead of "motion", e.g.
  [{"t": 0, "x": 0.3, "y": 0.4, "zoom": 2.5}, {"t": 1, "x": 0.5, "y": 0.5, "zoom": 1}]
  t = fraction of the scene, x/y = viewport center as a fraction of the image, zoom 1 = the largest
  frame-shaped view that fits the image (2 = twice as close). Moves ease in and out between keys.
  Optional "cool" (0-1) on keys shifts the colour temperature toward cold blue.
"tag": small label in the top-left corner (e.g. "Imagined reconstruction").
"text": big centered title text over the scene (e.g. an end card on "black").
caption_scale: caption font size as a fraction of frame width (default 0.075 for large captions;
  about 0.04 suits horizontal 16:9 videos).
narration_mode: "scene" (default: each scene voiced in one go, natural flow) or "sentences" (each
  sentence voiced separately: exact caption timing but choppier).
Narration audio is cached in .tts_cache next to the storyboard, so rebuilds are fast.
--plan prints each scene's start and length (generating narration only) without rendering video.
Media paths are relative to the storyboard file.
"""
import argparse
import asyncio
import hashlib
import shutil
from concurrent.futures import ThreadPoolExecutor
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont

LARGE_CAPTION = 0.075  # font size as a fraction of frame width
VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
FONTS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Command failed: {' '.join(cmd[:6])}...\n{r.stderr[-2000:]}")
    return r.stdout


def duration_of(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())


EDGE_OK = [True]


def _edge_tts(text, voice, out):
    import ssl

    import aiohttp
    import edge_tts

    async def go():
        # aiohttp ignores HTTPS_PROXY unless told; behind a TLS-inspecting proxy it also needs that CA.
        proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        cafile = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
        if proxy and not cafile and os.path.exists("/root/.ccr/ca-bundle.crt"):
            cafile = "/root/.ccr/ca-bundle.crt"
        kwargs = {"proxy": proxy} if proxy else {}
        if cafile:
            kwargs["connector"] = aiohttp.TCPConnector(ssl=ssl.create_default_context(cafile=cafile))
        await edge_tts.Communicate(text, voice, **kwargs).save(out)

    asyncio.run(go())
    if os.path.getsize(out) == 0:
        raise RuntimeError("empty audio")


def tts(text, voice, out, cache_dir=None):
    """Free narration: edge-tts (natural neural voices), falling back to gTTS (robotic). Cached per engine."""
    def cache_path(engine):
        return os.path.join(cache_dir, hashlib.sha1(f"{engine}|{voice}|{text}".encode()).hexdigest() + ".mp3")

    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        engines = ["edge", "gtts"] if not EDGE_OK[0] else ["edge"]
        for engine in engines:
            if os.path.exists(cache_path(engine)):
                shutil.copy(cache_path(engine), out)
                return
    engine = "edge"
    try:
        if not EDGE_OK[0]:
            raise RuntimeError("edge-tts failed earlier")
        _edge_tts(text, voice, out)
    except Exception as e:
        if EDGE_OK[0]:
            print(f"edge-tts unavailable ({type(e).__name__}: {e}); using gTTS (robotic)", file=sys.stderr)
        EDGE_OK[0] = False
        engine = "gtts"
        from gtts import gTTS
        gTTS(text).save(out)
    if cache_dir:
        shutil.copy(out, cache_path(engine))


def _font(size):
    font_path = next((f for f in FONTS if os.path.exists(f)), None)
    return ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()


def caption_png(text, w, h, out, scale=0.055, y_frac=0.72, box=True):
    size = int(w * scale)
    font = _font(size)
    # Bold glyphs average ~0.6 em wide; keep text within 85% of the frame width.
    lines = textwrap.wrap(text, width=max(8, int(w * 0.85 / (size * 0.6))))
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    line_h = int(size * 1.25)
    block_h = line_h * len(lines)
    y = int(h * y_frac) - block_h // 2
    pad = int(size * 0.4)
    widths = [d.textlength(line, font=font) for line in lines]
    if box:
        box_w = max(widths) + pad * 2
        d.rounded_rectangle([(w - box_w) / 2, y - pad, (w + box_w) / 2, y + block_h + pad], radius=pad, fill=(0, 0, 0, 150))
    for line, lw in zip(lines, widths):
        d.text(((w - lw) / 2, y), line, font=font, fill="white", stroke_width=max(2, size // 12), stroke_fill="black")
        y += line_h
    img.save(out)


def narrate(text, voice, out, cache_dir, work, mode="scene"):
    """Voice a scene's narration and return [(sentence, start, end)] so captions follow the speech.

    mode "scene" (default) voices the whole text in one go, which sounds natural, then finds sentence
    boundaries by snapping estimated positions to the pauses in the audio. Mode "sentences" voices each
    sentence separately: exact timing, but choppier delivery.
    """
    sentences = [x for x in re.split(r"(?<=[.?!])\s+", text.strip()) if x]
    if mode != "sentences":
        mp3 = f"{out}.mp3"
        tts(text, voice, mp3, cache_dir)
        run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-ar", "44100", "-ac", "1", out])
        total = duration_of(out)
        log = subprocess.run(["ffmpeg", "-i", out, "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
        ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
        pauses = [(a + b) / 2 for a, b in zip(starts, ends) if 0.05 < a and b < total - 0.05]
        chars = [len(x) for x in sentences]
        timeline, prev, acc = [], 0.0, 0
        for k, sentence in enumerate(sentences):
            acc += chars[k]
            if k == len(sentences) - 1:
                end = total
            else:
                guess = total * acc / sum(chars)
                near = [p for p in pauses if p > prev + 0.3 and abs(p - guess) < 2.0]
                end = min(near, key=lambda p: abs(p - guess)) if near else guess
            timeline.append((sentence, prev, end))
            prev = end
        return timeline

    gap = os.path.join(work, "gap.wav")
    if not os.path.exists(gap):
        run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.25", gap])
    parts, timeline, t = [], [], 0.0
    for k, sentence in enumerate(sentences):
        mp3, wav = f"{out}.{k}.mp3", f"{out}.{k}.wav"
        tts(sentence, voice, mp3, cache_dir)
        run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-ar", "44100", "-ac", "1", wav])
        d = duration_of(wav)
        timeline.append((sentence, t, t + d))
        parts += [wav, gap]
        t += d + 0.25
    listing = f"{out}.txt"
    with open(listing, "w") as f:
        f.writelines(f"file '{x}'\n" for x in parts[:-1])
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", out])
    return timeline


def ass_time(x):
    return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"


def write_ass(events, w, h, scale, y_frac, out):
    """Big outlined subtitles (libass) — one filter, however many caption chunks there are."""
    size = int(w * scale)
    margin = max(0, int(h * (1 - y_frac) - size * 0.6))
    lines = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {w}", f"PlayResY: {h}", "",
             "[V4+ Styles]",
             "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, "
             "Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
             "Alignment, MarginL, MarginR, MarginV, Encoding",
             f"Style: Cap,DejaVu Sans,{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,"
             f"{max(2, size // 14)},{max(1, size // 30)},2,{int(w * 0.05)},{int(w * 0.05)},{margin},1",
             "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    for a, b, text in events:
        text = text.replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Cap,,0,0,0,,{text}")
    with open(out, "w") as f:
        f.write("\n".join(lines) + "\n")


def caption_chunks(text, max_chars=24):
    """Split narration into short phrases for big, Shorts-style subtitles."""
    chunks, cur = [], ""
    for word in text.split():
        if cur and (len(cur) + 1 + len(word) > max_chars or cur[-1] in ".?!"):
            chunks.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    if cur:
        chunks.append(cur)
    return chunks


def contain_on_blur(src, w, h, out, inset=1.0):
    """Fit the whole image inside w x h over a blurred, darkened fill of itself, so nothing is cropped.

    inset > 1 shrinks the image so it still fits after zoompan zooms in by that factor."""
    img = Image.open(src).convert("RGB")
    bg = img.copy()
    scale = max(w / bg.width, h / bg.height)
    bg = bg.resize((int(bg.width * scale) + 1, int(bg.height * scale) + 1))
    left, top = (bg.width - w) // 2, (bg.height - h) // 2
    bg = bg.crop((left, top, left + w, top + h)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.eval(bg, lambda v: int(v * 0.55))
    scale = min(w / img.width, h / img.height) / inset
    fg = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    bg.paste(fg, ((w - fg.width) // 2, (h - fg.height) // 2))
    bg.save(out)
    return out


def render_path(src, keys, w, h, fps, frames, out):
    """Render a keyframed camera move over a still image with sub-pixel smoothness (needs opencv)."""
    import cv2
    import numpy as np
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    H, W = img.shape[:2]
    aspect = w / h
    base_w, base_h = (H * aspect, H) if W / H > aspect else (W, W / aspect)
    keys = sorted(keys, key=lambda k: k["t"])

    defaults = {"x": 0.5, "y": 0.5, "zoom": 1.0, "cool": 0.0}

    def at(u):
        """Camera (x, y, zoom, cool) at fraction u of the scene; "cool" tints toward blue (0-1)."""
        if u <= keys[0]["t"]:
            return tuple(keys[0].get(n, d) for n, d in defaults.items())
        for a, b in zip(keys, keys[1:]):
            if u <= b["t"]:
                f = (u - a["t"]) / max(b["t"] - a["t"], 1e-6)
                f = f * f * (3 - 2 * f)  # ease in/out
                return tuple(a.get(n, d) + f * (b.get(n, d) - a.get(n, d)) for n, d in defaults.items())
        return tuple(keys[-1].get(n, d) for n, d in defaults.items())

    proc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}",
                             "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                             "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for i in range(frames):
        cx, cy, z, cool = at(i / max(frames - 1, 1))
        vw, vh = base_w / max(z, 1), base_h / max(z, 1)
        x0 = min(max(cx * W - vw / 2, 0), W - vw)
        y0 = min(max(cy * H - vh / 2, 0), H - vh)
        sc = w / vw
        m = np.float32([[sc, 0, -x0 * sc], [0, sc, -y0 * sc]])
        frame = cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        if cool > 0:  # BGR: lift blue, pull red, slightly desaturate
            f = frame.astype(np.float32)
            gray = f.mean(axis=2, keepdims=True)
            f = f * (1 - 0.25 * cool) + gray * 0.25 * cool
            f *= np.array([1 + 0.18 * cool, 1 - 0.02 * cool, 1 - 0.16 * cool], dtype=np.float32)
            frame = np.clip(f, 0, 255).astype(np.uint8)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait():
        sys.exit(f"Camera path render failed for {src}")
    return out


def label_png(text, w, h, out):
    """Small tag in the top-left corner, e.g. 'Imagined reconstruction'."""
    size = int(w * 0.018)
    font = _font(size)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad, m = int(size * 0.5), int(w * 0.025)
    tw = d.textlength(text, font=font)
    d.rounded_rectangle([m, m, m + tw + 2 * pad, m + size + 2 * pad], radius=pad, fill=(0, 0, 0, 140))
    d.text((m + pad, m + pad * 0.8), text, font=font, fill=(255, 255, 255, 230))
    img.save(out)


def motion_filter(motion, w, h, fps, frames, z_amt):
    n = max(frames - 1, 1)
    center = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    exprs = {
        "zoom_in": f"z='1+{z_amt}*on/{n}':{center}",
        "zoom_out": f"z='{1 + z_amt}-{z_amt}*on/{n}':{center}",
        "pan_left": f"z='{1 + z_amt}':x='(iw-iw/zoom)*(1-on/{n})':y='ih/2-(ih/zoom/2)'",
        "pan_right": f"z='{1 + z_amt}':x='(iw-iw/zoom)*on/{n}':y='ih/2-(ih/zoom/2)'",
        "pan_up": f"z='{1 + z_amt}':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/{n})'",
        "pan_down": f"z='{1 + z_amt}':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/{n}'",
        "still": f"z='1':{center}",
    }
    expr = exprs.get(motion, exprs["zoom_in"])
    # Upscale 2x before zoompan: zoompan works in whole pixels, so a bigger source keeps motion smooth.
    return (f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,crop={w * 2}:{h * 2},"
            f"zoompan={expr}:d={frames}:s={w}x{h}:fps={fps}")


def render_scene(i, scene, base, cfg, tmp, plan=False):
    w, h = cfg["size"]
    fps = cfg["fps"]
    color = scene["media"] if scene["media"] == "black" or scene["media"].startswith("#") else None
    media = os.path.join(base, scene["media"])
    if not color and not os.path.exists(media):
        sys.exit(f"Scene {i + 1}: media not found: {media}")

    audio, speech = None, 0.0
    if scene.get("narration"):
        audio = os.path.join(tmp, f"n{i}.wav")
        timeline = narrate(scene["narration"], cfg["voice"], audio, os.path.join(base, ".tts_cache"), tmp,
                            cfg["narration_mode"])
        speech = duration_of(audio)
    dur = scene.get("duration") or ((speech + 0.5) if audio else 4.0)
    tempo = cfg["voice_speed"]
    speech /= tempo
    if not scene.get("duration") and audio:
        dur = speech + 0.5
    if audio and speech > dur - 0.2:
        # Narration overruns the requested scene length: speed it up a little, then stretch the scene.
        extra = min(speech / (dur - 0.2), 1.15)
        tempo *= extra
        speech /= extra
        if speech > dur - 0.2:
            print(f"scene {i + 1}: narration needs {speech + 0.3:.1f}s, longer than {dur}s; extending", file=sys.stderr)
            dur = speech + 0.3
    # "pause_before": seconds of silence before the narration starts (a dramatic beat).
    pause = scene.get("pause_before", 0.0) if audio else 0.0
    dur += pause
    if plan:
        return {"scene": i + 1, "seconds": round(dur, 2), "speech": round(speech + pause, 2)}
    frames = int(round(dur * fps))
    fade = min(0.4, dur / 4)

    is_video = not color and os.path.splitext(media)[1].lower() in VIDEO_EXT
    if scene.get("keys") and not color and not is_video:
        media = render_path(media, scene["keys"], w, h, fps, frames, os.path.join(tmp, f"path{i}.mp4"))
        is_video = True
    zoom = scene.get("zoom", cfg["zoom"])
    if not color and not is_video and scene.get("fit", cfg["fit"]) == "contain":
        # A centered zoom by (1+zoom) needs the image shrunk by that much; a pan also slides the
        # window off-center by up to the zoom slack, which needs (1+zoom)/(1-zoom).
        pan = scene.get("motion", "zoom_in").startswith("pan_")
        inset = (1 + zoom) / (1 - zoom) if pan else 1 + zoom
        media = contain_on_blur(media, w * 2, h * 2, os.path.join(tmp, f"fit{i}.png"), inset=inset)
    if color:
        inputs = ["-f", "lavfi", "-i", f"color=c={color.replace('#', '0x')}:s={w}x{h}:r={fps}"]
        vf = "setsar=1"
    elif is_video:
        inputs = ["-stream_loop", "-1", "-i", media]
        vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={fps},setsar=1"
    else:
        inputs = ["-loop", "1", "-framerate", str(fps), "-i", media]
        vf = motion_filter(scene.get("motion", "zoom_in"), w, h, fps, frames, zoom) + ",setsar=1"
    if scene.get("fade_in", True):
        vf += f",fade=t=in:st=0:d={fade}"
    if scene.get("fade_out", True):  # false = hard cut into the next scene
        vf += f",fade=t=out:st={dur - fade}:d={fade}"

    cmd = ["ffmpeg", "-y", "-v", "error", *inputs]
    n_in = 1
    graph = f"[0:v]{vf}[v0]"
    last = "[v0]"
    if cfg["captions"] and scene.get("narration"):
        cap_y = scene.get("caption_y", cfg["caption_y"])
        if cfg["caption_size"] == "large":
            # Big subtitles a few words at a time. Each sentence was voiced separately, so its real start and
            # end are known; phrases inside it are timed by their share of its characters.
            # One line per chunk keeps the captions compact enough to sit below the picture.
            max_chars = int(w * 0.85 / (w * cfg["caption_scale"] * 0.6))
            events = []
            for sentence, a, b in timeline:
                a, b = pause + a / tempo, pause + b / tempo
                chunks = caption_chunks(sentence, max_chars=max_chars)
                total_chars = sum(len(c) for c in chunks)
                t = a
                for chunk in chunks:
                    span = (b - a) * len(chunk) / total_chars
                    events.append([t, t + span, chunk])
                    t += span
            for k in range(len(events) - 1):  # hold each phrase until the next appears (no flicker in gaps)
                events[k][1] = events[k + 1][0]
            if events:
                events[-1][1] = dur
            ass = os.path.join(tmp, f"c{i}.ass")
            write_ass(events, w, h, cfg["caption_scale"], cap_y, ass)
            graph += f";{last}ass={ass}[vc]"
            last = "[vc]"
        else:
            cap = os.path.join(tmp, f"c{i}.png")
            caption_png(scene["narration"], w, h, cap, y_frac=cap_y)
            cmd += ["-i", cap]
            graph += f";{last}[{n_in}:v]overlay=0:0[v{n_in}]"
            last = f"[v{n_in}]"
            n_in += 1
    for kind in ("tag", "text"):
        if scene.get(kind):
            png = os.path.join(tmp, f"{kind}{i}.png")
            if kind == "tag":
                label_png(scene["tag"], w, h, png)
            else:
                caption_png(scene["text"], w, h, png, scale=scene.get("text_scale", 0.06), y_frac=0.5, box=False)
            cmd += ["-i", png]
            graph += f";{last}[{n_in}:v]overlay=0:0[v{n_in}]"
            last = f"[v{n_in}]"
            n_in += 1
    if audio:
        cmd += ["-i", audio]
        graph += f";[{n_in}:a]atempo={tempo:.3f},adelay={int(pause * 1000)}|{int(pause * 1000)},apad,atrim=0:{dur},aresample=44100,aformat=channel_layouts=stereo[a0]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
        graph += f";[{n_in}:a]atrim=0:{dur}[a0]"
    n_in += 1
    # Sound effects: [{"file": "snap.wav", "at": 5.2, "volume": 1.0}], "at" in seconds from scene start.
    mix = ["[a0]"]
    for k, fx in enumerate(scene.get("sfx", [])):
        cmd += ["-i", os.path.join(base, fx["file"])]
        delay = int(fx.get("at", 0) * 1000)
        graph += (f";[{n_in}:a]volume={fx.get('volume', 1.0)},aresample=44100,aformat=channel_layouts=stereo,"
                  f"adelay={delay}|{delay}[fx{k}]")
        mix.append(f"[fx{k}]")
        n_in += 1
    if len(mix) > 1:
        graph += f";{''.join(mix)}amix=inputs={len(mix)}:duration=first:normalize=0[a]"
    else:
        graph = graph.replace("[a0]", "[a]")
    out = os.path.join(tmp, f"s{i:03d}.mp4")
    cmd += ["-filter_complex", graph, "-map", last, "-map", "[a]", "-t", f"{dur}", "-frames:v", str(frames),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-ac", "2", "-ar", "44100", out]
    run(cmd)
    kind = color or ("video" if is_video else scene.get("motion", "zoom_in"))
    print(f"scene {i + 1}: {dur:.1f}s {kind}" + (f" (voice x{tempo:.2f})" if tempo > 1 else ""), file=sys.stderr)
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("storyboard")
    p.add_argument("--out", default="final.mp4")
    p.add_argument("--plan", action="store_true", help="print scene timings only")
    a = p.parse_args()

    with open(a.storyboard) as f:
        sb = json.load(f)
    base = os.path.dirname(os.path.abspath(a.storyboard))
    cfg = {"size": sb.get("size", [1080, 1920]), "fps": sb.get("fps", 30),
           "voice": sb.get("voice", "en-US-AndrewNeural"), "captions": sb.get("captions", True),
           "fit": sb.get("fit", "cover"), "zoom": sb.get("zoom", 0.12),
           "caption_size": sb.get("caption_size", "normal"), "voice_speed": sb.get("voice_speed", 1.0),
           "narration_mode": sb.get("narration_mode", "scene"),
           "caption_scale": sb.get("caption_scale", LARGE_CAPTION),
           "caption_y": sb.get("caption_y", 0.75 if sb.get("caption_size") == "large" else 0.72)}

    with tempfile.TemporaryDirectory() as tmp:
        if a.plan:
            timings = [render_scene(i, s, base, cfg, tmp, plan=True) for i, s in enumerate(sb["scenes"])]
            t = 0.0
            for row in timings:
                row["start"] = round(t, 2)
                t += row["seconds"]
            print(json.dumps({"scenes": timings, "total": round(t, 2)}, indent=1))
            return
        # Narration first (sequential, network), then render scenes in parallel.
        for i, s in enumerate(sb["scenes"]):
            if s.get("narration"):
                narrate(s["narration"], cfg["voice"], os.path.join(tmp, f"warm{i}.wav"), os.path.join(base, ".tts_cache"), tmp,
                        cfg["narration_mode"])
        with ThreadPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) // 2)) as pool:
            clips = list(pool.map(lambda args: render_scene(*args, base, cfg, tmp), enumerate(sb["scenes"])))
        listing = os.path.join(tmp, "list.txt")
        with open(listing, "w") as f:
            f.writelines(f"file '{c}'\n" for c in clips)
        joined = os.path.join(tmp, "joined.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", joined])

        music = sb.get("music")
        if music:
            music = os.path.join(base, music)
            total = duration_of(joined)
            run(["ffmpeg", "-y", "-v", "error", "-i", joined, "-stream_loop", "-1", "-i", music,
                 "-filter_complex",
                 f"[1:a]volume={sb.get('music_volume', 0.12)},atrim=0:{total},afade=t=out:st={max(total - 2, 0)}:d=2[m];"
                 f"[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
                 "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", a.out])
        else:
            run(["ffmpeg", "-y", "-v", "error", "-i", joined, "-c", "copy", "-movflags", "+faststart", a.out])
    print(json.dumps({"video": a.out, "seconds": round(duration_of(a.out), 1)}))


if __name__ == "__main__":
    main()
