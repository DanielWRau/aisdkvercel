'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChatTextPart } from './chat-text-part'

type MessagePart = {
  type: string
  text?: string
  [key: string]: unknown
}

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: MessagePart[]
}

type ChatMessageBubbleProps = {
  message: Message
  renderToolPart?: (part: MessagePart) => ReactNode
}

export function ChatMessageBubble({ message, renderToolPart }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent',
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return isUser ? (
              <p key={i} className="text-sm whitespace-pre-wrap">{part.text}</p>
            ) : (
              <ChatTextPart key={i} text={part.text} />
            )
          }
          if (part.type.startsWith('tool-') && renderToolPart) {
            const rendered = renderToolPart(part)
            if (rendered) return <div key={i}>{rendered}</div>
          }
          return null
        })}
      </div>
    </div>
  )
}
