// SVG images are usable without injecting DOM nodes into a mini program.
export function svgDataUri(svg) {
  const bytes = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  const buffer = Uint8Array.from(bytes, character => character.charCodeAt(0)).buffer
  return `data:image/svg+xml;base64,${uni.arrayBufferToBase64(buffer)}`
}
