import { COUNTRIES, type Continent } from "./countries";

/** One thing that can be asked in an unlimited quiz: a country, state or canton. */
export type Entity = {
  id: string; // matches the feature id in the region's shape file
  name: string;
  alt: string[];
  capital: string | null;
  capitalAlt: string[];
  iso2?: string; // only countries have flags
  area?: number;
};

export type RegionKey =
  | "welt"
  | "europa"
  | "asien"
  | "afrika"
  | "nordamerika"
  | "suedamerika"
  | "ozeanien"
  | "nahost"
  | "usa"
  | "deutschland"
  | "schweiz"
  | "oesterreich"
  | "syrien";

export type Region = {
  key: RegionKey;
  label: string;
  shapes: "world" | "us" | "de" | "ch" | "at" | "sy";
  kind: "countries" | "states";
  /** Minutes for "Alle nennen" */
  minutes: number;
  /** Capitals mostly share the region's name, so a capitals quiz would be trivial */
  noCapitals?: boolean;
};

export const REGIONS: Region[] = [
  { key: "welt", label: "Welt", shapes: "world", kind: "countries", minutes: 15 },
  { key: "europa", label: "Europa", shapes: "world", kind: "countries", minutes: 6 },
  { key: "asien", label: "Asien", shapes: "world", kind: "countries", minutes: 6 },
  { key: "afrika", label: "Afrika", shapes: "world", kind: "countries", minutes: 7 },
  { key: "nordamerika", label: "Nord- & Mittelamerika", shapes: "world", kind: "countries", minutes: 4 },
  { key: "suedamerika", label: "Südamerika", shapes: "world", kind: "countries", minutes: 2 },
  { key: "ozeanien", label: "Ozeanien", shapes: "world", kind: "countries", minutes: 2 },
  { key: "nahost", label: "Naher Osten", shapes: "world", kind: "countries", minutes: 3 },
  { key: "usa", label: "US-Bundesstaaten", shapes: "us", kind: "states", minutes: 6 },
  { key: "deutschland", label: "Deutsche Bundesländer", shapes: "de", kind: "states", minutes: 2 },
  { key: "schweiz", label: "Schweizer Kantone", shapes: "ch", kind: "states", minutes: 3 },
  { key: "oesterreich", label: "Österreichische Bundesländer", shapes: "at", kind: "states", minutes: 2 },
  { key: "syrien", label: "Syrische Gouvernements", shapes: "sy", kind: "states", minutes: 3, noCapitals: true },
];

export const REGION_BY_KEY = Object.fromEntries(REGIONS.map((r) => [r.key, r])) as Record<RegionKey, Region>;

const CONT_OF: Partial<Record<RegionKey, Continent>> = {
  europa: "Europa",
  asien: "Asien",
  afrika: "Afrika",
  nordamerika: "Nordamerika",
  suedamerika: "Südamerika",
  ozeanien: "Ozeanien",
};

// [id, name, capital, alt names, alt capitals]
type Row = [string, string, string, string[]?, string[]?];

const DE: Row[] = [
  ["DE-BW", "Baden-Württemberg", "Stuttgart"],
  ["DE-BY", "Bayern", "München"],
  ["DE-BE", "Berlin", "Berlin"],
  ["DE-BB", "Brandenburg", "Potsdam"],
  ["DE-HB", "Bremen", "Bremen"],
  ["DE-HH", "Hamburg", "Hamburg"],
  ["DE-HE", "Hessen", "Wiesbaden"],
  ["DE-MV", "Mecklenburg-Vorpommern", "Schwerin"],
  ["DE-NI", "Niedersachsen", "Hannover"],
  ["DE-NW", "Nordrhein-Westfalen", "Düsseldorf", ["NRW"]],
  ["DE-RP", "Rheinland-Pfalz", "Mainz"],
  ["DE-SL", "Saarland", "Saarbrücken"],
  ["DE-ST", "Sachsen-Anhalt", "Magdeburg"],
  ["DE-SN", "Sachsen", "Dresden"],
  ["DE-SH", "Schleswig-Holstein", "Kiel"],
  ["DE-TH", "Thüringen", "Erfurt"],
];

const AT: Row[] = [
  ["AT-1", "Burgenland", "Eisenstadt"],
  ["AT-2", "Kärnten", "Klagenfurt", [], ["Klagenfurt am Wörthersee"]],
  ["AT-3", "Niederösterreich", "St. Pölten", [], ["Sankt Pölten"]],
  ["AT-4", "Oberösterreich", "Linz"],
  ["AT-5", "Salzburg", "Salzburg"],
  ["AT-6", "Steiermark", "Graz"],
  ["AT-7", "Tirol", "Innsbruck"],
  ["AT-8", "Vorarlberg", "Bregenz"],
  ["AT-9", "Wien", "Wien"],
];

