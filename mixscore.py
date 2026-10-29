"""Mix narration clips (from narrate.py) + synthesized score (score.py) into the Shorts MP4. Voice ducks the music."""
import subprocess
for d,b,v,o in [('hp-motion-comic',1,'hp-motion-comic/harry-potter-philosophers-stone-shorts.mp4','hp-motion-comic/harry-potter-philosophers-stone-shorts-final.mp4'),
                ('hp2-motion-comic',2,'hp2-motion-comic/harry-potter-chamber-of-secrets-shorts.mp4','hp2-motion-comic/harry-potter-chamber-of-secrets-shorts-final.mp4')]:
    w='/tmp/claude-0/s/n_'+d;sc=f'/tmp/claude-0/s/sc/b{b}.wav'
    ins=[];fl=[]
    for i in range(8):
        ins+=['-i',f'{w}/c{i}.wav'];t=int((i*6+0.45)*1000);fl.append(f'[{i+1}:a]adelay={t}|{t}[a{i}]')
    ins+=['-i',sc]
    fc=';'.join(fl)+';'+''.join(f'[a{i}]' for i in range(8))+'amix=inputs=8:normalize=0,apad=whole_dur=48,asplit=2[nv][ns];'
    fc+='[8:a]volume=0.55,aformat=channel_layouts=stereo[bed];[bed][ns]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500[duck];'
    fc+='[nv]pan=stereo|c0=c0|c1=c0[nvs];[nvs][duck]amix=inputs=2:normalize=0:weights=1.2 1,loudnorm=I=-15:TP=-1.5[a]'
    subprocess.run(['ffmpeg','-y','-v','error','-i',v]+ins+['-filter_complex',fc,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-ar','48000','-b:a','192k','-t','48',o],check=True)
    print('wrote',o)
