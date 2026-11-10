import type { GameKey } from "./daily";

export type GameInfo = {
  key: GameKey;
  title: string;
  tagline: string;
  color: string; // tailwind bg class for the tile accent
  icon: string; // svg path (24x24, stroke)
};

export const GAMES: GameInfo[] = [
  {
    key: "laenderjagd",
    title: "Länderjagd",
    tagline: "Errate das Land des Tages mit Hinweisen zu Lage, Größe und Wirtschaft.",
    color: "bg-emerald-500",
    icon: "M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  },
  {
    key: "massstab",
    title: "Maßstab",
    tagline: "Zieh das Land auf seine echte Größe – ohne Mercator-Verzerrung.",
    color: "bg-sky-500",
    icon: "M4 20L20 4M14 4h6v6M4 14v6h6",
  },
  {
    key: "viererbande",
    title: "Viererbande",
    tagline: "Sortiere 16 Kacheln in vier Gruppen, die etwas gemeinsam haben.",
    color: "bg-violet-500",
    icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  },
  {
    key: "hoeher-tiefer",
    title: "Höher oder tiefer",
    tagline: "Hat das nächste Land mehr oder weniger? Drei Leben, so weit du kommst.",
    color: "bg-amber-500",
    icon: "M8 7l4-4 4 4M12 3v18M16 17l-4 4-4-4",
  },
  {
    key: "spitzenplatz",
    title: "Spitzenplatz",
    tagline: "Ordne acht Länder den Kategorien zu, in denen sie weltweit am besten dastehen.",
    color: "bg-rose-500",
    icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4",
  },
  {
    key: "farbecht",
    title: "Farbecht",
    tagline: "Eine Flaggenfarbe fehlt. Misch sie aus dem Gedächtnis nach.",
    color: "bg-pink-500",
    icon: "M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0021 9.8C21 6 17 3 12 3zM7.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm3-4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  },
  {
    key: "grenzgang",
    title: "Grenzgang",
    tagline: "Finde einen Landweg von A nach B – Nachbarland für Nachbarland.",
    color: "bg-teal-500",
    icon: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c5 0 2-10 10-10",
  },
  {
    key: "zeitreise",
    title: "Zeitreise",
    tagline: "Wann und wo war das? Ordne Ereignisse auf Karte und Zeitleiste ein.",
    color: "bg-orange-500",
    icon: "M12 7v5l3 2M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  },
];

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<GameKey, GameInfo>;

export const QUIZ_TYPES = [
  { key: "flaggen", title: "Flaggen", tagline: "Welches Land gehört zur Flagge?", countriesOnly: true },
  { key: "hauptstaedte", title: "Hauptstädte", tagline: "Kennst du die Hauptstadt?", countriesOnly: false },
  { key: "umrisse", title: "Umrisse", tagline: "Erkenne das Land an seiner Form.", countriesOnly: false },
  { key: "karte", title: "Auf der Karte", tagline: "Finde das gesuchte Gebiet auf der Karte.", countriesOnly: false },
  { key: "alle-nennen", title: "Alle nennen", tagline: "Wie viele schaffst du, bevor die Zeit abläuft?", countriesOnly: false },
] as const;

export type QuizType = (typeof QUIZ_TYPES)[number]["key"];
