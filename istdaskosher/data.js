// Inhalte für istdaskosher.de
// Antworten nach traditioneller (orthodoxer) Halacha; wo Strömungen oder Bräuche abweichen, steht es in der Erklärung.
// a: "ja" = erlaubt/koscher, "nein" = verboten/nicht koscher, "kommt" = kommt drauf an

window.QUESTIONS = [
  // Essen
  { cat: "Essen", q: "Gummibärchen mit Schweinegelatine", a: "nein", e: "Gelatine aus Schweinen ist nicht koscher. Es gibt aber koschere Fruchtgummis – mit Gelatine von koscher geschlachteten Rindern, Fischgelatine oder pflanzlichen Geliermitteln.", src: "3. Mose 11,7" },
  { cat: "Essen", q: "Shrimps", a: "nein", e: "Aus dem Wasser sind nur Tiere mit Flossen und Schuppen erlaubt. Garnelen, Muscheln, Hummer und Tintenfisch fallen alle raus.", src: "3. Mose 11,9–12" },
  { cat: "Essen", q: "Lachs", a: "ja", e: "Lachs hat Flossen und Schuppen – damit ist er koscher. Fisch gilt außerdem als „parve“, also weder fleischig noch milchig.", src: "3. Mose 11,9" },
  { cat: "Essen", q: "Cheeseburger", a: "nein", e: "Fleisch und Milch werden nie zusammen gegessen oder gekocht. Die Regel geht auf den Vers zurück, man solle das Böcklein nicht in der Milch seiner Mutter kochen – er steht dreimal in der Tora.", src: "2. Mose 23,19" },
  { cat: "Essen", q: "Hähnchen in Sahnesoße", a: "nein", e: "Von der Tora her betrifft das Verbot nur Säugetiere, die Rabbiner haben es aber auf Geflügel ausgeweitet. Hähnchen zählt deshalb als „fleischig“.", src: "Talmud, Chullin 104b" },
  { cat: "Essen", q: "Überbackener Fisch mit Käse", a: "kommt", e: "Fisch ist parve und darf in den meisten Gemeinden mit Milch gegessen werden. Viele sephardische Juden verzichten aber darauf – gestützt auf einen Hinweis von Rabbi Josef Karo, dem Verfasser des Schulchan Aruch.", src: "Beit Josef, Jore De’a 87" },
  { cat: "Essen", q: "Kamelfleisch", a: "nein", e: "Erlaubt sind Säugetiere, die wiederkäuen und gespaltene Hufe haben. Das Kamel käut wieder, hat aber keine gespaltenen Hufe – die Tora nennt es ausdrücklich.", src: "3. Mose 11,4" },
  { cat: "Essen", q: "Giraffe", a: "ja", e: "Die Giraffe ist ein Wiederkäuer mit gespaltenen Hufen und damit eigentlich koscher. Gegessen wird sie trotzdem praktisch nie: Sie ist selten, geschützt und eine Schächtung wäre enormer Aufwand.", src: "3. Mose 11,3" },
  { cat: "Essen", q: "Kaninchen", a: "nein", e: "Hasen und Kaninchen haben keine gespaltenen Hufe. Der Hase wird in der Tora sogar namentlich als unrein genannt.", src: "3. Mose 11,6" },
  { cat: "Essen", q: "Heuschrecken", a: "kommt", e: "Die Tora erlaubt tatsächlich vier Arten von Heuschrecken. Heute weiß aber fast niemand mehr sicher, welche das sind – nur jemenitische und einige nordafrikanische Juden haben eine Überlieferung und essen sie.", src: "3. Mose 11,22" },
  { cat: "Essen", q: "Honig", a: "ja", e: "Bienen sind nicht koscher, ihr Honig aber schon. Der Talmud erklärt: Honig ist Nektar, den die Biene nur sammelt und verarbeitet – er stammt nicht aus ihrem Körper wie Milch.", src: "Talmud, Bechorot 7b" },
  { cat: "Essen", q: "Truthahn", a: "ja", e: "Bei Vögeln braucht es eine Überlieferung, welche Arten erlaubt sind. Der Truthahn kam erst aus Amerika und hatte keine – er wurde trotzdem fast überall als koscher akzeptiert.", src: "3. Mose 11,13–19" },
  { cat: "Essen", q: "Straußenfleisch", a: "nein", e: "Der Strauß steht nach traditioneller Übersetzung in der Liste der verbotenen Vögel.", src: "3. Mose 11,16" },
  { cat: "Essen", q: "Ein Ei mit Blutfleck", a: "nein", e: "Blut zu essen ist verboten. Eier werden deshalb vor dem Kochen aufgeschlagen und kontrolliert, eines mit Blutfleck wird weggeworfen. Bei heutigen unbefruchteten Eiern sind manche Rabbiner großzügiger.", src: "Schulchan Aruch, Jore De’a 66" },
  { cat: "Essen", q: "Brot an Pessach", a: "nein", e: "Eine Woche lang ist alles Gesäuerte (Chametz) aus Weizen, Gerste, Roggen, Hafer und Dinkel tabu. Stattdessen gibt es Mazza – Brot, das in unter 18 Minuten fertig gebacken sein muss.", src: "2. Mose 12,15" },
  { cat: "Essen", q: "Reis an Pessach", a: "kommt", e: "Aschkenasische Juden verzichten an Pessach traditionell auf Hülsenfrüchte, Reis und Mais (Kitniot), sephardische nicht. Die konservative Bewegung hat Kitniot 2015 auch für Aschkenasen erlaubt.", src: "Rema zu Orach Chajim 453" },
  { cat: "Essen", q: "Schwertfisch", a: "nein", e: "Junge Schwertfische haben Schuppen, erwachsene verlieren sie. Orthodoxe Autoritäten sehen ihn deshalb als nicht koscher, die konservative Bewegung hat ihn zeitweise erlaubt.", src: "3. Mose 11,10" },
  { cat: "Essen", q: "Kaviar vom Stör", a: "nein", e: "Der Stör hat harte Knochenschuppen, die sich nicht ohne Verletzung der Haut ablösen lassen – nach orthodoxer Sicht zählen sie nicht. Konservative Rabbiner sehen das anders.", src: "Ramban zu 3. Mose 11,9" },
  { cat: "Essen", q: "Wein aus einem normalen Supermarkt", a: "nein", e: "Bei Wein gelten strengere Regeln als bei anderen Getränken: Er muss unter jüdischer Aufsicht hergestellt sein. Erkennbar ist koscherer Wein am Siegel auf dem Etikett.", src: "Schulchan Aruch, Jore De’a 123" },
  { cat: "Essen", q: "Direkt nach dem Schnitzel ein Milcheis", a: "nein", e: "Nach Fleisch wartet man, bevor man Milchiges isst – meist sechs Stunden. Deutsche Juden warten traditionell drei, niederländische nur eine Stunde.", src: "Schulchan Aruch, Jore De’a 89" },
  { cat: "Essen", q: "Erst ein Milcheis, gleich danach ein Schnitzel", a: "ja", e: "Andersherum geht es schneller: Mund ausspülen, etwas Neutrales essen, Hände waschen – fertig. Nur nach Hartkäse warten viele genauso lange wie nach Fleisch.", src: "Schulchan Aruch, Jore De’a 89,2" },
  { cat: "Essen", q: "Schweinefleisch, um nicht zu verhungern", a: "ja", e: "Ein Menschenleben zu retten (Pikuach Nefesch) geht fast allen Geboten vor. Wer sonst verhungern würde, muss sogar essen, was er findet.", src: "Talmud, Joma 85b" },

  // Schabbat & Feiertage
  { cat: "Schabbat", q: "Am Schabbat das Licht anschalten", a: "nein", e: "Am Schabbat ruhen 39 Arten von Arbeit, darunter Feuer entzünden. Strom einschalten zählt nach orthodoxer Auffassung dazu.", src: "2. Mose 35,3" },
  { cat: "Schabbat", q: "Am Schabbat Licht über eine Zeitschaltuhr, die man vorher eingestellt hat", a: "ja", e: "Die „Schabbatuhr“ ist ein Klassiker: Alles, was vor Schabbat eingestellt wurde, darf von selbst laufen.", src: "Schmirat Schabbat ke-Hilchata 13" },
  { cat: "Schabbat", q: "Am Schabbat mit dem Auto zur Synagoge fahren", a: "nein", e: "Nach orthodoxer Halacha ist Autofahren am Schabbat verboten, unter anderem wegen der Zündung. Die konservative Bewegung hat die Fahrt zur Synagoge 1950 erlaubt.", src: "Responsum zum Schabbat, Rabbinical Assembly 1950" },
  { cat: "Schabbat", q: "Am Schabbat jemanden mit dem Auto ins Krankenhaus fahren", a: "ja", e: "Nicht nur erlaubt, sondern Pflicht: Wo Lebensgefahr besteht, tritt der Schabbat zurück. Der Talmud sagt, man soll einen Schabbat brechen, damit der Mensch noch viele Schabbatot halten kann.", src: "Talmud, Joma 85b" },
  { cat: "Schabbat", q: "Am Schabbat am Handy chatten", a: "nein", e: "Bildschirm, Strom, Schreiben – gleich mehrere Verbote auf einmal. Viele genießen gerade das: 25 Stunden offline." },
  { cat: "Schabbat", q: "Am Schabbat mit dem Schabbat-Aufzug fahren", a: "ja", e: "Der Schabbat-Aufzug hält automatisch auf jeder Etage, niemand drückt einen Knopf. Die meisten orthodoxen Rabbiner erlauben ihn, einige sehr strenge nicht." },
  { cat: "Schabbat", q: "Am Schabbat Geld anfassen", a: "nein", e: "Geld ist „Mukze“ – Dinge, die man am Schabbat nicht braucht, bewegt man gar nicht erst.", src: "Schulchan Aruch, Orach Chajim 308–310" },
  { cat: "Schabbat", q: "Am Schabbat Essen auf einer Warmhalteplatte, die vorher angeschaltet wurde", a: "ja", e: "Die „Plata“ oder „Blech“ läuft seit Freitag. Darauf bleibt fertiges Essen warm – der Grund, warum es samstags oft Tscholent gibt, einen Eintopf, der über Nacht schmort.", src: "Schulchan Aruch, Orach Chajim 253" },
  { cat: "Schabbat", q: "Am Schabbat in der Stadt einen Schlüssel in der Hosentasche tragen", a: "kommt", e: "Tragen im öffentlichen Raum ist verboten – außer es gibt einen „Eruv“, eine symbolische Umzäunung, oft aus Drähten zwischen Masten. Manhattan, London und viele andere Städte haben einen.", src: "Talmud, Traktat Eruvin" },
  { cat: "Schabbat", q: "An Jom Kippur essen, wenn man schwer krank ist", a: "ja", e: "An Jom Kippur wird 25 Stunden gefastet – aber nicht, wenn es die Gesundheit gefährdet. Dann ist Essen sogar Pflicht.", src: "Schulchan Aruch, Orach Chajim 618" },

  // Körper & Kleidung
  { cat: "Körper", q: "Ein Tattoo stechen lassen", a: "nein", e: "Tätowierungen verbietet die Tora ausdrücklich. Ein verbreiteter Mythos stimmt aber nicht: Mit Tattoo darf man trotzdem auf einem jüdischen Friedhof beerdigt werden.", src: "3. Mose 19,28" },
  { cat: "Körper", q: "Den Bart mit einer Rasierklinge rasieren", a: "nein", e: "Verboten ist, die Ecken des Bartes mit einer Klinge zu „zerstören“. Ein Elektrorasierer, der wie eine Schere schneidet, ist nach den meisten Meinungen erlaubt.", src: "3. Mose 19,27" },
  { cat: "Körper", q: "Ein Pulli aus Wolle und Leinen gemischt", a: "nein", e: "Diese Mischung heißt Schaatnes und ist verboten. Es gibt sogar Labore, die Kleidung darauf untersuchen.", src: "5. Mose 22,11" },
  { cat: "Körper", q: "Ohrlöcher stechen", a: "ja", e: "Dafür gibt es kein Verbot – Ohrringe werden schon in der Tora erwähnt.", src: "2. Mose 32,2" },
  { cat: "Körper", q: "In den Wochen zwischen Pessach und Schawuot zum Friseur", a: "kommt", e: "In der Omer-Zeit gelten Trauerbräuche, viele lassen sich die Haare nicht schneiden. Wann genau, ist je nach Gemeinde verschieden – am 33. Tag (Lag baOmer) gehen viele zum Friseur.", src: "Schulchan Aruch, Orach Chajim 493" },
  { cat: "Körper", q: "Einer Frau oder einem Mann zur Begrüßung die Hand geben", a: "kommt", e: "Viele orthodoxe Juden berühren das andere Geschlecht außerhalb der Familie nicht („Schomer Negia“). Andere geben die Hand, um niemanden zu beschämen. Liberale Juden sehen darin kein Problem.", src: "Schulchan Aruch, Even haEser 21" },

  // Alltag
  { cat: "Alltag", q: "Ein Blatt mit dem hebräischen Gottesnamen in den Müll werfen", a: "nein", e: "Geschriebene Gottesnamen werden nicht vernichtet, sondern in einer Genisa gesammelt und begraben. Deshalb schreiben manche auch auf Deutsch „G’tt“.", src: "5. Mose 12,3–4" },
  { cat: "Alltag", q: "Einen nichtjüdischen Freund zum Schabbatessen einladen", a: "ja", e: "Gäste einzuladen gilt als große Mitzwa – Abraham ist dafür das Vorbild. Das Essen ist sowieso vor Schabbat gekocht.", src: "1. Mose 18" },
  { cat: "Alltag", q: "Eine kleine Notlüge, um Streit zu vermeiden", a: "ja", e: "Der Talmud erlaubt, um des Friedens willen die Wahrheit zu „verändern“ – und führt als Beispiel sogar Gott an, der Saras Worte gegenüber Abraham abmilderte.", src: "Talmud, Jevamot 65b" },
  { cat: "Alltag", q: "Von einem jüdischen Freund Zinsen für einen Kredit verlangen", a: "nein", e: "Zinsen unter Juden sind verboten. Damit Banken trotzdem funktionieren, gibt es einen Vertrag namens „Heter Iska“, der den Kredit zur Geschäftspartnerschaft macht.", src: "2. Mose 22,24" },
  { cat: "Alltag", q: "Einen Hund als Haustier halten", a: "ja", e: "Haustiere sind erlaubt. Es gibt sogar eine Regel, die Tiere zuerst zu füttern, bevor man selbst isst.", src: "Talmud, Berachot 40a" },
  { cat: "Alltag", q: "Ein Tier unnötig quälen", a: "nein", e: "„Tza’ar ba’alei chajim“ – Tierleid zu verursachen ist verboten. Selbst am Schabbat darf man einem Tier in Not helfen.", src: "Talmud, Bava Metzia 32b" },
  { cat: "Alltag", q: "Am Schabbat live Fußball im Fernsehen schauen", a: "nein", e: "Den Fernseher anzuschalten ist am Schabbat verboten. Und selbst wenn er läuft: Sich davon unterhalten zu lassen, passt für die meisten Rabbiner nicht zum Ruhetag." },
];

