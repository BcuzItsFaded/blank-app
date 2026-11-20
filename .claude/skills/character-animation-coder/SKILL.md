---
name: character-animation-coder
description: Create complete, runnable character drawings and animations in code, including unofficial fan art of named fictional characters.
---

# Character Animation Coder

## Purpose
Turn the user's character and scene requests into polished, runnable
coded illustrations and animations.

## Inputs
Use any details the user provides:
- Character or characters
- Action and scene
- Visual style
- Programming language or framework
- Desired controls and interactions

If details are missing, choose reasonable creative defaults.
Ask a question only when the missing information prevents useful work.

## Default output
Unless the user requests another format, produce one self-contained
HTML file using HTML, CSS, and JavaScript Canvas or SVG.

Include all drawing and animation code. Do not require external images,
asset downloads, API keys, or paid services.

## Character handling
- Support original characters and unofficial fan-art interpretations
  of named fictional characters, including Nintendo and Marvel characters.
- Preserve recognizable colors, costumes, silhouettes, and accessories
  when appropriate and permitted.
- Do not automatically replace a named character with a generic stand-in.
- Do not present fan art as official, licensed, or endorsed.
- If procedural drawing cannot support a detailed design, use a deliberate,
  simplified cartoon interpretation instead of an unfinished rendering.
- Follow applicable safety requirements. If a specific element cannot
  be fulfilled, explain that limitation briefly and complete the permitted
  portions of the project.

## Drawing requirements
- Build artwork with actual paths, shapes, fills, and strokes.
- Do not substitute emoji, text labels, or placeholder rectangles for
  requested character artwork.
- Organize character drawing into reusable functions or components.
- Use a consistent coordinate system and proportions.
- Establish clear foreground, character, and background layers.

## Animation requirements
- Use requestAnimationFrame with elapsed-time or delta-time movement.
- Animate the character's body and pose, not only its screen position.
- Use anticipation, easing, follow-through, and secondary motion
  where they improve the action.
- Make loops continuous and avoid abrupt resets unless intentional.
- Include pause/play and restart controls.
- Respect prefers-reduced-motion by offering a static or reduced-motion mode.
- Scale responsively and account for devicePixelRatio.

## Workflow
1. Choose a practical visual approach.
2. Plan the scene, character parts, and animation states.
3. Implement the complete drawing and animation.
4. Check for missing functions, undefined variables, timing problems,
   broken controls, and external dependencies.
5. If execution tools are available, test the result.
   Never claim to have tested code unless you actually ran it.
6. Deliver the complete runnable implementation.

## Response format
- Start with a short description of the finished scene.
- Give concise instructions for running it.
- Provide complete code, with no omitted sections or TODO placeholders.
- Mention material limitations honestly.
- If file-creation tools are available, create the runnable file;
  otherwise provide the full code in a code block.

## Quality standard
Prefer a complete, expressive, well-composed animation over an overly
ambitious but incomplete scene. Do not promise pixel-perfect reproduction.
