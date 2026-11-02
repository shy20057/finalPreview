<template>
  <!-- #ifdef APP-PLUS || H5 -->
  <view :id="hostId" :html="{ id: hostId, html }" :change:html="content.update" />
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <view><rich-text :nodes="miniProgramHtml" /></view>
  <!-- #endif -->
</template>
<script>
export default {
  props: { html: { type: String, default: '' } },
  data() { return { hostId: 'fp-html-' + Math.random().toString(36).slice(2) } },
  computed: {
    miniProgramHtml() {
      return this.html.replace(/(["'])\/assets\//g, '$1/static/assets/')
    },
  },
  methods: {
    openLink(href) {
      if (!/^(https?:\/\/|mailto:)/i.test(href)) return
      // #ifdef APP-PLUS
      plus.runtime.openURL(href)
      // #endif
      // #ifdef H5
      window.open(href, '_blank', 'noopener,noreferrer')
      // #endif
    },
  },
}
</script>
<script module="content" lang="renderjs">
export default {
  mounted() {
    this.ready = true
    if (this.pending) this.update(this.pending)
  },
  methods: {
    update(value) {
      this.pending = value
      if (!this.ready) return
      const host = document.getElementById(value.id)
      if (!host) { setTimeout(() => this.update(value), 16); return }
      if (!this.listening) {
        this.listening = true
        host.addEventListener('click', event => {
          const link = event.target.closest('a')
          if (link) { event.preventDefault(); this.$ownerInstance.callMethod('openLink', link.getAttribute('href') || '') }
        })
      }
      const template = document.createElement('template')
      template.innerHTML = String(value.html || '').replace(/(["'])\/assets\//g, '$1/static/assets/')
      template.content.querySelectorAll('script,iframe,object,embed,form,link,meta,base').forEach(node => node.remove())
      template.content.querySelectorAll('*').forEach(node => {
        for (const attribute of [...node.attributes]) {
          if (/^on/i.test(attribute.name) || (/^(href|src|xlink:href)$/i.test(attribute.name) && /^\s*(javascript|vbscript):/i.test(attribute.value))) node.removeAttribute(attribute.name)
        }
      })
      host.innerHTML = ''
      host.appendChild(template.content.cloneNode(true))
    },
  },
}
</script>