window.FACTS = [
  { t: "„Koscher“ ist eigentlich Hebräisch", d: "„Kascher“ heißt tauglich oder geeignet. Über das Jiddische kam das Wort ins Deutsche – wenn etwas „nicht ganz koscher“ ist, ist es verdächtig." },
  { t: "Du sprichst mehr Jiddisch, als du denkst", d: "Massel, Schlamassel, meschugge, Ganove, Pleite, Tacheles, Zoff, schmusen, Kaff – alles Wörter, die über das Jiddische ins Deutsche gekommen sind." },
  { t: "Cola mit gelbem Deckel", d: "In den USA gibt es zu Pessach Coca-Cola mit gelber Kappe. Darin ist Zucker statt Maissirup, weil viele Aschkenasen an Pessach keinen Mais essen." },
  { t: "613 Gebote", d: "Nach traditioneller Zählung enthält die Tora 613 Gebote: 248 Gebote – so viele, wie man früher Körperteile zählte – und 365 Verbote, eins für jeden Tag des Jahres." },
  { t: "Die Giraffe ist koscher", d: "Wiederkäuer mit gespaltenen Hufen – passt. Auf dem Teller landet sie trotzdem nicht: Sie ist selten, geschützt, und die Schächtung eines so großen Tieres wäre enormer Aufwand." },
  { t: "Ein Aufzug, der nie fragt", d: "Der Schabbat-Aufzug hält automatisch in jedem Stockwerk. In Israel muss in neuen Gebäuden mit mehreren Aufzügen einer schabbattauglich sein." },
  { t: "Ein Draht um die Stadt", d: "Ein Eruv ist eine symbolische Umzäunung, oft nur ein Draht zwischen Laternenmasten. Innerhalb darf man am Schabbat Dinge tragen. Manhattan hat einen." },
  { t: "Sechs, drei oder eine Stunde", d: "Wie lange man nach Fleisch auf Milchiges wartet, hängt von der Herkunft ab: meist sechs Stunden, bei deutschen Juden traditionell drei, bei niederländischen eine." },
  { t: "Leben geht vor", d: "„Pikuach Nefesch“: Um ein Leben zu retten, darf und muss man fast jedes Gebot brechen – auch den Schabbat und das Fasten an Jom Kippur." },
  { t: "Der Schabbat beginnt mit dem Sonnenuntergang", d: "Jüdische Tage beginnen am Abend. Der Schabbat startet freitags kurz vor Sonnenuntergang und endet samstags, wenn drei Sterne am Himmel stehen." },
  { t: "Honig, das Paradox", d: "Die Biene ist nicht koscher, ihr Honig schon. Begründung im Talmud: Die Biene sammelt den Nektar nur, sie produziert ihn nicht wie ein Säugetier seine Milch." },
  { t: "Mazza in 18 Minuten", d: "Mazza für Pessach muss vom Kontakt des Mehls mit Wasser bis aus dem Ofen in unter 18 Minuten fertig sein – sonst könnte der Teig anfangen zu säuern." },
  { t: "Kleiderlabore", d: "Weil Wolle und Leinen nicht gemischt getragen werden dürfen, gibt es Schaatnes-Labore, die Anzüge unter dem Mikroskop untersuchen." },
  { t: "Das Siegel auf der Packung", d: "Ob etwas koscher ist, zeigt ein Hechscher – ein Siegel von einem Rabbinat oder einer Organisation. Auch viele ganz normale Supermarktprodukte haben eins." },
];

window.DESIGNS = [
  { text: "Nicht ganz\nkoscher.", item: "shirt", color: "#1f2b4d", ink: "#f4f6fb" },
  { text: "Alles\nkoscher?", item: "mug", color: "#ffffff", ink: "#1f2b4d" },
  { text: "Massel\ngehabt.", item: "tote", color: "#e8e1d3", ink: "#1f2b4d" },
  { text: "So ein\nSchlamassel.", item: "mug", color: "#2f6f5a", ink: "#ffffff" },
  { text: "Kommt\ndrauf an.", item: "shirt", color: "#f4f6fb", ink: "#1f2b4d", stamp: true },
  { text: "Tacheles\nreden.", item: "shirt", color: "#c4473a", ink: "#ffffff" },
  { text: "Meschugge,\naber herzlich.", item: "tote", color: "#1f2b4d", ink: "#f2d16b" },
  { text: "Ist das\nkoscher?", item: "sticker", color: "#2f6f5a", ink: "#ffffff", stamp: true },
];
