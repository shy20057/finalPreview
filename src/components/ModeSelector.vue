<template>
  <div class="mode-selector">
    <button
      class="mode-btn"
      :class="{ active: mode === 'practice' }"
      @click="setMode('practice')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <path d="M8 7h8M8 11h8M8 15h4"/>
      </svg>
      练习
    </button>
    <button
      class="mode-btn"
      :class="{ active: mode === 'exam' }"
      @click="setMode('exam')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      考试
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  initialMode: { type: String, default: 'practice' }
})

const emit = defineEmits(['change'])

const mode = ref(props.initialMode)

function setMode(newMode) {
  mode.value = newMode
  emit('change', newMode)
}

watch(() => props.initialMode, (newVal) => {
  mode.value = newVal
})
</script>

<style scoped>
.mode-selector {
  display: flex;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.2rem;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--accent-gradient);
  color: white;
}
</style>
