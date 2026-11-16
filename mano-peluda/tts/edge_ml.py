import os, ssl, json, sys, asyncio, subprocess, wave
CA='/root/.ccr/ca-bundle.crt'
_orig=ssl.create_default_context
def patched(*a,**k):
    ctx=_orig(*a,**k)
    try: ctx.load_verify_locations(CA)
    except Exception: pass
    return ctx
ssl.create_default_context=patched
os.environ['SSL_CERT_FILE']=CA
import edge_tts
lines=json.load(open(sys.argv[1])); outdir=sys.argv[2]; voice=sys.argv[3]
os.makedirs(outdir,exist_ok=True); proxy=os.environ.get('HTTPS_PROXY'); dur={}
def wavdur(p):
    w=wave.open(p); d=w.getnframes()/w.getframerate(); w.close(); return d
async def synth(l):
    mp3=os.path.join(outdir,l['id']+'.mp3'); wav=os.path.join(outdir,l['id']+'.wav')
    if os.path.exists(wav) and os.path.getsize(wav)>8000:  # resume
        dur[l['id']]=round(wavdur(wav),3); print(l['id'],dur[l['id']],'(cached)',flush=True); return
    last=None
    for attempt in range(10):
        try:
            c=edge_tts.Communicate(l['text'], voice, rate=l.get('rate','+0%'), proxy=proxy)
            await c.save(mp3)
            if os.path.getsize(mp3)>1000:
                subprocess.run(['ffmpeg','-y','-loglevel','error','-i',mp3,'-ar','24000','-ac','1','-af','silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB,areverse',wav],check=True)
                dur[l['id']]=round(wavdur(wav),3); print(l['id'],dur[l['id']],flush=True); return
        except Exception as e: last=e
        await asyncio.sleep(2.5 + attempt)
    raise RuntimeError(f"{l['id']} failed: {last}")
async def go():
    for l in lines:
        await synth(l); await asyncio.sleep(1.2)
asyncio.run(go()); json.dump(dur,open(os.path.join(outdir,'dur.json'),'w'),indent=1)
