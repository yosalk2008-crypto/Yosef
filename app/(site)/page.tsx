import Link from "next/link";
import { leistungen } from "@/lib/site";

const schritte = [
  { nr: "01", title: "Anfrage stellen", text: "Sie schreiben uns kurz, was Sie brauchen. Wir melden uns schnell und klären alle Details." },
  { nr: "02", title: "Konzept & Angebot", text: "Wir schlagen Ihnen die passende Lösung vor und erstellen ein individuelles Angebot." },
  { nr: "03", title: "Umsetzung", text: "Wir richten alles ein – von Website über Chatbot bis Telefonassistent. Sie geben Feedback, wir passen an." },
  { nr: "04", title: "Rundum betreut", text: "Änderungen, Updates und Support laufen über uns. Sie haben einen festen Ansprechpartner." },
];

const faqs = [
  {
    q: "Was kostet eine Lösung von Firmengrafik?",
    a: "Jedes Unternehmen ist anders – deshalb erhalten Sie ein individuelles Angebot auf Anfrage. Websites bieten wir im Abo an: Statt einer hohen Einmalzahlung zahlen Sie einen festen Monatsbetrag, in dem Domain, Hosting, SSL, Updates und Änderungen enthalten sind.",
  },
  {
    q: "Wie funktioniert der KI-Telefonassistent?",
    a: "Der Assistent nimmt Anrufe mit natürlicher Stimme an, beantwortet häufige Fragen zu Ihrem Unternehmen und notiert Anliegen und Rückrufwünsche. Sie erhalten nach jedem Gespräch eine Zusammenfassung per E-Mail.",
  },
  {
    q: "Weiß der KI-Chatbot, was mein Unternehmen anbietet?",
    a: "Ja. Wir richten den Chatbot mit Ihren Leistungen, Preisen, Öffnungszeiten und häufigen Fragen ein. Kann er etwas nicht beantworten, nimmt er die Anfrage auf und leitet sie an Sie weiter.",
  },
  {
    q: "Kann ich die Leistungen auch einzeln buchen?",
    a: "Natürlich. Sie können zum Beispiel nur einen KI-Telefonassistenten oder nur eine Online-Terminbuchung für Ihre bestehende Website buchen – oder alles kombinieren.",
  },
  {
    q: "Wie schnell werden Änderungen umgesetzt?",
    a: "Kleinere Änderungen wie Texte, Bilder, Preise oder Öffnungszeiten setzen wir in der Regel innerhalb von 1–2 Werktagen um.",
  },
  {
    q: "Muss ich mich um Technik kümmern?",
    a: "Nein. Hosting, Sicherheit, Backups, Updates und die Einrichtung der KI-Assistenten übernehmen wir komplett. Sie brauchen keinerlei technisches Wissen.",
  },
];

