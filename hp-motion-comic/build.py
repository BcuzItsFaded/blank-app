import base64
b=base64.b64encode(open('storyboard.jpg','rb').read()).decode()
a=base64.b64encode(open('sound.mp3','rb').read()).decode()
open('index.html','w').write(open('template.html').read().replace('__IMG__','data:image/jpeg;base64,'+b).replace('__AUDIO__','data:audio/mpeg;base64,'+a))
