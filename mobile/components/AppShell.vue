<!-- mobile/components/AppShell.vue -->
<!--
  Port of src/App.vue — the application shell (header + drawer + island menu + main area).
  In the web original this lived in App.vue; uni-app's App.vue has no template, so the
  shell became a component that every page renders.
-->
<template>
  <view class="app" :class="themeClass" @click="pageTap">
    <!-- 背景氛围层（原 body::before） -->
    <view class="ambient-bg">
      <!-- #ifdef MP-WEIXIN -->
      <image class="ambient-image" :src="appStore.theme === 'light' ? '/static/assets/images/sunflowers.jpg' : '/static/assets/images/starry-night.jpg'" mode="aspectFill" />
      <view class="ambient-shade" />
      <!-- #endif -->
    </view>

    <!-- 顶栏 -->
    <view class="app-header">
      <view class="header-inner">
        <view class="header-left">
          <view class="logo" @click="go('/')">
            <image class="logo-mark" src="/static/icon.svg" mode="widthFix" />
            <text>期末复习</text>
          </view>

          <view class="header-nav hide-mobile">
            <view
              v-for="link in navLinks"
              :key="link.path"
              class="nav-link"
              :class="{ active: isActive(link) }"
              @click="go(link.path)"
            >{{ link.label }}</view>
          </view>
        </view>

        <view class="header-right">
          <DynamicBadge class="hide-mobile" />
          <view v-if="authStore.isLoggedIn" class="user-menu">
            <view class="user-profile-link" @click="go('/profile')">
              <text class="user-avatar">{{ avatarLetter }}</text>
              <text class="user-name hide-mobile">{{ authStore.username }}</text>
            </view>
            <view class="logout-btn" @click="authStore.logout()" title="退出登录">
              <AppIcon name="ie17b3b9a" :size="16" />
            </view>
          </view>
          <view class="theme-toggle" @click="appStore.cycleTheme()" :title="themeTitle">
            <!-- Sun (light) -->
            <AppIcon name="i87dde561" :size="18" v-if="appStore.theme === 'light'" />
            <!-- Star (dark-blue) -->
            <AppIcon name="id10948ab" :size="18" v-else />
          </view>
          <CommandPalette ref="commandRef" />
          <view class="hamburger hide-desktop" @click="openDrawer()" aria-label="菜单">
            <AppIcon name="i103023a7" :size="20" />
          </view>
        </view>
      </view>
    </view>

    <!-- 移动端抽屉 -->
    <MobileDrawer ref="drawerRef" />

    <!-- 浮岛辐射菜单（次级入口常驻） -->
    <FloatingIslandMenu ref="islandRef" />

    <!-- 主内容区 -->
    <view class="app-main">
      <slot />
    </view>

    <!-- 彩纸特效层 -->
    <ConfettiLayer />
    <UiBridge :active="pageActive" :scope="scope" />
  </view>
</template>

<script>
import { computed, watch, ref, provide } from 'vue'
import { onShow, onHide, onBackPress } from '@dcloudio/uni-app'
import { useAppStore } from '../stores/app.js'
import { useAuthStore } from '../stores/auth.js'
import { useRoute, useRouter } from '../utils/router.js'
import DynamicBadge from './DynamicBadge.vue'
import CommandPalette from './CommandPalette.vue'
import FloatingIslandMenu from './FloatingIslandMenu.vue'
import MobileDrawer from './MobileDrawer.vue'
import ConfettiLayer from './ConfettiLayer.vue'
import UiBridge from './UiBridge.vue'

export default {
  name: 'AppShell',
  components: { DynamicBadge, CommandPalette, FloatingIslandMenu, MobileDrawer, ConfettiLayer, UiBridge },
  setup() {
    const appStore = useAppStore()
    const authStore = useAuthStore()
    const route = useRoute()
    const router = useRouter()
    const scope = `page-${Math.random().toString(36).slice(2)}`
    provide('appScope', scope)
    const pageActive = ref(true)
    const drawerRef = ref(null)
    const commandRef = ref(null)
    const islandRef = ref(null)
    onShow(() => { pageActive.value = true })
    onHide(() => {
      pageActive.value = false
      drawerRef.value?.close()
      commandRef.value?.close()
      islandRef.value?.close()
    })
    onBackPress(() => {
      for (const overlay of [drawerRef.value, commandRef.value, islandRef.value]) {
        if (overlay?.isOpen) { overlay.close(); return true }
      }
      return false
    })

    watch(() => authStore.user?.id, (id) => appStore.initTheme(id), { immediate: true })
    watch(() => authStore.user?.id, id => {
      if (id && !appStore.aiConfigLoaded) appStore.fetchAiConfigs().catch(() => {})
    }, { immediate: true })

    const navLinks = [
      { path: '/', label: '首页', exact: true },
      { path: '/banks', label: '题库' },
      { path: '/history', label: '历史' },
      { path: '/wrongbook', label: '错题' },
      { path: '/favorites', label: '收藏' },
      { path: '/profile', label: '个人中心' },
      { path: '/settings', label: '设置' },
    ]

    const isActive = (link) =>
      link.exact ? route.path === link.path : route.path.startsWith(link.path)

    return {
      appStore,
      authStore,
      navLinks,
      isActive,
      themeClass: computed(() => `theme-${appStore.theme}`),
      themeTitle: computed(() => (appStore.theme === 'light' ? '浅色主题' : '暗蓝风格')),
      avatarLetter: computed(() => (authStore.username || '').slice(0, 1).toUpperCase()),
      go: (path) => router.push(path),
      scope, pageActive, drawerRef, commandRef, islandRef,
      pageTap: () => uni.$emit(`page-tap:${scope}`),
    }
  },
  methods: {
    openDrawer() {
      this.$refs.drawerRef?.open()
    },
  },
}
</script>

<style scoped>
.app {
  position: relative;
  isolation: isolate;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-header {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(13, 14, 26, 0.25);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.theme-light .app-header {
  background: rgba(248, 249, 252, 0.35);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--accent-primary);
  text-decoration: none;
}

.logo-mark {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.15s ease;
}

.nav-link.active {
  color: var(--accent-primary);
  background: var(--accent-soft);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem 0.25rem 0.75rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
}

.user-profile-link {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  text-decoration: none;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
}

.user-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.theme-toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.app-main {
  flex: 1;
  min-height: 0;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.hamburger {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .app-main {
    padding: 1rem;
  }

  .header-inner {
    padding: 0 1rem;
  }

  .header-nav {
    display: none;
  }
}
</style>
