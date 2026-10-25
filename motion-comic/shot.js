const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
 const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+process.cwd()+'/index.html');
 await p.waitForFunction(()=>window.__ready&&window.__ready(),null,{timeout:20000});
 const ts=process.argv.slice(2).map(Number);
 for(const t of ts){await p.evaluate(t=>window.__renderAt(t),t);
  const d=await p.evaluate(()=>document.getElementById('stage').toDataURL('image/jpeg',0.85));
  require('fs').writeFileSync('/tmp/claude-0/s/f_'+t+'.jpg',Buffer.from(d.split(',')[1],'base64'));}
 if(ts.length===0)await p.screenshot({path:'/tmp/claude-0/s/page.png'});
 console.log('errs',errs);await b.close();
})();
