import sys, numpy as np, torch
from PIL import Image
sys.path.insert(0, sys.argv[1])
exec(open(sys.argv[1] + '/up.py').read().split('net=Net()')[0])
net = Net(); sd = torch.load(sys.argv[2], map_location='cpu'); sd = sd.get('params_ema', sd.get('params', sd)); net.load_state_dict(sd); net.eval(); torch.set_num_threads(4)
P = sys.argv[3]
# art region per panel (y range within each raw cell), above the burned caption
cut = {1: (42, 288), 2: (42, 296), 3: (42, 250), 4: (42, 255), 5: (70, 268), 6: (42, 245), 7: (42, 312), 8: (42, 268)}
for k, (a, b) in cut.items():
    im = Image.open(f'{P}/assets/raw/c{k}.png').crop((0, a, 576, b))
    t = torch.from_numpy(np.asarray(im).astype(np.float32) / 255).permute(2, 0, 1)[None]
    with torch.no_grad(): o = net(t).clamp(0, 1)[0].permute(1, 2, 0).numpy()
    Image.fromarray((o * 255).round().astype(np.uint8)).save(f'{P}/assets/panels/p{k}.png'); print(k, im.size, flush=True)
