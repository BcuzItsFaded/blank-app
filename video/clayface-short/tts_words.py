import asyncio, ssl, sys, json, inspect
import edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
async def main(voice, rate, text, out):
    kw = {"boundary": "WordBoundary"} if "boundary" in inspect.signature(c.Communicate).parameters else {}
    com = c.Communicate(text, voice, rate=rate, **kw)
    words = []
    with open(out, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"]})
    json.dump(words, open(out.replace(".mp3", ".json"), "w"))
asyncio.run(main(*sys.argv[1:5]))
