<!-- mobile/components/ModeSelector.vue -->
<!-- Port of src/components/ModeSelector.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="mode-selector">
    <view
      class="mode-btn"
      :class="{ active: mode === 'practice' }"
      @click="setMode('practice')"
    >
      <AppIcon name="i629db7dd" :size="14" />
      练习
    </view>
    <view
      class="mode-btn"
      :class="{ active: mode === 'exam' }"
      @click="setMode('exam')"
    >
      <AppIcon name="i9bbd15e6" :size="14" />
      考试
    </view>
  </view>
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
