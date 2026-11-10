import type { Metadata } from "next";
import { TiefgangLoader } from "./TiefgangLoader";

export const metadata: Metadata = {
  title: "Tiefgang – das Quiz der seltenen Antworten",
  description: "Sieben Fragen, 25 Sekunden pro Frage: Je seltener deine richtige Antwort, desto tiefer tauchst du.",
};

export default function Page() {
  return <TiefgangLoader mode="daily" />;
}
