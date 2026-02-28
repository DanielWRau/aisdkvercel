'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ComponentPropsWithoutRef } from 'react'

const components = {
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) => (
    <a
      href={href?.startsWith('javascript:') ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
}

export function ChatTextPart({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
