---
name: plot-twist-script
description: Write a "PlotTwistWith R&A" storyboard script for a book series, movie franchise, TV show or game: easy summaries, major plot twists, endings explained, a storyboard panel guide and a YouTube Shorts plan with narration. Use when the user names a story/franchise (or pastes notes about one) and wants a recap script, storyboard, plot-twist breakdown, "ending explained" or Shorts narration in this channel's format.
---

# PlotTwistWith R&A — storyboard script writer

Turn whatever the user provides (a franchise name, a list of titles, pasted notes, a
storyboard image) into a script in the channel's house format. The canonical example
is `references/example-hunger-games.md` — read it before writing and match its tone,
length and structure.

## 1. Gather the inputs

From the user's message, work out:

- **Franchise / work(s)** to cover, and how many entries (books, films, seasons…).
- **Order**: default to *chronological story order* (prequels first). Use release
  order only if the user asks. Say which order you used in the intro.
- **Panels per entry**: default 3 (setup / turning point / ending). If the user
  attached a storyboard image, count its rows and panels and map them to entries —
  describe what each panel actually shows.
- **Anything the user supplied** (notes, character names, their own twists) — this
  takes priority over your memory.

Only ask a question if the franchise itself is unclear. Otherwise pick the defaults
and go.

## 2. Get the facts right

This is a spoilers channel; a wrong twist ruins the video.

- Use what you know for well-established works. For recent releases, obscure works,
  or anything you are not sure of, look it up (WebSearch) before writing.
- Never invent plot points, deaths, or endings. If something is genuinely ambiguous
  in the source (e.g. a character's fate is left open), say so plainly.
- Cite a source name (e.g. "SparkNotes", "Wikipedia") after a section only when you
  actually used it.

## 3. Write the script — exact structure

Follow this order and these headings. Plain, punchy sentences; a 12-year-old should
follow it. No filler, no hedging.

```
<Franchise> — Complete <N>-<Book/Film/Season> Storyboard

PlotTwistWith R&A | Easy summaries | Major plot twists | Endings explained

This covers <what is covered, by whom>.

Full spoilers ahead. <One sentence on the order you'll use and the arc it follows.>

The <N> <entries> in story order

1. <Title>

<Short hook subtitle — 3 to 8 words, curiosity-driven>

Easy summary: <2–3 sentences: who, what they want, what's at stake.>

Plot twist: <1–3 sentences: the biggest reveal or betrayal.>

Ending: <2–3 sentences: how it ends and what it changes going forward.>

2. ... (repeat for every entry)

What the entire series really means

<1 paragraph tying all entries together through the villain/theme/through-line.>

<1–2 sentence final message.>

How to read your storyboard

The image above has <P> panels: <k> for each <entry>. Read left to right, one row at a time.

Row | <Entry type> | Left panel | Middle panel | Right panel
1   | <Title>      | <3–5 words>| <3–5 words>  | <3–5 words>
...

How to turn this into YouTube Shorts

I recommend <N> separate videos, one for each <entry>, rather than squeezing all
<N> into 90 seconds.

Each video can follow this simple structure:

* 0:00–0:10: A shocking opening hook
* 0:10–0:40: Easy story summary
* 0:40–1:05: Biggest plot twist
* 1:05–1:25: Ending explained
* 1:25–1:30: Closing question

<Note that the storyboard is a full-series reference; each entry can be expanded
into 10 vertical comic illustrations with a matching narration script.>

<Recommend a viewing/upload order and why.>
```

Adapt the panel table columns to the panel count (e.g. 4 panels → Panel 1–4). For a
single work, skip "in story order" and the cross-series section becomes "What the
story really means".

## 4. Optional add-ons (offer them, or write them if asked)

- **Shorts narration script** for one entry — see `references/shorts-template.md`:
  ~200–230 spoken words for 90 seconds, split into 10 vertical panels with timestamp,
  narration line, on-screen caption and an image prompt for each.
- **Storyboard image prompt** — one prompt for a grid image like the user's example:
  "<rows> rows × <cols> panels, widescreen comic-book illustration, bold ink lines,
  cinematic lighting, consistent character designs", followed by one short line per
  panel in reading order. Describe characters by look (hair, clothing, props) so
  they stay consistent across panels.

## 5. Deliver

Put the finished script in the chat. If it is long or the user wants a file, also
save it as `scripts/<franchise-slug>.md` in the working directory.
