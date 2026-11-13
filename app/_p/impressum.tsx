import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => ({ title: lang === "en" ? "Legal notice" : "Impressum", robots: { index: false } });

export default function Impressum({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <LegalPage title={t("Impressum", "Legal notice")}>
      <div>
        <h2>{t("Angaben gemäß § 5 DDG", "Information pursuant to Section 5 DDG")}</h2>
        <p>
          <strong>{site.owner}</strong>
          <br />
          {site.company}
          <br />
          {site.street}
          <br />
          {site.city}
        </p>
      </div>
      <div>
        <h2>{t("Kontakt", "Contact")}</h2>
        <p>
          {t("Telefon", "Phone")}: <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
          <br />
          {t("E-Mail", "Email")}: <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
      <div>
        <h2>{t("Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", "Responsible for content under Section 18(2) MStV")}</h2>
        <p>
          {site.owner}
          <br />
          {site.street}, {site.city}
        </p>
      </div>
      <div>
        <h2>{t("Verbraucherstreitbeilegung", "Consumer dispute resolution")}</h2>
        <p>
          {t(
            "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
            "We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board."
          )}
        </p>
      </div>
    </LegalPage>
  );
}
