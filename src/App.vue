<template>
  <div class="app" :data-theme="appStore.theme" :class="{ 'app--auth': isAuthPage }">
    <!-- 登录/注册页：独立全屏，无顶栏无滚动 -->
    <main v-if="isAuthPage" class="app-auth-main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <!-- 正常应用布局 -->
    <template v-else>
    <!-- 顶栏 -->
    <header class="app-header">
      <div class="header-inner">
        <div class="header-left">
        <router-link to="/" class="logo">
            <img class="logo-mark" src="/icon.svg" alt="" aria-hidden="true" />
            <span>期末复习</span>
          </router-link>

          <nav class="header-nav hide-mobile">
            <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
            <router-link to="/banks" class="nav-link" active-class="active">题库</router-link>
            <router-link to="/history" class="nav-link" active-class="active">历史</router-link>
            <router-link to="/wrongbook" class="nav-link" active-class="active">错题</router-link>
            <router-link to="/favorites" class="nav-link" active-class="active">收藏</router-link>
            <router-link to="/profile" class="nav-link" active-class="active">个人中心</router-link>
            <router-link to="/settings" class="nav-link" active-class="active">设置</router-link>
          </nav>
        </div>

        <div class="header-right">
          <DynamicBadge class="hide-mobile" />
          <div v-if="authStore.isLoggedIn" class="user-menu">
            <router-link to="/profile" class="user-profile-link" title="个人中心" aria-label="进入个人中心">
              <span class="user-avatar">{{ authStore.username.slice(0, 1).toUpperCase() }}</span>
              <span class="user-name hide-mobile">{{ authStore.username }}</span>
            </router-link>
            <button class="logout-btn" @click="authStore.logout()" title="退出登录">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
          <button class="theme-toggle" @click="appStore.cycleTheme" :title="themeTitle">
            <!-- Sun (light) -->
            <svg v-if="appStore.theme === 'light'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <!-- Star (dark-blue) -->
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </button>
          <CommandPalette />
          <button class="hamburger hide-desktop" @click="mobileDrawerRef.open()" aria-label="菜单">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 移动端抽屉 -->
    <MobileDrawer ref="mobileDrawerRef" />

    <!-- 浮岛辐射菜单（次级入口常驻） -->
    <FloatingIslandMenu />

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <Transition name="page">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    </template>

  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app.js'
import { useAuthStore } from './stores/auth.js'
import DynamicBadge from './components/DynamicBadge.vue'
import CommandPalette from './components/CommandPalette.vue'
import FloatingIslandMenu from './components/FloatingIslandMenu.vue'
import MobileDrawer from './components/MobileDrawer.vue'

const route = useRoute()
const mobileDrawerRef = ref(null)

const appStore = useAppStore()
const authStore = useAuthStore()
watch(() => authStore.user?.id, id => appStore.initTheme(id), { immediate: true })

const isAuthPage = computed(() => route.meta?.public === true)

const themeTitle = computed(() => {
  if (appStore.theme === 'light') return '浅色主题'
  return '暗蓝风格'
})

onMounted(async () => {
  await authStore.init()
  if (authStore.isLoggedIn) await appStore.fetchAiConfigs().catch(() => {})
})
</script>

<style scoped>
.app {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app--auth {
  overflow: hidden;
}

.app-auth-main {
  flex: 1;
  overflow: hidden;
  height: 100vh;
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

[data-theme="light"] .app-header {
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

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-surface-raised);
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

.user-profile-link:hover .user-name,
.user-profile-link.router-link-active .user-name {
  color: var(--text-primary);
}

.user-avatar {
  display: grid;
  place-items: center;
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

.logout-btn:hover {
  color: #f43f5e;
  border-color: rgba(244, 63, 94, 0.4);
  background: rgba(244, 63, 94, 0.08);
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

.theme-toggle:hover {
  border-color: var(--accent-border);
  color: var(--accent-primary);
  background: var(--accent-soft);
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

.hamburger:hover {
  border-color: var(--accent-border);
  color: var(--accent-primary);
  background: var(--accent-soft);
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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
