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
