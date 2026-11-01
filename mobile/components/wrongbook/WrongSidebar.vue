<template>
  <view class="wrong-sidebar">
    <!-- 学科 -->
    <view class="filter-group">
      <view class="filter-title">学科</view>
      <view class="filter-row all" @click="wrongBook.toggleSubject('全部')">
        <view class="filter-checkbox" :class="{ checked: wrongBook.isSubjectChecked('全部') }">
          <AppIcon name="id91e470c" :size="10" v-if="wrongBook.isSubjectChecked('全部')" />
        </view>
        <text class="filter-label">全部</text>
      </view>
      <view
        v-for="subject in wrongBook.availableSubjects"
        :key="subject"
        class="filter-row"
        @click="wrongBook.toggleSubject(subject)"
      >
        <view class="filter-checkbox" :class="{ checked: wrongBook.isSubjectChecked(subject) }">
          <AppIcon name="i03c271b2" :size="10" v-if="wrongBook.isSubjectChecked(subject)" />
        </view>
        <text class="filter-label">{{ subject }}</text>
        <text class="filter-count text-muted">{{ wrongBook.counts.bySubject[subject] || 0 }}</text>
      </view>
    </view>

    <!-- 题型 -->
    <view class="filter-group">
      <view class="filter-title">题型</view>
      <view v-for="t in TYPES" :key="t.value" class="filter-row" @click="toggleType(t.value)">
        <view class="filter-checkbox" :class="{ checked: wrongBook.selectedTypes.includes(t.value) }">
          <AppIcon name="i9a6c2690" :size="10" v-if="wrongBook.selectedTypes.includes(t.value)" />
        </view>
        <text class="filter-label">{{ t.label }}</text>
        <text class="filter-count text-muted">{{ wrongBook.counts.byType[t.value] || 0 }}</text>
      </view>
    </view>

    <!-- 时间 -->
    <view class="filter-group">
      <view class="filter-title">时间</view>
      <view v-for="r in wrongBook.TIME_RANGES" :key="r.value" class="filter-row" @click="wrongBook.setTimeRange(r.value)">
        <view class="filter-radio" :class="{ checked: wrongBook.selectedTimeRange === r.value }" />
        <text class="filter-label">{{ r.label }}</text>
      </view>
      <view class="custom-date-wrap">
        <DatePicker
          v-model="wrongBook.customDate"
          placeholder="选择日期"
          @change="wrongBook.setCustomDate"
        />
      </view>
    </view>

    <!-- 状态 -->
    <view class="filter-group">
      <view class="filter-title">状态</view>
      <view class="filter-row" @click="toggleStatus('unmastered')">
        <view class="filter-checkbox" :class="{ checked: wrongBook.selectedStatuses.includes('unmastered') }">
          <AppIcon name="i8454aea8" :size="10" v-if="wrongBook.selectedStatuses.includes('unmastered')" />
        </view>
        <text class="filter-label">未掌握</text>
        <text class="filter-count text-muted">{{ wrongBook.counts.unmastered }}</text>
      </view>
      <view class="filter-row" @click="toggleStatus('mastered')">
        <view class="filter-checkbox" :class="{ checked: wrongBook.selectedStatuses.includes('mastered') }">
          <AppIcon name="i6e30b8da" :size="10" v-if="wrongBook.selectedStatuses.includes('mastered')" />
        </view>
        <text class="filter-label">已掌握</text>
        <text class="filter-count text-muted">{{ wrongBook.counts.mastered }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useWrongBookStore } from '../../stores/wrongBook.js'
import DatePicker from '../DatePicker.vue'

const wrongBook = useWrongBookStore()

const TYPES = [
  { value: 'single', label: '单选' },
  { value: 'multi', label: '多选' },
  { value: 'fill', label: '填空' },
  { value: 'essay', label: '简答' },
]

function toggleType(t) {
  const set = new Set(wrongBook.selectedTypes)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  wrongBook.selectedTypes = Array.from(set)
}

function toggleStatus(s) {
  const set = new Set(wrongBook.selectedStatuses)
  if (set.has(s)) set.delete(s)
  else set.add(s)
  wrongBook.selectedStatuses = Array.from(set)
}
</script>

<style scoped>
.wrong-sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 1rem;
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  border-radius: var(--radius-xl);
  align-self: flex-start;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
}

/* 深色主题：深色半透明，让星空透出来 */
.wrong-sidebar {
  background: rgba(20, 22, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

/* 浅色主题：白色半透明，让向日葵透出来 */
.theme-light .wrong-sidebar {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.filter-group + .filter-group {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
}

.filter-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.625rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.88rem;
  transition: background 0.12s ease;
}

.filter-row:hover {
  background: var(--bg-surface-raised);
}

.theme-light .filter-row:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* 原版是原生 <input type="checkbox/radio"> + accent-color，
   App 端没有原生表单控件，改为自绘（PORTING.md §5） */
.filter-checkbox {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.15s ease;
}

.filter-checkbox.checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.filter-radio {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  transition: all 0.15s ease;
}

.filter-radio.checked {
  border-color: var(--accent-primary);
  background: var(--accent-primary);
  box-shadow: inset 0 0 0 3px var(--bg-surface);
}

.filter-row.all .filter-label {
  font-weight: 600;
}

.filter-label {
  flex: 1;
  color: var(--text-primary);
}

.filter-count {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.custom-date-wrap {
  margin-top: 0.5rem;
  padding: 0 0.4rem;
}

@media (max-width: 1023px) {
  .wrong-sidebar {
    display: none;
  }
}
</style>
