# Review: Fix: Leistungsbeschreibung-Einstellungen werden nicht angewendet

## Kurzfazit
Der Plan trifft die Kernursache teilweise richtig, löst sie aber nicht robust: Statt deterministischem Durchreichen der Settings bleibt die vorgeschlagene Umsetzung primär ein LLM-Parsing aus Freitext. Damit bleiben Zuverlässigkeits- und Integritätsrisiken bestehen, insbesondere bei untrusted Kontextdaten. Zusätzlich gibt es einen fachlichen Vertragsbruch bei `mitZeitplanung=false`, weil Prompt und Output-Schema aktuell nicht zusammenpassen.

## Kritische Findings (priorisiert)
1. **[Kritisch] Der Plan widerspricht dem eigenen Robustheitsansatz und bleibt parser-basiert über Chat-Text.**
   - Plan behauptet als robusten Weg das Durchreichen über `createAgent` bis `getSpecGenerationPrompt` (Plan Zeile 13-14), implementiert dann aber primär Prompt-Anweisungen zum Extrahieren aus Nachrichtentext (Plan Zeile 40-58) plus Format-Hints im UI-Text (Plan Zeile 60-71).
   - Aktueller Workflow sendet Einstellungen als Freitext in eine User-Nachricht ([src/components/bedarfs-workflow.tsx:487](/Users/danielrau/Developer/aisdkvercel/src/components/bedarfs-workflow.tsx:487)); die Systeminstruktionen sind ebenfalls nur heuristisch ([src/prompts/system.ts:68](/Users/danielrau/Developer/aisdkvercel/src/prompts/system.ts:68)).
   - In derselben Nachricht steckt untrusted Kontext (z. B. Provider-Beschreibungen aus Recherche, [src/components/bedarfs-workflow.tsx:477](/Users/danielrau/Developer/aisdkvercel/src/components/bedarfs-workflow.tsx:477)), der das Extraktionsverhalten beeinflussen kann.
   - **Risiko:** Nicht-deterministische Tool-Parameter, Prompt-Injection/Instruction-Hijacking, schwer auditierbares Fehlverhalten.

2. **[Hoch] `mitZeitplanung=false` ist fachlich mit dem aktuellen Ergebnisvertrag inkonsistent.**
   - Der Prompt kann `zeitplanung` auslassen ([src/prompts/spec-generation.ts:82](/Users/danielrau/Developer/aisdkvercel/src/prompts/spec-generation.ts:82)), aber `specResultSchema` verlangt `zeitplanung` zwingend ([src/tools/generate-spec-schema.ts:38](/Users/danielrau/Developer/aisdkvercel/src/tools/generate-spec-schema.ts:38)).
   - Der Plan fordert in der Verifikation „kein Zeitplanungs-Abschnitt“ (Plan Zeile 88), ohne Schema/Transformer/Evals mitzuziehen.
   - **Risiko:** Validierungsfehler, inkonsistente Ausgaben, Regressionen im Persistenz-/Renderingpfad.

3. **[Hoch] Für `gliederung` fehlt im Plan eine harte Begrenzung und Normalisierung.**
   - Geplant ist `z.array(z.string())` ohne `max()`/Längenlimit pro Item (Plan Zeile 26).
   - **Risiko:** Token-/Kosten-Explosion, Latenzspitzen, potenziell instabile JSON-Ausgabe bei sehr langen oder pathologischen Einträgen.

4. **[Mittel] Unvollständige Abdeckung der tatsächlichen Settings-Pfade.**
   - Der Plan fokussiert `eigeneGliederung` im Nachrichtenformat; `gliederungVorlage` bleibt weiterhin textuell/heuristisch und nicht deterministisch als strukturierte Tool-Args.
   - Gleichzeitig lädt die Chat-Route bereits Workflow-Settings, gibt aber nur `maxFrageRunden` und `fragenstil` an den Agenten weiter ([src/app/(app)/api/chat/route.ts:93](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/chat/route.ts:93), [src/app/(app)/api/chat/route.ts:98](/Users/danielrau/Developer/aisdkvercel/src/app/(app)/api/chat/route.ts:98)).
   - **Risiko:** Teilweise wirksame Einstellungen, schwer reproduzierbares Verhalten.

