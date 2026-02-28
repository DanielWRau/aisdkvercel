'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import type { ChatMessage } from '@/tools/index'

type UseProjectChatOptions = {
  projectId: string | number
  chatMode?: 'workflow' | 'knowledge'
}

function storageKey(projectId: string | number, chatMode: string) {
  return `chat-${projectId}-${chatMode}`
}

function loadMessages(key: string): UIMessage[] | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // corrupt data — ignore
  }
  return undefined
}

export function useProjectChat({
  projectId,
  chatMode = 'knowledge',
}: UseProjectChatOptions) {
  const key = storageKey(projectId, chatMode)

  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [initialMessages] = useState(() => loadMessages(key))

  const chat = useChat<ChatMessage>({
    id: `${projectId}-${chatMode}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: {
        'x-session-id': sessionId,
        'x-project-id': String(projectId),
        'x-chat-mode': chatMode,
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  // Persist messages to localStorage on change
  const prevLenRef = useRef(initialMessages?.length ?? 0)
  useEffect(() => {
    // Only save when message count actually changes (avoids writing on every render)
    if (chat.messages.length === prevLenRef.current) return
    prevLenRef.current = chat.messages.length

    if (chat.messages.length === 0) {
      localStorage.removeItem(key)
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(chat.messages))
      } catch {
        // storage full — silently ignore
      }
    }
  }, [chat.messages, key])

  const clearChat = useCallback(() => {
    localStorage.removeItem(key)
    chat.setMessages([])
    setSessionId(crypto.randomUUID())
    prevLenRef.current = 0
  }, [key, chat])

  return {
    ...chat,
    isLoading: chat.status === 'submitted' || chat.status === 'streaming',
    clearChat,
  }
}
