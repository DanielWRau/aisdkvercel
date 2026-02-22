'use client';

import type { MarketResearchResult, Provider } from '@/tools/market-research';

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold">{provider.name}</h4>
        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            provider.category === 'groß/überregional'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : provider.category === 'spezialisiert'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          }`}
        >
          {provider.category}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {provider.description}
      </p>

      {provider.website && (
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:text-blue-400 break-all"
        >
          {provider.website}
        </a>
      )}

      {provider.strengths?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.strengths.map((s, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {provider.certifications && provider.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.certifications.map((c, i) => (
            <span
              key={i}
              className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketResearchResults({
  result,
}: {
  result: MarketResearchResult;
}) {
  if (result.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  const grouped = {
    'groß/überregional': result.providers.filter(
      p => p.category === 'groß/überregional',
    ),
    'mittelständisch/regional': result.providers.filter(
      p => p.category === 'mittelständisch/regional',
    ),
    spezialisiert: result.providers.filter(
      p => p.category === 'spezialisiert',
    ),
  };

  const categoryLabels: Record<string, string> = {
    'groß/überregional': 'Große & überregionale Anbieter',
    'mittelständisch/regional': 'Mittelständische & regionale Anbieter',
    spezialisiert: 'Spezialisierte Anbieter',
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2">
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          Marktrecherche
        </span>
        <span className="text-sm text-gray-400">
          {result.providers.length} Anbieter gefunden
        </span>
      </div>

      <div className="px-6 pb-2">
        <p className="text-sm text-gray-500">
          Suchanfrage: &ldquo;{result.query}&rdquo;
        </p>
      </div>

      {/* Providers by category */}
      <div className="px-6 pb-6 space-y-6">
        {Object.entries(grouped).map(
          ([category, providers]) =>
            providers.length > 0 && (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  {categoryLabels[category]} ({providers.length})
                </h3>
                <div className="grid gap-3">
                  {providers.map((provider, i) => (
                    <ProviderCard key={i} provider={provider} />
                  ))}
                </div>
              </div>
            ),
        )}
      </div>

      {/* Sources */}
      {result.citations.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Quellen ({result.citations.length})
          </p>
          <div className="space-y-1">
            {result.citations.slice(0, 10).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-500 hover:text-blue-400 truncate"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
