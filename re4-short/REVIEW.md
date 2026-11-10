# REVIEW: Resident Evil 4 in 60 seconds (vertical cartoon Short)

Output: `renders/re4-short.mp4`, 1080x1920, 30 fps, 58.9 s. Loudness −15.5 LUFS, true peak −1.5 dBTP.

## How it was built
- Script written for this Short (`tools/vo.txt`), narrated by Kokoro `am_michael`.
- Scenes are drawn in `tools/gen.py`, which uses the shared cartoon rig `tools/rig.js`.
- New rig parts for RE4: Leon's hair, Ashley's bob, Ada's black bob and red dress, the sack mask, Saddler's robe, and props (chainsaw, pitchfork, torch, pistol, rocket launcher).
- The vertical camera (`FOCUS` in `tools/gen.py`) pans across each scene.
- Thumbnails and upload copy are in `thumbnail/`.

## Not done
- No music.
- The mix was measured, not heard.
- Caption word timing is approximate.
