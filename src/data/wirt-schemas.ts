import { z } from 'zod'

// --- Wirt-214: Besondere Vertragsbedingungen Mindestentgelt ---

const wirt214Schema = z.object({
  mindeststundenentgelt: z.string().describe('Aktueller Mindeststundenlohn gemäß BerlAVG'),
  tariftreue: z.string().describe('Tariftreueerklärung und Geltungsbereich'),
  geltungsbereich: z.string().describe('Beschreibung des Geltungsbereichs'),
  nachunternehmerVerpflichtung: z.string().describe('Verpflichtung zur Weitergabe an Nachunternehmer'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung zum Mindestentgelt'),
})

function wirt214ToMarkdown(result: z.infer<typeof wirt214Schema>): string {
  return [
    '# Wirt-214: Besondere Vertragsbedingungen — Mindestentgelt',
    '',
    '## Mindeststundenentgelt',
    result.mindeststundenentgelt,
    '',
    '## Tariftreue',
    result.tariftreue,
    '',
    '## Geltungsbereich',
    result.geltungsbereich,
    '',
    '## Nachunternehmer-Verpflichtung',
    result.nachunternehmerVerpflichtung,
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-2140: ILO-Kernarbeitsnormen ---

const wirt2140Schema = z.object({
  produktkategorien: z.array(z.string()).describe('Betroffene Produktkategorien'),
  iloErklaerung: z.string().describe('Erklärung zur Einhaltung der ILO-Kernarbeitsnormen'),
  nachweisart: z.string().describe('Art des Nachweises (Zertifikat, Eigenerklärung, etc.)'),
  lieferkette: z.string().describe('Anforderungen an die Lieferkette'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung'),
})

function wirt2140ToMarkdown(result: z.infer<typeof wirt2140Schema>): string {
  return [
    '# Wirt-2140: ILO-Kernarbeitsnormen',
    '',
    '## Produktkategorien',
    ...result.produktkategorien.map((k) => `- ${k}`),
    '',
    '## ILO-Erklärung',
    result.iloErklaerung,
    '',
    '## Nachweisart',
    result.nachweisart,
    '',
    '## Lieferkette',
    result.lieferkette,
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-2141: Frauenförderverordnung (FFV) ---

const wirt2141Schema = z.object({
  beschaeftigtenzahl: z.number().describe('Anzahl der Beschäftigten'),
  groessenklasse: z.string().describe('Unternehmensgrößenklasse (>10, >25, >250)'),
  ausgewaehlteMassnahmen: z.array(z.string()).describe('Ausgewählte Frauenfördermaßnahmen'),
  frauenanteil: z.string().describe('Aktueller Frauenanteil im Unternehmen'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung zur Frauenförderung'),
})

function wirt2141ToMarkdown(result: z.infer<typeof wirt2141Schema>): string {
  return [
    '# Wirt-2141: Frauenförderverordnung (FFV)',
    '',
    '## Beschäftigtenzahl',
    String(result.beschaeftigtenzahl),
    '',
    '## Größenklasse',
    result.groessenklasse,
    '',
    '## Frauenanteil',
    result.frauenanteil,
    '',
    '## Ausgewählte Maßnahmen',
    ...result.ausgewaehlteMassnahmen.map((m) => `- ${m}`),
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-2143: Antidiskriminierung ---

const wirt2143Schema = z.object({
  gleichbehandlungsErklaerung: z.string().describe('Erklärung zur Gleichbehandlung'),
  entgeltgleichheit: z.string().describe('Erklärung zur Entgeltgleichheit'),
  massnahmen: z.array(z.string()).describe('Konkrete Antidiskriminierungsmaßnahmen'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung'),
})

function wirt2143ToMarkdown(result: z.infer<typeof wirt2143Schema>): string {
  return [
    '# Wirt-2143: Antidiskriminierung',
    '',
    '## Gleichbehandlungserklärung',
    result.gleichbehandlungsErklaerung,
    '',
    '## Entgeltgleichheit',
    result.entgeltgleichheit,
    '',
    '## Maßnahmen',
    ...result.massnahmen.map((m) => `- ${m}`),
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-2144: Kontrolle / Vertragsstrafen ---

const wirt2144Schema = z.object({
  vertragsstrafenRegelung: z.string().describe('Regelung zu Vertragsstrafen bei Verstößen'),
  kontrollrechte: z.string().describe('Kontrollrechte des Auftraggebers'),
  sanktionsstufen: z.array(z.string()).describe('Sanktionsstufen bei Verstößen'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung'),
})

function wirt2144ToMarkdown(result: z.infer<typeof wirt2144Schema>): string {
  return [
    '# Wirt-2144: Kontrolle und Vertragsstrafen',
    '',
    '## Vertragsstrafenregelung',
    result.vertragsstrafenRegelung,
    '',
    '## Kontrollrechte',
    result.kontrollrechte,
    '',
    '## Sanktionsstufen',
    ...result.sanktionsstufen.map((s) => `- ${s}`),
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-2145: Umweltschutzanforderungen ---

const wirt2145Schema = z.object({
  umweltanforderungen: z.string().describe('Spezifische Umweltanforderungen für diesen Auftrag'),
  sektorAnlage: z.string().describe('Relevante Sektoranlage / Branchenspezifik'),
  nachweisarten: z.array(z.string()).describe('Geforderte Umweltnachweise / Zertifikate'),
  energieeffizienz: z.string().describe('Anforderungen an Energieeffizienz'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung zum Umweltschutz'),
})

function wirt2145ToMarkdown(result: z.infer<typeof wirt2145Schema>): string {
  return [
    '# Wirt-2145: Umweltschutzanforderungen',
    '',
    '## Umweltanforderungen',
    result.umweltanforderungen,
    '',
    '## Sektoranlage',
    result.sektorAnlage,
    '',
    '## Nachweisarten',
    ...result.nachweisarten.map((n) => `- ${n}`),
    '',
    '## Energieeffizienz',
    result.energieeffizienz,
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Wirt-215: ZVB/BVB (Zusätzliche/Besondere Vertragsbedingungen) ---

const wirt215Schema = z.object({
  zahlungsbedingungen: z.string().describe('Zahlungsbedingungen und -fristen'),
  gewaehrleistung: z.string().describe('Gewährleistungsregelungen'),
  preisgleitklausel: z.string().describe('Preisgleitklausel / Preisanpassung'),
  kuendigungsrechte: z.string().describe('Kündigungsrechte und -bedingungen'),
  haftung: z.string().describe('Haftungsregelungen'),
  erklaerung: z.string().describe('Zusammenfassende Erklärung zu den Vertragsbedingungen'),
})

function wirt215ToMarkdown(result: z.infer<typeof wirt215Schema>): string {
  return [
    '# Wirt-215: Zusätzliche / Besondere Vertragsbedingungen',
    '',
    '## Zahlungsbedingungen',
    result.zahlungsbedingungen,
    '',
    '## Gewährleistung',
    result.gewaehrleistung,
    '',
    '## Preisgleitklausel',
    result.preisgleitklausel,
    '',
    '## Kündigungsrechte',
    result.kuendigungsrechte,
    '',
    '## Haftung',
    result.haftung,
    '',
    '## Erklärung',
    result.erklaerung,
  ].join('\n')
}

// --- Registry ---

export type WirtSchemaEntry = {
  schema: z.ZodType
  toMarkdown: (result: unknown) => string
  schemaVersion: number
}

export const wirtSchemas: Record<string, WirtSchemaEntry> = {
  'Wirt-214': { schema: wirt214Schema, toMarkdown: wirt214ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-2140': { schema: wirt2140Schema, toMarkdown: wirt2140ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-2141': { schema: wirt2141Schema, toMarkdown: wirt2141ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-2143': { schema: wirt2143Schema, toMarkdown: wirt2143ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-2144': { schema: wirt2144Schema, toMarkdown: wirt2144ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-2145': { schema: wirt2145Schema, toMarkdown: wirt2145ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
  'Wirt-215': { schema: wirt215Schema, toMarkdown: wirt215ToMarkdown as (r: unknown) => string, schemaVersion: 1 },
}
