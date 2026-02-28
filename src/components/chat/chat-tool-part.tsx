'use client'

import type { ComponentType, ReactNode } from 'react'

type ToolPartRenderers = Record<string, ComponentType<{ part: unknown }>>

type ChatToolPartProps = {
  part: { type: string; [key: string]: unknown }
  renderers: ToolPartRenderers
}

export function ChatToolPart({ part, renderers }: ChatToolPartProps): ReactNode {
  const Renderer = renderers[part.type]
  if (!Renderer) return null
  return <Renderer part={part} />
}

export function createToolPartRenderer(renderers: ToolPartRenderers) {
  return function renderToolPart(part: { type: string; [key: string]: unknown }): ReactNode {
    return <ChatToolPart part={part} renderers={renderers} />
  }
}
