"use client";

import { LangContext, type Lang } from "@/lib/i18n";

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
