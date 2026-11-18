/**
 * Gipfelsturm: football. The answer lists are the Tiefgang football lists (lib/data/tiefgang-themen):
 * club players since 1970 (Wikipedia / Wikidata), World Cup and Euro squads, award winners, coaches.
 * The same person in several lists becomes one entity (same main name, or the same full-name spelling).
 */
import { norm } from "@/lib/data/countries";
import { FUSSBALL } from "@/lib/data/tiefgang-themen/fussball";
import { FUSSBALL_SPIELER } from "@/lib/data/tiefgang-themen/fussball-spieler";
import type { Entity, Pred, Theme } from "./core";

type Clause = { key: string; de: string; en: string; coach?: boolean; club?: [string, string] };

const CLUBS: Record<string, [string, string]> = {
  bayern: ["für den FC Bayern München", "for FC Bayern Munich"],
  dortmund: ["für Borussia Dortmund", "for Borussia Dortmund"],
  real: ["für Real Madrid", "for Real Madrid"],
  barcelona: ["für den FC Barcelona", "for FC Barcelona"],
  manutd: ["für Manchester United", "for Manchester United"],
  liverpool: ["für den FC Liverpool", "for Liverpool"],
  juventus: ["für Juventus Turin", "for Juventus"],
  milan: ["für die AC Mailand", "for AC Milan"],
  psg: ["für Paris Saint-Germain", "for Paris Saint-Germain"],
  arsenal: ["für den FC Arsenal", "for Arsenal"],
  chelsea: ["für den FC Chelsea", "for Chelsea"],
  mancity: ["für Manchester City", "for Manchester City"],
  inter: ["für Inter Mailand", "for Inter Milan"],
  atletico: ["für Atlético Madrid", "for Atlético Madrid"],
};
const COACHED: Record<string, [string, string]> = {
  bayern: ["den FC Bayern München", "FC Bayern Munich"],
  real: ["Real Madrid", "Real Madrid"],
  dortmund: ["Borussia Dortmund", "Borussia Dortmund"],
  manutd: ["Manchester United", "Manchester United"],
  barcelona: ["den FC Barcelona", "FC Barcelona"],
  milan: ["die AC Mailand", "AC Milan"],
  liverpool: ["den FC Liverpool", "Liverpool"],
  chelsea: ["den FC Chelsea", "Chelsea"],
  juventus: ["Juventus Turin", "Juventus"],
  inter: ["Inter Mailand", "Inter Milan"],
  psg: ["Paris Saint-Germain", "Paris Saint-Germain"],
  atletico: ["Atlético Madrid", "Atlético Madrid"],
  arsenal: ["den FC Arsenal", "Arsenal"],
  schalke: ["den FC Schalke 04", "Schalke 04"],
  gladbach: ["Borussia Mönchengladbach", "Borussia Mönchengladbach"],
  hsv: ["den Hamburger SV", "Hamburger SV"],
  napoli: ["die SSC Neapel", "Napoli"],
  roma: ["die AS Rom", "AS Roma"],
  tottenham: ["Tottenham Hotspur", "Tottenham Hotspur"],
  marseille: ["Olympique Marseille", "Olympique de Marseille"],
  valencia: ["den FC Valencia", "Valencia"],
};
// [key, year, genitive (de), country (en)]
const WORLD_CUPS: [string, number, string, string][] = [
  ["f-dfb-weltmeister-2014", 2014, "Deutschlands", "Germany’s"],
  ["f-dfb-weltmeister-1990", 1990, "der Bundesrepublik", "West Germany’s"],
  ["f-dfb-weltmeister-1974", 1974, "der Bundesrepublik", "West Germany’s"],
  ["f-wm-deutschland-1954", 1954, "der Bundesrepublik", "West Germany’s"],
  ["f-wm-frankreich-1998", 1998, "Frankreichs", "France’s"],
  ["f-wm-frankreich-2018", 2018, "Frankreichs", "France’s"],
  ["f-wm-spanien-2010", 2010, "Spaniens", "Spain’s"],
  ["f-wm-argentinien-2022", 2022, "Argentiniens", "Argentina’s"],
  ["f-wm-argentinien-1986", 1986, "Argentiniens", "Argentina’s"],
  ["f-wm-argentinien-1978", 1978, "Argentiniens", "Argentina’s"],
  ["f-wm-italien-2006", 2006, "Italiens", "Italy’s"],
  ["f-wm-italien-1982", 1982, "Italiens", "Italy’s"],
  ["f-wm-brasilien-2002", 2002, "Brasiliens", "Brazil’s"],
  ["f-wm-brasilien-1994", 1994, "Brasiliens", "Brazil’s"],
  ["f-wm-brasilien-1970", 1970, "Brasiliens", "Brazil’s"],
  ["f-wm-england-1966", 1966, "Englands", "England’s"],
];
const EUROS: [string, number, string, string][] = [
  ["f-dfb-europameister-1996", 1996, "Deutschlands", "Germany’s"],
  ["f-dfb-europameister-1980", 1980, "der Bundesrepublik", "West Germany’s"],
  ["f-wm-em-frankreich-1984", 1984, "Frankreichs", "France’s"],
  ["f-wm-em-frankreich-2000", 2000, "Frankreichs", "France’s"],
  ["f-wm-em-spanien-2008", 2008, "Spaniens", "Spain’s"],
  ["f-wm-em-spanien-2012", 2012, "Spaniens", "Spain’s"],
  ["f-wm-em-spanien-2024", 2024, "Spaniens", "Spain’s"],
  ["f-wm-em-portugal-2016", 2016, "Portugals", "Portugal’s"],
  ["f-wm-em-italien-2020", 2020, "Italiens", "Italy’s"],
  ["f-wm-em-niederlande-1988", 1988, "der Niederlande", "the Netherlands’"],
  ["f-wm-em-griechenland-2004", 2004, "Griechenlands", "Greece’s"],
];
const SQUADS: Record<string, [string, string]> = {
  "f-dfb-wm-spieler": ["Deutschlands", "Germany’s"],
  frankreich: ["Frankreichs", "France’s"],
  brasilien: ["Brasiliens", "Brazil’s"],
  england: ["Englands", "England’s"],
  italien: ["Italiens", "Italy’s"],
  spanien: ["Spaniens", "Spain’s"],
  argentinien: ["Argentiniens", "Argentina’s"],
  niederlande: ["der Niederlande", "the Netherlands’"],
  portugal: ["Portugals", "Portugal’s"],
  belgien: ["Belgiens", "Belgium’s"],
  kroatien: ["Kroatiens", "Croatia’s"],
  uruguay: ["Uruguays", "Uruguay’s"],
  kolumbien: ["Kolumbiens", "Colombia’s"],
  mexiko: ["Mexikos", "Mexico’s"],
  schweden: ["Schwedens", "Sweden’s"],
  polen: ["Polens", "Poland’s"],
  usa: ["der USA", "the USA’s"],
  japan: ["Japans", "Japan’s"],
  daenemark: ["Dänemarks", "Denmark’s"],
  schweiz: ["der Schweiz", "Switzerland’s"],
  kamerun: ["Kameruns", "Cameroon’s"],
  nigeria: ["Nigerias", "Nigeria’s"],
  suedkorea: ["Südkoreas", "South Korea’s"],
  chile: ["Chiles", "Chile’s"],
  senegal: ["Senegals", "Senegal’s"],
  ghana: ["Ghanas", "Ghana’s"],
  schottland: ["Schottlands", "Scotland’s"],
  australien: ["Australiens", "Australia’s"],
  marokko: ["Marokkos", "Morocco’s"],
  ecuador: ["Ecuadors", "Ecuador’s"],
};
const OTHER: Record<string, [string, string, boolean?]> = {
  "f-ballon-dor": ["den Ballon d’Or gewonnen hat", "has won the Ballon d’Or"],
  "f-wm-finaltorschuetze": ["in einem WM-Finale ein Tor erzielt hat", "has scored in a World Cup final"],
  "f-cl-finaltorschuetze": ["in einem Finale der Champions League oder des Landesmeisterpokals getroffen hat", "has scored in a European Cup or Champions League final"],
  "f-bl-torschuetzenkoenig": ["Torschützenkönig der Bundesliga war", "has been the Bundesliga’s top scorer"],
  "f-pl-torschuetzenkoenig": ["den Goldenen Schuh der Premier League gewonnen hat", "has won the Premier League Golden Boot"],
  "f-serie-a-torschuetzenkoenig": ["Torschützenkönig der Serie A war", "has been Serie A’s top scorer"],
  "f-laliga-torschuetzenkoenig": ["die Pichichi-Trophäe gewonnen hat", "has won the Pichichi Trophy"],
  "f-ligue1-torschuetzenkoenig": ["Torschützenkönig der französischen ersten Liga war", "has been the top scorer of the French top flight"],
  "f-wm-torschuetzenkoenig": ["Torschützenkönig einer WM war", "has been a World Cup’s top scorer"],
  "f-wm-em-torschuetzenkoenig": ["Torschützenkönig einer EM war", "has been a European Championship’s top scorer"],
  "f-cl-torschuetzenkoenig": ["Torschützenkönig der Champions League oder des Landesmeisterpokals war", "has been the top scorer of the European Cup or Champions League"],
  "f-bl-100-tore": ["mindestens 100 Bundesliga-Tore erzielt hat", "has scored at least 100 Bundesliga goals"],
  "f-pl-100-tore": ["mindestens 100 Premier-League-Tore erzielt hat", "has scored at least 100 Premier League goals"],
  "f-wm-torschuetze": ["bei einer WM-Endrunde ein Tor erzielt hat", "has scored at a World Cup finals"],
  "f-em-torschuetze": ["bei einer EM-Endrunde ein Tor erzielt hat", "has scored at a European Championship finals"],
  "f-dfb-em-spieler": ["bei einer EM im Kader Deutschlands stand", "was in Germany’s squad at a European Championship"],
  "f-dfb-50-laenderspiele": ["mindestens 50 Länderspiele für Deutschland bestritten hat", "has won at least 50 caps for Germany"],
  "f-dfb-kapitaen": ["Kapitän der deutschen Nationalmannschaft war", "has captained Germany"],
  "f-wm-nummer-10": ["bei einer WM die Rückennummer 10 trug", "has worn the number 10 at a World Cup"],
  "f-transfer-50mio": ["für mindestens 50 Millionen Euro Ablöse gewechselt ist", "has moved for a fee of at least 50 million euros"],
  "f-torh-bundesliga": ["als Torhüter in der Bundesliga gespielt hat", "has kept goal in the Bundesliga"],
  "f-torh-premier-league": ["als Torhüter in der Premier League gespielt hat", "has kept goal in the Premier League"],
  "f-torh-dfb": ["als Torhüter für Deutschland gespielt hat", "has kept goal for Germany"],
  "f-torh-serie-a-laliga": ["als Torhüter in der Serie A oder in LaLiga gespielt hat", "has kept goal in Serie A or LaLiga"],
  "f-torh-wm": ["als Torhüter bei einer WM gespielt hat", "has kept goal at a World Cup"],
  "f-torh-cl-sieger": ["als Torhüter die Champions League oder den Landesmeisterpokal gewonnen hat", "has won the European Cup or Champions League as a goalkeeper"],
  "f-trainer-cl-sieger": ["als Trainer die Champions League oder den Landesmeisterpokal gewonnen hat", "has won the European Cup or Champions League as a manager", true],
  "f-trainer-bundesliga-meister": ["als Trainer deutscher Meister wurde", "has won the Bundesliga as a manager", true],
  "f-trainer-wm-em-sieger": ["als Trainer eine WM oder EM gewonnen hat", "has won a World Cup or European Championship as a manager", true],
  "f-trainer-premier-league": ["einen Premier-League-Klub trainiert hat", "has managed a Premier League club", true],
  "f-trainer-bundesliga-klub": ["einen Bundesliga-Klub trainiert hat", "has managed a Bundesliga club", true],
  "f-trainer-wm-nationaltrainer": ["eine Nationalmannschaft bei einer WM betreut hat", "has led a national team at a World Cup", true],
};

