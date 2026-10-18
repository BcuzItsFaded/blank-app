#!/usr/bin/env python3
"""Assemble the final 1080p video from out/timeline.json produced by build.py.

Inputs (all optional except clips, which may be replaced by --placeholders):
  --clips DIR     <shot_id>.mp4 (animated clip) or <shot_id>.png/.jpg (still, gets a slow push-in)
  --vo DIR        <scene_id>.mp3/.wav narration (run build.py --vo-dir DIR first so timings match)
  --music DIR     <cue>.mp3/.wav named after scene music cues; looped and ducked under narration
  --sfx DIR       <sfx_name>.mp3/.wav named after shot sfx entries
  --placeholders  render labelled colour cards for missing shots (animatic / pipeline test)
  --burn-subs     burn subtitles into the picture (default: soft English subtitle track)
  --scenes        comma-separated scene ids to render a partial cut

Usage: python3 assemble.py <production_dir> --clips DIR [--vo DIR --music DIR --sfx DIR] [-o out.mp4]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

AUDIO_EXT = (".wav", ".mp3", ".m4a")
BADGE = {"theory": ("THEORY - NOT CONFIRMED", "0x8B3FD9"), "confirmed": ("CONFIRMED IN FILM", "0xC9A227")}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffmpeg failed: {' '.join(cmd[:8])}...\n{r.stderr[-2000:]}")


def find(d, stem, exts):
    if not d:
        return None
    for e in exts:
        p = Path(d) / f"{stem}{e}"
        if p.exists():
            return p
    return None


def render_shot(shot, scene, args, W, H, fps, tmp, extra=0.0):
    out = tmp / f"{shot['id']}.mp4"
    dur = shot["dur"] + extra
    norm = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={fps},setsar=1"
    clip = find(args.clips, shot["id"], (".mp4", ".mov", ".webm"))
    still = find(args.clips, shot["id"], (".png", ".jpg", ".jpeg", ".webp"))
    if clip:
        src = ["-stream_loop", "-1", "-i", str(clip)]
        vf = norm
    elif still:
        frames = int(dur * fps) + 1
        src = ["-loop", "1", "-i", str(still)]
        vf = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,crop={W * 2}:{H * 2},"
              f"zoompan=z='1+0.08*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={fps},setsar=1")
    elif args.placeholders:
        src = ["-f", "lavfi", "-i", f"color=c=0x1a1030:s={W}x{H}:r={fps}"]
        label = f"{shot['id']}  [{shot['mode']}]".replace(":", r"\:")
        vf = (f"drawtext=text='{label}':fontcolor=white:fontsize=64:x=(w-tw)/2:y=h/2-80,"
              f"drawtext=text='{scene['title'].replace(':', '').replace(chr(39), '')}':fontcolor=0xffcc33:fontsize=40:x=(w-tw)/2:y=h/2+20")
    else:
        sys.exit(f"missing clip for {shot['id']} (use --placeholders for an animatic)")
    badge = BADGE.get(scene["status"])
    if badge and scene["status"] == "theory":
        vf += (f",drawbox=x=40:y=40:w=560:h=70:color={badge[1]}@0.85:t=fill,"
               f"drawtext=text='{badge[0]}':fontcolor=white:fontsize=36:x=60:y=58")
    run(["ffmpeg", "-y", *src, "-t", f"{dur:.3f}", "-vf", vf, "-an", "-c:v", "libx264", "-preset", args.preset,
         "-crf", "18", "-pix_fmt", "yuv420p", str(out)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("production_dir")
    ap.add_argument("--clips")
    ap.add_argument("--vo")
    ap.add_argument("--music")
    ap.add_argument("--sfx")
    ap.add_argument("--placeholders", action="store_true")
    ap.add_argument("--burn-subs", action="store_true")
    ap.add_argument("--scenes")
    ap.add_argument("--preset", default="medium")
    ap.add_argument("-o", "--output")
    args = ap.parse_args()

    pdir = Path(args.production_dir)
    tl = json.loads((pdir / "out" / "timeline.json").read_text())
    W, H = tl["meta"]["resolution"]
    fps, T = tl["meta"]["fps"], tl["meta"]["transition_sec"]
    scenes = tl["scenes"]
    if args.scenes:
        keep = set(args.scenes.split(","))
        scenes = [s for s in scenes if s["id"] in keep]
    tmp = pdir / "out" / "render_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    output = Path(args.output or pdir / "out" / "final_1080p.mp4")

    # 1. Per scene: hard cuts between shots; the last shot is extended by T so the xfade into the
    #    next scene does not eat narration. Scene k then starts exactly at its timeline offset.
    base = scenes[0]["start"]
    scene_files = []
    for k, sc in enumerate(scenes):
        parts = [render_shot(sh, sc, args, W, H, fps, tmp, T if i == len(sc["shots"]) - 1 and k < len(scenes) - 1 else 0)
                 for i, sh in enumerate(sc["shots"])]
        lst = tmp / f"{sc['id']}.txt"
        lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
        sf = tmp / f"{sc['id']}_scene.mp4"
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(sf)])
        scene_files.append(sf)

    # 2. Chain scenes with xfade transitions.
    inputs, fc, prev, acc = [], [], "[0:v]", 0.0
    for sf in scene_files:
        inputs += ["-i", str(sf)]
    for k in range(1, len(scenes)):
        acc += scenes[k - 1]["dur"]
        out = f"[x{k}]"
        fc.append(f"{prev}[{k}:v]xfade=transition={scenes[k - 1]['transition']}:duration={T}:offset={acc:.3f}{out}")
        prev = out
    total = sum(s["dur"] for s in scenes) + (T if len(scenes) > 1 else 0)
    srt = pdir / "out" / "subtitles.en.srt"
    vlabel = prev
    if args.burn_subs:
        fc.append(f"{prev}subtitles='{srt}':force_style='FontName=Arial,FontSize=22,Outline=2,MarginV=40'[vs]")
        vlabel = "[vs]"

    # 3. Audio: narration at scene offsets, music per scene (looped, faded, ducked), sfx at shot starts.
    n = len(scene_files)
    vo_labels, bed_labels = [], []
    for sc in scenes:
        off = int((sc["start"] - base) * 1000)
        vo = find(args.vo, sc["id"], AUDIO_EXT)
        if vo:
            inputs += ["-i", str(vo)]
            fc.append(f"[{n}:a]aresample=48000,adelay={off}|{off}[vo{n}]")
            vo_labels.append(f"[vo{n}]")
            n += 1
        mu = find(args.music, sc["music"]["cue"], AUDIO_EXT)
        if mu:
            d = sc["dur"] + T
            inputs += ["-stream_loop", "-1", "-i", str(mu)]
            fc.append(f"[{n}:a]aresample=48000,atrim=0:{d:.3f},afade=t=in:d=0.5,afade=t=out:st={max(d - 0.8, 0):.3f}:d=0.8,"
                      f"volume={sc['music']['vol']},adelay={off}|{off}[mu{n}]")
            bed_labels.append(f"[mu{n}]")
            n += 1
        for sh in sc["shots"]:
            for i, name in enumerate(sh["sfx"]):
                fx = find(args.sfx, name, AUDIO_EXT)
                if fx:
                    o = int((sh["start"] - base + i * 0.4) * 1000)
                    inputs += ["-i", str(fx)]
                    fc.append(f"[{n}:a]aresample=48000,volume=0.8,adelay={o}|{o}[fx{n}]")
                    bed_labels.append(f"[fx{n}]")
                    n += 1
    alabel = None
    if vo_labels or bed_labels:
        if vo_labels:
            fc.append(f"{''.join(vo_labels)}amix=inputs={len(vo_labels)}:normalize=0,apad=whole_dur={total:.3f}[vo]")
        if bed_labels:
            fc.append(f"{''.join(bed_labels)}amix=inputs={len(bed_labels)}:normalize=0,apad=whole_dur={total:.3f}[bed]")
        if vo_labels and bed_labels:
            fc.append("[vo]asplit[vo1][vo2]")
            fc.append("[bed][vo1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck]")
            fc.append("[vo2][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]")
        else:
            fc.append(f"{'[vo]' if vo_labels else '[bed]'}alimiter=limit=0.95[aout]")
        alabel = "[aout]"

    cmd = ["ffmpeg", "-y", *inputs]
    sub_in = None
    if not args.burn_subs and srt.exists() and not args.scenes:
        cmd += ["-i", str(srt)]
        sub_in = n
    if fc:
        cmd += ["-filter_complex", ";".join(fc), "-map", vlabel if fc and vlabel != "[0:v]" else "0:v"]
    else:
        cmd += ["-map", "0:v"]
    if alabel:
        cmd += ["-map", alabel, "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    if sub_in is not None:
        cmd += ["-map", f"{sub_in}:s", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng"]
    cmd += ["-c:v", "libx264", "-preset", args.preset, "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(fps),
            "-t", f"{total:.3f}", "-movflags", "+faststart", str(output)]
    run(cmd)
    print(f"rendered {output} ({total:.1f}s, {len(scenes)} scenes)")


if __name__ == "__main__":
    main()
