/**
 * Tiefgang: topics the owner does not want (26 Nov 2026: "wer will das denn bitte wissen").
 * - administrative divisions of countries and cities: provinces, regions, states, counties, districts,
 *   départements, prefectures, cantons, city districts – EXCEPT the German Bundesländer and the US states
 *   (and their capitals), which the owner wants to keep
 * - hiking trails, valleys, gorges/canyons and mountain passes
 * - mountains, mountain ranges, volcanoes, glaciers and rivers (cities on rivers only for very well-known
 *   rivers such as Rhine, Danube, Elbe – not Oder, Weser, Ems, Saale, Havel, Neckar, Moselle, Loire, Rhône)
 * These keys are removed from every pool (daily lists, catalogue, templates); `GESPERRT_MUSTER` lets the
 * check script refuse new questions on these topics, so they never come back.
 */
export const GESPERRT = new Set<string>([
  // big pool / catalogue
  "k:stadtteil-berlin", "k:provinz-spanien", "k:provinz-tuerkei", "k:provinz-italien",
  "k:kanton", "k:oesterreich-land",
  // daily questions
  "k:t-departement", "k:t-landkreis-bayern", "k:t-grafschaft-england", "k:t-wien", "k:t-nrw-kreis", "k:t-county-kalifornien",
  "k:t-istanbul-stadtteil", "k:t-praefektur-japan-korea", "k:t-kreis-niedersachsen-hessen", "k:t-bezirk-oesterreich",
  "k:t-tokio-stadtteil", "k:t-barcelona-stadtteil", "k:t-kreis-bw-sachsen", "k:t-provinz-arg-chl-col", "k:t-provinz-chn-can-aus",
  "k:t-region-pl-cz-sk-hu", "k:t-county-texas", "k:t-kreise-rlp-saar-sh", "k:t-madrid", "k:t-hauptstadt-provinz",
  "k:t-county-florida", "k:t-provinz-skandinavien", "k:t-kreise-ost", "k:t-provinz-thailand", "k:t-region-anden",
  // city districts and more states/regions (found with the pattern below)
  "k:stadtteil-hamburg", "k:stadtteil-koeln", "k:stadtteil-muenchen", "k:stadtteil-newyork",
  "k:t-london", "k:t-paris", "k:t-bundesstaat-bra-mex", "k:t-prag-stadtteil", "k:t-bundesstaat-indien-nigeria",
  "k:t-duesseldorf-stadtteil", "k:t-rom-viertel", "k:t-leipzig-ortsteil", "k:t-dresden-stadtteil", "k:t-region-russland", "k:t-viertel-la",
  "k:t-region-frankreich", "k:t-landschaft-italien", "k:t-schottland-wales-council",
  // mountains, ranges, volcanoes, glaciers, rivers (owner, 26 Nov 2026)
  "k:fluss-europa", "k:fluss-afrika", "k:fluss-asien", "k:fluss-amerika", "k:gebirge", "k:berg-4000", "k:vulkan", "k:seven-summits",
  "k:mittelgebirge", "k:fluss-deutschland", "k:berg-deutschland", "k:berg-alpen", "k:fluss-lang", "k:fluss-frankreich", "k:fluss-usa",
  "k:t-berg-asien", "k:t-fluss-russland", "k:t-gebirge-asien", "k:t-donau-nebenfluss", "k:t-gletscher", "k:t-fluss-italien",
  "k:t-gebirge-europa", "k:t-fluss-britannien", "k:t-fluss-iberien", "k:t-fluss-polen-tschechien", "k:t-berg-amerika",
  "k:t-rhein-nebenfluss", "k:t-fluss-schweiz-oesterreich", "k:t-berg-afrika", "k:t-fluss-nordeuropa", "k:t-elbe-zufluss",
  "k:t-berg-europa-ohne-alpen", "k:t-berg-grossbritannien", "k:t-nebenfluss-mississippi-amazonas", "k:t-fluss-australien-neuseeland",
  // cities on rivers that are not well known
  "k:t-stadt-weser-oder", "k:t-stadt-main-neckar-mosel", "k:t-stadt-seine-loire-rhone",
  // valleys, gorges, passes
  "k:t-schlucht", "k:t-alpental", "k:t-alpenpass",
]);

/** Question texts on these topics are refused by scripts/data/check-tiefgang-taeglich.ts. */
export const GESPERRT_MUSTER =
  /provinz|province|bundesland|bundesländ|bundesstaat|us-staat|kanton|canton|d[ée]partement|departamento|bezirk|county|counties|grafschaft|oblast|pr[äa]fektur|prefecture|landkreis|kreisfreie|\bkreis\b|woiwodschaft|komitat|distrikt|district|stadtteil|ortsteil|stadtviertel|\bviertel\b|quartier|arrondissement|borough|föderationssubjekt|council area|principal area|\bregion oder|verwaltungs|\bregion(en)? (eines|einer|des|der|von|in|\w+s\b)|wanderweg|fernwanderweg|wanderroute|trail|höhenweg|pilgerweg|jakobsweg|\btal\b|täler|\btal in|schlucht|klamm|canyon|bergpass|alpenpass|\bpass\b|pässe|\bberge?\b|gebirge|vulkan|gletscher|\bfl(u|ü)ss|nebenfl(u|ü)ss|zufl(u|ü)ss|(\bder|\bam|\ban) (oder|weser|ems|saale|havel|neckar|mosel|loire|rh[oô]ne)\b/i;

export const gesperrt = (key: string, text?: string) => GESPERRT.has(key) || (!!text && GESPERRT_MUSTER.test(text));
