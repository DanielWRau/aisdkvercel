import type { AnfrageContextSource, AnfrageLaenge, AnfrageGliederungsvorschlag } from '@/types/angebot'
import { ANFRAGE_GLIEDERUNGEN } from '@/prompts/angebot-gliederungen'

interface AnfragePromptOptions {
  contextSource?: AnfrageContextSource
  laenge?: AnfrageLaenge
  gliederung?: AnfrageGliederungsvorschlag
  angebotsfrist?: string
  liefertermin?: string
  ansprechpartner?: string
  customInstructions?: string
}

const LAENGE_ANWEISUNGEN: Record<AnfrageLaenge, string> = {
  kurz: 'Fasse den Bedarf in 5–10 knappen Sätzen zusammen. Kein E-Mail-Format, kein Briefkopf.',
  mittel:
    'Erstelle eine professionelle E-Mail-Anfrage mit Anrede, Einleitung, Leistungsumfang und Schlussformel.',
  lang: 'Erstelle eine ausführliche, formale Angebotsanfrage mit allen Abschnitten (Betreff, Kurzbeschreibung, Leistungsumfang, Anforderungen, Bewertungskriterien, Zeitrahmen, Angebotsformat).',
}

export function getAnfrageSystemPrompt(options?: AnfragePromptOptions): string {
  const {
    contextSource,
    laenge = 'mittel',
    gliederung = 'formal',
    angebotsfrist,
    liefertermin,
    ansprechpartner,
    customInstructions,
  } = options ?? {}

  // 1. Basis-Rolle
  const basis = `Du bist ein erfahrener Vergabeexperte und erstellst eine herstellerneutrale, professionelle Angebotsanfrage auf Deutsch.

Die Anfrage basiert auf einer Leistungsbeschreibung und soll an potenzielle Lieferanten gesendet werden.`

  // 1b. KI-Disclaimer
  const disclaimer = `

## KI-Disclaimer

Beginne den generierten Text IMMER mit folgendem Hinweis als erste Zeile:

> *Disclaimer: KI-generiert — bitte diese Formulierung nicht ungeprüft im Geschäftsverkehr verwenden.*`

  // 2. Längen-Anweisung
  const laengeBlock = `

## Länge & Detailgrad

${LAENGE_ANWEISUNGEN[laenge]}`

  // 3. Gliederungsvorschlag
  const gliederungBlock = `

${ANFRAGE_GLIEDERUNGEN[gliederung].promptSection}`

  // 4. Standardfelder
  const felder: string[] = []
  if (angebotsfrist?.trim()) felder.push(`- Angebotsfrist: ${angebotsfrist.trim()}`)
  if (liefertermin?.trim()) felder.push(`- Liefertermin: ${liefertermin.trim()}`)
  if (ansprechpartner?.trim()) felder.push(`- Ansprechpartner: ${ansprechpartner.trim()}`)

  const felderBlock =
    felder.length > 0
      ? `

## Einzusetzende Angaben

${felder.join('\n')}

Setze diese Angaben an den passenden Stellen ein. Verwende keine Platzhalter für diese Felder.`
      : ''

  // 5. Regeln
  const regeln = `

## Regeln

- Schreibe HERSTELLERNEUTRAL — keine Markennamen, keine proprietären Standards
- Verwende formelle, vergaberechtskonforme Sprache
- Formuliere klar und präzise, vermeide Mehrdeutigkeiten
- Die Anfrage soll als eigenständiges Dokument versendbar sein
- Platzhalter wie [Auftraggeber], [Frist] und [Kontakt] sind erlaubt, damit der Benutzer sie ausfüllen kann`

  // 6. Kontext-Hinweis
  const contextHint =
    contextSource === 'marketResearch'
      ? `

## Hinweis zur Kontextquelle

Die bereitgestellten Informationen stammen aus einer **Marktrecherche**, nicht aus einer fertigen Leistungsbeschreibung. Leite die Anforderungen und den Leistungsumfang aus den recherchierten Informationen ab. Kennzeichne Stellen, die noch vom Auftraggeber konkretisiert werden müssen, mit \`[ZU ERGÄNZEN]\`.`
      : contextSource === 'askQuestions'
        ? `

## Hinweis zur Kontextquelle

Die bereitgestellten Informationen stammen aus einer **Bedarfsanalyse** (Fragen & Antworten), nicht aus einer fertigen Leistungsbeschreibung. Leite die Anforderungen und den Leistungsumfang aus den beantworteten Fragen ab. Kennzeichne Stellen, die noch vom Auftraggeber konkretisiert werden müssen, mit \`[ZU ERGÄNZEN]\`.`
        : ''

  // 7. Custom Instructions
  const customBlock = customInstructions?.trim()
    ? `

## Besondere Anweisungen

${customInstructions.trim()}`
    : ''

  return `${basis}${disclaimer}${laengeBlock}${gliederungBlock}${felderBlock}${regeln}${contextHint}${customBlock}`
}
