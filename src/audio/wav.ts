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

/** Decode a PCM 16-bit or float32 WAV (mono or stereo) into a stereo buffer. */
export function decodeWav(bytes: Uint8Array): StereoBuffer {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(...bytes.slice(o, o + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a WAV file");
  let o = 12, fmt = 1, channels = 2, rate = 48000, bits = 16;
  while (o + 8 <= bytes.length) {
    const id = tag(o), size = v.getUint32(o + 4, true);
    if (id === "fmt ") {
      fmt = v.getUint16(o + 8, true); channels = v.getUint16(o + 10, true);
      rate = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true);
      if (fmt === 0xfffe) fmt = bits === 32 ? 3 : 1;
    } else if (id === "data") {
      const bps = bits / 8, frames = Math.floor(size / (bps * channels));
      const left = new Float32Array(frames), right = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < Math.min(channels, 2); c++) {
          const p = o + 8 + (i * channels + c) * bps;
          const x = fmt === 3 ? v.getFloat32(p, true) : v.getInt16(p, true) / 32768;
          (c === 0 ? left : right)[i] = x;
        }
        if (channels === 1) right[i] = left[i];
      }
      return { sampleRate: rate, left, right };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}
