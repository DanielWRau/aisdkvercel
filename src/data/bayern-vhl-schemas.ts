import { z } from 'zod'

// --- L 214: Besondere Vertragsbedingungen (Liefer-/Dienstleistungen) ---

const l214Schema = z.object({
  verguetung: z.object({
    besondereBedingungen: z.string().describe('Besondere Vergütungsregelungen'),
    abschlagszahlungen: z.boolean().describe('Ob Abschlagszahlungen vereinbart sind'),
  }),
  ausfuehrungsfristen: z.object({
    beginn: z.string().describe('Beginn der Ausführung (Datum oder Werktage nach Aufforderung)'),
    vollendung: z.string().describe('Vollendung der Ausführung (Datum oder Werktage)'),
    einzelfristen: z.array(z.object({
      bezeichnung: z.string(),
      frist: z.string(),
    })).describe('Einzelfristen für Teilleistungen'),
  }),
  abnahme: z.object({
    foermlicheAbnahme: z.boolean().describe('Ob förmliche Abnahme erforderlich'),
    gefahruebergang: z.string().describe('Zeitpunkt des Gefahrübergangs'),
  }),
  vertragsstrafen: z.object({
    bezugsfrist: z.string().describe('Bezug: Beginn, Vollendung oder Einzelfrist'),
    prozentsatz: z.string().describe('Prozentsatz vom Wert der nicht nutzbaren Leistung'),
    obergrenze: z.string().describe('Obergrenze der Vertragsstrafen (i.d.R. 5% der Abrechnungssumme)'),
  }),
  maengelansprueche: z.array(z.object({
    leistung: z.string(),
    verjährungsfristJahre: z.number(),
  })).describe('Abweichende Verjährungsfristen für Mängelansprüche'),
  rechnungen: z.object({
    anzahlAusfertigungen: z.string().describe('Anzahl der einzureichenden Rechnungsausfertigungen'),
    getrennteRechnungen: z.string().describe('Für welche Leistungen getrennte Rechnungen zu stellen sind'),
  }),
  sicherheitsleistungen: z.object({
    erforderlich: z.boolean().describe('Ob Sicherheitsleistungen verlangt werden'),
    hoehe: z.string().describe('Höhe in % der Auftragssumme (Standard: 5%)'),
  }),
  preisgleitklausel: z.string().describe('Art der vereinbarten Preisgleitklausel, falls zutreffend'),
  pflanzenschutzmittel: z.boolean().describe('Ob Verwendung chemisch-synthetischer Pflanzenschutzmittel verboten ist'),
  weitereBVB: z.string().describe('Weitere Besondere Vertragsbedingungen, falls zutreffend'),
})

function l214ToMarkdown(result: z.infer<typeof l214Schema>): string {
  const lines = [
    '# L 214: Besondere Vertragsbedingungen (Liefer-/Dienstleistungen)',
    '',
    '## 1. Vergütung',
    result.verguetung.besondereBedingungen,
    `Abschlagszahlungen: ${result.verguetung.abschlagszahlungen ? 'Ja' : 'Nein'}`,
    '',
    '## 2. Ausführungsfristen',
    `**Beginn:** ${result.ausfuehrungsfristen.beginn}`,
    `**Vollendung:** ${result.ausfuehrungsfristen.vollendung}`,
  ]
  if (result.ausfuehrungsfristen.einzelfristen.length > 0) {
    lines.push('', '**Einzelfristen:**')
    for (const ef of result.ausfuehrungsfristen.einzelfristen) {
      lines.push(`- ${ef.bezeichnung}: ${ef.frist}`)
    }
  }
  lines.push(
    '',
    '## 3. Abnahme',
    `Förmliche Abnahme: ${result.abnahme.foermlicheAbnahme ? 'Ja' : 'Nein'}`,
    `Gefahrübergang: ${result.abnahme.gefahruebergang}`,
    '',
    '## 4. Vertragsstrafen',
    `Bezug: ${result.vertragsstrafen.bezugsfrist}`,
    `Prozentsatz: ${result.vertragsstrafen.prozentsatz}`,
    `Obergrenze: ${result.vertragsstrafen.obergrenze}`,
  )
  if (result.maengelansprueche.length > 0) {
    lines.push('', '## 5. Mängelansprüche')
    for (const m of result.maengelansprueche) {
      lines.push(`- ${m.leistung}: ${m.verjährungsfristJahre} Jahre`)
    }
  }
  lines.push(
    '',
    '## 6. Rechnungen',
    `Ausfertigungen: ${result.rechnungen.anzahlAusfertigungen}`,
    `Getrennte Rechnungen: ${result.rechnungen.getrennteRechnungen}`,
    '',
    '## 7. Sicherheitsleistungen',
    `Erforderlich: ${result.sicherheitsleistungen.erforderlich ? 'Ja' : 'Nein'}`,
    result.sicherheitsleistungen.erforderlich ? `Höhe: ${result.sicherheitsleistungen.hoehe}` : '',
    '',
    '## 8. Preisgleitklausel',
    result.preisgleitklausel || 'Keine',
    '',
    '## 9. Pflanzenschutzmittel',
    result.pflanzenschutzmittel ? 'Verwendung chemisch-synthetischer Pflanzenschutzmittel ist verboten.' : 'Keine Einschränkung.',
  )
  if (result.weitereBVB) {
    lines.push('', '## 10. Weitere Besondere Vertragsbedingungen', result.weitereBVB)
  }
  return lines.filter((l) => l !== '').join('\n')
}

