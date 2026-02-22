'use client'

import { useState } from 'react'
import { saveAllToolResults } from '@/actions/documents'

type SaveItem = {
  toolType: string
  result: unknown
  label: string
}

type ItemStatus = 'pending' | 'saving' | 'saved' | 'error'

const TOOL_ICONS: Record<string, string> = {
  marketResearch: '🔍',
  generateSpec: '📋',
  askQuestions: '📝',
}

export function SaveAllResults({
  projectId,
  items,
}: {
  projectId: string | number
  items: SaveItem[]
}) {
  const [statuses, setStatuses] = useState<ItemStatus[]>(
    items.map(() => 'pending'),
  )
  const [saving, setSaving] = useState(false)

  const allDone = statuses.every((s) => s === 'saved' || s === 'error')

  const handleSave = async () => {
    setSaving(true)
    setStatuses(items.map(() => 'saving'))

    const results = await saveAllToolResults({
      projectId,
      items: items.map(({ toolType, result }) => ({ toolType, result })),
    })

    setStatuses(
      results.map((r) => (r.success ? 'saved' : 'error')),
    )
    setSaving(false)
  }

  if (items.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
        Ergebnisse speichern
      </p>

      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span>{TOOL_ICONS[item.toolType] ?? '📄'}</span>
            <span className="flex-1">{item.label}</span>
            {statuses[i] === 'saved' && (
              <span className="text-green-600 text-xs font-medium">Gespeichert</span>
            )}
            {statuses[i] === 'error' && (
              <span className="text-red-600 text-xs font-medium">Fehler</span>
            )}
            {statuses[i] === 'saving' && (
              <span className="text-gray-400 text-xs animate-pulse">Speichert...</span>
            )}
          </li>
        ))}
      </ul>

      {!allDone && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Wird gespeichert...' : 'Alles im Projekt speichern'}
        </button>
      )}

      {allDone && (
        <p className="text-sm text-green-600 text-center font-medium">
          Alle Ergebnisse wurden gespeichert.
        </p>
      )}
    </div>
  )
}
