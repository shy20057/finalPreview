<template><view :id="hostId" class="view-transition" :config="{ id: hostId, name }" :change:config="motion.setup"><slot /></view></template>
<script>
export default {
  props: { name: { type: String, default: 'v' } },
  data() { return { hostId: 'fp-motion-' + Math.random().toString(36).slice(2) } },
}
</script>
<script module="motion" lang="renderjs">
export default {
  methods: {
    setup(value) {
      const host = document.getElementById(value.id)
      if (!host) { setTimeout(() => this.setup(value), 16); return }
      host.style.display = 'contents'
      if (this.observer) return
      const enter = node => {
        if (node.nodeType !== 1) return
        node.classList.add(value.name + '-enter-from', value.name + '-enter-active')
        requestAnimationFrame(() => requestAnimationFrame(() => {
          node.classList.remove(value.name + '-enter-from')
          node.classList.add(value.name + '-enter-to')
          setTimeout(() => node.classList.remove(value.name + '-enter-active', value.name + '-enter-to'), 600)
        }))
      }
      this.observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(enter)))
      this.observer.observe(host, { childList: true })
      this.cleanup = new MutationObserver(() => {
        if (!host.isConnected) { this.observer.disconnect(); this.cleanup.disconnect() }
      })
      this.cleanup.observe(document.body, { childList: true, subtree: true })
    },
  },
}
</script>
