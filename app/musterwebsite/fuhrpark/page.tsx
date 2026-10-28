import type { Metadata } from "next";
import { BikeSvg, CarSvg, TrailerSvg } from "@/components/Vehicles";
import { PageHead } from "../ui";

export const metadata: Metadata = { title: "Fuhrpark" };

const fahrzeuge = [
  { name: "VW Golf 8", info: "Klasse B · Schaltgetriebe · 150 PS", el: <CarSvg className="w-3/5 text-fs" /> },
  { name: "Skoda Octavia", info: "Klasse B197 · Automatik · 150 PS", el: <CarSvg className="w-3/5 text-ink" /> },
  { name: "Yamaha MT-07", info: "Klasse A2 · 35 kW gedrosselt", el: <BikeSvg className="w-1/2 text-fs" /> },
  { name: "VW Tiguan mit Anhänger", info: "Klasse BE · bis 3.500 kg", el: <TrailerSvg className="w-4/5 text-slate-500" /> },
];

export default function Fuhrpark() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <PageHead eyebrow="Fuhrpark" title="Unsere Fahrzeuge" text="Moderne, gepflegte Fahrzeuge mit aktuellen Assistenzsystemen." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {fahrzeuge.map((f) => (
          <div key={f.name} className="group">
            <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-surface transition group-hover:bg-fs-soft">
              {f.el}
            </div>
            <h3 className="mt-4 font-semibold">{f.name}</h3>
            <p className="text-sm text-muted">{f.info}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
