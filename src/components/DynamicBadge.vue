<!-- src/components/DynamicBadge.vue -->
<template>
  <div
    v-if="count > 0"
    class="dynamic-badge"
    :class="{ 'has-badge': count > 0 }"
    @click="$router.push('/wrongbook')"
    :title="`您有 ${count} 道错题`"
  >
    <span class="badge-number">{{ displayCount }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWrongBookStore } from '../stores/wrongBook.js'

const wrongBookStore = useWrongBookStore()

const count = computed(() => wrongBookStore.counts.unmastered)

const displayCount = computed(() => {
  return count.value > 99 ? '99+' : String(count.value)
})
</script>

<style scoped>
.dynamic-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: #ef4444;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.dynamic-badge:hover {
  transform: scale(1.1);
}

.badge-number {
  font-size: 11px;
  font-weight: 600;
  color: white;
  line-height: 1;
}
</style>
