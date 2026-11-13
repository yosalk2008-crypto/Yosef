# Builds public/halal/data.js for "Ist das halal?" and checks every cited hadith number against
# the Sahih al-Bukhari / Sahih Muslim texts (fawazahmed0/hadith-api; Muslim by Abdul-Baqi numbering).
import json, re, sys

IK = "Ibn Kathir"
# (cat, question, answer, explanation, [quran refs], [bukhari], [muslim])
# answers: halal | haram | makruh | kommt (kommt drauf an)
Q = [
# ---------------- Essen & Trinken ----------------
("Essen", "Schweinefleisch essen", "haram", "Der Quran verbietet Schweinefleisch ausdrücklich. Ibn Kathir erklärt, dass damit das ganze Schwein gemeint ist – auch Fett und alle anderen Teile.", ["2:173"], [], []),
("Essen", "Schweinefleisch essen, wenn du sonst verhungern würdest", "halal", "In echter Not ist es erlaubt – aber nur so viel, wie man zum Überleben braucht. Ibn Kathir betont, dass man es weder will noch über das Nötige hinausgeht.", ["2:173"], [], []),
("Essen", "Gummibärchen mit Schweinegelatine essen", "kommt", "Die meisten Gelehrten und Fatwa-Räte sagen: haram, weil die Gelatine aus dem Schwein stammt. Einige hanafitische Gelehrte meinen, sie sei durch die Verarbeitung so verändert, dass sie erlaubt ist. Auf der sicheren Seite bist du mit Halal- oder veganen Fruchtgummis.", ["2:173"], [], []),
("Essen", "Bier trinken", "haram", "Alkohol (khamr) ist im Quran verboten. Der Prophet ﷺ sagte: Jedes Rauschmittel ist khamr, und jedes khamr ist haram.", ["5:90-91"], [], [2003]),
("Essen", "Einen kleinen Schluck Wein trinken", "haram", "Verboten ist das berauschende Getränk selbst, nicht erst der Rausch. Deshalb ist auch ein kleiner Schluck nicht erlaubt.", ["5:90"], [242], [2003]),
("Essen", "Alkoholfreies Bier (0,0 %) trinken", "kommt", "Entscheidend ist, ob ein Getränk berauscht. Manche Gelehrte erlauben 0,0-Bier deshalb, andere raten ab, weil es Bier nachahmt und Spuren von Alkohol enthalten kann.", [], [242], [2003]),
("Essen", "Kiffen", "haram", "Umar sagte in einer Predigt: Khamr ist alles, was den Verstand benebelt. Cannabis berauscht – damit fällt es unter das Verbot.", ["5:90"], [5581], [2003]),
("Essen", "Lachgas aus Ballons einatmen", "haram", "Lachgas berauscht und kann Nerven und Gehirn schwer schädigen. Der Quran sagt: Tötet euch nicht selbst – Ibn Kathir erklärt, dass man sich nicht durch Verbotenes ins Verderben stürzen soll.", ["4:29"], [], [2003]),
("Essen", "Vapen mit Nikotin", "haram", "Die meisten heutigen Gelehrten und Fatwa-Räte sagen: haram, weil es süchtig macht und der Gesundheit schadet. Sie stützen sich auf den Vers, sich nicht ins Verderben zu stürzen, und darauf, dass Schädliches (khaba'ith) verboten ist. Einige ältere Meinungen stuften Rauchen nur als makruh ein.", ["2:195", "7:157"], [], []),
("Essen", "Vapen ohne Nikotin", "kommt", "Ohne Nikotin fällt die Sucht weg, aber Schäden für die Lunge sind weiter möglich. Manche Gelehrte halten es deshalb für haram, andere für makruh.", ["2:195"], [], []),
("Essen", "Shisha rauchen", "haram", "Für Shisha gilt dasselbe wie für Zigaretten: Die meisten heutigen Gelehrten sagen haram, weil sie der Gesundheit schadet – eine Shisha-Session kann so viel Rauch bedeuten wie viele Zigaretten.", ["2:195", "7:157"], [], []),
("Essen", "Energy-Drinks trinken", "halal", "Energy-Drinks berauschen nicht. Grundsätzlich ist alles erlaubt, was nicht verboten ist. In großen Mengen sind sie aber ungesund.", ["2:168"], [], []),
("Essen", "Kaffee trinken", "halal", "Kaffee berauscht nicht. Ibn Kathir erklärt zu 2:29, dass Allah alles auf der Erde zum Nutzen der Menschen geschaffen hat – erlaubt ist, was nicht verboten wurde.", ["2:29"], [], []),
("Essen", "Fisch essen", "halal", "Der Quran erlaubt, was aus dem Meer kommt. Die Gefährten aßen sogar von einem großen Fisch (al-'Anbar), den das Meer tot angespült hatte.", ["5:96"], [4362], [1935]),
("Essen", "Garnelen essen", "kommt", "Für Malikiten, Schafiiten und Hanbaliten sind alle Meerestiere halal. In der hanafitischen Schule ist nur Fisch erlaubt – ob Garnelen als Fisch zählen, sehen hanafitische Gelehrte unterschiedlich.", ["5:96"], [], []),
("Essen", "Heuschrecken essen", "halal", "Die Gefährten aßen mit dem Propheten ﷺ Heuschrecken – und zwar auf sieben Feldzügen.", [], [5495], [1952]),
("Essen", "Fleisch vom Hausesel essen", "haram", "Am Tag von Khaybar verbot der Prophet ﷺ das Fleisch von Hauseseln.", [], [5520], [1941]),
("Essen", "Pferdefleisch essen", "kommt", "Laut Jabir erlaubte der Prophet ﷺ Pferdefleisch – die meisten Gelehrten halten es deshalb für halal. Abu Hanifa hielt es für makruh.", [], [5520], [1941]),
("Essen", "Fleisch von Löwe oder Wolf essen", "haram", "Der Prophet ﷺ verbot, Raubtiere mit Reißzähnen zu essen.", [], [5530], [1932]),
("Essen", "Blutwurst essen", "haram", "Blut ist im Quran ausdrücklich verboten, genau wie verendete Tiere und Schweinefleisch.", ["5:3"], [], []),
("Essen", "Mit der linken Hand essen", "makruh", "Der Prophet ﷺ sagte: Esst mit der rechten Hand, denn der Satan isst mit der linken. Die meisten Gelehrten halten das Essen mit links für makruh – wer die rechte nicht benutzen kann, darf natürlich links essen.", [], [], [2020]),
("Essen", "Aus einem Becher aus Gold trinken", "haram", "Gefäße aus Gold und Silber sind zum Essen und Trinken verboten – für Männer und Frauen.", [], [5426], [2067]),
("Essen", "Über Essen meckern", "makruh", "Der Prophet ﷺ hat nie Essen schlechtgemacht: Wenn es ihm schmeckte, aß er es, sonst ließ er es stehen.", [], [5409], [2064]),
("Essen", "Essen einfach wegwerfen", "haram", "Verschwendung (israf) ist verboten: Esst und trinkt, aber verschwendet nicht. Ibn Kathir erklärt zu 17:27, dass Verschwender Brüder der Satane genannt werden.", ["7:31", "17:26-27"], [], []),
("Essen", "Veganes Essen von nicht-muslimischen Nachbarn essen", "halal", "Pflanzliches Essen ist erlaubt, egal wer es kocht – solange kein Alkohol oder anderes Verbotenes drin ist. Bei Fleisch gelten eigene Regeln.", ["2:172"], [], []),
("Essen", "Weiteressen, nachdem du gemerkt hast, dass Schwein drin ist", "haram", "Was du aus Versehen gegessen hast, ist keine Sünde – Allah zieht niemanden für Vergessen oder Irrtum zur Rechenschaft. Sobald du es weißt, musst du aber aufhören.", ["2:173", "2:286"], [], []),
("Essen", "Honig essen", "halal", "Der Quran nennt Honig eine Heilung für die Menschen. Ibn Kathir erklärt, dass er für viele Beschwerden nützlich ist.", ["16:69"], [], []),
("Essen", "Hustensaft mit etwas Alkohol nehmen", "kommt", "Der Prophet ﷺ sagte über Wein: Er ist keine Medizin, sondern eine Krankheit. Viele heutige Gelehrte erlauben aber Medikamente, in denen Alkohol nur als Lösungsmittel in kleiner, nicht berauschender Menge steckt – vor allem, wenn es keine Alternative gibt.", [], [], [1984]),
("Essen", "Viel Knoblauch essen und direkt in die Moschee gehen", "makruh", "Der Prophet ﷺ sagte: Wer Knoblauch oder Zwiebeln gegessen hat, soll unserer Moschee fernbleiben – wegen des Geruchs, der andere stört.", [], [855], [564]),
("Essen", "Wasser trinken im Stehen", "kommt", "Es gibt Überlieferungen, in denen der Prophet ﷺ das Trinken im Stehen untersagt, und andere, in denen er selbst stehend trank. Viele Gelehrte sagen deshalb: erlaubt, aber im Sitzen ist besser.", [], [5615], [2024]),

# ---------------- Geld ----------------
("Geld", "Zinsen auf dem Sparkonto kassieren", "haram", "Zinsen (riba) sind im Quran verboten. Allah hat den Handel erlaubt und die Zinsen verboten – Ibn Kathir zählt riba zu den schwersten Vergehen.", ["2:275", "2:278-279"], [], [1598]),
("Geld", "Kredit mit Zinsen für ein neues Handy", "haram", "Der Prophet ﷺ verfluchte den, der Zinsen nimmt, und den, der sie bezahlt – ebenso den, der den Vertrag schreibt, und die Zeugen.", ["2:275"], [], [1598]),
("Geld", "Einen Kredit aufnehmen", "kommt", "Ein Kredit ohne Zinsen ist halal – der Quran regelt sogar, wie man Schulden aufschreibt. Sobald Zinsen anfallen, wird er haram.", ["2:282", "2:275"], [], [1598]),
("Geld", "Schulden absichtlich nicht zurückzahlen", "haram", "Der Prophet ﷺ sagte: Wenn ein Reicher das Zurückzahlen hinauszögert, ist das Unrecht. Und: Wer Geld nimmt und es zurückzahlen will, dem hilft Allah dabei.", [], [2287, 2387], [1564]),
("Geld", "Im Casino spielen", "haram", "Glücksspiel (maysir) ist im Quran zusammen mit Alkohol verboten. Ibn Kathir erklärt maysir als Glücksspiel (qimar).", ["5:90-91"], [], []),
("Geld", "Sportwetten abschließen", "haram", "Bei Wetten setzt du Geld ein, und einer gewinnt, was der andere verliert – das ist Glücksspiel (maysir). Der Quran sagt, dass sein Schaden größer ist als sein Nutzen.", ["2:219", "5:90"], [], []),
("Geld", "Wette unter Freunden: Wer verliert, zahlt den Döner", "haram", "Auch kleine Einsätze machen eine Wette zu Glücksspiel, wenn der Verlierer für den Gewinner zahlt.", ["5:90"], [], []),
("Geld", "Kostenloses Gewinnspiel ohne Einsatz", "halal", "Glücksspiel bedeutet: Du setzt etwas ein und kannst es verlieren. Bei einem kostenlosen Gewinnspiel verlierst du nichts – deshalb ist es kein maysir.", ["5:90"], [], []),
("Geld", "Lootboxen mit echtem Geld kaufen", "kommt", "Du zahlst und weißt nicht, was du bekommst – viele Gelehrte sehen darin Glücksspiel und raten klar ab. Kostenlose Lootboxen ohne Einsatz sind unproblematisch.", ["5:90"], [], [1513]),
("Geld", "Aktien kaufen", "kommt", "Handel ist erlaubt. Halal sind Aktien, wenn die Firma etwas Erlaubtes macht und ihr Geschäft nicht auf Zinsen, Alkohol oder Glücksspiel beruht.", ["2:275"], [], []),
("Geld", "Sneaker günstig kaufen und teurer weiterverkaufen", "halal", "Handel mit Gewinn ist erlaubt: Allah hat den Handel erlaubt. Wichtig ist nur, dass du ehrlich bist und nichts über die Ware verschweigst.", ["2:275"], [2072], []),
("Geld", "Beim Verkauf verschweigen, dass das Handy einen Riss hat", "haram", "Der Prophet ﷺ fand bei einem Händler nasses Getreide unter trockenem und sagte: Wer betrügt, gehört nicht zu mir.", [], [], [102]),
("Geld", "Jemanden bestechen", "haram", "Der Quran verbietet, Besitz zu Unrecht zu verschlingen und damit Richter oder Amtsträger zu bestechen.", ["2:188"], [], []),
("Geld", "Schwarzfahren", "haram", "Wer ohne Ticket fährt, nimmt eine Leistung, ohne zu bezahlen – das ist Besitz zu Unrecht verschlingen.", ["2:188", "5:1"], [], []),
("Geld", "Etwas im Laden mitgehen lassen", "haram", "Diebstahl ist eine schwere Sünde. Der Prophet ﷺ sagte sogar über den, der ein Ei stiehlt: Allah verflucht den Dieb.", ["5:38"], [6783], [1687]),
("Geld", "Gefundenes Portemonnaie einfach behalten", "haram", "Fundsachen muss man bekannt machen, damit der Besitzer sie zurückbekommt. Einfach behalten ist nicht erlaubt.", [], [2372], [1722]),
("Geld", "Einem Mitarbeiter den Lohn nicht zahlen", "haram", "Allah sagt in einem Hadith Qudsi: Ich bin am Tag der Auferstehung der Gegner dessen, der einen Arbeiter einstellt und ihm seinen Lohn nicht gibt.", [], [2227], []),
("Geld", "Mit eigener Arbeit Geld verdienen", "halal", "Der Prophet ﷺ sagte: Niemand isst besseres Essen als das, was er mit seiner eigenen Hände Arbeit verdient.", [], [2072], []),
("Geld", "Betteln, obwohl man gar nicht in Not ist", "haram", "Der Prophet ﷺ warnte: Wer ständig bettelt, kommt am Tag der Auferstehung ohne Fleisch im Gesicht.", [], [1474], [1040]),
("Geld", "An Bedürftige spenden", "halal", "Der Quran vergleicht eine Spende mit einem Korn, aus dem sieben Ähren wachsen, mit hundert Körnern in jeder Ähre.", ["2:261"], [], []),
("Geld", "Zakat nicht zahlen, obwohl man muss", "haram", "Zakat ist eine Säule des Islam. Der Prophet ﷺ warnte: Wer sie nicht zahlt, dessen Besitz wird am Tag der Auferstehung zu einer giftigen Schlange.", ["9:34-35"], [1403], []),

# ---------------- Gebet & Fasten ----------------
("Gebet & Fasten", "Ein Pflichtgebet absichtlich auslassen", "haram", "Der Prophet ﷺ sagte: Zwischen dem Menschen und dem Unglauben steht das Unterlassen des Gebets.", ["19:59"], [], [82]),
("Gebet & Fasten", "In Schuhen beten", "halal", "Anas wurde gefragt, ob der Prophet ﷺ in seinen Sandalen betete – er sagte ja. Die Schuhe müssen sauber sein.", [], [386], [555]),
("Gebet & Fasten", "Nach dem Asr-Gebet noch freiwillig beten", "makruh", "Der Prophet ﷺ untersagte freiwillige Gebete nach Asr bis zum Sonnenuntergang. Nachgeholte Pflichtgebete sind davon nicht betroffen.", [], [586], [827]),
("Gebet & Fasten", "Direkt vor jemandem vorbeilaufen, der betet", "haram", "Der Prophet ﷺ sagte: Wüsste der Vorbeigehende, was er auf sich lädt, würde er lieber vierzig warten.", [], [510], [507]),
("Gebet & Fasten", "In der Moschee schlafen", "halal", "Ibn Umar schlief als junger, unverheirateter Mann in der Moschee des Propheten ﷺ.", [], [440], []),
("Gebet & Fasten", "In der Moschee auf den Boden spucken", "haram", "Der Prophet ﷺ sagte: Spucken in der Moschee ist eine Sünde.", [], [415], [552]),
("Gebet & Fasten", "Freitagsgebet ohne Grund schwänzen (für Männer)", "haram", "Der Quran ruft zum Freitagsgebet. Der Prophet ﷺ warnte, dass Allah das Herz derer versiegelt, die es vernachlässigen.", ["62:9"], [], [865]),
("Gebet & Fasten", "Quran ohne Wudu auswendig aufsagen", "halal", "Aischa berichtete, dass der Prophet ﷺ Allahs zu jeder Zeit gedachte. Auswendig rezitieren geht auch ohne Wudu.", [], [], [373]),
("Gebet & Fasten", "Den Quran ohne Wudu anfassen", "kommt", "Die meisten Gelehrten verlangen Wudu, um den Mushaf zu berühren, und stützen sich unter anderem auf 56:79. Andere verstehen den Vers als Aussage über die Engel und erlauben es.", ["56:79"], [], []),
("Gebet & Fasten", "Dua auf Deutsch machen", "halal", "Allah sagt: Ich bin nahe und erhöre den Bittenden. Du kannst in jeder Sprache zu Allah beten.", ["2:186"], [], []),
("Gebet & Fasten", "Ruqya mit der Fatiha machen", "halal", "Ein Gefährte las die Fatiha über einen Kranken, und der Prophet ﷺ bestätigte das.", [], [5736], [2201]),
("Gebet & Fasten", "Auf der Toilette in Richtung Qibla – in einem Gebäude", "kommt", "Im Freien hat der Prophet ﷺ es untersagt. Ibn Umar sah ihn aber in einem Haus anders sitzen. Viele Gelehrte erlauben es deshalb in Gebäuden, andere meiden es überall.", [], [144, 148], [264]),
("Gebet & Fasten", "Im Stehen urinieren", "halal", "Hudhayfa berichtete, dass der Prophet ﷺ an einem Abfallplatz im Stehen urinierte. Wichtig ist, dass man sich nicht beschmutzt.", [], [224], [273]),
("Gebet & Fasten", "Beim Wudu mit Wasser verschwenden", "makruh", "Der Prophet ﷺ machte Wudu mit sehr wenig Wasser (einem mudd). Verschwendung ist auch beim Wudu nicht gut.", ["7:31"], [201], []),
("Gebet & Fasten", "Am Tag des Eid fasten", "haram", "Der Prophet ﷺ hat das Fasten an den beiden Eid-Tagen verboten.", [], [1990], [1137]),
("Gebet & Fasten", "Nur am Freitag fasten", "makruh", "Der Prophet ﷺ sagte: Fastet nicht nur am Freitag, außer mit einem Tag davor oder danach.", [], [1985], [1144]),
("Gebet & Fasten", "Im Ramadan aus Versehen trinken – und dann weiterfasten", "halal", "Wer aus Vergessen isst oder trinkt, soll sein Fasten vollenden – Allah hat ihm zu essen und zu trinken gegeben.", [], [1933], [1155]),
("Gebet & Fasten", "Als Kranker im Ramadan nicht fasten", "halal", "Wer krank ist, darf das Fasten aussetzen und die Tage später nachholen.", ["2:184-185"], [], []),
("Gebet & Fasten", "Auf Reisen das Fasten brechen", "halal", "Der Quran erlaubt Reisenden, später nachzuholen. Der Prophet ﷺ sagte zu Hamza al-Aslami: Faste, wenn du willst, oder brich das Fasten, wenn du willst.", ["2:184"], [1943], [1121]),
("Gebet & Fasten", "Fasten während der Periode", "haram", "Während der Periode wird nicht gefastet und nicht gebetet. Die Fastentage werden später nachgeholt, die Gebete nicht.", [], [304], [335]),
("Gebet & Fasten", "Duschen, während man fastet", "halal", "Der Prophet ﷺ wachte manchmal im Ramadan im Zustand der großen Unreinheit auf, wusch sich und fastete.", [], [1926], [1109]),

# ---------------- Miteinander ----------------
("Miteinander", "Die Eltern anschreien", "haram", "Der Quran sagt: Sag zu ihnen nicht einmal „uff“ und fahr sie nicht an. Ibn Kathir erklärt, dass schon das kleinste abfällige Wort verboten ist.", ["17:23"], [], []),
("Miteinander", "Den Eltern nicht gehorchen, wenn sie eine Sünde verlangen", "halal", "Gehorsam gibt es nur im Guten. Der Quran sagt: Wenn sie dich zu etwas Falschem drängen, gehorche ihnen nicht – aber begleite sie weiter freundlich.", ["31:15"], [7257], [1840]),
("Miteinander", "Kontakt zur nicht-muslimischen Mutter halten", "halal", "Asma fragte den Propheten ﷺ, ob sie ihrer nicht-muslimischen Mutter Gutes tun darf. Er sagte: Ja, halte die Beziehung zu deiner Mutter.", ["60:8"], [2620], [1003]),
("Miteinander", "Den Kontakt zu Verwandten abbrechen", "haram", "Der Prophet ﷺ sagte: Wer die Verwandtschaftsbande zerreißt, kommt nicht ins Paradies.", [], [5984], [2556]),
("Miteinander", "Nach einem Streit länger als drei Tage nicht reden", "haram", "Der Prophet ﷺ sagte: Es ist nicht erlaubt, seinen Bruder länger als drei Nächte zu meiden. Der Bessere ist, wer zuerst grüßt.", [], [6077], [2560]),
("Miteinander", "Lästern", "haram", "Lästern (ghiba) heißt, über jemanden etwas zu sagen, das er nicht hören möchte. Der Quran vergleicht es damit, das Fleisch seines toten Bruders zu essen.", ["49:12"], [], [2589]),
("Miteinander", "Gerüchte weitertragen", "haram", "Der Prophet ﷺ sagte: Wer Gerede weiterträgt, um Streit zu säen, kommt nicht ins Paradies.", [], [6056], [105]),
("Miteinander", "Nachrichten teilen, ohne zu prüfen, ob sie stimmen", "haram", "Der Quran sagt: Wenn euch jemand eine Nachricht bringt, prüft sie, damit ihr nicht anderen aus Unwissenheit schadet.", ["49:6"], [], []),
("Miteinander", "Lügen, um zwei zerstrittene Freunde zu versöhnen", "halal", "Der Prophet ﷺ sagte: Wer Menschen versöhnt und dabei Gutes sagt, ist kein Lügner.", [], [2692], [2605]),
("Miteinander", "Lügen", "haram", "Der Prophet ﷺ sagte: Die Wahrheit führt zum Guten und das Gute ins Paradies. Die Lüge führt zum Schlechten und das Schlechte ins Feuer.", ["9:119"], [6094], [2607]),
("Miteinander", "Ein Versprechen brechen", "haram", "Der Prophet ﷺ nannte es ein Zeichen des Heuchlers: Wenn er etwas verspricht, hält er es nicht.", ["17:34"], [33], [59]),
("Miteinander", "Jemanden wegen seines Aussehens auslachen", "haram", "Der Quran sagt: Keiner soll über den anderen spotten – vielleicht ist der andere besser als er.", ["49:11"], [], []),
("Miteinander", "Jemandem neidisch wünschen, dass er verliert, was er hat", "haram", "Der Prophet ﷺ sagte: Beneidet einander nicht, hasst einander nicht und seid Brüder.", [], [6065], []),
("Miteinander", "Jemanden bewundern und genauso gut werden wollen", "halal", "Das ist gesunder Ehrgeiz (ghibta). Der Prophet ﷺ sagte: Beneiden darf man nur zwei – den, der sein Geld im Guten ausgibt, und den, der Wissen hat und es lehrt.", [], [73], [816]),
("Miteinander", "Einen Muslim beschimpfen", "haram", "Der Prophet ﷺ sagte: Einen Muslim zu beschimpfen ist Frevel (fusuq).", [], [48], [64]),
("Miteinander", "Jemanden verfluchen", "haram", "Der Prophet ﷺ sagte: Einen Gläubigen zu verfluchen ist wie ihn zu töten.", [], [6047], []),
("Miteinander", "Heimlich das Handy eines Freundes durchsuchen", "haram", "Der Quran sagt: Spioniert einander nicht nach.", ["49:12"], [], []),
("Miteinander", "Im Spaß ein Messer auf jemanden richten", "haram", "Der Prophet ﷺ sagte: Keiner soll mit einer Waffe auf seinen Bruder zeigen – der Satan könnte seine Hand führen.", [], [7072], [2617]),
("Miteinander", "Die Nachbarn ständig nerven", "haram", "Der Prophet ﷺ sagte: Der ist kein Gläubiger, vor dessen Bosheit sein Nachbar nicht sicher ist.", [], [6016], [46]),
("Miteinander", "Eine heimliche Beziehung vor der Ehe", "haram", "Der Quran sagt: Kommt der Unzucht nicht nahe. Ibn Kathir erklärt, dass auch alles verboten ist, was dorthin führt.", ["17:32", "24:30"], [], []),
("Miteinander", "Pornos schauen", "haram", "Der Quran fordert Männer und Frauen auf, ihre Blicke zu senken und ihre Scham zu bewahren.", ["24:30-31"], [], []),
("Miteinander", "Witze über den Islam machen", "haram", "Der Quran tadelt die, die über Allah, Seine Zeichen und Seinen Gesandten spotten und dann sagen, sie hätten nur gescherzt.", ["9:65-66"], [], []),
("Miteinander", "„Ich schwöre auf meine Mutter“ sagen", "haram", "Der Prophet ﷺ sagte: Allah verbietet euch, bei euren Vätern zu schwören. Wer schwört, schwöre bei Allah oder schweige.", [], [6646], [1646]),
("Miteinander", "„Wallah“ aus Gewohnheit sagen", "kommt", "Gedankenlose Schwüre wie „nein, wallah“ werden nicht angerechnet – so erklärte Aischa den Vers 5:89. Wer aber bewusst bei Allah schwört, muss es ernst meinen.", ["5:89"], [4613], []),
("Miteinander", "Mit „Wallah“ bewusst lügen", "haram", "Ein falscher Schwur bei Allah (al-yamin al-ghamus) zählt zu den großen Sünden.", ["3:77"], [6675], []),
("Miteinander", "Weinen, wenn jemand stirbt", "halal", "Als sein Sohn Ibrahim starb, weinte der Prophet ﷺ und sagte: Das Auge weint und das Herz ist traurig.", [], [1303], [2315]),
("Miteinander", "Bei einer Beerdigung schreien und sich ins Gesicht schlagen", "haram", "Der Prophet ﷺ sagte: Nicht zu uns gehört, wer sich auf die Wangen schlägt und seine Kleidung zerreißt.", [], [1294], [103]),

# ---------------- Körper & Kleidung ----------------
("Körper", "Sich ein Tattoo stechen lassen", "haram", "Der Prophet ﷺ verfluchte die, die tätowieren und sich tätowieren lassen.", [], [5931], [2125]),
("Körper", "Augenbrauen zupfen", "haram", "Im selben Hadith wie das Tattoo-Verbot wird das Auszupfen der Augenbrauen genannt. Die meisten Gelehrten verstehen es als verboten.", [], [5931], [2125]),
("Körper", "Haarverlängerung (Extensions) tragen", "haram", "Der Prophet ﷺ verfluchte die, die fremdes Haar an das eigene ansetzen und ansetzen lassen.", [], [5934], [2122]),
("Körper", "Als Mann eine Goldkette tragen", "haram", "Der Prophet ﷺ verbot Männern Goldschmuck. Als er einen Mann mit Goldring sah, nahm er ihn ab und warf ihn weg.", [], [5863], [2090]),
("Körper", "Als Frau Goldschmuck tragen", "halal", "Frauen dürfen Gold tragen – darüber sind sich die Gelehrten einig. Am Eid spendeten Frauen sogar ihren Schmuck.", ["43:18"], [98], []),
("Körper", "Als Mann einen Silberring tragen", "halal", "Der Prophet ﷺ trug selbst einen Silberring, in den „Muhammad Rasulullah“ eingraviert war.", [], [65], []),
("Körper", "Als Mann ein Seidenhemd tragen", "haram", "Der Prophet ﷺ sagte: Wer im Diesseits Seide trägt, trägt sie nicht im Jenseits. Das gilt für Männer.", [], [5832], [2069]),
("Körper", "Als Frau ein Seidenkleid tragen", "halal", "Der Prophet ﷺ schenkte Ali ein Seidengewand und sagte, er solle es unter den Frauen seiner Familie aufteilen.", [], [2614], [2071]),
("Körper", "Graue Haare färben – nicht schwarz", "halal", "Der Prophet ﷺ sagte: Juden und Christen färben nicht, also unterscheidet euch von ihnen. Viele Gelehrte empfehlen Henna.", [], [3462], [2103]),
("Körper", "Haare teilweise rasieren, teilweise lang lassen", "makruh", "Der Prophet ﷺ untersagte qaza' – einen Teil des Kopfes zu rasieren und einen anderen stehen zu lassen.", [], [5921], [2120]),
("Körper", "Fingernägel über 40 Tage nicht schneiden", "makruh", "Anas sagte: Uns wurde eine Frist gesetzt, die Nägel zu schneiden – nicht länger als vierzig Nächte.", [], [5889], [258]),
("Körper", "Eine Schönheits-OP machen lassen", "kommt", "Aus reiner Eitelkeit gilt sie als Veränderung der Schöpfung Allahs, die im Hadith verflucht wird. Aus medizinischen Gründen oder nach einem Unfall ist sie erlaubt.", [], [5931], [2125]),
("Körper", "Parfüm mit Alkohol benutzen", "kommt", "Viele heutige Gelehrte erlauben es, weil es nicht getrunken wird und nicht berauscht. Andere halten Alkohol für unrein und raten davon ab.", ["5:90"], [], []),

# ---------------- Alltag ----------------
("Alltag", "Einen Wachhund für Haus und Hof halten", "halal", "Der Prophet ﷺ erlaubte Hunde zum Jagen, für die Herde und für die Landwirtschaft.", [], [2322], [1575]),
("Alltag", "Einen Hund nur als Haustier in der Wohnung halten", "kommt", "Wer ohne Bedarf einen Hund hält, dem wird laut Hadith täglich Lohn abgezogen. Die meisten Gelehrten halten es für haram, manche für makruh.", [], [5480], [1574]),
("Alltag", "Einen Vogel als Haustier halten", "halal", "Der kleine Abu Umayr hatte einen Vogel, und der Prophet ﷺ fragte ihn im Spaß: Was hat dein Vögelchen gemacht?", [], [6129], [2150]),
("Alltag", "Tiere quälen", "haram", "Eine Frau kam ins Feuer, weil sie eine Katze einsperrte, ohne ihr Futter zu geben.", [], [3318], [2242]),
("Alltag", "Auf lebende Tiere zielen", "haram", "Der Prophet ﷺ sagte: Nehmt nichts, das eine Seele hat, als Zielscheibe.", [], [5515], [1957]),
("Alltag", "Einen Ameisenhaufen anzünden", "haram", "Ein früherer Prophet ließ einen Ameisenhaufen verbrennen, und Allah tadelte ihn dafür. Strafe mit Feuer steht nur Allah zu.", [], [3019, 3016], [2241]),
("Alltag", "Einem durstigen Hund Wasser geben", "halal", "Ein Mann gab einem durstigen Hund Wasser, und Allah vergab ihm dafür. Für jedes Lebewesen gibt es Lohn.", [], [2363], [2244]),
("Alltag", "Zu einem Wahrsager gehen", "haram", "Der Prophet ﷺ sagte: Wer einen Wahrsager aufsucht und ihn etwas fragt, dessen Gebet wird vierzig Nächte nicht angenommen.", [], [], [2230]),
("Alltag", "Zauberei (Sihr) betreiben", "haram", "Zauberei gehört zu den sieben verderblichen Sünden.", ["2:102"], [2766], [89]),
("Alltag", "Videospiele spielen", "kommt", "Spielen an sich ist erlaubt. Haram wird es, wenn das Spiel verbotene Inhalte hat oder du deswegen Gebete verpasst.", ["62:9"], [], []),
("Alltag", "Kinder mit Puppen spielen lassen", "halal", "Aischa spielte als Mädchen im Haus des Propheten ﷺ mit Puppen, und ihre Freundinnen kamen zum Spielen.", [], [6130], [2440]),
("Alltag", "Bogenschießen als Sport", "halal", "Der Prophet ﷺ sagte: Die Stärke liegt im Schießen – und wiederholte es dreimal.", [], [], [1917]),
("Alltag", "In der Klausur abschreiben", "haram", "Der Prophet ﷺ sagte: Wer betrügt, gehört nicht zu mir. Abschreiben täuscht Lehrer und benachteiligt alle, die ehrlich lernen.", [], [], [102]),

# ---------------- 2026-11-13 ----------------
("Miteinander", "Auf andere herabschauen, weil sie keine Markenklamotten haben", "haram", "Der Prophet ﷺ sagte: Wer auch nur ein Senfkorn Hochmut im Herzen hat, kommt nicht ins Paradies. Schöne Kleidung ist dabei kein Problem – Hochmut heißt, die Wahrheit abzulehnen und Menschen zu verachten.", [], [], [91]),
("Miteinander", "Jemanden mit einem fiesen Spitznamen rufen", "haram", "Der Quran sagt: Gebt einander keine beleidigenden Beinamen. Ein Spitzname, den der andere nicht mag, ist kein harmloser Spaß.", ["49:11"], [], []),
("Miteinander", "Ohne Erlaubnis in die Wohnung eines Freundes gehen", "haram", "Der Quran sagt: Betretet keine fremden Häuser, bevor ihr um Erlaubnis gebeten und gegrüßt habt. Abu Musa bat bei Umar dreimal um Einlass – und ging, als keine Antwort kam.", ["24:27-28"], [6245], []),
("Essen", "Hasenfleisch essen", "halal", "Anas fing einen Hasen, Abu Talha schlachtete ihn und schickte dem Propheten ﷺ eine Keule – und er nahm sie an.", [], [5535], [1953]),
("Essen", "Beim Trinken ins Glas atmen", "makruh", "Der Prophet ﷺ sagte: Wenn ihr trinkt, atmet nicht in das Gefäß. Besser: absetzen, ausatmen, weitertrinken.", [], [5630], [267]),
("Essen", "Einen heruntergefallenen Bissen aufheben und essen", "halal", "Der Prophet ﷺ sagte: Fällt einem ein Bissen herunter, soll er ihn aufheben, den Schmutz entfernen und ihn essen – und ihn nicht dem Satan lassen.", [], [], [2033]),
("Miteinander", "Einen kranken Freund besuchen", "halal", "Kranke zu besuchen gehört zu den Rechten, die ein Muslim gegenüber anderen Muslimen hat – zusammen mit dem Erwidern des Grußes und der Annahme einer Einladung.", [], [1240], [2162]),
("Alltag", "Einem Freund einfach so ein Geschenk machen", "halal", "Aischa berichtete: Der Prophet ﷺ nahm Geschenke an und schenkte selbst etwas zurück.", [], [2585], []),
("Gebet & Fasten", "Im Sitzen beten, weil man nicht stehen kann", "halal", "Der Prophet ﷺ sagte zu einem Kranken: Bete im Stehen; wenn du nicht kannst, im Sitzen; und wenn auch das nicht geht, auf der Seite liegend.", [], [1117], []),
("Gebet & Fasten", "Tayammum statt Wudu, wenn kein Wasser da ist", "halal", "Der Quran erlaubt, sich mit reiner Erde zu reinigen, wenn kein Wasser da ist. Der Prophet ﷺ sagte zu einem Mann ohne Wasser: Mach Tayammum mit Erde, das genügt dir.", ["4:43", "5:6"], [344], []),
]

