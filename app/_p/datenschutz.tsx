import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";
import type { Lang } from "@/lib/i18n";

export const meta = (lang: Lang): Metadata => ({ title: lang === "en" ? "Privacy policy" : "Datenschutzerklärung", robots: { index: false } });

export default function Datenschutz({ lang }: { lang: Lang }) {
  return lang === "en" ? <PrivacyEn /> : <DatenschutzDe />;
}

function DatenschutzDe() {
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
          Ihre Ergebnisse, Serien (Streaks) und Einstellungen speichern wir lokal in Ihrem Browser
          (Local Storage). Sie sind für die Funktion der Spiele erforderlich (§ 25 Abs. 2 Nr. 2
          TDDDG). Solange Sie nicht an der Bestenliste teilnehmen, verlassen diese Daten Ihr Gerät
          nicht. Sie können sie jederzeit löschen, indem Sie die Website-Daten in Ihrem Browser
          entfernen.
        </p>
      </div>
      <div>
        <h2>3a. Reichweitenmessung (Vercel Web Analytics)</h2>
        <p>
          Um zu sehen, wie viele Besucher die Seite hat und welche Spiele beliebt sind, nutzen wir
          Vercel Web Analytics. Dabei werden keine Cookies gesetzt und keine Daten im Browser
          gespeichert. Erfasst werden die aufgerufene Seite, die verweisende Website, Land,
          Gerätetyp, Betriebssystem und Browser. Besucher werden nur über einen anonymisierten
          Hash erkannt, der jeden Tag neu gebildet wird; eine Wiedererkennung über mehrere Tage
          oder Websites hinweg ist nicht möglich. Rechtsgrundlage ist unser berechtigtes Interesse
          an der Verbesserung des Angebots (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </div>
      <div>
        <h2>3b. Bestenliste</h2>
        <p>
          Die Teilnahme an der Bestenliste ist freiwillig. Erst wenn Sie einen Namen eintragen,
          übermitteln wir für jedes abgeschlossene Tagesrätsel den gewählten Namen, das Datum, das
          Spiel, Ihre Punktzahl sowie eine zufällig erzeugte Spieler-Kennung (sie wird in Ihrem
          Browser gespeichert und enthält keine persönlichen Angaben). Name und Punkte sind für
          alle Besucher öffentlich sichtbar; wählen Sie daher bitte einen Spitznamen statt Ihres
          vollständigen Namens. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a
          DSGVO), die Sie jederzeit widerrufen können, indem Sie uns kontaktieren; wir löschen
          dann Ihre Einträge.
        </p>
        <p>
          Die Daten werden beim Datenbankdienst Supabase (Supabase Inc.)
          auf Servern in Frankfurt am Main (EU) gespeichert. Mit Supabase besteht ein Vertrag zur
          Auftragsverarbeitung; für etwaige Zugriffe aus Drittländern gelten die
          Standardvertragsklauseln der EU-Kommission. Beim Abruf werden technisch notwendig Ihre
          IP-Adresse und Browserdaten an Supabase übertragen.
        </p>
      </div>
      <div>
        <h2>3c. Mit Freunden spielen (Multiplayer)</h2>
        <p>
          Wenn Sie einen Server erstellen oder einem beitreten, werden der von Ihnen gewählte Name, eine
          zufällige Kennung für diesen Browser-Tab und Ihre Antworten in Echtzeit an die anderen Spieler im
          selben Server übertragen. Die Übertragung läuft über den Echtzeit-Dienst von Supabase (siehe 3b);
          die Spieldaten werden dabei nicht in einer Datenbank gespeichert und sind nach dem Schließen des
          Servers weg. Öffentliche Server erscheinen mit ihrem Namen (z. B. „Server von Sam“) in der Liste
          „Offene Server“. Rechtsgrundlage ist die Bereitstellung der von Ihnen gewünschten Funktion
          (Art. 6 Abs. 1 lit. b DSGVO).
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
          Diese Website verwendet keine Cookies und keine Werbe- oder Tracking-Tools. Die
          cookiefreie Reichweitenmessung ist unter Punkt 3a beschrieben.
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

function PrivacyEn() {
  return (
    <LegalPage title="Privacy policy">
      <p className="rounded-2xl bg-surface px-4 py-3 text-ink">This is a translation for your convenience. Only the German version is legally binding.</p>
      <div>
        <h2>1. Controller</h2>
        <p>
          The controller responsible for data processing on this website is:
          <br />
          <strong>{site.owner}</strong>, {site.company}, {site.street}, {site.city}
          <br />
          Email: <a href={`mailto:${site.email}`}>{site.email}</a> · Phone: <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
        </p>
      </div>
      <div>
        <h2>2. Hosting</h2>
        <p>
          This website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you visit the website, Vercel
          processes technically necessary data such as your IP address, the date and time of access, the page requested and browser
          information (server log files). This is based on our legitimate interest in providing the website securely and reliably (Art. 6(1)(f)
          GDPR). Vercel is certified under the EU-US Data Privacy Framework; EU Commission standard contractual clauses also apply.
        </p>
      </div>
      <div>
        <h2>3. Game progress in your browser</h2>
        <p>
          Your results, streaks and settings are stored locally in your browser (local storage). They are required for the games to work
          (Section 25(2) No. 2 TDDDG). Unless you join the leaderboard, this data never leaves your device. You can delete it at any time by
          clearing this website&apos;s data in your browser.
        </p>
      </div>
      <div>
        <h2>3a. Audience measurement (Vercel Web Analytics)</h2>
        <p>
          To see how many people visit and which games are popular, we use Vercel Web Analytics. It sets no cookies and stores nothing in
          your browser. It records the page visited, the referring website, country, device type, operating system and browser. Visitors are
          only recognised by an anonymised hash that is recreated every day, so recognition across days or websites is not possible. The legal
          basis is our legitimate interest in improving the service (Art. 6(1)(f) GDPR).
        </p>
      </div>
      <div>
        <h2>3b. Leaderboard</h2>
        <p>
          Joining the leaderboard is voluntary. Only once you enter a name do we send, for each finished daily puzzle, the name you chose, the
          date, the game, your score and a randomly generated player ID (stored in your browser, containing no personal details). Names and
          scores are visible to all visitors, so please choose a nickname rather than your full name. The legal basis is your consent (Art. 6(1)(a)
          GDPR), which you can withdraw at any time by contacting us; we will then delete your entries.
        </p>
        <p>
          The data is stored with the database service Supabase (Supabase Inc.) on servers in Frankfurt am Main (EU). A data processing
          agreement is in place with Supabase; any access from third countries is covered by the EU Commission&apos;s standard contractual
          clauses. When loading the data, your IP address and browser data are necessarily transmitted to Supabase.
        </p>
      </div>
      <div>
        <h2>3c. Playing with friends (multiplayer)</h2>
        <p>
          When you create or join a server, the name you choose, a random ID for this browser tab and your answers are sent in real time to the
          other players on the same server. This runs through Supabase&apos;s real-time service (see 3b); the game data is not stored in a
          database and is gone once the server closes. Public servers appear with their name (e.g. “Sam&apos;s server”) in the list of open
          servers. The legal basis is providing the feature you requested (Art. 6(1)(b) GDPR).
        </p>
      </div>
      <div>
        <h2>4. Contact by email or phone</h2>
        <p>
          If you contact us by email or phone, we process your details to handle your request (Art. 6(1)(b) or (f) GDPR). Your data is deleted once
          the request has been dealt with and no statutory retention periods apply.
        </p>
      </div>
      <div>
        <h2>5. Fonts</h2>
        <p>The fonts used on this website are served locally from our server. No connection to Google servers is made.</p>
      </div>
      <div>
        <h2>6. Cookies</h2>
        <p>This website uses no cookies and no advertising or tracking tools. The cookie-free audience measurement is described in section 3a.</p>
      </div>
      <div>
        <h2>7. Your rights</h2>
        <p>
          You have the right of access (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18
          GDPR), data portability (Art. 20 GDPR) and to object to processing (Art. 21 GDPR). You can withdraw consent at any time with effect for
          the future. You also have the right to lodge a complaint with a data protection supervisory authority, e.g. the State Commissioner for
          Data Protection and Freedom of Information of North Rhine-Westphalia.
        </p>
      </div>
      <div>
        <h2>8. SSL/TLS encryption</h2>
        <p>For security reasons this site uses SSL/TLS encryption. You can recognise an encrypted connection by “https://” in your browser&apos;s address bar.</p>
      </div>
    </LegalPage>
  );
}
