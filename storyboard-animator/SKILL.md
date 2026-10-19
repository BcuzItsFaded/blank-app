---
name: storyboard-animator
description: Turns the user's own images, or a script they write, into an animated, narrated vertical short video (9:16) using only free tools — free stock footage and photos from Pexels and Pixabay, ffmpeg motion (zoom/pan/fades), free text-to-speech narration and burned-in captions. Use this whenever the user wants to animate pictures or photos, "bring these images to life", make a slideshow video with movement, turn a script/story/idea into a storyboard, storyboard a script, or make a video, short, Reel, TikTok or YouTube Short from images or a script — even if they don't say "storyboard". Do not use paid AI video services unless the user asks.
---

# Storyboard Animator (free tools only)

This turns **images** or a **script** into a narrated vertical short. Everything is free:

| Need | Tool |
|---|---|
| Visuals for script scenes | `scripts/fetch_stock.py` searches **Pexels** and **Pixabay** (free stock photos and video clips) |
| Animation | `scripts/build_video.py` uses ffmpeg to add slow zoom/pan to photos, fit stock video clips to the frame, and add fades |
| Narration | Free TTS: edge-tts (natural Microsoft voices), falling back to gTTS automatically |
| Captions | Burned in from the narration text (on by default) |

The user's defaults are **vertical 9:16 (1080×1920)**, **narrator voiceover**, and **storyboard approval before building**. Don't use paid AI video or image generators (Calliope, etc.). The user chose free sources on purpose.

## Setup (check once per session)

- `ffmpeg` and `ffprobe` must be installed. Python packages: `pip install pillow gTTS edge-tts`.
- Stock search needs at least one **free** API key, set as an environment variable:
  - `PEXELS_API_KEY`: sign up at https://www.pexels.com/api/ (instant, free)
  - `PIXABAY_API_KEY`: sign up at https://pixabay.com/api/docs/ (the key is shown on that page once logged in)

  If neither is set and the user needs stock media (Mode B), ask them to paste a key. Explain that it's free and takes a minute. Mode A, using only the user's own images, needs no key.

## Step 0: Pick the mode

- **Mode A: animate the user's images.** The user's images are the scenes. If they gave a script, it becomes the narration. Otherwise write a short narration that fits the images, or ask what the video is about if that isn't obvious. Stock media only fills gaps the user agrees to.
- **Mode B: storyboard a script.** The user gives a script or idea. Every scene gets a stock photo or clip from Pexels/Pixabay. If the user also gave some images, use those for the scenes they fit and stock media for the rest.

## Step 1: Storyboard and get approval

Write the storyboard as a table in chat. This is the review point the user asked for, and it's much cheaper to change here than after building.

| # | Narration (spoken + captioned) | Visual | Source | Motion | ~Sec |
|---|---|---|---|---|---|
| 1 | "Every morning, Max waits by the door." | Golden retriever sitting by a front door | Stock video: `dog waiting door` | — | 4 |
| 2 | "But today, nobody came." | Your image 2 (empty hallway) | User image | slow zoom in | 3 |

Guidelines:
- **Narration**: the user's script, split at natural beats. Don't rewrite their words unless they want help. If they gave only an idea, write a tight script: a hook in the first line, and about 150 words per minute. A short is usually 20–60 s.
- **Source**: for stock media, write the **search keywords** you'll use. Stock search works best with 2–4 concrete, literal words (`woman running beach sunset`, not `freedom and hope`). Abstract lines need a concrete visual metaphor. Prefer **stock video** for action or nature scenes, because real motion beats a zoomed photo. Use photos when a still fits better or no good clip exists.
- **Motion** (photos only): `zoom_in` draws focus or adds tension, `zoom_out` reveals or ends a scene, `pan_left`/`pan_right` suit wide landscapes and groups, `pan_up`/`pan_down` suit tall subjects (buildings, people head to toe), and `still` is for text-heavy images. Vary motion between neighboring scenes so it doesn't feel repetitive.
- One scene ≈ one narration sentence, about 3–6 s.

Ask: "Want any changes before I build it?" Iterate until they approve.

## Step 2: Gather media

Create a project folder, for example `video-<short-name>/`. Inside it:
- Copy or convert the user's images there. Any common format works. By default the builder crops images to fill 9:16. If cropping would cut off titles, text or faces, set `"fit": "contain"` (top level or per scene) to show the whole image over a blurred fill.
- **Comic/storyboard grids** (one image with several numbered panels): split it into one image per panel, in reading order, and treat each panel as a scene. To find the borders, look for rows or columns of near-uniform brightness, for example with numpy over the grayscale image. Upscale small panels about 3× with LANCZOS so the zoom stays sharp. Panels often have titles baked in, so use `"fit": "contain"`.
- For each stock scene:
  ```bash
  python scripts/fetch_stock.py "dog waiting door" --type video --out video-max/s1.mp4
  python scripts/fetch_stock.py "empty hallway" --type photo --out video-max/s3.jpg
  ```
  The default is Pexels, then Pixabay, in portrait orientation. `--index 1`, `--index 2`, etc. fetch the next-best result. `--source pixabay` forces Pixabay.
- **Look at what you downloaded** before building. For photos, view the image. For videos, grab a frame with `ffmpeg -ss 1 -i s1.mp4 -frames:v 1 s1.png` and view it. Stock search often returns near misses. If a result doesn't match the scene, try `--index 1` or rephrase the keywords. Wrong visuals are the most common way these videos go bad.
- Every download is recorded in `credits.txt`. Pexels and Pixabay don't require credit, but it's courteous, and the user may want it for a video description.

