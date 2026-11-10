import type { Metadata } from "next";
import { TiefgangLoader } from "../TiefgangLoader";

export const metadata: Metadata = { title: "Tiefgang – Endlos-Modus", description: "Unbegrenzte Runden Tiefgang mit zufälligen Fragen." };

export default function Page() {
  return <TiefgangLoader mode="endlos" />;
}
