import type { Metadata } from "next";
import Link from "@/components/Link";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Andere Spiele – Auto-Fußball und Kart-Rennen online", "Other games – car soccer and kart racing online"),
    description: t("Turboball (Auto-Fußball) und Turbokart (Kart-Rennen mit Items): 3D-Spiele im Browser, gegen Bots oder online mit Freunden.", "Turboball (car soccer) and Turbokart (kart racing with items): 3D games in your browser, against bots or online with friends."),
  };
};

const GAMES = [
  {
    href: "/turbokart",
    title: "Turbokart",
    de: "Kart-Rennen mit Driften, Mini-Turbo, Item-Boxen, Raketen und Bananen. 3 Strecken, 8 Fahrer, online mit Freunden.",
    en: "Kart racing with drifting, mini-turbos, item boxes, rockets and bananas. 3 tracks, 8 racers, online with friends.",
    tagDe: "Kart-Rennen", tagEn: "Kart racing",
    bg: "linear-gradient(135deg, #ff3d7f 0%, #ff8a00 45%, #ffd23f 100%)", edge: "#8a1f3f",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
        <path d="M0 78h160v22H0z" fill="#2b2f3a" /><path d="M0 86h20M34 86h20M68 86h20M102 86h20M136 86h20" stroke="#fff" strokeWidth="3" strokeDasharray="0" />
        <path d="M40 70l10-16h46l16 10h14c4 0 6 3 6 6v4H40z" fill="#1f6fff" stroke="#0a1230" strokeWidth="3" />
        <circle cx="74" cy="44" r="13" fill="#ffd23f" stroke="#0a1230" strokeWidth="3" /><path d="M66 42h18v6H66z" fill="#0a1230" />
        <circle cx="56" cy="76" r="10" fill="#16171a" stroke="#0a1230" strokeWidth="2" /><circle cx="112" cy="76" r="10" fill="#16171a" stroke="#0a1230" strokeWidth="2" />
        <path d="M38 66L8 60M36 72L14 74" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <rect x="124" y="20" width="22" height="22" rx="4" fill="#fff" opacity=".85" transform="rotate(15 135 31)" /><text x="135" y="37" textAnchor="middle" fontSize="16" fontWeight="900" fill="#ff3d7f" transform="rotate(15 135 31)">!</text>
      </svg>
    ),
  },
  {
    href: "/turboball",
    title: "Turboball",
    de: "Auto-Fußball mit Boost, Flips und Wandfahren. 1v1 bis 3v3 gegen Bots oder online mit Freunden.",
    en: "Car soccer with boost, flips and wall driving. 1v1 to 3v3 against bots or online with friends.",
    tagDe: "Auto-Fußball", tagEn: "Car soccer",
    bg: "linear-gradient(135deg, #1f6fff 0%, #12204a 60%, #ff6a10 130%)", edge: "#0a1230",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
        <circle cx="112" cy="40" r="26" fill="#e8edf5" stroke="#0a1230" strokeWidth="3" />
        <path d="M98 22l14 7 14-7M93 48l12-5 7 12M131 48l-12-5-7 12M112 29v14" fill="none" stroke="#2a2f3a" strokeWidth="3" />
        <path d="M30 86v-9l10-9h30l14 9h10c4 0 5 3 5 5v4z" fill="#1f6fff" stroke="#0a1230" strokeWidth="3" />
        <path d="M44 70h14v7H38zM62 70h10l9 7H62z" fill="#9ff3ff" />
        <path d="M30 78l-22-5 5 7-7 5 24 0" fill="#ffb020" />
        <circle cx="44" cy="87" r="7" fill="#16171a" /><circle cx="84" cy="87" r="7" fill="#16171a" />
      </svg>
    ),
  },
];

export default function Page({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("Andere Spiele", "Other games")}</h1>
      <p className="mt-2 text-muted">{t("3D-Spiele zum Länger-Spielen – gegen Bots oder online mit Freunden.", "3D games for longer sessions – against bots or online with friends.")}</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="chunk group flex flex-col overflow-hidden text-white" style={{ background: g.bg, ["--edge" as string]: g.edge }}>
            <div className="relative h-44 px-6 pt-5 transition-transform group-hover:scale-[1.03]">{g.art}</div>
            <div className="flex flex-1 flex-col gap-2 bg-black/25 px-5 pb-5 pt-4">
              <span className="w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">{t(g.tagDe, g.tagEn)}</span>
              <span className="font-display text-3xl font-semibold leading-none">{g.title}</span>
              <span className="text-sm font-bold leading-snug text-white/85">{t(g.de, g.en)}</span>
              <span className="mt-auto w-fit rounded-md bg-white px-4 py-2 font-display text-lg font-semibold text-ink">{t("Spielen", "Play")} →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
