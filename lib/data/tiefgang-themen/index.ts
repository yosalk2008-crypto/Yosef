import type { Thema, ThemaFrage } from "./types";
import { FUSSBALL } from "./fussball";
import { ESSEN } from "./essen";
import { SERIEN } from "./serien";
import { WISSEN } from "./wissen";

export type { Thema, ThemaFrage };
export const THEMEN: { key: Thema; de: string; en: string; emoji: string }[] = [
  { key: "erdkunde", de: "Erdkunde", en: "Geography", emoji: "🌍" },
  { key: "fussball", de: "Fußball", en: "Football", emoji: "⚽" },
  { key: "essen", de: "Essen", en: "Food", emoji: "🍝" },
  { key: "serien", de: "Serien", en: "TV series", emoji: "📺" },
  { key: "wissen", de: "Allgemeinwissen", en: "General knowledge", emoji: "💡" },
];
export const THEMA_FRAGEN: Record<Exclude<Thema, "erdkunde">, ThemaFrage[]> = { fussball: FUSSBALL, essen: ESSEN, serien: SERIEN, wissen: WISSEN };
