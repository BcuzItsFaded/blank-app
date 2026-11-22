---
name: threejs-3d-animation
description: Build complete, runnable 3D scenes, characters and animations with the three.js library (https://github.com/mrdoob/three.js) in a single HTML file. Use when the user asks for 3D, three.js, WebGL, a 3D character, a 3D scene, orbiting cameras, lighting or shaders.
---

# three.js 3D Animation

## Purpose
Turn 3D scene and character requests into one runnable HTML file that uses
three.js for rendering. Pair with `character-animation-coder` for character
rules (original designs, honest limitations, controls, reduced motion).

## Loading three.js
Use an import map with an exact, pinned version from jsDelivr. Do not use
unversioned or major-only URLs.

```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
} }
</script>
<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
</script>
```

- three.js is the only external dependency. No model, texture or HDR downloads:
  build geometry, materials and textures in code (CanvasTexture for patterns).
- Mention in the response that the page needs internet access for the CDN.
  If the user needs fully offline use, offer to vendor `three.module.js`
  next to the HTML file instead.

## Scene setup
- `WebGLRenderer({ antialias: true })`, `setPixelRatio(Math.min(devicePixelRatio, 2))`,
  size from the container, and resize with a `ResizeObserver` that updates
  `camera.aspect` and calls `updateProjectionMatrix()`.
- Set `renderer.outputColorSpace = THREE.SRGBColorSpace` and use
  `ACESFilmicToneMapping` for a polished look.
- Light with a hemisphere light plus one shadow-casting directional light.
  Enable shadows only on objects that need them; keep the shadow map at 1024–2048.
- Add OrbitControls with damping when free camera movement helps; otherwise
  animate the camera along a scripted path.

## Building characters
- Build characters from primitives (Capsule, Sphere, Cylinder, Box, Torus,
  Lathe, Extrude) grouped in a `THREE.Group` hierarchy: root → hips → torso →
  head, with arm and leg groups pivoting at shoulders and hips.
- Put each body part's pivot at its joint (offset the mesh inside a pivot
  group) so rotations look natural.
- Use `MeshToonMaterial` with a small gradient map for a cartoon look, or
  `MeshStandardMaterial` for a soft 3D look. Add outlines with a back-face
  scaled copy when a cel-shaded style is wanted.
- Write one function per character that returns `{ root, parts, update(t) }`.
- Draw original characters, or fan-art interpretations only where the
  `character-animation-coder` rules allow it.

## Animation
- Drive everything from `THREE.Clock` / `renderer.setAnimationLoop` with
  elapsed time; never assume a frame rate.
- Animate joint rotations (walk cycles, anticipation, follow-through), not
  just positions. Use easing helpers and `THREE.MathUtils.damp` for smoothing.
- Make loops seamless by deriving motion from `t % LOOP`, with whole-number
  cycles per loop.
- Include pause/play, restart and a reduced-motion mode that honors
  `prefers-reduced-motion` (stop camera sway and shake, slow or freeze idle motion).

## Performance
- Reuse geometries and materials; merge static scenery where practical.
- Use `InstancedMesh` for many repeated objects (grass, crowds, particles).
- Dispose of geometries, materials and textures you replace.

## Testing
- If a browser is available (e.g. Playwright with Chromium), load the page,
  wait for the first frames, check for console errors and failed requests,
  and screenshot a few moments. Headless Chromium may need
  `--use-angle=swiftshader` or `--enable-unsafe-swiftshader` for WebGL.
- Never claim the page was tested unless it was actually run.

## Response format
Same as `character-animation-coder`: short scene description, how to run it,
the complete file (created on disk when possible), and honest limitations.
