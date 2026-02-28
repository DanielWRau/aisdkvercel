import type { SerializedEditorState, SerializedLexicalNode } from 'lexical'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Header,
  Footer,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  PageNumber,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  convertMillimetersToTwip,
} from 'docx'
import type { FileChild, ParagraphChild } from 'docx'
import { sanitizeUrl } from './export-pdf'

const HEADING_MAP: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
}

// Lexical format bitmask flags
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_UNDERLINE = 8

interface LexicalNode extends SerializedLexicalNode {
  format?: number | string
  tag?: string
  text?: string
  url?: string
  children?: LexicalNode[]
  listType?: string
  start?: number
  indent?: number
  direction?: string
  value?: unknown
}

/* ── Shared document styles ── */

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
} as const

const DOCUMENT_STYLES = {
  default: {
    heading1: {
      run: { size: 32, bold: true, color: '1a1a1a' },
      paragraph: { spacing: { before: 360, after: 120 } },
    },
    heading2: {
      run: { size: 28, bold: true, color: '2a2a2a' },
      paragraph: { spacing: { before: 280, after: 100 } },
    },
    heading3: {
      run: { size: 24, bold: true, color: '3a3a3a' },
      paragraph: { spacing: { before: 200, after: 80 } },
    },
    document: {
      run: { size: 20 },
      paragraph: { spacing: { after: 120 } },
    },
    listParagraph: {
      paragraph: { spacing: { after: 60 } },
    },
  },
}

