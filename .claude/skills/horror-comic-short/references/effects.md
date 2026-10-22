# Effects, cameras, moods and transitions

Use these keywords in each panel of `assets/project.js`. Pick them from the panel's CAMERA / FX notes and from what the art shows.

## `fx` keywords (visual + sound)

| Keyword | Visual | Sound | Use for |
|---|---|---|---|
| `title` | Animated dripping title card (project `title` + `tagline`) | Impact hit + whoosh | First panel only |
| `candle` | Flickering warm light pool at `light`, breathing shadows, embers | Crackle ticks | Any panel with a candle, lamp or fire; set `light` |
| `fog` | Two drifting fog layers (parallax) | Wind bed | Graveyards, crypts, reveals, night |
| `shadow` | Dark band sweeping across + top darkness | (none) | Dread, someone watching, despair |
| `rain` | Diagonal rain streaks, cold tint | Rain ambience | "Rain outside", storms |
| `dust` | Floating dust motes | (none) | Old shops, attics, quiet suspense |
| `gold` | Pulsing gold glow at `light` + rising sparkles | (none) | Magic objects, wishes, treasure |
| `wish` | (none) | Shimmer of ascending bells | A wish or spell being cast |
| `money` | Falling bills and coins, glints | Cash flutter | Wealth, jackpot |
| `coins` | (none) | Coin clinks + cash | Pair with `money` |
| `tv` | Scanlines, roll bar, RGB jitter | (none) | TV / monitor / news shots |
| `news` | (none) | Broadcast beeps, muffled anchor, static | News reports |
| `sting` | (none) | Dissonant shock chord + hit (at the reveal if `undead`) | Shock beats |
| `warm` | Warm orange grade | (none) | Love, happiness, nostalgia |
| `bokeh` | Soft drifting light circles | (none) | Romance, montage, dreams |
| `cold` | Desaturated blue grade | (none) | Hospital, death, winter |
| `beep` | Green monitor pulse | Heart-monitor beeps | Hospital |
| `flatline` | Darkens over the last 1.5 s | Long flatline tone | Death in hospital (pair with `beep`) |
| `darkglow` | Pulsing red edge glow | (none) | Desperation, evil power |
| `heartbeat` | Zoom pulses with the beat | Accelerating heartbeat | Tension, fear |
| `undead` | Dread build → white flash → RGB split → green rot grade + shake at `revealAt` | Riser → impact + glitch | THE monster/corpse reveal |
| `undead-grade` | Green rot grade only | (none) | Panels after the reveal |
| `scream` | (none) | Synthesized scream | Screaming faces |
| `shake` | Continuous camera shake | Low boom | Terror, earthquakes, struggle |
| `lowboom` | (none) | Deep swelling boom | "Dramatic low sound", warnings |
| `chime` | (none) | Shop-door bell | Entering shops, eerie chimes |
| `shop` | (none) | Clock ticks | Shop ambience |
| `laugh` | (none) | Creepy cackle | Crypt-keeper style host, villains |
| `lightning` | Double white flash | (none) | Storms, endings |
| `thunder` | Shake | Thunder crack + rumble | Pair with `lightning` |
| `end` | Hides watermark (the art has the logo) | Bell toll | Final "THE END" panel |

## `camera`

Presets: `push` (zoom in), `push-slow`, `pull` (zoom out / reveal wide), `pan-left`, `pan-right`, `drift`.
Custom: `{ "z": [zoomFrom, zoomTo], "f": [[fx, fy], [fx, fy]] }`, where focus points are in panel
coordinates (0..1). The camera travels from the first focus to the second; the 2.5D depth layer pops the
second focus. Aim the second focus at the subject: a face, the statue, the monster.

Matches for storyboard notes:
- "Close-up" → push toward the face
- "Slow zoom on X" → `push-slow`, or custom with focus on X
- "Wide shot" → `pull`
- "Reveal shot" → custom push onto the monster + `undead`
- "Montage" → `pan-left` / `pan-right`
- "Medium shot" → `drift`

## `mood` (generative score per panel)

`creepy` (music box + drone), `sad` (slow minor piano), `eerie` (sparse chimes), `happy` (bright major
arpeggio), `somber` (low minor), `romantic` (warm maj7 pads), `intense` (pulsing bass + full drone),
`shock` (dissonant cluster), `end` (fading drone).

## `transition` (into this panel)

`fade` (default, alternates with `zoom`), `zoom`, `dip` (through black), `flash` (white), `glitch`,
`cut`. Use `flash` / `glitch` for shocks, `dip` for time passing or death.

## Other panel fields

- `light: [x, y]`: candle/glow position in panel coordinates (for `candle`, `gold`).
- `revealAt: 0.22`: fraction of the panel where the `undead` flash hits.
- `fill: 0.42`: per-panel band height; use a lower value for text-heavy end cards so the whole card fits.
