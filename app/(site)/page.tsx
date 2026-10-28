import Link from "next/link";
import { AnfrageForm } from "@/components/AnfrageForm";
import { pakete, site } from "@/lib/site";
import { CarSvg } from "@/components/Vehicles";

const leistungen = [
  {
    title: "Individuelles Design",
    text: "Kein Baukasten-Look: Ihre Website wird passend zu Ihrem Unternehmen, Ihren Farben und Ihrer Zielgruppe gestaltet.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 4h16M8 4v5",
  },
  {
    title: "Domain inklusive",
    text: "Ihre Wunschdomain (z. B. ihre-firma.de) registrieren und verwalten wir für Sie – ohne Extrakosten.",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9m0-18C9.5 5.5 8.5 8.5 8.5 12s1 6.5 3.5 9M3.5 9h17M3.5 15h17",
  },
  {
    title: "Hosting & SSL-Sicherheit",
    text: "Schnelle Server, verschlüsselte Verbindung (HTTPS) und regelmäßige Backups. Ihre Seite ist sicher und immer erreichbar.",
    icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3zm-3 9l2 2 4-4",
  },
  {
    title: "Schneller Änderungsservice",
    text: "Neue Öffnungszeiten, Preise oder Bilder? Kurze Nachricht genügt – wir setzen Änderungen zügig für Sie um.",
    icon: "M13 3L4 14h7l-1 7 9-11h-7l1-7z",
  },
  {
    title: "Perfekt auf jedem Gerät",
    text: "Optimiert für Smartphone, Tablet und Desktop – denn die meisten Kunden suchen heute mobil.",
    icon: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zm3 15h2",
  },
  {
    title: "Laufende Updates",
    text: "Technik, Sicherheit und Inhalte bleiben aktuell. Sie kümmern sich um Ihr Geschäft, wir um Ihre Website.",
    icon: "M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4",
  },
];

const schritte = [
  { nr: "01", title: "Anfrage stellen", text: "Sie schreiben uns kurz, was Sie brauchen. Wir melden uns schnell und klären alle Details." },
  { nr: "02", title: "Design & Umsetzung", text: "Wir gestalten Ihre Website mit Ihren Inhalten. Sie geben Feedback, wir passen an." },
  { nr: "03", title: "Online gehen", text: "Domain, Hosting und SSL richten wir ein – Ihre Website ist live und sofort auffindbar." },
  { nr: "04", title: "Rundum betreut", text: "Änderungen, Updates und Support laufen über uns – ganz ohne versteckte Kosten." },
];

