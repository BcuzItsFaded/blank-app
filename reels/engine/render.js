// Deterministic frame renderer: node render.js <page.html> <outDir> [--stills t1,t2,...] [--from N --to M]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const THREE_PATH = process.env.THREE_PATH || require.resolve('three/build/three.min.js', { paths: [process.cwd(), __dirname] });
const pagePath = path.resolve(process.argv[2]);
const out = process.argv[3] || 'frames';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e));
  await page.route('**/three.min.js', r => r.fulfill({ path: THREE_PATH, contentType: 'application/javascript' }));
  await page.goto('file://' + pagePath + '?render');
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const stage = await page.$('#stage');
  const stills = arg('--stills');
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(t => window.renderAt(t), t);
      await stage.screenshot({ path: path.join(out, `still_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
      console.log('still', t);
    }
  } else {
    const fps = 30, total = Math.round(await page.evaluate(() => window.DURATION) * fps);
    const from = +(arg('--from') || 0), to = +(arg('--to') || total);
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      await page.evaluate(t => window.renderAt(t), f / fps);
      await stage.screenshot({ path: path.join(out, `f_${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
      if (f % 60 === 0) console.log(`frame ${f}/${to}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
  await browser.close();
})();
