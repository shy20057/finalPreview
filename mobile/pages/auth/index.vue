<template>
  <view class="auth-page">
    <!-- 全屏星空背景 -->
    <StarField class="star-canvas" :active="pageActive" />

    <!-- 星空叠层信息 -->
    <view class="visual-overlay">
      <image class="visual-logo" @longpress="configureServer" src="/static/icon.svg" />
      <view class="web-h2 visual-title">期末复习题库系统</view>
      <view class="web-p visual-tagline">AI 赋能 · 高效备考 · 智能解析</view>
      <view class="visual-features">
        <view class="feature-chip" v-for="f in features" :key="f">{{ f }}</view>
      </view>
    </view>

    <!-- 右侧表单区 -->
    <view class="form-zone">
      <!-- 模式切换 Tab -->
      <view v-if="!isDemoMode" class="mode-tabs">
        <button
          class="web-button mode-tab"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >登 录</button>
        <button
          class="web-button mode-tab"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >注 册</button>
        <view class="tab-indicator" :class="{ 'tab-right': mode === 'register' }"></view>
      </view>
      <view v-else class="demo-mode-label">前端界面演示</view>

      <!-- 卡片（不规则形状：左上大圆角 + 右下斜切） -->
      <view class="auth-card">
        <ViewTransition :name="transitionName" mode="out-in">
          <!-- 登录表单 -->
          <form v-if="mode === 'login'" key="login" class="auth-form" @submit="onLogin">
            <view class="web-h1 auth-heading" @longpress="configureServer">欢迎回来</view>
            <view class="web-p auth-subtitle">{{ isDemoMode ? '使用演示账号浏览界面，无需后端服务' : '登录以继续你的复习之旅' }}</view>

            <view v-if="isDemoMode" class="demo-login-tip">
              演示账号：<text class="web-strong">{{ demoUsername }}</text>　密码：<text class="web-strong">{{ demoPassword }}</text>
              <button type="button" @click="fillDemoCredentials" class="web-button">一键填入</button>
            </view>

            <view class="field">
              <label>用户名</label>
              <input v-model="loginForm.username" type="text" placeholder="输入用户名" autocomplete="username" :disabled="loading" required placeholder-class="auth-placeholder" />
            </view>
            <view class="field">
              <label>密码</label>
              <view class="password-wrap">
                <input v-model="loginForm.password" type="text" :password="!showPwd" placeholder="输入密码" autocomplete="current-password" :disabled="loading" required placeholder-class="auth-placeholder" />
                <button type="button" class="web-button eye-btn" @click="showPwd = !showPwd" tabindex="-1">
                  <AppIcon name="i5e6ca02a" :size="18" v-if="showPwd" />
                  <AppIcon name="ic29898a6" :size="18" v-else />
                </button>
              </view>
            </view>

            <view v-if="error" class="auth-error">{{ error }}</view>
            <button form-type="submit" class="web-button auth-submit" :disabled="loading">{{ loading ? '登录中...' : '登 录' }}</button>
          </form>

          <!-- 注册表单 -->
          <form v-else key="register" class="auth-form" @submit="onRegister">
            <view class="web-h1 auth-heading" @longpress="configureServer">创建账号</view>
            <view class="web-p auth-subtitle">注册以开始你的复习之旅</view>

            <view class="field">
              <label>用户名</label>
              <input v-model="regForm.username" type="text" placeholder="2-20 个字符" autocomplete="username" :disabled="loading" required placeholder-class="auth-placeholder" />
            </view>
            <view class="field">
              <label>密码</label>
              <view class="password-wrap">
                <input v-model="regForm.password" type="text" :password="!showPwd" placeholder="至少 6 位" autocomplete="new-password" :disabled="loading" required placeholder-class="auth-placeholder" />
                <button type="button" class="web-button eye-btn" @click="showPwd = !showPwd" tabindex="-1">
                  <AppIcon name="i5e6ca02a" :size="18" v-if="showPwd" />
                  <AppIcon name="ic29898a6" :size="18" v-else />
                </button>
              </view>
            </view>
            <view class="field">
              <label>确认密码</label>
              <input v-model="regForm.confirm" type="text" password placeholder="再次输入密码" autocomplete="new-password" :disabled="loading" required placeholder-class="auth-placeholder" />
            </view>

            <view v-if="error" class="auth-error">{{ error }}</view>
            <button form-type="submit" class="web-button auth-submit" :disabled="loading">{{ loading ? '注册中...' : '注 册' }}</button>
          </form>
        </ViewTransition>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import StarField from '../../components/StarField.vue'
import { getApiBase } from '../../utils/api.js'
import { configureServer } from '../../utils/serverAddress.js'
const pageActive = ref(true)
onLoad(options => { syncRoute(options); mode.value = options.mode === 'register' ? 'register' : 'login' })
onShow(() => { pageActive.value = true })
onHide(() => { pageActive.value = false })
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, syncRoute, toUrl } from '@/utils/router.js'
import { useAuthStore } from '../../stores/auth.js'
import { isDemoMode, demoUsername, demoPassword } from '../../utils/demoMode.js'

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
  
}

async function onLogin() {
  if (loading.value) return
  if (!loginForm.username.trim() || !loginForm.password) { error.value = '请输入用户名和密码'; return }
  error.value = ''
  loading.value = true
  try {
    await auth.login(loginForm.username.trim(), loginForm.password)
    const redirect = route.query.redirect || '/'
    uni.reLaunch({ url: toUrl(redirect) || '/pages/index/index' })
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally { loading.value = false }
}

async function onRegister() {
  if (loading.value) return
  if (regForm.username.trim().length < 2 || regForm.username.trim().length > 20) { error.value = '用户名需为 2-20 个字符'; return }
  if (regForm.password.length < 6) { error.value = '密码至少 6 位'; return }
  error.value = ''
  if (regForm.password !== regForm.confirm) { error.value = '两次输入的密码不一致'; return }
  loading.value = true
  try {
    await auth.register(regForm.username.trim(), regForm.password)
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (e) {
    error.value = e.message || '注册失败'
  } finally { loading.value = false }
}

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

.demo-login-tip .web-strong { color: var(--text-primary); }
.demo-login-tip .web-button {
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
