import type { Lang } from "./i18n";

/** Translation helper for server components: tr(lang)("Deutsch", "English"). */
export const tr = (lang: Lang) => (de: string, en: string) => (lang === "en" ? en : de);
