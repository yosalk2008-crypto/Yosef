import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { CONTINENTS, cCap, cName, contName, subName, type Continent } from "@/lib/data/countries";
import {
  CONT_BY_KEY,
  CONT_KEY,
  LAND,
  LAND_BY_ID,
  LAND_BY_SLUG,
  METRICS,
  METRIC_BY_KEY,
  NOTES,
  fmtArea,
  fmtPct,
  fmtPeople,
  fmtUsd,
  fmtYears,
  quizRegion,
  rankOf,
  ranking,
  type Land,
} from "@/lib/laender";

// ---------------------------------------------------------------- shared bits

function Hero({ kicker, title, sub, flag }: { kicker?: React.ReactNode; title: string; sub?: React.ReactNode; flag?: string }) {
  return (
    <section className="bg-ink pb-24 pt-10 text-white sm:pt-14">
      <div className="mx-auto flex max-w-4xl items-center gap-5 px-5">
        {flag && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flag} alt="" width={120} height={90} className="h-16 w-auto shrink-0 rounded-lg shadow-[0_0_0_3px_rgb(255_255_255_/_0.15)] sm:h-24" />
        )}
        <div className="min-w-0">
          {kicker && <div className="text-sm font-semibold text-white/60">{kicker}</div>}
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {sub && <p className="mt-2 text-white/75">{sub}</p>}
        </div>
      </div>
    </section>
  );
}

