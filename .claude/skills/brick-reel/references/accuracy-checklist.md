# Accuracy checklist

## A. Ask for / collect (in this order of value)
1. A clear **front view of each main character** (full body).
2. **Close-ups of faces** — brows, eyes, muzzle/mouth, hair, accessories.
3. **Key locations** (the signature place + 1–2 others).
4. **Props that define the title** (signs, machines, vehicles, items).
5. Screenshots of the **moments** to recreate (poses, camera angles).
If the user has none, say plainly that the build is from memory and invite images.

## B. Character sheet (write before coding)
```
NAME      | height vs. others | head:body | silhouette
colours   | skin #… hair #… top #… bottom #… shoes #… (use scripts/palette.py)
signature | 1) … 2) … 3) …
face      | brows … eyes … mouth …
motion    | walk/run style, idle gesture, signature action
```
Example (Dexter): short, huge head; skin #f8e2d8; hair #f06a1e swoopy tuft; signature:
big blue-lens glasses, white lab coat to the knees, purple gloves.

## C. Build rules
- Silhouette first (block sizes/proportions), then colour, then face, then accessories.
- Exaggerate the signature features slightly; brick style rewards bold shapes.
- Eyes/brows/mouth are 3–6 tiny boxes — worth the effort; they set the expression.
- Keep **one builder per character** and reuse it in every scene (consistency).
- Hair must sit flush on the head (a box wider than the head reads as a hat brim).
- Hands/feet: scale up if the character has gloves/boots as a feature.

## D. Verify (every iteration)
1. Render stills of the shots where each character is largest.
2. Tile reference + still side by side (`ffmpeg … hstack`) and list mismatches:
   colour, proportion, missing signature feature, expression, wrong facing.
3. Fix all listed items in one pass; re-render those stills only.
4. Check backs of heads / profiles too — characters are often seen from the side.

## E. Environment accuracy
- Sky gradient + fog colour from the reference (peach for Peach Creek, neon-purple lab).
- Signature props with legible text via canvas textures (`txtTex`, `neonTex`).
- Ground/path/tile pattern from the reference (glowing floor tiles, rail sleepers).
- Light colour & direction (sunset rim light, lantern glow, cold ice light).

## F. Facts
- Years/titles on cards from a quick search or the user's image; cite sources.
- Don't state plot details you aren't sure of; keep cards to safe, verifiable moments.
