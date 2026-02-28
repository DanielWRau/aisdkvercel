import type { FristenConfig } from '@/types/user-settings'
import { DEFAULT_FRISTEN_CONFIG } from '@/types/user-settings'

/**
 * Berechnet Termine basierend auf Bekanntmachungsdatum und Verfahrensart.
 * Nutzt die Nutzereinstellungen für konfigurierbare Fristen.
 */
export function berechneTermine(
  bekanntmachungsDatum: Date,
  verfahrensart: string,
  oberschwelle: boolean,
  config: FristenConfig = DEFAULT_FRISTEN_CONFIG,
): Record<string, Date> {
  const termine: Record<string, Date> = {}

  const addTage = (datum: Date, tage: number): Date => {
    const result = new Date(datum)
    result.setDate(result.getDate() + tage)
    return result
  }

  if (oberschwelle) {
    const os = config.oberschwelle

    const osMapping: Record<string, string> = {
      verhandlung_mit_twb: 'verhandlung',
      verhandlung_ohne_twb: 'direktvergabe',
      innovationspartnerschaft: 'wettbewerb',
    }
    const osMapped = osMapping[verfahrensart] || verfahrensart

    switch (osMapped) {
      case 'offen':
        termine.angebotsfrist = addTage(bekanntmachungsDatum, os.offenAngebotsfrist)
        termine.bieterfragenFrist = addTage(termine.angebotsfrist, -config.allgemein.bieterfragenVorlauf)
        break
      case 'nichtoffen':
      case 'verhandlung':
        termine.teilnahmefrist = addTage(bekanntmachungsDatum, os.nichtoffenTeilnahmefrist)
        termine.angebotsfrist = addTage(termine.teilnahmefrist, os.nichtoffenAngebotsfrist)
        termine.bieterfragenFrist = addTage(termine.angebotsfrist, -config.allgemein.bieterfragenVorlauf)
        break
      case 'wettbewerb':
        termine.teilnahmefrist = addTage(bekanntmachungsDatum, os.nichtoffenTeilnahmefrist)
        termine.angebotsfrist = addTage(termine.teilnahmefrist, os.nichtoffenAngebotsfrist + 30)
        termine.bieterfragenFrist = addTage(termine.angebotsfrist, -config.allgemein.bieterfragenVorlauf)
        break
      case 'direktvergabe':
        termine.angebotsfrist = addTage(bekanntmachungsDatum, 10)
        break
    }

    if (termine.angebotsfrist) {
      termine.bindefrist = addTage(termine.angebotsfrist, config.allgemein.bindefrist)
      termine.zuschlag = addTage(termine.angebotsfrist, os.auswertungszeit + os.stillhaltefrist)
      termine.vertragsstart = addTage(termine.zuschlag, 14)
    }
  } else {
    const us = config.unterschwelle

    const usMapping: Record<string, string> = {
      oeffentliche_ausschreibung: 'offen',
      beschraenkte_mit_twb: 'nichtoffen',
      beschraenkte_ohne_twb: 'nichtoffen',
      verhandlungsvergabe_mit_twb: 'verhandlung',
      verhandlungsvergabe_ohne_twb: 'direktvergabe',
      freihaendige_vergabe: 'verhandlung',
      direktauftrag: 'direktvergabe',
    }
    const mappedKey = usMapping[verfahrensart] || verfahrensart

    switch (mappedKey) {
      case 'offen':
        termine.angebotsfrist = addTage(bekanntmachungsDatum, us.offenAngebotsfrist)
        break
      case 'nichtoffen':
        termine.teilnahmefrist = addTage(bekanntmachungsDatum, us.nichtoffenTeilnahmefrist)
        termine.angebotsfrist = addTage(termine.teilnahmefrist, us.nichtoffenAngebotsfrist)
        break
      case 'verhandlung':
        termine.teilnahmefrist = addTage(bekanntmachungsDatum, us.nichtoffenTeilnahmefrist)
        termine.angebotsfrist = addTage(termine.teilnahmefrist, us.direktvergabeAngebotsfrist)
        break
      case 'direktvergabe':
        termine.angebotsfrist = addTage(bekanntmachungsDatum, us.direktvergabeAngebotsfrist)
        break
    }

    if (termine.angebotsfrist) {
      termine.bindefrist = addTage(termine.angebotsfrist, config.allgemein.bindefrist)
      termine.zuschlag = addTage(termine.angebotsfrist, us.auswertungszeit)
      termine.vertragsstart = addTage(termine.zuschlag, 7)
    }
  }

  return termine
}
