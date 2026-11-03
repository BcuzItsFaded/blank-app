const {chromium}=require('playwright'); const fs=require('fs'); const {spawn}=require('child_process');
(async()=>{ const [,,mode,a,b,out]=process.argv;
 const br=await chromium.launch({args:['--allow-file-access-from-files']}); const p=await br.newPage({viewport:{width:1920,height:1080}});
 p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.goto('file:///root/media/aliens/film/index.html'); await p.waitForFunction('window.READY',null,{timeout:20000});
 if(mode==='ev'){ fs.writeFileSync(out, JSON.stringify(await p.evaluate(()=>collect()))); await br.close(); return; }
 const fps=60, f0=+a, f1=+b;
 const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate','60','-c:v','mjpeg','-i','-','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-r','60',out],{stdio:['pipe','inherit','inherit']});
 const t0=Date.now();
 for(let f=f0;f<f1;f++){ const d=await p.evaluate(t=>{seekBlur(t,6,0.5/60);return grab(0.95);}, f/fps);
   const buf=Buffer.from(d.split(',')[1],'base64'); if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
   if(f%300===0) console.log(out,f,((Date.now()-t0)/1000).toFixed(0)+'s'); }
 ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await br.close(); console.log('done',out); })();
