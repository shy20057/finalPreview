import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hbuilder = process.env.HBUILDERX_HOME || 'E:/a-developNew/HBuilderX'
const compiler = path.join(hbuilder, 'plugins/uniapp-cli-vite')
const cli = path.join(compiler, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js')
const platform = process.argv[2] || 'app'
if (!['app', 'h5'].includes(platform)) throw new Error('Supported build targets: app, h5')
if (!fs.existsSync(cli)) throw new Error('Set HBUILDERX_HOME to your HBuilderX installation directory.')
const result = spawnSync(process.execPath, [cli, 'build', '-p', platform], {
  cwd: mobile, stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: path.join(compiler, 'node_modules'),
    UNI_PROJECT_TYPE: 'hbuilder', RUN_BY_HBUILDERX: 'true',
    UNI_HBUILDERX_PLUGINS: path.join(hbuilder, 'plugins'),
    UNI_CLI_CONTEXT: mobile, UNI_INPUT_DIR: mobile, UNI_PLATFORM: platform,
    UNI_OUTPUT_DIR: path.join(mobile, 'unpackage/dist/build', platform), NODE_ENV: 'production',
  },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
