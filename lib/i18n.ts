"use client";

import { createContext, useCallback, useContext } from "react";

export type Lang = "de" | "en";
export const LangContext = createContext<Lang>("de");
export const useLang = () => useContext(LangContext);

/** Inline translation: t("Deutsch", "English"). */
export function useT() {
  const lang = useLang();
  return useCallback((de: string, en: string) => (lang === "en" ? en : de), [lang]);
}

/** Internal links get the /en prefix on English pages. */
export function localHref(lang: Lang, href: string) {
  if (lang !== "en" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/en" || href.startsWith("/en/") || href.startsWith("/en?")) return href;
  if (/^\/(flags|geo|thumbs|koscher\/|halal\/|_next)/.test(href) && /\.\w+($|\?)/.test(href)) return href; // files
  return href === "/" ? "/en" : href.startsWith("/?") ? "/en" + href.slice(1) : "/en" + href;
}
export function useHref() {
  const lang = useLang();
  return useCallback((href: string) => localHref(lang, href), [lang]);
}

/** Path without the language prefix, and the same page in the other language. */
export function stripLang(path: string) {
  if (path === "/en") return "/";
  return path.startsWith("/en/") ? path.slice(3) : path;
}
