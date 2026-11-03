import numpy as np, soundfile as sf, json, librosa, subprocess
SR=48000; DUR=91.5; N=int(SR*DUR)
# ---- music: light curious documentary bed (D minor, 96 bpm), synthesized
t=np.arange(N)/SR; mus=np.zeros(N)
bpm=96; beat=60/bpm
def note(f,start,dur,amp,kind='pluck'):
    i0=int(start*SR); n=int(dur*SR); 
    if i0>=N: return
    n=min(n,N-i0); tt=np.arange(n)/SR
    if kind=='pluck': env=np.exp(-tt*6); w=np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt)+0.1*np.sin(6*np.pi*f*tt)
    else: env=np.minimum(1,tt/0.6)*np.minimum(1,(dur-tt)/0.8); w=np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*f*1.003*tt)+0.25*np.sin(4*np.pi*f*tt)
    mus[i0:i0+n]+=amp*env*w
mid=lambda m:440*2**((m-69)/12)
prog=[[50,53,57,62],[46,50,53,58],[48,52,55,60],[45,49,52,57]]  # Dm Bb C A
bar=4*beat; k=0; s=0.0
while s<DUR:
    ch=prog[k%4]
    note(mid(ch[0]-12),s,bar,0.10,'pad'); note(mid(ch[2]),s,bar,0.05,'pad')
    pat=[0,1,2,3,2,1,3,2]
    for j,p in enumerate(pat):
        note(mid(ch[p]+12),s+j*beat/2,beat*0.9,0.08 if j%2==0 else 0.055)
    for j in range(4): note(mid(ch[0]-24),s+j*beat,0.25,0.12)
    s+=bar; k+=1
mus*=np.minimum(1,t/1.5)*np.minimum(1,(DUR-t)/2.5)
# ---- voice
v,_=librosa.load('voice.wav',sr=SR); voice=np.zeros(N); voice[:min(N,len(v))]=v[:N]
words=json.load(open('words.json'))
speech=np.zeros(N,bool); iv=[]
for w in words:
    a,b=w['s']+0.3,w['e']+0.3+0.08
    if iv and a-iv[-1][1]<0.45: iv[-1][1]=b
    else: iv.append([a,b])
for a,b in iv: speech[int(a*SR):int(b*SR)]=True
rms=lambda x:np.sqrt(np.mean(x**2)+1e-12)
vr=rms(voice[speech]); mr=rms(mus)
g_sp=vr/mr*10**(-10.5/20); g_gap=g_sp*10**(4/20)
env=np.where(speech,g_sp,g_gap).astype(float)
kern=np.ones(int(0.15*SR))/int(0.15*SR); env=np.convolve(env,kern,'same')
mus*=env
# ---- sfx placed by their peaks
lib={'pop':('pop_2356',0.35),'whoosh':('whoosh_1485',0.45),'type':('typewriter_1125',0.12),'hit':('hit_2073',0.5),'tick':('typewriter_1119',0.15),'ding':('ding_1743',0.4)}
cache={}
def load(n):
    if n not in cache:
        x,_=librosa.load(f'/root/media/sfx_dl/{n.split("_")[0]}_{n.split("_")[1]}-preview.mp3',sr=SR,mono=True); x=x/ (np.abs(x).max()+1e-9); cache[n]=(x,int(np.argmax(np.abs(x))))
    return cache[n]
sfx=np.zeros(N)
def place(n,tm,g):
    x,pk=load(n); i0=int(tm*SR)-pk
    a=max(0,i0); b=min(N,i0+len(x))
    if b>a: sfx[a:b]+=g*x[a-i0:b-i0]
evs=json.load(open('ev.json')); last={}
for e in evs:
    ty=e['type']
    if ty=='type' and e['t']-last.get(ty,-9)<0.06: continue
    last[ty]=e['t']; n,g=lib[ty]; place(n,e['t'],g)
for tm in [45.50,79.08]: 
    x,pk=load('explosion_1343'); x=x[:int(2.5*SR)]*np.minimum(1,(2.5-np.arange(min(len(x),int(2.5*SR)))/SR)/1.0); i0=int(tm*SR)-int(np.argmax(np.abs(x[:SR]))); sfx[i0:i0+len(x)]+=0.5*x
sfx*= vr/ (rms(sfx[sfx!=0]) +1e-9) * 10**(-8/20)
mix=voice+mus+sfx
mix/=max(1,np.abs(mix).max()/0.95)
sf.write('mix_pre.wav',mix.astype(np.float32),SR)
print('music gain dB under voice in speech: -10.5; events',len(evs))
