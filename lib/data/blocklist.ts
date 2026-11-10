/**
 * Names refused for the leaderboard: insults, slurs, sexual terms and extremist words in many languages.
 * The same list is enforced in the database (scripts/blocklist-sql.ts generates the SQL function).
 *
 * SUBSTRINGS are refused anywhere in the name (after normalising, e.g. "F_u_c_k3r" → "fucker").
 * TOKENS are short words that are only refused as a whole word, because they hide inside harmless
 * names ("ass" in "Kassel", "sex" in "Essex", "pedo" in "Torpedo", "mongo" in "Mongolei").
 */
export const SUBSTRINGS = [
  "arschloch", "arschgeige", "arschficker", "fotze", "hurensohn", "hurenkind", "hure", "nutte", "schlampe", "wichser", "wixer",
  "wichse", "ficken", "ficker", "fick", "missgeburt", "spast", "spasti", "behindert", "schwuchtel", "kanake", "kanacke", "neger",
  "zigeuner", "penner", "pisser", "scheiss", "scheis", "kacke", "dreckssau", "drecksau", "schwanzlutscher", "pimmel", "muschi",
  "votze", "bastard", "vollidiot", "idiot", "trottel", "dummkopf", "hackfresse", "kinderficker", "kinderschander",
  "vergewaltig", "judensau", "gaskammer", "auschwitz", "untermensch", "kanaken", "huso", "fuck", "fuk", "phuck", "shit", "bitch",
  "cunt", "pussy", "whore", "slut", "faggot", "fagot", "retard", "asshole", "arsehole", "motherf", "wanker", "twat", "bollock",
  "dickhead", "cocksuck", "blowjob", "handjob", "chink", "spastic", "porn", "rapist", "pedophil",
  "paedophil", "molest", "jerkoff", "dumbass", "jackass", "bullshit", "terrorist", "terror", "hitler", "heilhit", "siegheil",
  "kukluxklan", "alqaida", "alkaida", "taliban", "daesh", "jihadist", "isisfighter", "suicidebomb", "killall", "orospu", "aminakoy", "amcik", "sikerim", "sikeyim", "siktir", "sikis", "yarrak", "yarak", "ibne", "kahpe", "gavat", "pezevenk",
  "gerizekali", "serefsiz", "kaltak", "dalyarak", "yavsak", "sharmouta", "sharmuta", "sharmota", "charmouta", "sharmoot",
  "sharmut", "kosomak", "kosommak", "kussomak", "kusomak", "kusumak", "kosokhtak", "ibnelkalb", "ibnkalb", "ibnalkalb",
  "ibnharam", "ibnelharam", "weldelharam", "ouldelharam", "zebi", "zeby", "manyak", "maniak", "metnak", "mitnak", "khara",
  "khra", "gahba", "qahba", "kahba", "9ahba", "zamel", "zirto", "zerto", "nayek", "himar", "khawal",
  "shamuta", "lahas", "tizak", "gundi", "qehpe", "qahpe", "koskesh", "kosnanat", "kosekhar", "jende", "jendeh", "madarjende",
  "pedarsag", "kesafat", "bisharaf", "puta", "puto", "mierda", "cabron", "pendejo", "joder", "gilipollas", "maricon", "culero",
  "chinga", "malparido", "hijodeputa", "caralho", "foda", "buceta", "viado", "filhodaputa", "merda", "arrombado",
  "merde", "putain", "salope", "connard", "connasse", "encule", "batard", "niquetamere", "filsdepute", "vaffanculo", "fanculo", "stronzo", "puttana", "minchia", "coglione", "frocio", "bastardo", "kurwa", "chuj",
  "pierdol", "jebac", "jebany", "spierdalaj", "blyat", "blyad", "bljad", "pizda", "pizdec", "yobany", "mudak", "pidor",
  "pidar", "picka", "jebem", "jebote", "kurac", "govno", "kanker", "klootzak", "godverdomme", "nazis",
];

export const TOKENS = [
  "ass", "arsch", "fag", "cum", "tit", "tits", "dick", "cock", "prick", "rape", "sex", "anal", "anus", "pedo", "paedo", "pado",
  "mongo", "mongoloid", "opfer", "homo", "kkk", "isis", "jew", "sik", "pic", "kus", "kos", "kir", "kiri", "kirim", "suka", "hui",
  "huy", "khuy", "kut", "porra", "cono", "pute", "pede", "pd", "ntm", "nazi", "negro", "ss", "sa", "hh", "88", "1488", "18",
  "nik", "kalb", "kere", "gund", "lul", "pust", "zbi", "ayri", "airi", "hoer", "tering", "depp", "hmar", "mongool", "peder", "teez", "neek", "fresse", "verga", "troia", "nique", "ebat", "ayre", "cazzo",
];

/** Lower-case, strip accents, undo leetspeak (4→a, 3→e, 0→o, 1→i, 5→s, 7→t, @→a, $→s) and collapse repeated letters. */
export function normalizeName(s: string): string {
  return leet(s).replace(/(.)\1+/g, "$1");
}

/** Like normalizeName, but keeps double letters (for whole-word checks: "ass" must stay "ass"). */
export function leet(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

const collapse = (w: string) => normalizeName(w);
export const SUB = [...new Set(SUBSTRINGS.filter(Boolean).map(collapse))];
export const TOK = new Set(TOKENS.map((t) => t.toLowerCase()));

/** Patterns checked before collapsing double letters ("nigger" collapses to the country "niger"). */
export const PATTERNS = ["ni+g{2,}(a|ah|er|ers|az|uh)?", "n[i1!]+gg"];

export function isBlockedName(name: string): boolean {
  // digits that stand for themselves (1488, 88, 18) must be checked before leetspeak turns them into letters
  const raw = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (raw.some((t) => TOK.has(t))) return true;
  const rawCompact = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9!]/g, "");
  if (PATTERNS.some((p) => new RegExp(p).test(rawCompact.replace(/1|!/g, "i")))) return true;
  if (leet(name).split(/[^a-z0-9]+/).some((t) => TOK.has(t))) return true;
  const n = normalizeName(name);
  const compact = n.replace(/[^a-z0-9]/g, "").replace(/(.)\1+/g, "$1");
  return SUB.some((w) => compact.includes(w));
}
