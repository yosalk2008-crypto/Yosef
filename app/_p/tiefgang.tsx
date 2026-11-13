import type { Metadata } from "next";
import { TiefgangLoader } from "@/app/(de)/tiefgang/TiefgangLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Tiefgang – das Quiz der seltenen Antworten", "Deep Dive – the quiz of rare answers"),
    description: t(
      "Sieben Fragen, 25 Sekunden pro Frage: Je seltener deine richtige Antwort, desto tiefer tauchst du.",
      "Seven questions, 25 seconds each: the rarer your correct answer, the deeper you dive."
    ),
  };
};

export default function Page() {
  return <TiefgangLoader mode="daily" />;
}
