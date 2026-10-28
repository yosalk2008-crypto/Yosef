export const site = {
  name: "Firmengrafik",
  url: "https://firmengrafik.de",
  email: "firmengrafik@gmail.com",
  phone: "0176 57998306",
  phoneHref: "+4917657998306",
  owner: "Yosef Al Khatib",
  street: "Flottheide 23",
  city: "41564 Kaarst",
};

export type Leistung = {
  id: string;
  title: string;
  kurz: string;
  text: string;
  punkte: string[];
  icon: string;
};

export const leistungen: Leistung[] = [
  {
    id: "website",
    title: "Websites im Abo",
    kurz: "Website",
    text: "Moderne, professionelle Website inklusive Domain, Hosting, SSL und schnellem Änderungsservice – zu einem festen Monatsbetrag.",
    punkte: ["Individuelles Design", "Domain, Hosting & SSL inklusive", "Änderungen in 1–2 Werktagen"],
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 4h16M8 4v5",
  },
  {
    id: "chatbot",
    title: "KI-Chatbot",
    kurz: "KI-Chatbot",
    text: "Ein Chat-Assistent auf Ihrer Website, der Kundenfragen rund um die Uhr beantwortet, Anfragen aufnimmt und Termine vorbereitet.",
    punkte: ["Trainiert auf Ihr Unternehmen", "24/7 erreichbar", "Leitet Anfragen direkt an Sie weiter"],
    icon: "M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 4V6zm5 4h.01M12 10h.01M15 10h.01",
  },
  {
    id: "telefon",
    title: "KI-Telefonassistent",
    kurz: "KI-Telefonassistent",
    text: "Nie wieder verpasste Anrufe: Ein KI-Telefonbeantworter nimmt Anrufe an, beantwortet häufige Fragen und notiert Rückrufwünsche.",
    punkte: ["Natürliche Stimme auf Deutsch", "Anruf-Zusammenfassung per E-Mail", "Ideal außerhalb der Öffnungszeiten"],
    icon: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z",
  },
  {
    id: "termine",
    title: "Online-Terminbuchung",
    kurz: "Terminbuchung",
    text: "Kunden buchen Termine selbst – direkt auf Ihrer Website, mit automatischer Bestätigung und Erinnerung per E-Mail.",
    punkte: ["Synchron mit Ihrem Kalender", "Automatische Erinnerungen", "Weniger Telefonate, weniger Ausfälle"],
    icon: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm4 8l2 2 4-4",
  },
  {
    id: "google",
    title: "Google-Profil & lokale Sichtbarkeit",
    kurz: "Google & SEO",
    text: "Wir optimieren Ihre Website und Ihr Google-Unternehmensprofil, damit Kunden aus Ihrer Region Sie schneller finden.",
    punkte: ["Google-Unternehmensprofil einrichten", "SEO-Grundoptimierung", "Bewertungen sichtbar einbinden"],
    icon: "M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4",
  },
  {
    id: "automation",
    title: "Formulare & Automationen",
    kurz: "Automationen",
    text: "Anfragen, Rückrufe und Bestellungen landen strukturiert bei Ihnen – automatisch weitergeleitet, gespeichert und beantwortet.",
    punkte: ["Anfrageformulare mit E-Mail-Benachrichtigung", "Automatische Eingangsbestätigung", "Anbindung an Ihre Tools"],
    icon: "M13 3L4 14h7l-1 7 9-11h-7l1-7z",
  },
];
