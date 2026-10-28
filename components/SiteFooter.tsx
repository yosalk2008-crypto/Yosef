import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Professionelle Websites im Abo – mit Domain, Hosting, SSL und schnellem Service für
            Änderungen und Updates.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Kontakt</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-white">
                {site.email}
              </a>
            </li>
            <li>
              <a href={`tel:${site.phoneHref}`} className="hover:text-white">
                {site.phone}
              </a>
            </li>
            <li>
              {site.street}, {site.city}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Seiten</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/#pakete" className="hover:text-white">Pakete</Link></li>
            <li><Link href="/musterwebsite" className="hover:text-white">Musterwebsite</Link></li>
            <li><Link href="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-5 py-6 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} Firmengrafik · {site.owner}</span>
          <span>Websites im Abo · Kaarst & bundesweit</span>
        </div>
      </div>
    </footer>
  );
}
