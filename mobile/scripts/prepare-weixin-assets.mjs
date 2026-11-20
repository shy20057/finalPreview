import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const mobile = path.resolve(path.dirname(scriptPath), '..')
const source = path.join(mobile, 'static/assets/images/sunflowers.jpg')
const destination = path.join(mobile, 'static/mp-weixin/sunflowers.jpg')
const maxBytes = 256 * 1024

// Run before uni-app starts copying static files, in both run and release modes.
// The original painting remains available to App/H5 at its existing path.
export async function prepareWeixinAssets(Jimp) {
  const sourceStat = await fs.stat(source)
  const scriptStat = await fs.stat(scriptPath)
  const destinationStat = await fs.stat(destination).catch((error) => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (destinationStat && destinationStat.size > 0 && destinationStat.size <= maxBytes &&
      destinationStat.mtimeMs >= Math.max(sourceStat.mtimeMs, scriptStat.mtimeMs)) {
    return
  }

  const image = await Jimp.read(source)
  image.scaleToFit(960, 960).quality(70)
  let buffer = await image.getBufferAsync(Jimp.MIME_JPEG)
  if (buffer.length > maxBytes) {
    image.scaleToFit(768, 768).quality(55)
    buffer = await image.getBufferAsync(Jimp.MIME_JPEG)
  }
  if (buffer.length > maxBytes) {
    throw new Error('WeChat background exceeds the 256KB asset budget.')
  }
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, buffer)
}
