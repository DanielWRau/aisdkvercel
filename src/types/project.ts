import { z } from 'zod'

// --- Status ---

export const PROJECT_STATUSES = [
  'planung', 'bekanntgemacht', 'laufend', 'auswertung',
  'abgeschlossen', 'aufgehoben', 'ruhend',
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const STATUS_MIGRATION_MAP: Record<string, ProjectStatus> = {
  active: 'planung',
  in_progress: 'laufend',
  review: 'auswertung',
  completed: 'abgeschlossen',
  paused: 'ruhend',
  archived: 'aufgehoben',
}

// --- Vergaberecht ---

export const VERGABERECHT_OPTIONS = ['VgV', 'UVgO', 'VOB_A', 'SektVO'] as const
export type Vergaberecht = (typeof VERGABERECHT_OPTIONS)[number]

export const VERGABERECHT_LABELS: Record<Vergaberecht, string> = {
  VgV: 'VgV',
  UVgO: 'UVgO',
  VOB_A: 'VOB/A',
  SektVO: 'SektVO',
}

// --- Auftragsart ---

export const AUFTRAGSART_OPTIONS = ['lieferung', 'dienstleistung', 'bauauftrag'] as const
export type Auftragsart = (typeof AUFTRAGSART_OPTIONS)[number]

export const AUFTRAGSART_LABELS: Record<Auftragsart, string> = {
  lieferung: 'Lieferauftrag',
  dienstleistung: 'Dienstleistungsauftrag',
  bauauftrag: 'Bauauftrag',
}

// --- Verfahrensart ---

// Oberschwelle (EU): VgV §§ 14-19, SektVO, VOB/A EU
export type VerfahrensartOberschwelle =
  | 'offen'
  | 'nichtoffen'
  | 'verhandlung_mit_twb'
  | 'verhandlung_ohne_twb'
  | 'wettbewerb'
  | 'innovationspartnerschaft'
  // Legacy
  | 'verhandlung'
  | 'direktvergabe'

// Unterschwelle national: UVgO (§§ 8-14)
export type VerfahrensartUVgO =
  | 'oeffentliche_ausschreibung'
  | 'beschraenkte_mit_twb'
  | 'beschraenkte_ohne_twb'
  | 'verhandlungsvergabe_mit_twb'
  | 'verhandlungsvergabe_ohne_twb'
  | 'direktauftrag'

// Unterschwelle national: VOB/A Abschnitt 1 (§§ 3, 3a)
export type VerfahrensartVOBA =
  | 'oeffentliche_ausschreibung'
  | 'beschraenkte_mit_twb'
  | 'beschraenkte_ohne_twb'
  | 'freihaendige_vergabe'
  | 'direktauftrag'

export type Verfahrensart =
  | VerfahrensartOberschwelle
  | VerfahrensartUVgO
  | VerfahrensartVOBA

export const VERFAHRENSART_LABELS: Record<Verfahrensart, string> = {
  // Oberschwelle (EU)
  offen: 'Offenes Verfahren',
  nichtoffen: 'Nicht offenes Verfahren',
  verhandlung_mit_twb: 'Verhandlungsverfahren mit TWB',
  verhandlung_ohne_twb: 'Verhandlungsverfahren ohne TWB',
  wettbewerb: 'Wettbewerblicher Dialog',
  innovationspartnerschaft: 'Innovationspartnerschaft',
  // Unterschwelle UVgO
  oeffentliche_ausschreibung: 'Öffentliche Ausschreibung',
  beschraenkte_mit_twb: 'Beschränkte Ausschreibung mit TWB',
  beschraenkte_ohne_twb: 'Beschränkte Ausschreibung ohne TWB',
  verhandlungsvergabe_mit_twb: 'Verhandlungsvergabe mit TWB',
  verhandlungsvergabe_ohne_twb: 'Verhandlungsvergabe ohne TWB',
  direktauftrag: 'Direktauftrag',
  // Unterschwelle VOB/A
  freihaendige_vergabe: 'Freihändige Vergabe',
  // Legacy
  verhandlung: 'Verhandlungsverfahren',
  direktvergabe: 'Direktvergabe',
}

export const VERFAHRENSARTEN_OBERSCHWELLE: Verfahrensart[] = [
  'offen', 'nichtoffen', 'verhandlung_mit_twb',
  'verhandlung_ohne_twb', 'wettbewerb', 'innovationspartnerschaft',
]

export const VERFAHRENSARTEN_UVGO: Verfahrensart[] = [
  'oeffentliche_ausschreibung', 'beschraenkte_mit_twb', 'beschraenkte_ohne_twb',
  'verhandlungsvergabe_mit_twb', 'verhandlungsvergabe_ohne_twb', 'direktauftrag',
]

export const VERFAHRENSARTEN_VOBA: Verfahrensart[] = [
  'oeffentliche_ausschreibung', 'beschraenkte_mit_twb', 'beschraenkte_ohne_twb',
  'freihaendige_vergabe', 'direktauftrag',
]

export function getVerfahrensartenFuer(
  oberschwelle: boolean,
  auftragsart?: Auftragsart | null,
): Verfahrensart[] {
  if (oberschwelle) return VERFAHRENSARTEN_OBERSCHWELLE
  if (auftragsart === 'bauauftrag') return VERFAHRENSARTEN_VOBA
  return VERFAHRENSARTEN_UVGO
}

// --- Auftraggeber ---

export type Auftraggeberebene = 'bund' | 'land' | 'kommune'

export const AUFTRAGGEBEREBENE_LABELS: Record<Auftraggeberebene, string> = {
  bund: 'Bund',
  land: 'Land',
  kommune: 'Kommune',
}

// All Verfahrensart values for Zod enum
const ALL_VERFAHRENSARTEN = [
  'offen', 'nichtoffen', 'verhandlung_mit_twb', 'verhandlung_ohne_twb',
  'wettbewerb', 'innovationspartnerschaft',
  'oeffentliche_ausschreibung', 'beschraenkte_mit_twb', 'beschraenkte_ohne_twb',
  'verhandlungsvergabe_mit_twb', 'verhandlungsvergabe_ohne_twb', 'direktauftrag',
  'freihaendige_vergabe',
  'verhandlung', 'direktvergabe',
] as const

// --- Zod Schemas ---

export const termineSchema = z.object({
  bekanntmachung: z.string().nullable().optional(),
  teilnahmefrist: z.string().nullable().optional(),
  angebotsfrist: z.string().nullable().optional(),
  bindefrist: z.string().nullable().optional(),
  zuschlag: z.string().nullable().optional(),
  vertragsstart: z.string().nullable().optional(),
}).strict()
export type Termine = z.infer<typeof termineSchema>

export const auftraggeberSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  ebene: z.enum(['bund', 'land', 'kommune']).nullable().optional(),
  kontakt: z.string().max(500).nullable().optional(),
}).strict()
export type Auftraggeber = z.infer<typeof auftraggeberSchema>

