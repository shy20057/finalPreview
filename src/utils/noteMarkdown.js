import TurndownService from 'turndown'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

export const NOTE_TEXT_COLORS = ['green', 'blue', 'red', 'yellow', 'purple']

export const NOTE_HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'red', 'purple']

const COLOR_HEX = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
}

const HEX_TO_NAME = Object.fromEntries(
  Object.entries(COLOR_HEX).map(([name, hex]) => [hex.toLowerCase(), name])
)

function resolveColorName(value) {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (NOTE_TEXT_COLORS.includes(v) || NOTE_HIGHLIGHT_COLORS.includes(v)) return v
  if (HEX_TO_NAME[v]) return HEX_TO_NAME[v]
  if (v.startsWith('var(--note-')) {
    const name = v.replace('var(--note-', '').replace(')', '')
    if (COLOR_HEX[name]) return name
  }
  const rgbMatch = v.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    const hex = '#' + [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map(n => Number(n).toString(16).padStart(2, '0'))
      .join('')
    return HEX_TO_NAME[hex] || null
  }
  return null
}

function protectSegments(text) {
  const blocks = []
  let protectedText = text.replace(/```[\s\S]*?```/g, (match) => {
    blocks.push(match)
    return `\x00BLOCK${blocks.length - 1}\x00`
  })

  const inlines = []
  protectedText = protectedText.replace(/`([^`\n]+)`/g, (match, content) => {
    const pipeIdx = content.indexOf('|')
    if (pipeIdx > 0) {
      const color = content.slice(0, pipeIdx)
      const inner = content.slice(pipeIdx + 1)
      if (NOTE_TEXT_COLORS.includes(color)) {
        return `<span style="color: var(--note-${color})">${inner}</span>`
      }
    }
    inlines.push(match)
    return `\x00INLINE${inlines.length - 1}\x00`
  })

  return { text: protectedText, blocks, inlines }
}

function restoreSegments(text, blocks, inlines) {
  let restored = text
  blocks.forEach((block, i) => {
    restored = restored.replace(`\x00BLOCK${i}\x00`, block)
  })
  inlines.forEach((inline, i) => {
    restored = restored.replace(`\x00INLINE${i}\x00`, inline)
  })
  return restored
}

function applyCustomSyntax(text) {
  const { text: protectedText, blocks, inlines } = protectSegments(text)
  let html = protectedText
    .replace(/==(\w+)\|([^=\n]+?)==/g, (_, color, content) =>
      `<mark data-color="${color}" class="note-hl note-hl-${color}">${content}</mark>`)
    .replace(/==([^=\n]+?)==/g, '<mark data-color="yellow" class="note-hl note-hl-yellow">$1</mark>')
    .replace(/~~(.+?)~~/g, '<u class="wavy">$1</u>')
    .replace(/~([^~\n]+?)~/g, '<u>$1</u>')

  return restoreSegments(html, blocks, inlines)
}

export function markdownToHtml(text) {
  if (!text?.trim()) return '<p></p>'
  const withCustom = applyCustomSyntax(text)
  return marked.parse(withCustom)
}

let turndownInstance = null

function getTurndown() {
  if (turndownInstance) return turndownInstance

  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  })

  td.addRule('underline', {
    filter: (node) => node.nodeName === 'U',
    replacement: (content, node) => {
      if (node.classList.contains('wavy')) return `~~${content}~~`
      return `~${content}~`
    },
  })

  td.addRule('highlight', {
    filter: 'mark',
    replacement: (content, node) => {
      const color =
        node.getAttribute('data-color') ||
        [...node.classList].find(c => c.startsWith('note-hl-'))?.replace('note-hl-', '')
      if (color && color !== 'note-hl' && NOTE_HIGHLIGHT_COLORS.includes(color)) {
        return `==${color}|${content}==`
      }
      return `==${content}==`
    },
  })

  td.addRule('textColor', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false
      return Boolean(node.style.color || node.getAttribute('data-color'))
    },
    replacement: (content, node) => {
      const colorName =
        resolveColorName(node.getAttribute('data-color')) ||
        resolveColorName(node.style.color)
      if (colorName) return `\`${colorName}|${content}\``
      return content
    },
  })

  td.addRule('image', {
    filter: 'img',
    replacement: (_content, node) => {
      const alt = node.getAttribute('alt') || ''
      const src = node.getAttribute('src') || ''
      return `\n\n![${alt}](${src})\n\n`
    },
  })

  turndownInstance = td
  return td
}

export function htmlToMarkdown(html) {
  if (!html?.trim()) return ''
  return getTurndown().turndown(html).trim()
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