const faqs = [
  {
    q: "Was bedeutet „Website im Abo“?",
    a: "Statt einer hohen Einmalzahlung zahlen Sie einen festen Monatsbetrag. Darin enthalten sind Design, Domain, Hosting, SSL-Zertifikat, technische Updates und unser Änderungsservice.",
  },
  {
    q: "Wem gehört die Domain?",
    a: "Die Domain läuft auf Ihren Firmennamen. Wir übernehmen lediglich die Verwaltung für Sie.",
  },
  {
    q: "Wie schnell werden Änderungen umgesetzt?",
    a: "Kleinere Änderungen wie Texte, Bilder, Preise oder Öffnungszeiten setzen wir in der Regel innerhalb von 1–2 Werktagen um – im Premium-Paket bevorzugt am selben Werktag.",
  },
  {
    q: "Wie lange dauert es, bis meine Website online ist?",
    a: "Sobald alle Inhalte vorliegen, ist Ihre Website meist innerhalb von 1–2 Wochen live.",
  },
  {
    q: "Muss ich mich um Technik kümmern?",
    a: "Nein. Hosting, Sicherheit, Backups und Updates übernehmen wir komplett. Sie brauchen keinerlei technisches Wissen.",
  },
  {
    q: "Kann ich das Paket später wechseln?",
    a: "Ja. Wenn Ihr Unternehmen wächst, können Sie jederzeit in ein größeres Paket wechseln.",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink pb-24 pt-32 text-white sm:pt-40">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Websites im Abo · Alles inklusive
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Ihre professionelle Website.{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                Ohne Sorgen.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Modernes Design, Domain, Hosting, SSL-Sicherheit und ein schneller Service für
              Änderungen und Updates – alles in einem monatlichen Abo. Keine hohen Einmalkosten,
              keine Technik-Probleme.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#anfrage" className="rounded-full bg-white px-6 py-3.5 font-semibold text-ink transition hover:bg-brand-soft">
                Kostenlos anfragen
              </Link>
              <Link href="/musterwebsite" className="rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                Musterwebsite ansehen
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {["Individuelles Angebot", "Domain & Hosting inklusive", "Änderungen in 1–2 Werktagen"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Browser-Mockup */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/50 backdrop-blur">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 text-[11px] text-white/60">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-400" fill="currentColor" aria-hidden>
                    <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z" />
                  </svg>
                  ihre-firma.de
                </div>
              </div>
              <div className="overflow-hidden rounded-xl bg-white text-ink">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-fs" />
                    <span className="h-2.5 w-20 rounded bg-ink/80" />
                  </div>
                  <div className="hidden gap-3 sm:flex">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-2 w-10 rounded bg-ink/15" />
                    ))}
                  </div>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <span className="block h-2 w-16 rounded bg-fs/60" />
                    <span className="block h-5 w-full rounded bg-ink/85" />
                    <span className="block h-5 w-3/4 rounded bg-fs" />
                    <span className="block h-2 w-full rounded bg-ink/15" />
                    <span className="block h-2 w-5/6 rounded bg-ink/15" />
                    <div className="flex gap-2 pt-2">
                      <span className="h-7 w-20 rounded-full bg-fs" />
                      <span className="h-7 w-20 rounded-full bg-surface" />
                    </div>
                  </div>
                  <div className="grid place-items-center rounded-xl bg-fs-soft py-6">
                    <CarSvg className="w-36 text-fs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 px-5 pb-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 rounded-lg bg-surface p-3">
                      <span className="block h-2 w-10 rounded bg-fs/60" />
                      <span className="block h-2.5 w-14 rounded bg-ink/70" />
                      <span className="block h-1.5 w-full rounded bg-ink/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-xl sm:-left-8">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Check />
              </span>
              <div>
                <p className="text-sm font-semibold">Änderung erledigt</p>
                <p className="text-xs text-muted">Neue Öffnungszeiten sind online</p>
              </div>
            </div>
            <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-xl sm:flex">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
              </svg>
              SSL gesichert
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile-Leiste */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 text-center md:grid-cols-4">
          {[
            ["Keine", "hohen Startkosten"],
            ["1 Abo", "planbar jeden Monat"],
            ["1–2 Tage", "für Änderungen"],
            ["100 %", "Service aus einer Hand"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">{v}</p>
              <p className="mt-1 text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leistungen */}
      <section id="leistungen" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Leistungen" title="Alles, was Ihre Website braucht." text="Sie bekommen nicht nur eine Website, sondern einen Partner, der sich dauerhaft um Ihren Online-Auftritt kümmert." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leistungen.map((l) => (
              <div key={l.title} className="group rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                  <Icon d={l.icon} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{l.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vergleich */}
      <section className="bg-surface py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Warum im Abo?" title="Planbar statt teuer." text="Eine klassische Agentur-Website kostet schnell mehrere tausend Euro – und danach sind Sie mit Technik und Änderungen allein." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">Klassisch</p>
              <ul className="mt-6 space-y-4">
                {[
                  "Hohe Einmalzahlung vor dem Start",
                  "Domain & Hosting selbst organisieren",
                  "Jede Änderung kostet extra",
                  "Veraltete Technik nach wenigen Jahren",
                  "Bei Problemen kein fester Ansprechpartner",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-muted">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/40 blur-3xl" />
              <p className="relative text-sm font-semibold uppercase tracking-wider text-indigo-300">Firmengrafik-Abo</p>
              <ul className="relative mt-6 space-y-4">
                {[
                  "Fester, planbarer Monatsbetrag",
                  "Domain, Hosting & SSL inklusive",
                  "Änderungen und Updates inklusive",
                  "Immer moderne, sichere Technik",
                  "Persönlicher Ansprechpartner",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="text-emerald-400" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pakete */}
      <section id="pakete" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Pakete" title="Ein Abo. Alles drin." text="Jedes Unternehmen ist anders – deshalb erhalten Sie Ihr Angebot individuell auf Anfrage. Domain, Hosting und SSL sind immer inklusive." center />
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {pakete.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-3xl p-8 ${
                  p.highlight
                    ? "bg-ink text-white shadow-2xl shadow-brand/25 ring-1 ring-brand/50 lg:-my-4 lg:py-12"
                    : "border border-line bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-1 text-xs font-semibold text-white">
                    Beliebteste Wahl
                  </span>
                )}
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${p.highlight ? "text-white/65" : "text-muted"}`}>{p.beschreibung}</p>
                <p className="mt-6 text-2xl font-bold tracking-tight">Preis auf Anfrage</p>
                <ul className="mt-8 flex-1 space-y-3.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className={p.highlight ? "text-indigo-300" : "text-brand"} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="#anfrage"
                  className={`mt-9 block rounded-full py-3.5 text-center font-semibold transition ${
                    p.highlight
                      ? "bg-gradient-to-r from-brand to-brand-2 text-white hover:opacity-95"
                      : "bg-surface text-ink hover:bg-brand-soft"
                  }`}
                >
                  Angebot anfordern
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-muted">
            Individuelle Wünsche wie Online-Shop oder Terminbuchung? Sprechen Sie uns an – wir erstellen Ihnen ein passendes Angebot.
          </p>
        </div>
      </section>

      {/* Ablauf */}
      <section id="ablauf" className="bg-surface py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Ablauf" title="In vier Schritten online." text="Unkompliziert und transparent – Sie wissen jederzeit, woran wir arbeiten." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {schritte.map((s) => (
              <div key={s.nr} className="rounded-2xl bg-white p-7">
                <span className="text-gradient text-3xl font-bold">{s.nr}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Musterwebsite Teaser */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-soft to-white p-8 ring-1 ring-line sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">Beispiel</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">So kann Ihre Website aussehen.</h2>
              <p className="mt-4 leading-relaxed text-muted">
                Klicken Sie sich durch unsere Musterwebsite einer Fahrschule – mit Bewertungen,
                Fuhrpark, Team, interaktivem Preisrechner und Kontaktformular. Genau so umfangreich
                und modern gestalten wir auch Ihren Auftritt.
              </p>
              <Link href="/musterwebsite" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-semibold text-white transition hover:bg-ink-2">
                Musterwebsite öffnen
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <Link href="/musterwebsite" className="group block rounded-2xl bg-white p-2 shadow-2xl shadow-brand/10 ring-1 ring-line transition hover:-translate-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="h-2 w-2 rounded-full bg-line" />
              </div>
              <div className="rounded-xl border border-line p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-fs text-[10px] font-bold text-white">Q</span>
                  <span className="text-xs font-semibold">Fahrschule Quirinus</span>
                </div>
                <div className="mt-5 grid grid-cols-[1.2fr_1fr] items-center gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-fs">Fahrschule in Neuss</p>
                    <p className="mt-1 text-xl font-bold leading-tight">
                      Dein Führerschein. <span className="text-fs">Entspannt</span> gemacht.
                    </p>
                  </div>
                  <div className="grid place-items-center rounded-lg bg-fs-soft py-5">
                    <CarSvg className="w-24 text-fs transition group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface py-24">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHead eyebrow="FAQ" title="Häufige Fragen" center />
          <div className="mt-12 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span className="faq-icon grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-lg transition">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Anfrage */}
      <section id="anfrage" className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Online-Anfrage</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Lassen Sie uns über Ihre Website sprechen.</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Unverbindlich und kostenlos. Schildern Sie uns kurz Ihr Vorhaben – wir melden uns
              schnellstmöglich mit einem Vorschlag bei Ihnen.
            </p>
            <div className="mt-8 space-y-4">
              <a href={`mailto:${site.email}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/40">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon d="M4 6h16v12H4zM4 7l8 6 8-6" />
                </span>
                <div>
                  <p className="text-xs text-muted">E-Mail</p>
                  <p className="font-semibold">{site.email}</p>
                </div>
              </a>
              <a href={`tel:${site.phoneHref}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/40">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" />
                </span>
                <div>
                  <p className="text-xs text-muted">Telefon</p>
                  <p className="font-semibold">{site.phone}</p>
                </div>
              </a>
            </div>
          </div>
          <AnfrageForm />
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-muted">{text}</p>}
    </div>
  );
}
