import type { GameKey } from "./daily";

export type GameInfo = {
  key: GameKey;
  title: string;
  tagline: string;
  bg: string; // tile colour
  edge: string; // darker bottom edge
  icon: string; // svg path (24x24, stroke)
};

export const GAMES: GameInfo[] = [
  {
    key: "laenderjagd",
    title: "Länderjagd",
    tagline: "Errate das Land des Tages mit Hinweisen zu Kontinent, Nachbarn, Klima und Größe.",
    bg: "#9fd06f",
    edge: "#7bb04c",
    icon: "M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  },
  {
    key: "massstab",
    title: "Maßstab",
    tagline: "Zieh das Land auf seine echte Größe – ohne Mercator-Verzerrung.",
    bg: "#8ec5f0",
    edge: "#67a3d3",
    icon: "M4 20L20 4M14 4h6v6M4 14v6h6",
  },
  {
    key: "viererbande",
    title: "Viererbande",
    tagline: "Sortiere 16 Kacheln in vier Gruppen, die etwas gemeinsam haben.",
    bg: "#c3aaf6",
    edge: "#a186dc",
    icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  },
  {
    key: "hoeher-tiefer",
    title: "Höher oder tiefer",
    tagline: "Hat das nächste Land mehr oder weniger? Drei Leben, so weit du kommst.",
    bg: "#f0a0bf",
    edge: "#d17d9e",
    icon: "M8 7l4-4 4 4M12 3v18M16 17l-4 4-4-4",
  },
  {
    key: "spitzenplatz",
    title: "Spitzenplatz",
    tagline: "Ordne acht Länder den Kategorien zu, in denen sie weltweit am besten dastehen.",
    bg: "#f3b86d",
    edge: "#d6984a",
    icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4",
  },
  {
    key: "farbecht",
    title: "Farbecht",
    tagline: "Eine Flaggenfarbe fehlt. Misch sie aus dem Gedächtnis nach.",
    bg: "#f3d272",
    edge: "#d4b24e",
    icon: "M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0021 9.8C21 6 17 3 12 3zM7.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm3-4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  },
  {
    key: "grenzgang",
    title: "Grenzgang",
    tagline: "Finde einen Landweg von A nach B – Nachbarland für Nachbarland.",
    bg: "#7fd3c4",
    edge: "#56b3a3",
    icon: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c5 0 2-10 10-10",
  },
  {
    key: "spurensuche",
    title: "Spurensuche",
    tagline: "Du stehst irgendwo auf der Welt. Schau dich in Street View um und tippe, wo du bist.",
    bg: "#9fd3b0",
    edge: "#74b38a",
    icon: "M12 21s-6-5.3-6-10a6 6 0 0112 0c0 4.7-6 10-6 10zM12 13a2 2 0 100-4 2 2 0 000 4z",
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
