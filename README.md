# Geografik – firmengrafik.de

Tägliche Geografie-Rätsel und unbegrenzte Länder-Quizze. Next.js (App Router), Tailwind CSS, d3-geo.

## Tagesspiele (`/taeglich/<spiel>`)

Länderjagd, Maßstab, Viererbande, Höher oder tiefer, Spitzenplatz, Farbecht, Grenzgang, Zeitreise.
Jedes Rätsel wird aus dem UTC-Datum deterministisch erzeugt (`lib/rng.ts`), daher sieht jeder am selben
Tag dasselbe Rätsel und das Archiv (`/archiv`, ab 1. 1. 2024) braucht keinen Server.
Spielstände und Serien liegen nur im Local Storage des Browsers (`lib/daily.ts`).

## Quizze (`/quiz`)

Flaggen, Hauptstädte, Umrisse, Auf der Karte, Alle nennen – für Welt, Kontinente, US-Staaten,
deutsche Bundesländer, Schweizer Kantone und österreichische Bundesländer.

## Daten

`scripts/data/build.js` erzeugt `lib/data/countries.json`, `public/geo/*.json` und `public/flags/*.svg`
aus Weltbank, Wikidata, mledoze/countries, Natural Earth und flag-icons (Quellen: `/quellen`).
`npx tsx scripts/check-puzzles.tsx` prüft, dass alle Tagesrätsel bis ein Jahr in die Zukunft gültig sind.

## Entwicklung

```bash
npm install
npm run dev
```

Die frühere Firmengrafik-Website liegt im Branch `backup/firmengrafik-fahrschul-seite`.