// --- L 215: Zusätzliche Vertragsbedingungen ---

const l215Schema = z.object({
  preisregelung: z.string().describe('Hinweise zur Preisregelung (Einheitspreis, Verpackungskosten, Patentgebühren)'),
  technischeRegelwerke: z.string().describe('Relevante technische Regelwerke als Ergänzende Vertragsbedingungen'),
  unterauftragnehmer: z.string().describe('Regelungen zu Unterauftragnehmern (Eignung, Anzeigepflicht)'),
  sprache: z.string().describe('Sprachanforderungen für Unterlagen'),
  wettbewerbsbeschraenkungen: z.string().describe('Regelung bei Wettbewerbsbeschränkungen (5% Abrechnungssumme)'),
  abrechnung: z.string().describe('Abrechnungsregelungen (Rechnungsarten, Nummerierung)'),
  buergschaften: z.string().describe('Bürgschaftsregelungen (Formblatt, Kreditinstitut, Erklärungsinhalte)'),
  equalPay: z.string().describe('Equal Pay Gebot gemäß EntgTranspG und Mindestentgelt'),
  neubeauftragung: z.string().describe('Regelung zur Neubeauftragung nach vorzeitiger Vertragsbeendigung'),
})

function l215ToMarkdown(result: z.infer<typeof l215Schema>): string {
  return [
    '# L 215: Zusätzliche Vertragsbedingungen (Liefer-/Dienstleistungen)',
    '',
    '## 1. Preise',
    result.preisregelung,
    '',
    '## 2. Technische Regelwerke',
    result.technischeRegelwerke,
    '',
    '## 5. Unterauftragnehmer',
    result.unterauftragnehmer,
    '',
    '## 6. Sprache',
    result.sprache,
    '',
    '## 7. Wettbewerbsbeschränkungen',
    result.wettbewerbsbeschraenkungen,
    '',
    '## 8. Abrechnung',
    result.abrechnung,
    '',
    '## 10. Bürgschaften',
    result.buergschaften,
    '',
    '## 11. Equal Pay Gebot',
    result.equalPay,
    '',
    '## 12. Neubeauftragung nach vorzeitiger Vertragsbeendigung',
    result.neubeauftragung,
  ].join('\n')
}

// --- L 124: Eigenerklärung zur Eignung ---

const l124Schema = z.object({
  rolle: z.string().describe('Bewerber, Bieter, Mitglied einer Gemeinschaft, Nachunternehmer oder anderes Unternehmen'),
  unternehmen: z.object({
    name: z.string(),
    anschrift: z.string(),
    ustIdNr: z.string().describe('Umsatzsteuer-ID-Nr.'),
  }),
  umsatz: z.array(z.object({
    jahr: z.number(),
    betragEuro: z.number().describe('Umsatz in Euro für vergleichbare Leistungen'),
  })).describe('Umsatz der letzten 3 abgeschlossenen Geschäftsjahre'),
  referenzen: z.string().describe('Erklärung zu vergleichbaren Leistungen der letzten 3 Jahre (mind. 3 Referenzen)'),
  versicherung: z.object({
    personenschaeden: z.string().describe('Mindestdeckung Personenschäden in EUR'),
    sachschaeden: z.string().describe('Mindestdeckung Sach-/Vermögensschäden in EUR'),
  }),
  beschaeftigte: z.array(z.object({
    jahr: z.number(),
    anzahlBeschaeftigte: z.number(),
    anzahlFuehrungskraefte: z.number(),
  })).describe('Durchschnittliche Beschäftigtenzahl der letzten 3 Jahre'),
  handelsregister: z.object({
    eingetragen: z.boolean(),
    registergericht: z.string().describe('Registergericht und -nummer, falls eingetragen'),
  }),
  insolvenz: z.string().describe('Erklärung zu Insolvenzverfahren'),
  ausschlussgruende: z.string().describe('Erklärung zu Ausschlussgründen §§ 123/124 GWB'),
  steuernSozialversicherung: z.string().describe('Erklärung zur Zahlung von Steuern und Sozialversicherungsbeiträgen'),
  berufsgenossenschaft: z.boolean().describe('Mitgliedschaft bei der Berufsgenossenschaft'),
})

