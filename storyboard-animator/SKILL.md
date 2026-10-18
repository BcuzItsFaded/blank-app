---
name: storyboard-animator
description: Turns the user's own images, or a script they write, into an animated, narrated vertical short video (9:16) using the Calliope video tools. Use this whenever the user wants to animate pictures or photos, "bring these images to life", make their images move, turn a script/story/idea into a storyboard, storyboard a script, or make an animated video, short, Reel, TikTok or YouTube Short from images or a script — even if they don't say "Calliope" or "storyboard".
---

# Storyboard Animator

Two jobs, one pipeline:

- **Animate images**: the user gives images (and maybe a script or topic). Each image becomes a scene, animated with AI motion, with narration over it.
- **Storyboard a script**: the user gives a script or idea. You break it into a storyboard, they approve it, then Calliope generates and animates the scenes with a narrator reading the script.

The user's defaults are **vertical short (9:16, `content_type: "short"`)**, **narrator voiceover** (`voiceover: true`), and **storyboard approval before spending credits**. Follow these unless the user asks for something different in their request.

## Ground rules (why they matter)

- **Calliope spends real credits.** Every COST tool (`create_video`, `animate_clip`, `resume_job`, `character_reference` regenerations, `generate_clip`) has an estimate step. Run the estimate, show the exact number it returns (never guess a number), and wait for a clear "yes" before calling it with `confirm: true`. Surprise charges are the fastest way to lose the user's trust.
- **Narration is a separate audio track**, so characters in the animation must not talk. Never put talking, lip-sync or speaking to camera into a `video_prompt`.
- **Generation is asynchronous.** After you start a job, tell the user what's happening and roughly how long it takes (assets: minutes, render: 2–10 min). Check with `get_job` / `get_editor` when they come back. Don't loop on sleep.
- If a Calliope call fails with "Upgrade required" or no credits, stop. Tell the user plainly that their Calliope plan needs upgrading or topping up, and offer the storyboard as a document they can keep in the meantime.
- Before complex Calliope work, try `read_skill` with path `best-practices-create-video/SKILL.md`. It explains which field each instruction belongs to. If that call fails, continue with this guide.

## Step 0: Figure out the mode

- Images attached or referenced → **Mode A (animate images)**. If they also gave a script, use it as the narration.
- Only text (a script, a story or an idea) → **Mode B (storyboard a script)**.
- Images plus "storyboard this" → Mode B, passing the images as `character_references` (labeled "Main character", "Object", "Background", etc.) so the generated scenes match them.

Pick a template either way: run `list_templates {content_type: "short"}`. Prefer templates with the `ANIMATED` badge. Show the top 3–4 (name plus cover) and let the user pick. If they don't care, use the first animated one.

## Step 1: Build the storyboard (both modes)

Always write a storyboard first and show it in chat as a table. This is the review point the user asked for: it's cheap to change here and expensive to change later.

| # | Narration (spoken) | Visual (what's on screen) | Motion (camera + subject) | ~Sec |
|---|---|---|---|---|

