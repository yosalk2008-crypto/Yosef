import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Datenschutzerklärung", robots: { index: false } };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <div>
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          <br />
          <strong>{site.owner}</strong>, {site.company}, {site.street}, {site.city}
          <br />
          E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a> · Telefon:{" "}
          <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
        </p>
      </div>
      <div>
        <h2>2. Hosting</h2>
        <p>
          Diese Website wird bei der Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
          gehostet. Beim Aufruf der Website verarbeitet Vercel technisch notwendige Daten wie
          IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Seite und Browser-Informationen
          (Server-Logfiles). Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses
          an einer sicheren und stabilen Bereitstellung der Website (Art. 6 Abs. 1 lit. f DSGVO).
          Vercel ist unter dem EU-US Data Privacy Framework zertifiziert; zusätzlich bestehen
          Standardvertragsklauseln der EU-Kommission.
        </p>
      </div>
      <div>
        <h2>3. Spielstände im Browser</h2>
        <p>
          Ihre Ergebnisse, Serien (Streaks) und Einstellungen speichern wir ausschließlich lokal in
          Ihrem Browser (Local Storage). Diese Daten werden nicht an uns übertragen und verlassen
          Ihr Gerät nicht. Sie sind für die Funktion der Spiele erforderlich (§ 25 Abs. 2 Nr. 2
          TDDDG). Sie können sie jederzeit löschen, indem Sie die Website-Daten in Ihrem Browser
          entfernen.
        </p>
      </div>
      <div>
        <h2>4. Kontakt per E-Mail oder Telefon</h2>
        <p>
          Wenn Sie uns per E-Mail oder telefonisch kontaktieren, verarbeiten wir Ihre Angaben zur
          Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Ihre Daten werden
          gelöscht, sobald die Anfrage abschließend bearbeitet ist und keine gesetzlichen
          Aufbewahrungspflichten entgegenstehen.
        </p>
      </div>
      <div>
        <h2>5. Schriftarten</h2>
        <p>
          Die auf dieser Website verwendete Schriftart wird lokal von unserem Server ausgeliefert.
          Es findet keine Verbindung zu Servern von Google statt.
        </p>
      </div>
      <div>
        <h2>6. Cookies</h2>
        <p>
          Diese Website verwendet keine Cookies und setzt keine Analyse-, Werbe- oder
          Tracking-Tools ein.
        </p>
      </div>
      <div>
        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung
          (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit
          (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO). Eine erteilte
          Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Außerdem haben
          Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, z. B. bei der
          Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.
        </p>
      </div>
      <div>
        <h2>8. SSL-/TLS-Verschlüsselung</h2>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine
          verschlüsselte Verbindung erkennen Sie an „https://“ in der Adresszeile Ihres Browsers.
        </p>
      </div>
    </LegalPage>
  );
}
