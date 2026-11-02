<template>
  <!-- #ifdef APP-PLUS || H5 -->
  <view :id="hostId" class="star-field" :enabled="{ id: hostId, active }" :change:enabled="stars.setActive" />
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <view class="star-field">
    <image class="star-field-image" src="/static/assets/images/starry-night.jpg" mode="aspectFill" />
  </view>
  <!-- #endif -->
</template>
<script>export default { props: { active: { type: Boolean, default: true } }, data() { return { hostId: 'fp-stars-' + Math.random().toString(36).slice(2) } } }</script>
<script module="stars" lang="renderjs">
import { installViewLayout } from '../utils/viewLayout.js?compat=2'
export default {
  mounted() { this.ready = true; if (this.pending) this.setActive(this.pending) },
  methods: {
    start(host) {
    installViewLayout(host.closest('.auth-page'))
    const thisOwner = this
    this.active = true
    let rafId = null
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'width:100%;height:100%;display:block'
    host.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  let w, h, stars = [], shootingStars = [], nebulas = []

  function resize() {
    w = canvas.width = canvas.offsetWidth
    h = canvas.height = canvas.offsetHeight
    const count = Math.floor((w * h) / 3500) // 密度提高
    stars = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.2,
        alpha: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.005,
        color: Math.random() > 0.8 ? 'rgba(180,200,255,' : (Math.random() > 0.5 ? 'rgba(200,220,255,' : 'rgba(160,180,240,'),
      })
    }
    // 星云
    nebulas = []
    for (let i = 0; i < 4; i++) {
      nebulas.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 200 + 150,
        color: ['rgba(91,138,204,', 'rgba(122,163,232,', 'rgba(70,100,180,', 'rgba(140,100,200,'][i],
        alpha: Math.random() * 0.08 + 0.04,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003,
      })
    }
  }

  function spawnShooting() {
    if (Math.random() < 0.005) {
      shootingStars.push({
        x: Math.random() * w * 0.6, y: Math.random() * h * 0.4,
        vx: Math.random() * 5 + 3, vy: Math.random() * 2.5 + 1,
        life: 1,
      })
    }
  }

  function draw() {
    if (!thisOwner.active || !canvas.isConnected) return
    ctx.clearRect(0, 0, w, h)
    const grad = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.5, h * 0.5, Math.max(w, h))
    grad.addColorStop(0, '#1a1a3e')
    grad.addColorStop(0.5, '#0d0e1a')
    grad.addColorStop(1, '#060614')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 星云
    for (const n of nebulas) {
      n.phase += n.speed
      const a = n.alpha + Math.sin(n.phase) * 0.02
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
      ng.addColorStop(0, n.color + Math.max(0.01, a) + ')')
      ng.addColorStop(1, n.color + '0)')
      ctx.fillStyle = ng
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 星星
    for (const s of stars) {
      s.phase += s.speed
      const a = Math.max(0.1, s.alpha + Math.sin(s.phase) * 0.25)
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = s.color + a + ')'
      ctx.fill()
      // 较亮的星加十字光芒
      if (s.r > 1.2) {
        ctx.strokeStyle = s.color + (a * 0.3) + ')'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(s.x - s.r * 3, s.y); ctx.lineTo(s.x + s.r * 3, s.y)
        ctx.moveTo(s.x, s.y - s.r * 3); ctx.lineTo(s.x, s.y + s.r * 3)
        ctx.stroke()
      }
    }

    // 流星
    spawnShooting()
    shootingStars = shootingStars.filter(ss => {
      ss.x += ss.vx; ss.y += ss.vy; ss.life -= 0.012
      if (ss.life <= 0) return false
      const tg = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 10, ss.y - ss.vy * 10)
      tg.addColorStop(0, `rgba(180,200,255,${ss.life})`)
      tg.addColorStop(1, 'rgba(180,200,255,0)')
      ctx.strokeStyle = tg
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(ss.x, ss.y)
      ctx.lineTo(ss.x - ss.vx * 10, ss.y - ss.vy * 10)
      ctx.stroke()
      return true
    })

    rafId = requestAnimationFrame(draw)
  }


    this.draw = draw
    this.resize = resize
    resize(); draw()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const observer = new MutationObserver(() => {
      if (!canvas.isConnected) {
        cancelAnimationFrame(rafId)
        resizeObserver.disconnect()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    this.cancel = () => cancelAnimationFrame(rafId)
    },
    setActive(value) {
      this.pending = value
      if (!this.ready) return
      const host = document.getElementById(value.id)
      if (!host) { setTimeout(() => this.setActive(value), 16); return }
      if (!this.draw) this.start(host)
      this.active = value.active
      this.cancel?.()
      if (value.active && this.draw) { this.resize(); this.draw() }
    },
  },
}
</script>
<style scoped>
.star-field { width: 100%; height: 100%; }
/* #ifdef MP-WEIXIN */
.star-field-image { display: block; width: 100%; height: 100%; opacity: 0.45; }
/* #endif */
</style>