function l124ToMarkdown(result: z.infer<typeof l124Schema>): string {
  const lines = [
    '# L 124: Eigenerklärung zur Eignung',
    '',
    `**Rolle:** ${result.rolle}`,
    '',
    '## Unternehmen',
    `**Name:** ${result.unternehmen.name}`,
    `**Anschrift:** ${result.unternehmen.anschrift}`,
    `**USt-ID-Nr.:** ${result.unternehmen.ustIdNr}`,
    '',
    '## Umsatz (vergleichbare Leistungen)',
    '| Jahr | Umsatz (EUR) |',
    '|------|-------------|',
    ...result.umsatz.map((u) => `| ${u.jahr} | ${u.betragEuro.toLocaleString('de-DE')} |`),
    '',
    '## Referenzen',
    result.referenzen,
    '',
    '## Versicherung',
    `- Personenschäden: ${result.versicherung.personenschaeden}`,
    `- Sach-/Vermögensschäden: ${result.versicherung.sachschaeden}`,
    '',
    '## Beschäftigte',
    '| Jahr | Beschäftigte | Führungskräfte |',
    '|------|-------------|----------------|',
    ...result.beschaeftigte.map((b) => `| ${b.jahr} | ${b.anzahlBeschaeftigte} | ${b.anzahlFuehrungskraefte} |`),
    '',
    '## Handelsregister',
    result.handelsregister.eingetragen ? `Eingetragen: ${result.handelsregister.registergericht}` : 'Nicht zur Eintragung verpflichtet.',
    '',
    '## Insolvenz',
    result.insolvenz,
    '',
    '## Ausschlussgründe §§ 123/124 GWB',
    result.ausschlussgruende,
    '',
    '## Steuern und Sozialversicherung',
    result.steuernSozialversicherung,
    '',
    '## Berufsgenossenschaft',
    result.berufsgenossenschaft ? 'Mitglied der Berufsgenossenschaft.' : 'Keine Mitgliedschaft.',
  ]
  return lines.join('\n')
}

// --- L 211: Aufforderung zur Angebotsabgabe ---

const l211Schema = z.object({
  vergabestelle: z.object({
    name: z.string(),
    anschrift: z.string(),
    ansprechpartner: z.string(),
    telefon: z.string(),
    email: z.string(),
  }),
  massnahme: z.string().describe('Bezeichnung der Maßnahme'),
  leistung: z.string().describe('Bezeichnung der Leistung'),
  vergabenummer: z.string().describe('Vergabenummer'),
  vergabeart: z.string().describe('Vergabeart (Öffentliche Ausschreibung, Beschränkte Ausschreibung, etc.)'),
  angebotsfrist: z.string().describe('Angebotsfrist (Datum und Uhrzeit)'),
  bindefrist: z.string().describe('Bindefrist bis (Datum)'),
  zuschlagskriterien: z.string().describe('Zuschlagskriterien und deren Gewichtung'),
  beizufuegendeUnterlagen: z.array(z.string()).describe('Vom Bieter beizufügende Unterlagen'),
  angebotsform: z.string().describe('Angebotsform (elektronisch, schriftlich, Plattform)'),
})

function l211ToMarkdown(result: z.infer<typeof l211Schema>): string {
  return [
    '# L 211: Aufforderung zur Abgabe eines Angebots',
    '',
    '## Vergabestelle',
    `**${result.vergabestelle.name}**`,
    result.vergabestelle.anschrift,
    `Ansprechpartner: ${result.vergabestelle.ansprechpartner}`,
    `Tel.: ${result.vergabestelle.telefon} | E-Mail: ${result.vergabestelle.email}`,
    '',
    '## Maßnahme / Leistung',
    `**Maßnahme:** ${result.massnahme}`,
    `**Leistung:** ${result.leistung}`,
    `**Vergabenummer:** ${result.vergabenummer}`,
    `**Vergabeart:** ${result.vergabeart}`,
    '',
    '## Fristen',
    `**Angebotsfrist:** ${result.angebotsfrist}`,
    `**Bindefrist:** ${result.bindefrist}`,
    '',
    '## Zuschlagskriterien',
    result.zuschlagskriterien,
    '',
    '## Beizufügende Unterlagen',
    ...result.beizufuegendeUnterlagen.map((u) => `- ${u}`),
    '',
    '## Angebotsform',
    result.angebotsform,
  ].join('\n')
}

// --- L 227: Gewichtung der Zuschlagskriterien ---

