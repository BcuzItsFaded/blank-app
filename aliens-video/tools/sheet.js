const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [,,out,...ts]=process.argv;
 const b=await chromium.launch({args:['--allow-file-access-from-files']}); const p=await b.newPage({viewport:{width:1920,height:1080}});
 p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>console.log('console:',m.text()));
 await p.goto('file:///root/media/aliens/film/index.html'); await p.waitForFunction('window.READY',null,{timeout:20000});
 fs.mkdirSync(out,{recursive:true});
 for(const [i,t] of ts.entries()){ await p.evaluate(t=>seek(t),+t); const d=await p.evaluate(()=>grab(0.85)); fs.writeFileSync(`${out}/f${String(i).padStart(2,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64')); }
 await b.close(); })();
