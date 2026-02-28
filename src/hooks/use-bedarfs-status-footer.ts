'use client'

import { useEffect } from 'react'
import { useWorkspace } from '@/providers/workspace-provider'
import { useStatusFooter } from '@/providers/status-footer-provider'

function contentToText(tab: string, content: unknown): string | null {
  if (!content) return null

  if (typeof content === 'string') return content

  if (tab === 'bedarfsanalyse' && typeof content === 'object') {
    const data = content as Record<string, unknown>
    const answers = (data.answers ?? data.questionsAndAnswers ?? []) as Array<{
      question?: string
      selectedOptions?: string[]
      freeText?: string
    }>
    if (answers.length === 0) return null
    const lines: string[] = []
    if (data.summary) lines.push(String(data.summary), '')
    for (const a of answers) {
      lines.push(`**${a.question}**`)
      const opts = a.selectedOptions?.join(', ') ?? ''
      const text = a.freeText ? `${opts} — ${a.freeText}` : opts
      lines.push(text, '')
    }
    return lines.join('\n')
  }

  if (tab === 'marktanalyse' && typeof content === 'object') {
    return JSON.stringify(content, null, 2)
  }

  if (tab === 'leistungsbeschreibung' && typeof content === 'object') {
    const spec = content as Record<string, unknown>
    const lines: string[] = []
    if (spec.title) lines.push(`# ${spec.title}`, '')
    if (spec.scope) lines.push(`## Leistungsumfang`, String(spec.scope), '')
    const sections = (spec.sections ?? []) as Array<{ heading?: string; body?: string }>
    for (const s of sections) {
      if (s.heading) lines.push(`## ${s.heading}`)
      if (s.body) lines.push(String(s.body), '')
    }
    return lines.join('\n') || null
  }

  return null
}

export function useBedarfsStatusFooter() {
  const { activeTab, tabContents } = useWorkspace()
  const { setStatusText, setCopyContent } = useStatusFooter()

  useEffect(() => {
    const current = tabContents[activeTab]
    const label = current.status === 'done' ? 'Generiert' : 'Entwurf'
    setStatusText(label)
  }, [activeTab, tabContents, setStatusText])

  useEffect(() => {
    const current = tabContents[activeTab]
    if (current.status === 'done' && current.content) {
      setCopyContent(contentToText(activeTab, current.content))
    } else {
      setCopyContent(null)
    }
    return () => setCopyContent(null)
  }, [activeTab, tabContents, setCopyContent])
}
