"""Speak TEXT with a free Microsoft neural voice (edge-tts); write OUT.mp3 and OUT.json word timings.
Usage: python3 tts_words.py VOICE RATE "TEXT" OUT.mp3"""
import asyncio, os, ssl, sys, json, inspect
import edge_tts.communicate as c
_ca = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
if os.path.exists(_ca):  # behind a TLS-inspecting proxy, trust its CA bundle
    c._SSL_CTX = ssl.create_default_context(cafile=_ca)
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
