// Deterministic frame-by-frame export: node render.js  ->  other-worlds-than-these-shorts.mp4 (1080x1920 Shorts, 30 fps, 48 s)
const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{
 const FPS=30,TOTAL=48;
 const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','other-worlds-than-these-shorts.mp4'],{stdio:['pipe','inherit','inherit']});
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
 await p.goto('file://'+process.cwd()+'/index.html');
 await p.waitForFunction(()=>window.__ready&&window.__ready(),null,{timeout:30000});
 for(let f=0;f<FPS*TOTAL;f++){
  const d=await p.evaluate(t=>{window.__renderAt(t);return document.getElementById('stage').toDataURL('image/jpeg',0.95)},f/FPS);
  if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));
 }
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done');
})();
