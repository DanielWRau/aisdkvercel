'use client';

import type { SpecResult } from '@/tools/generate-spec';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mt-6 mb-2">
      {children}
    </h3>
  );
}

export function SpecDocument({ result }: { result: SpecResult }) {
  if (result.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-2">
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          Leistungsbeschreibung
        </span>
      </div>

      <div className="px-6 pb-6 space-y-1">
        <h2 className="text-xl font-bold">{result.titel}</h2>
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {result.leistungstyp}
        </span>

        {/* Bedarf */}
        <SectionHeading>Bedarf</SectionHeading>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Ausgangssituation
            </p>
            <p className="whitespace-pre-line">
              {result.bedarf.ausgangssituation}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Problemstellung
            </p>
            <p className="whitespace-pre-line">
              {result.bedarf.problemstellung}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Bedarfsumfang
            </p>
            <p className="whitespace-pre-line">
              {result.bedarf.bedarfsumfang}
            </p>
          </div>
        </div>

        {/* Ziel */}
        <SectionHeading>Ziel</SectionHeading>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Gewünschte Ergebnisse
            </p>
            <p className="whitespace-pre-line">
              {result.ziel.gewuenschte_ergebnisse}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Nutzen
            </p>
            <p className="whitespace-pre-line">{result.ziel.nutzen}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-500 text-xs uppercase mb-1">
              Erfolgskriterien
            </p>
            <ul className="list-disc list-inside space-y-1">
              {result.ziel.erfolgskriterien.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Leistungsbeschreibung */}
        <SectionHeading>Leistungsbeschreibung</SectionHeading>
        <div className="space-y-5">
          {result.leistungsbeschreibung.bereiche.map((bereich, bi) => (
            <div
              key={bi}
              className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3"
            >
              <h4 className="font-semibold">{bereich.titel}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {bereich.beschreibung}
              </p>
              {bereich.unterbereiche.map((ub, ui) => (
                <div key={ui} className="ml-4 text-sm space-y-1">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {ub.titel}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {ub.inhalt}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Zeitplanung */}
        <SectionHeading>Zeitplanung</SectionHeading>
        <p className="text-sm text-gray-500 mb-3">
          Gesamtdauer: {result.zeitplanung.gesamtdauer_monate} Monate
        </p>
        <div className="space-y-3">
          {result.zeitplanung.meilensteine.map((ms, mi) => (
            <div
              key={mi}
              className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 text-sm space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{ms.phase}</span>
                <span className="text-xs text-gray-400">
                  {ms.dauer_wochen} Wochen
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Aktivitäten
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                  {ms.aktivitaeten.map((a, ai) => (
                    <li key={ai}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Liefergegenstände
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                  {ms.liefergegenstaende.map((l, li) => (
                    <li key={li}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
