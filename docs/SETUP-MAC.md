# Edit on the MacBook Air

```bash
brew install node git ffmpeg     # ffmpeg optional; Remotion bundles one
git clone https://github.com/<you>/trendstudio.git && cd trendstudio
npm install
npm run studio                   # preview & scrub the timeline in the browser
```

The Air is great for editing and previews (`--frames`, `--still`). Do long 4K
renders on the Windows PC. On Apple Silicon, `REMOTION_GL=angle` (default) uses Metal.
