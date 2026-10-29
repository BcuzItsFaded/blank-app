"""Original synthesized score + sound effects for the Harry Potter Shorts.
Usage: python3 score.py <book 1|2> <out.wav>
Everything is generated from scratch (no samples, no existing themes)."""
import sys,numpy as np
from scipy.signal import butter,sosfilt,fftconvolve
SR=44100;DUR=48;N=SR*DUR
book=int(sys.argv[1]);rng=np.random.default_rng(book*7+3)
T=np.arange(N)/SR
L=np.zeros(N);R=np.zeros(N)           # music bus
SL=np.zeros(N);SR_=np.zeros(N)         # sfx bus
def mtof(m):return 440*2**((m-69)/12)
def lp(x,f):return sosfilt(butter(2,f,'low',fs=SR,output='sos'),x)
def bp(x,lo,hi):return sosfilt(butter(2,[lo,hi],'band',fs=SR,output='sos'),x)
def put(bus,x,t0,pan=0.0):
    i=int(t0*SR)
    if i>=N or i<0:return
    x=x[:N-i];l,r=(1-max(pan,0)),(1+min(pan,0))
    bus[0][i:i+len(x)]+=x*l;bus[1][i:i+len(x)]+=x*r
M=(L,R);S=(SL,SR_)
def celesta(m,t0,amp,dec=0.9,pan=0.0):
    t=np.arange(int(SR*min(3.5,dec*5)))/SR;f=mtof(m)
    x=(np.sin(2*np.pi*f*t)+0.45*np.sin(2*np.pi*2*f*t)+0.2*np.sin(2*np.pi*3.01*f*t)+0.12*np.sin(2*np.pi*4.15*f*t))
    x*=np.exp(-t/dec)*(1-np.exp(-t/0.002));put(M,x*amp,t0,pan)
def pad(notes,t0,dur,amp,bright=1500):
    t=np.arange(int(SR*dur))/SR;x=np.zeros_like(t)
    for m in notes:
        for det in(-0.07,0,0.08):
            f=mtof(m)*2**(det/12)
            for h in range(1,7):x+=np.sin(2*np.pi*f*h*t+rng.random()*6.28)/h**1.3
    x=lp(x,bright);a=np.minimum(1,t/1.6)*np.minimum(1,(dur-t)/1.8)
    x=x*a*amp/len(notes);put(M,x,t0,-0.2);put(M,x*0.6,t0+0.011,0.3)
def bass(m,t0,dur,amp):
    t=np.arange(int(SR*dur))/SR;x=np.sin(2*np.pi*mtof(m)*t)*np.minimum(1,t/0.8)*np.minimum(1,(dur-t)/1.2);put(M,x*amp,t0)
def noise(n):return rng.standard_normal(n)
def swish(t0,dur,lo,hi,amp,pan=0.0):
    n=int(SR*dur);x=bp(noise(n),lo,hi);e=np.sin(np.pi*np.arange(n)/n)**2;put(S,x*e*amp,t0,pan)
def click(t0,amp,f=2500,d=0.012):
    n=int(SR*d);x=bp(noise(n),f*0.6,min(f*1.8,20000))*np.exp(-np.arange(n)/(n/5));put(S,x*amp,t0,rng.uniform(-.5,.5))
def bell(t0,f,amp,dec=0.8):
    t=np.arange(int(SR*dec*5))/SR
    x=(np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2.76*f*t)+0.3*np.sin(2*np.pi*5.4*f*t))*np.exp(-t/dec);put(S,x*amp,t0)
def thump(t0,f0,amp,d=0.22):
    t=np.arange(int(SR*d*3))/SR;ph=2*np.pi*(f0*0.5*t+f0*0.5*d*(1-np.exp(-t/d)))
    put(S,np.sin(ph)*np.exp(-t/d)*amp,t0)
def pop(t0,amp=0.3):
    t=np.arange(int(SR*0.12))/SR;put(S,np.sin(2*np.pi*(300+3500*t)*t)*np.exp(-t/0.03)*amp,t0)
