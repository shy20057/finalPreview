<template>
  <!-- #ifdef APP-PLUS || H5 -->
  <view :id="hostId" class="score-ring-graphic" :value="{ id: hostId, score, color }" :change:value="ring.update" />
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <image class="score-ring-graphic" :src="miniProgramSource" mode="aspectFit" />
  <!-- #endif -->
</template>
<script>
// #ifdef MP-WEIXIN
import { svgDataUri } from '../utils/svgDataUri.js'
import { useAppStore } from '../stores/app.js'
// #endif
export default {
  props: { score: { type: Number, default: 0 }, color: { type: String, default: 'var(--accent-primary)' } },
  data() { return { hostId: `fp-score-${Math.random().toString(36).slice(2)}` } },
  // #ifdef MP-WEIXIN
  computed: {
    miniProgramSource() {
      const light = useAppStore().theme === 'light'
      const themeColors = {
        '--accent-primary': light ? '#d4a0a0' : '#5b8acc',
        '--text-muted': light ? '#6b6b85' : '#7a7a92',
        '--success': light ? '#16a34a' : '#22c55e',
        '--warning': light ? '#d97706' : '#f59e0b',
        '--error': light ? '#e11d48' : '#f43f5e',
      }
      const variable = /^var\((--[\w-]+)\)$/.exec(this.color)
      const resolvedColor = variable ? themeColors[variable[1]] : this.color
      const stroke = /^(#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i.test(resolvedColor || '') ? resolvedColor : themeColors['--accent-primary']
      const border = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
      const score = Math.min(100, Math.max(0, Number(this.score) || 0))
      return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="60" fill="none" stroke="${border}" stroke-width="10"/><circle cx="70" cy="70" r="60" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="${377 - 377 * score / 100}" transform="rotate(-90 70 70)"/></svg>`)
    },
  },
  // #endif
}
</script>
<script module="ring" lang="renderjs">
export default {
  mounted() { this.ready = true; if (this.value) this.update(this.value) },
  methods: {
    update(value) {
      this.value = value
      if (!this.ready) return
      const host = document.getElementById(value.id)
      if (!host) { setTimeout(() => this.update(value), 16); return }
      if (!host.firstChild) {
        host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-color)" stroke-width="10"/><circle class="progress" cx="70" cy="70" r="60" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="377" transform="rotate(-90 70 70)" style="transition:stroke-dashoffset .8s ease-out"/></svg>'
      }
      const circle = host.querySelector('.progress')
      circle.setAttribute('stroke', value.color)
      requestAnimationFrame(() => circle.setAttribute('stroke-dashoffset', String(377 - 377 * value.score / 100)))
    },
  },
}
</script>
<style scoped>.score-ring-graphic { display: block; width: 140px; height: 140px; }</style>
