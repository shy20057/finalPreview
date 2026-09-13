<template>
  <div class="auth-page">
    <!-- 全屏星空背景 -->
    <canvas ref="canvasRef" class="star-canvas"></canvas>

    <!-- 星空叠层信息 -->
    <div class="visual-overlay">
      <img class="visual-logo" src="/icon.svg" alt="" />
      <h2 class="visual-title">期末复习题库系统</h2>
      <p class="visual-tagline">AI 赋能 · 高效备考 · 智能解析</p>
      <div class="visual-features">
        <div class="feature-chip" v-for="f in features" :key="f">{{ f }}</div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-zone">
      <!-- 模式切换 Tab -->
      <div v-if="!isDemoMode" class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >登 录</button>
        <button
          class="mode-tab"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >注 册</button>
        <div class="tab-indicator" :class="{ 'tab-right': mode === 'register' }"></div>
      </div>
      <div v-else class="demo-mode-label">前端界面演示</div>

      <!-- 卡片（不规则形状：左上大圆角 + 右下斜切） -->
      <div class="auth-card">
        <Transition :name="transitionName" mode="out-in">
          <!-- 登录表单 -->
          <form v-if="mode === 'login'" key="login" class="auth-form" @submit.prevent="onLogin">
            <h1 class="auth-heading">欢迎回来</h1>
            <p class="auth-subtitle">{{ isDemoMode ? '使用演示账号浏览界面，无需后端服务' : '登录以继续你的复习之旅' }}</p>

            <div v-if="isDemoMode" class="demo-login-tip">
              演示账号：<strong>{{ demoUsername }}</strong>　密码：<strong>{{ demoPassword }}</strong>
              <button type="button" @click="fillDemoCredentials">一键填入</button>
            </div>

            <div class="field">
              <label>用户名</label>
              <input v-model="loginForm.username" type="text" placeholder="输入用户名" autocomplete="username" :disabled="loading" required />
            </div>
            <div class="field">
              <label>密码</label>
              <div class="password-wrap">
                <input v-model="loginForm.password" :type="showPwd ? 'text':'password'" placeholder="输入密码" autocomplete="current-password" :disabled="loading" required />
                <button type="button" class="eye-btn" @click="showPwd = !showPwd" tabindex="-1">
                  <svg v-if="showPwd" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <div v-if="error" class="auth-error">{{ error }}</div>
            <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? '登录中...' : '登 录' }}</button>
          </form>

          <!-- 注册表单 -->
          <form v-else key="register" class="auth-form" @submit.prevent="onRegister">
            <h1 class="auth-heading">创建账号</h1>
            <p class="auth-subtitle">注册以开始你的复习之旅</p>

            <div class="field">
              <label>用户名</label>
              <input v-model="regForm.username" type="text" placeholder="2-20 个字符" autocomplete="username" :disabled="loading" required />
            </div>
            <div class="field">
              <label>密码</label>
              <div class="password-wrap">
                <input v-model="regForm.password" :type="showPwd ? 'text':'password'" placeholder="至少 6 位" autocomplete="new-password" :disabled="loading" required />
                <button type="button" class="eye-btn" @click="showPwd = !showPwd" tabindex="-1">
                  <svg v-if="showPwd" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="field">
              <label>确认密码</label>
              <input v-model="regForm.confirm" type="password" placeholder="再次输入密码" autocomplete="new-password" :disabled="loading" required />
            </div>

            <div v-if="error" class="auth-error">{{ error }}</div>
            <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? '注册中...' : '注 册' }}</button>
          </form>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { isDemoMode, demoUsername, demoPassword } from '../utils/demoMode.js'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref(isDemoMode ? 'login' : (route.meta?.mode || (route.name === 'register' ? 'register' : 'login')))
const transitionName = ref('slide-left')
const loading = ref(false)
const error = ref('')
const showPwd = ref(false)

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', password: '', confirm: '' })

const features = isDemoMode
  ? ['题库预览', '练习界面', '错题本', '笔记系统', '个人中心', '前端演示']
  : ['智能题库', 'AI 解析', '错题本', '笔记系统', '数据隔离', '云端同步']

function fillDemoCredentials() {
  loginForm.username = demoUsername
  loginForm.password = demoPassword
}

function switchMode(m) {
  if (isDemoMode && m === 'register') return
  if (m === mode.value) return
  // login→register：从右滑入；register→login：从左滑入
  transitionName.value = m === 'register' ? 'slide-left' : 'slide-right'
  error.value = ''
  mode.value = m
  // 同步 URL（不触发导航守卫的重复跳转）
  router.replace({ name: m === 'register' ? 'register' : 'login' })
}

