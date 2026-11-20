<!-- mobile/components/AppShell.vue -->
<!--
  Port of src/App.vue — the application shell (header + drawer + island menu + main area).
  In the web original this lived in App.vue; uni-app's App.vue has no template, so the
  shell became a component that every page renders.
-->
<template>
  <view class="app" :class="themeClass" :style="shellInsets" @click="pageTap">
    <!-- 背景氛围层（原 body::before） -->
    <view class="ambient-bg">
      <!-- #ifdef MP-WEIXIN -->
      <image class="ambient-image" :src="appStore.theme === 'light' ? '/static/mp-weixin/sunflowers.jpg' : '/static/assets/images/starry-night.jpg'" mode="aspectFill" />
      <view class="ambient-shade" />
      <!-- #endif -->
    </view>

    <!-- #ifndef MP-WEIXIN -->
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
    <!-- #endif -->

    <!-- 移动端抽屉 -->
    <MobileDrawer ref="drawerRef" />

    <!-- 浮岛辐射菜单（次级入口常驻） -->
    <FloatingIslandMenu ref="islandRef" />

    <!-- 主内容区 -->
    <scroll-view
      v-if="scrollable"
      class="app-main app-main-scroll"
      scroll-y
      :scroll-into-view="scrollIntoView"
    >
      <view class="app-scroll-content">
        <slot />
      </view>
    </scroll-view>
    <view v-else class="app-main">
      <slot />
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <!-- Occupies its own flex row so the last content item stays above the bar. -->
    <view class="bottom-nav" role="navigation" aria-label="主导航">
      <button
        v-for="link in mobileNavLinks"
        :key="link.path"
        class="web-button bottom-nav-item"
        :class="{ 'bottom-nav-active': isMobileActive(link) }"
        :aria-label="link.label"
        :aria-current="isMobileActive(link) ? 'page' : undefined"
        @tap.stop="goMobile(link.path)"
      >
        <AppIcon :path="link.iconPath" :size="22" />
        <text class="bottom-nav-label">{{ link.label }}</text>
      </button>
      <button
        class="web-button bottom-nav-item"
        :class="{ 'bottom-nav-active': moreActive || drawerRef?.isOpen }"
        aria-label="更多导航"
        :aria-expanded="!!drawerRef?.isOpen"
        @tap.stop="openDrawer()"
      >
        <AppIcon name="i103023a7" :size="22" />
        <text class="bottom-nav-label">更多</text>
      </button>
    </view>
    <!-- #endif -->

    <!-- 彩纸特效层 -->
    <ConfettiLayer />
    <UiBridge :active="pageActive" :scope="scope" />
  </view>
</template>

<script>
import { computed, watch, ref, provide } from 'vue'
import { onShow, onHide, onBackPress, onResize } from '@dcloudio/uni-app'
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
  props: {
    scrollable: Boolean,
    scrollIntoView: { type: String, default: '' },
  },
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
    const shellInsets = ref({})
    function updateShellInsets() {
      // #ifdef MP-WEIXIN
      try {
        const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
        const menu = uni.getMenuButtonBoundingClientRect?.()
        const statusBarHeight = Math.max(info.statusBarHeight || 0, info.safeArea?.top || 0)
        const top = menu?.bottom > statusBarHeight ? menu.bottom + 8 : statusBarHeight + 44
        const bottom = info.safeAreaInsets?.bottom ??
          (info.safeArea ? (info.screenHeight || info.windowHeight) - info.safeArea.bottom : 0)
        shellInsets.value = {
          '--shell-top-inset': `${top}px`,
          '--shell-bottom-inset': `${Math.max(0, bottom)}px`,
        }
      } catch {
        // CSS safe-area fallbacks also work before window information is ready.
      }
      // #endif
    }
    updateShellInsets()
    onResize(updateShellInsets)
    onShow(() => { pageActive.value = true; updateShellInsets() })
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

    const mobileNavLinks = [
      { path: '/', label: '首页', exact: true, iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
      { path: '/banks', label: '题库', iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
      { path: '/wrongbook', label: '错题', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M15 9l-6 6 M9 9l6 6' },
      { path: '/profile', label: '我的', iconPath: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z' },
    ]
    const isMobileActive = (link) => isActive(link) ||
      (link.path === '/banks' && (route.path.startsWith('/quiz/') || route.path.startsWith('/result/')))

    return {
      appStore,
      authStore,
      navLinks,
      isActive,
      mobileNavLinks,
      isMobileActive,
      moreActive: computed(() => !mobileNavLinks.some(isMobileActive)),
      goMobile: (path) => { if (route.path !== path) router.push(path) },
      shellInsets,
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
  box-sizing: border-box;
}

/* #ifdef MP-WEIXIN */
.app {
  --shell-bottom-nav-height: calc(65px + var(--shell-bottom-inset, env(safe-area-inset-bottom, 0px)));
  padding-top: var(--shell-top-inset, calc(44px + env(safe-area-inset-top, 0px)));
}

.bottom-nav {
  position: relative;
  z-index: 100;
  display: flex;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  height: var(--shell-bottom-nav-height);
  padding: 6px 8px;
  padding-bottom: calc(6px + var(--shell-bottom-inset, env(safe-area-inset-bottom, 0px)));
  padding-left: max(8px, env(safe-area-inset-left, 0px));
  padding-right: max(8px, env(safe-area-inset-right, 0px));
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
}

.bottom-nav-item {
  flex: 1;
  min-width: 0;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--text-secondary);
}

.bottom-nav-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.bottom-nav-active {
  color: var(--accent-primary);
  background: var(--accent-soft);
}
/* #endif */

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

.app-main-scroll {
  /* Let the native scroller own the height left above the bottom navigation. */
  height: 0;
  display: block;
  overflow: hidden;
  padding: 0;
}

.app-scroll-content {
  box-sizing: border-box;
  min-height: 100%;
  padding: 1rem;
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
