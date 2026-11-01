/**
 * Confetti burst utility — spawns colorful ribbon particles at a given position.
 * —— uni-app port of src/utils/confetti.js
 *
 * App 端没有 document/body，无法直接插入 DOM 节点。
 * 改为广播一个全局事件，由 components/ConfettiLayer.vue 渲染粒子，
 * 视觉参数（颜色、数量、位移、旋转、缓动）与原版一致。
 */

export const CONFETTI_COLORS = ['#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ef4444']
export const CONFETTI_PARTICLE_COUNT = 14
export const CONFETTI_RIBBON_COUNT = 6

export function burstConfetti(x, y) {
  uni.$emit('confetti-burst', { x, y })
}
