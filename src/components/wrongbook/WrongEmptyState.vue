<template>
  <div class="wrong-empty card">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
      <circle cx="12" cy="12" r="10"/>
      <path d="M15 9l-6 6M9 9l6 6"/>
    </svg>
    <p class="text-muted">{{ message }}</p>
    <slot name="action">
      <router-link v-if="showAction" to="/banks" class="btn btn-primary">去答题</router-link>
    </slot>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: '暂无错题，继续加油！' },
  showAction: { type: Boolean, default: true },
})
</script>

<style scoped>
.wrong-empty {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
</style>
