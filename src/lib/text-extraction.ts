import fs from 'node:fs/promises'
import path from 'node:path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_TEXT_LENGTH = 100_000 // ~25k tokens
const PARSE_TIMEOUT_MS = 30_000

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Extraktion Timeout nach ${ms}ms`)), ms),
  )
}

async function doExtract(filePath: string, mimeType: string): Promise<string> {
  if (
    mimeType === 'application/pdf' ||
    filePath.endsWith('.pdf')
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (await import('pdf-parse') as any).default as (buf: Buffer) => Promise<{ text: string }>
    const buffer = await fs.readFile(filePath)
    const data = await pdfParse(buffer)
    return data.text
  }

  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  }

  if (
    mimeType?.startsWith('text/') ||
    filePath.endsWith('.txt') ||
    filePath.endsWith('.md') ||
    filePath.endsWith('.csv')
  ) {
    return await fs.readFile(filePath, 'utf-8')
  }

  throw new Error(`Nicht unterstützter Dateityp: ${mimeType}`)
}

export async function extractText(
  filePath: string,
  mimeType: string,
): Promise<string> {
  // 1. Canonicalize path + base directory check
  const resolved = path.resolve(filePath)
  const mediaDir = path.resolve(process.cwd(), 'media')
  if (!resolved.startsWith(mediaDir)) {
    throw new Error('Pfad außerhalb media/')
  }

  // 2. Check file size
  const stat = await fs.stat(resolved)
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`Datei zu groß: ${stat.size} bytes (max ${MAX_FILE_SIZE})`)
  }

  // 3. Extract with timeout
  const text = await Promise.race([
    doExtract(resolved, mimeType),
    timeoutPromise(PARSE_TIMEOUT_MS),
  ])

  // 4. Truncate
  return text.slice(0, MAX_TEXT_LENGTH)
}

/**
 * Extract text from an in-memory buffer (no filesystem required).
 * Same safety limits as extractText (size, timeout, truncation).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName?: string,
): Promise<string> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Datei zu groß: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`)
  }

  async function doExtractBuffer(): Promise<string> {
    if (mimeType === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (await import('pdf-parse') as any).default as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      return data.text
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth') as unknown as {
        convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>
      }
      const result = await mammoth.convertToMarkdown({ buffer })
      return result.value
    }

    if (
      mimeType?.startsWith('text/') ||
      fileName?.endsWith('.txt') ||
      fileName?.endsWith('.md') ||
      fileName?.endsWith('.csv')
    ) {
      return buffer.toString('utf-8')
    }

    throw new Error(`Nicht unterstützter Dateityp: ${mimeType}`)
  }

  const text = await Promise.race([
    doExtractBuffer(),
    timeoutPromise(PARSE_TIMEOUT_MS),
  ])

  return text.slice(0, MAX_TEXT_LENGTH)
}