async function onLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(loginForm.username.trim(), loginForm.password)
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally { loading.value = false }
}

async function onRegister() {
  error.value = ''
  if (regForm.password !== regForm.confirm) { error.value = '两次输入的密码不一致'; return }
  loading.value = true
  try {
    await auth.register(regForm.username.trim(), regForm.password)
    router.replace('/')
  } catch (e) {
    error.value = e.message || '注册失败'
  } finally { loading.value = false }
}

// 星空动画
const canvasRef = ref(null)
let rafId = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
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

  resize(); draw()
  window.addEventListener('resize', resize)
  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  })
})
</script>

<style scoped>
.auth-page {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.star-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.visual-overlay {
  position: absolute;
  z-index: 1;
  left: 0;
  top: 0;
  width: 55%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  pointer-events: none;
}

.visual-logo {
  width: 72px;
  height: 72px;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 24px rgba(91, 138, 204, 0.5));
  animation: logo-float 4s ease-in-out infinite;
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

.visual-title {
  font-size: 1.9rem;
  font-weight: 700;
  color: #e8e8f0;
  margin-bottom: 0.5rem;
  letter-spacing: 0.03em;
  text-shadow: 0 0 40px rgba(91, 138, 204, 0.4);
}

.visual-tagline {
  font-size: 0.9rem;
  color: rgba(200, 210, 230, 0.65);
  margin-bottom: 1.75rem;
}

.visual-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 340px;
}

.feature-chip {
  padding: 0.3rem 0.8rem;
  background: rgba(91, 138, 204, 0.1);
  border: 1px solid rgba(91, 138, 204, 0.2);
  border-radius: 999px;
  font-size: 0.75rem;
  color: rgba(200, 210, 230, 0.75);
  backdrop-filter: blur(4px);
}

/* 右侧表单区 */
.form-zone {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 0;
  width: 45%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(13,14,26,0.3) 0%, rgba(13,14,26,0.6) 100%);
  backdrop-filter: blur(24px);
}

/* 模式切换 */
.mode-tabs {
  position: relative;
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  padding: 4px;
}

.demo-mode-label {
  margin-bottom: 1.5rem;
  color: #c8d9ff;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
}

.demo-login-tip {
  padding: 0.75rem;
  border: 1px solid rgba(91, 138, 204, 0.32);
  border-radius: 10px;
  background: rgba(91, 138, 204, 0.12);
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.8;
}

.demo-login-tip strong { color: var(--text-primary); }
.demo-login-tip button {
  display: block;
  margin-top: 0.3rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: #9dc3ff;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.mode-tab {
  position: relative;
  z-index: 1;
  padding: 0.5rem 1.75rem;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s;
}

.mode-tab.active {
  color: #fff;
}

.tab-indicator {
  position: absolute;
  z-index: 0;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 999px;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(91, 138, 204, 0.3);
}

.tab-indicator.tab-right {
  transform: translateX(100%);
}

/* 不规则卡片：左上大圆角 + 右下斜切 */
.auth-card {
  width: 100%;
  max-width: 380px;
  padding: 2.25rem;
  background: rgba(20, 20, 38, 0.65);
  border: 1px solid rgba(91, 138, 204, 0.15);
  border-radius: 28px 28px 28px 64px;
  backdrop-filter: blur(16px) saturate(140%);
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

/* 卡片顶部 accent 光线 */
.auth-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  opacity: 0.6;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-heading {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
}

.auth-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input {
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input::placeholder {
  color: rgba(150, 150, 176, 0.45);
}

.field input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  width: 100%;
  padding-right: 2.5rem;
}

.eye-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
}

.eye-btn:hover { color: var(--accent-primary); }

.auth-error {
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #f43f5e;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
}

.auth-submit {
  padding: 0.75rem;
  background: var(--accent-primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
  margin-top: 0.5rem;
}

.auth-submit:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: 0 4px 24px rgba(91, 138, 204, 0.35);
}

.auth-submit:active:not(:disabled) { transform: scale(0.98); }
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* 切换过渡动画：login→register 从右滑入，register→login 从左滑入 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

@media (max-width: 768px) {
  .visual-overlay { display: none; }
  .form-zone { width: 100%; background: transparent; }
}

@media (prefers-reduced-motion: reduce) {
  .visual-logo { animation: none; }
}
</style>
