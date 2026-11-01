// Logic-layer note utilities. Browser parsers stay in noteMarkdownView.js (renderjs).
import { readImageDataUrl } from './fs.js'
export const NOTE_TEXT_COLORS = ['green', 'blue', 'red', 'yellow', 'purple']
export const NOTE_HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'red', 'purple']
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
export function readFileAsDataUrl(file) { return readImageDataUrl(file) }
