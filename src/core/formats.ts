/**
 * Output format presets. Every composition is registered once per preset.
 * All presets render natively at their frame rate: each frame is computed
 * from its own timestamp, never duplicated from a lower-rate source.
 */
export type FormatId = "vertical" | "horizontal" | "vertical4k" | "horizontal4k";

export interface FormatPreset {
  id: FormatId;
  label: string;
  width: number;
  height: number;
  fps: number;
  /** Suggested CRF for H.264 (lower = higher quality). */
  crf: number;
}

export const FORMATS: Record<FormatId, FormatPreset> = {
  vertical: { id: "vertical", label: "Shorts / TikTok 1080x1920 @60", width: 1080, height: 1920, fps: 60, crf: 16 },
  horizontal: { id: "horizontal", label: "YouTube 1920x1080 @60", width: 1920, height: 1080, fps: 60, crf: 16 },
  vertical4k: { id: "vertical4k", label: "Vertical 2160x3840 @60", width: 2160, height: 3840, fps: 60, crf: 18 },
  horizontal4k: { id: "horizontal4k", label: "YouTube 4K 3840x2160 @60", width: 3840, height: 2160, fps: 60, crf: 18 },
};

export const compositionId = (videoId: string, format: FormatId) => `${videoId}--${format}`;
