import type { Metadata } from "next";
import { SouthBeach } from "@/components/southbeach/SouthBeach";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("South Beach – 3D-Open-World im Browser", "South Beach – 3D open world in your browser"),
    description: t(
      "South Beach, Miami im Maßstab 1:1 nach OpenStreetMap: Ocean Drive, Collins Avenue, Lummus Park. Third-Person-Actionspiel mit Autos, Waffen und Polizei – kostenlos im Browser.",
      "South Beach, Miami at 1:1 scale from OpenStreetMap: Ocean Drive, Collins Avenue, Lummus Park. Third-person action game with cars, guns and police – free in your browser."
    ),
  };
};

export default function Page() {
  return <SouthBeach />;
}
