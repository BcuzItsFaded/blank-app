from faster_whisper import WhisperModel
import json
m=WhisperModel('base.en',device='cpu',compute_type='int8')
import soundfile as sf
segs,_=m.transcribe(sf.read('v16.wav',dtype='float32')[0],word_timestamps=True,initial_prompt=open('script.txt').read())
w=[{'w':x.word.strip(),'s':round(x.start,3),'e':round(x.end,3)} for s in segs for x in s.words]
json.dump(w,open('words.json','w'))
print(len(w)); print(' '.join(x['w'] for x in w))
