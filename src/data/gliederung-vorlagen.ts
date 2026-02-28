export type GliederungVorlage = {
  id: string
  name: string
  beschreibung: string
  /** Gliederungspunkte als String-Array — wird direkt in den Prompt injiziert */
  gliederung: string[]
}

export const GLIEDERUNG_VORLAGEN: GliederungVorlage[] = [
  {
    id: 'standard',
    name: 'Standard',
    beschreibung: 'Allgemeine Gliederung (Bedarf, Ziel, Leistungsbeschreibung, Zeitplanung)',
    gliederung: [
      '1. Titel und Leistungstyp',
      '2. Bedarf (Ausgangssituation, Problemstellung, Bedarfsumfang)',
      '3. Ziel (Gewünschte Ergebnisse, Nutzen, Erfolgskriterien)',
      '4. Leistungsbeschreibung (Hauptbereiche mit Unterbereichen)',
      '5. Zeitplanung (Gesamtdauer, Meilensteine mit Aktivitäten und Liefergegenständen)',
    ],
  },
  {
    id: 'it-beratung',
    name: 'IT-Beratung',
    beschreibung: 'Strategie-, Architektur- und Prozessberatung (EVB-IT Dienstvertrag)',
    gliederung: [
      '1. Gegenstand und Ziel der Leistung (Ausgangssituation, Zielsetzung, erwartete Ergebnisse)',
      '2. Rahmenbedingungen (Organisation des AG, bestehende IT-Landschaft, geltende Standards, Datenschutz)',
      '3. Leistungsumfang (Beratungsfelder, Workshops, Dokumentation, Präsentationen, optionale Leistungen)',
      '4. Anforderungen an das Personal (Qualifikationsprofile, Branchenerfahrung, Zertifizierungen)',
      '5. Mitwirkungspflichten des Auftraggebers (Informationen, Ansprechpartner, Räumlichkeiten)',
      '6. Zeitplanung und Meilensteine (Leistungszeitraum, Phasenplanung, Abnahmen)',
      '7. Leistungsort und Leistungszeiten (Einsatzorte, Remote-Anteile, Verfügbarkeit)',
      '8. Qualitätssicherung und Berichtswesen (Statusberichte, Qualitätskriterien, Eskalation)',
    ],
  },
  {
    id: 'saas-cloud',
    name: 'SaaS / Cloud',
    beschreibung: 'Software-as-a-Service und Cloud-Lösungen (EVB-IT Cloud)',
    gliederung: [
      '1. Leistungsgegenstand (Beschreibung der Cloud-Lösung, Funktionskatalog, Lizenzmodell)',
      '2. Technische Anforderungen (Architektur, APIs, Kompatibilität, Performance, Mandantenfähigkeit)',
      '3. Datenschutz und Informationssicherheit (Datenstandort EU, DSGVO, Zertifizierungen ISO 27001/BSI C5)',
      '4. Service Level und Verfügbarkeit (Verfügbarkeitsquote, Wartungsfenster, Support, Incident-Management)',
      '5. Einmalige Leistungen (Einrichtung, Datenmigration, Schulung, Customizing)',
      '6. Laufende Leistungen (Hosting, Updates, Backup, Monitoring)',
      '7. Mitwirkungsleistungen des Auftraggebers (Daten, Testumgebungen, Abnahmen)',
      '8. Exit-Regelungen (Datenmigration bei Vertragsende, Transition, Löschung)',
    ],
  },
  {
    id: 'software-entwicklung',
    name: 'Software-Entwicklung',
    beschreibung: 'Individuelle Software-Entwicklung (EVB-IT Erstellungsvertrag)',
    gliederung: [
      '1. Ausgangslage und Zielsetzung (Fachlicher Hintergrund, Problemstellung, Abgrenzung)',
      '2. Anforderungen an das System (Funktionale Anforderungen, Nicht-funktionale Anforderungen, Schnittstellen, UI/UX)',
      '3. Technologische Rahmenbedingungen (Ziel-Plattform, Programmiersprachen, Systemlandschaft, Umgebungen)',
      '4. Vorgehensmodell und Projektorganisation (Agil/Wasserfall, Rollen, Sprint-Planung, Kommunikation)',
      '5. Qualitätssicherung und Test (Testkonzept, Testarten, Abnahmekriterien)',
      '6. Dokumentation (Technische Doku, Anwender-Doku, Schulungsunterlagen)',
      '7. Liefergegenstände und Meilensteine (Liefergegenstände je Phase, Abnahmezeitpunkte, Rollout)',
      '8. Wartung und Pflege (Gewährleistung, Pflegevertrag, Weiterentwicklung)',
    ],
  },
  {
    id: 'it-infrastruktur',
    name: 'IT-Infrastruktur',
    beschreibung: 'Hardware-Beschaffung inkl. Installation (EVB-IT Kaufvertrag/Systemvertrag)',
    gliederung: [
      '1. Beschaffungsgegenstand (Art der Hardware, Stückzahlen, Einsatzzweck)',
      '2. Technische Anforderungen (Mindestanforderungen, Energieeffizienz, Ergonomie, Kompatibilität)',
      '3. Lieferung und Logistik (Lieferorte, Lieferfristen, Verpackung, Teillieferungen)',
      '4. Installation und Inbetriebnahme (Aufbau, Konfiguration, Integration, Funktionstest)',
      '5. Garantie und Service (Gewährleistung, Vor-Ort-Service, Reaktionszeiten, Ersatzteile)',
      '6. Nachhaltigkeit (Zertifizierungen, Recyclingfähigkeit, Rücknahme Altgeräte)',
      '7. Schulung und Einweisung (Administratoren, Anwender, Unterlagen)',
    ],
  },
  {
    id: 'leistungsverzeichnis',
    name: 'Leistungsverzeichnis',
    beschreibung: 'Formaler tabellarischer Aufbau mit Positionen (LV-Format)',
    gliederung: [
      '1. Allgemeine Vorbemerkungen (Gegenstand, Vertragsbedingungen, Hinweise zur Angebotsabgabe)',
      '2. Los-/Fachlos-Übersicht (Losaufteilung, Kombinationsangebote)',
      '3. Positionen mit Detailbeschreibung (Pos.-Nr., Kurztext, Langtext, Mengeneinheit, geschätzte Menge)',
      '4. Positionstypen (Grundpositionen, Bedarfspositionen, Wahlpositionen, Zulagepositionen)',
      '5. Summenblatt (Nettosumme je Los, Gesamtsumme, USt., Bruttosumme)',
      '6. Anlagen (Technische Spezifikationen, Mengengerüst, Preisblatt)',
    ],
  },
  {
    id: 'facility-management',
    name: 'Facility Management',
    beschreibung: 'Gebäudemanagement und Facility Services (GEFMA 510/520)',
    gliederung: [
      '1. Auftragsgegenstand (Art der FM-Leistung, Vertragsobjekte, Standorte)',
      '2. Objektbeschreibung (Gebäudedaten, Raumverzeichnis, Flächen, technische Anlagen)',
      '3. Leistungsbeschreibung nach Gewerken (Reinigung, Glasreinigung, Außenanlagen, Wartung, Störungsmanagement)',
      '4. Personalanforderungen (Objektleitung, Qualifikation, Tariftreue, Vertretung)',
      '5. Qualitätsmanagement (Messsystem, Eigenkontrollen, AG-Kontrollen, Malusregelungen)',
      '6. Service Level (SLA-Definitionen, Reaktionszeiten, Eskalation)',
      '7. Umwelt- und Nachhaltigkeitsanforderungen (Reinigungsmittel, Entsorgung, Energieeinsparung)',
      '8. Vertragslaufzeit und Transition (Einarbeitungsphase, Verlängerung, Übergang)',
    ],
  },
  {
    id: 'schulung',
    name: 'Schulung / Training',
    beschreibung: 'Schulungen, Trainings und Weiterbildungen',
    gliederung: [
      '1. Ziel und Gegenstand (Schulungsziele, Themengebiet, Kompetenzlevel)',
      '2. Zielgruppe (Teilnehmerkreis, Vorkenntnisse, Teilnehmerzahl)',
      '3. Didaktisches Konzept (Methodik, Theorie-Praxis-Verhältnis, Barrierefreiheit)',
      '4. Schulungsinhalte / Curriculum (Module, Übungen, Lernzielkontrolle, Zertifizierung)',
      '5. Durchführung (Präsenz/Online/Hybrid, Dauer, Veranstaltungsort, technische Ausstattung)',
      '6. Anforderungen an Trainer (Fachliche Qualifikation, didaktische Erfahrung, Branchenerfahrung)',
      '7. Schulungsunterlagen und Nachbereitung (Materialien, Evaluation, Nachbetreuung, Nutzungsrechte)',
    ],
  },
  {
    id: 'managed-services',
    name: 'Managed Services',
    beschreibung: 'IT-Betrieb und Managed Services (ITIL-basiert)',
    gliederung: [
      '1. Leistungsgegenstand (Ist-Zustand, zu übernehmende Betriebsleistungen, Scope-Abgrenzung)',
      '2. Service-Prozesse (Incident-, Problem-, Change-, Release-Management nach ITIL)',
      '3. Einzelleistungen je Service-Bereich (Server, Netzwerk, Client, Anwendungen, Datenbanken, Backup, Security, Helpdesk)',
      '4. Service Level Agreements (Verfügbarkeit, Servicezeiten, Reaktionszeiten, KPIs, Bonus/Malus)',
      '5. Transition und Übernahme (Planung, Wissenstransfer, Parallelbetrieb, Abnahme)',
      '6. Personalanforderungen (Teamstruktur, Qualifikationen, Key-Personnel, Präsenz)',
      '7. Sicherheit und Datenschutz (Sicherheitskonzept, AVV, Zugangsregelungen)',
      '8. Exit-Management (Transitionsunterstützung, Dokumentationsübergabe, Datenmigration)',
    ],
  },
  {
    id: 'kreativ-marketing',
    name: 'Kreativ / Marketing',
    beschreibung: 'Agenturleistungen, Corporate Design, Kampagnen',
    gliederung: [
      '1. Aufgabenstellung und Projektziel (Hintergrund, Kommunikationsziele, Zielgruppen, Kernbotschaften)',
      '2. Leistungsumfang (Beratung, Corporate Design, Kampagne, Grafikdesign, Web, Social Media, Text, Foto/Video)',
      '3. Kreatives Briefing (Bestehende Marke, Tonalität, Bildsprache, Referenzen, technische Vorgaben)',
      '4. Prozess und Abstimmung (Konzeptphase, Korrekturschleifen, Freigabeprozess)',
      '5. Nutzungsrechte und Lizenzen (Umfang, exklusiv/nicht-exklusiv, Bearbeitung, Urheberbenennung)',
      '6. Liefergegenstände und Formate (Reinzeichnungen, Druckdaten, Quelldateien, Styleguides)',
      '7. Zeitplanung (Projektlaufzeit, Meilensteine, Deadlines)',
    ],
  },
  {
    id: 'forschung-gutachten',
    name: 'Forschung / Gutachten',
    beschreibung: 'Wissenschaftliche Studien und Gutachten',
    gliederung: [
      '1. Gegenstand und Zielsetzung (Fragestellung, Hintergrund, Erkenntnisinteresse, Verwertungszweck)',
      '2. Inhaltlicher Rahmen (Untersuchungsgegenstand, Abgrenzung, Stand der Forschung, Datenquellen)',
      '3. Methodische Anforderungen (Ansatz, Datenerhebung, Stichprobe, Analysemethoden)',
      '4. Liefergegenstände (Zwischenbericht, Endbericht, Executive Summary, Präsentationen, Handlungsempfehlungen)',
      '5. Qualitätssicherung (Wissenschaftliche Standards, Peer Review, Steuerungsgruppe)',
      '6. Anforderungen an den Auftragnehmer (Qualifikation, Expertise, Publikationen, Unabhängigkeit)',
      '7. Mitwirkungsleistungen des Auftraggebers (Daten, Zugang zu Experten, Abstimmungen)',
      '8. Nutzungs- und Veröffentlichungsrechte (Urheberrecht, Veröffentlichungsbefugnis, Open Access)',
    ],
  },
]

export function getVorlageById(id: string): GliederungVorlage | undefined {
  return GLIEDERUNG_VORLAGEN.find((v) => v.id === id)
}
