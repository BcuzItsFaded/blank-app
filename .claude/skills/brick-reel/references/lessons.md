# Lessons learned (each cost a re-render — don't repeat them)

1. **Portrait width is tiny.** vertical FOV 52° → horizontal ≈ 30°. Width visible = 2·d·tan(15°).
   Heroes (≈3–6 units) need d ≈ 20–25; a wide sign/arch needs d ≈ 35–45.
2. **Look-ahead offset**: tracking cameras must look at `X + 1.5…2`, not `X + 4.5`, or the hero
   sits off the left edge.
3. **White-out**: bright sky env + ACES + high bloom. Fix: hemisphere ≤ 0.6, sun 1.5–2.2,
   `envIntensity` 0.3, exposure 0.6–0.75, bloom threshold ≥ 1.3.
4. **Fog colour = sky colour**; large near/far (e.g. 70/260) or grass turns cream.
5. **Hair/hat**: a box wider than the head looks like a brim. Keep ≤ head width.
6. **Face hidden**: raised arms and big props cover faces; check close-ups.
7. **Light in front of a white coat** = blown white patch; light from behind/above.
8. **Overlay cards vs. title**: hide letters/props that overlap the title area before it fades in.
9. **Foreground clutter** at z close to the camera hides the heroes; remove or push back.
10. **Silhouette levels**: replace materials with one black `MeshBasicMaterial` *after*
    building (`scene.traverse`), keep the sky as a canvas texture; put the sun high in the frame.
11. **Characters must face the travel direction** (`rotation.y = π/2` faces +x).
12. **Instanced studs / big scenes**: fine; but 900 frames × 3 workers ≈ 20 min — iterate on
    stills, not full renders.
13. **Background waits**: use one `until [ frames ≥ N ] && ! pgrep render.js` loop with
    `run_in_background`; stale watchers from killed renders may "complete" early — verify the
    frame count and `pgrep` before encoding.
14. **Encoding**: `-pix_fmt yuv420p -movflags +faststart`; CRF 22 ≈ 35–40 MB for 30 s. Repo push
    warns >50 MB but accepts.
15. **Audio**: give each effect a clear moment; keep SFX-only peak ≈ −11 dBFS; silence the last
    0.15 s and fade-in the first 0.25 s.
16. **Honesty**: say which things were verified by looking at frames and which weren't (audio).
17. **Don't redefine engine globals** in scenes.js/page scripts: `stage, renderer, scenes, W, H, FPS, DURATION,
    CUR, post, pmrem, box, plastic, figure, tick, ease, lerp, clamp, V, rng…` (a helper called `stage()` broke the
    scaffold). Prefix your own helpers (`setupStage`, `hallProps`, …).
18. **Motion QA caveat**: the final title card / fade-out can score "static" (it's mostly black + text). That's fine;
    anything else flagged needs motion. Give the end card a slow pull-back if you want it perfectly clean.
19. **Test the scaffold before trusting it**: `new_reel.py` + `--stills 2,6` takes ~40 s and catches syntax/name bugs.
