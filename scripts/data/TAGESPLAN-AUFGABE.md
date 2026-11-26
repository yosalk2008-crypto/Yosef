# Auftrag: Tagespläne für Fernweh und Gipfelsturm (geplante Aufgabe, täglich)

Ziel des Nutzers: Fernweh und Gipfelsturm haben **jeden Tag ein neues Spiel, keine Frage wiederholt sich je**. Der Tag wechselt bei beiden um **7:00 Uhr deutscher Zeit** (lib/daily.ts `day0750`). Diese Aufgabe läuft jeden Morgen und sorgt dafür, dass die Pläne immer mindestens **7 Tage im Voraus** fertig und live sind – auf keinen Fall darf ein Tag ungeplant sein.

Repo: GitHub yosalk2008-crypto/Yosef (Next.js 15). Produktions-Branch: claude/loving-fermi-w7h92k (Push = Live-Deploy). Klonen, direkt auf dem Branch arbeiten; NO_PROXY=localhost no_proxy=localhost npm_config_noproxy=localhost npm ci.

## Ablauf
1. Stand: `npx tsx scripts/data/tagesplan.ts --tage 8` – plant fehlende Tage aus noch unbenutzten Fragen (bereits geplante Tage werden nie verändert). Die Ausgabe zeigt, wie viele unbenutzte Fragen übrig sind.
2. **Neue Fernweh-Hinweise schreiben**: jeden Lauf mindestens **5 neue** (eine ganze Expedition), mehr, wenn weniger als 15 unbenutzte übrig sind (bis zu 15 pro Lauf). Anhängen an `KREATIV` in `lib/fernweh-kreativ.ts` im gleichen Format (key `k-…`, de, en, ids, note [de, en], src, optional extra). Vorher ALLE vorhandenen Hinweise lesen: kein Thema doppelt, auch nicht anders formuliert (gibt es „wilde Tiger“, dann nicht noch „Tiger in freier Wildbahn“).
3. **Neue Gipfelsturm-Fragen schreiben**, wenn die Ausgabe bei Stufe 1 (25–60 Länder) weniger als 14 oder bei Stufe 2 weniger als 25 unbenutzte zeigt: jeden Lauf bis zu 3 große Fragen (25–60 Länder) und 3 mittlere (10–25), anhängen an `GIPFEL_EXTRA` in `lib/gipfel/laender-extra.ts` (key `x-…`, de „Nenne ein Land, …“, en „Name a country …“, ids, src). Gipfelsturm-Fragen nicht gleich wie Fernweh-Hinweise formulieren (eigene Themen bevorzugen, z. B. Sprachen, Organisationen, Sport, Geschichte).
4. Erneut `npx tsx scripts/data/tagesplan.ts --tage 8` – muss mit „Alles geplant bis …“ enden.
5. Prüfen: `npx tsx scripts/data/check-tagesplan.ts`, `npx tsx scripts/data/check-fernweh.ts`, `npx tsx scripts/data/check-gipfelsturm.ts` – alle müssen „Alles in Ordnung.“ melden.
6. Bauen: `NO_PROXY=localhost no_proxy=localhost npx next build` – fehlerfrei.
7. Commit und Push: `git pull --rebase origin claude/loving-fermi-w7h92k`, dann `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -am "Tagespläne: Fernweh/Gipfelsturm bis <Datum>, <n> neue Hinweise"` mit diesen zwei letzten Zeilen in der Nachricht:
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   Claude-Session: <URL dieser Session>
   Dann `git push origin HEAD:claude/loving-fermi-w7h92k` (bei Konflikt erneut pull --rebase und push – andere Aufgaben pushen parallel). Muss vor 7:00 Uhr live sein.

## Regeln für jede Frage
- Die Länderliste muss **vollständig und richtig** sein – jedes passende Land ist eine richtige Antwort. Nur Fakten, bei denen du dir sicher bist; im Zweifel mit Websuche/WebFetch (z. B. Wikipedia-Listen, CIA World Factbook) prüfen, das ist ausdrücklich erlaubt. Die Shell erreicht nur GitHub und Paket-Server. Eine Quelle in `src` angeben.
- Länder-IDs: ISO-Alpha-3 wie in lib/data/countries.json (Kosovo = XKX). Überseegebiete zählen zu ihrem Land (Grönland → DNK, Falklandinseln → GBR, Neukaledonien/Französische Südgebiete/Französisch-Guayana → FRA, Puerto Rico → USA).
- Fernweh: 3–30 Länder; Gipfelsturm: 1–60.
- Kreativ und überraschend wie bei farflung: Tiere, Pflanzen, Essen (ohne Klischees), Flaggen, Sport, Bauwerke, Natur, Flüsse, Gebirge, Sprachen, Namen, Geschichte, Rekorde, Kultur. Keine reinen Fläche-/Einwohner-Fragen (die gibt es schon).
- Nichts, was sich ständig ändert (keine „aktueller Kader“, keine Tabellenstände); feste Ereignisse wie vergangene WMs sind in Ordnung.
- Keine Politik, keine Religionen gegeneinander, nichts Verletzendes, keine Stereotype. Nahost-Konflikt meiden. **Israel und Palästina nie als Antwort**, Westsahara auch nicht.
- Deutsch und Englisch natürlich formuliert; `note` erklärt in einem Satz etwas Interessantes zur Frage.

## Bericht
Bis zu welchem Tag beide Spiele geplant sind, wie viele neue Hinweise/Fragen dazukamen, wie viele unbenutzte übrig sind. Schlagen Prüfung oder Build fehl und lässt es sich nicht beheben: NICHT pushen, Fehler berichten.
