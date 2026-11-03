import cv2, numpy as np, json
cap=cv2.VideoCapture('video.mp4'); prev=None; d=[]
while True:
    ok,f=cap.read()
    if not ok: break
    g=cv2.resize(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(192,108)).astype(np.float32)
    d.append(0 if prev is None else float(np.mean(np.abs(g-prev)))); prev=g
d=np.array(d); thr=np.median(d)*8+4
big=[i for i in range(1,len(d)) if d[i]>thr]
print('spikes at s:',[round(i/60,2) for i in big])
