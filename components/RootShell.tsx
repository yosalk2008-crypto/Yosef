import { Fredoka, Nunito } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EasterEggs } from "@/components/EasterEggs";
import { LangProvider } from "@/components/LangProvider";
import { Analytics } from "@vercel/analytics/next";
import type { Lang } from "@/lib/i18n";
import "@/app/globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap", weight: ["500", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

/**
 * Domain moves: firmengrafik.de → koshertrivia.de, and geoduels.de (used 20.–21.11.2026) back to koshertrivia.de. Local Storage is tied to the domain, so
 * on an old domain we pack every "geografik:" and "kt-" entry (results, streaks, options, leaderboard
 * name/ID) into the URL hash and koshertrivia.de unpacks it once, without overwriting anything already there (daily results of both domains are merged day by day).
 */
const MOVE_SCRIPT = `(function(){try{var h=location.hostname,ok=function(k){return k.indexOf("geografik:")===0||k.indexOf("kt-")===0};
if(/(^|\\.)(firmengrafik|geoduels)\\.de$/.test(h)){var d={},n=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&ok(k)){d[k]=localStorage.getItem(k);n++}}}catch(e){}
var u="https://koshertrivia.de"+location.pathname+location.search;if(n)u+="#gfm="+encodeURIComponent(JSON.stringify(d));else if(location.hash)u+=location.hash;location.replace(u);return}
if(location.hash.indexOf("#gfm=")===0){var m=JSON.parse(decodeURIComponent(location.hash.slice(5)));for(var k2 in m){if(!ok(k2))continue;var cur=localStorage.getItem(k2);if(cur===null){localStorage.setItem(k2,m[k2])}else if(k2==="geografik:v1"){try{var a=JSON.parse(cur),b=JSON.parse(m[k2]);a.daily=a.daily||{};for(var dd in (b.daily||{})){a.daily[dd]=a.daily[dd]||{};for(var gg in b.daily[dd]){if(!a.daily[dd][gg])a.daily[dd][gg]=b.daily[dd][gg]}}localStorage.setItem(k2,JSON.stringify(a))}catch(e){}}}
history.replaceState(null,"",location.pathname+location.search)}}catch(e){}})();`;

export function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${fredoka.variable} ${nunito.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOVE_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <LangProvider lang={lang}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <EasterEggs />
        </LangProvider>
        <Analytics />
      </body>
    </html>
  );
}