Optional music: Pixabay Music (https://pixabay.com/music/) is free. If the user downloads a track, put it in the folder and set `"music"`. It's mixed quietly under the voice (`"music_volume"`, default 0.12).

If the user wants music but has no track, you can synthesize a free dark ambient drone with ffmpeg. It suits horror, mystery and serious stories. Set `"music_volume": 0.35`, because a drone is quieter than a mixed song:
```bash
ffmpeg -y -f lavfi -i "sine=f=55:d=60" -f lavfi -i "sine=f=58.3:d=60" -f lavfi -i "anoisesrc=d=60:c=brown:a=0.4" \
  -filter_complex "[0]volume=0.7[a];[1]volume=0.5[b];[2]lowpass=f=350,volume=0.6,tremolo=f=0.12:d=0.8[c];[a][b][c]amix=inputs=3:normalize=0,aecho=0.8:0.6:600:0.35,afade=t=in:d=3,loudnorm=I=-20" \
  -ar 44100 ambient.mp3
```
Tell the user it's a generated placeholder and that a real track from Pixabay Music will sound better.

Other free synthesized sounds that have worked well:
```bash
# Night lake ambience (lapping water + crickets); use "music_volume": 0.45
ffmpeg -y -f lavfi -i "anoisesrc=d=80:c=brown:a=0.5" -f lavfi -i "sine=f=4400:d=80" -f lavfi -i "sine=f=4650:d=80" \
  -filter_complex "[0]highpass=f=80,lowpass=f=650,tremolo=f=0.3:d=0.6,volume=0.9[w];[1]tremolo=f=38:d=1,tremolo=f=0.6:d=0.95,volume=0.035[c1];[2]tremolo=f=44:d=1,tremolo=f=0.45:d=0.95,volume=0.025,adelay=700|700[c2];[w][c1][c2]amix=inputs=3:normalize=0,afade=t=in:d=2,loudnorm=I=-22" \
  -ar 44100 -ac 2 lake.mp3
# Twig snap (use as a scene "sfx")
ffmpeg -y -f lavfi -i "aevalsrc='(random(0)*2-1)*(exp(-t*70)+0.8*gte(t,0.055)*exp(-(t-0.055)*90)+0.4*gte(t,0.13)*exp(-(t-0.13)*120))':d=0.5:s=44100" \
  -af "highpass=f=900,lowpass=f=7000,volume=2.5,aecho=0.6:0.4:40:0.25" -ac 2 twig.wav
```

## Step 3: Build

Write `storyboard.json` in the project folder. Media paths are relative to it.

```json
{
  "voice": "en-US-AndrewNeural",
  "captions": true,
  "scenes": [
    {"media": "s1.mp4", "narration": "Every morning, Max waits by the door."},
    {"media": "user2.jpg", "narration": "But today, nobody came.", "motion": "zoom_in"},
    {"media": "s3.jpg", "motion": "pan_right", "duration": 3}
  ]
}
```

- Scene length is the narration length plus 0.5 s. Set `duration` to override, or for scenes with no narration.
- Stock videos loop if they're shorter than the scene.
- **User-given timings**: set each scene's `duration` to match. If the narration is too long for it, the builder speeds the voice up slightly (max 1.15×), then stretches the scene, and reports this. Tell the user the final length.
- `"caption_size": "large"` gives big Shorts-style subtitles, a few words at a time, timed to the voice. Use it whenever the user asks for big or large subtitles. The default `"normal"` shows the whole line in a box.
- **Sound effects**: a scene can take `"sfx": [{"file": "twig.wav", "at": 5.2}]` (seconds into the scene). Leave a gap after the last spoken word so the effect doesn't land on top of it.
- **Cut to black**: set `"fade_out": false` on the last scene, then add `{"media": "black", "duration": 1.5, "fade_in": false}`. `"#rrggbb"` gives any other solid color.
- `"zoom"` sets how strong the photo motion is (default 0.12, or 12%). Lower it for subtler motion. With `"fit": "contain"` the image is shrunk just enough that zooms and pans never cut anything off.
- Voices (edge-tts) include `en-US-AndrewNeural` (warm male), `en-US-AvaNeural` (friendly female), `en-US-GuyNeural`, `en-US-JennyNeural` and `en-GB-SoniaNeural`. Run `edge-tts --list-voices` for more. If edge-tts can't connect, the builder falls back to gTTS (one plainer voice) and says so, so tell the user.
- `"size": [1920, 1080]` gives horizontal output if the user asks.

```bash
python scripts/build_video.py video-max/storyboard.json --out video-max/final.mp4
```

It prints each scene's length, then the final file and its duration. Building takes about 5–30 s per scene.

## Step 4: Check and deliver

1. Pull 2–3 frames from the finished video and look at them. Check that captions are readable, the subject isn't cropped out, and the right media appears on the right line.
2. Give the user the video file. Tell them its length and the voice used, and point them to `credits.txt`.
3. Offer one-line tweaks: a different voice, swapping a scene's media, captions off, or adding music. Changing one scene means editing `storyboard.json` and rebuilding.

## Keep the user oriented

Many users aren't technical. Talk about scenes, voice, pictures and the final video, not scripts or JSON. At each pause, say in one line where things stand and what you need from them.