export const projektDataSchema = z.object({
  vergaberecht: z.enum(VERGABERECHT_OPTIONS).nullable().optional(),
  verfahrensart: z.enum(ALL_VERFAHRENSARTEN).nullable().optional(),
  auftragsart: z.enum(AUFTRAGSART_OPTIONS).nullable().optional(),
  cpvCode: z.string().max(20).nullable().optional(),
  schaetzwert: z.number().min(0).max(999_999_999).nullable().optional(),
  oberschwelle: z.boolean().nullable().optional(),
  termine: termineSchema.nullable().optional(),
  auftraggeber: auftraggeberSchema.nullable().optional(),
  notizen: z.string().max(5000).nullable().optional(),
  settings: z.object({
    defaultCategory: z.enum(['spec', 'research', 'contract', 'formblatt', 'other']).nullable().optional(),
    allowedFileTypes: z.array(z.enum(['pdf', 'docx', 'txt', 'images', 'xlsx'])).nullable().optional(),
    requireApproval: z.boolean().nullable().optional(),
    autoTagging: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
}).strict()
export type ProjektData = z.infer<typeof projektDataSchema>

// --- View Types ---

export type ProjectMeta = {
  id: string | number
  name: string
  projectStatus: ProjectStatus | null
  createdAt: string
  updatedAt: string
}

export type ProjectListItem = ProjectMeta & {
  data?: ProjektData | null
}
