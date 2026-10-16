"""Builds the RG Street Fighter (2026) breakdown: a 16:9 YouTube video and a 9:16 Short.

Visuals are motion-graphic slides (Pillow + ffmpeg). Swap in Pexels/Pixabay
B-roll in your editor using broll_shotlist.md. Run: python3 make_video.py
"""
import os, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
TMP = os.path.join(OUT, "_build")
FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_MED = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
FPS = 30
XF = 0.5  # crossfade seconds

RED, GOLD, BLUE, GREEN, WHITE = (230, 40, 50), (255, 196, 0), (40, 140, 255), (60, 210, 110), (245, 245, 245)

# Each slide: kicker, headline, bullets, accent, seconds, voiceover (also used as caption)
LONG = [
    ("RG BREAKDOWN", "STREET FIGHTER (2026)", ["Critics: ~45%", "Fans: ~84%", "Who's right?"], RED, 9,
     "Critics gave the new Street Fighter movie a rotten score. Fans are calling it a knockout. So who's right? Let's break it down, no spoilers."),
    ("THE BASICS", "WHAT IS IT?", ["Director: Kitao Sakurai", "In theaters Oct 16, 2026", "Runtime: about 2 hours"], GOLD, 10,
     "Street Fighter is directed by Kitao Sakurai and hit theaters October sixteenth, twenty twenty-six. It runs about two hours."),
    ("THE ROSTER", "STACKED CAST", ["Andrew Koji - Ryu", "Noah Centineo - Ken", "Callina Liang - Chun-Li", "David Dastmalchian - M. Bison"], BLUE, 11,
     "The cast is stacked. Andrew Koji is Ryu, Noah Centineo is Ken, Callina Liang is Chun-Li, and David Dastmalchian plays M. Bison."),
    ("THE ROSTER", "WILD CARDS", ["Jason Momoa - Blanka", "50 Cent - Balrog", "Cody Rhodes - Guile", "Eric Andre - Don Sauvage"], BLUE, 11,
     "And the wild cards: Jason Momoa as Blanka, 50 Cent as Balrog, WWE's Cody Rhodes as Guile, and Eric Andre as Don Sauvage."),
    ("ROUND 1: CRITICS", "TOMATOMETER ~45%", ["Abrupt ending", "Lots of sequel setup", "Script & pacing issues", "Some fights felt flat"], RED, 12,
     "Round one: the critics. The Tomatometer sits in the mid forties. The big complaints? An abrupt ending, a lot of sequel setup, a messy script and pacing, and some fights that felt flat."),
    ("ROUND 2: FANS", "POPCORNMETER ~84%", ["Looks like the games", "Easter eggs everywhere", "Cheesy one-liners (on purpose)", "Animated flashbacks"], GREEN, 12,
     "Round two: the fans. The Popcornmeter is in the low-to-mid eighties. Fans love that it looks and feels like the games, it's packed with Easter eggs and one-liners, and the animated flashbacks are getting love."),
    ("THE GAP", "38-POINT SPLIT", ["Critics judged it as a film", "Fans judged it as Street Fighter", "Both can be right"], GOLD, 11,
     "That's roughly a thirty-eight point gap. Critics judged it as a movie. Fans judged it as Street Fighter. Honestly? Both can be right."),
    ("REALITY CHECK", "EARLY SCORES SKEW HIGH", ["Opening-night crowd = big fans", "Audience score may drop", "CinemaScore still pending"], WHITE, 11,
     "Reality check: early audience scores come from opening-night superfans, so that number could dip. And the CinemaScore isn't out yet."),
    ("HISTORY LESSON", "BEST OF THE BUNCH?", ["1994 Street Fighter: ~12%", "Legend of Chun-Li (2009): ~6%", "2026: ~45%"], GOLD, 11,
     "For context, the 1994 movie sits around twelve percent, and Legend of Chun-Li around six. So by critic scores, this is the best Street Fighter movie yet."),
    ("BOX OFFICE", "TRACKING", ["$25M-$35M domestic opening", "~$70M global start", "Projections, not final"], GREEN, 10,
     "Box office tracking had it opening between twenty-five and thirty-five million domestic, and around seventy million worldwide. Those are projections, so watch for the real numbers."),
    ("SPOILER-FREE", "CREDITS SCENE?", ["YES - there is ONE scene", "Stay when the credits roll", "It teases what's next"], RED, 11,
     "Post-credits: yes, there is one extra scene. Stay in your seat when the credits roll. It teases what's next. That's all I'm saying."),
    ("RG VERDICT", "SHOULD YOU WATCH?", ["Fan of the games? GO.", "Want a tight story? Wait for streaming.", "Bring friends. Turn it up."], GOLD, 12,
     "My verdict: if you love the games, go see it. If you want a tight, serious story, maybe wait for streaming. Either way, bring friends."),
    ("YOUR TURN", "CRITICS OR FANS?", ["Comment your score", "Like + Subscribe", "RG"], RED, 9,
     "Are you team critics or team fans? Drop your score in the comments, and subscribe to RG for more breakdowns."),
]

