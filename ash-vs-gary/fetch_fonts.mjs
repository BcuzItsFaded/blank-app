import fs from 'fs';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const fams = ['family=Gloria+Hallelujah','family=Patrick+Hand'];
let out='', n=0; fs.mkdirSync('fonts',{recursive:true});
for (const f of fams) {
  const r = await fetch(`https://fonts.googleapis.com/css2?${f}&display=block`,{headers:{'User-Agent':UA}}); if(!r.ok) throw new Error(f+r.status);
  let css = await r.text();
  for (const u of [...new Set(css.match(/https:\/\/[^)]+/g)||[])]) { const name=`f${n++}.woff2`; const b=await fetch(u); if(!b.ok) throw new Error(u); fs.writeFileSync('fonts/'+name,Buffer.from(await b.arrayBuffer())); css=css.split(u).join('fonts/'+name); }
  out+=css;
}
fs.writeFileSync('fonts.css', out); console.log('fonts', n);
