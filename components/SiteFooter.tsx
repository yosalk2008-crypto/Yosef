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
            Websites, KI-Chatbots, KI-Telefonassistenten und Online-Terminbuchung – digitale
            Lösungen für Unternehmen aus einer Hand.
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
            <li><Link href="/#leistungen" className="hover:text-white">Leistungen</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">Kontakt & Anfrage</Link></li>
            <li><Link href="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-5 py-6 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} Firmengrafik · {site.owner}</span>
          <span>Digitale Lösungen · Kaarst & bundesweit</span>
        </div>
      </div>
    </footer>
  );
}