SHORT = [
    ("RG", "STREET FIGHTER\nCRITICS vs FANS", ["Critics ~45%", "Fans ~84%"], RED, 5,
     "Critics hate the new Street Fighter. Fans love it. Here's why."),
    ("CRITICS SAY", "ROTTEN", ["Abrupt ending", "Too much sequel setup", "Shaky script"], RED, 7,
     "Critics say the ending's abrupt, there's too much sequel setup, and the script is shaky."),
    ("FANS SAY", "KNOCKOUT", ["Looks like the games", "Easter eggs everywhere", "Momoa as Blanka"], GREEN, 7,
     "Fans say it looks like the games, it's full of Easter eggs, and Jason Momoa is Blanka."),
    ("FUN FACT", "FRANCHISE BEST", ["1994: ~12%", "2009: ~6%", "2026: ~45%"], GOLD, 7,
     "And by critic scores, it's still the best Street Fighter movie ever made."),
    ("NO SPOILERS", "CREDITS SCENE?", ["YES - ONE scene", "Stay seated"], BLUE, 6,
     "Credits scene? Yes, one. Stay seated."),
    ("RG", "TEAM CRITICS\nor TEAM FANS?", ["Comment below", "Follow RG"], RED, 5,
     "Team critics or team fans? Comment below."),
]


def font(path, size):
    return ImageFont.truetype(path, size)


def fit(draw, text, path, size, max_w):
    while size > 20:
        f = font(path, size)
        w = max(draw.textlength(l, font=f) for l in text.split("\n"))
        if w <= max_w:
            return f
        size -= 4
    return font(path, size)


