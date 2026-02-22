'use client';

import type { MarketResearchResult, Provider } from '@/tools/market-research';

const GROESSE_CONFIG: Record<string, { label: string; className: string }> = {
  klein: {
    label: 'Klein',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  mittel: {
    label: 'Mittel',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  gross: {
    label: 'Groß',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
};

const GROESSE_GROUP_LABELS: Record<string, string> = {
  gross: 'Große Unternehmen (>500 MA)',
  mittel: 'Mittelständische Unternehmen (50-500 MA)',
  klein: 'Kleine Unternehmen (<50 MA)',
  sonstige: 'Sonstige Anbieter',
};

const REICHWEITE_CONFIG: Record<string, string> = {
  lokal: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  regional: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  ueberregional: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  bundesweit: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

// Backward compat: old category → groesse mapping
const CATEGORY_GROESSE_MAP: Record<string, string> = {
  'groß/überregional': 'gross',
  'mittelständisch/regional': 'mittel',
  spezialisiert: 'klein',
};

function getEffectiveGroesse(provider: Provider): string {
  if (provider.groesse) return provider.groesse;
  if (provider.category && CATEGORY_GROESSE_MAP[provider.category]) {
    return CATEGORY_GROESSE_MAP[provider.category];
  }
  return 'sonstige';
}

function ProviderCard({ provider }: { provider: Provider }) {
  const groesse = getEffectiveGroesse(provider);
  const groesseConfig = GROESSE_CONFIG[groesse];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold">{provider.name}</h4>
        <div className="flex gap-1 flex-shrink-0">
          {groesseConfig && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${groesseConfig.className}`}
            >
              {groesseConfig.label}
            </span>
          )}
          {provider.reichweite && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${REICHWEITE_CONFIG[provider.reichweite] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {provider.reichweite}
            </span>
          )}
          {provider.region && (
            <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              {provider.region}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {provider.description}
      </p>

      {provider.spezialisierung && (
        <p className="text-xs text-gray-500 dark:text-gray-500 italic">
          {provider.spezialisierung}
        </p>
      )}

      <div className="text-sm space-y-0.5">
        {provider.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-500 hover:text-blue-400 break-all"
          >
            {provider.website}
          </a>
        )}
        {provider.email && (
          <a
            href={`mailto:${provider.email}`}
            className="block text-gray-600 dark:text-gray-400 hover:text-blue-500"
          >
            {provider.email}
          </a>
        )}
        {provider.phone && (
          <a
            href={`tel:${provider.phone.replace(/\s/g, '')}`}
            className="block text-gray-600 dark:text-gray-400 hover:text-blue-500"
          >
            {provider.phone}
          </a>
        )}
        {(provider.address || provider.city) && (
          <p className="text-gray-500 dark:text-gray-500">
            {[provider.address, provider.city].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

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

  // Group by groesse (with backward compat fallback)
  const groups: Record<string, Provider[]> = {};
  for (const provider of result.providers) {
    const key = getEffectiveGroesse(provider);
    if (!groups[key]) groups[key] = [];
    groups[key].push(provider);
  }

  // Order: gross → mittel → klein → sonstige
  const groupOrder = ['gross', 'mittel', 'klein', 'sonstige'];

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

      {/* Providers by groesse */}
      <div className="px-6 pb-6 space-y-6">
        {groupOrder.map(
          (key) =>
            groups[key] &&
            groups[key].length > 0 && (
              <div key={key} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  {GROESSE_GROUP_LABELS[key] || key} ({groups[key].length})
                </h3>
                <div className="grid gap-3">
                  {groups[key].map((provider, i) => (
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