def drip(t0,amp=0.22):
    t=np.arange(int(SR*0.25))/SR;put(S,np.sin(2*np.pi*(1900-3000*t)*t)*np.exp(-t/0.035)*amp,t0,rng.uniform(-.6,.6))
def rumble(t0,dur,amp):
    n=int(SR*dur);x=lp(noise(n),110)*np.minimum(1,np.arange(n)/(SR*0.8))*np.minimum(1,(n-np.arange(n))/(SR*0.8));put(S,x*amp*6,t0)
def wind(t0,dur,amp):
    n=int(SR*dur);x=bp(noise(n),250,1400);m=0.6+0.4*np.sin(2*np.pi*0.4*np.arange(n)/SR)
    e=np.minimum(1,np.arange(n)/(SR*0.8))*np.minimum(1,(n-np.arange(n))/(SR*0.8));put(S,x*m*e*amp,t0)
def sparkle(t0,dur,amp,n=9):
    for k in range(n):bell(t0+rng.uniform(0,dur),rng.uniform(2400,4800),amp*rng.uniform(0.4,1),0.25)
def applause(t0,dur,amp):
    n=int(dur*900)
    for k in range(n):
        u=k/n;ts=t0+dur*(u**0.8)
        if rng.random()<min(1,1.2-0.9*u):click(ts+rng.uniform(0,.02),amp*rng.uniform(.4,1),rng.uniform(1500,5000),0.015)
def chug(t0,dur,amp):
    for k in range(int(dur*3.4)):
        ts=t0+k/3.4;n=int(SR*0.14);x=lp(noise(n),700)*np.exp(-np.arange(n)/(SR*0.04));put(S,x*amp*3,ts)
        click(ts+0.07,amp*0.7,3000);click(ts+0.21,amp*0.5,3000)
def wings(t0,dur,amp):
    for k in range(int(dur*3)):
        ts=t0+k/3.0;swish(ts,0.22,200,900,amp,rng.uniform(-.5,.5));thump(ts+0.08,70,amp*0.6,0.12)
def engine(t0,dur,amp):
    t=np.arange(int(SR*dur))/SR;saw=((t*52)%1-0.5)*2;g=(rng.random(int(dur*7)+2)>0.35).astype(float)
    gate=np.interp(t*7,np.arange(len(g)),g);put(S,lp(saw,500)*gate*np.minimum(1,t/0.2)*np.minimum(1,(dur-t)/0.5)*amp,t0)

# --- harmony: one chord per 6 s scene -------------------------------------------------
if book==1:
    CH=[[52,55,59],[48,52,55,60],[55,59,62],[50,54,57,62],[57,60,64],[40,52,55,59],[47,54,59,62],[55,59,62,67]]
    SC=[52,54,55,57,59,60,62,64,66,67,69]       # E dorian-ish, leaning bright
else:
    CH=[[52,55,59],[47,54,59,62],[48,52,55,60],[57,60,64],[54,57,60],[40,52,55,59],[47,51,54,57],[55,59,62,67]]
    SC=[52,54,55,57,59,60,62,64,66,67,69]
dark={5,6} if book==1 else {2,4,5,6}
for s in range(8):
    t0=s*6.0;ch=CH[s];d=s in dark
    pad(ch,t0-0.8,7.6,0.9 if not d else 0.8,1100 if d else 1700)
    bass(ch[0]-12 if ch[0]>45 else ch[0],t0-0.5,7.0,0.55)
    # celesta line: eighth notes at 96 bpm (quarters when dark), chord-tone anchored random walk
    step=0.625 if d else 0.3125;pos=int(rng.integers(3,7));top=[m+12 for m in ch]
    k=0;t=t0+0.2
    while t<t0+5.9:
        if k%4==0:note=top[int(rng.integers(0,len(top)))]
        else:
            cands=[m for m in SC+[x for x in range(52,80)] if m in set(SC)]
            near=sorted(cands,key=lambda m:abs(m+12-prev))[:5] if k else cands
            note=int(rng.choice(near))+12
        if k%4==0 or rng.random()>(0.35 if d else 0.22):
            celesta(note+(12 if s==7 else 0),t,(0.2 if k%4==0 else 0.14)*(0.85 if d else 1.0),0.7 if d else 0.9,rng.uniform(-.4,.4))
        prev=note-12;k+=1;t+=step
