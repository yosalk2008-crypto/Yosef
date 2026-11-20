# Auftrag: Tiefgang-Thema auffüllen (für die geplanten Aufgaben)

Aufgabe: Fülle im Spiel „Tiefgang“ auf geoduels.de das Endlos-Thema „<Thema-Name>“ (Datei lib/data/tiefgang-themen/<datei>.ts, Key-Präfix „<präfix>“) auf 150 Fragen auf. Der Nutzer möchte bis 7:50 Uhr Europe/Berlin 150 Fragen in diesem Thema haben; diese Aufgabe läuft alle 3 Stunden.

Pro Lauf:
1. Stand prüfen: npx tsx scripts/data/check-tiefgang-themen.ts
2. Hat das Thema unter 150 Fragen: schreibe so viele NEUE Fragen, wie bis 150 fehlen, höchstens aber 50 pro Lauf (bei weniger Zeit lieber 40 sehr gute als 50 schwache). Jede Frage braucht SEHR umfangreiche Antworten: Ziel 80–150 richtige Antworten, mindestens 50 (nur bei wirklich geschlossenen Listen wie einem WM-Kader weniger, mindestens 20).
3. Danach (und wenn das Thema schon 150 Fragen hat) vorhandene Fragen mit weniger als 80 Antworten erweitern: bis zu 20 Fragen pro Lauf, so viele zusätzliche richtige Antworten wie möglich. Beispiel: Bei „Fast-Food-Kette“ fehlten bekannte Ketten wie Raising Cane’s oder Dave’s Hot Chicken – genau solche Lücken schließen. Haben alle Fragen 80+ Antworten und das Thema 150 Fragen, nichts ändern und nur „fertig“ berichten.

Repo: GitHub yosalk2008-crypto/Yosef (Next.js 15). Produktions-Branch: claude/loving-fermi-w7h92k (Push = Live-Deploy). Klonen, direkt auf dem Branch arbeiten; NO_PROXY=localhost no_proxy=localhost npm_config_noproxy=localhost npm ci.
Lies zuerst lib/data/tiefgang-themen/types.ts (Regeln) und ALLE Fragen in <datei>.ts, damit es keine Dubletten gibt (auch keine inhaltlich gleichen Fragen anders formuliert). Ändere nur <datei>.ts – drei weitere Aufgaben arbeiten parallel an den anderen Themen-Dateien.

Neue Fragen NICHT direkt in TypeScript schreiben, sondern als Textdatei (z. B. /tmp/neu.txt):
## <präfix>key | Deutsche Frage | Deutscher Hinweis | English question | English hint
Antwort|Alias|English name
… (eine Antwort pro Zeile, die bekannteste zuerst, die seltenste zuletzt – die letzte ist die „Tiefseeperle“)
Leerzeile zwischen den Fragen. Einbauen: python3 scripts/data/tiefgang-txt2ts.py <datei> /tmp/neu.txt
Antworten zu vorhandenen Fragen ergänzen: Textdatei mit „## <key>“ und darunter eine Antwort pro Zeile, dann npx tsx scripts/data/tiefgang-add-answers.ts <datei> /tmp/mehr.txt (überspringt, was schon da ist; neue Antworten kommen ans Ende = seltener).

Regeln:
- Nur Antworten, bei denen du dir SICHER bist, dass sie stimmen. Wenn du bei einer Liste unsicher bist oder nicht weiterkommst, recherchiere mit der Websuche bzw. WebFetch (z. B. Wikipedia-Listen) – der Nutzer erlaubt das ausdrücklich. Die Shell selbst erreicht nur GitHub und Paket-Server.
- Keine Platzhalter („dup“, „TODO“), keine Code-Ausdrücke – nur reine Textzeilen.
- Aliase: übliche Schreibweisen, deutsche und englische Namen. Ein Alias darf in einer Frage nur einmal vorkommen (sonst fällt die Antwort weg – das Prüfskript meldet es). Keine einzelnen Buchstaben als Alias. Bei Personen-Fragen (Spieler, Maler …) wird der Nachname automatisch als Antwort ergänzt – nicht extra eintragen nötig.
- Nichts, was sich ständig ändert (keine „aktueller Kader“, keine „diese Saison“).
- Keine Politik, keine Religionen gegeneinander, nichts Verletzendes, keine diskriminierenden Begriffe (z. B. keine alten rassistischen Namen von Süßigkeiten, Gerichten oder Völkern). Nahost-Konflikt meiden. Israel nie als Antwort.
- Englischer Text natürlich.
Thema-spezifische Hinweise stehen im Auftrag der jeweiligen Aufgabe.

Prüfen: npx tsx scripts/data/check-tiefgang-themen.ts → muss mit „Alles in Ordnung.“ enden. Lies jede neue Frage noch einmal und streiche unsichere Antworten.
Bauen: NO_PROXY=localhost no_proxy=localhost npx next build – fehlerfrei.
Commit und Push: git pull --rebase origin claude/loving-fermi-w7h92k, dann git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -am "Tiefgang <Thema-Name>: <Anzahl> neue Fragen, <Anzahl> Antworten ergänzt" mit diesen zwei letzten Zeilen in der Commit-Nachricht:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <URL dieser Session>
Dann git push origin HEAD:claude/loving-fermi-w7h92k – bei Konflikt erneut git pull --rebase und push (andere Aufgaben pushen parallel). Textdateien aus /tmp nicht committen. Wird es spät (die Fragen sollen bis 7:50 Uhr live sein), lieber zwischendurch einen Teil committen und pushen.

Bericht am Ende: neue Fragen, ergänzte Antworten, neuer Stand des Themas. Wenn Prüfung oder Build fehlschlagen und du es nicht beheben kannst, NICHT pushen, sondern den Fehler berichten.
