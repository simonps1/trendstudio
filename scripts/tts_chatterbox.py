"""Chatterbox TTS worker (MIT licence, https://github.com/resemble-ai/chatterbox).
Started once by build-voice.ts; reads one JSON request per line on stdin:
  {"text": "...", "out": "path.wav", "seed": 7}
and answers with one JSON line on stdout: {"ok": true, "sr": 24000, "seconds": 3.2}
Setup:  python -m venv .venv-tts && .venv-tts/bin/pip install chatterbox-tts "setuptools<81"
Uses a GPU when available (CUDA or Apple MPS), otherwise the CPU.
Chatterbox embeds an inaudible watermark marking the audio as AI-generated; it is left on.
"""
import json, os, sys

real_stdout = sys.stdout
sys.stdout = sys.stderr  # keep library chatter off the protocol channel
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import torch, torchaudio
from chatterbox.tts import ChatterboxTTS

device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxTTS.from_pretrained(device=device)
print(json.dumps({"ready": True, "device": device}), file=real_stdout, flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
        torch.manual_seed(int(req.get("seed", 7)))
        wav = model.generate(req["text"], exaggeration=float(req.get("exaggeration", 0.5)), cfg_weight=float(req.get("cfg_weight", 0.5)))
        torchaudio.save(req["out"], wav.cpu(), model.sr)
        print(json.dumps({"ok": True, "sr": model.sr, "seconds": wav.shape[-1] / model.sr}), file=real_stdout, flush=True)
    except Exception as e:  # report and keep serving
        print(json.dumps({"ok": False, "error": str(e)[:300]}), file=real_stdout, flush=True)
