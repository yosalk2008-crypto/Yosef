/**
 * Tiefgang: topics the owner does not want (26 Nov 2026: "wer will das denn bitte wissen").
 * - administrative divisions of countries and cities: provinces, regions, states, counties, districts,
 *   départements, prefectures, cantons, federal states and their capitals, city districts
 * - hiking trails, valleys, gorges/canyons and mountain passes
 * These keys are removed from every pool (daily lists, catalogue, templates); `GESPERRT_MUSTER` lets the
 * check script refuse new questions on these topics, so they never come back.
 */
export const GESPERRT = new Set<string>([
  // big pool / catalogue
  "k:us-staat", "k:us-hauptstadt", "k:stadtteil-berlin", "k:provinz-spanien", "k:provinz-tuerkei", "k:provinz-italien",
  "k:kanton", "k:bundesland", "k:oesterreich-land", "k:bundesland-hauptstadt",
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
  // valleys, gorges, passes
  "k:t-schlucht", "k:t-alpental", "k:t-alpenpass",
]);

/** Question texts on these topics are refused by scripts/data/check-tiefgang-taeglich.ts. */
export const GESPERRT_MUSTER =
  /provinz|province|bundesland|bundesländ|bundesstaat|us-staat|kanton|canton|d[ée]partement|departamento|bezirk|county|counties|grafschaft|oblast|pr[äa]fektur|prefecture|landkreis|kreisfreie|\bkreis\b|woiwodschaft|komitat|distrikt|district|stadtteil|ortsteil|stadtviertel|\bviertel\b|quartier|arrondissement|borough|föderationssubjekt|verwaltungs|\bregion(en)? (eines|einer|des|der|von|in|\w+s\b)|wanderweg|fernwanderweg|wanderroute|trail|höhenweg|pilgerweg|jakobsweg|\btal\b|täler|\btal in|schlucht|klamm|canyon|bergpass|alpenpass|\bpass\b|pässe/i;

export const gesperrt = (key: string, text?: string) => GESPERRT.has(key) || (!!text && GESPERRT_MUSTER.test(text));
