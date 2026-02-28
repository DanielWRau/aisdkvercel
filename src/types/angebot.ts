import { z } from 'zod'

export const supplierSchema = z.object({
  id: z.string().min(1).max(36),
  name: z.string().min(1).max(200),
  kontakt: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  angebotText: z.string().max(50_000).optional(),
})

export const anfrageLaengeSchema = z.enum(['kurz', 'mittel', 'lang'])
export type AnfrageLaenge = z.infer<typeof anfrageLaengeSchema>

export const anfrageGliederungsvorschlagSchema = z.enum([
  'geschaeftlich',
  'formal',
  'itBeschaffung',
])
export type AnfrageGliederungsvorschlag = z.infer<typeof anfrageGliederungsvorschlagSchema>

export const anfrageSettingsSchema = z.object({
  laenge: anfrageLaengeSchema.optional(),
  gliederung: anfrageGliederungsvorschlagSchema.optional(),
  angebotsfrist: z.string().max(100).optional(),
  liefertermin: z.string().max(100).optional(),
  ansprechpartner: z.string().max(200).optional(),
  customInstructions: z.string().max(2000).optional(),
})

export type AnfrageSettings = z.infer<typeof anfrageSettingsSchema>

export const angebotsDraftContentSchema = z.object({
  suppliers: z.array(supplierSchema).max(20),
  anfrageSettings: anfrageSettingsSchema.optional(),
})

export const DRAFT_MAX_JSON_SIZE = 1_500_000

export type Supplier = z.infer<typeof supplierSchema>
export type AngebotsDraftContent = z.infer<typeof angebotsDraftContentSchema>
export type AngebotsResultTab = 'anfrage' | 'vergleich'

// Context source for Angebotsanfrage — indicates which document type the context comes from
export const anfrageContextSourceSchema = z.enum([
  'leistungsbeschreibung',
  'marketResearch',
  'askQuestions',
])
export type AnfrageContextSource = z.infer<typeof anfrageContextSourceSchema>

// API Request Schemas
export const anfrageRequestSchema = z.object({
  projectId: z.union([z.string().min(1), z.number()]),
  context: z.string().min(30).max(100_000),
  contextSource: anfrageContextSourceSchema,
  settings: anfrageSettingsSchema.optional(),
})

export const vergleichRequestSchema = z.object({
  projectId: z.union([z.string().min(1), z.number()]),
  leistungsbeschreibung: z.string().max(50_000).optional(),
  suppliers: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        angebotText: z.string().min(10).max(50_000),
      }),
    )
    .min(2)
    .max(20),
})

// Return Contracts
export type AngebotsDraftResult = {
  documentId: string | number
  suppliers: Supplier[]
  anfrageSettings?: AnfrageSettings
  updatedAt: string
} | null

export type AngebotsDocumentSummary = {
  id: string | number
  title: string
  sourceToolType: string
  content?: string | null
  createdAt: string
  updatedAt: string
}

export type AngebotsDocumentsResult = {
  anfrage: AngebotsDocumentSummary | null
  vergleich: AngebotsDocumentSummary | null
}

export type VersionSummary = {
  id: string | number
  createdAt: string
  content?: string | null
}
