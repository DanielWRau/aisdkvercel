import type { Provider } from '@/tools/market-research';
import type { SpecResult } from '@/tools/generate-spec';

export const SAMPLE_PROVIDERS: Provider[] = [
  {
    name: 'CleanPro GmbH',
    description: 'Professionelle Gebäudereinigung und Facility Management',
    website: 'https://cleanpro.de',
    email: 'info@cleanpro.de',
    phone: '+49 30 1234567',
    address: 'Musterstraße 1',
    city: '10115 Berlin',
    strengths: ['ISO 9001', '24/7 Service', 'Nachhaltige Reinigungsmittel'],
    groesse: 'gross',
    reichweite: 'bundesweit',
    spezialisierung: 'Facility Management und Gebäudereinigung',
    region: 'Berlin',
    mitarbeiteranzahl: 'ca. 1200',
    category: 'groß/überregional',
    certifications: ['ISO 9001', 'ISO 14001'],
  },
  {
    name: 'RegioClean AG',
    description: 'Regionale Reinigungsdienstleistungen',
    website: 'https://regioclean.de',
    email: 'kontakt@regioclean.de',
    phone: '+49 89 9876543',
    city: '80331 München',
    strengths: ['Persönliche Betreuung', 'Flexible Einsatzzeiten'],
    groesse: 'mittel',
    reichweite: 'regional',
    spezialisierung: 'Büro- und Praxisreinigung',
    region: 'Bayern',
    mitarbeiteranzahl: 'ca. 150',
    category: 'mittelständisch/regional',
  },
  {
    name: 'SpezialRein OHG',
    description: 'Spezialisiert auf Industriereinigung',
    website: 'https://spezialrein.de',
    email: 'anfrage@spezialrein.de',
    phone: '+49 711 5551234',
    address: 'Industrieweg 42',
    city: '70173 Stuttgart',
    strengths: ['Industrieexpertise', 'Zertifizierte Mitarbeiter'],
    groesse: 'klein',
    reichweite: 'regional',
    spezialisierung: 'Industriereinigung und Sonderreinigung',
    region: 'Baden-Württemberg',
    mitarbeiteranzahl: 'ca. 35',
    category: 'spezialisiert',
    certifications: ['RAL GZ 902'],
  },
];

/** Sample providers without groesse (backward compat testing) */
export const SAMPLE_PROVIDERS_LEGACY: Provider[] = [
  {
    name: 'AltFirma GmbH',
    description: 'Altbestand ohne neue Felder',
    website: 'https://altfirma.de',
    strengths: ['Erfahrung'],
    category: 'groß/überregional',
  },
  {
    name: 'KleinBetrieb KG',
    description: 'Kleiner Betrieb',
    website: 'https://kleinbetrieb.de',
    strengths: ['Flexibel'],
    category: 'spezialisiert',
  },
];

export const SAMPLE_SPEC: SpecResult = {
  titel: 'Leistungsbeschreibung Gebäudereinigung',
  leistungstyp: 'dienstleistung',
  bedarf: {
    ausgangssituation:
      'Die Organisation betreibt mehrere Bürogebäude mit insgesamt 5.000 m² Nutzfläche.',
    problemstellung:
      'Die aktuelle Reinigungsqualität entspricht nicht den Anforderungen.',
    bedarfsumfang:
      'Tägliche Unterhaltsreinigung, wöchentliche Grundreinigung, monatliche Sonderreinigung.',
  },
  ziel: {
    gewuenschte_ergebnisse:
      'Konstant hohe Reinigungsqualität in allen Gebäuden.',
    nutzen: 'Verbesserte Arbeitsumgebung und Hygiene.',
    erfolgskriterien: [
      'Reinigungsqualität >= 90% bei Stichproben',
      'Reaktionszeit bei Sonderanfragen < 4 Stunden',
      'Mitarbeiterzufriedenheit >= 4.0/5.0',
    ],
  },
  leistungsbeschreibung: {
    bereiche: [
      {
        titel: 'Unterhaltsreinigung',
        beschreibung: 'Tägliche Reinigung aller Büro- und Gemeinschaftsflächen',
        unterbereiche: [
          {
            titel: 'Büroreinigung',
            inhalt:
              'Staubwischen, Bodenpflege, Papierkorbleerung in allen Büroräumen.',
          },
          {
            titel: 'Sanitärreinigung',
            inhalt:
              'Desinfektion und Reinigung aller sanitären Anlagen inkl. Verbrauchsmaterial.',
          },
        ],
      },
    ],
  },
  zeitplanung: {
    gesamtdauer_monate: 12,
    meilensteine: [
      {
        phase: 'Einarbeitungsphase',
        dauer_wochen: 4,
        aktivitaeten: [
          'Objektbegehung',
          'Schulung der Reinigungskräfte',
          'Abstimmung Reinigungspläne',
        ],
        liefergegenstaende: [
          'Reinigungsplan',
          'Qualitätssicherungskonzept',
        ],
      },
    ],
  },
};
