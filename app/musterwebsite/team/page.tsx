import type { Metadata } from "next";
import { PageHead } from "../ui";

export const metadata: Metadata = { title: "Team" };

const team = [
  { initials: "MB", name: "Michael Becker", role: "Inhaber · Fahrlehrer B, BE, A" },
  { initials: "SK", name: "Sabine Kowalski", role: "Fahrlehrerin B, B197" },
  { initials: "TA", name: "Tarek Aydın", role: "Fahrlehrer Motorrad" },
  { initials: "NP", name: "Nina Peters", role: "Büro & Anmeldung" },
];

export default function Team() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <PageHead
        eyebrow="Team"
        title={<>Die Menschen<br />hinter dem Lenkrad</>}
        text="Ein festes Team, ein fester Ansprechpartner – von der ersten bis zur letzten Stunde."
      />
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {team.map((t) => (
          <div key={t.name}>
            <div className="grid aspect-square place-items-center rounded-2xl bg-surface text-4xl font-bold text-fs">
              {t.initials}
            </div>
            <h3 className="mt-4 font-semibold">{t.name}</h3>
            <p className="text-sm text-muted">{t.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