function Flag({ c, size = 28 }: { c: Land; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${c.iso2}.svg`} alt="" width={Math.round(size * 1.33)} height={size} loading="lazy" className="shrink-0 rounded-[4px] shadow-[0_0_0_1px_rgb(0_0_0_/_0.08)]" style={{ height: size, width: "auto" }} />;
}

function CountryChip({ c, lang }: { c: Land; lang: Lang }) {
  return (
    <Link href={`/laender/${c.slug}`} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 font-semibold shadow-[0_3px_0_var(--color-edge)] transition hover:-translate-y-0.5">
      <Flag c={c} size={20} />
      <span className="truncate">{cName(c, lang)}</span>
    </Link>
  );
}

function Crumbs({ lang, items }: { lang: Lang; items: [string, string?][] }) {
  const t = tr(lang);
  return (
    <nav aria-label={t("Brotkrumen", "Breadcrumb")} className="mb-2 flex flex-wrap gap-1 text-sm font-semibold text-white/60">
      <Link href="/laender" className="hover:text-white">
        {t("Länder", "Countries")}
      </Link>
      {items.map(([label, href]) => (
        <span key={label} className="flex gap-1">
          <span aria-hidden="true">/</span>
          {href ? (
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          ) : (
            <span>{label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function QuizLinks({ cont, lang }: { cont: Continent; lang: Lang }) {
  const t = tr(lang);
  const r = quizRegion(cont);
  const links: [string, string][] = [
    [`/quiz/flaggen/${r}`, t("Flaggen-Quiz", "Flag quiz")],
    [`/quiz/hauptstaedte/${r}`, t("Hauptstädte-Quiz", "Capitals quiz")],
    [`/quiz/karte/${r}`, t("Karten-Quiz", "Map quiz")],
    [`/quiz/umrisse/${r}`, t("Umrisse-Quiz", "Outline quiz")],
  ];
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold">
        {t("Teste dich", "Test yourself")}: {contName(cont, lang)}
      </h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {links.map(([h, l]) => (
          <Link key={h} href={h} className="btn-ghost">
            {l}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Source({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <p className="mt-10 text-sm text-muted">
      {t("Daten: Weltbank, mledoze/countries und Wikidata, jeweils neuester verfügbarer Wert – siehe", "Data: World Bank, mledoze/countries and Wikidata, latest available value – see")}{" "}
      <Link href="/quellen" className="text-brand hover:underline">
        {t("Datenquellen", "data sources")}
      </Link>
      .
    </p>
  );
}

// ---------------------------------------------------------------- /laender

export const uebersichtMeta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t(`Alle ${LAND.length} Länder der Welt – Flaggen, Hauptstädte, Einwohner`, `All ${LAND.length} countries of the world – flags, capitals, population`),
    description: t(
      "Steckbriefe zu allen Ländern der Welt: Flagge, Hauptstadt, Einwohner, Fläche, Nachbarländer und Ranglisten – sortiert nach Kontinent.",
      "Fact sheets for every country in the world: flag, capital, population, area, neighbours and rankings – sorted by continent."
    ),
  };
};

export function Uebersicht({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <>
      <Hero title={t("Alle Länder der Welt", "All countries of the world")} sub={t(`${LAND.length} Steckbriefe mit Flagge, Hauptstadt, Einwohnern und Nachbarn.`, `${LAND.length} fact sheets with flag, capital, population and neighbours.`)} />
      <div className="mx-auto -mt-14 max-w-4xl px-5 pb-16">
        <div className="card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">{t("Ranglisten", "Rankings")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <Link key={m.key} href={`/laender/rangliste/${m.key}`} className="chip">
                {lang === "en" ? m.en[0] : m.de[0]}
              </Link>
            ))}
          </div>
        </div>
        {CONTINENTS.map((k) => {
          const xs = LAND.filter((c) => c.cont === k).sort((a, b) => cName(a, lang).localeCompare(cName(b, lang), lang));
          return (
            <section key={k} className="mt-10">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold">
                  <Link href={`/laender/kontinent/${CONT_KEY[k]}`} className="hover:text-brand">
                    {contName(k, lang)}
                  </Link>{" "}
                  <span className="text-base text-muted">{xs.length}</span>
                </h2>
                <Link href={`/laender/kontinent/${CONT_KEY[k]}`} className="text-sm font-semibold text-brand hover:underline">
                  {t("Übersicht", "Overview")} →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {xs.map((c) => (
                  <CountryChip key={c.id} c={c} lang={lang} />
                ))}
              </div>
            </section>
          );
        })}
        <Source lang={lang} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- /laender/[land]

export const landParams = () => LAND.map((c) => ({ land: c.slug }));

export async function landMeta(lang: Lang, params: Promise<{ land: string }>): Promise<Metadata> {
  const { land } = await params;
  const c = LAND_BY_SLUG[land];
  if (!c) return {};
  const t = tr(lang);
  const name = cName(c, lang);
  const cap = cCap(c, lang);
  return {
    title: t(`${name}: Hauptstadt, Flagge, Einwohner & Fakten`, `${name}: capital, flag, population & facts`),
    description: t(
      `${name} liegt in der Region ${subName(c.sub, lang)}${cap ? `, die Hauptstadt ist ${cap}` : ""}. ${c.pop ? `${fmtPeople(c.pop, lang)} Einwohner, ` : ""}${fmtArea(c.area, lang)} Fläche – mit Flagge, Nachbarländern und Ranglisten.`,
      `${name} is in the region ${subName(c.sub, lang)}${cap ? `, its capital is ${cap}` : ""}. ${c.pop ? `Population ${fmtPeople(c.pop, lang)}, ` : ""}area ${fmtArea(c.area, lang)} – with flag, neighbours and rankings.`
    ),
  };
}

function Fact({ label, value, note, href }: { label: string; value: string; note?: string | null; href?: string }) {
  const inner = (
    <>
      <span className="block text-sm font-semibold text-muted">{label}</span>
      <span className="mt-0.5 block font-display text-2xl font-semibold leading-tight">{value}</span>
      {note && <span className="mt-1 block text-sm text-muted">{note}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:-translate-y-0.5">
      {inner}
    </Link>
  ) : (
    <div className="card p-4">{inner}</div>
  );
}

export async function LandPage({ lang, params }: { lang: Lang; params: Promise<{ land: string }> }) {
  const { land } = await params;
  const c = LAND_BY_SLUG[land];
  if (!c) notFound();
  const t = tr(lang);
  const name = cName(c, lang);
  const cap = cCap(c, lang);
  const de = LAND_BY_ID.DEU;
  const rk = (f: Parameters<typeof rankOf>[1], key: string) => {
    const r = rankOf(c, f);
    return r ? { note: t(`Platz ${r} von ${ranking(f).length}`, `Rank ${r} of ${ranking(f).length}`), href: `/laender/rangliste/${key}` } : {};
  };
  const vsDe = c.id === "DEU" ? null : c.area >= de.area ? t(`${(c.area / de.area).toLocaleString("de-DE", { maximumFractionDigits: 1 })}-mal so groß wie Deutschland`, `${(c.area / de.area).toLocaleString("en-GB", { maximumFractionDigits: 1 })} times the size of Germany`) : t(`${Math.max(1, Math.round((c.area / de.area) * 100))} % der Fläche Deutschlands`, `${Math.max(1, Math.round((c.area / de.area) * 100))} % of Germany’s area`);
  const neighbours = c.borders.map((b) => LAND_BY_ID[b]).filter(Boolean).sort((a, b) => cName(a, lang).localeCompare(cName(b, lang), lang));
  const similar = LAND.filter((x) => x.id !== c.id)
    .sort((a, b) => Math.abs(Math.log(a.area / c.area)) - Math.abs(Math.log(b.area / c.area)))
    .slice(0, 4);
  const note = NOTES[c.id];
  const ld = {
    "@context": "https://schema.org",
    "@type": "Country",
    name,
    ...(c.pop ? { population: c.pop } : {}),
    containedInPlace: { "@type": "Continent", name: contName(c.cont, lang) },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Hero
        flag={`/flags/${c.iso2}.svg`}
        kicker={<Crumbs lang={lang} items={[[contName(c.cont, lang), `/laender/kontinent/${CONT_KEY[c.cont]}`], [name]]} />}
        title={name}
        sub={`${subName(c.sub, lang)}${cap ? ` · ${t("Hauptstadt", "Capital")} ${cap}` : ""}`}
      />
      <div className="mx-auto -mt-14 max-w-4xl px-5 pb-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cap && <Fact label={t("Hauptstadt", "Capital")} value={cap} note={c.capPop ? t(`${fmtPeople(c.capPop, lang)} Einwohner`, `population ${fmtPeople(c.capPop, lang)}`) : null} />}
          {c.pop != null && <Fact label={t("Einwohner", "Population")} value={fmtPeople(c.pop, lang)} {...rk("pop", "einwohner")} />}
          <Fact label={t("Fläche", "Area")} value={fmtArea(c.area, lang)} note={[rk("area", "flaeche").note, vsDe].filter(Boolean).join(" · ")} href={`/laender/rangliste/flaeche`} />
          {c.gdppc != null && <Fact label={t("BIP pro Kopf", "GDP per capita")} value={fmtUsd(c.gdppc, lang)} {...rk("gdppc", "bip-pro-kopf")} />}
          {c.life != null && <Fact label={t("Lebenserwartung", "Life expectancy")} value={fmtYears(c.life, lang)} {...rk("life", "lebenserwartung")} />}
          {c.forest != null && <Fact label={t("Waldanteil", "Forest cover")} value={fmtPct(c.forest, lang)} {...rk("forest", "wald")} />}
          {c.urban != null && <Fact label={t("Leben in Städten", "Live in cities")} value={fmtPct(c.urban, lang)} {...rk("urban", "stadtbevoelkerung")} />}
          {c.pop != null && <Fact label={t("Einwohner pro km²", "People per km²")} value={fmtPeople(c.pop / c.area, lang)} />}
          <Fact label={t("Zugang zum Meer", "Access to the sea")} value={c.landlocked ? t("Nein, Binnenstaat", "No, landlocked") : t("Ja", "Yes")} />
        </div>

        {note && <p className="mt-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed">{t(note[0], note[1])}</p>}

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">{t("Nachbarländer", "Neighbouring countries")}</h2>
          {neighbours.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {neighbours.map((n) => (
                <CountryChip key={n.id} c={n} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-muted">{t(`${name} hat keine Landgrenze zu einem anderen Land.`, `${name} has no land border with another country.`)}</p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">{t("Ähnlich groß", "Similar in size")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {similar.map((n) => (
              <CountryChip key={n.id} c={n} lang={lang} />
            ))}
          </div>
        </section>

        <QuizLinks cont={c.cont} lang={lang} />
        <Source lang={lang} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- /laender/kontinent/[k]

export const kontinentParams = () => CONTINENTS.map((k) => ({ k: CONT_KEY[k] }));

export async function kontinentMeta(lang: Lang, params: Promise<{ k: string }>): Promise<Metadata> {
  const { k } = await params;
  const cont = CONT_BY_KEY[k];
  if (!cont) return {};
  const t = tr(lang);
  const n = LAND.filter((c) => c.cont === cont).length;
  const name = contName(cont, lang);
  return {
    title: t(`Alle ${n} Länder in ${name} – mit Hauptstädten und Flaggen`, `All ${n} countries in ${name} – with capitals and flags`),
    description: t(`Liste aller ${n} Länder in ${name} mit Flagge, Hauptstadt, Einwohnern und Fläche.`, `List of all ${n} countries in ${name} with flag, capital, population and area.`),
  };
}

export async function KontinentPage({ lang, params }: { lang: Lang; params: Promise<{ k: string }> }) {
  const { k } = await params;
  const cont = CONT_BY_KEY[k];
  if (!cont) notFound();
  const t = tr(lang);
  const xs = LAND.filter((c) => c.cont === cont).sort((a, b) => cName(a, lang).localeCompare(cName(b, lang), lang));
  const pop = xs.reduce((s, c) => s + (c.pop ?? 0), 0);
  const area = xs.reduce((s, c) => s + c.area, 0);
  const name = contName(cont, lang);
  return (
    <>
      <Hero
        kicker={<Crumbs lang={lang} items={[[name]]} />}
        title={t(`Länder in ${name}`, `Countries in ${name}`)}
        sub={t(`${xs.length} Länder · ${fmtPeople(pop, lang)} Einwohner · ${fmtArea(area, lang)}`, `${xs.length} countries · population ${fmtPeople(pop, lang)} · ${fmtArea(area, lang)}`)}
      />
      <div className="mx-auto -mt-14 max-w-4xl px-5 pb-16">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="px-4 py-3 font-semibold">{t("Land", "Country")}</th>
                <th className="px-4 py-3 font-semibold">{t("Hauptstadt", "Capital")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("Einwohner", "Population")}</th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">{t("Fläche", "Area")}</th>
              </tr>
            </thead>
            <tbody>
              {xs.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/laender/${c.slug}`} className="flex items-center gap-2.5 font-semibold hover:text-brand">
                      <Flag c={c} size={18} />
                      {cName(c, lang)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{cCap(c, lang) ?? "–"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.pop ? fmtPeople(c.pop, lang) : "–"}</td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums sm:table-cell">{fmtArea(c.area, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">{t("Andere Kontinente", "Other continents")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CONTINENTS.filter((x) => x !== cont).map((x) => (
              <Link key={x} href={`/laender/kontinent/${CONT_KEY[x]}`} className="chip">
                {contName(x, lang)}
              </Link>
            ))}
          </div>
        </section>
        <QuizLinks cont={cont} lang={lang} />
        <Source lang={lang} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- /laender/rangliste/[wert]

export const ranglisteParams = () => METRICS.map((m) => ({ wert: m.key }));

export async function ranglisteMeta(lang: Lang, params: Promise<{ wert: string }>): Promise<Metadata> {
  const { wert } = await params;
  const m = METRIC_BY_KEY[wert];
  if (!m) return {};
  const t = tr(lang);
  const top = ranking(m.field).slice(0, 3).map((c) => cName(c, lang)).join(", ");
  const [title] = lang === "en" ? m.en : m.de;
  return { title, description: t(`${title}: die komplette Rangliste aller Länder. Vorne: ${top}.`, `${title}: the complete ranking of every country. Top: ${top}.`) };
}

export async function RanglistePage({ lang, params }: { lang: Lang; params: Promise<{ wert: string }> }) {
  const { wert } = await params;
  const m = METRIC_BY_KEY[wert];
  if (!m) notFound();
  const t = tr(lang);
  const [title, label] = lang === "en" ? m.en : m.de;
  const xs = ranking(m.field);
  return (
    <>
      <Hero kicker={<Crumbs lang={lang} items={[[t("Ranglisten", "Rankings")], [label]]} />} title={title} sub={t(`Alle ${xs.length} Länder, sortiert nach ${label}.`, `All ${xs.length} countries, sorted by ${label.toLowerCase()}.`)} />
      <div className="mx-auto -mt-14 max-w-4xl px-5 pb-16">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="w-14 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">{t("Land", "Country")}</th>
                {m.field === "capPop" && <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t("Hauptstadt", "Capital")}</th>}
                <th className="px-4 py-3 text-right font-semibold">{label}</th>
              </tr>
            </thead>
            <tbody>
              {xs.map((c, i) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold tabular-nums text-muted">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/laender/${c.slug}`} className="flex items-center gap-2.5 font-semibold hover:text-brand">
                      <Flag c={c} size={18} />
                      {cName(c, lang)}
                    </Link>
                  </td>
                  {m.field === "capPop" && <td className="hidden px-4 py-2.5 sm:table-cell">{cCap(c, lang)}</td>}
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{m.fmt(c[m.field] as number, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">{t("Weitere Ranglisten", "More rankings")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {METRICS.filter((x) => x.key !== m.key).map((x) => (
              <Link key={x.key} href={`/laender/rangliste/${x.key}`} className="chip">
                {lang === "en" ? x.en[0] : x.de[0]}
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-10">
          <Link href="/taeglich/hoeher-tiefer" className="btn-primary">
            {t("Spiel: Höher oder tiefer", "Play: Higher or Lower")}
          </Link>
        </section>
        <Source lang={lang} />
      </div>
    </>
  );
}