const CH: Row[] = [
  ["CH-1", "Zürich", "Zürich"],
  ["CH-2", "Bern", "Bern"],
  ["CH-3", "Luzern", "Luzern"],
  ["CH-4", "Uri", "Altdorf"],
  ["CH-5", "Schwyz", "Schwyz"],
  ["CH-6", "Obwalden", "Sarnen"],
  ["CH-7", "Nidwalden", "Stans"],
  ["CH-8", "Glarus", "Glarus"],
  ["CH-9", "Zug", "Zug"],
  ["CH-10", "Freiburg", "Freiburg", ["Fribourg"], ["Fribourg"]],
  ["CH-11", "Solothurn", "Solothurn"],
  ["CH-12", "Basel-Stadt", "Basel"],
  ["CH-13", "Basel-Landschaft", "Liestal", ["Baselland"]],
  ["CH-14", "Schaffhausen", "Schaffhausen"],
  ["CH-15", "Appenzell Ausserrhoden", "Herisau", [], ["Trogen"]],
  ["CH-16", "Appenzell Innerrhoden", "Appenzell"],
  ["CH-17", "St. Gallen", "St. Gallen", ["Sankt Gallen"], ["Sankt Gallen"]],
  ["CH-18", "Graubünden", "Chur"],
  ["CH-19", "Aargau", "Aarau"],
  ["CH-20", "Thurgau", "Frauenfeld"],
  ["CH-21", "Tessin", "Bellinzona", ["Ticino"]],
  ["CH-22", "Waadt", "Lausanne", ["Vaud"]],
  ["CH-23", "Wallis", "Sitten", ["Valais"], ["Sion"]],
  ["CH-24", "Neuenburg", "Neuenburg", ["Neuchâtel"], ["Neuchâtel"]],
  ["CH-25", "Genf", "Genf", ["Genève", "Geneva"], ["Genève"]],
  ["CH-26", "Jura", "Delsberg", [], ["Delémont"]],
];

/** Middle East as commonly used in German: Levant, Mesopotamia, Arabian Peninsula, Iran, Turkey and Egypt. */
export const NAHOST = ["EGY", "BHR", "IRQ", "IRN", "JOR", "KWT", "LBN", "OMN", "PSE", "QAT", "SAU", "SYR", "TUR", "ARE", "YEM"];

// geoBoundaries ISO 3166-2 codes
const SY: Row[] = [
  ["SY-DI", "Damaskus", "Damaskus", ["Dimaschq", "Damascus"], ["Dimaschq", "Damascus"]],
  ["SY-RD", "Rif Dimaschq", "Damaskus", ["Rif Dimashq", "Umland von Damaskus", "Damaskus-Land", "Rural Damascus"], ["Dimaschq", "Damascus"]],
  ["SY-HL", "Aleppo", "Aleppo", ["Halab", "Haleb"], ["Halab", "Haleb"]],
  ["SY-HI", "Homs", "Homs", ["Hims"], ["Hims"]],
  ["SY-HM", "Hama", "Hama", ["Hamah"], ["Hamah"]],
  ["SY-LA", "Latakia", "Latakia", ["Lattakia", "al-Ladhiqiyya", "Ladhiqiyya"], ["Lattakia", "al-Ladhiqiyya", "Ladhiqiyya"]],
  ["SY-TA", "Tartus", "Tartus", ["Tartous"], ["Tartous"]],
  ["SY-ID", "Idlib", "Idlib", ["Idleb"], ["Idleb"]],
  ["SY-RA", "ar-Raqqa", "ar-Raqqa", ["Raqqa", "Rakka", "Ar-Raqqa"], ["Raqqa", "Rakka"]],
  ["SY-DY", "Deir ez-Zor", "Deir ez-Zor", ["Dair az-Zaur", "Deir ez Zor", "Deir-ez-Zor", "Deir Ezzor"], ["Dair az-Zaur", "Deir ez Zor", "Deir-ez-Zor", "Deir Ezzor"]],
  ["SY-HA", "al-Hasaka", "al-Hasaka", ["Hasaka", "Al-Hasakeh", "Hasakeh"], ["Hasaka", "Hasakeh"]],
  ["SY-DR", "Daraa", "Daraa", ["Dar'a", "Deraa"], ["Dar'a", "Deraa"]],
  ["SY-SU", "as-Suwaida", "as-Suwaida", ["Suwaida", "Sweida", "As-Sweida"], ["Suwaida", "Sweida"]],
  ["SY-QU", "Quneitra", "Quneitra", ["al-Qunaitira", "Kuneitra"], ["al-Qunaitira", "Madinat al-Baath", "Khan Arnabah"]],
];

