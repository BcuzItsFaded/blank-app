#!/usr/bin/env python3
"""Search Pexels / Pixabay for free stock photos or videos and download the best match.

Usage:
  fetch_stock.py "golden retriever beach" --type photo --out scene1.jpg
  fetch_stock.py "ocean waves" --type video --out scene2.mp4 --source pixabay

Keys (both free): PEXELS_API_KEY (https://www.pexels.com/api/), PIXABAY_API_KEY
(https://pixabay.com/api/docs/). With --source auto (default) it tries Pexels, then Pixabay.
Prints a JSON line with the file path and credit info (photographer, page URL).
Appends the credit to credits.txt next to the output file.
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "storyboard-animator/1.0"}


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def download(url, out):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        while chunk := r.read(1 << 16):
            f.write(chunk)


def pexels(query, kind, orientation, index):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return None
    q = urllib.parse.quote(query)
    hdr = {"Authorization": key}
    if kind == "photo":
        data = get_json(f"https://api.pexels.com/v1/search?query={q}&orientation={orientation}&per_page=15", hdr)
        hits = data.get("photos", [])
        if len(hits) <= index:
            return None
        h = hits[index]
        return {"url": h["src"]["large2x"], "author": h["photographer"], "page": h["url"], "source": "Pexels"}
    data = get_json(f"https://api.pexels.com/videos/search?query={q}&orientation={orientation}&per_page=15", hdr)
    hits = data.get("videos", [])
    if len(hits) <= index:
        return None
    h = hits[index]
    # Pick the smallest file that is still at least 1080 px on its short side; else the largest.
    files = sorted((f for f in h["video_files"] if f.get("width")), key=lambda f: f["width"] * f["height"])
    good = [f for f in files if min(f["width"], f["height"]) >= 1080]
    f = good[0] if good else files[-1]
    return {"url": f["link"], "author": h["user"]["name"], "page": h["url"], "source": "Pexels"}


def pixabay(query, kind, orientation, index):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return None
    q = urllib.parse.quote(query)
    if kind == "photo":
        orient = {"portrait": "vertical", "landscape": "horizontal"}.get(orientation, "all")
        data = get_json(f"https://pixabay.com/api/?key={key}&q={q}&image_type=photo&orientation={orient}&per_page=20&safesearch=true")
        hits = data.get("hits", [])
        if len(hits) <= index:
            return None
        h = hits[index]
        return {"url": h["largeImageURL"], "author": h["user"], "page": h["pageURL"], "source": "Pixabay"}
    data = get_json(f"https://pixabay.com/api/videos/?key={key}&q={q}&per_page=20&safesearch=true")
    hits = data.get("hits", [])
    if orientation == "portrait":
        # Pixabay videos have no orientation filter; prefer vertical ones when available.
        vertical = [h for h in hits if h["videos"]["medium"]["height"] > h["videos"]["medium"]["width"]]
        hits = vertical + [h for h in hits if h not in vertical]
    if len(hits) <= index:
        return None
    h = hits[index]
    v = h["videos"].get("large") or h["videos"]["medium"]
    if not v.get("url"):
        v = h["videos"]["medium"]
    return {"url": v["url"], "author": h["user"], "page": h["pageURL"], "source": "Pixabay"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("query")
    p.add_argument("--type", choices=["photo", "video"], default="photo")
    p.add_argument("--out", required=True)
    p.add_argument("--source", choices=["auto", "pexels", "pixabay"], default="auto")
    p.add_argument("--orientation", choices=["portrait", "landscape", "square"], default="portrait")
    p.add_argument("--index", type=int, default=0, help="take the Nth result (0 = best) to get an alternative")
    a = p.parse_args()

    if not (os.environ.get("PEXELS_API_KEY") or os.environ.get("PIXABAY_API_KEY")):
        sys.exit("No API key set. Get a free key and set PEXELS_API_KEY and/or PIXABAY_API_KEY.")

    order = {"auto": [pexels, pixabay], "pexels": [pexels], "pixabay": [pixabay]}[a.source]
    hit = None
    for fn in order:
        try:
            hit = fn(a.query, a.type, a.orientation, a.index)
        except Exception as e:  # one provider failing shouldn't stop the other
            print(f"{fn.__name__} failed: {e}", file=sys.stderr)
        if hit:
            break
    if not hit:
        sys.exit(f"No {a.type} found for '{a.query}'. Try simpler or different keywords.")

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    download(hit["url"], a.out)
    credit = f"{os.path.basename(a.out)}: {a.type} by {hit['author']} on {hit['source']} - {hit['page']}"
    with open(os.path.join(os.path.dirname(os.path.abspath(a.out)), "credits.txt"), "a") as f:
        f.write(credit + "\n")
    print(json.dumps({"file": a.out, **{k: hit[k] for k in ("author", "page", "source")}}))


if __name__ == "__main__":
    main()
