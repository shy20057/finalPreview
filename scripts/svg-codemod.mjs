#!/usr/bin/env node
/**
 * SVG codemod for the uni-app (App-Vue) port.
 *
 * The uni-app App-Vue runtime does NOT render inline <svg> elements — the
 * template compiler emits them as unknown elements and they never paint.
 * A CSS mask does work, and it keeps the original `stroke="currentColor"`
 * theming: the mask uses the alpha channel of the SVG, while the visible
 * colour comes from `background-color: currentColor`.
 *
 * This script rewrites every inline SVG in the mobile Vue components into
 * <AppIcon name="…" :size="…" /> and collects the shapes into
 * mobile/utils/icons.js as base64 data URIs.
 *
 * It also:
 *   - converts <img src="/x"> → <image src="/static/x">
 *   - rewrites `svg` selectors inside <style> blocks to `.app-icon`
 *
 * Usage: node scripts/svg-codemod.mjs [--dry]
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { parse as parseSfc } from '@vue/compiler-sfc'
import postcss from 'postcss'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MOBILE = path.join(ROOT, 'mobile')
const ICONS_FILE = path.join(MOBILE, 'utils', 'icons.js')
const DRY = process.argv.includes('--dry')

/* ────────────────────────────── helpers ────────────────────────────── */

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'unpackage') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.vue')) out.push(p)
  }
  return out
}

/** Split an SVG open tag into its attributes (name → raw value). */
function parseAttrs(tag) {
  const attrs = {}
  const re = /([:@#a-zA-Z_][-.:\w]*)(\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let m
  while ((m = re.exec(tag))) {
    const name = m[1]
    if (!name || /^(xmlns|xmlns:xlink)$/.test(name)) continue
    attrs[name] = m[4] ?? m[5] ?? m[6] ?? ''
  }
  return attrs
}

/** `currentColor` → `#000`; the mask only reads alpha, so the hue is irrelevant. */
function canonicalize(svg) {
  return svg
    .replace(/\s+/g, ' ')
    .replace(/currentColor/g, '#000')
    .replace(/<svg([^>]*)>/, (all, inner) => {
      const attrs = parseAttrs(inner)
      delete attrs.width
      delete attrs.height
      for (const key of Object.keys(attrs)) {
        if (/^[:@]|^v-/.test(key)) delete attrs[key]
      }
      const kept = Object.entries(attrs)
        .map(([k, v]) => (v === '' ? k : `${k}="${v}"`))
        .join(' ')
      return `<svg xmlns="http://www.w3.org/2000/svg"${kept ? ' ' + kept : ''}>`
    })
    .trim()
}

function iconKey(svg) {
  return 'i' + crypto.createHash('sha1').update(canonicalize(svg)).digest('hex').slice(0, 8)
}

function toDataUri(svg) {
  return 'data:image/svg+xml;base64,' + Buffer.from(canonicalize(svg), 'utf8').toString('base64')
}

/* ──────────────────────────── the transform ─────────────────────────── */

/** Replace inline <svg>…</svg> with <AppIcon …>. */
function replaceSvgs(source, icons) {
  // <svg …> … </svg>  (self-closing not used in the original)
  const re = /<svg\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/svg>/g
  let changed = false
  const out = source.replace(re, (whole, rawAttrs, body) => {
    if (/\s(?:[:@][\w-]+|v-(?:for|if|else))\s*=/.test(body)) {
      throw new Error('Dynamic SVG must be adapted as a view-layer graphic before migrating icons.')
    }
    changed = true
    const attrs = parseAttrs(rawAttrs)
    const key = iconKey(whole)
    if (!icons.has(key)) icons.set(key, toDataUri(whole))

    const keep = []
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'width' || k === 'height') continue
      if (k === 'class') keep.push(`class="${v}"`)
      else if (k === 'style') keep.push(`style="${v}"`)
      else if (k === 'viewBox' || k === 'fill' || k === 'stroke' || k === 'stroke-width' ||
               k === 'stroke-linecap' || k === 'stroke-linejoin' || k === 'opacity') continue
      else keep.push(v === '' ? k : `${k}="${v}"`)
    }

    // size: prefer width, else height, else 24
    let size = 24
    const w = attrs.width
    const h = attrs.height
    const num = (v) => (v && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null)
    if (num(w) != null) size = num(w)
    else if (num(h) != null) size = num(h)
    else if (w && /^[\d.]+(px|rpx)$/.test(w)) size = parseFloat(w)
    else if (h && /^[\d.]+(px|rpx)$/.test(h)) size = parseFloat(h)

    const styleBits = []
    if (attrs.width && !num(w)) styleBits.push(`width:${attrs.width}`)
    if (attrs.height && !num(h)) styleBits.push(`height:${attrs.height}`)

    const parts = [`<AppIcon name="${key}" :size="${size}"`]
    if (/(?:^|[\s<])(?:fill|stroke)=["'](?!none["']|currentColor["']|transparent["'])[^"']+["']/.test(whole)) parts.push(':colored="true"')
    if (num(w) != null && num(h) != null && num(w) !== num(h)) parts.push(`:width="${num(w)}" :height="${num(h)}"`)
    if (styleBits.length) parts.push(`:style="'${styleBits.join(';')}'"`)
    for (const k of keep) parts.push(k)
    return parts.join(' ') + ' />'
  })
  return { out, changed }
}

