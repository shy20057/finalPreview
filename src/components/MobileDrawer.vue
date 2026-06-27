<!-- src/components/MobileDrawer.vue -->
<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isOpen" class="mobile-drawer-overlay" @click="close">
        <div class="mobile-drawer" @click.stop>
          <div class="drawer-header">
            <span class="drawer-logo">期末复习</span>
            <button class="drawer-close" @click="close" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <nav class="drawer-nav">
            <router-link
              v-for="(item, index) in navItems"
              :key="item.path"
              :to="item.path"
              class="drawer-item"
              :style="{ animationDelay: `${index * 50}ms` }"
              @click="close"
            >
              <svg class="drawer-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="item.iconPath"/>
              </svg>
              <span class="drawer-label">{{ item.label }}</span>
              <DynamicBadge v-if="item.path === '/wrongbook'" class="drawer-badge" />
            </router-link>
          </nav>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DynamicBadge from './DynamicBadge.vue'

const isOpen = ref(false)

const navItems = [
  { path: '/', label: '首页', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { path: '/banks', label: '题库', iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { path: '/history', label: '历史', iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { path: '/wrongbook', label: '错题', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M15 9l-6 6 M9 9l6 6' },
  { path: '/notes', label: '笔记', iconPath: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 15v6h6' },
  { path: '/quiz-notes', label: '练习笔记', iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { path: '/resources', label: '资源', iconPath: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12' },
  { path: '/settings', label: '设置', iconPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
]

function open() {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function handleEsc(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  document.body.style.overflow = ''
})

// Expose open method
defineExpose({ open })
</script>

<style scoped>
.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
}

.mobile-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-logo {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.drawer-close:hover {
  background: var(--bg-surface-raised);
}

.drawer-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9375rem;
  transition: all 0.15s ease;
  animation: slide-in 0.3s ease both;
  position: relative;
}

.drawer-item:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.drawer-item.router-link-active {
  color: var(--accent-primary);
  background: var(--accent-soft);
}

.drawer-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.drawer-label {
  font-weight: 500;
}

.drawer-badge {
  margin-left: auto;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Transition */
.drawer-enter-active {
  animation: overlay-in 0.2s ease;
}

.drawer-leave-active {
  animation: overlay-in 0.15s ease reverse;
}

.drawer-enter-active .mobile-drawer {
  animation: drawer-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drawer-leave-active .mobile-drawer {
  animation: drawer-in 0.2s ease reverse;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
