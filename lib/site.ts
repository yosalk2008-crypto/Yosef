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

export type Paket = {
  id: string;
  name: string;
  preis: number;
  beschreibung: string;
  features: string[];
  highlight?: boolean;
};

export const pakete: Paket[] = [
  {
    id: "start",
    name: "Start",
    preis: 49,
    beschreibung: "Der professionelle Auftritt für Selbstständige und kleine Betriebe.",
    features: [
      "Onepager mit bis zu 5 Sektionen",
      "Domain, Hosting & SSL inklusive",
      "Kontaktformular",
      "Optimiert für Smartphone & Tablet",
      "Impressum & Datenschutzseite",
      "1 Änderungswunsch pro Monat",
    ],
  },
  {
    id: "business",
    name: "Business",
    preis: 89,
    beschreibung: "Für Unternehmen, die mehr zeigen und mehr Anfragen gewinnen wollen.",
    features: [
      "Bis zu 8 Unterseiten",
      "Domain, Hosting & SSL inklusive",
      "Anfrageformular mit E-Mail-Benachrichtigung",
      "Google-Bewertungen & Karte eingebunden",
      "SEO-Grundoptimierung",
      "Änderungen ohne Limit (Bearbeitung in 1–2 Werktagen)",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    preis: 149,
    beschreibung: "Der Rundum-Service für Firmen mit größerem Angebot.",
    features: [
      "Unbegrenzte Unterseiten",
      "Alles aus Business",
      "Interaktive Elemente (z. B. Preisrechner)",
      "Professionelle E-Mail-Adresse mit eigener Domain",
      "Monatlicher Bericht zu Besuchern",
      "Bevorzugter Änderungsservice am selben Werktag",
    ],
  },
];
