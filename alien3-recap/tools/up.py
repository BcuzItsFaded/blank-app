import sys, torch, torch.nn as nn, torch.nn.functional as F, numpy as np
from PIL import Image
class RDB(nn.Module):
    def __init__(s,nf=64,gc=32):
        super().__init__()
        s.conv1=nn.Conv2d(nf,gc,3,1,1);s.conv2=nn.Conv2d(nf+gc,gc,3,1,1);s.conv3=nn.Conv2d(nf+2*gc,gc,3,1,1)
        s.conv4=nn.Conv2d(nf+3*gc,gc,3,1,1);s.conv5=nn.Conv2d(nf+4*gc,nf,3,1,1);s.l=nn.LeakyReLU(0.2,True)
    def forward(s,x):
        x1=s.l(s.conv1(x));x2=s.l(s.conv2(torch.cat((x,x1),1)));x3=s.l(s.conv3(torch.cat((x,x1,x2),1)))
        x4=s.l(s.conv4(torch.cat((x,x1,x2,x3),1)));x5=s.conv5(torch.cat((x,x1,x2,x3,x4),1));return x5*0.2+x
class RRDB(nn.Module):
    def __init__(s,nf=64):
        super().__init__();s.rdb1=RDB(nf);s.rdb2=RDB(nf);s.rdb3=RDB(nf)
    def forward(s,x): return s.rdb3(s.rdb2(s.rdb1(x)))*0.2+x
class Net(nn.Module):
    def __init__(s,nb=6):
        super().__init__()
        s.conv_first=nn.Conv2d(3,64,3,1,1);s.body=nn.Sequential(*[RRDB() for _ in range(nb)])
        s.conv_body=nn.Conv2d(64,64,3,1,1);s.conv_up1=nn.Conv2d(64,64,3,1,1);s.conv_up2=nn.Conv2d(64,64,3,1,1)
        s.conv_hr=nn.Conv2d(64,64,3,1,1);s.conv_last=nn.Conv2d(64,3,3,1,1);s.l=nn.LeakyReLU(0.2,True)
    def forward(s,x):
        f=s.conv_first(x);f=f+s.conv_body(s.body(f))
        f=s.l(s.conv_up1(F.interpolate(f,scale_factor=2,mode='nearest')))
        f=s.l(s.conv_up2(F.interpolate(f,scale_factor=2,mode='nearest')))
        return s.conv_last(s.l(s.conv_hr(f)))
net=Net();sd=torch.load(sys.argv[1],map_location='cpu');sd=sd.get('params_ema',sd.get('params',sd));net.load_state_dict(sd);net.eval()
src=Image.open(sys.argv[2]).convert('RGB');out=sys.argv[3]
rows=[(1198,1305),(1366,1467),(1534,1636)];cols=[(1,293),(297,586),(590,880),(885,1169)]
torch.set_num_threads(4)
k=0
for (y0,y1) in rows:
  for (x0,x1) in cols:
    k+=1
    im=src.crop((x0,y0,x1,y1))
    im=im.resize((im.width*3//2,im.height*3//2),Image.LANCZOS)
    t=torch.from_numpy(np.asarray(im).astype(np.float32)/255).permute(2,0,1)[None]
    with torch.no_grad(): o=net(t).clamp(0,1)[0].permute(1,2,0).numpy()
    Image.fromarray((o*255).round().astype(np.uint8)).save(f"{out}/p{k:02d}.png")
    print(k, im.size, flush=True)
