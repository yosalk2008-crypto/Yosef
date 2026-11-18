/**
 * Gipfelsturm (countries): extra questions written by the daily plan task, so the daily climbs never run
 * out of new questions. Each one is a complete question ("Nenne ein Land, …") with every fitting country;
 * the same rules as Fernweh apply (hand-checked lists, a source, never Israel/Palestine as an answer).
 * Big questions (25+ countries) are the scarcest – they open every climb.
 */
export type ExtraPred = { key: string; de: string; en: string; ids: string[]; src: string };

export const GIPFEL_EXTRA: ExtraPred[] = [];
