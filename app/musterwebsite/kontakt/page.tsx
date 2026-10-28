import type { Metadata } from "next";
import { PageHead } from "../ui";
import { KontaktForm } from "./KontaktForm";

export const metadata: Metadata = { title: "Kontakt" };

const zeiten = [
  ["Mo – Do", "14 – 19 Uhr"],
  ["Fr", "10 – 16 Uhr"],
  ["Sa", "10 – 13 Uhr"],
];

export default function Kontakt() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <PageHead eyebrow="Kontakt" title="Sag hallo" text="Komm vorbei, ruf an oder schreib uns eine Nachricht." />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-2xl bg-surface p-7">
          <Info label="Adresse">Hauptbahnhof Neuss<br />Zufuhrstraße, 41460 Neuss</Info>
          <Info label="Telefon">02131 123 456 0</Info>
          <Info label="E-Mail">info@fahrschule-quirinus.de</Info>
          <Info label="Bürozeiten">
            <table className="text-sm">
              <tbody>
                {zeiten.map(([d, z]) => (
                  <tr key={d}>
                    <td className="pr-6">{d}</td>
                    <td>{z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Info>
        </div>
        <div className="relative min-h-80 overflow-hidden rounded-2xl bg-fs-soft">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <g stroke="#fff" strokeWidth="10" fill="none">
              <path d="M0 95L400 80M0 205L400 225M95 0L120 320M255 0L285 320M-20 300L420 260" />
            </g>
            <circle cx="200" cy="140" r="22" fill="#2257d6" opacity=".2" />
            <circle cx="200" cy="140" r="9" fill="#2257d6" stroke="#fff" strokeWidth="3" />
          </svg>
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold">Neuss Hauptbahnhof</p>
              <p className="text-sm text-muted">Zufuhrstraße, 41460 Neuss</p>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Neuss+Hauptbahnhof"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-fs px-4 py-2.5 text-sm font-semibold text-white"
            >
              Google Maps
            </a>
          </div>
        </div>
      </div>

      <h2 className="mt-20 text-3xl font-bold tracking-tight">Nachricht schreiben</h2>
      <KontaktForm />
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  );
}
