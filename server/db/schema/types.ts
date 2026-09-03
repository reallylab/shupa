export type DeckData = {
  name: string;
  description?: string;
};

export type CardData = {
  front: CardFront;
  back: CardBack;
  // max of 100 last entries
  history: CardHistory[];
};

export type CardFront = {
  content: string;
};
export type CardBack = {
  content: string;
};
export type CardHistory = {
  timestamp: number; // unix timestamp ms
  confidenceLevel: ConfidenceLevel;
};

export type ConfidenceLevel = "NOT AT ALL" | "MID" | "MAX";

export type SessionData = {
  cardIds: string[];
  lastIndex: number;
};
