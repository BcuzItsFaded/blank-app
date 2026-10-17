import sys, subprocess, wave, numpy as np
from PIL import Image, ImageDraw, ImageFilter
SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS, DUR = 1080, 1920, 30, 20.0
N = int(FPS*DUR)
rng = np.random.default_rng(7)

base = Image.open(SRC).convert("RGB").resize((1080, 1935), Image.LANCZOS)
B = np.asarray(base).astype(np.float32)/255.0
BH, BW = B.shape[:2]
yy, xx = np.mgrid[0:BH, 0:BW].astype(np.float32)

def ell(cx, cy, rx, ry, p=2.0):
    d = np.sqrt(((xx-cx)/rx)**2 + ((yy-cy)/ry)**2)
    return np.clip(1-d, 0, 1)**p

# window mask: bluish pixels in the upper-left window area
win_box = ((xx < 440) & (yy > 60) & (yy < 1000)).astype(np.float32)
blueish = np.clip((B[...,2]-B[...,0])*6, 0, 1)
win = np.asarray(Image.fromarray((win_box*blueish*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
lamp = ell(795, 760, 330, 300, 1.6)
lampcore = ell(795, 752, 110, 70, 1.2)
beam = ell(720, 1090, 300, 130, 1.3)
vign = np.clip(1 - 0.55*(((xx-BW/2)/(BW*0.75))**2 + ((yy-BH/2)/(BH*0.7))**2), 0, 1)[...,None]
warm = np.array([1.0, 0.72, 0.38], np.float32)
cool = np.array([0.75, 0.85, 1.0], np.float32)

flashes = [4.2, 11.0, 16.6]
def lightning(t):
    v = 0.0
    for f in flashes:
        for off, a in ((0, 1.0), (0.12, 0.6), (0.28, 0.35)):
            d = t-(f+off)
            if d >= 0: v += a*np.exp(-d*14)
    return min(v, 1.4)

# rain drops (behind glass) and dust motes
drops = np.column_stack([rng.uniform(-100, 460, 260), rng.uniform(0, 1000, 260), rng.uniform(1400, 2200, 260), rng.uniform(25, 60, 260)])
motes = np.column_stack([rng.uniform(450, 1050, 70), rng.uniform(650, 1250, 70), rng.uniform(-8, 8, 70), rng.uniform(-10, 4, 70), rng.uniform(0, 6.28, 70)])
lamp_noise = rng.normal(0, 1, N+10)
lamp_noise = np.convolve(lamp_noise, np.ones(4)/4, "same")

ff = subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
    "-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","video_noaudio.mp4"], stdin=subprocess.PIPE)
dt = 1/FPS
for i in range(N):
    t = i*dt
    F = B.copy()
    # rain layer
    lay = Image.new("L", (BW, BH), 0); d = ImageDraw.Draw(lay)
    drops[:,1] += drops[:,2]*dt; drops[:,0] += drops[:,2]*dt*0.12
    wrap = drops[:,1] > 1000
    drops[wrap,1] = rng.uniform(-80, 0, wrap.sum()); drops[wrap,0] = rng.uniform(-100, 400, wrap.sum())
    for x, y, v, L in drops:
        d.line([(x, y), (x-L*0.12, y-L)], fill=int(90+v/20), width=2)
    R = np.asarray(lay.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)/255
    F += (R*win)[...,None]*cool*0.35
    # lamp flicker (mostly steady, occasional dip)
    fl = 1 + 0.05*lamp_noise[i] + (-0.35 if 9.6 < t < 9.75 else 0)
    F += (lamp*(fl-1)*0.8 + lampcore*(fl-1)*0.6)[...,None]*warm*0.5
    F *= (1 + lamp*(fl-1)*0.25)[...,None]
    # flashlight beam wobble
    bw = 1 + 0.06*np.sin(t*2.3) + 0.03*np.sin(t*7.1)
    F += (beam*(bw-1))[...,None]*np.array([1, .9, .7], np.float32)*0.8
    # dust motes in beam / lamp light
    ml = Image.new("L", (BW, BH), 0); md = ImageDraw.Draw(ml)
    motes[:,0] += motes[:,2]*dt + np.sin(t+motes[:,4])*0.3; motes[:,1] += motes[:,3]*dt
    for x, y, *_ , ph in motes:
        md.ellipse([x-1.6, y-1.6, x+1.6, y+1.6], fill=int(140+100*np.sin(t*1.5+ph)))
    M = np.asarray(ml.filter(ImageFilter.GaussianBlur(1))).astype(np.float32)/255
    F += (M*np.clip(beam*1.5+lamp, 0, 1))[...,None]*np.array([1, .85, .6], np.float32)*0.6
    # lightning
    L = lightning(t)
    if L > 0.01:
        F += (win*L*0.9)[...,None]*np.array([.85, .92, 1], np.float32)
        F = F*(1+0.35*L) + 0.05*L*cool
    F *= vign
    # slow push-in toward the desk
    z = 1 + 0.12*(t/DUR)**1.2
    cw, ch = BW/z, H/z
    cx = BW/2 + (680-BW/2)*(t/DUR)*0.5; cy = BH/2 + (1000-BH/2)*(t/DUR)*0.5
    shake = (np.sin(t*0.9)*2, np.cos(t*0.7)*2)
    x0 = np.clip(cx-cw/2+shake[0], 0, BW-cw); y0 = np.clip(cy-ch/2+shake[1], 0, BH-ch)
    img = Image.fromarray((np.clip(F, 0, 1)*255).astype(np.uint8)).resize((W, H), Image.BICUBIC, box=(x0, y0, x0+cw, y0+ch))
    out = np.asarray(img).astype(np.int16)
    out += rng.normal(0, 5, (H, W, 1)).astype(np.int16)  # film grain
    ff.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
    if i % 60 == 0: print(i, flush=True)
ff.stdin.close(); ff.wait()

# ---- audio: rain bed, droplets, thunder ----
SR = 44100; n = int(SR*DUR); t = np.arange(n)/SR
def lp(x, a):
    from scipy.signal import lfilter
    return lfilter([a], [1, a-1], x)
try:
    import scipy  # noqa
except ImportError:
    def lp(x, a):
        y = np.empty_like(x); s = 0.0
        for k in range(len(x)): s += a*(x[k]-s); y[k] = s
        return y
ch = []
for c in range(2):
    w = rng.normal(0, 1, n)
    rain = lp(w, 0.35)*0.18 + (w - lp(w, 0.05))*0.05
    drip = np.zeros(n); idx = rng.integers(0, n-2000, 900)
    for k in idx: drip[k:k+600] += rng.uniform(.05, .2)*np.exp(-np.arange(600)/60)*np.sin(np.arange(600)*rng.uniform(.3, .8))
    thunder = np.zeros(n)
    for f in flashes:
        s = int((f+0.7)*SR); L = int(4.5*SR); e = min(L, n-s)
        b = lp(lp(rng.normal(0, 1, e), 0.004), 0.01)
        env = (1-np.exp(-np.arange(e)/(0.08*SR)))*np.exp(-np.arange(e)/(1.3*SR))
        env *= 1 + 0.6*np.abs(np.sin(np.arange(e)/SR*3.3))
        thunder[s:s+e] += b/np.max(np.abs(b))*env*0.8
    room = 0.03*np.sin(2*np.pi*55*t)*0  # placeholder for hum (off)
    x = rain + drip*0.5 + thunder + room
    fade = np.minimum(1, np.minimum(t/1.5, (DUR-t)/1.5))
    ch.append(x*fade)
A = np.stack(ch, 1); A = A/np.max(np.abs(A))*0.85
with wave.open("audio.wav", "wb") as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((A*32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","video_noaudio.mp4","-i","audio.wav",
    "-vf","fade=in:0:30,fade=out:st=%.2f:d=1"%(DUR-1),"-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",OUT], check=True)
print("done")
