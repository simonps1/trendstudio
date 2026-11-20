# Continue on Windows (NVIDIA RTX PC)

## One-time setup

1. Install **Node.js 22 LTS** (or newer): `winget install OpenJS.NodeJS.LTS`
2. Install **Git**: `winget install Git.Git`
3. Optional but recommended: system FFmpeg for faster QC — `winget install Gyan.FFmpeg`.
   If it's missing, the scripts fall back to Remotion's bundled FFmpeg automatically.
4. Optional: **Claude Code** — `npm install -g @anthropic-ai/claude-code`
5. Clone and install (PowerShell):

```powershell
git clone https://github.com/<you>/trendstudio.git
cd trendstudio
npm install
npm test
```

Remotion downloads its own headless Chrome on the first render — no
`REMOTION_BROWSER_EXECUTABLE` needed (that variable was only for the cloud sandbox).

## Rendering with the GPU

The 2D canvas layers render on the CPU; the Three.js black hole uses WebGL.
To use your RTX GPU for WebGL, set the OpenGL backend before rendering:

```powershell
$env:REMOTION_GL = "angle"     # default on Windows; uses Direct3D → your NVIDIA GPU
npm run render -- star-life vertical --concurrency 8
npm run render -- star-life all
```

Tips:
- `--concurrency` ≈ number of CPU cores (or a bit less) is a good start. Watch RAM: ~1 GB per tab at 4K.
- If a render fails with WebGL errors, try `$env:REMOTION_GL = "swangle"` (software, slow but reliable).
- Hardware video encoding (NVENC) is not used by default because x264 at CRF 16 gives better
  quality per bit for uploads; encoding is not the bottleneck.

## Daily sync

```powershell
git pull            # get changes from iPhone/Mac sessions
# ...edit / render...
git add -A; git commit -m "describe change"; git push
```

Rendered videos (`out/`) are not committed — they are reproducible from source.
Line endings are normalised by `.gitattributes`, so editing on Windows and macOS is safe.
