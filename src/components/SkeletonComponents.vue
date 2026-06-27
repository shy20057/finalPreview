<template>
  <!-- Bank list skeleton -->
  <div v-if="type === 'bank-list'" class="skeleton-bank-list">
    <div v-for="i in count" :key="i" class="skeleton-bank-card card">
      <div class="skeleton-header">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton" style="width: 48px; height: 20px; border-radius: 999px;"></div>
      </div>
      <div class="skeleton skeleton-text" style="width: 40%;"></div>
      <div class="skeleton-meta">
        <div class="skeleton skeleton-text" style="width: 30%;"></div>
      </div>
    </div>
  </div>

  <!-- Bank grid skeleton -->
  <div v-else-if="type === 'bank-grid'" class="skeleton-bank-grid">
    <div v-for="i in count" :key="i" class="skeleton-bank-card card">
      <div class="skeleton-header">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton" style="width: 48px; height: 20px; border-radius: 999px;"></div>
      </div>
      <div class="skeleton skeleton-text" style="width: 40%;"></div>
      <div class="skeleton-meta">
        <div class="skeleton skeleton-text" style="width: 30%;"></div>
      </div>
    </div>
  </div>

  <!-- Quiz content skeleton -->
  <div v-else-if="type === 'quiz'" class="skeleton-quiz">
    <div class="skeleton-question card">
      <div class="skeleton skeleton-title" style="width: 80%; margin-bottom: 1.5rem;"></div>
      <div v-for="i in 4" :key="i" class="skeleton-option">
        <div class="skeleton" style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></div>
        <div class="skeleton skeleton-text" style="flex: 1;"></div>
      </div>
    </div>
  </div>

  <!-- Stats skeleton -->
  <div v-else-if="type === 'stats'" class="skeleton-stats">
    <div v-for="i in count" :key="i" class="skeleton-stat-card card">
      <div class="skeleton" style="width: 48px; height: 24px; margin-bottom: 0.5rem;"></div>
      <div class="skeleton skeleton-text" style="width: 60%;"></div>
    </div>
  </div>

  <!-- History record skeleton -->
  <div v-else-if="type === 'history'" class="skeleton-history">
    <div v-for="i in count" :key="i" class="skeleton-record card">
      <div class="skeleton-record-main">
        <div>
          <div class="skeleton skeleton-title" style="width: 180px; margin-bottom: 0.5rem;"></div>
          <div class="flex gap-2">
            <div class="skeleton" style="width: 64px; height: 20px; border-radius: 999px;"></div>
            <div class="skeleton skeleton-text" style="width: 80px;"></div>
            <div class="skeleton skeleton-text" style="width: 60px;"></div>
          </div>
        </div>
        <div class="skeleton-record-score">
          <div class="skeleton" style="width: 56px; height: 28px; margin-bottom: 0.25rem;"></div>
          <div class="skeleton skeleton-text" style="width: 40px;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'bank-list',
  },
  count: {
    type: Number,
    default: 3,
  },
})
</script>

<style scoped>
.skeleton-bank-list,
.skeleton-bank-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-bank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.skeleton-bank-card {
  padding: 1.25rem;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
}

.skeleton-meta {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.skeleton-question {
  padding: 1.5rem;
}

.skeleton-option {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.75rem;
}

.skeleton-stat-card {
  padding: 1.25rem;
}

.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.skeleton-record {
  padding: 1rem 1.25rem;
}

.skeleton-record-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.skeleton-record-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .skeleton-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
