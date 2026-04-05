export const DECK_TYPES = {
  TAROT: "tarot",
  LENORMAND: "lenormand",
  ORACLE: "oracle",
} as const;

export type DeckType = (typeof DECK_TYPES)[keyof typeof DECK_TYPES];

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  tarot: "Tarot",
  lenormand: "Lenormand",
  oracle: "Oráculo",
};

export const ASPECT_RATIO_PRESETS = [
  { label: "2:3 (Tarot padrão)", value: "2/3" },
  { label: "3:4", value: "3/4" },
  { label: "4:5", value: "4/5" },
  { label: "1:1 (Quadrado)", value: "1/1" },
  { label: "Personalizado", value: "custom" },
] as const;

/** Parse "W/H" string to { width, height } at base 600px width */
export function parseAspectRatio(ratio: string): { width: number; height: number; cssValue: string } {
  const [w, h] = ratio.split("/").map(Number);
  if (!w || !h) return { width: 600, height: 900, cssValue: "2/3" };
  const baseWidth = 600;
  const height = Math.round((baseWidth / w) * h);
  return { width: baseWidth, height, cssValue: `${w}/${h}` };
}
