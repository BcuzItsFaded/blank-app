#!/usr/bin/env python3
"""Generate every production document from a single production.json.

Outputs (into <production_dir>/out/):
  script.md            narration script with timecodes and delivery notes
  storyboard.md        shot-by-shot storyboard
  character_sheets.md  model-sheet prompts for each character (generate these first)
  clip_prompts.jsonl   one record per shot: image prompt, motion prompt, negative, duration
  vo_lines.jsonl       per-scene TTS input (text + delivery direction)
  subtitles.en.srt     English subtitles
  cue_sheet.csv        music + SFX cues with timecodes
  timeline.json        resolved timings consumed by assemble.py

Timing comes from real voiceover files when --vo-dir holds <scene_id>.mp3/.wav,
otherwise from a words-per-minute estimate. Re-run after recording VO to retime.

Usage: python3 build.py <production_dir> [--vo-dir DIR]
"""
import argparse
import csv
import json
import re
import subprocess
from pathlib import Path


def tc(sec, srt=False):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}" if srt else f"{h * 60 + m:02}:{s:02}"


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def find_vo(vo_dir, scene_id):
    if not vo_dir:
        return None
    for ext in (".mp3", ".wav", ".m4a"):
        p = Path(vo_dir) / f"{scene_id}{ext}"
        if p.exists():
            return p
    return None


def resolve_timeline(prod, vo_dir):
    meta = prod["meta"]
    wpm, pad = meta["words_per_minute"], meta["scene_pad_sec"]
    t = 0.0
    scenes = []
    for sc in prod["scenes"]:
        vo = find_vo(vo_dir, sc["id"])
        vo_dur = probe_duration(vo) if vo else len(sc["narration"].split()) / wpm * 60
        dur = vo_dur + pad
        total_w = sum(s["w"] for s in sc["shots"])
        shots, st = [], t
        for i, sh in enumerate(sc["shots"], 1):
            d = dur * sh["w"] / total_w
            shots.append({**sh, "id": f"{sc['id']}_{i:02}", "start": round(st, 3), "dur": round(d, 3)})
            st += d
        scenes.append({**sc, "start": round(t, 3), "dur": round(dur, 3), "vo_dur": round(vo_dur, 3),
                       "vo_file": str(vo) if vo else None, "shots": shots})
        t += dur
    return scenes, t


def shot_prompts(prod, shot, scene):
    style, chars = prod["style"], prod["characters"]
    locks = "; ".join(f"{chars[c]['name']}: {chars[c]['lock']}" for c in shot["chars"])
    tint = " Entire frame tinted purple with a soft dreamlike vignette (speculative scene)." if scene["status"] == "theory" else ""
    image = f"{style[shot['mode']]}. Scene: {shot['action']}.{tint}"
    if locks:
        image += f" Character designs (keep exactly consistent with model sheets): {locks}."
    motion = (f"Camera: {shot['camera']}. Animate the action fully — {shot['action']}. "
              f"Hand-drawn anime timing on 2s, impact frames on hits, no morphing of faces or costumes. "
              f"Duration {shot['dur']:.1f}s.")
    return image, motion


def srt_cues(scene):
    """Split narration into subtitle cues, timed proportionally by character count."""
    sentences = re.split(r"(?<=[.!?])\s+", scene["narration"].strip())
    chunks = []
    for s in sentences:
        words, line = s.split(), ""
        for w in words:
            if len(line) + len(w) + 1 > 84 and line:
                chunks.append(line)
                line = w
            else:
                line = f"{line} {w}".strip()
        if line:
            chunks.append(line)
    total = sum(len(c) for c in chunks)
    t, cues = scene["start"], []
    for c in chunks:
        d = scene["vo_dur"] * len(c) / total
        cues.append((t, t + d, wrap2(c)))
        t += d
    return cues


