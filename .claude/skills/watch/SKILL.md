---
name: watch
description: Summarize a YouTube video from its link. Use when the user pastes a youtube.com or youtu.be URL and asks to watch, summarize, recap, break down, take notes on, or "tl;dw" it, or invokes /watch. Fetches the transcript (with fallbacks for when YouTube blocks the container), then writes a structured summary with key takeaways, chapter-by-chapter notes, named sources/studies, and a fact-check caveat.
---

# /watch — summarize a YouTube video

Claude cannot play video. It works from the **transcript** plus metadata. Be upfront
about that if the transcript can't be found — never invent the content of a video
from its title alone.

## 1. Get the video ID and metadata

Extract the 11-character ID from any URL form (`youtu.be/<id>`, `watch?v=<id>`,
`shorts/<id>`, `embed/<id>`); drop tracking params like `?si=` / `?is=`.

Run the helper — it tries every method below in order and prints what it found:

```bash
python3 -I .claude/skills/watch/scripts/fetch_transcript.py "<url>" --out <scratchpad>/transcript.txt
```

Metadata (title, channel) comes from YouTube's oEmbed endpoint, which usually works
even when the watch page is blocked:
`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`

## 2. Transcript fallback chain

Cloud containers are often rate-limited or bot-checked by YouTube (HTTP 429,
"Sign in to confirm you're not a bot"). Try in order, stop at the first success:

1. `youtube-transcript-api` (pip) — direct caption fetch.
2. `yt-dlp --skip-download --write-auto-subs --sub-langs "en.*"` — captions as VTT.
3. **Transcript mirror sites.** Web-search the exact title in quotes plus the
   channel name, plus "transcript". Sites such as sozai.app publish transcripts with
   chapters; many expose a markdown twin (`.../index.md`). If WebFetch can't resolve
   the host, `curl` through the proxy often still works.
4. Video description / chapter list from search results (partial — say so).
5. If nothing works, tell the user and ask them to paste the transcript
   (YouTube → "…more" → "Show transcript" → copy).

When using a mirror, confirm it's the same video: title, channel, and chapter
timestamps should match the duration. Mention which source you used.

## 3. Write the summary

Use this structure (keep it in your own words; quote at most a short line):

```markdown
# <Video title>
**Channel:** <name> · **Length:** <mm:ss if known> · **Source of transcript:** <captions | mirror site>

## TL;DR
2–3 sentences: the core claim and the conclusion.

## Key takeaways
- 4–7 bullets, each one idea.

## Section by section
### <Chapter / timestamp> — <topic>
1–3 sentences per chapter. Follow the video's own chapters when it has them.

## People, studies & numbers cited
- Name / study / year — what the video says it showed.

## Caveats
Which claims are contested, simplified, or unsourced in the video; what to check.
```

Length guide: ~250–400 words for a video under 15 min, scale up for longer ones.
Match the user's requested format if they ask for something else (bullets only,
a PDF, flashcards, a doc).

## 4. Deliver

- Reply with the summary in chat.
- If the user wants to keep it, save it to `summaries/<slug>.md` (or the format they
  name). See `examples/` for a finished summary.
