import asyncio, ssl, sys
import edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
async def main(voice, rate, text, out):
    await c.Communicate(text, voice, rate=rate).save(out)
asyncio.run(main(*sys.argv[1:5]))
