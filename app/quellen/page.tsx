import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenquellen" };

export default function Quellen() {
  return (
    <LegalPage title="Datenquellen">
      <div>
        <h2>Länderdaten</h2>
        <p>
          Bevölkerung, BIP, BIP pro Kopf, Lebenserwartung, Militärausgaben, Touristenankünfte,
          Waldanteil und Verstädterung stammen aus den World Development Indicators der{" "}
          <a href="https://data.worldbank.org/" rel="noopener">Weltbank</a> (CC BY 4.0), jeweils der
          neueste verfügbare Wert. Für Taiwan, das die Weltbank nicht führt, verwenden wir gerundete
          amtliche Werte.
        </p>
        <p className="mt-3">
          Namen, Fläche, Kontinente und Nachbarländer stammen aus dem Projekt{" "}
          <a href="https://github.com/mledoze/countries" rel="noopener">mledoze/countries</a> (ODbL),
          Hauptstädte und deren Einwohnerzahlen aus{" "}
          <a href="https://www.wikidata.org/" rel="noopener">Wikidata</a> (CC0).
        </p>
      </div>
      <div>
        <h2>Karten und Flaggen</h2>
        <p>
          Ländergrenzen: <a href="https://www.naturalearthdata.com/" rel="noopener">Natural Earth</a>{" "}
          über world-atlas und us-atlas (gemeinfrei). Bundesländer:{" "}
          <a href="https://github.com/isellsoap/deutschlandGeoJSON" rel="noopener">deutschlandGeoJSON</a>,
          österreichische Bundesländer:{" "}
          <a href="https://github.com/ginseng666/GeoJSON-TopoJSON-Austria" rel="noopener">GeoJSON-TopoJSON-Austria</a>,
          Schweizer Kantone:{" "}
          <a href="https://github.com/codeforgermany/click_that_hood" rel="noopener">click_that_hood</a>,
          syrische Gouvernements, marokkanische Regionen und türkische Provinzen (die 7 türkischen Regionen sind daraus zusammengesetzt):{" "}
          <a href="https://www.geoboundaries.org/" rel="noopener">geoBoundaries</a> (CC BY 4.0).
          Flaggen: <a href="https://github.com/lipis/flag-icons" rel="noopener">flag-icons</a> (MIT).
        </p>
      </div>
      <div>
        <h2>Hinweis</h2>
        <p>
          Grenzverläufe und Statusfragen einzelner Gebiete sind teilweise umstritten. Die Darstellung
          folgt den genannten Quellen und ist keine politische Stellungnahme. Fehler gefunden?
          Schreib uns gern über die Angaben im Impressum.
        </p>
      </div>
    </LegalPage>
  );
}
