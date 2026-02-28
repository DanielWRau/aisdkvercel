'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type MediaDoc = {
  url?: string
  mimeType?: string
  filename?: string
  filesize?: number
}

export function FilePreview() {
  const { id } = useDocumentInfo()
  const [doc, setDoc] = useState<MediaDoc | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/media/${id}?depth=0`)
      .then((res) => res.json())
      .then((data) => setDoc(data))
      .catch(() => setDoc(null))
  }, [id])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    },
    [isOpen],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!doc?.url || !doc?.mimeType) return null

  const isPdf = doc.mimeType === 'application/pdf'

  if (!isPdf) return null

  const fileSize = doc.filesize
    ? doc.filesize > 1024 * 1024
      ? `${(doc.filesize / (1024 * 1024)).toFixed(1)} MB`
      : `${(doc.filesize / 1024).toFixed(0)} KB`
    : null

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--theme-text)',
            fontSize: '14px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          PDF anzeigen{fileSize ? ` (${fileSize})` : ''}
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              background: 'var(--theme-elevation-50, #1a1a1a)',
              borderBottom: '1px solid var(--theme-elevation-200, #333)',
              color: 'var(--theme-text, #fff)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {doc.filename || 'PDF Vorschau'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.4rem 0.75rem',
                  background: 'var(--theme-elevation-200, #333)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--theme-text, #fff)',
                  textDecoration: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                In neuem Tab
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: 'var(--theme-elevation-200, #333)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--theme-text, #fff)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Schliessen (Esc)
              </button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <iframe
              src={doc.url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="PDF Vorschau"
            />
          </div>
        </div>
      )}
    </>
  )
}