5. **[Mittel] Teststrategie im Plan deckt die risikoreichen Stellen nicht ab.**
   - Bestehende Tests prüfen bisher nicht, dass `detailtiefe/stil/mitZeitplanung/gliederung` wirklich als Tool-Args bis `getSpecGenerationPrompt` durchgereicht werden ([src/tools/__tests__/generate-spec.test.ts:67](/Users/danielrau/Developer/aisdkvercel/src/tools/__tests__/generate-spec.test.ts:67), [src/prompts/__tests__/prompts.test.ts:164](/Users/danielrau/Developer/aisdkvercel/src/prompts/__tests__/prompts.test.ts:164)).
   - **Risiko:** Änderung wirkt „gefühlt“, aber bricht still bei Prompt-/Tool-Refactors.

## Wichtige fachliche Korrekturen
- **Deterministischer statt parser-basierter Pfad:**
  - `SystemPromptOptions` um einen typisierten Block für Spec-Defaults erweitern (z. B. `specDefaults`), statt Extraktion aus Freitext.
  - In der Chat-Route die bereits geladenen Workflow-Settings (`ws`) vollständig in diesen Block mappen.
  - `generateSpec` so aufrufen/wrappen, dass fehlende Tool-Args serverseitig mit den Defaults belegt werden.
- **Schema-Vertrag konsistent machen:**
  - Entweder `zeitplanung` optional modellieren (inkl. Transformer/UI/Evals), oder `mitZeitplanung=false` fachlich entfernen.
- **Input-Härtung für `gliederung`:**
  - Beispiel: `z.array(z.string().trim().min(1).max(120)).max(12)`.
  - Vor Persistenz/Prompting deduplizieren und leere Einträge verwerfen.
- **Auditierbarkeit erhöhen:**
  - Effektive Generierungsparameter pro erzeugter Leistungsbeschreibung mitpersistieren (z. B. in `jsonData.meta.specConfig`).

## Security-/Privacy-Aspekte
- **Prompt-Injection/Integrity:** Parser-Logik aus gemischtem User-/Web-Kontext ist manipulierbar; Einstellungen sollten aus vertrauenswürdigem Server-State stammen, nicht aus Chattext.
- **Data Minimization:** Custom-Gliederungen müssen nicht mehrfach als Freitext im Chat erscheinen; besser einmal strukturiert als Tool-Input übergeben.
- **Operational Security:** Begrenzungen auf `gliederung` und Eingabelängen verhindern Kosten-/Latenzangriffe durch übergroße Inputs.
- **Nachvollziehbarkeit:** Ohne Speicherung der effektiv verwendeten Settings ist Incident-Analyse ("warum falsche Struktur?") unnötig schwer.

## Test-Gap Empfehlungen
1. Unit-Test `generate-spec`: Assert, dass `getSpecGenerationPrompt` exakt mit `detailtiefe/stil/mitZeitplanung/gliederung` aufgerufen wird.
2. Unit-Test `spec-generation`: Fall `gliederung` überschreibt Standardstruktur; Fall `mitZeitplanung=false` bleibt schema-konsistent.
3. Integrations-Test Workflow→Chat→Tool: Gespeicherte Workflow-Settings führen deterministisch zu erwarteten Tool-Args (ohne Text-Parsing).
4. Negativtest Prompt-Injection: Kontext enthält fake `"gliederung:"`/`"Zeitplanung:"`-Zeilen; effektive Tool-Args bleiben unverändert.
5. Regressionstest Persistenz/Rendering: Dokumente ohne `zeitplanung` (falls optional) werden korrekt gespeichert und angezeigt.

## Positives am Plan
- Der Defekt ist klar beschrieben und reproduzierbar.
- Die Notwendigkeit eines `gliederung`-Parameters im Tool ist korrekt erkannt.
- Die Verifikationsfälle sind nutzerorientiert und decken die wichtigsten UI-Optionen ab.

Wenn gewünscht, kann ich im nächsten Schritt einen konkreten Umsetzungsplan für die deterministische Variante (inkl. erwarteter File-Diffs) erstellen.
