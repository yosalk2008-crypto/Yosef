import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { Raten } from "@/components/fragen/Raten";
import "@/app/(de)/koscher/kosher.css";
import "@/app/(de)/halal/halal.css";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { site } from "@/lib/site";
import { CATS, LEVEL, allQA, answerLabel, askLine, catName, qaBySlug, qaText, type QA, type QGame } from "@/lib/qa";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SYM: Record<string, string> = { ja: "✓", nein: "✕", kommt: "≈", halal: "✓", haram: "✕", makruh: "–" };
const NAME = { koscher: ["Ist das koscher?", "Is it kosher?"], halal: ["Ist das halal?", "Is it halal?"] } as const;
const FOOT = {
  koscher: [
    "Vereinfachte Darstellung nach traditioneller Halacha. Bei echten religiösen Fragen hilft ein Rabbiner weiter.",
    "A simplified overview based on traditional halacha. For real religious questions, ask a rabbi.",
  ],
  halal: [
    "Vereinfachte Darstellung aus sunnitischer Sicht. Wo die Gelehrten unterschiedlicher Meinung sind, lautet die Antwort „kommt drauf an“. Bei persönlichen Fragen hilft ein Imam oder Gelehrter deines Vertrauens weiter.",
    "A simplified overview from a Sunni perspective. Where scholars disagree, the answer is “it depends”. For personal questions, ask an imam or scholar you trust.",
  ],
} as const;

export const frageParams = (game: QGame) => () => allQA(game).map((x) => ({ slug: x.slug }));

/** Title line: "Shrimps essen – ist das koscher?" */
function title(game: QGame, x: QA, lang: Lang) {
  const { q } = qaText(game, x, lang);
  const ask = askLine(game, x.cat, lang);
  return `${q} – ${lang === "en" ? ask : ask.charAt(0).toLowerCase() + ask.slice(1)}`;
}

export async function frageMeta(game: QGame, lang: Lang, params: Promise<{ slug: string }>): Promise<Metadata> {
  const { slug } = await params;
  const x = qaBySlug(game, slug);
  if (!x) return {};
  const { e } = qaText(game, x, lang);
  const label = answerLabel(game, x.a, x.cat, lang);
  return { title: title(game, x, lang), description: `${label}. ${e}`.slice(0, 300) };
}

function Shell({ game, lang, children }: { game: QGame; lang: Lang; children: React.ReactNode }) {
  const t = tr(lang);
  return (
    <div className={inter.variable}>
      <div className={`kosher${game === "halal" ? " halal" : ""}`}>
        {children}
        <p className="kfoot">{t(FOOT[game][0], FOOT[game][1])}</p>
      </div>
    </div>
  );
}

function Band({ game, lang, children }: { game: QGame; lang: Lang; children: React.ReactNode }) {
  const t = tr(lang);
  return (
    <section className="band short">
      <div className="glow" aria-hidden="true" />
      <div className="wrap">
        <nav className="knav" aria-label={t(NAME[game][0], NAME[game][1])}>
          <Link href={`/${game}`} className="kbrand">
            <span className="seal" aria-hidden="true">
              ?
            </span>
            {t(NAME[game][0], NAME[game][1])}
          </Link>
        </nav>
        {children}
      </div>
    </section>
  );
}

