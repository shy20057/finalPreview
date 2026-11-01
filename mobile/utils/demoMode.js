/**
 * 演示模式开关 —— uni-app port of src/utils/demoMode.js
 *
 * 原版依赖 Vite 的 .env（VITE_DEMO_MODE=true）。HBuilderX 工程不加载 .env，
 * 因此这里保留同样的判断逻辑，取不到 env 时按"关闭"处理（与原版默认一致）。
 */

let env = {}
try {
  // eslint-disable-next-line no-undef
  env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
} catch {
  env = {}
}

export const isDemoMode = env.VITE_DEMO_MODE === 'true'
export const demoUsername = 'demo'
export const demoPassword = 'demo123456'
export const demoToken = 'finalprep-demo-session'