# keyword checks for each cited hadith (lower-case regex against the English text)
CHK = {
 "B": {5535:"rabbit",5630:"breath",1240:"sick",2585:"gift",1117:"sitting",344:"tayammum",6245:"permission",242:"intoxicat",5581:"mind",4362:"sea|fish",5495:"locust",5520:"horse",5530:"fang",153:"breathe|right hand",5426:"gold|silver",5409:"food",855:"garlic",5615:"stand",2287:"rich|delay|procrastinat",2387:"repay|pay it back",6783:"egg",2372:"lost|announce|find",2227:"labou?rer|wage|employ",2072:"hand",1474:"begg|ask",1403:"snake",386:"shoe|sandal",586:"asr|`asr",510:"front|passing|pass",636:"calm|tranquil|haste|run|solemn",440:"mosque",415:"spit",1990:"fast",1985:"friday",1933:"forget|forgot",1943:"fast",304:"menstru|fast",1926:"bath|janaba",201:"mudd|ablution",144:"qibla",148:"house|sham|qibla",224:"urinat",5736:"fatiha|ruqya|recit",7257:"obedien",2620:"mother",5984:"kinship|ties|relations",6077:"three",6056:"tale|nammam|carries",2692:"peace|liar",6094:"truth|lie|lying",33:"hypocrite",6065:"envy|jealous|hate",73:"wish|envy",48:"abus|fusuq|evil",6047:"curs",7072:"weapon",6016:"neighbou?r",6646:"swear|father",4613:"oath|laghw|thoughtless",6675:"oath|ghamus|false",1303:"tear|ibrahim",1294:"cheek|slap",5931:"tattoo",5934:"hair|wig|false",5863:"gold|ring",98:"ear|ring",65:"silver",5832:"silk",2614:"silk",3462:"dye",5921:"qaza|shave",948:"`id|eid|cloak|beautif",5678:"cure|disease|remedy",3318:"cat",2322:"dog",5480:"dog",6129:"nughair|bird",5515:"target",3019:"ant",3016:"fire",2363:"dog",1829:"kill|scorpion",2766:"seven",6130:"doll",2869:"race|horse",5889:"nail|fitra"},
 "M": {91:"pride",1953:"hare",2033:"mouthful|morsel",2162:"sick",2003:"intoxica",1935:"sea|fish|whale|anbar",1952:"locust",1941:"horse|ass|donkey",1932:"fang",1934:"talon|claw|bird",267:"right hand|breathe",2067:"gold|silver",2064:"food",564:"garlic|onion",2024:"stand",1598:"usury|interest|riba",1564:"rich|delay|wealthy",1722:"lost|announce|find",1040:"begg|ask",102:"deceive|cheat|corn|grain",1687:"egg|thief",82:"prayer",555:"sandal|shoe",827:"asr|`asr|prayer",507:"front|passing",602:"calm|tranquil|haste|run|dignity",552:"spit",865:"friday|seal",373:"remember|times",1137:"fast",1144:"friday",1155:"forget|forgot",1121:"fast",335:"menstru|fast",1109:"bath|bathe|junub|sexual|seminal|janaba",264:"qibla",273:"urinat",2201:"recit|charm|fatiha|scorpion",1840:"obedien",1003:"mother",2556:"kinship|ties|relation",2560:"three",2589:"backbit",105:"tale|carr",2605:"reconcil|liar",2607:"truth|lie",59:"hypocrite",2559:"envy|jealous|hate",816:"envy|wish",64:"abus|evil",2617:"weapon|iron|point",46:"neighbou?r",1646:"swear|father",2315:"ibrahim|tear|eye",103:"cheek|slap",977:"grave",2125:"tattoo",2122:"hair|false|wig",2090:"gold|ring",2091:"silver|ring",2069:"silk",2071:"silk",2103:"dye|colour|color",2120:"qaza|shav",258:"nail",2242:"cat",1575:"dog",1574:"dog",2150:"bird|nughair",1957:"target",2241:"ant",2244:"dog",1198:"kill",2230:"diviner|fortune",89:"seven",2440:"doll",1917:"shoot|power|strength",1870:"race|horse",1513:"pebble|uncertain|gharar|hazard|deceit",1984:"medicine|wine|remedy",2020:"left hand|right hand"},
}