function clauseFor(key: string): Clause | null {
  let m = key.match(/^f-spieler-(.+)$/);
  if (m && CLUBS[m[1]]) return { key, de: `${CLUBS[m[1]][0]} gespielt hat`, en: `has played ${CLUBS[m[1]][1]}`, club: CLUBS[m[1]] };
  m = key.match(/^f-trainer-(.+)$/);
  if (m && COACHED[m[1]]) return { key, de: `${COACHED[m[1]][0]} trainiert hat`, en: `has managed ${COACHED[m[1]][1]}`, coach: true };
  const wc = WORLD_CUPS.find((w) => w[0] === key);
  if (wc) return { key, de: `${wc[1]} im Weltmeisterkader ${wc[2]} stand`, en: `was in ${wc[3]} ${wc[1]} World Cup-winning squad` };
  const eu = EUROS.find((w) => w[0] === key);
  if (eu) return { key, de: `${eu[1]} im Europameisterkader ${eu[2]} stand`, en: `was in ${eu[3]} Euro ${eu[1]}-winning squad` };
  const sq = key === "f-dfb-wm-spieler" ? SQUADS[key] : SQUADS[key.replace(/^f-wm-spieler-/, "")];
  if (sq && (key === "f-dfb-wm-spieler" || key.startsWith("f-wm-spieler-"))) return { key, de: `bei einer WM im Kader ${sq[0]} stand`, en: `was in ${sq[1]} squad at a World Cup` };
  const o = OTHER[key];
  if (o) return { key, de: o[0], en: o[1], coach: !!o[2] };
  return null;
}

