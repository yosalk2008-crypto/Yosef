import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { GAMES, QUIZ_TYPES } from "@/lib/games";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/quiz",
    "/archiv",
    "/tiefgang",
    "/tiefgang/endlos",
    "/koscher",
    "/bestenliste",
    ...GAMES.map((g) => `/taeglich/${g.key}`),
    ...QUIZ_TYPES.map((q) => `/quiz/${q.key}`),
    "/quellen",
    "/impressum",
    "/datenschutz",
  ];
  return paths.map((p) => ({ url: site.url + p }));
}
