<template>
  <!-- #ifdef APP-PLUS || H5 -->
  <view :id="hostId" class="ui-bridge" :enabled="{ id: hostId, active }" :change:enabled="ui.setActive" />
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <view class="ui-bridge" />
  <!-- #endif -->
</template>

<script>
export default {
  props: { active: Boolean, scope: String },
  data() { return { hostId: `fp-keys-${Math.random().toString(36).slice(2)}` } },
  methods: { keyboard(event) { uni.$emit(`app-keydown:${this.scope}`, event) } },
}
</script>

<script module="ui" lang="renderjs">
import { installViewLayout } from '../utils/viewLayout.js?compat=2'
export default {
  mounted() {
    this.active = this.active ?? false
    this.handleKey = e => {
      if (!this.active) return
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target?.tagName) || e.target?.isContentEditable
      const panel = this.host?.closest('.app')?.querySelector('.cmd-overlay')
      if (panel && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) e.preventDefault()
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) e.preventDefault()
      this.$ownerInstance.callMethod('keyboard', { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, typing })
      if (panel && /^Arrow/.test(e.key)) requestAnimationFrame(() => panel.querySelector('.cmd-item.active')?.scrollIntoView({ block: 'nearest' }))
    }
    document.addEventListener('keydown', this.handleKey)
    this.observer = new MutationObserver(() => {
      if (this.host && !this.host.isConnected) {
        document.removeEventListener('keydown', this.handleKey)
        this.observer.disconnect()
      }
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  },
  methods: {
    setActive(value) {
      this.active = value.active
      this.host = document.getElementById(value.id)
      if (!this.host) { setTimeout(() => this.setActive(value), 16); return }
      installViewLayout(this.host.closest('.app'))
    },
  },
}
</script>

<style scoped>
.ui-bridge { display: none; }
</style>