idx = json.load(open("/home/claude/data/hadith/idx.json"))
TXT = {"B": dict(idx["B"]), "M": dict(idx["M"])}
bad = 0
for _, q, _, _, _, bs, ms in Q:
    for col, nums in (("B", bs), ("M", ms)):
        for n in nums:
            t = TXT[col].get(str(n))
            if not t:
                print("MISSING", col, n, q); bad += 1; continue
            kw = CHK[col].get(n)
            if kw is None:
                print("NOCHECK", col, n, q, "|", t[:200].replace("\n", " ")); bad += 1; continue
            if kw and not re.search(kw, t.lower()):
                print("NOMATCH", col, n, kw, q, "|", t[:260].replace("\n", " ")); bad += 1

def src(qr, bs, ms):
    parts = []
    for r in qr:
        parts.append(f"Quran {r.replace('-', '–')} mit Tafsir {IK}")
    if bs: parts.append("Sahih al-Bukhari " + ", ".join(map(str, bs)))
    if ms: parts.append("Sahih Muslim " + ", ".join(map(str, ms)))
    return " · ".join(parts)

for c, q, a, e, qr, bs, ms in Q:
    assert a in ("halal", "haram", "makruh", "kommt"), q
    assert qr or bs or ms, ("no source", q)
print("questions:", len(Q), "problems:", bad)
from collections import Counter
print(Counter(x[0] for x in Q), Counter(x[2] for x in Q))
qs = [q for _, q, *_ in Q]
dup = [k for k, v in Counter(qs).items() if v > 1]
print("dupes", dup)
if "--write" in sys.argv:
    out = ["// Inhalte für „Ist das halal?“ auf koshertrivia.de/halal",
           "// Antworten aus sunnitischer Sicht; wo die Gelehrten sich uneinig sind, lautet die Antwort „kommt drauf an“.",
           "// Quellen: Quran mit Tafsir Ibn Kathir, Sahih al-Bukhari (Nummerierung nach Fath al-Bari) und Sahih Muslim (Nummerierung nach Abd al-Baqi).",
           "window.HALAL = ["]
    for c, q, a, e, qr, bs, ms in Q:
        out.append("  " + json.dumps({"cat": c, "q": q, "a": a, "e": e, "src": src(qr, bs, ms)}, ensure_ascii=False) + ",")
    out.append("];")
    open(sys.argv[sys.argv.index("--write") + 1], "w").write("\n".join(out) + "\n")
