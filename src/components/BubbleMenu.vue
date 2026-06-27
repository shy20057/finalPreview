<!-- src/components/BubbleMenu.vue -->
<template>
  <div class="bubble-menu-wrapper" ref="wrapperRef">
    <div class="bubble-trigger" aria-label="更多">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
      </svg>
    </div>

    <Transition name="bubble">
      <div class="bubble-panel">
        <div class="bubble-pointer"></div>
        <nav class="bubble-nav">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="bubble-item"
          >
            <svg class="bubble-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="item.iconPath"/>
            </svg>
            <span class="bubble-label">{{ item.label }}</span>
          </router-link>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const wrapperRef = ref(null)

const menuItems = [
  { path: '/notes', label: '笔记', iconPath: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 15v6h6' },
  { path: '/quiz-notes', label: '练习笔记', iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { path: '/resources', label: '资源', iconPath: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12' },
]
</script>

<style scoped>
.bubble-menu-wrapper {
  position: relative;
}

.bubble-menu-wrapper:hover .bubble-panel {
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
}

.bubble-trigger {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.bubble-trigger:hover {
  color: var(--accent-primary);
  background: var(--accent-soft);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.bubble-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95) translateY(-4px);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-pointer {
  position: absolute;
  top: -5px;
  right: 12px;
  width: 10px;
  height: 10px;
  background: var(--bg-surface-raised);
  border-left: 1px solid var(--border-color);
  border-top: 1px solid var(--border-color);
  transform: rotate(45deg);
}

.bubble-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bubble-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.15s ease;
  position: relative;
}

.bubble-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleX(0);
  width: 3px;
  height: 16px;
  background: var(--accent-primary);
  border-radius: 0 2px 2px 0;
  transition: transform 0.2s ease;
}

.bubble-item:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.bubble-item:hover::before {
  transform: translateY(-50%) scaleX(1);
}

.bubble-item.router-link-active {
  color: var(--accent-primary);
  background: var(--accent-soft);
}

.bubble-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.bubble-label {
  font-weight: 500;
}

/* Transition */
.bubble-enter-active {
  animation: bubble-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-leave-active {
  animation: bubble-in 0.15s ease reverse;
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
