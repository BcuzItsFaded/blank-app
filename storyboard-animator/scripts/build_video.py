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
Per scene: media "black" or "#rrggbb" for a solid frame (e.g. a cut to black); "fade_in"/"fade_out": false
for hard cuts; "sfx": [{"file": "snap.wav", "at": 5.2, "volume": 1.0}] (at = seconds into the scene).
If narration is longer than a scene's duration, it is sped up slightly (max 1.15x), then the scene is extended.
duration: optional; defaults to narration length + 0.5 s (or 4 s with no narration).
Media paths are relative to the storyboard file.
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont

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


def tts(text, voice, out):
    """Free narration: edge-tts (natural voices), falling back to gTTS."""
    try:
        import edge_tts
        asyncio.run(edge_tts.Communicate(text, voice).save(out))
        if os.path.getsize(out) > 0:
            return
    except Exception as e:
        print(f"edge-tts unavailable ({type(e).__name__}); using gTTS", file=sys.stderr)
    from gtts import gTTS
    gTTS(text).save(out)


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


def render_scene(i, scene, base, cfg, tmp):
    w, h = cfg["size"]
    fps = cfg["fps"]
    color = scene["media"] if scene["media"] == "black" or scene["media"].startswith("#") else None
    media = os.path.join(base, scene["media"])
    if not color and not os.path.exists(media):
        sys.exit(f"Scene {i + 1}: media not found: {media}")

    audio, speech = None, 0.0
    if scene.get("narration"):
        audio = os.path.join(tmp, f"n{i}.mp3")
        tts(scene["narration"], cfg["voice"], audio)
        speech = duration_of(audio)
    dur = scene.get("duration") or ((speech + 0.5) if audio else 4.0)
    tempo = 1.0
    if audio and speech > dur - 0.2:
        # Narration overruns the requested scene length: speed it up a little, then stretch the scene.
        tempo = min(speech / (dur - 0.2), 1.15)
        speech /= tempo
        if speech > dur - 0.2:
            print(f"scene {i + 1}: narration needs {speech + 0.3:.1f}s, longer than {dur}s; extending", file=sys.stderr)
            dur = speech + 0.3
    frames = int(round(dur * fps))
    fade = min(0.4, dur / 4)

    is_video = not color and os.path.splitext(media)[1].lower() in VIDEO_EXT
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
        if cfg["caption_size"] == "large":
            # Big subtitles a few words at a time, timed by each phrase's share of the narration.
            chunks = caption_chunks(scene["narration"])
            total_chars = sum(len(c) for c in chunks)
            t = 0.0
            for k, chunk in enumerate(chunks):
                span = speech * len(chunk) / total_chars
                end = t + span if k < len(chunks) - 1 else dur
                cap = os.path.join(tmp, f"c{i}_{k}.png")
                caption_png(chunk, w, h, cap, scale=0.085, y_frac=0.75, box=False)
                cmd += ["-i", cap]
                graph += f";{last}[{n_in}:v]overlay=0:0:enable='between(t,{t:.3f},{end:.3f})'[v{n_in}]"
                last = f"[v{n_in}]"
                n_in += 1
                t += span
        else:
            cap = os.path.join(tmp, f"c{i}.png")
            caption_png(scene["narration"], w, h, cap)
            cmd += ["-i", cap]
            graph += f";{last}[{n_in}:v]overlay=0:0[v{n_in}]"
            last = f"[v{n_in}]"
            n_in += 1
    if audio:
        cmd += ["-i", audio]
        graph += f";[{n_in}:a]atempo={tempo:.3f},apad,atrim=0:{dur},aresample=44100,aformat=channel_layouts=stereo[a0]"
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
    a = p.parse_args()

    with open(a.storyboard) as f:
        sb = json.load(f)
    base = os.path.dirname(os.path.abspath(a.storyboard))
    cfg = {"size": sb.get("size", [1080, 1920]), "fps": sb.get("fps", 30),
           "voice": sb.get("voice", "en-US-AndrewNeural"), "captions": sb.get("captions", True),
           "fit": sb.get("fit", "cover"), "zoom": sb.get("zoom", 0.12),
           "caption_size": sb.get("caption_size", "normal")}

    with tempfile.TemporaryDirectory() as tmp:
        clips = [render_scene(i, s, base, cfg, tmp) for i, s in enumerate(sb["scenes"])]
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