function buildDocumentShell(
  children: FileChild[],
  options: { title: string; createdAt?: string },
): Document {
  const dateStr = options.createdAt
    ? new Date(options.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

  return new Document({
    styles: DOCUMENT_STYLES,
    numbering: {
      config: [
        {
          reference: 'bullet-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u25CF',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(12.7), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '\u25CB',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(25.4), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: '\u25AA',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(38.1), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
          ],
        },
        {
          reference: 'number-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              start: 1,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(12.7), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: '%2)',
              alignment: AlignmentType.LEFT,
              start: 1,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(25.4), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_ROMAN,
              text: '%3)',
              alignment: AlignmentType.LEFT,
              start: 1,
              style: {
                paragraph: {
                  indent: { left: convertMillimetersToTwip(38.1), hanging: convertMillimetersToTwip(6.35) },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(15),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: options.title,
                    color: '888888',
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: dateStr,
                    color: '888888',
                    size: 16,
                  }),
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: '\t' }),
                  new TextRun({
                    children: ['Seite ', PageNumber.CURRENT, ' von ', PageNumber.TOTAL_PAGES],
                    color: '888888',
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

/* ── Lexical → DOCX ── */

export async function lexicalToDocx(
  data: SerializedEditorState,
  options: { title: string; createdAt?: string },
): Promise<Buffer> {
  const children = convertNodes(data.root.children as LexicalNode[])
  const doc = buildDocumentShell(children, options)
  return await Packer.toBuffer(doc)
}

/** Convert block-level Lexical nodes to docx FileChild elements */
function convertNodes(nodes: LexicalNode[]): FileChild[] {
  const result: FileChild[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph': {
        result.push(
          new Paragraph({
            children: convertInlineNodes(node.children ?? []),
            spacing: { after: 120 },
          }),
        )
        break
      }

      case 'heading': {
        const heading = HEADING_MAP[node.tag ?? 'h1']
        result.push(
          new Paragraph({
            heading: heading ?? HeadingLevel.HEADING_1,
            children: convertInlineNodes(node.children ?? []),
          }),
        )
        break
      }

      case 'list': {
        const isOrdered = node.listType === 'number'
        const reference = isOrdered ? 'number-numbering' : 'bullet-numbering'
        const level = node.indent ?? 0
        flattenListItems(node.children ?? [], reference, level, result)
        break
      }

      case 'quote': {
        result.push(
          new Paragraph({
            children: convertInlineNodes(node.children ?? []).map((child) => {
              // Make blockquote text italic
              if (child instanceof TextRun) {
                return new TextRun({
                  text: (child as unknown as { options: { text?: string } }).options?.text ?? '',
                  italics: true,
                  color: '555555',
                })
              }
              return child
            }),
            indent: { left: 720 },
            border: {
              left: {
                color: 'CCCCCC',
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
            spacing: { after: 120 },
          }),
        )
        break
      }

      case 'table': {
        const tableRows = convertTableNode(node)
        if (tableRows.length > 0) {
          result.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          )
          // Spacing after table
          result.push(new Paragraph({ spacing: { before: 60, after: 120 } }))
        }
        break
      }

      case 'horizontalrule': {
        result.push(
          new Paragraph({
            border: {
              bottom: {
                color: 'CCCCCC',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
        )
        break
      }

      default:
        break
    }
  }

  return result
}

/** Convert a Lexical table node to docx TableRows */
function convertTableNode(node: LexicalNode): TableRow[] {
  const rows: TableRow[] = []
  const tableChildren = node.children ?? []

  for (let rowIdx = 0; rowIdx < tableChildren.length; rowIdx++) {
    const rowNode = tableChildren[rowIdx]
    if (rowNode.type !== 'tablerow') continue

    const cells: TableCell[] = []
    for (const cellNode of rowNode.children ?? []) {
      if (cellNode.type !== 'tablecell') continue

      const cellParagraphs = convertNodes(cellNode.children ?? [])
      if (cellParagraphs.length === 0) {
        cellParagraphs.push(new Paragraph({}))
      }

      cells.push(
        new TableCell({
          children: cellParagraphs as (Paragraph | Table)[],
          borders: CELL_BORDERS,
          margins: {
            top: convertMillimetersToTwip(1.5),
            bottom: convertMillimetersToTwip(1.5),
            left: convertMillimetersToTwip(2),
            right: convertMillimetersToTwip(2),
          },
          // Header row shading
          ...(rowIdx === 0 && {
            shading: {
              type: ShadingType.CLEAR,
              color: 'auto',
              fill: 'E8E8E8',
            },
          }),
        }),
      )
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }))
    }
  }

  return rows
}

/** Flatten list items into paragraphs with numbering */
function flattenListItems(
  nodes: LexicalNode[],
  reference: string,
  level: number,
  result: FileChild[],
): void {
  for (const item of nodes) {
    if (item.type === 'listitem') {
      const inlineChildren: LexicalNode[] = []
      const nestedLists: LexicalNode[] = []

      for (const child of item.children ?? []) {
        if (child.type === 'list') {
          nestedLists.push(child)
        } else {
          inlineChildren.push(child)
        }
      }

      if (inlineChildren.length > 0) {
        result.push(
          new Paragraph({
            children: convertInlineNodes(inlineChildren),
            numbering: { reference, level },
            spacing: { after: 60 },
          }),
        )
      }

      for (const nested of nestedLists) {
        const nestedRef = nested.listType === 'number' ? 'number-numbering' : 'bullet-numbering'
        flattenListItems(nested.children ?? [], nestedRef, level + 1, result)
      }
    }
  }
}

/** Convert inline Lexical nodes to docx ParagraphChild elements */
function convertInlineNodes(nodes: LexicalNode[]): ParagraphChild[] {
  const result: ParagraphChild[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        const format = typeof node.format === 'number' ? node.format : 0
        result.push(
          new TextRun({
            text: node.text ?? '',
            bold: Boolean(format & IS_BOLD),
            italics: Boolean(format & IS_ITALIC),
            underline: (format & IS_UNDERLINE)
              ? { type: 'single' as const }
              : undefined,
          }),
        )
        break
      }

      case 'linebreak': {
        result.push(new TextRun({ break: 1 }))
        break
      }

      case 'link':
      case 'autolink': {
        const url = node.url ?? ''
        const safeUrl = sanitizeUrl(url)
        const linkChildren = convertInlineNodes(node.children ?? []) as TextRun[]

        if (safeUrl) {
          result.push(
            new ExternalHyperlink({
              link: safeUrl,
              children: linkChildren.length > 0
                ? linkChildren
                : [new TextRun({ text: safeUrl })],
            }),
          )
        } else {
          result.push(...(linkChildren.length > 0 ? linkChildren : [new TextRun({ text: url })]))
        }
        break
      }

      case 'tab': {
        result.push(new TextRun({ text: '\t' }))
        break
      }

      default:
        if (node.children) {
          result.push(...convertInlineNodes(node.children))
        }
        break
    }
  }

  return result
}

/* ── Markdown → DOCX ── */

type MdastNode = {
  type: string
  children?: MdastNode[]
  value?: string
  url?: string
  title?: string | null
  depth?: number
  ordered?: boolean
  start?: number | null
  lang?: string | null
  align?: (string | null)[]
}

/**
 * Convert markdown to a DOCX buffer.
 * Uses unified/remark-parse/remark-gfm → mdast → docx objects.
 */
export async function markdownToDocxBuffer(
  markdown: string,
  options: { title: string; createdAt?: string },
): Promise<Buffer> {
  const { unified } = await import('unified')
  const remarkParse = (await import('remark-parse')).default
  const remarkGfm = (await import('remark-gfm')).default

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastNode
  const children = mdastToDocx(tree.children ?? [])
  const doc = buildDocumentShell(children, options)
  return await Packer.toBuffer(doc)
}

/** Convert mdast nodes to docx FileChild elements */
function mdastToDocx(nodes: MdastNode[]): FileChild[] {
  const result: FileChild[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const depth = node.depth ?? 1
        const tag = `h${Math.min(depth, 6)}`
        const heading = HEADING_MAP[tag]
        result.push(
          new Paragraph({
            heading: heading ?? HeadingLevel.HEADING_1,
            children: mdastInlineToDocx(node.children ?? []),
          }),
        )
        break
      }

      case 'paragraph': {
        result.push(
          new Paragraph({
            children: mdastInlineToDocx(node.children ?? []),
            spacing: { after: 120 },
          }),
        )
        break
      }

      case 'list': {
        const isOrdered = node.ordered === true
        const reference = isOrdered ? 'number-numbering' : 'bullet-numbering'
        mdastListItems(node.children ?? [], reference, 0, result)
        break
      }

      case 'blockquote': {
        const bqChildren = mdastToDocx(node.children ?? [])
        for (const child of bqChildren) {
          if (child instanceof Paragraph) {
            result.push(
              new Paragraph({
                children: mdastInlineToDocx(node.children?.[0]?.children ?? []).map((c) => {
                  if (c instanceof TextRun) {
                    return new TextRun({
                      text: (c as unknown as { options: { text?: string } }).options?.text ?? '',
                      italics: true,
                      color: '555555',
                    })
                  }
                  return c
                }),
                indent: { left: 720 },
                border: {
                  left: {
                    color: 'CCCCCC',
                    space: 4,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
                spacing: { after: 120 },
              }),
            )
          } else {
            result.push(child)
          }
        }
        break
      }

      case 'table': {
        const tableRows = mdastTableToDocx(node)
        if (tableRows.length > 0) {
          result.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          )
          result.push(new Paragraph({ spacing: { before: 60, after: 120 } }))
        }
        break
      }

      case 'thematicBreak': {
        result.push(
          new Paragraph({
            border: {
              bottom: {
                color: 'CCCCCC',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
        )
        break
      }

      case 'code': {
        const lines = (node.value ?? '').split('\n')
        for (const line of lines) {
          result.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: 'Courier New',
                  size: 18,
                }),
              ],
              spacing: { after: 0 },
              shading: {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: 'F5F5F5',
              },
            }),
          )
        }
        result.push(new Paragraph({ spacing: { after: 120 } }))
        break
      }

      case 'html': {
        // Skip raw HTML blocks
        break
      }

      default:
        break
    }
  }

  return result
}

