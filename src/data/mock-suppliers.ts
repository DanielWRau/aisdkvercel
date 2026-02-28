import type { Supplier } from '@/types/angebot'

/**
 * Musterdaten für den Angebotsvergleich.
 * Geheimer Trigger: Doppelklick auf den Projektnamen.
 */
export const mockSuppliers: Omit<Supplier, 'id'>[] = [
  {
    name: 'DataVision GmbH',
    kontakt: 'vertrieb@datavision-gmbh.de',
    website: 'https://www.datavision-gmbh.de',
    angebotText: `Angebot Nr. AV-2026-0412
Datum: 20.02.2026

Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage. Wir unterbreiten Ihnen folgendes Angebot:

1. LEISTUNGSUMFANG
- Bereitstellung einer cloudbasierten Plattform (SaaS) mit mandantenfähiger Architektur
- Implementierung und Konfiguration gemäß Anforderungskatalog
- Migration bestehender Datenbestände (bis 500.000 Datensätze)
- Anbindung an bestehende Systeme via REST-API und LDAP
- Schulung für bis zu 25 Key-User (3 Tage vor Ort)

2. PREISE (netto)
- Einmalige Einrichtung und Konfiguration: 45.000 €
- Datenmigration (pauschal): 12.000 €
- Schulung (3 Tage, bis 25 Teilnehmer): 6.000 €
- Monatliche Lizenzgebühr (bis 200 Nutzer): 3.200 €/Monat
- Support-Paket Premium (Mo–Fr, 8–18 Uhr, 4h Reaktionszeit): 800 €/Monat
- Optionale Individualentwicklung: 1.400 €/Personentag

Gesamtkosten 1. Jahr: 111.000 €
Laufende Kosten ab Jahr 2: 48.000 €/Jahr

3. ZEITRAHMEN
- Projektstart: 4 Wochen nach Beauftragung
- Go-Live: 12 Wochen nach Projektstart
- Pilotphase: 4 Wochen mit dediziertem Ansprechpartner

4. REFERENZEN
- Stadtverwaltung Karlsruhe (2024, 800 Nutzer)
- Landesamt für Digitalisierung Bayern (2025, 1.200 Nutzer)
- IHK Region Stuttgart (2025, 350 Nutzer)

5. ZERTIFIZIERUNGEN
- ISO 27001 (Informationssicherheit)
- BSI C5 Testat (Cloud-Sicherheit)
- Rechenzentrum in Frankfurt am Main (DSGVO-konform)

Dieses Angebot ist gültig bis 30.04.2026.

Mit freundlichen Grüßen
Dr. Martin Schäfer
Vertriebsleitung Öffentlicher Sektor
DataVision GmbH`,
  },
  {
    name: 'NordSoft AG',
    kontakt: 'angebote@nordsoft.de',
    website: 'https://www.nordsoft.de',
    angebotText: `ANGEBOT NR. NS-2026-1187

Angebotsdatum: 18.02.2026
Gültig bis: 18.04.2026

Betreff: Digitale Plattformlösung gemäß Leistungsbeschreibung

Sehr geehrte Damen und Herren,

nachfolgend unser verbindliches Angebot:

POSITION 1 – SOFTWARELIZENZEN
Unbefristete Lizenz für bis zu 250 Arbeitsplätze
On-Premise oder Private-Cloud Deployment
Einmalpreis: 85.000 € (netto)

POSITION 2 – IMPLEMENTIERUNG
Projektleitung und Konfiguration: 35 Personentage à 1.250 €
Summe: 43.750 €

POSITION 3 – DATENMIGRATION
Analyse, Mapping und Migration: pauschal 18.500 €
Inkl. Datenbereinigung und Qualitätssicherung

POSITION 4 – SCHULUNG UND DOKUMENTATION
Administratorschulung (2 Tage): 3.500 €
Anwenderschulung (3 Tage, bis 30 TN): 5.200 €
Benutzerhandbuch (deutsch): inkl.

POSITION 5 – WARTUNG UND SUPPORT (jährlich)
Software-Wartung inkl. Updates: 12.750 €/Jahr (15% vom Lizenzpreis)
Support Business (Mo–Fr, 9–17 Uhr): 6.000 €/Jahr
Support Premium (Mo–So, 7–22 Uhr, 2h Reaktionszeit): 14.400 €/Jahr

ZUSAMMENFASSUNG
Einmalige Kosten: 155.950 €
Laufende Kosten (Business Support): 18.750 €/Jahr
Laufende Kosten (Premium Support): 27.150 €/Jahr

BESONDERE MERKMALE
- Quellcode-Hinterlegung (Escrow) möglich
- Hosting im eigenen Rechenzentrum oder bei uns (Standort Hamburg)
- Barrierefreie Oberfläche nach BITV 2.0
- Mandantenfähig mit granularem Rollenkonzept

REFERENZEN
- Freie und Hansestadt Hamburg, Behörde für Stadtentwicklung (2023)
- Universität Göttingen, Verwaltung (2024)
- Bundesanstalt für Materialforschung (2025)

ZERTIFIZIERUNGEN
- ISO 9001:2015
- ISO 27001:2022
- Made in Germany – Entwicklung und Support aus Hamburg

Mit freundlichen Grüßen
Katharina Berger
Key Account Management
NordSoft AG`,
  },
  {
    name: 'CloudBridge Solutions',
    kontakt: '+49 30 9988 7766',
    website: 'https://www.cloudbridge.io',
    angebotText: `cloudbridge solutions | angebot

Projekt-Ref: CB-PUB-2026-0219
Erstellt: 19.02.2026

== EXECUTIVE SUMMARY ==

CloudBridge Solutions bietet eine vollständig modulare Cloud-Plattform, die speziell für den öffentlichen Sektor entwickelt wurde. Unser Ansatz: Pay-as-you-grow mit transparenter Preisstruktur.

== LÖSUNGSANSATZ ==

Microservice-basierte Architektur auf Kubernetes
- Modularer Aufbau: nur benötigte Module werden aktiviert
- Auto-Scaling je nach Last
- Multi-Cloud-fähig (eigenes RZ oder Sovereign Cloud)

== KOSTENÜBERSICHT (netto) ==

Setup & Onboarding
  Initiale Konfiguration .................. 22.000 €
  Datenmigration (Standard) ............... 15.000 €
  Datenmigration (Komplex, >100 Felder) ... 25.000 €
  API-Integration (pro Schnittstelle) ......  4.500 €

Monatliche Kosten (Basispaket, bis 150 Nutzer)
  Plattform-Lizenz .......................  2.100 €/Monat
  Jeder weitere 50-Nutzer-Block ..........    600 €/Monat

Support-Optionen
  Standard (Mo–Fr, 9–17 Uhr, 8h) ........    inkl.
  Professional (Mo–Fr, 8–20 Uhr, 4h) ....    450 €/Monat
  Enterprise (24/7, 1h Reaktionszeit) .... 1.800 €/Monat

Schulung
  Online-Schulung (halbtägig, bis 20 TN) .  1.500 €
  Vor-Ort-Workshop (ganztägig) ...........  3.200 €

== KOSTENBEISPIEL: 200 NUTZER, 3 JAHRE ==

Jahr 1: 22.000 + 15.000 + (2.700 × 12) + (450 × 12) = 74.800 €
Jahr 2: (2.700 × 12) + (450 × 12) = 37.800 €
Jahr 3: (2.700 × 12) + (450 × 12) = 37.800 €
GESAMT 3 JAHRE: 150.400 €

== ALLEINSTELLUNGSMERKMALE ==

✓ Sovereign Cloud Option (Delos Cloud / IONOS)
✓ Open-Source-Kern – kein Vendor Lock-in
✓ GraphQL + REST APIs
✓ SSO via SAML 2.0 / OpenID Connect
✓ Automatisierte Compliance-Reports (BSI IT-Grundschutz)
✓ CO₂-neutrales Hosting

== REFERENZEN ==

• Deutsches Zentrum für Luft- und Raumfahrt (DLR), 2025
• Stadt Bonn, Digitalisierungsprogramm, 2024
• Leibniz-Gemeinschaft, Forschungsdatenmanagement, 2025

== ZERTIFIZIERUNGEN ==

ISO 27001 | SOC 2 Type II | BSI C5 | TISAX

Kontakt: Jan-Henrik Möller, Public Sector Lead
Tel: +49 30 9988 7766 | jan.moeller@cloudbridge.io`,
  },
  {
    name: 'Meridian IT-Consulting',
    kontakt: 'vergabe@meridian-itc.de',
    website: 'https://www.meridian-itc.de',
    angebotText: `MERIDIAN IT-CONSULTING
Angebot zur Ausschreibung – Digitale Plattformlösung

Angebotsnummer: MER-2026-V-0055
Datum: 21.02.2026
Bindefrist: 60 Tage

───────────────────────────────────────

1. UNTERNEHMENSPROFIL

Meridian IT-Consulting ist seit 2008 auf IT-Lösungen für die öffentliche Verwaltung spezialisiert. Mit über 180 Mitarbeitern an den Standorten München, Berlin und Leipzig betreuen wir mehr als 120 Kunden im öffentlichen Sektor.

2. LÖSUNGSBESCHREIBUNG

Wir bieten eine hybride Lösung auf Basis unserer bewährten Plattform "MeridianGov":
- Web-Anwendung mit responsivem Design
- On-Premise-Kern mit optionaler Cloud-Erweiterung
- Dokumentenmanagement mit revisionssicherer Archivierung
- Workflow-Engine für Genehmigungsprozesse
- Integriertes Reporting und Dashboards

3. PREISBLATT

3.1 Einmalige Kosten
    Lizenz (Perpetual, 200 User)          72.000 €
    Projektmanagement (pauschal)           15.000 €
    Systemkonfiguration                    28.000 €
    Datenmigration                         20.000 €
    Schnittstellenentwicklung (3 Systeme)  21.000 €
    Abnahme und Dokumentation               8.000 €
    ─────────────────────────────────────
    Summe einmalig                        164.000 €

3.2 Jährliche Kosten
    Softwarepflege (18%)                   12.960 €
    Support Standard                        7.200 €
    ─────────────────────────────────────
    Summe jährlich                         20.160 €

3.3 Schulungen
    Admin-Schulung (2×2 Tage)              8.800 €
    Anwender-Schulung (5×1 Tag)            7.500 €
    E-Learning-Plattform (1 Jahr)          3.600 €
    ─────────────────────────────────────
    Summe Schulung                         19.900 €

3.4 Optionale Leistungen
    Premium Support (24/7)                 18.000 €/Jahr
    Managed Hosting                        14.400 €/Jahr
    Jährlicher Security Audit               6.500 €/Jahr

GESAMTKOSTEN JAHR 1: 204.060 €
LAUFENDE KOSTEN AB JAHR 2: 20.160 €

4. PROJEKTZEITPLAN

    Woche 1–2:    Kick-off und Anforderungsworkshop
    Woche 3–8:    Konfiguration und Entwicklung
    Woche 9–10:   Datenmigration und Tests
    Woche 11–12:  Pilotbetrieb
    Woche 13–14:  Schulungen
    Woche 15:     Go-Live
    Woche 16–20:  Hypercare-Phase

5. TEAM

    Projektleiter: Andreas Winkler (PMP, 15 Jahre Erfahrung)
    Solution Architect: Dr. Lisa Hofmann
    Lead Developer: Tobias Krüger
    Migrations-Spezialist: Maria Santos

6. REFERENZEN

    • Bayerisches Staatsministerium für Digitales (2024)
    • Landkreis Mittelsachsen (2025)
    • Studentenwerk München (2025)
    • Bezirksregierung Düsseldorf (2023)

7. ZERTIFIZIERUNGEN UND COMPLIANCE

    ISO 27001:2022 | ISO 9001:2015
    BSI IT-Grundschutz (Zertifikat)
    EVB-IT Rahmenvertrag erfahren
    DSGVO-Verarbeitungsverzeichnis vorhanden

Mit freundlichen Grüßen

Dipl.-Inf. Andreas Winkler
Bereichsleiter Public Sector
Meridian IT-Consulting`,
  },
]