export async function FragePage({ game, lang, params }: { game: QGame; lang: Lang; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const x = qaBySlug(game, slug);
  if (!x) notFound();
  const t = tr(lang);
  const all = allQA(game);
  const txt = qaText(game, x, lang);
  const label = answerLabel(game, x.a, x.cat, lang);
  const same = all.filter((y) => y.cat === x.cat && y.slug !== x.slug);
  // eight neighbours in the same category, starting after this question (wraps around)
  const k = same.findIndex((y) => y.i > x.i);
  const more = [...same.slice(k < 0 ? 0 : k), ...same.slice(0, k < 0 ? 0 : k)].slice(0, 8);
  const prev = all[(x.i - 1 + all.length) % all.length];
  const next = all[(x.i + 1) % all.length];
  const base = lang === "en" ? "/en" : "";
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${txt.q} – ${askLine(game, x.cat, lang)}`,
        acceptedAnswer: { "@type": "Answer", text: `${label}. ${txt.e}${txt.src ? ` (${t("Quelle", "Source")}: ${txt.src})` : ""}` },
      },
    ],
    url: `${site.url}${base}/${game}/frage/${x.slug}`,
  };
  return (
    <Shell game={game} lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Band game={game} lang={lang}>
        <div className="quiz">
          <p className="dnote" style={{ marginTop: 0 }}>
            {catName(x.cat, lang)} · {askLine(game, x.cat, lang)}
          </p>
          <h1 style={{ marginTop: 10 }}>{txt.q}</h1>
        </div>
      </Band>
      <div className="wrap lift">
        <section className="quiz">
          <article className="qcard">
            <span className="kicker">{t("Was meinst du?", "What do you think?")}</span>
            <span className={`worth w${x.lv ?? 2}`}>{LEVEL(x.lv, lang)}</span>
            <Raten
              options={(game === "halal" ? ["halal", "haram", "makruh", "kommt"] : ["ja", "nein", "kommt"]).map((a) => [a, SYM[a], answerLabel(game, a, x.cat, lang)] as [string, string, string])}
              correct={x.a}
              labels={{ right: t("Richtig!", "Correct!"), wrong: t("Daneben.", "Not quite."), show: t("Lösung zeigen", "Show the answer") }}
            >
              <div className="verdict">
                <span className={`stamp ${x.a}`}>{label}</span>
                <p>{txt.e}</p>
                {txt.src && (
                  <p className="src">
                    {t("Quelle", "Source")}: {txt.src}
                  </p>
                )}
              </div>
            </Raten>
            <div className="next" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a className="btn" href={`${base}/${game}#/quiz`}>
                {t("Tagesquiz spielen", "Play the daily quiz")}
              </a>
              <Link className="btn ghost" href={`/${game}/fragen`}>
                {t("Alle Fragen", "All questions")}
              </Link>
            </div>
          </article>

          <h2 style={{ fontSize: 22, margin: "34px 0 12px" }}>
            {t("Mehr zum Thema", "More on")} {catName(x.cat, lang)}
          </h2>
          <div className="review">
            {more.map((y) => (
              <div key={y.slug}>
                <b aria-hidden="true">?</b>
                <Link href={`/${game}/frage/${y.slug}`}>{qaText(game, y, lang).q}</Link>
              </div>
            ))}
          </div>
          <nav className="qnav" aria-label={t("Weitere Fragen", "More questions")}>
            <Link href={`/${game}/frage/${prev.slug}`}>← {qaText(game, prev, lang).q}</Link>
            <Link href={`/${game}/frage/${next.slug}`}>{qaText(game, next, lang).q} →</Link>
          </nav>
        </section>
      </div>
    </Shell>
  );
}

export function fragenMeta(game: QGame, lang: Lang): Metadata {
  const t = tr(lang);
  const n = allQA(game).length;
  return {
    title: t(`${NAME[game][0]} Alle ${n} Fragen`, `${NAME[game][1]} All ${n} questions`),
    description: t(
      `Alle ${n} Fragen aus „${NAME[game][0]}“ nach Thema – jede mit Antwort, Erklärung und Quelle.`,
      `All ${n} questions from “${NAME[game][1]}” by topic – each with answer, explanation and source.`
    ),
  };
}

export function FragenPage({ game, lang }: { game: QGame; lang: Lang }) {
  const t = tr(lang);
  const all = allQA(game);
  return (
    <Shell game={game} lang={lang}>
      <Band game={game} lang={lang}>
        <div className="quiz">
          <h1>{t(`Alle ${all.length} Fragen`, `All ${all.length} questions`)}</h1>
          <p className="dnote">{t("Tippe eine Frage an, um Antwort, Erklärung und Quelle zu sehen.", "Tap a question to see the answer, explanation and source.")}</p>
        </div>
      </Band>
      <div className="wrap lift">
        <section className="quiz qlist">
          <div className="qcard" style={{ paddingTop: 22 }}>
            <nav className="cats qjump" aria-label={t("Themen", "Topics")}>
              {CATS[game].map((c) => (
                <a key={c} className="chip" href={`#${c.replace(/\W+/g, "-")}`}>
                  {catName(c, lang)}
                </a>
              ))}
            </nav>
            {CATS[game].map((c) => {
              const xs = all.filter((x) => x.cat === c);
              return (
                <div key={c} id={c.replace(/\W+/g, "-")} className="qgroup">
                  <h2>
                    {catName(c, lang)} <small>{xs.length}</small>
                  </h2>
                  <ul>
                    {xs.map((x) => (
                      <li key={x.slug}>
                        <Link href={`/${game}/frage/${x.slug}`}>{qaText(game, x, lang).q}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div className="next">
              <a className="btn" href={`${lang === "en" ? "/en" : ""}/${game}#/quiz`}>
                {t("Tagesquiz spielen", "Play the daily quiz")}
              </a>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
