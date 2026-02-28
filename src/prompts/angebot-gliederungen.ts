import type { AnfrageGliederungsvorschlag } from '@/types/angebot'

interface GliederungsDefinition {
  label: string
  description: string
  promptSection: string
}

export const ANFRAGE_GLIEDERUNGEN: Record<AnfrageGliederungsvorschlag, GliederungsDefinition> = {
  geschaeftlich: {
    label: 'Geschäftliche Anfrage',
    description: 'Kurz, direkt, B2B — kein Vergaberecht',
    promptSection: `## Stil & Struktur: Geschäftliche Anfrage

Schreibe eine kurze, direkte B2B-Anfrage ohne vergaberechtliche Formalitäten.

Struktur:
1. Betreff
2. Kurze Einleitung (1–2 Sätze, wer fragt an und warum)
3. Leistungsumfang (Aufzählung der gewünschten Leistungen)
4. Gewünschte Angaben im Angebot (Preis, Lieferzeit, Konditionen)
5. Frist und Kontaktdaten
6. Freundlicher Schluss

Tonalität: Professionell, aber nicht bürokratisch. Geschäftliche Korrespondenz, keine Ausschreibung.
Einleitung z.B.: "wir suchen einen Dienstleister für …" / "wir möchten folgende Leistungen anfragen …"
Schluss z.B.: "Wir freuen uns auf Ihr Angebot." / "Für Rückfragen stehen wir gerne zur Verfügung."`,
  },

  formal: {
    label: 'Formale Angebotsanfrage',
    description: 'DIN-5008-nah, Positionstabelle, Konditionen',
    promptSection: `## Stil & Struktur: Formale Angebotsanfrage

Erstelle eine formale, strukturierte Angebotsanfrage orientiert an DIN 5008.

Struktur:
1. **Betreff** — Prägnanter Titel der Anfrage
2. **Kurzbeschreibung** — 2–3 Sätze zum Vorhaben
3. **Leistungsumfang** — Detaillierte Aufstellung der geforderten Leistungen, idealerweise als nummerierte Positionstabelle
4. **Anforderungen an den Anbieter** — Qualifikationen, Zertifizierungen, Referenzen
5. **Bewertungskriterien** — Nach welchen Kriterien die Angebote bewertet werden
6. **Zeitrahmen** — Fristen für Angebotsabgabe, geplanter Leistungszeitraum
7. **Angebotsformat** — Welche Unterlagen und Informationen das Angebot enthalten muss
8. **Konditionen** — Zahlungsbedingungen, Gewährleistung

Tonalität: Formell, sachlich, vergaberechtlich orientiert.
Einleitung z.B.: "Hiermit laden wir Sie ein, ein Angebot für folgende Leistungen abzugeben."
Schluss z.B.: "Wir bitten um Zusendung Ihres Angebots bis zum [Frist]."`,
  },

  itBeschaffung: {
    label: 'IT-Beschaffung',
    description: 'IT-Fokus, technische Anforderungen, Systemanforderungen',
    promptSection: `## Stil & Struktur: IT-Beschaffung

Erstelle eine Angebotsanfrage mit IT-Fokus. Betone technische Anforderungen und Systemlandschaft.

Struktur:
1. **Betreff** — IT-Vorhaben benennen
2. **Ausgangslage** — Aktuelle Systemlandschaft und Anlass der Beschaffung
3. **Leistungsumfang** — Geforderte IT-Leistungen (Software, Hardware, Dienstleistungen)
4. **Technische Anforderungen** — Systemanforderungen, Schnittstellen, Kompatibilität, Standards
5. **Anforderungen an den Anbieter** — IT-Kompetenzen, Zertifizierungen, Support-Modell
6. **Projektrahmen** — Zeitplan, Meilensteine, Einführungsstrategie
7. **Angebotsformat** — Geforderte Angebotsstruktur inkl. technischem Konzept und Preisblatt
8. **Service & Support** — Wartung, SLA, Reaktionszeiten

Tonalität: Fachlich-technisch, präzise. Verwende IT-Fachbegriffe wo angemessen.
Betone Schnittstellenbeschreibung, Datenmigration und Systemintegration wo relevant.`,
  },
}
