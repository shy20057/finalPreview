<template>
  <view :id="hostId" class="score-ring-graphic" :value="{ id: hostId, score, color }" :change:value="ring.update" />
</template>
<script>
export default {
  props: { score: { type: Number, default: 0 }, color: { type: String, default: 'var(--accent-primary)' } },
  data() { return { hostId: `fp-score-${Math.random().toString(36).slice(2)}` } },
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
