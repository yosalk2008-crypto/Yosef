import type { Metadata } from "next";

/** canonical + hreflang links between the German page and its English twin */
export function alternates(path: string, lang: "de" | "en"): Metadata["alternates"] {
  const en = path === "/" ? "/en" : "/en" + path;
  return { canonical: lang === "en" ? en : path, languages: { de: path, en, "x-default": path } };
}
