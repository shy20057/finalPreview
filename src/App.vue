<template>
  <div class="app" :data-theme="appStore.theme">
    <!-- 顶栏 -->
    <header class="app-header">
      <div class="header-inner">
        <div class="header-left">
        <router-link to="/" class="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>期末复习</span>
          </router-link>

          <nav class="header-nav hide-mobile">
            <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
            <router-link to="/banks" class="nav-link" active-class="active">题库</router-link>
            <router-link to="/history" class="nav-link" active-class="active">历史</router-link>
            <router-link to="/wrongbook" class="nav-link" active-class="active">错题</router-link>
            <router-link to="/settings" class="nav-link" active-class="active">设置</router-link>
          </nav>
        </div>

        <div class="header-right">
          <DynamicBadge class="hide-mobile" />
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
          <BubbleMenu class="hide-mobile" />
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

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from './stores/app.js'
import DynamicBadge from './components/DynamicBadge.vue'
import BubbleMenu from './components/BubbleMenu.vue'
import MobileDrawer from './components/MobileDrawer.vue'

const mobileDrawerRef = ref(null)

const appStore = useAppStore()

const themeTitle = computed(() => {
  if (appStore.theme === 'light') return '浅色主题'
  return '暗蓝风格'
})

onMounted(() => {
  appStore.initTheme()
  appStore.fetchAiConfigs()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
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
  height: 56px;
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
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-decoration: none;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
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
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
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