/** Convert mdast table to docx TableRows */
function mdastTableToDocx(node: MdastNode): TableRow[] {
  const rows: TableRow[] = []

  for (let rowIdx = 0; rowIdx < (node.children ?? []).length; rowIdx++) {
    const rowNode = (node.children ?? [])[rowIdx]
    if (rowNode.type !== 'tableRow') continue

    const cells: TableCell[] = []
    for (const cellNode of rowNode.children ?? []) {
      if (cellNode.type !== 'tableCell') continue

      const inlines = mdastInlineToDocx(cellNode.children ?? [])
      cells.push(
        new TableCell({
          children: [new Paragraph({ children: inlines })],
          borders: CELL_BORDERS,
          margins: {
            top: convertMillimetersToTwip(1.5),
            bottom: convertMillimetersToTwip(1.5),
            left: convertMillimetersToTwip(2),
            right: convertMillimetersToTwip(2),
          },
          ...(rowIdx === 0 && {
            shading: {
              type: ShadingType.CLEAR,
              color: 'auto',
              fill: 'E8E8E8',
            },
          }),
        }),
      )
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }))
    }
  }

  return rows
}

/** Flatten mdast list items into paragraphs with numbering */
function mdastListItems(
  nodes: MdastNode[],
  reference: string,
  level: number,
  result: FileChild[],
): void {
  for (const item of nodes) {
    if (item.type !== 'listItem') continue

    for (const child of item.children ?? []) {
      if (child.type === 'paragraph') {
        result.push(
          new Paragraph({
            children: mdastInlineToDocx(child.children ?? []),
            numbering: { reference, level },
            spacing: { after: 60 },
          }),
        )
      } else if (child.type === 'list') {
        const nestedRef = child.ordered === true ? 'number-numbering' : 'bullet-numbering'
        mdastListItems(child.children ?? [], nestedRef, level + 1, result)
      }
    }
  }
}

