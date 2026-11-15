import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { GAMES, QUIZ_TYPES, quizRegionParams } from "@/lib/games";
import { LAND, METRICS, CONT_KEY } from "@/lib/laender";
import { CONTINENTS } from "@/lib/data/countries";
import { allQA } from "@/lib/qa";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/startseite",
    "/quiz",
    "/archiv",
    "/tiefgang",
    "/tiefgang/endlos",
    "/koscher",
    "/halal",
    "/multiplayer",
    "/bestenliste",
    ...GAMES.map((g) => `/taeglich/${g.key}`),
    ...QUIZ_TYPES.map((q) => `/quiz/${q.key}`),
    "/laender",
    ...CONTINENTS.map((k) => `/laender/kontinent/${CONT_KEY[k]}`),
    ...METRICS.map((m) => `/laender/rangliste/${m.key}`),
    ...LAND.map((c) => `/laender/${c.slug}`),
    "/koscher/fragen",
    "/halal/fragen",
    ...allQA("koscher").map((x) => `/koscher/frage/${x.slug}`),
    ...allQA("halal").map((x) => `/halal/frage/${x.slug}`),
    ...quizRegionParams().map((p) => `/quiz/${p.typ}/${p.region}`),
    "/quellen",
    "/impressum",
    "/datenschutz",
  ];
  return paths.flatMap((p) => [
    { url: site.url + p, alternates: { languages: { de: site.url + p, en: site.url + "/en" + p } } },
    { url: site.url + "/en" + p, alternates: { languages: { de: site.url + p, en: site.url + "/en" + p } } },
  ]);
}
