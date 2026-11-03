// usage: node render.js stills [segs] | node render.js video seg,seg
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const D = __dirname, SP = path.dirname(D);
const TIM = JSON.parse(fs.readFileSync(`${SP}/timings.json`));
const FPS = 24;
(async () => {
  const [mode, segArg] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.setContent("<html><body style='margin:0;background:#000'><canvas id='c' width='1920' height='1080'></canvas></body></html>");
  await pg.evaluate(t => { window.TIM = t; }, TIM);
  for (const f of ['lib.js', 'scenes.js', 'main.js']) await pg.addScriptTag({ content: fs.readFileSync(`${D}/${f}`, 'utf8') + `\n//# sourceURL=${f}` });
  await pg.evaluate(() => document.fonts.ready);
  const grab = async (seg, t) => Buffer.from(await pg.evaluate(([s, t]) => { frame(s, t); return document.getElementById('c').toDataURL('image/jpeg', 0.9).split(',')[1]; }, [seg, t]), 'base64');
  if (mode === 'stills') {
    const out = `${SP}/stills`; fs.mkdirSync(out, { recursive: true });
    const segs = segArg ? segArg.split(',').map(Number) : [...Array(14).keys()];
    const frac = Number(process.argv[4] || 0.7);
    for (const seg of segs) {
      if (seg === 0 || seg === 13) { fs.writeFileSync(`${out}/s${String(seg).padStart(2, '0')}_0.jpg`, await grab(seg, 3)); continue; }
      const n = await pg.evaluate(s => SCENES[s].length, seg - 1);
      for (let k = 0; k < n; k++) {
        const [st, en] = await pg.evaluate(([s, k]) => [shotStart(s, k), k + 1 < SCENES[s].length ? shotStart(s, k + 1) : TIM[s].dur], [seg - 1, k]);
        fs.writeFileSync(`${out}/s${String(seg).padStart(2, '0')}_${k}.jpg`, await grab(seg, st + (en - st) * frac));
      }
    }
  } else {
    for (const seg of segArg.split(',').map(Number)) {
      const dur = await pg.evaluate(s => segDur(s), seg), n = Math.round(dur * FPS);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', `${SP}/segs/v${String(seg).padStart(2, '0')}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let i = 0; i < n; i++) { const buf = await grab(seg, i / FPS); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      console.log('seg', seg, 'frames', n, 'secs', ((Date.now() - t0) / 1000).toFixed(0));
    }
  }
  console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
