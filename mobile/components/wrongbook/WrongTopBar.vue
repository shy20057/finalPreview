<template>
  <view class="wrong-topbar">
    <input
      class="search-input"
      :value="wrongBook.keyword"
      @input="onInput"
      placeholder="搜索题干关键词..."
    />
    <view class="sort-control">
      <text class="text-muted sort-label">排序</text>
      <view
        class="sort-trigger"
        :class="{ open: isOpen }"
        @click="toggle"
      >
        <text>{{ currentLabel }}</text>
        <AppIcon name="ie4acfe84" :size="24" class="sort-arrow" />
      </view>
      <ViewTransition name="sort-dropdown">
        <view v-if="isOpen" class="sort-dropdown">
          <view
            v-for="opt in SORT_OPTIONS"
            :key="opt.value"
            class="sort-option"
            :class="{ active: wrongBook.sortBy === opt.value }"
            @click="select(opt.value)"
          >
            <view class="sort-check">
              <AppIcon name="ifdf3dd40" :size="24" v-if="wrongBook.sortBy === opt.value" />
            </view>
            <text class="sort-label-text">{{ opt.label}}</text>
          </view>
        </view>
      </ViewTransition>
    </view>
    <view
      class="btn btn-sm btn-secondary"
      @click="exportMarkdown"
      :style="{ opacity: wrongBook.filteredEntries.length === 0 ? 0.4 : 1 }"
    >
      导出
    </view>

    <!-- 原版用 document.addEventListener('click', …, true) 关闭下拉，
         App 端无 DOM，改为透明遮罩捕获点击（见样式 .sort-click-catcher） -->
    <view v-if="isOpen" class="sort-click-catcher" @click="closeDropdown" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWrongBookStore } from '../../stores/wrongBook.js'
import { writeTextFile, shareFile } from '../../utils/fs.js'

const wrongBook = useWrongBookStore()

const SORT_OPTIONS = [
  { value: 'lastWrongAt', label: '最近答错' },
  { value: 'wrongCount', label: '答错次数' },
  { value: 'firstWrongAt', label: '首次答错' },
]

const isOpen = ref(false)

const currentLabel = computed(() => {
  return SORT_OPTIONS.find(o => o.value === wrongBook.sortBy)?.label || '排序'
})

function toggle() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function select(value) {
  wrongBook.sortBy = value
  isOpen.value = false
}

function onInput(e) {
  wrongBook.keyword = e.detail.value
}

async function exportMarkdown() {
  if (wrongBook.filteredEntries.length === 0) return
  const lines = ['# 错题汇总', '']
  for (const e of wrongBook.filteredEntries) {
    lines.push(`## [${e.subject}] 第 ${e.id} 题`)
    lines.push('')
    lines.push(`**题型**：${typeLabel(e.type)}`)
    lines.push('')
    lines.push(`**题目**：${e.question}`)
    lines.push('')
    if (e.options && e.options.length) {
      for (const opt of e.options) lines.push(`- ${opt.label}. ${opt.text}`)
      lines.push('')
    }
    lines.push(`**正确答案**：${formatAnswer(e.answer)}`)
    lines.push('')
    lines.push(`**答错次数**：${e.wrongCount}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  const content = lines.join('\n')
  const filename = `wrong-questions-${new Date().toISOString().slice(0, 10)}.md`
  try {
    const path = await writeTextFile(filename, content)
    await shareFile(path, '错题汇总')
    uni.showToast({ title: '已导出', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: err?.message || '导出失败', icon: 'none' })
  }
}

function typeLabel(t) {
  return { single: '单选', multi: '多选', fill: '填空', essay: '简答' }[t] || t
}

function formatAnswer(a) {
  if (Array.isArray(a)) return a.join(' / ')
  return String(a ?? '')
}
</script>

<style scoped>
.wrong-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
}

.search-input {
  flex: 1;
  padding: 0.55rem 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  z-index: 41;
}

.search-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.sort-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sort-label {
  font-size: 0.8rem;
  white-space: nowrap;
}

.sort-trigger {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  z-index: 42;
}

.sort-trigger:hover {
  border-color: var(--border-hover);
}

.sort-trigger.open,
.sort-trigger:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* !important：codemod 会把 <svg> 换成带内联宽高的 <AppIcon>，
   内联样式会盖掉这里的尺寸，必须保留原版的 CSS 尺寸 */
.sort-arrow {
  width: 0.85rem !important;
  height: 0.85rem !important;
  transition: transform 0.2s ease;
}

.sort-trigger.open .sort-arrow {
  transform: rotate(180deg);
}

.sort-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  min-width: 7rem;
  padding: 0.35rem;
  list-style: none;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 50;
}

.sort-dropdown-enter-active,
.sort-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.sort-dropdown-enter-from,
.sort-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.sort-option:hover {
  background: var(--bg-card-hover);
}

.sort-check {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  color: var(--accent-primary);
}

.sort-check .app-icon {
  width: 100% !important;
  height: 100% !important;
  animation: scaleIn 0.15s ease;
}

.sort-option.active .sort-label-text {
  color: var(--accent-primary);
  font-weight: 600;
}

/* 原版的「点空白处关闭排序下拉」用的是 document 监听，App 端改为透明遮罩 */
.sort-click-catcher {
  position: fixed;
  inset: 0;
  z-index: 40;
}

/* 导出按钮与搜索框需要保持在遮罩之上，保持原版可点击 */
.wrong-topbar .btn {
  position: relative;
  z-index: 41;
}
</style>