// ----------------------------------------------------------------------------------------------
// One entity per person
// ----------------------------------------------------------------------------------------------

const PARTICLES = new Set(["van", "von", "de", "der", "den", "di", "da", "dos", "del", "la", "le", "ter", "mac", "dal", "du"]);
function surname(name: string) {
  const w = name.replace(/\b(Jr\.?|Júnior|Junior|Sr\.?)$/i, "").trim().split(/\s+/);
  if (w.length < 2) return null;
  let i = w.length - 1;
  while (i > 1 && PARTICLES.has(w[i - 1].toLowerCase())) i--;
  const s = w.slice(i).join(" ");
  return norm(s).length >= 4 ? s : null;
}

function persons(lists: { key: string; answers: string[] }[]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const x = find(a), y = find(b);
    if (x !== y) parent.set(y, x);
  };
  // an answer node per list entry; keys that join them: the main name and every full-name spelling
  type Node = { id: string; names: string[]; list: string; pos: number; len: number };
  const nodes: Node[] = [];
  const byKey = new Map<string, string>();
  for (const l of lists)
    l.answers.forEach((a, pos) => {
      const names = a.split("|").map((s) => s.trim()).filter(Boolean);
      const id = `${l.key}#${pos}`;
      nodes.push({ id, names, list: l.key, pos, len: l.answers.length });
      names.forEach((n, i) => {
        const k = norm(n);
        if (!k || (i > 0 && k.split(" ").length < 2)) return; // single-word aliases ("Ronaldo") don't join people
        const other = byKey.get(k);
        if (other) union(other, id);
        else byKey.set(k, id);
      });
    });
  const groups = new Map<string, Node[]>();
  for (const n of nodes) {
    const r = find(n.id);
    groups.set(r, [...(groups.get(r) ?? []), n]);
  }
  const entities: Entity[] = [];
  const member = new Map<string, Set<string>>(); // list key → entity ids
  const used = new Set<string>();
  for (const g of groups.values()) {
    const count = new Map<string, number>();
    for (const n of g) count.set(n.names[0], (count.get(n.names[0]) ?? 0) + 1);
    const name = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
    let id = `p:${norm(name).replace(/ /g, "-")}`;
    while (used.has(id)) id += "+";
    used.add(id);
    const names = [...new Set(g.flatMap((n) => n.names))];
    const lists = new Set(g.map((n) => n.list));
    // fame: in how many lists, and how high up (the lists are sorted by fame)
    const raw = lists.size * 6 + g.reduce((s, n) => s + Math.max(0, 1 - n.pos / Math.min(40, n.len)) * 10, 0);
    const sn = surname(name);
    entities.push({ id, name, nameEn: name, names, short: sn ? [sn] : [], fame: Math.min(100, Math.round(raw * 1.6)) });
    for (const l of lists) member.set(l, (member.get(l) ?? new Set()).add(id));
  }
  return { entities, member };
}

