import { z } from 'zod'

// --- Fristen Config ---

export interface OberschwelleFristen {
  offenAngebotsfrist: number
  nichtoffenTeilnahmefrist: number
  nichtoffenAngebotsfrist: number
  eVergabeVerkuerzung: number
  auswertungszeit: number
  stillhaltefrist: number
}

export interface UnterschswelleFristen {
  offenAngebotsfrist: number
  nichtoffenTeilnahmefrist: number
  nichtoffenAngebotsfrist: number
  direktvergabeAngebotsfrist: number
  auswertungszeit: number
}

export interface AllgemeineFristen {
  bindefrist: number
  bieterfragenVorlauf: number
}

export interface FristenConfig {
  oberschwelle: OberschwelleFristen
  unterschwelle: UnterschswelleFristen
  allgemein: AllgemeineFristen
}

export const DEFAULT_FRISTEN_CONFIG: FristenConfig = {
  oberschwelle: {
    offenAngebotsfrist: 35,
    nichtoffenTeilnahmefrist: 30,
    nichtoffenAngebotsfrist: 30,
    eVergabeVerkuerzung: 5,
    auswertungszeit: 14,
    stillhaltefrist: 10,
  },
  unterschwelle: {
    offenAngebotsfrist: 14,
    nichtoffenTeilnahmefrist: 10,
    nichtoffenAngebotsfrist: 10,
    direktvergabeAngebotsfrist: 7,
    auswertungszeit: 7,
  },
  allgemein: {
    bindefrist: 60,
    bieterfragenVorlauf: 6,
  },
}

// --- Zod schemas (for Payload validation) ---

export const fristenConfigSchema = z.object({
  oberschwelle: z.object({
    offenAngebotsfrist: z.number().optional(),
    nichtoffenTeilnahmefrist: z.number().optional(),
    nichtoffenAngebotsfrist: z.number().optional(),
    eVergabeVerkuerzung: z.number().optional(),
    auswertungszeit: z.number().optional(),
    stillhaltefrist: z.number().optional(),
  }).strict().optional(),
  unterschwelle: z.object({
    offenAngebotsfrist: z.number().optional(),
    nichtoffenTeilnahmefrist: z.number().optional(),
    nichtoffenAngebotsfrist: z.number().optional(),
    direktvergabeAngebotsfrist: z.number().optional(),
    auswertungszeit: z.number().optional(),
  }).strict().optional(),
  allgemein: z.object({
    bindefrist: z.number().optional(),
    bieterfragenVorlauf: z.number().optional(),
  }).strict().optional(),
}).strict()

export const uiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  terminplanAnsicht: z.enum(['gantt', 'list']).default('list'),
  kompakteAnsicht: z.boolean().default(false),
}).strict()
export type UiPreferences = z.infer<typeof uiPreferencesSchema>

export const vergabestelleDataSchema = z.object({
  name: z.string().max(200).optional(),
  kurzname: z.string().max(100).optional(),
  organisationstyp: z.string().max(100).optional(),
  abteilung: z.string().max(200).optional(),
  strasse: z.string().max(200).optional(),
  hausnummer: z.string().max(20).optional(),
  plz: z.string().max(10).optional(),
  stadt: z.string().max(100).optional(),
  bundesland: z.string().max(100).optional(),
  email: z.string().email().max(200).optional(),
  telefon: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().url().max(500).optional(),
  ansprechpartner: z.object({
    name: z.string().max(200).optional(),
    funktion: z.string().max(200).optional(),
    telefon: z.string().max(50).optional(),
    email: z.string().email().max(200).optional(),
  }).strict().optional(),
  nachpruefkammer: z.object({
    name: z.string().max(200).optional(),
    strasse: z.string().max(200).optional(),
    plz: z.string().max(10).optional(),
    stadt: z.string().max(100).optional(),
    telefon: z.string().max(50).optional(),
    fax: z.string().max(50).optional(),
    email: z.string().email().max(200).optional(),
  }).strict().optional(),
}).strict()
export type VergabestelleData = z.infer<typeof vergabestelleDataSchema>

export const featureTogglesSchema = z.object({
  enabled: z.array(z.string().max(50)).max(50).default([]),
  lastUpdated: z.string().optional(),
}).strict()
export type FeatureToggles = z.infer<typeof featureTogglesSchema>

// --- Workflow Settings ---

export const workflowSettingsSchema = z.object({
  // Bedarfsanalyse
  maxFrageRunden: z.number().min(1).max(5).optional(),
  fragenstil: z.enum(['standard', 'technisch', 'einfach', 'it-fokus', 'kaufmaennisch', 'vergabeverfahren']).optional(),
  // Marktrecherche
  region: z.string().max(200).optional(),
  groessenPraeferenz: z.enum(['klein', 'mittel', 'gross', 'alle']).optional(),
  // Leistungsbeschreibung
  detailtiefe: z.enum(['kurz', 'standard', 'erweitert']).optional(),
  stil: z.enum(['formal', 'einfach']).optional(),
  mitZeitplanung: z.boolean().optional(),
  gliederungVorlage: z.string().max(50).optional(),
  eigeneGliederungAktiv: z.boolean().optional(),
  eigeneGliederung: z.string().max(5000).optional(),
}).strict()
export type WorkflowSettingsData = z.infer<typeof workflowSettingsSchema>
