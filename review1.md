# Review: Refactoring `content` (Lexical) -> `markdown` (Text) als Single Source of Truth

## Kurzfazit
Der Plan adressiert ein reales Architekturproblem sauber: aktuell sind Anzeige, Bearbeitung und Storage inkonsistent, und `content` liefert für Tabellen nicht das gewünschte Verhalten. Die vorgeschlagene Richtung (`markdown` als SoT, `jsonData` wieder nur strukturiert) ist fachlich richtig. In der aktuellen Form ist der Rollout aber risikobehaftet: Reihenfolge, Scope der Pfade und Betriebsabsicherung sind nicht ausreichend, was zu Daten-Drift, Feature-Ausfällen (Search/Export/Workflow) und schwer reversiblen Zwischenzuständen führen kann. Vor Umsetzung sollten die unten priorisierten Punkte in den Plan aufgenommen werden.

## Kritische Findings (priorisiert)
1. **[P0] Rollout-Reihenfolge erzeugt Inkonsistenzfenster**
Plan Phase 1 migriert Bestandsdaten, Phase 2 stellt erst danach Write-Pfade auf Dual-Write um. In diesem Fenster schreiben laufende Pfade weiterhin nur `content` bzw. `_editedMarkdown`, sodass `markdown` sofort wieder inkonsistent wird.
Betroffene aktuelle Writes: [`src/lib/persist-tool-result.ts:119`](/Users/danielrau/Developer/aisdkvercel/src/lib/persist-tool-result.ts:119), [`src/actions/documents.ts:163`](/Users/danielrau/Developer/aisdkvercel/src/actions/documents.ts:163), [`src/actions/angebot.ts:117`](/Users/danielrau/Developer/aisdkvercel/src/actions/angebot.ts:117), [`src/tools/save-document.ts:67`](/Users/danielrau/Developer/aisdkvercel/src/tools/save-document.ts:67), [`src/app/(app)/api/angebot/anfrage/route.ts:76`](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/angebot/anfrage/route.ts:76), [`src/app/(app)/api/angebot/vergleich/route.ts:70`](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/angebot/vergleich/route.ts:70).
**Korrektur:** Reihenfolge umdrehen: (a) Schema + Dual-Write deployen, (b) Backfill-Migration, (c) Read-Switch, (d) Cleanup.

2. **[P0] „Alle Schreib-Pfade“ sind im Plan unvollständig**
Der Plan nennt zentrale Stellen, aber nicht alle produktiven `documents`-Writes. Mindestens diese fehlen:
- [`src/tools/save-document.ts:63`](/Users/danielrau/Developer/aisdkvercel/src/tools/save-document.ts:63) (`payload.create` mit `content`, ohne `markdown`)
- [`src/app/(app)/api/angebot/anfrage/route.ts:72`](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/angebot/anfrage/route.ts:72) (`update`/`create` mit `content: text`)
- [`src/app/(app)/api/angebot/vergleich/route.ts:66`](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/angebot/vergleich/route.ts:66) (`update`/`create` mit `content: text`)
**Risiko:** Nach Read-Switch/Content-Removal entstehen leere oder veraltete Anzeigen, Exporte und RAG-Inhalte für genau diese Dokumente.

3. **[P1] Read-Pfad-Scope ebenfalls unvollständig (Search/Workflow brechen nach Cleanup)**
Plan Phase 3 fokussiert Panel/Actions/Export/Vectorize, aber weitere produktive Leser bleiben auf `content`/`jsonData`.
- Knowledge Search filtert Dokumente aktuell über `content != null`: [`src/tools/knowledge-search.ts:58`](/Users/danielrau/Developer/aisdkvercel/src/tools/knowledge-search.ts:58). Nach Entfernen von `content` werden Dokumente ggf. gar nicht mehr eingebettet/gefunden.
- Formblatt-Kontext baut auf `getContentAsMarkdown(doc.content)`: [`src/app/(dashboard)/projects/[id]/api/formblatt/route.ts:52`](/Users/danielrau/Developer/aisdkvercel/src/app/(dashboard)/projects/[id]/api/formblatt/route.ts:52).
- Angebots-Workflow nutzt teils `jsonData`+Transformer statt persistiertem Dokumenttext: [`src/actions/angebot.ts:203`](/Users/danielrau/Developer/aisdkvercel/src/actions/angebot.ts:203), [`src/actions/angebot.ts:241`](/Users/danielrau/Developer/aisdkvercel/src/actions/angebot.ts:241), [`src/actions/angebot.ts:298`](/Users/danielrau/Developer/aisdkvercel/src/actions/angebot.ts:298).
**Korrektur:** Vollständiges Inventory aller `collection: 'documents'` Leser/Schreiber als expliziter Plan-Schritt vor Phase 2/3.

