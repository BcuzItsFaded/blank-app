import soundfile as sf, numpy as np, librosa, sys
from kokoro_onnx import Kokoro
k=Kokoro('/root/media/models/kokoro-v1.0.onnx','/root/media/models/voices-v1.0.bin')
lines=[l.strip() for l in open('script.txt') if l.strip()]
parts=[]
for l in lines:
    a,sr=k.create(l,voice='am_michael',speed=1.0,lang='en-us')
    parts+=[a, np.zeros(int(sr*0.3))]
a=np.concatenate(parts).astype(np.float32)
# cut pauses > 0.24 s down to 0.16 s
iv=librosa.effects.split(a,top_db=38,frame_length=1024,hop_length=128)
out=[];prev=0
for s,e in iv:
    gap=s-prev
    if prev>0: out.append(np.zeros(min(gap,int(0.16*sr)) if gap>0.24*sr else gap,dtype=np.float32))
    out.append(a[s:e]);prev=e
b=np.concatenate(out)
sf.write('voice_raw.wav',b,sr)
print('raw length',len(b)/sr)
