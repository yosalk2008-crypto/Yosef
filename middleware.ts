import { NextResponse, type NextRequest } from "next/server";

/**
 * Other domains (geoduels.de, firmengrafik.de) forward to koshertrivia.de.
 * Search engines and other bots get a permanent server redirect (301) so the index moves over.
 * People get the page for a moment: the move script in RootShell packs their saved results and streaks
 * (Local Storage is tied to the domain) into the URL and forwards them, koshertrivia.de unpacks it.
 */
const OLD = /(^|\.)(geoduels|firmengrafik)\.de$/i;
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|embedly|preview|lighthouse|curl|wget|python|headless/i;

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (!OLD.test(host)) return NextResponse.next();
  const ua = req.headers.get("user-agent") ?? "";
  if (!BOT.test(ua)) return NextResponse.next();
  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, "https://koshertrivia.de");
  return NextResponse.redirect(url, 301);
}

export const config = {
  // pages only – not the build files, images or data scripts
  matcher: ["/((?!_next/|api/|.*\\.(?:js|css|json|png|jpg|jpeg|svg|webp|ico|txt|xml|woff2?)$).*)"],
};
