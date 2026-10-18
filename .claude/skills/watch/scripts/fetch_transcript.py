"""Fetch a YouTube video's metadata and transcript, trying several methods.

Usage: python3 -I fetch_transcript.py <youtube-url-or-id> [--out FILE] [--lang en]
Exits 0 if a transcript was found, 2 if only metadata was found.
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

ID_RE = re.compile(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([A-Za-z0-9_-]{11})")


def video_id(arg):
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", arg):
        return arg
    m = ID_RE.search(arg)
    if not m:
        sys.exit(f"Could not find a video ID in: {arg}")
    return m.group(1)


def oembed(vid):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            return json.load(r)
    except Exception as e:
        print(f"[oembed] failed: {e}", file=sys.stderr)
        return {}


def via_transcript_api(vid, lang):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print("[transcript-api] not installed (pip install youtube-transcript-api)", file=sys.stderr)
        return None
    try:
        segs = YouTubeTranscriptApi().fetch(vid, languages=[lang, "en"])
        return "\n".join(f"[{int(s.start)//60:02d}:{int(s.start)%60:02d}] {s.text}" for s in segs)
    except Exception as e:
        print(f"[transcript-api] failed: {type(e).__name__}", file=sys.stderr)
        return None


def via_ytdlp(vid, lang):
    with tempfile.TemporaryDirectory() as d:
        cmd = ["yt-dlp", "--skip-download", "--write-auto-subs", "--write-subs",
               "--sub-langs", f"{lang}.*", "--sub-format", "vtt",
               "-o", os.path.join(d, "%(id)s"), f"https://www.youtube.com/watch?v={vid}"]
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            print(f"[yt-dlp] unavailable: {e}", file=sys.stderr)
            return None
        files = glob.glob(os.path.join(d, "*.vtt"))
        if not files:
            print("[yt-dlp] no subtitles (likely blocked or none exist)", file=sys.stderr)
            return None
        lines, last = [], None
        for line in open(files[0], encoding="utf-8"):
            line = re.sub(r"<[^>]+>", "", line).strip()
            if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:")):
                continue
            if line != last:  # auto-captions repeat rolling lines
                lines.append(line)
            last = line
        return "\n".join(lines)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("url")
    p.add_argument("--out")
    p.add_argument("--lang", default="en")
    a = p.parse_args()

    vid = video_id(a.url)
    meta = oembed(vid)
    print(json.dumps({"id": vid, "title": meta.get("title"), "channel": meta.get("author_name")}))

    text = via_transcript_api(vid, a.lang) or via_ytdlp(vid, a.lang)
    if not text:
        print("No transcript from YouTube directly. Next: web-search the title + "
              "'transcript' for a mirror site, or ask the user to paste it.", file=sys.stderr)
        sys.exit(2)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Transcript saved to {a.out} ({len(text.split())} words)")
    else:
        print(text)


if __name__ == "__main__":
    main()
