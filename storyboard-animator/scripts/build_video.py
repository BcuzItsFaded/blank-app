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

from PIL import Image, ImageDraw, ImageFont

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


def caption_png(text, w, h, out):
    font_path = next((f for f in FONTS if os.path.exists(f)), None)
    size = int(w * 0.055)
    font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
    # Bold glyphs average ~0.6 em wide; keep text within 85% of the frame width.
    lines = textwrap.wrap(text, width=max(12, int(w * 0.85 / (size * 0.6))))
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    line_h = int(size * 1.25)
    block_h = line_h * len(lines)
    y = int(h * 0.72) - block_h // 2
    pad = int(size * 0.4)
    widths = [d.textlength(line, font=font) for line in lines]
    box_w = max(widths) + pad * 2
    d.rounded_rectangle([(w - box_w) / 2, y - pad, (w + box_w) / 2, y + block_h + pad], radius=pad, fill=(0, 0, 0, 150))
    for line, lw in zip(lines, widths):
        d.text(((w - lw) / 2, y), line, font=font, fill="white", stroke_width=2, stroke_fill="black")
        y += line_h
    img.save(out)


def motion_filter(motion, w, h, fps, frames):
    n = max(frames - 1, 1)
    z_amt = 0.18
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
    media = os.path.join(base, scene["media"])
    if not os.path.exists(media):
        sys.exit(f"Scene {i + 1}: media not found: {media}")

    audio = None
    if scene.get("narration"):
        audio = os.path.join(tmp, f"n{i}.mp3")
        tts(scene["narration"], cfg["voice"], audio)
    dur = scene.get("duration") or ((duration_of(audio) + 0.5) if audio else 4.0)
    frames = int(round(dur * fps))
    fade = min(0.4, dur / 4)

    is_video = os.path.splitext(media)[1].lower() in VIDEO_EXT
    if is_video:
        inputs = ["-stream_loop", "-1", "-i", media]
        vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={fps},setsar=1"
    else:
        inputs = ["-loop", "1", "-framerate", str(fps), "-i", media]
        vf = motion_filter(scene.get("motion", "zoom_in"), w, h, fps, frames) + ",setsar=1"
    vf += f",fade=t=in:st=0:d={fade},fade=t=out:st={dur - fade}:d={fade}"

    cmd = ["ffmpeg", "-y", "-v", "error", *inputs]
    graph = f"[0:v]{vf}[v0]"
    last = "[v0]"
    if cfg["captions"] and scene.get("narration"):
        cap = os.path.join(tmp, f"c{i}.png")
        caption_png(scene["narration"], w, h, cap)
        cmd += ["-i", cap]
        graph += f";{last}[1:v]overlay=0:0[v1]"
        last = "[v1]"
    if audio:
        cmd += ["-i", audio]
        a_idx = 2 if cfg["captions"] else 1
        graph += f";[{a_idx}:a]apad,atrim=0:{dur},aresample=44100[a]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
        a_idx = 2 if cfg["captions"] and scene.get("narration") else 1
        graph += f";[{a_idx}:a]atrim=0:{dur}[a]"
    out = os.path.join(tmp, f"s{i:03d}.mp4")
    cmd += ["-filter_complex", graph, "-map", last, "-map", "[a]", "-t", f"{dur}", "-frames:v", str(frames),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-ac", "2", "-ar", "44100", out]
    run(cmd)
    print(f"scene {i + 1}: {dur:.1f}s {'video' if is_video else scene.get('motion', 'zoom_in')}", file=sys.stderr)
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
           "voice": sb.get("voice", "en-US-AndrewNeural"), "captions": sb.get("captions", True)}

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
                 f"[1:a]volume=0.12,atrim=0:{total},afade=t=out:st={max(total - 2, 0)}:d=2[m];"
                 f"[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
                 "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", a.out])
        else:
            run(["ffmpeg", "-y", "-v", "error", "-i", joined, "-c", "copy", "-movflags", "+faststart", a.out])
    print(json.dumps({"video": a.out, "seconds": round(duration_of(a.out), 1)}))


if __name__ == "__main__":
    main()
