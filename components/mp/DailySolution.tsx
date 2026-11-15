"use client";

import Link from "@/components/Link";
import { BY_ID, BY_ID_ALL, cCap, cName, contName, flagUrl } from "@/lib/data/countries";
import { metricsOf } from "@/lib/metrics";
import { useLang, useT } from "@/lib/i18n";
import { LAND } from "@/lib/laender";
import type { DailyId } from "@/lib/mp";
import { pickTarget } from "@/components/games/Laenderjagd";
import { shortestRoute } from "@/components/games/Grenzgang";
import { dailyRound, optimum, rank } from "@/lib/spitzenplatz";
import { factText, makePuzzle } from "@/components/games/Viererbande";
import { rounds } from "@/components/games/Farbecht";
import { ITEM_BY_ID, KIND_LABEL, dailyPairs, itemName } from "@/lib/massstab";

const SLUG = Object.fromEntries(LAND.map((c) => [c.id, c.slug])) as Record<string, string>;
const C = (id: string) => BY_ID[id] ?? BY_ID_ALL[id];

function Flag({ id, h = 16 }: { id: string; h?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={flagUrl(C(id).iso2)} alt="" className="shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0_/_0.1)]" style={{ height: h, width: "auto" }} />;
}
function Pill({ id }: { id: string }) {
  const lang = useLang();
  const inner = (
    <>
      <Flag id={id} h={14} />
      {cName(C(id), lang)}
    </>
  );
  return SLUG[id] ? (
    <Link href={`/laender/${SLUG[id]}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold hover:underline">
      {inner}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold">{inner}</span>
  );
}
function Row({ id, children }: { id: string; children: React.ReactNode }) {
  const lang = useLang();
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
      <Flag id={id} h={26} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{cName(C(id), lang)}</p>
        <p className="text-[15px] text-muted">{children}</p>
      </div>
    </li>
  );
}

/** The answer of a daily puzzle, shown to everyone in the room after the round. */
export function DailySolution({ game, day }: { game: DailyId; day: string }) {
  const lang = useLang();
  const t = useT();
  const nf = (v: number) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE").format(Math.round(v));
  let body: React.ReactNode = null;
  try {
    if (game === "laenderjagd") {
      const c = pickTarget(day);
      body = (
        <div className="flex items-center gap-4">
          <Flag id={c.id} h={56} />
          <div>
            <p className="font-display text-3xl font-semibold leading-tight">{cName(c, lang)}</p>
            <p className="text-[15px] text-muted">
              {contName(c.cont, lang)} · {t("Hauptstadt", "capital")} {cCap(c, lang)}
            </p>
            {SLUG[c.id] && (
              <Link href={`/laender/${SLUG[c.id]}`} className="text-sm font-semibold text-brand hover:underline">
                {t("Steckbrief ansehen", "View fact sheet")} →
              </Link>
            )}
          </div>
        </div>
      );
    } else if (game === "grenzgang") {
      const r = shortestRoute(day);
      body = (
        <>
          <p className="text-[15px] text-muted">{t(`Ein kürzester Weg (${r.path.length} ${r.path.length === 1 ? "Land" : "Länder"} dazwischen):`, `A shortest route (${r.path.length} ${r.path.length === 1 ? "country" : "countries"} in between):`)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            {[r.a, ...r.path, r.b].map((id, k) => (
              <span key={id} className="inline-flex items-center gap-1.5">
                {k > 0 && <span className="text-muted">→</span>}
                <Pill id={id} />
              </span>
            ))}
          </p>
        </>
      );
    } else if (game === "spitzenplatz") {
      const round = dailyRound(day, "welt");
      const ids = round.ids;
      const opt = optimum(round);
      const M = metricsOf(lang);
      body = (
        <>
          <p className="text-[15px] text-muted">{t(`Beste Verteilung: ${opt.total} Punkte (weniger ist besser).`, `Best assignment: ${opt.total} points (fewer is better).`)}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {ids.map((id, j) => (
              <Row key={id} id={id}>
                {M[opt.plan[j]].label} · {t("Platz", "rank")} {rank(opt.plan[j], id, "welt")}
              </Row>
            ))}
          </ul>
        </>
      );
    } else if (game === "viererbande") {
      const p = makePuzzle(day);
      body = (
        <ul className="grid gap-2 sm:grid-cols-2">
          {p.groups.map((g) => {
            const c = C(g.country);
            const f = factText(c, g.fact, lang);
            return (
              <Row key={g.country} id={g.country}>
                {t("Hauptstadt", "Capital")} {cCap(c, lang)} · {f.label}: {f.value}
              </Row>
            );
          })}
        </ul>
      );
    } else if (game === "farbecht") {
      body = (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rounds(day).map((r) => (
            <Row key={r.id} id={r.id}>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-8 rounded border-2 border-ink/60" style={{ background: r.color }} aria-hidden="true" />
                <span className="font-mono text-sm uppercase">{r.color}</span>
              </span>
            </Row>
          ))}
        </ul>
      );
    } else if (game === "massstab") {
      body = (
        <ul className="grid gap-2 sm:grid-cols-2">
          {dailyPairs(day).map(({ target, ref }) => {
            const a = ITEM_BY_ID[target];
            const b = ITEM_BY_ID[ref];
            const text = `${nf(a.area)} km² · ${t("Vergleich", "compared with")} ${itemName(b, lang)}: ${nf(b.area)} km²`;
            return a.kind === "land" ? (
              <Row key={target} id={target}>
                {text}
              </Row>
            ) : (
              <li key={target} className="rounded-2xl bg-paper px-3 py-2.5">
                <p className="font-semibold leading-tight">
                  {itemName(a, lang)} <span className="text-sm text-muted">· {KIND_LABEL[a.kind][lang === "en" ? 1 : 0]}</span>
                </p>
                <p className="text-[15px] text-muted">{text}</p>
              </li>
            );
          })}
        </ul>
      );
    }
  } catch {
    body = null;
  }
  if (!body) return null;
  return (
    <section className="mt-4 rounded-3xl border-[3px] border-ok/40 bg-[#eef8ec] p-4 sm:p-5" aria-labelledby="mp-loesung">
      <h3 id="mp-loesung" className="font-display text-xl font-semibold">
        {t("Die Lösung", "The answer")}
      </h3>
      <div className="mt-2">{body}</div>
    </section>
  );
}