// us-atlas FIPS codes
const US: Row[] = [
  ["US-01", "Alabama", "Montgomery"],
  ["US-02", "Alaska", "Juneau"],
  ["US-04", "Arizona", "Phoenix"],
  ["US-05", "Arkansas", "Little Rock"],
  ["US-06", "Kalifornien", "Sacramento", ["California"]],
  ["US-08", "Colorado", "Denver"],
  ["US-09", "Connecticut", "Hartford"],
  ["US-10", "Delaware", "Dover"],
  ["US-12", "Florida", "Tallahassee"],
  ["US-13", "Georgia", "Atlanta"],
  ["US-15", "Hawaii", "Honolulu"],
  ["US-16", "Idaho", "Boise"],
  ["US-17", "Illinois", "Springfield"],
  ["US-18", "Indiana", "Indianapolis"],
  ["US-19", "Iowa", "Des Moines"],
  ["US-20", "Kansas", "Topeka"],
  ["US-21", "Kentucky", "Frankfort"],
  ["US-22", "Louisiana", "Baton Rouge"],
  ["US-23", "Maine", "Augusta"],
  ["US-24", "Maryland", "Annapolis"],
  ["US-25", "Massachusetts", "Boston"],
  ["US-26", "Michigan", "Lansing"],
  ["US-27", "Minnesota", "Saint Paul", [], ["St. Paul"]],
  ["US-28", "Mississippi", "Jackson"],
  ["US-29", "Missouri", "Jefferson City"],
  ["US-30", "Montana", "Helena"],
  ["US-31", "Nebraska", "Lincoln"],
  ["US-32", "Nevada", "Carson City"],
  ["US-33", "New Hampshire", "Concord"],
  ["US-34", "New Jersey", "Trenton"],
  ["US-35", "New Mexico", "Santa Fe", ["Neumexiko"]],
  ["US-36", "New York", "Albany"],
  ["US-37", "North Carolina", "Raleigh", ["Nord-Carolina", "Nordkarolina"]],
  ["US-38", "North Dakota", "Bismarck", ["Nord-Dakota", "Norddakota"]],
  ["US-39", "Ohio", "Columbus"],
  ["US-40", "Oklahoma", "Oklahoma City"],
  ["US-41", "Oregon", "Salem"],
  ["US-42", "Pennsylvania", "Harrisburg", ["Pennsylvanien"]],
  ["US-44", "Rhode Island", "Providence"],
  ["US-45", "South Carolina", "Columbia", ["Süd-Carolina", "Südkarolina"]],
  ["US-46", "South Dakota", "Pierre", ["Süd-Dakota", "Süddakota"]],
  ["US-47", "Tennessee", "Nashville"],
  ["US-48", "Texas", "Austin"],
  ["US-49", "Utah", "Salt Lake City"],
  ["US-50", "Vermont", "Montpelier"],
  ["US-51", "Virginia", "Richmond", ["Virginien"]],
  ["US-53", "Washington", "Olympia"],
  ["US-54", "West Virginia", "Charleston", ["West-Virginia", "Westvirginia"]],
  ["US-55", "Wisconsin", "Madison"],
  ["US-56", "Wyoming", "Cheyenne"],
];

const fromRows = (rows: Row[]): Entity[] =>
  rows.map(([id, name, capital, alt = [], capitalAlt = []]) => ({ id, name, capital, alt, capitalAlt }));

export function entitiesFor(key: RegionKey): Entity[] {
  if (key === "usa") return fromRows(US);
  if (key === "deutschland") return fromRows(DE);
  if (key === "schweiz") return fromRows(CH);
  if (key === "oesterreich") return fromRows(AT);
  if (key === "syrien") return fromRows(SY);
  const cont = CONT_OF[key];
  return COUNTRIES.filter((c) => (key === "nahost" ? NAHOST.includes(c.id) : !cont || c.cont === cont)).map((c) => ({
    id: c.id,
    name: c.n,
    alt: c.alt,
    capital: c.cap,
    capitalAlt: c.capAlt,
    iso2: c.iso2,
    area: c.area,
  }));
}
