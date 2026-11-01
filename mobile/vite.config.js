import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pluginsDirectory = process.env.UNI_HBUILDERX_PLUGINS
const moduleName = pluginsDirectory
  ? path.join(pluginsDirectory, 'uniapp-cli-vite/node_modules/@dcloudio/vite-plugin-uni')
  : '@dcloudio/vite-plugin-uni'
const uni = require(moduleName)

// Keep Vite from loading the parent repository's plain Vue configuration.
export default { plugins: [(uni.default || uni)()] }