/** Convert mdast inline nodes to docx ParagraphChild elements */
function mdastInlineToDocx(nodes: MdastNode[], parentBold = false, parentItalic = false): ParagraphChild[] {
  const result: ParagraphChild[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        result.push(
          new TextRun({
            text: node.value ?? '',
            bold: parentBold || undefined,
            italics: parentItalic || undefined,
          }),
        )
        break
      }

      case 'strong': {
        result.push(...mdastInlineToDocx(node.children ?? [], true, parentItalic))
        break
      }

      case 'emphasis': {
        result.push(...mdastInlineToDocx(node.children ?? [], parentBold, true))
        break
      }

      case 'inlineCode': {
        result.push(
          new TextRun({
            text: node.value ?? '',
            font: 'Courier New',
            size: 18,
          }),
        )
        break
      }

      case 'link': {
        const url = node.url ?? ''
        const safeUrl = sanitizeUrl(url)
        const linkChildren = mdastInlineToDocx(node.children ?? []) as TextRun[]

        if (safeUrl) {
          result.push(
            new ExternalHyperlink({
              link: safeUrl,
              children: linkChildren.length > 0
                ? linkChildren
                : [new TextRun({ text: safeUrl })],
            }),
          )
        } else {
          result.push(...(linkChildren.length > 0 ? linkChildren : [new TextRun({ text: url })]))
        }
        break
      }

      case 'break': {
        result.push(new TextRun({ break: 1 }))
        break
      }

      case 'delete': {
        // Strikethrough
        result.push(
          ...mdastInlineToDocx(node.children ?? []).map((c) => {
            if (c instanceof TextRun) {
              return new TextRun({
                text: (c as unknown as { options: { text?: string } }).options?.text ?? '',
                strike: true,
              })
            }
            return c
          }),
        )
        break
      }

      default:
        if (node.children) {
          result.push(...mdastInlineToDocx(node.children, parentBold, parentItalic))
        } else if (node.value) {
          result.push(new TextRun({ text: node.value }))
        }
        break
    }
  }

  return result
}
