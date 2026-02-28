'use client'

import { useEffect, useState } from 'react'
import { listProjectsMeta, createProject } from '@/actions/projects'

type Project = { id: string | number; name: string }

export function ProjectSelector({
  value,
  onChange,
}: {
  value: string | number | null
  onChange: (projectId: string | number) => void
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    listProjectsMeta()
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLoading(true)
    const project = await createProject({ name: newName.trim() })
    setProjects((prev) => [project, ...prev])
    onChange(project.id)
    setNewName('')
    setCreating(false)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse text-sm text-gray-400">
        Projekte werden geladen...
      </div>
    )
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Projektname"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
            if (e.key === 'Escape') setCreating(false)
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Erstellen
        </button>
        <button
          onClick={() => setCreating(false)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Abbrechen
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value === '__new__') {
            setCreating(true)
          } else if (e.target.value) {
            onChange(e.target.value)
          }
        }}
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Projekt wählen...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value="__new__">+ Neues Projekt</option>
      </select>
    </div>
  )
}
