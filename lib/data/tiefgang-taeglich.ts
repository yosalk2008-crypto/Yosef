/**
 * Tiefgang: ten new daily questions per day from 16 Nov 2026 (`d` = the day, Europe/Berlin).
 * Written by AI (Claude); a scheduled task adds the next day's ten every evening.
 *
 * Rules for every entry:
 * - at least 50 valid answers (Israel never counts towards that), no politics, nothing hurtful
 * - `answers`: in order of how well-known an answer is – first = what everybody says, last = the rarest.
 *   `ranked()` turns the order into rarity points (10 → 95), the last one becomes the Tiefseeperle.
 *   Format "Name|alias|alias…" – add the English name and common spellings as aliases.
 * - or `countries`: ISO3 ids; rarity then comes from lib/data/bekanntheit.ts
 * - `key` is new and unique (prefix "t-"), `en` = [English question, English hint]
 * - check with: npx tsx scripts/data/check-tiefgang-taeglich.ts
 */
export type TagesFrage = {
  d: string;
  key: string;
  text: string;
  hint: string;
  en: [string, string];
  answers?: string[];
  countries?: string[];
};

export const TAEGLICH: TagesFrage[] = [
  // ---------- 16.11.2026 ----------
  {
    d: "2026-11-16",
    key: "t-inselgruppe",
    text: "Nenne eine Inselgruppe.",
    hint: "Archipele aus mehreren Inseln – auch Inselstaaten zählen.",
    en: ["Name an archipelago.", "Groups of islands – island nations count too."],
    answers: [
      "Kanaren|Kanarische Inseln|Canary Islands|Canaries", "Balearen|Balearische Inseln|Balearic Islands", "Malediven|Maldives", "Hawaii|Hawaii-Inseln|Hawaiian Islands", "Bahamas",
      "Seychellen|Seychelles", "Philippinen|Philippines", "Galápagos|Galapagos|Galápagos-Inseln|Galapagos Islands", "Azoren|Azores", "Japan", "Indonesien|Indonesia",
      "Färöer|Färöer-Inseln|Faroe Islands|Faroes", "Kykladen|Cyclades", "Lofoten", "Ostfriesische Inseln|East Frisian Islands", "Nordfriesische Inseln|North Frisian Islands",
      "Kanalinseln|Channel Islands", "Fidschi|Fiji", "Shetlandinseln|Shetland|Shetland Islands", "Orkney|Orkneyinseln|Orkney Islands", "Hebriden|Hebrides",
      "Kapverden|Kapverdische Inseln|Cape Verde|Cabo Verde", "Madeira", "Spitzbergen|Svalbard", "Falklandinseln|Falklands|Falkland Islands", "Bermuda|Bermudas",
      "Antillen|Große Antillen|Kleine Antillen|Antilles", "Komoren|Comoros", "Samoa", "Tonga", "Salomonen|Salomoninseln|Solomon Islands", "Jungferninseln|Virgin Islands",
      "Dodekanes|Dodecanese", "Ionische Inseln|Ionian Islands", "Westfriesische Inseln|West Frisian Islands", "Åland|Ålandinseln|Aland|Åland Islands",
      "Liparische Inseln|Äolische Inseln|Aeolian Islands|Lipari Islands", "Vanuatu", "Marshallinseln|Marshall Islands", "Kurilen|Kuril Islands", "Aleuten|Aleutian Islands",
      "Andamanen|Andaman Islands", "Nikobaren|Nicobar Islands", "Cookinseln|Cook Islands", "Neukaledonien|New Caledonia", "Gesellschaftsinseln|Society Islands",
      "Marquesas|Marquesas-Inseln|Marquesas Islands", "Tuamotu|Tuamotu-Archipel", "Kaimaninseln|Cayman Islands|Caymans", "Turks- und Caicosinseln|Turks and Caicos|Turks and Caicos Islands",
      "Scilly-Inseln|Isles of Scilly", "Vesterålen", "Molukken|Moluccas|Maluku", "Ryūkyū-Inseln|Ryukyu|Ryukyu Islands", "Sansibar-Archipel|Sansibar|Zanzibar",
      "Lakkadiven|Lakshadweep", "Kornaten|Kornati", "Ägadische Inseln|Egadi Islands", "Pontinische Inseln|Pontine Islands", "Karolinen|Caroline Islands", "Marianen|Mariana Islands",
      "Nowaja Semlja|Novaya Zemlya", "Franz-Josef-Land|Franz Josef Land", "Sewernaja Semlja|Severnaya Zemlya", "Neusibirische Inseln|New Siberian Islands",
      "Bijagós|Bissagos|Bijagos", "Kerguelen|Kerguelen Islands", "Südshetlandinseln|South Shetland Islands", "Tristan da Cunha", "Bismarck-Archipel|Bismarck Archipelago",
      "Queen-Elizabeth-Inseln|Queen Elizabeth Islands", "Tremiti-Inseln|Tremiti",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-berg-asien",
    text: "Nenne einen Berg in Asien.",
    hint: "Gipfel auf dem asiatischen Kontinent – vom Himalaya bis zu den Vulkanen Indonesiens.",
    en: ["Name a mountain in Asia.", "Peaks on the Asian continent – from the Himalayas to Indonesia’s volcanoes."],
    answers: [
      "Mount Everest|Everest|Chomolungma|Sagarmatha", "K2|Chogori", "Fuji|Fujisan|Fudschijama|Mount Fuji", "Kangchendzönga|Kangchenjunga|Kanchenjunga", "Ararat|Großer Ararat|Mount Ararat",
      "Annapurna", "Nanga Parbat", "Lhotse", "Makalu", "Cho Oyu", "Kinabalu|Mount Kinabalu", "Dhaulagiri", "Manaslu", "Damavand|Demawend|Mount Damavand",
      "Kailash|Mount Kailash", "Krakatau|Krakatoa", "Pinatubo|Mount Pinatubo", "Merapi|Mount Merapi", "Bromo|Mount Bromo", "Ama Dablam", "Shishapangma|Xixabangma",
      "Gasherbrum I|Hidden Peak", "Gasherbrum II", "Broad Peak", "Nuptse", "Pumori", "Pik Lenin|Lenin Peak|Ibn-Sina-Pik", "Pik Ismoil Somoni|Pik Kommunismus|Ismoil Somoni Peak",
      "Khan Tengri", "Dschengisch Tschokusu|Pik Pobeda|Jengish Chokusu|Victory Peak", "Mayon|Mount Mayon", "Rinjani|Gunung Rinjani|Mount Rinjani", "Semeru|Mount Semeru",
      "Kerinci|Mount Kerinci", "Apo|Mount Apo", "Kljutschewskaja Sopka|Klyuchevskaya Sopka", "Machapuchare|Machhapuchchhre", "Nanda Devi", "Tirich Mir", "Rakaposhi",
      "Masherbrum", "Muztagh Ata|Mustagh Ata", "Kongur Tagh|Kongur", "Minya Konka|Gongga Shan", "Namcha Barwa|Namjagbarwa", "Hallasan|Halla", "Paektusan|Changbai Shan|Baekdu|Baekdusan",
      "Yushan|Jade Mountain|Jadeberg", "Belucha|Belukha", "Kamet", "Trisul", "Changabang", "Shivling", "Jabal Shams|Dschabal Schams", "Sinai|Mosesberg|Mount Sinai|Dschabal Musa",
      "Aragaz|Aragats", "Erciyes|Erciyes Dağı|Erciyes Dagi", "Süphan|Süphan Dağı|Suphan", "Tambora|Mount Tambora", "Agung|Gunung Agung|Mount Agung", "Sakurajima",
      "Ontake|Ontake-san", "Fansipan|Phan Xi Păng|Phan Xi Pang", "Doi Inthanon", "Ulugh Muztagh",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-fluss-russland",
    text: "Nenne einen Fluss in Russland.",
    hint: "Flüsse, die ganz oder teilweise durch Russland fließen.",
    en: ["Name a river in Russia.", "Rivers that flow through Russia, entirely or in part."],
    answers: [
      "Wolga|Volga", "Don", "Ob", "Jenissei|Jenisej|Yenisei", "Lena", "Amur", "Ural", "Moskwa|Moskva", "Newa|Neva", "Irtysch|Irtysh", "Dnepr|Dnipro|Dnjepr|Dnieper",
      "Kama", "Oka", "Angara", "Kolyma", "Petschora|Pechora", "Nördliche Dwina|Northern Dvina|Sewernaja Dwina", "Kuban", "Terek", "Tobol", "Ischim|Ishim", "Selenga",
      "Aldan", "Wiljui|Vilyuy|Viljuj", "Indigirka", "Jana|Yana", "Olenjok|Olenyok", "Chatanga|Khatanga", "Untere Tunguska|Lower Tunguska", "Steinige Tunguska|Podkamennaya Tunguska",
      "Witim|Vitim", "Tom", "Katun", "Bija|Biya", "Wjatka|Vyatka", "Belaja|Belaya", "Sura", "Kljasma|Klyazma", "Wetluga|Vetluga", "Mologa", "Scheksna|Sheksna",
      "Wolchow|Volkhov", "Swir|Svir", "Onega", "Mesen|Mezen", "Wytschegda|Vychegda", "Suchona|Sukhona", "Seja|Zeya", "Bureja|Bureya", "Schilka|Shilka", "Argun",
      "Ussuri", "Anadyr", "Manytsch|Manych", "Choper|Khopyor", "Medwediza|Medveditsa", "Sewerski Donez|Donez|Seversky Donets", "Desna", "Westliche Dwina|Daugava|Düna",
      "Tschussowaja|Chusovaya", "Ufa", "Pur", "Nadym", "Tas|Taz", "Omolon", "Kotuj|Kotuy",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-insel-pazifik",
    text: "Nenne eine Insel im Pazifik.",
    hint: "Einzelne Inseln, keine ganzen Inselgruppen – von Hawaii bis Neuseeland.",
    en: ["Name an island in the Pacific.", "Single islands, not whole archipelagos – from Hawaii to New Zealand."],
    answers: [
      "Hawaii|Big Island|Hawaiʻi", "Tahiti", "Bora Bora", "Osterinsel|Rapa Nui|Easter Island", "Neuguinea|New Guinea", "Honshū|Honshu", "Taiwan", "Hokkaidō|Hokkaido",
      "Nordinsel|North Island", "Südinsel|South Island", "Maui", "Oʻahu|Oahu", "Kauaʻi|Kauai", "Guam", "Kyūshū|Kyushu", "Okinawa", "Shikoku", "Luzon", "Mindanao", "Samar", "Leyte",
      "Sachalin|Sakhalin", "Viti Levu", "Vanua Levu", "Upolu", "Savaiʻi|Savaii", "Tongatapu", "Moorea|Moʻorea", "Nuku Hiva", "Rarotonga", "Aitutaki", "Pitcairn|Pitcairninsel|Pitcairn Island",
      "Robinson-Crusoe-Insel|Robinson Crusoe Island|Más a Tierra", "Isabela", "Santa Cruz", "Vancouver Island|Vancouver-Insel", "Kodiak", "Neubritannien|New Britain",
      "Neuirland|New Ireland", "Bougainville", "Guadalcanal", "Espiritu Santo", "Efate", "Grande Terre", "Lord-Howe-Insel|Lord Howe Island", "Norfolkinsel|Norfolk Island",
      "Stewart Island|Rakiura", "Saipan", "Tinian", "Babeldaob|Babelthuap", "Yap", "Pohnpei", "Kosrae", "Nauru", "Tarawa", "Kiritimati", "Funafuti", "Midway|Midwayinseln|Midway Atoll",
      "Wake|Wake Island", "Jeju|Jejudo", "Hainan", "Molokaʻi|Molokai", "Lānaʻi|Lanai", "Niue", "Wallis|Uvea", "Futuna", "Huahine", "Raiatea",
      "Rangiroa", "Fakarava", "Mangareva", "Bikini|Bikini-Atoll", "Kwajalein|Kwajalein-Atoll", "Majuro", "Iwojima|Iwo Jima|Iōtō", "Sado", "Yakushima", "Clipperton|Clipperton-Insel",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-departement",
    text: "Nenne ein französisches Département.",
    hint: "Die 101 Départements, auch die in Übersee.",
    en: ["Name a French département.", "All 101 départements, including the overseas ones."],
    answers: [
      "Paris", "Bouches-du-Rhône", "Alpes-Maritimes", "Gironde", "Rhône", "Nord", "Haute-Savoie", "Savoie", "Bas-Rhin", "Haut-Rhin", "Corse-du-Sud|Südkorsika",
      "Haute-Corse|Oberkorsika", "Guadeloupe", "Martinique", "Guyane|Französisch-Guayana|French Guiana", "La Réunion|Réunion|Reunion", "Var", "Hérault", "Finistère", "Vendée", "Loire-Atlantique", "Calvados", "Manche", "Moselle", "Gard", "Vaucluse", "Isère", "Haute-Garonne",
      "Dordogne", "Pyrénées-Orientales", "Landes", "Pyrénées-Atlantiques", "Hautes-Pyrénées", "Ardèche", "Marne", "Aube", "Somme", "Pas-de-Calais", "Seine-Maritime", "Eure",
      "Loiret", "Indre-et-Loire", "Loir-et-Cher", "Cher", "Indre", "Vienne", "Haute-Vienne", "Charente", "Charente-Maritime", "Deux-Sèvres", "Maine-et-Loire", "Sarthe",
      "Mayenne", "Ille-et-Vilaine", "Côtes-d'Armor", "Morbihan", "Orne", "Eure-et-Loir", "Yvelines", "Essonne", "Hauts-de-Seine", "Seine-Saint-Denis", "Val-de-Marne",
      "Val-d'Oise", "Seine-et-Marne", "Oise", "Aisne", "Ardennes", "Meuse", "Meurthe-et-Moselle", "Vosges", "Haute-Marne", "Haute-Saône", "Doubs", "Jura",
      "Territoire de Belfort|Belfort", "Côte-d'Or", "Saône-et-Loire", "Yonne", "Nièvre", "Allier", "Puy-de-Dôme", "Cantal", "Haute-Loire", "Loire", "Ain", "Drôme",
      "Hautes-Alpes", "Alpes-de-Haute-Provence", "Lozère", "Aveyron", "Tarn", "Tarn-et-Garonne", "Lot", "Lot-et-Garonne", "Gers", "Ariège", "Aude", "Mayotte", "Corrèze", "Creuse",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-landkreis-bayern",
    text: "Nenne einen Landkreis in Bayern.",
    hint: "Die 71 bayerischen Landkreise – kreisfreie Städte zählen nicht.",
    en: ["Name a district (Landkreis) in Bavaria.", "The 71 Bavarian districts – independent cities don’t count."],
    answers: [
      "Berchtesgadener Land", "Garmisch-Partenkirchen", "Miesbach", "Rosenheim|Landkreis Rosenheim", "Starnberg", "München|Landkreis München", "Traunstein",
      "Bad Tölz-Wolfratshausen", "Oberallgäu", "Ostallgäu", "Lindau|Lindau (Bodensee)", "Unterallgäu", "Weilheim-Schongau", "Fürstenfeldbruck", "Dachau", "Freising",
      "Erding", "Ebersberg", "Augsburg|Landkreis Augsburg", "Passau|Landkreis Passau", "Regensburg|Landkreis Regensburg", "Nürnberger Land", "Fürth|Landkreis Fürth",
      "Erlangen-Höchstadt", "Bamberg|Landkreis Bamberg", "Forchheim", "Bayreuth|Landkreis Bayreuth", "Würzburg|Landkreis Würzburg", "Aschaffenburg|Landkreis Aschaffenburg",
      "Landshut|Landkreis Landshut", "Altötting", "Mühldorf am Inn|Mühldorf", "Rottal-Inn", "Dingolfing-Landau", "Straubing-Bogen", "Deggendorf", "Freyung-Grafenau", "Regen",
      "Cham", "Schwandorf", "Amberg-Sulzbach", "Neumarkt in der Oberpfalz|Neumarkt", "Neustadt an der Waldnaab", "Tirschenreuth", "Kelheim", "Pfaffenhofen an der Ilm|Pfaffenhofen",
      "Eichstätt", "Neuburg-Schrobenhausen", "Aichach-Friedberg", "Dillingen an der Donau|Dillingen", "Donau-Ries", "Günzburg", "Neu-Ulm", "Landsberg am Lech|Landsberg",
      "Weißenburg-Gunzenhausen", "Roth", "Ansbach|Landkreis Ansbach", "Neustadt an der Aisch-Bad Windsheim", "Kitzingen", "Schweinfurt|Landkreis Schweinfurt", "Haßberge",
      "Rhön-Grabfeld", "Bad Kissingen", "Main-Spessart", "Miltenberg", "Coburg|Landkreis Coburg", "Lichtenfels", "Kronach", "Kulmbach", "Hof|Landkreis Hof",
      "Wunsiedel im Fichtelgebirge|Wunsiedel",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-london",
    text: "Nenne einen Stadtteil von London.",
    hint: "Boroughs und bekannte Viertel.",
    en: ["Name a district of London.", "Boroughs and well-known neighbourhoods."],
    answers: [
      "Westminster", "Camden", "Soho", "Notting Hill", "Greenwich", "Chelsea", "Kensington", "Shoreditch", "Hackney", "Brixton", "Islington", "Wimbledon", "Covent Garden",
      "Mayfair", "City of London|City", "Southwark", "Hampstead", "Canary Wharf", "Whitechapel", "Paddington", "Richmond", "Croydon", "Tower Hamlets", "Lambeth", "Wembley",
      "Hammersmith", "Fulham", "Stratford", "Battersea", "Clapham", "Marylebone", "Bloomsbury", "King's Cross|Kings Cross", "Belgravia", "Knightsbridge", "Holborn",
      "Bermondsey", "Peckham", "Lewisham", "Barking", "Ealing", "Hounslow", "Harrow", "Brent", "Barnet", "Enfield", "Haringey", "Waltham Forest", "Redbridge", "Havering",
      "Bexley", "Bromley", "Sutton", "Merton", "Kingston upon Thames|Kingston", "Hillingdon", "Newham", "Dalston", "Walthamstow", "Deptford", "Woolwich", "Highgate",
      "Tottenham", "Putney", "Chiswick", "Bethnal Green", "Mile End", "Poplar", "Limehouse", "Wapping", "Pimlico", "Vauxhall", "Elephant and Castle", "Stoke Newington",
      "Muswell Hill", "Crystal Palace", "Dulwich", "Kilburn", "Maida Vale", "St John's Wood|St. John's Wood", "Primrose Hill", "Fitzrovia", "Clerkenwell",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-gebirge-asien",
    text: "Nenne ein Gebirge in Asien.",
    hint: "Gebirge und Bergketten auf dem asiatischen Kontinent, auch Ural und Kaukasus.",
    en: ["Name a mountain range in Asia.", "Ranges on the Asian continent, including the Urals and the Caucasus."],
    answers: [
      "Himalaya|Himalaja|Himalayas", "Ural|Uralgebirge|Ural Mountains|Urals", "Kaukasus|Caucasus", "Karakorum|Karakoram", "Hindukusch|Hindu Kush", "Pamir", "Tian Shan|Tienschan",
      "Altai", "Kunlun|Kunlun Shan", "Zagros|Zagrosgebirge|Zagros Mountains", "Elburs|Alborz", "Taurus|Taurusgebirge|Taurus Mountains", "Westghats|Western Ghats",
      "Ostghats|Eastern Ghats", "Japanische Alpen|Japanese Alps", "Sajan|Sajangebirge|Sayan Mountains", "Pontisches Gebirge|Pontic Mountains", "Transhimalaya", "Hengduan|Hengduan Shan",
      "Qinling|Qinling Shan", "Großer Hinggan|Großes Chingan-Gebirge|Daxing'anling|Greater Khingan", "Kleiner Hinggan|Kleines Chingan-Gebirge|Lesser Khingan", "Changbai|Changbai-Gebirge",
      "Werchojansker Gebirge|Verkhoyansk Range", "Tscherski-Gebirge|Chersky Range", "Stanowoigebirge|Stanovoy Range", "Jablonowygebirge|Yablonovy Range", "Sichote-Alin|Sikhote-Alin",
      "Kopet-Dag|Kopet Dag", "Sulaimangebirge|Sulaiman Mountains", "Hadschar-Gebirge|Hajar Mountains|Hadschar", "Asir|Asir-Gebirge", "Hedschas|Hejaz|Hedschas-Gebirge",
      "Libanon-Gebirge|Libanongebirge|Mount Lebanon range", "Vindhya|Vindhyagebirge|Vindhya Range", "Satpura|Satpura Range", "Aravalli|Aravalli Range", "Arakan Yoma|Arakan-Gebirge",
      "Annamitisches Gebirge|Annamite Range|Truong Son", "Qilian Shan|Nan Shan", "Altun Shan|Altyn-Tagh", "Alai|Alaigebirge|Alay", "Dsungarischer Alatau|Dzungarian Alatau",
      "Changai|Changai-Gebirge|Khangai", "Gobi-Altai", "Kolyma-Gebirge|Kolymagebirge|Kolyma Mountains", "Korjakengebirge|Koryak Mountains", "Barisan|Barisan-Gebirge|Barisan Mountains",
      "Crocker Range|Crocker-Gebirge", "Taebaek|Taebaek-Gebirge|Taebaek Mountains", "Hida-Gebirge|Hida", "Akaishi-Gebirge|Akaishi", "Kiso-Gebirge|Kiso", "Kirthar|Kirthar-Gebirge",
      "Cordillera Central", "Siwalik|Siwaliks|Shivalik", "Mahabharat|Mahabharat-Gebirge", "Kirgisischer Alatau|Kyrgyz Ala-Too", "Sredinny-Gebirge|Sredinny Range",
      "Byrranga|Byrranga-Gebirge", "Dabie Shan|Dabie-Gebirge", "Wuyi Shan|Wuyi", "Taihang Shan|Taihang",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-romanische-amtssprache",
    text: "Nenne ein Land mit Französisch, Spanisch oder Portugiesisch als Amtssprache.",
    hint: "Auch Länder, in denen die Sprache eine von mehreren Amtssprachen ist.",
    en: ["Name a country with French, Spanish or Portuguese as an official language.", "Countries where it is one of several official languages count too."],
    countries: [
      "FRA", "BEL", "CHE", "LUX", "MCO", "CAN", "HTI", "SEN", "MLI", "BFA", "NER", "TCD", "GIN", "CIV", "TGO", "BEN", "CMR", "GAB", "COG", "COD", "CAF", "BDI", "RWA",
      "DJI", "COM", "MDG", "SYC", "VUT", "GNQ", "ESP", "MEX", "GTM", "HND", "SLV", "NIC", "CRI", "PAN", "CUB", "DOM", "COL", "VEN", "ECU", "PER", "BOL", "CHL", "ARG",
      "URY", "PRY", "PRT", "BRA", "AGO", "MOZ", "CPV", "GNB", "STP", "TLS",
    ],
  },
  {
    d: "2026-11-16",
    key: "t-paris",
    text: "Nenne einen Stadtteil oder ein Viertel von Paris.",
    hint: "Bekannte Viertel und die 20 Arrondissements (z. B. „11. Arrondissement“).",
    en: ["Name a district or neighbourhood of Paris.", "Well-known quarters and the 20 arrondissements (e.g. “11th arrondissement”)."],
    answers: [
      "Montmartre", "Marais|Le Marais", "Quartier Latin|Latin Quarter|Lateinisches Viertel", "Saint-Germain-des-Prés|Saint-Germain", "Bastille", "Montparnasse", "Belleville",
      "Pigalle", "Île de la Cité|Ile de la Cite", "Île Saint-Louis|Ile Saint-Louis", "Bercy", "Batignolles", "Ménilmontant|Menilmontant", "Les Halles|Halles", "Opéra|Opera",
      "Trocadéro|Trocadero", "Passy", "Auteuil", "Oberkampf", "Canal Saint-Martin", "La Goutte-d'Or|Goutte d'Or", "Butte-aux-Cailles", "Faubourg Saint-Antoine",
      "Faubourg Saint-Honoré", 
      "1. Arrondissement|1er|1er arrondissement|1st arrondissement|Erstes Arrondissement", "2. Arrondissement|2e|2e arrondissement|2nd arrondissement",
      "3. Arrondissement|3e|3e arrondissement|3rd arrondissement", "4. Arrondissement|4e|4e arrondissement|4th arrondissement", "5. Arrondissement|5e|5e arrondissement|5th arrondissement",
      "6. Arrondissement|6e|6e arrondissement|6th arrondissement", "7. Arrondissement|7e|7e arrondissement|7th arrondissement", "8. Arrondissement|8e|8e arrondissement|8th arrondissement",
      "9. Arrondissement|9e|9e arrondissement|9th arrondissement", "10. Arrondissement|10e|10e arrondissement|10th arrondissement", "11. Arrondissement|11e|11e arrondissement|11th arrondissement",
      "12. Arrondissement|12e|12e arrondissement|12th arrondissement", "13. Arrondissement|13e|13e arrondissement|13th arrondissement", "14. Arrondissement|14e|14e arrondissement|14th arrondissement",
      "15. Arrondissement|15e|15e arrondissement|15th arrondissement", "16. Arrondissement|16e|16e arrondissement|16th arrondissement", "17. Arrondissement|17e|17e arrondissement|17th arrondissement",
      "18. Arrondissement|18e|18e arrondissement|18th arrondissement", "19. Arrondissement|19e|19e arrondissement|19th arrondissement", "20. Arrondissement|20e|20e arrondissement|20th arrondissement",
      "Châtelet|Chatelet", "Grenelle", "Vaugirard", "Javel", "Plaisance", "Montsouris", "La Villette|Villette", "Buttes-Chaumont", "Charonne",
      "Picpus", "Invalides", "Gros-Caillou", "École-Militaire|Ecole Militaire", "Chaillot", "Plaine Monceau|Monceau", "Épinettes|Epinettes", "Clignancourt",
      "Grandes-Carrières", "La Chapelle|Chapelle", "Sentier", "Bonne-Nouvelle", "Palais-Royal", "Nouvelle Athènes|Saint-Georges", "Ternes", "La Muette|Muette",
      "Porte Dauphine", "Bel-Air", "Austerlitz", "Salpêtrière|Salpetriere", "Maison-Blanche", "Croulebarbe", "Petit-Montrouge", "Necker", "Saint-Lambert", "Combat",
      "Amérique|Amerique", "Père-Lachaise|Pere Lachaise", "Saint-Fargeau", "La Roquette|Roquette", "Folie-Méricourt", "Saint-Ambroise", "Sainte-Marguerite", "Arts-et-Métiers",
      "Enfants-Rouges", "Archives", "Saint-Merri", "Saint-Gervais", "Arsenal", "Odéon|Odeon", "Monnaie", "Saint-Thomas-d'Aquin", "Val-de-Grâce", "Sorbonne",
      "Jardin des Plantes|Jardin-des-Plantes", "Madeleine", "Chaussée-d'Antin", "Faubourg-Montmartre", "Rochechouart", "Porte-Saint-Denis", "Porte-Saint-Martin",
      "Hôpital-Saint-Louis", "Saint-Vincent-de-Paul",
    ],
  },
];