How to write it well:
- **Narration**: the user's script, split at natural beats. Don't rewrite their words unless they asked for help writing. If they gave only an idea, write a tight script: hook in the first line, about 150 words per minute, and 280–1120 characters total for a short (Calliope's limit).
- **Visual**: in Mode A, name the image ("Image 2: dog on beach"). In Mode B, describe the shot concretely: subject, setting, lighting, style. Keep characters described the same way in every row so they stay consistent.
- **Motion**: one clear move per scene, such as slow push-in, pan left, the subject turns their head, waves crash, or hair blows in the wind. Subtle, physical motion animates far better than big, complicated action.
- **Timing**: roughly 3–6 s per scene. A short is usually 30–60 s.
- In Mode A, use one scene per image, in the user's order unless the story suggests a better one (say so if you reorder).

Then ask: "Want any changes before I price it out?" Iterate until they approve.

## Step 2: Price it and create the job

1. `estimate_generation_cost` with `content_type: "short"`, `template_id`, `target_duration_sec`, `voiceover: true`, and the same `animate` value you'll generate with (see the mode sections). Report the cost with the `image_model`, `video_model` and `scene_frequency` it returns. Get a yes.
2. `create_video` with **`auto_accept: false`** and **`auto_render: false`**. This makes Calliope pause after narration and before the final render, which gives the user review points.

Then follow the mode-specific steps.

### Mode A — animate the user's images

Calliope builds scenes from a script, so the trick is to let it lay out the timeline and then swap the user's images into the scenes.

1. Create the job with `script_params.script` set to the approved narration and `content_instructions` set to a short brief listing the scenes in order. Use `animate: false` so you don't pay to animate AI images you're about to replace. Pick `visual_frequency` so the scene count is close to the image count (`high` ≈ one scene every 2 s, `balanced` ≈ 4 s, `low` ≈ 6 s).
2. Narration pause: `get_editor` shows the audio. Let the user listen and confirm (`replace_audio` to change the voice). Then `resume_job` (estimate, confirm) to generate assets. Skip the character sheet with `skip_character_reference: true`, because the user's images are the visuals.
3. When assets are done, `get_editor` lists the scenes and their `promptKey`s. Map image → scene by timing against the storyboard. If there are more scenes than images, either let a related image span two scenes or keep a fitting AI scene. Tell the user which you chose.
4. Upload each image: `register_upload {job_id, mediaType: "image", file_name, file_size}` returns an `upload_url`. PUT the raw bytes with `curl -X PUT -H "Content-Type: <content_type>" --data-binary @file "<upload_url>"`. Then call `replace_clip {job_id, prompt_key, path, media_type: "image"}`. The limit is 5 MB per image (PNG, JPG or WEBP). Downscale larger images first, for example with `ffmpeg -i in.jpg -vf scale=1080:-2 out.jpg`. Confirm the image → scene mapping before replacing, because `replace_clip` has no undo.
5. Animate: `animate_clip` with `mode: "all"` (or a `promptKeys` list). Estimate, confirm, then execute. Write a `video_prompt` per scene from the storyboard's Motion column (60+ words: camera move, what moves in the image, pacing, mood, and no talking). Different motion per scene means one call per scene. Batch scenes that share a motion style into one call.
6. Go to Step 3.

### Mode B — storyboard a script

1. Create the job with `animate: true`, `script_params.script` set to the approved narration (exact words), and `content_instructions` set to the Visual and Motion columns as a scene-by-scene brief, with a description of the consistent characters and style. If the user gave reference images, pass them in `character_references`.
2. Narration pause: let the user hear it (`get_editor`). Adjust with `update_script` or `replace_audio` if needed.
3. Character sheet: `character_reference` with a description of the main character(s), drawn from the storyboard. The first sheet is free. Each regeneration costs 14 credits, so confirm before redoing it. Show it with `get_clip {sheet_index: 0}` and iterate until the user approves.
4. `resume_job` (estimate, confirm) to generate and animate the scenes.
5. Go to Step 3.

## Step 3: Review and render

1. When assets are done, show the scenes (`get_clip`) and ask if any need fixing. Use `regenerate_clip` for a bad AI scene, or `animate_clip` with a new `video_prompt` for bad motion. Estimate before each.
2. Render only when the user explicitly approves it: `resume_job` (estimate, confirm). Edits or uploads don't count as render approval.
3. `get_job` until Completed, then give them the video (the `video_url` expires in 90 min, so call again for a fresh link).
4. Offer, in one line, a thumbnail (`create_thumbnails`) or caption style changes.

## Keep the user oriented

At each pause, tell the user in one or two lines where things stand and what you need from them, for example: "Narration's ready, have a listen. Next I'll generate the scenes (est. X credits)." Non-technical users shouldn't need to know tool names. Talk about scenes, voice, credits and the final video.

See `references/motion-prompts.md` for example `video_prompt`s and storyboard rows.