const l227Schema = z.object({
  zuschlagsprinzip: z.string().describe('Zuschlagsprinzip: Niedrigster Preis oder wirtschaftlichstes Angebot'),
  kriterien: z.array(z.object({
    kriterium: z.string(),
    gewichtungProzent: z.number(),
    unterkriterien: z.array(z.object({
      name: z.string(),
      gewichtungProzent: z.number(),
    })).describe('Unterkriterien mit Gewichtung'),
  })).describe('Zuschlagskriterien mit Gewichtung'),
  bewertungsmethode: z.string().describe('Bewertungsmethode (Punkteskala, Schulnoten, etc.)'),
  erlaeuterung: z.string().describe('Erläuterungen zur Wertung'),
})

function l227ToMarkdown(result: z.infer<typeof l227Schema>): string {
  const lines = [
    '# L 227: Gewichtung der Zuschlagskriterien',
    '',
    `**Zuschlagsprinzip:** ${result.zuschlagsprinzip}`,
    '',
    '## Kriterien',
    '',
    '| Kriterium | Gewichtung |',
    '|-----------|-----------|',
  ]
  for (const k of result.kriterien) {
    lines.push(`| **${k.kriterium}** | **${k.gewichtungProzent}%** |`)
    for (const uk of k.unterkriterien) {
      lines.push(`| — ${uk.name} | ${uk.gewichtungProzent}% |`)
    }
  }
  lines.push(
    '',
    '## Bewertungsmethode',
    result.bewertungsmethode,
    '',
    '## Erläuterungen',
    result.erlaeuterung,
  )
  return lines.join('\n')
}

// --- L 2491: Erklärung Kinderarbeit ---

const l2491Schema = z.object({
  erklaerung: z.string().describe('Erklärung zur Vermeidung ausbeuterischer Kinderarbeit'),
  produktkategorien: z.array(z.string()).describe('Betroffene Produktkategorien'),
  nachweisart: z.string().describe('Art des Nachweises (Eigenerklärung, Zertifikate wie SA8000, BSCI)'),
  lieferkettenPruefung: z.string().describe('Maßnahmen zur Prüfung der Lieferkette'),
})

function l2491ToMarkdown(result: z.infer<typeof l2491Schema>): string {
  return [
    '# L 2491: Erklärung Kinderarbeit (ILO-Konvention Nr. 182)',
    '',
    '## Erklärung',
    result.erklaerung,
    '',
    '## Produktkategorien',
    ...result.produktkategorien.map((p) => `- ${p}`),
    '',
    '## Nachweisart',
    result.nachweisart,
    '',
    '## Lieferketten-Prüfung',
    result.lieferkettenPruefung,
  ].join('\n')
}

// --- L 248: Erklärung Holzprodukte ---

const l248Schema = z.object({
  erklaerung: z.string().describe('Erklärung zur Verwendung von Holz aus legaler/nachhaltiger Forstwirtschaft'),
  zertifizierung: z.string().describe('Vorhandene Zertifizierung (FSC, PEFC oder gleichwertig)'),
  herkunftsnachweis: z.string().describe('Herkunftsnachweis der Holzprodukte'),
  euHolzhandelsVO: z.string().describe('Erklärung zur Einhaltung der EU-Holzhandelsverordnung'),
})

function l248ToMarkdown(result: z.infer<typeof l248Schema>): string {
  return [
    '# L 248: Erklärung zur Verwendung von Holzprodukten',
    '',
    '## Erklärung',
    result.erklaerung,
    '',
    '## Zertifizierung',
    result.zertifizierung,
    '',
    '## Herkunftsnachweis',
    result.herkunftsnachweis,
    '',
    '## EU-Holzhandelsverordnung',
    result.euHolzhandelsVO,
  ].join('\n')
}

// --- L 2496: Scientology-Schutzerklärung ---

const l2496Schema = z.object({
  erklaerung: z.string().describe('Erklärung des Bieters bezüglich Scientology-Organisation'),
  bestaetigung: z.boolean().describe('Bestätigung, dass keine Scientology-Technologie angewandt wird'),
})

function l2496ToMarkdown(result: z.infer<typeof l2496Schema>): string {
  return [
    '# L 2496: Schutzerklärung (Scientology)',
    '',
    '## Erklärung',
    result.erklaerung,
    '',
    `**Bestätigung:** ${result.bestaetigung ? 'Ja, es wird bestätigt, dass keine Technologie von L. Ron Hubbard angewandt wird.' : 'Nein.'}`,
  ].join('\n')
}

// --- Export ---

export const bayernVhlSchemas = {
  'L 214': { schema: l214Schema, toMarkdown: l214ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 215': { schema: l215Schema, toMarkdown: l215ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 124': { schema: l124Schema, toMarkdown: l124ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 211': { schema: l211Schema, toMarkdown: l211ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 227': { schema: l227Schema, toMarkdown: l227ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 2491': { schema: l2491Schema, toMarkdown: l2491ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 248': { schema: l248Schema, toMarkdown: l248ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'L 2496': { schema: l2496Schema, toMarkdown: l2496ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
}
