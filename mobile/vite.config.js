import path from 'node:path'
import { createRequire } from 'node:module'
import { prepareWeixinAssets } from './scripts/prepare-weixin-assets.mjs'

const require = createRequire(import.meta.url)
const pluginsDirectory = process.env.UNI_HBUILDERX_PLUGINS
const moduleName = pluginsDirectory
  ? path.join(pluginsDirectory, 'uniapp-cli-vite/node_modules/@dcloudio/vite-plugin-uni')
  : '@dcloudio/vite-plugin-uni'
const uni = require(moduleName)

// Keep Vite from loading the parent repository's plain Vue configuration.
export default async () => {
  if (process.env.UNI_PLATFORM === 'mp-weixin') {
    // Resolve the image encoder supplied by the same HBuilderX compiler.
    const compilerRequire = createRequire(require.resolve(moduleName))
    await prepareWeixinAssets(compilerRequire('jimp'))
  }
  return { plugins: [(uni.default || uni)()] }
}
