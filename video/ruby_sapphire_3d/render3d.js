// node render3d.js stills t1,t2 | node render3d.js video start end out.mp4
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const D = __dirname, TIM = JSON.parse(fs.readFileSync(`${D}/timings.json`)), FPS = 30;
(async () => {
  const [mode, a, b, out] = process.argv.slice(2);
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await br.newPage({ viewport: { width: 1080, height: 1920 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.setContent("<html><body style='margin:0;background:#000'><canvas id='c' width='1080' height='1920'></canvas></body></html>");
  await pg.evaluate(t => { window.TIM = t; }, TIM);
  await pg.addScriptTag({ content: fs.readFileSync(`${D}/npm/node_modules/three/build/three.min.js`, 'utf8') });
  await pg.addScriptTag({ content: fs.readFileSync(`${D}/scene3d.js`, 'utf8') + `\n//# sourceURL=scene3d.js` });
  await pg.evaluate(() => document.fonts.ready);
  const grab = async t => Buffer.from(await pg.evaluate(t => { frame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92).split(',')[1]; }, t), 'base64');
  if (mode === 'stills') { fs.mkdirSync(`${D}/stills`, { recursive: true }); const t0 = Date.now(); for (const t of a.split(',').map(Number)) fs.writeFileSync(`${D}/stills/t${t.toFixed(2).padStart(6, '0')}.jpg`, await grab(t)); console.log('ms/frame', (Date.now() - t0) / a.split(',').length); }
  else { const s = +a, e = +b; const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = s; i < e; i++) { const buf = await grab(i / FPS); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); } ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('chunk', s, e, 'done'); }
  console.log('errors:', errs.slice(0, 5)); await br.close();
})();