4. **[P1] Migrationsstrategie ohne ausreichende Betriebs-Sicherungen**
Der Plan beschreibt Logik, aber keine Fail-safe-Mechanik (Batching, Dry-run, Resume, Metriken, Rollback). Das bestehende Migrationsmuster ist „all docs + overrideAccess + direkte Updates“: [`src/scripts/migrate-documents-to-lexical.ts:23`](/Users/danielrau/Developer/aisdkvercel/src/scripts/migrate-documents-to-lexical.ts:23), [`src/scripts/migrate-documents-to-lexical.ts:58`](/Users/danielrau/Developer/aisdkvercel/src/scripts/migrate-documents-to-lexical.ts:58).
**Risiko:** Teilmigrationen und schwer reproduzierbare Fehlerzustände bei Laufzeitlast.
**Korrektur:** Dry-run-Modus, paginierte Verarbeitung, idempotente Marker, Fehler-CSV/Retry-Queue, vorab DB-Snapshot und klarer Rollback-Runbook.

5. **[P1] Versionen-Strategie nicht vollständig spezifiziert**
`documents` nutzt Versionierung (`maxPerDoc: 20`): [`src/collections/Documents.ts:5`](/Users/danielrau/Developer/aisdkvercel/src/collections/Documents.ts:5). Aktuell mappt `getDocumentVersions` nur `content/jsonData/sourceToolType`: [`src/actions/documents.ts:411`](/Users/danielrau/Developer/aisdkvercel/src/actions/documents.ts:411).
Wenn `content` später entfernt wird, bleiben historische Versionen ohne `markdown` nur über Fallbacks lesbar; ein sauberer Plan für Altversionen fehlt.
**Korrektur:** Entweder Versionen-Backfill (falls praktikabel) oder dauerhafte Legacy-Fallbacks klar als „nicht entfernen“ markieren.

## Wichtige fachliche Korrekturen
- **Reihenfolge anpassen:** `Schema + Dual-Write` vor jeder Backfill-Migration.
- **Write-Scope erweitern:** alle `documents`-Writes erfassen (inkl. `save-document` Tool und Angebots-API-Routen).
- **Read-Scope erweitern:** Knowledge Search, Formblatt-Kontext, Angebots-Action-Pfade explizit auf `markdown` umstellen.
- **SoT-Konsistenz in Fachlogik:** dort, wo user-editiertes Dokument semantisch maßgeblich ist (z. B. Kontext für Folgegenerierung), `doc.markdown` priorisieren statt `transformer.toMarkdown(jsonData)`.
- **Cleanup-Gate definieren:** `content` erst entfernen, wenn Telemetrie/Smoke-Checks zeigen, dass `markdown`-Read/Write in allen Pfaden stabil ist.

## Security-/Privacy-Aspekte
- **Datenminimierung:** Entfernen von `_editedMarkdown` aus `jsonData` ist positiv, reduziert Vermischung von Struktur- und Freitextdaten.
- **RAG-Exposure prüfen:** Mit `markdown` als SoT wandert potenziell mehr Freitext in Embeddings. Zugriff ist projektgebunden, aber dokumentierte Regeln für sensible Inhalte (PII/Vertragsdaten) fehlen.
- **DoS-/Kosten-Schutz bei Export/Konvertierung:** Export konvertiert aktuell erst zu Lexical/HTML und prüft dann Größe ([`src/app/(dashboard)/projects/[id]/api/documents/[docId]/export/route.ts:65`](/Users/danielrau/Developer/aisdkvercel/src/app/(dashboard)/projects/[id]/api/documents/[docId]/export/route.ts:65)). Bei großem Markdown sollte vor Konvertierung hart begrenzt werden.
- **Migrationsbetrieb:** Skriptlauf mit `overrideAccess` braucht klare Betriebsfenster und Audit-Log (wer/wann/wie viele Docs), sonst erhöht sich Incident-Risiko.

## Test-Gap Empfehlungen
- **Contract-Tests pro Write-Pfad:** Jede `documents`-Mutation muss `markdown` setzen (und in Dual-Write-Phase auch `content`).
- **Golden-Migration-Tests:** Fälle mit `_editedMarkdown`, reines `jsonData`, Lexical-Objekt, String-`content`, leer/invalid; Erwartung inklusive Idempotenz.
- **E2E-Tests für Kernflows:** Bearbeiten, Versionen, Export (md/pdf/docx), Angebots-Workflow, Formblatt-Kontext, Knowledge Search.
- **Backfill-Verifikation:** Vorher/Nachher-Counts (`markdown is null`, `_editedMarkdown exists`), stichprobenhafte semantische Diff-Prüfung.
- **Load-/Failure-Tests:** Migration mit künstlichen Fehlern (Transformer-Exception, DB-Timeout), Resume-Verhalten und Fehlerreporting.

## Positives am Plan
- Richtige Zielarchitektur (klare Trennung `jsonData` vs. darstellbarer Text).
- Sinnvolle Zwischenphase mit Dual-Write statt Big-Bang.
- Relevante Kernflächen (Panel, Export, Vectorize) sind grundsätzlich erkannt.
- Verifizierungsschritte decken zentrale User Journeys bereits gut ab.

Wenn du willst, kann ich als nächsten Schritt eine präzise, umsortierte Umsetzungs-Checklist (Deployment-Reihenfolge + konkrete Datei-Liste + Abnahmekriterien pro Phase) direkt ergänzen.
