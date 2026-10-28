import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <div>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          <strong>{site.owner}</strong>
          <br />
          Firmengrafik
          <br />
          {site.street}
          <br />
          {site.city}
        </p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
          <br />
          E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
      <div>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {site.owner}
          <br />
          {site.street}, {site.city}
        </p>
      </div>
      <div>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>
    </LegalPage>
  );
}