def wrap2(text, width=42):
    if len(text) <= width:
        return text
    mid = len(text) // 2
    cut = min((i for i, ch in enumerate(text) if ch == " "), key=lambda i: abs(i - mid))
    return text[:cut] + "\n" + text[cut + 1:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("production_dir")
    ap.add_argument("--vo-dir")
    args = ap.parse_args()
    pdir = Path(args.production_dir)
    prod = json.loads((pdir / "production.json").read_text())
    out = pdir / "out"
    out.mkdir(exist_ok=True)
    scenes, total = resolve_timeline(prod, args.vo_dir)
    meta, chars = prod["meta"], prod["characters"]
    status_tag = {"confirmed": "CONFIRMED IN FILM", "theory": "THEORY — NOT CONFIRMED", "meta": "CHANNEL"}

    (out / "timeline.json").write_text(json.dumps({"meta": meta, "total": total, "scenes": scenes}, indent=2))

    words = sum(len(s["narration"].split()) for s in scenes)
    lines = [f"# {meta['title']}", "", f"Channel: {meta['channel']} · Runtime: {tc(total)} · {words} words", "",
             f"Narrator: {meta['narrator']['description']}", ""]
    for s in scenes:
        lines += [f"## [{tc(s['start'])}] {s['id']} — {s['title']}  `{status_tag[s['status']]}`", "",
                  f"*Delivery: {s['delivery']}*", "", s["narration"], ""]
    (out / "script.md").write_text("\n".join(lines))

    lines = [f"# Storyboard — {meta['title']}", "", f"{sum(len(s['shots']) for s in scenes)} shots · {tc(total)}", ""]
    for s in scenes:
        lines += [f"## {s['id']} — {s['title']}  `{status_tag[s['status']]}`", "",
                  f"Music: `{s['music']['cue']}` · Transition out: `{s['transition']}`", "",
                  "| Shot | Time | Dur | Mode | Characters | Action | Camera | SFX |",
                  "|---|---|---|---|---|---|---|---|"]
        for sh in s["shots"]:
            names = ", ".join(chars[c]["name"] for c in sh["chars"]) or "—"
            lines.append(f"| {sh['id']} | {tc(sh['start'])} | {sh['dur']:.1f}s | {sh['mode']} | {names} | "
                         f"{sh['action']} | {sh['camera']} | {', '.join(sh['sfx']) or '—'} |")
        lines.append("")
    (out / "storyboard.md").write_text("\n".join(lines))

    used = {c for s in scenes for sh in s["shots"] for c in sh["chars"]}
    lines = ["# Character Model Sheets", "",
             "Generate these FIRST and reuse them as image references for every shot (consistency lock).", ""]
    for key, c in chars.items():
        if key not in used:
            continue
        lines += [f"## {c['name']} (`{key}`)", "", "```",
                  f"{prod['style']['anime']}. Character model sheet / turnaround on a plain light-grey background: "
                  f"front, three-quarter, side and back views plus three facial expressions (neutral, battle cry, "
                  f"determined). {c['name']}: {c['lock']}. Consistent proportions across all views, colour swatches "
                  f"along the bottom.", "```", "",
                  f"Arcade sprite variant: `{prod['style']['arcade']}. Sprite sheet of {c['name']}: idle, walk, "
                  f"punch, kick, special move, victory pose. {c['lock']}.`", ""]
    (out / "character_sheets.md").write_text("\n".join(lines))

    with open(out / "clip_prompts.jsonl", "w") as f:
        for s in scenes:
            for sh in s["shots"]:
                image, motion = shot_prompts(prod, sh, s)
                f.write(json.dumps({"shot": sh["id"], "scene": s["id"], "status": s["status"], "start": sh["start"],
                                    "duration": sh["dur"], "mode": sh["mode"], "characters": sh["chars"],
                                    "image_prompt": image, "motion_prompt": motion,
                                    "negative_prompt": prod["style"]["negative"],
                                    "aspect_ratio": "16:9", "resolution": "1920x1080"}) + "\n")

    with open(out / "vo_lines.jsonl", "w") as f:
        for s in scenes:
            f.write(json.dumps({"scene": s["id"], "file": f"{s['id']}.mp3", "delivery": s["delivery"],
                                "text": s["narration"]}) + "\n")

    n, lines = 1, []
    for s in scenes:
        for a, b, text in srt_cues(s):
            lines += [str(n), f"{tc(a, True)} --> {tc(b, True)}", text, ""]
            n += 1
    (out / "subtitles.en.srt").write_text("\n".join(lines))

    with open(out / "cue_sheet.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["type", "start", "end", "cue", "volume", "scene", "shot"])
        for s in scenes:
            w.writerow(["music", tc(s["start"]), tc(s["start"] + s["dur"]), s["music"]["cue"], s["music"]["vol"], s["id"], ""])
            for sh in s["shots"]:
                for i, fx in enumerate(sh["sfx"]):
                    w.writerow(["sfx", tc(sh["start"] + i * 0.4), "", fx, 0.8, s["id"], sh["id"]])

    print(f"{len(scenes)} scenes, {sum(len(s['shots']) for s in scenes)} shots, {words} words, runtime {tc(total)}"
          f" ({'real VO' if args.vo_dir else 'estimated'}) -> {out}")


if __name__ == "__main__":
    main()