function Icon({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
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
              Websites · KI-Assistenten · Terminbuchung
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Digitale Lösungen, die{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                für Sie arbeiten.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Professionelle Websites im Abo, KI-Chatbots, KI-Telefonassistenten und
              Online-Terminbuchung – damit Ihr Unternehmen moderner auftritt, keine Anfrage mehr
              verpasst und Ihnen mehr Zeit fürs Wesentliche bleibt.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/kontakt" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-ink transition hover:bg-brand-soft">
                Kostenlos anfragen <Arrow />
              </Link>
              <Link href="#leistungen" className="rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                Leistungen ansehen
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {["Individuelles Angebot", "Alles aus einer Hand", "Persönlicher Ansprechpartner"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual: Website mit Chatbot, Anruf und Termin */}
          <div className="relative pb-6 sm:pb-0">
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
              <div className="relative overflow-hidden rounded-xl bg-white p-5 text-ink">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-brand" />
                    <span className="h-2.5 w-20 rounded bg-ink/80" />
                  </div>
                  <div className="hidden gap-3 sm:flex">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-10 rounded bg-ink/15" />
                    ))}
                  </div>
                </div>
                <div className="mt-6 space-y-2.5 sm:w-1/2">
                  <span className="block h-2 w-16 rounded bg-brand/60" />
                  <span className="block h-5 w-full rounded bg-ink/85" />
                  <span className="block h-5 w-3/4 rounded bg-brand" />
                  <span className="block h-2 w-full rounded bg-ink/15" />
                  <span className="block h-2 w-5/6 rounded bg-ink/15" />
                  <span className="mt-3 block h-7 w-28 rounded-full bg-brand" />
                </div>
                {/* Chat-Widget */}
                <div className="mt-6 rounded-2xl border border-line bg-white p-3 shadow-xl sm:absolute sm:bottom-4 sm:right-4 sm:mt-0 sm:w-56">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[10px] font-bold text-white">KI</span>
                    <span className="text-xs font-semibold">Assistent</span>
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="mt-2 w-fit rounded-xl rounded-tl-sm bg-surface px-3 py-1.5 text-[11px]">Hallo! Wie kann ich helfen?</p>
                  <p className="ml-auto mt-1.5 w-fit rounded-xl rounded-tr-sm bg-brand px-3 py-1.5 text-[11px] text-white">Habt ihr morgen einen Termin frei?</p>
                  <p className="mt-1.5 w-fit rounded-xl rounded-tl-sm bg-surface px-3 py-1.5 text-[11px]">Ja, um 10:00 oder 14:30 Uhr.</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-xl sm:-bottom-6 sm:-left-8">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon d={leistungen[2].icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Anruf angenommen</p>
                <p className="text-xs text-muted">Rückruf um 16 Uhr notiert</p>
              </div>
            </div>
            <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-xl sm:flex">
              <span className="text-emerald-600">
                <Icon d={leistungen[3].icon} className="h-4 w-4" />
              </span>
              Neuer Termin gebucht
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile-Leiste */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 text-center md:grid-cols-4">
          {[
            ["24/7", "für Kunden erreichbar"],
            ["0", "verpasste Anrufe"],
            ["1–2 Tage", "für Änderungen"],
            ["1", "Ansprechpartner für alles"],
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
          <SectionHead
            eyebrow="Leistungen"
            title="Alles für Ihren digitalen Auftritt."
            text="Einzeln buchbar oder kombiniert – wir stellen die Lösung zusammen, die zu Ihrem Unternehmen passt."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leistungen.map((l) => (
              <div key={l.id} className="group flex flex-col rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                  <Icon d={l.icon} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{l.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{l.text}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {l.punkte.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <Check className="h-4 w-4 text-brand" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-muted">
            Sie brauchen etwas anderes, z. B. einen Online-Shop? <Link href="/kontakt" className="font-semibold text-brand hover:underline">Sprechen Sie uns an</Link> – wir finden eine Lösung.
          </p>
        </div>
      </section>

      {/* KI-Highlight */}
      <section className="relative overflow-hidden bg-ink py-24 text-white">
        <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-brand-2/30 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Künstliche Intelligenz</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ihr digitaler Mitarbeiter – rund um die Uhr.</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Während Sie arbeiten, beim Kunden sind oder Feierabend haben, beantworten unsere
              KI-Assistenten Fragen, nehmen Anrufe an und vereinbaren Termine. So geht keine
              Anfrage mehr verloren.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Beantwortet häufige Fragen sofort – per Chat und am Telefon",
                "Nimmt Anliegen und Rückrufwünsche strukturiert auf",
                "Bucht Termine direkt in Ihren Kalender",
                "Auf Ihr Unternehmen zugeschnitten und datenschutzbewusst eingerichtet",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-white/85">
                  <Check className="text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/kontakt" className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-95">
              KI-Assistent anfragen <Arrow />
            </Link>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <Icon d={leistungen[2].icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">Eingehender Anruf · 19:42 Uhr</p>
                  <p className="text-sm text-white/55">Vom KI-Telefonassistenten angenommen</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/80">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Zusammenfassung</p>
                <p className="mt-1.5">
                  Herr Schneider möchte ein Angebot für eine Badsanierung. Bittet um Rückruf morgen
                  ab 9 Uhr.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-white/55">KI-Chatbot</p>
                <p className="mt-1 text-2xl font-bold">Antwortet sofort</p>
                <p className="mt-1 text-xs text-white/45">Auch nachts und am Wochenende</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-white/55">Nächster Termin</p>
                <p className="mt-1 text-2xl font-bold">Mo, 10:00 Uhr</p>
                <p className="mt-1 text-xs text-white/45">Online gebucht · bestätigt</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile */}
      <section id="vorteile" className="bg-surface py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Warum Firmengrafik?" title="Planbar statt kompliziert." text="Sie wollen sich um Ihr Geschäft kümmern – nicht um Technik. Genau dafür sind wir da." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">Ohne Firmengrafik</p>
              <ul className="mt-6 space-y-4">
                {[
                  "Hohe Einmalkosten für die Website",
                  "Verpasste Anrufe außerhalb der Öffnungszeiten",
                  "Termine nur per Telefon oder E-Mail",
                  "Jede Änderung kostet extra",
                  "Verschiedene Anbieter, kein fester Ansprechpartner",
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
              <p className="relative text-sm font-semibold uppercase tracking-wider text-indigo-300">Mit Firmengrafik</p>
              <ul className="relative mt-6 space-y-4">
                {[
                  "Website im Abo – fester, planbarer Monatsbetrag",
                  "KI-Assistent nimmt jeden Anruf an",
                  "Kunden buchen Termine selbst – auch nachts",
                  "Änderungen und Updates inklusive",
                  "Alles aus einer Hand, ein persönlicher Ansprechpartner",
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

      {/* Ablauf */}
      <section id="ablauf" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Ablauf" title="In vier Schritten zur Lösung." text="Unkompliziert und transparent – Sie wissen jederzeit, woran wir arbeiten." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {schritte.map((s) => (
              <div key={s.nr} className="rounded-2xl border border-line bg-white p-7">
                <span className="text-gradient text-3xl font-bold">{s.nr}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
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

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-14 text-center text-white sm:px-12">
            <div className="grid-bg pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand/40 blur-[100px]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Bereit, Ihr Unternehmen digital nach vorne zu bringen?</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Erzählen Sie uns von Ihrem Vorhaben – unverbindlich und kostenlos. Sie erhalten ein
                individuelles Angebot.
              </p>
              <Link href="/kontakt" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-ink transition hover:bg-brand-soft">
                Jetzt Anfrage stellen <Arrow />
              </Link>
            </div>
          </div>
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
