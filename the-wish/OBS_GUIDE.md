# Recording THE WISH with OBS Studio

This guide records the animation as a 1080×1920, 60-second YouTube Short with all of its music and SFX.
OBS is free, and the player uses no paid APIs.

## 0. Prepare the assets (once)

Put the files next to the player:

```
the-wish/
  index.html
  assets/
    storyboard.png   ← the combined 15-panel storyboard (png/jpg/jpeg/webp)
    voice.mp3        ← optional recorded narration that starts at 0:00 (mp3/wav/m4a/ogg)
```

Open `the-wish/index.html` in Chrome or Edge and check it:

1. **Storyboard tab**: every red box should sit on the art only, with no number/title bar and no
   NARRATOR/CAMERA/FX caption. Drag a box to move it. Drag an edge or corner to resize it.
   Raise **Inner trim %** if thin borders show.
2. **Script tab**: paste or edit the narration. Lines like `**0:00–0:07 — The Hook**` set the timing.
3. Press **Space** to preview.
4. If you changed crops, the script or settings, open the **Export** tab, click **Download project.js**
   and save it as `the-wish/assets/project.js`. OBS loads that file, so it sees exactly what you previewed.
   The file includes the storyboard and the uploaded voice-over.

## 1. OBS canvas

**Settings → Video**

| Setting | Value |
|---|---|
| Base (Canvas) Resolution | **1080x1920** (type it in) |
| Output (Scaled) Resolution | **1080x1920** |
| Common FPS Values | **30** (or 60) |

**Settings → Output** (Output Mode: Advanced → Recording)

| Setting | Value |
|---|---|
| Recording Format | **MP4** (or MKV, then File → Remux Recordings → MP4) |
| Video Encoder | NVIDIA NVENC H.264 / AMD / Apple VT H.264 / x264 |
| Rate Control | CBR or CQP · **12–20 Mbps** (CQP 18) |
| Audio Encoder | AAC 192 kbps or higher (Settings → Audio: 48 kHz) |

**Settings → Advanced**: keep **Browser Source Hardware Acceleration** on. The effects are rendered
on the GPU.

## 2. Add the player as a Browser Source

Sources **+** → **Browser** → name it `THE WISH`:

| Field | Value |
|---|---|
| Local file | ✅ → browse to `the-wish/index.html` |
| Width × Height | **1080 × 1920** |
| Control audio via OBS | ✅ (sends score + SFX + voice into the OBS mixer) |
| Shutdown source when not visible | ✅ |
| Refresh browser when scene becomes active | ✅ |
| Custom CSS | leave the default (`body { background-color: rgba(0,0,0,0); … }`) |

Inside OBS the player detects the Browser Source and switches itself into **record mode**: no UI,
no cursor, the canvas fills the source, and playback starts **3 seconds after the page loads**.
No URL parameters are needed with **Local file**.

Optional: to control it with URL parameters, untick Local file and serve the folder
(`npx http-server the-wish -p 8080` or `python -m http.server 8080` inside `the-wish`), then use
`http://localhost:8080/index.html?record=1&autoplay=5`.

| URL parameter | Effect |
|---|---|
| `record=1` | Clean frame: hides all UI and the cursor (automatic inside OBS) |
| `autoplay=N` | Starts playback N seconds after the page loads (3 inside OBS by default) |
| `loop=1` | Restarts at the end (handy for previews, not for recording) |

Right-click the source → **Transform → Fit to screen** (Ctrl+F) if it isn't already full frame.

## 3. Audio check

In the **Audio Mixer**, the `THE WISH` source should move during playback. The final mix is limited
to about −0.5 dBFS peak, so keep the fader at 0 dB. Mute **Desktop Audio** and **Mic/Aux** to avoid
double sound. The exception is the free **browser TTS** narrator: it plays through the operating
system, so keep Desktop Audio on in that case. The better route is to record or generate a voice file
and use `assets/voice.mp3`.

## 4. Record

1. Click **Start Recording**.
2. Right-click the browser source → **Refresh** (or toggle its eye icon).
3. Wait for the 3-second black pre-roll; the Short plays for 60 seconds.
4. Click **Stop Recording** at about **1:04**.
5. Trim the first ~3 s and anything after 1:00 (YouTube editor, CapCut, Shotcut, DaVinci Resolve, or
   `ffmpeg -ss 3 -i in.mp4 -t 60 -c copy the-wish-short.mp4`).

Tip: set an OBS hotkey for **Start/Stop Recording** and a scene with only this source, so the
recording holds nothing else.

## 5. Upload as a Short

- Vertical 1080×1920, ≤ 60 s, so YouTube classifies it as a Short automatically.
- Title idea: `THE WISH 🕯️ Be careful what you wish for… #shorts #horror`.
- The burned-in subtitles sit above the Shorts UI (about 70% of the frame height). Adjust them in the **Look** tab.

## No-OBS alternative

The **Export** tab → **Record 60 s video file** records the canvas and the full audio mix straight
from the browser (MP4 in recent Chrome/Edge, otherwise WebM, which YouTube accepts). Keep the tab in
the foreground while it records. Browser TTS cannot be captured this way; use a voice file.

## Troubleshooting

| Problem | Fix |
|---|---|
| Placeholder art instead of the storyboard | The file isn't at `assets/storyboard.png`, or load it through `assets/project.js` (Download project.js) |
| No sound in the recording | Tick **Control audio via OBS**; check the source isn't muted in the Audio Mixer |
| Starts before recording | Refresh the source *after* you start recording (it waits 3 s), or serve over http and use `autoplay=5` |
| "Click or press Space to start" shows | The browser blocked autoplay: right-click the source → **Interact** → click once |
| Stutters | Enable Browser Source Hardware Acceleration; lower **Fog**, **Film grain** and **Comic halftone** in the Look tab, then Download project.js again |
| Fonts look plain | The page needs internet once for Google Fonts (Anton, Creepster, Special Elite) |
