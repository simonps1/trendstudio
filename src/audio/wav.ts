import type { StereoBuffer } from "./synth";

/** Encode a stereo buffer as 16-bit PCM WAV (TPDF-dithered). */
export function encodeWav(buf: StereoBuffer): Uint8Array {
  const frames = buf.left.length;
  const dataBytes = frames * 4;
  const out = new Uint8Array(44 + dataBytes);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + dataBytes, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, dataBytes, true);
  let seed = 12345;
  const dither = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < frames; i++) {
    for (const [ch, arr] of [[0, buf.left], [1, buf.right]] as const) {
      const s = Math.max(-1, Math.min(1, arr[i])) * 32767 + (dither() - dither());
      v.setInt16(44 + i * 4 + ch * 2, Math.max(-32768, Math.min(32767, Math.round(s))), true);
    }
  }
  return out;
}