/** <img src="/x"> → <image src="/static/x"> ; other <img> → <image> */
function replaceImgs(source) {
  let changed = false
  const out = source.replace(/<img\b([^>]*)>/g, (whole, rawAttrs) => {
    changed = true
    const attrs = parseAttrs(rawAttrs)
    const keep = []
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'alt' || k === 'aria-hidden') continue
      if (k === 'src' && v.startsWith('/') && !v.startsWith('//')) {
        keep.push(`src="/static${v}"`)
      } else {
        keep.push(v === '' ? k : `${k}="${v}"`)
      }
    }
    return `<image ${keep.join(' ')} />`
  })
  return { out, changed }
}

/** `svg` in CSS selectors → `.app-icon` */
function rewriteCss(source) {
  const css = postcss.parse(source)
  css.walkRules(rule => { rule.selector = rule.selector.replace(/(^|[\s>+~,(])svg(?=[\s.#:>+~,\[\])]|$)/g, '$1.app-icon') })
  const out = css.toString()
  return { out, changed: out !== source }
}

/* ─────────────────────────────── main ───────────────────────────────── */

const files = walk(MOBILE)
const icons = new Map()

// keep already-known icons so re-running the codemod stays stable
if (fs.existsSync(ICONS_FILE)) {
  const existing = fs.readFileSync(ICONS_FILE, 'utf8').split('export const ICON_FILLED_DATA')[0]
  const re = /^\s*([a-z0-9]+):\s*'([^']*)',?\s*$/gim
  let m
  while ((m = re.exec(existing))) icons.set(m[1], m[2])
}

let touched = 0
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const { descriptor } = parseSfc(src)
  let out = src
  // Only rewrite template markup, never SVG strings or DOM selectors in renderjs.
  if (descriptor.template) {
    const block = descriptor.template
    const a = replaceSvgs(block.content, icons)
    const b = replaceImgs(a.out)
    out = out.slice(0, block.loc.start.offset) + b.out + out.slice(block.loc.end.offset)
  }
  const styles = parseSfc(out).descriptor.styles
  for (const block of [...styles].reverse()) {
    const c = rewriteCss(block.content)
    out = out.slice(0, block.loc.start.offset) + c.out + out.slice(block.loc.end.offset)
  }
  if (out !== src) {
    touched++
    if (!DRY) fs.writeFileSync(file, out)
    console.log('updated', path.relative(ROOT, file))
  }
}

// rewrite icons.js
const body = [...icons.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([k, v]) => {
    const clean = toDataUri(Buffer.from(v.split(',')[1], 'base64').toString('utf8'))
    icons.set(k, clean)
    return `  ${k}: '${clean}',`
  })
  .join('\n')
const filledBody = [...icons.entries()].map(([key, value]) => {
  const svg = Buffer.from(value.split(',')[1], 'base64').toString('utf8')
  const filled = svg.replace(/<svg([^>]*)>/, (_, attributes) => {
    const next = /\sfill="[^"]*"/.test(attributes) ? attributes.replace(/\sfill="[^"]*"/, ' fill="#000"') : attributes + ' fill="#000"'
    return `<svg${next}>`
  })
  return `  ${key}: '${toDataUri(filled)}',`
}).join('\n')
const file = `/**
 * Icon shapes for the uni-app port — generated by scripts/svg-codemod.mjs.
 *
 * The App-Vue runtime cannot render inline <svg>, so every icon is applied as
 * a CSS mask. The mask consumes the SVG's alpha channel, while the colour is
 * taken from the element's own color, matching stroke=currentColor
 * did in the original web app.
 */
export const ICON_DATA = {
${body}
}
export const ICON_FILLED_DATA = {
${filledBody}
}
`
if (!DRY) fs.writeFileSync(ICONS_FILE, file)

console.log(`\n${touched} file(s) updated, ${icons.size} icons, ${DRY ? '(dry run)' : 'written'}`)
