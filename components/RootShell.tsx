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
 * Domain move firmengrafik.de → koshertrivia.de. Local Storage is tied to the domain, so on the old
 * domain we pack every "geografik:" entry (results, streaks, leaderboard name/ID) into the URL hash
 * and the new domain unpacks it once, without overwriting anything that already exists there.
 */
const MOVE_SCRIPT = `(function(){try{var h=location.hostname,P="geografik:";
if(/(^|\\.)firmengrafik\\.de$/.test(h)){var d={},n=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0){d[k]=localStorage.getItem(k);n++}}}catch(e){}
var u="https://koshertrivia.de"+location.pathname+location.search;if(n)u+="#gfm="+encodeURIComponent(JSON.stringify(d));else if(location.hash)u+=location.hash;location.replace(u);return}
if(location.hash.indexOf("#gfm=")===0){var m=JSON.parse(decodeURIComponent(location.hash.slice(5)));for(var k2 in m){if(k2.indexOf(P)===0&&localStorage.getItem(k2)===null)localStorage.setItem(k2,m[k2])}
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
