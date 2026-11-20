import { spawnSync, type SpawnSyncReturns } from "node:child_process";

const isWin = process.platform === "win32";

function works(cmd: string[]) {
  const r = spawnSync(cmd[0], [...cmd.slice(1), "-version"], { shell: isWin, encoding: "utf8" });
  return r.status === 0;
}

const cache = new Map<string, string[]>();
/**
 * Resolve an ffmpeg/ffprobe command: env override -> system PATH ->
 * Remotion's bundled binary (`npx remotion ffmpeg`), so it works on a fresh
 * Windows/macOS machine without installing FFmpeg separately.
 */
export function tool(name: "ffmpeg" | "ffprobe"): string[] {
  const hit = cache.get(name);
  if (hit) return hit;
  const env = process.env[name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  const candidates = [env ? [env] : null, [name], ["npx", "remotion", name]].filter(Boolean) as string[][];
  const found = candidates.find(works);
  if (!found) throw new Error(`${name} not found. Install FFmpeg or set ${name.toUpperCase()}_PATH.`);
  cache.set(name, found);
  return found;
}

export function run(name: "ffmpeg" | "ffprobe", args: string[], opts: { allowFail?: boolean } = {}): SpawnSyncReturns<string> {
  const [cmd, ...pre] = tool(name);
  const r = spawnSync(cmd, [...pre, ...args], { shell: isWin, encoding: "utf8", maxBuffer: 1024 * 1024 * 512 });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${name} ${args.join(" ")} failed:\n${r.stderr?.slice(-2000)}`);
  }
  return r;
}

/** Run and return raw stdout bytes (for PCM output). */
export function runBinary(name: "ffmpeg" | "ffprobe", args: string[]): Buffer {
  const [cmd, ...pre] = tool(name);
  const r = spawnSync(cmd, [...pre, ...args], { shell: isWin, maxBuffer: 1024 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${name} ${args.join(" ")} failed:\n${r.stderr?.toString().slice(-2000)}`);
  return r.stdout as Buffer;
}
