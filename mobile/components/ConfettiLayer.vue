<!-- mobile/components/ConfettiLayer.vue -->
<!--
  Port of src/utils/confetti.js — the web version injected <span> elements into
  document.body. The App-Vue runtime has no DOM, so the burst is broadcast as a
  global event and the particles are rendered here as real elements.
  Visual parameters (colours, counts, distances, easing) are identical.
-->
<template>
  <view class="confetti-layer">
    <view
      v-for="p in particles"
      :key="p.id"
      class="confetti-particle"
      :class="p.ribbon ? 'confetti-ribbon' : 'confetti-dot'"
      :style="p.style"
    />
  </view>
</template>

<script>
import { ref } from 'vue'
import { CONFETTI_COLORS, CONFETTI_PARTICLE_COUNT, CONFETTI_RIBBON_COUNT } from '../utils/confetti.js'

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

export default {
  name: 'ConfettiLayer',
  setup() {
    const particles = ref([])
    let seq = 0

    function spawn(x, y) {
      const created = []

      for (let i = 0; i < CONFETTI_PARTICLE_COUNT; i++) {
        const size = randomBetween(3, 7)
        const angle = randomBetween(0, Math.PI * 2)
        const distance = randomBetween(25, 60)
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
        const delay = randomBetween(0, 0.08)
        created.push({
          id: ++seq,
          ribbon: false,
          style: {
            left: `${x}px`,
            top: `${y}px`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: color,
            '--dx': `${dx}px`,
            '--dy': `${dy}px`,
            '--rot': `${randomBetween(-360, 360)}deg`,
            animation: `confetti-fly ${randomBetween(0.55, 0.75)}s cubic-bezier(0, 0.7, 0.3, 1) ${delay}s forwards`,
          },
        })
      }

      for (let i = 0; i < CONFETTI_RIBBON_COUNT; i++) {
        const w = randomBetween(4, 8)
        const h = randomBetween(10, 18)
        const angle = randomBetween(0, Math.PI * 2)
        const distance = randomBetween(30, 55)
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
        const delay = randomBetween(0, 0.1)
        created.push({
          id: ++seq,
          ribbon: true,
          style: {
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            borderRadius: '2px',
            background: color,
            '--dx': `${dx}px`,
            '--dy': `${dy}px`,
            '--rot': `${randomBetween(-540, 540)}deg`,
            animation: `confetti-fly ${randomBetween(0.6, 0.8)}s cubic-bezier(0, 0.7, 0.3, 1) ${delay}s forwards`,
          },
        })
      }

      particles.value = particles.value.concat(created)

      // 动画结束后移除（与原版 animationend 监听等价）
      setTimeout(() => {
        const ids = created.map((p) => p.id)
        particles.value = particles.value.filter((p) => !ids.includes(p.id))
      }, 1200)
    }

    uni.$on('confetti-burst', (payload) => spawn(payload.x, payload.y))

    return { particles }
  },
}
</script>

<style scoped>
.confetti-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

.confetti-particle {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
}
</style>