def background(W, H, accent):
    img = Image.new("RGB", (W, H), (12, 12, 18))
    d = ImageDraw.Draw(img)
    for y in range(H):  # vertical gradient
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(12 + 20 * t), int(10 + 6 * t), int(22 + 10 * t)))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    r = int(max(W, H) * 0.45)
    g.ellipse([W * 0.72 - r, H * 0.25 - r, W * 0.72 + r, H * 0.25 + r], fill=tuple(int(c * 0.55) for c in accent))
    glow = glow.filter(ImageFilter.GaussianBlur(max(W, H) // 8))
    img = Image.blend(img, Image.eval(Image.merge("RGB", [Image.eval(glow.split()[i], lambda v: v) for i in range(3)]), lambda v: v), 0.0)
    img = Image.composite(glow, img, glow.convert("L").point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(img)
    step = max(W, H) // 14  # diagonal "speed" stripes
    for i in range(-H, W + H, step):
        d.line([(i, H), (i + H, 0)], fill=(255, 255, 255, 8), width=2)
    over = Image.new("RGB", (W, H), (12, 12, 18))
    img = Image.blend(img, over, 0.25)
    return img


def slide(W, H, kicker, head, bullets, accent, caption, path):
    s = W / 1920 if W > H else W / 1080
    img = background(W, H, accent)
    d = ImageDraw.Draw(img)
    m = int(110 * s) if W > H else int(80 * s)
    y = int(H * (0.16 if W > H else 0.18))
    kf = font(FONT_BLACK, int(44 * s))
    kw = d.textlength(kicker, font=kf)
    d.rectangle([m, y, m + kw + 40 * s, y + 70 * s], fill=accent)
    d.text((m + 20 * s, y + 35 * s), kicker, font=kf, fill=(10, 10, 10), anchor="lm")
    y += int(110 * s)
    hf = fit(d, head, FONT_BLACK, int((130 if W > H else 120) * s), W - 2 * m)
    d.multiline_text((m + 6 * s, y + 6 * s), head, font=hf, fill=(0, 0, 0), spacing=int(10 * s))
    d.multiline_text((m, y), head, font=hf, fill=WHITE, spacing=int(10 * s))
    hb = d.multiline_textbbox((m, y), head, font=hf, spacing=int(10 * s))
    y = hb[3] + int(30 * s)
    d.rectangle([m, y, m + 220 * s, y + 10 * s], fill=accent)
    y += int(60 * s)
    bf = font(FONT_BOLD, int((58 if W > H else 64) * s))
    for b in bullets:
        bf2 = fit(d, b, FONT_BOLD, bf.size, W - 2 * m - 60 * s)
        d.rectangle([m, y + 18 * s, m + 22 * s, y + 40 * s], fill=accent)
        d.text((m + 50 * s, y), b, font=bf2, fill=WHITE)
        y += int((90 if W > H else 115) * s)
    # caption bar (burned-in subtitles of the voiceover)
    cf = font(FONT_MED, int((36 if W > H else 44) * s))
    width = 70 if W > H else 34
    lines = textwrap.wrap(caption, width)[:4]
    lh = int((50 if W > H else 60) * s)
    cy = H - int((60 if W > H else 330) * s) - lh * len(lines)
    bar = Image.new("RGBA", (W, lh * len(lines) + int(40 * s)), (0, 0, 0, 170))
    img.paste(bar, (0, cy - int(20 * s)), bar)
    d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        d.text((W // 2, cy + i * lh), l, font=cf, fill=(255, 255, 255), anchor="ma")
    # RG watermark
    wf = font(FONT_BLACK, int(54 * s))
    d.text((W - m, int(70 * s)), "RG", font=wf, fill=accent, anchor="ra")
    img.save(path)


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def music(dur, path):
    # Royalty-free synthesized beat (kick + hat + bass pulse), generated here so there are no licensing issues.
    expr = ("0.55*sin(2*PI*t*(45+120*exp(-25*mod(t,0.5))))*exp(-7*mod(t,0.5))"
            "+0.08*(random(0)*2-1)*exp(-60*mod(t+0.25,0.5))"
            "+0.12*sin(2*PI*55*t)*(0.5+0.5*sin(2*PI*t/4))")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=44100:d={dur}",
         "-af", f"lowpass=f=6000,volume=0.6,afade=t=in:d=1,afade=t=out:st={dur-2}:d=2",
         "-ac", "2", path])


def build(slides, W, H, name):
    os.makedirs(TMP, exist_ok=True)
    clips = []
    for i, (k, h, b, a, sec, vo) in enumerate(slides):
        png = os.path.join(TMP, f"{name}_{i:02d}.png")
        slide(W * 2, H * 2, k, h, b, a, vo, png)  # render 2x so the slow zoom stays crisp
        mp4 = os.path.join(TMP, f"{name}_{i:02d}.mp4")
        n = int(sec * FPS)
        zoom = f"zoompan=z='1+0.06*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
        run(["ffmpeg", "-y", "-loop", "1", "-i", png, "-vf", f"{zoom},format=yuv420p",
             "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "18", mp4])
        clips.append((mp4, sec))
    # chain xfades
    inputs, fc, last, offset = [], [], "0:v", 0.0
    trans = ["slideleft", "fadewhite", "wipeleft", "smoothleft", "circleopen", "slideup"]
    for i, (mp4, sec) in enumerate(clips):
        inputs += ["-i", mp4]
        if i == 0:
            offset = sec - XF
            continue
        out = f"v{i}"
        fc.append(f"[{last}][{i}:v]xfade=transition={trans[i % len(trans)]}:duration={XF}:offset={offset:.3f}[{out}]")
        last, offset = out, offset + sec - XF
    total = sum(s for _, s in clips) - XF * (len(clips) - 1)
    wav = os.path.join(TMP, f"{name}_music.wav")
    music(total, wav)
    inputs += ["-i", wav]
    final = os.path.join(OUT, f"{name}.mp4")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", f"[{last}]",
         "-map", f"{len(clips)}:a", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final])
    # SRT captions + voiceover script with timestamps
    t, srt, script = 0.0, [], []
    for i, (k, h, b, a, sec, vo) in enumerate(slides):
        st, en = t, t + sec - (XF if i < len(slides) - 1 else 0)
        f = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}"
        srt.append(f"{i+1}\n{f(st)} --> {f(en)}\n{vo}\n")
        script.append(f"[{f(st)[3:8]}] {k} - {h.replace(chr(10), ' ')}\n{vo}\n")
        t = en
    open(os.path.join(OUT, f"{name}.srt"), "w").write("\n".join(srt))
    open(os.path.join(OUT, f"{name}_voiceover_script.txt"), "w").write("\n".join(script))
    print(f"{final}  ({total:.1f}s)")


if __name__ == "__main__":
    build(LONG, 1920, 1080, "street_fighter_2026_youtube")
    build(SHORT, 1080, 1920, "street_fighter_2026_short")
