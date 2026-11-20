"""Fallback word aligner / recogniser (used when Whisper can't be downloaded).
Reads 16 kHz mono s16le PCM on stdin. argv[1] = text to force-align ("" = free recognition).
Prints JSON: [{"word","start","end"}]   Requires: pip install pocketsphinx
"""
import json, re, sys
from pocketsphinx import Decoder

pcm = sys.stdin.buffer.read()
text = sys.argv[1] if len(sys.argv) > 1 else ""
out = []
try:
    if text:
        d = Decoder(samprate=16000, lm=None, loglevel="FATAL")
        d.set_align_text(text)
    else:
        d = Decoder(samprate=16000, loglevel="FATAL")
    d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
    for s in d.seg() or []:
        w = re.sub(r"\(\d+\)$", "", s.word)
        if w.startswith("<") or w.startswith("["):
            continue
        out.append({"word": w, "start": s.start_frame / 100, "end": (s.end_frame + 1) / 100})
except Exception as e:  # unknown word, no alignment, ...
    sys.stderr.write(str(e))
print(json.dumps(out))