# --- sound effects (from the storyboard's own sound notes) ------------------------------
if book==1:
    for k in range(5):swish(0.5+k*0.55,0.4,2500,7000,0.05,rng.uniform(-.7,.7))        # 1 paper flutter
    pop(3.4,0.2)
    for k,f in enumerate([2093,2637,3136]):bell(6.4+k*0.35,f,0.07,0.6)                  # 2 shop bells, bubbling
    for k in range(14):drip(7.5+k*0.28+rng.uniform(0,.1),0.12)
    chug(12.4,5.0,0.07);swish(12.4,5.5,300,1200,0.03)                                  # 3 train
    for k in range(4):click(14.6+k*0.7,0.03,3000)
    wind(18.2,5.2,0.03)                                                                # 4 water lapping, shimmer
    for k in range(10):swish(18.4+k*0.5,0.5,150,600,0.04)
    sparkle(23.0,0.9,0.05,10)
    for k in range(6):pop(24.6+k*0.7+rng.uniform(0,.2),0.2);sparkle(24.8+k*0.7,0.25,0.05,3)   # 5 spell pops, cheer
    applause(28.6,2.4,0.06)
    rumble(32.5,3.6,0.06);thump(33.2,55,0.35,0.4);thump(35.5,50,0.3,0.4)               # 6 stone doors
    rumble(37.8,5.0,0.05);bell(41.0,880,0.05,2.0)                                      # 7 low hum swell
    applause(42.5,5.2,0.10);sparkle(42.3,1.0,0.05,6)                                   # 8 applause
else:
    pop(0.3,0.25)                                                                      # 1 soft pop
    engine(6.4,2.2,0.07);wind(6.3,5.4,0.045);engine(9.6,1.6,0.06)                      # 2 flying car
    for k in range(7):thump(12.9+k*0.62,90,0.12,0.12);click(13.05+k*0.62,0.03,1200)    # 3 echoing footsteps
    rumble(13.0,4.5,0.03)
    for k in range(5):swish(18.7+k*0.9,0.35,1800,6000,0.05,rng.uniform(-.7,.7))        # 4 pages, clock
    for k in range(10):click(18.5+k*0.58,0.07,2200,0.02)
    for k in range(4):swish(24.6+k*0.4,0.35,2500,7000,0.045)                           # 5 pages flutter
    for k in range(2):bell(26.5+k*0.8,660,0.03,1.5)
    for k in range(10):drip(30.7+k*0.45+rng.uniform(0,.15),0.16)                       # 6 water, stone
    rumble(31.5,3.8,0.07);thump(33.4,48,0.4,0.4)
    wings(36.3,4.0,0.07);rumble(36.3,4.5,0.03);sparkle(40.0,1.5,0.05,6)                # 7 wings
    applause(42.6,5.0,0.10);sparkle(42.3,1.0,0.05,6)                                   # 8 cheer
# --- space + mix ---------------------------------------------------------------------------
ir_n=int(SR*2.4);ir=rng.standard_normal(ir_n)*np.exp(-np.arange(ir_n)/(SR*0.7));ir=lp(ir,6000);ir/=np.abs(ir).sum()
def verb(x,w):return x*(1-w)+fftconvolve(x,ir)[:N]*w*8
mus=[verb(L,0.35),verb(R,0.35)];sfx=[verb(SL,0.2),verb(SR_,0.2)]
def fade(x):return x*np.minimum(1,T/1.0)*np.minimum(1,(DUR-T)/2.0)
out=np.stack([fade(mus[0]+sfx[0]),fade(mus[1]+sfx[1])],1);mx=np.abs(out).max();print('peak',mx);out=out/mx*0.7
import wave
w=wave.open(sys.argv[2],'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((out*32767).astype('<i2').tobytes());w.close()
