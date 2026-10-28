import type { Metadata } from "next";
import { AnfrageForm } from "@/components/AnfrageForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontakt & Anfrage",
  description: "Unverbindlich anfragen: Website, KI-Chatbot, KI-Telefonassistent oder Online-Terminbuchung für Ihr Unternehmen.",
};

export default function Kontakt() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink pb-20 pt-36 text-white">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Kontakt & Anfrage</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Lassen Sie uns über Ihr Projekt sprechen.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            Unverbindlich und kostenlos. Schildern Sie uns kurz Ihr Vorhaben – Sie erhalten ein
            individuelles Angebot, das genau zu Ihrem Unternehmen passt.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.6fr]">
          <aside className="space-y-4 lg:pt-2">
            <a href={`mailto:${site.email}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
              </span>
              <div>
                <p className="text-xs text-muted">E-Mail</p>
                <p className="font-semibold">{site.email}</p>
              </div>
            </a>
            <a href={`tel:${site.phoneHref}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></svg>
              </span>
              <div>
                <p className="text-xs text-muted">Telefon</p>
                <p className="font-semibold">{site.phone}</p>
              </div>
            </a>
            <div className="rounded-2xl bg-surface p-6">
              <h2 className="font-semibold">So geht es weiter</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted">
                {[
                  "Wir melden uns in der Regel innerhalb von 24 Stunden.",
                  "In einem kurzen Gespräch klären wir Ihre Wünsche.",
                  "Sie erhalten ein individuelles, transparentes Angebot.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
          <AnfrageForm />
        </div>
      </section>
    </>
  );
}
