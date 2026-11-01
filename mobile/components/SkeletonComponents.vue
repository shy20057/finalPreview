<!-- mobile/components/SkeletonComponents.vue -->
<!-- Port of src/components/SkeletonComponents.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <!-- Bank list skeleton -->
  <view v-if="type === 'bank-list'" class="skeleton-bank-list">
    <view v-for="i in count" :key="i" class="skeleton-bank-card card">
      <view class="skeleton-header">
        <view class="skeleton skeleton-title"></view>
        <view class="skeleton" style="width: 48px; height: 20px; border-radius: 999px;"></view>
      </view>
      <view class="skeleton skeleton-text" style="width: 40%;"></view>
      <view class="skeleton-meta">
        <view class="skeleton skeleton-text" style="width: 30%;"></view>
      </view>
    </view>
  </view>

  <!-- Bank grid skeleton -->
  <view v-else-if="type === 'bank-grid'" class="skeleton-bank-grid">
    <view v-for="i in count" :key="i" class="skeleton-bank-card card">
      <view class="skeleton-header">
        <view class="skeleton skeleton-title"></view>
        <view class="skeleton" style="width: 48px; height: 20px; border-radius: 999px;"></view>
      </view>
      <view class="skeleton skeleton-text" style="width: 40%;"></view>
      <view class="skeleton-meta">
        <view class="skeleton skeleton-text" style="width: 30%;"></view>
      </view>
    </view>
  </view>

  <!-- Quiz content skeleton -->
  <view v-else-if="type === 'quiz'" class="skeleton-quiz">
    <view class="skeleton-question card">
      <view class="skeleton skeleton-title" style="width: 80%; margin-bottom: 1.5rem;"></view>
      <view v-for="i in 4" :key="i" class="skeleton-option">
        <view class="skeleton" style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></view>
        <view class="skeleton skeleton-text" style="flex: 1;"></view>
      </view>
    </view>
  </view>

  <!-- Stats skeleton -->
  <view v-else-if="type === 'stats'" class="skeleton-stats">
    <view v-for="i in count" :key="i" class="skeleton-stat-card card">
      <view class="skeleton" style="width: 48px; height: 24px; margin-bottom: 0.5rem;"></view>
      <view class="skeleton skeleton-text" style="width: 60%;"></view>
    </view>
  </view>

  <!-- History record skeleton -->
  <view v-else-if="type === 'history'" class="skeleton-history">
    <view v-for="i in count" :key="i" class="skeleton-record card">
      <view class="skeleton-record-main">
        <view>
          <view class="skeleton skeleton-title" style="width: 180px; margin-bottom: 0.5rem;"></view>
          <view class="flex gap-2">
            <view class="skeleton" style="width: 64px; height: 20px; border-radius: 999px;"></view>
            <view class="skeleton skeleton-text" style="width: 80px;"></view>
            <view class="skeleton skeleton-text" style="width: 60px;"></view>
          </view>
        </view>
        <view class="skeleton-record-score">
          <view class="skeleton" style="width: 56px; height: 28px; margin-bottom: 0.25rem;"></view>
          <view class="skeleton skeleton-text" style="width: 40px;"></view>
        </view>
      </view>
    </view>
  </view>
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
