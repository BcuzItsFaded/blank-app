import asyncio,json,re,subprocess,sys,certifi
certifi.where=lambda:'/root/.ccr/ca-bundle.crt'
import edge_tts
VOICE='en-GB-RyanNeural'
def lines(d):
    s=open(d+'/template.html').read()
    m=re.search(r'var LINES=\[(.*?)\];',s,re.S)
    return json.loads('['+m.group(1)+']')
def dur(f):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode())
async def go(d,video,out):
    L=lines(d);work='/tmp/claude-0/s/n_'+d;subprocess.run(['mkdir','-p',work])
    clips=[]
    for i,t in enumerate(L):
        raw=f'{work}/r{i}.mp3'
        await edge_tts.Communicate(t,VOICE,rate='+6%').save(raw)
        du=dur(raw);tempo=min(1.3,max(1.0,du/5.3))
        fit=f'{work}/c{i}.wav'
        subprocess.run(['ffmpeg','-y','-v','error','-i',raw,'-filter:a',f'atempo={tempo:.3f}','-ar','44100','-ac','1',fit],check=True)
        print(d,i,round(du,2),'tempo',round(tempo,2),'->',round(dur(fit),2))
        clips.append(fit)
    ins=[];fl=[]
    for i,c in enumerate(clips):
        ins+=['-i',c];fl.append(f'[{i+1}:a]adelay={int((i*6+0.45)*1000)}|{int((i*6+0.45)*1000)}[a{i}]')
    mix=''.join(f'[a{i}]' for i in range(8))+'amix=inputs=8:normalize=0,loudnorm=I=-16:TP=-1.5[a]'
    subprocess.run(['ffmpeg','-y','-v','error','-i',video]+ins+['-filter_complex',';'.join(fl)+';'+mix,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-ar','48000','-b:a','192k','-t','48',out],check=True)
for d,v,o in [('hp-motion-comic','hp-motion-comic/harry-potter-philosophers-stone-shorts.mp4','hp-motion-comic/harry-potter-philosophers-stone-shorts-narrated.mp4'),
              ('hp2-motion-comic','hp2-motion-comic/harry-potter-chamber-of-secrets-shorts.mp4','hp2-motion-comic/harry-potter-chamber-of-secrets-shorts-narrated.mp4')]:
    asyncio.run(go(d,v,o))