export function fussballTheme(): Theme {
  const all = [...FUSSBALL_SPIELER, ...FUSSBALL];
  const cls = all.map((q) => clauseFor(q.key)).filter((c): c is Clause => !!c);
  const lists = all.filter((q) => cls.some((c) => c.key === q.key));
  const { entities, member } = persons(lists);
  const ids = (k: string) => [...(member.get(k) ?? [])];
  const who = (cs: Clause[], lang: "de" | "en") =>
    cs.some((c) => c.coach) ? (lang === "de" ? "Nenne jemanden, der" : "Name someone who") : lang === "de" ? "Nenne einen Spieler, der" : "Name a player who";
  const preds: Pred[] = cls.map((c) => ({ key: c.key, de: `${who([c], "de")} ${c.de}.`, en: `${who([c], "en")} ${c.en}.`, ids: ids(c.key), parts: [c.key], src: "Wikipedia- und Wikidata-Listen (wie bei Tiefgang)" }));
  for (let i = 0; i < cls.length; i++)
    for (let j = i + 1; j < cls.length; j++) {
      const a = cls[i], b = cls[j];
      const sa = member.get(a.key)!, sb = member.get(b.key)!;
      const [small, big] = sa.size < sb.size ? [sa, sb] : [sb, sa];
      const both = [...small].filter((id) => big.has(id));
      if (!both.length || both.length === sa.size || both.length === sb.size) continue;
      const de = a.club && b.club ? `${a.club[0]} und ${b.club[0]} gespielt hat` : `${a.de} und ${b.de}`;
      const en = a.club && b.club ? `has played ${a.club[1]} and ${b.club[1]}` : `${a.en} and ${b.en.replace(/^has /, "")}`;
      preds.push({ key: `${a.key}+${b.key}`, de: `${who([a, b], "de")} ${de}.`, en: `${who([a, b], "en")} ${en}.`, ids: both, parts: [a.key, b.key], src: "Wikipedia- und Wikidata-Listen (wie bei Tiefgang)" });
    }
  preds.sort((a, b) => (a.key < b.key ? -1 : 1));
  return {
    key: "fussball",
    title: "Fußball",
    titleEn: "Football",
    thing: "ein Spieler",
    thingEn: "a player",
    entities,
    byId: new Map(entities.map((e) => [e.id, e])),
    preds,
    fameCut: 60,
    bands: [
      [90, 700],
      [40, 300],
      [20, 160],
      [10, 70],
      [5, 30],
      [2, 10],
      [1, 3],
    ],
  };
}
