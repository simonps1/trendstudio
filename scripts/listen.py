"""Machine listening for the narrator: measurements that stand in for an ear.
For every voice take: pitch, how much the pitch moves (flat = monotone), pace, pauses,
harsh "s" energy and clipping.  It measures the sound; it cannot judge whether a voice is likeable.
usage: python scripts/listen.py <episode-id> [...]   (reads public/voice/<id>/*.wav + the episode narration JSON)"""
import sys, glob, os, json
import numpy as np, librosa


def listen(path):
    y, sr = librosa.load(path, sr=16000, mono=True)
    f0, _, _ = librosa.pyin(y, fmin=60, fmax=350, sr=sr)
    f = f0[~np.isnan(f0)]
    melody = float(np.std(12 * np.log2(f / np.median(f)))) if len(f) > 10 else 0.0
    spec = np.abs(librosa.stft(y, n_fft=1024)) ** 2
    freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
    sib = float(spec[freqs >= 5000].sum() / (spec.sum() + 1e-12))
    rms = librosa.feature.rms(y=y, frame_length=400, hop_length=160)[0]
    quiet = rms < max(rms.max() * 0.04, 1e-4)
    inner = quiet[np.argmax(~quiet): len(quiet) - np.argmax(~quiet[::-1])] if (~quiet).any() else quiet
    longest, run = 0, 0
    for q in inner:
        run = run + 1 if q else 0
        longest = max(longest, run)
    return dict(pitch=round(float(np.median(f)) if len(f) else 0), melody=round(melody, 2), sib=round(sib * 100, 1),
                clip=round(float((np.abs(y) > 0.985).mean()) * 100, 3), sec=round(len(y) / sr, 2), pause=round(longest * 0.01, 2))


def lines_for(ep):
    base, cut = (ep[:-5], "long") if ep.endswith("-long") else (ep, "short")
    for p in (f"src/episodes/{base}/narration.{cut}.json", f"src/videos/{ep}/narration.json"):
        if os.path.exists(p):
            return [(l["id"], l["file"], len(l["text"].split())) for l in json.load(open(p)).get("lines", [])]
    return [(os.path.basename(p).split(".")[0], p, 0) for p in sorted(glob.glob(f"public/voice/{ep}/*.wav"))]


out = {}
for ep in sys.argv[1:]:
    rows = []
    for lid, p, n in lines_for(ep):
        if not os.path.exists(p): continue
        r = listen(p); r["line"] = lid
        r["wpm"] = round(n / r["sec"] * 60) if n else None
        rows.append(r)
    out[ep] = rows
    if not rows: continue
    print(f"== {ep}: pitch {np.median([r['pitch'] for r in rows]):.0f} Hz, melody {np.mean([r['melody'] for r in rows]):.2f} st, "
          f"pace {np.mean([r['wpm'] for r in rows if r['wpm']]) if any(r['wpm'] for r in rows) else 0:.0f} wpm")
    for r in rows:
        why = []
        if r["melody"] < 1.2: why.append("flat")
        if r["melody"] > 5.5: why.append("pitch jumps")
        if r["clip"] > 0.05: why.append("clipping")
        if r["sib"] > 12: why.append("harsh s")
        if r["pause"] > 0.7: why.append("long pause")
        if r["wpm"] and (r["wpm"] > 215 or r["wpm"] < 110): why.append("pace")
        if why:
            print(f"  {r['line']:<10} pitch {r['pitch']} Hz  melody {r['melody']} st  pace {r['wpm']} wpm  pause {r['pause']} s  s-energy {r['sib']}%  clip {r['clip']}%  <-- {', '.join(why)}")
os.makedirs("out", exist_ok=True)
json.dump(out, open("out/listen.json", "w"), indent=1)
