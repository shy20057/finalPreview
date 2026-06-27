<template>
  <div class="wrongbook-view">
    <div class="page-header">
      <h1>错题本</h1>
      <span class="text-muted">
        共 {{ wrongBook.counts.total }} 道
        <template v-if="wrongBook.counts.mastered > 0">· 已掌握 {{ wrongBook.counts.mastered }}</template>
      </span>
    </div>

    <div class="wrongbook-layout">
      <WrongSidebar class="sidebar-slot" />

      <main class="wrongbook-main">
        <WrongTopBar class="topbar-slot hide-mobile" />

        <!-- 窄屏顶部筛选条（在 <1024px 显示） -->
        <div class="mobile-filters hide-desktop">
          <div class="filter-scroll">
            <span class="text-muted text-sm filter-scroll-label">学科</span>
            <button
              v-for="s in ['全部', ...wrongBook.availableSubjects]"
              :key="s"
              class="chip"
              :class="{ active: wrongBook.isSubjectChecked(s) }"
              @click="wrongBook.toggleSubject(s)"
            >{{ s }}</button>
          </div>
          <div class="filter-scroll">
            <span class="text-muted text-sm filter-scroll-label">题型</span>
            <button
              v-for="t in ['single','multi','fill','essay']"
              :key="t"
              class="chip"
              :class="{ active: wrongBook.selectedTypes.includes(t) }"
              @click="toggleType(t)"
            >{{ typeLabel(t) }}</button>
          </div>
        </div>

        <div class="results">
          <div v-if="wrongBook.filteredEntries.length === 0" class="empty-wrap">
            <WrongEmptyState
              :message="emptyMessage"
              :show-action="wrongBook.counts.total === 0"
            />
          </div>
          <div v-else class="card-list">
            <WrongCard
              v-for="entry in wrongBook.filteredEntries"
              :key="entry.key"
              :entry="entry"
              @click="onCardClick"
            />
          </div>
        </div>
      </main>
    </div>

    <WrongDetailDrawer />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useWrongBookStore } from '../stores/wrongBook.js'
import { useHistoryStore } from '../stores/history.js'
import { useBankStore } from '../stores/bank.js'
import WrongSidebar from '../components/wrongbook/WrongSidebar.vue'
import WrongTopBar from '../components/wrongbook/WrongTopBar.vue'
import WrongCard from '../components/wrongbook/WrongCard.vue'
import WrongDetailDrawer from '../components/wrongbook/WrongDetailDrawer.vue'
import WrongEmptyState from '../components/wrongbook/WrongEmptyState.vue'

const wrongBook = useWrongBookStore()
const historyStore = useHistoryStore()
const bankStore = useBankStore()

const TYPE_LABELS = { single: '单选', multi: '多选', fill: '填空', essay: '简答' }
function typeLabel(t) { return TYPE_LABELS[t] || t }

function toggleType(t) {
  const set = new Set(wrongBook.selectedTypes)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  wrongBook.selectedTypes = Array.from(set)
}

function onCardClick(entry) {
  wrongBook.openDrawer(entry)
}

const emptyMessage = computed(() => {
  if (wrongBook.counts.total === 0) return '暂无错题，继续加油！'
  if (wrongBook.counts.unmastered === 0 && wrongBook.counts.mastered > 0) {
    return '已掌握全部错题！'
  }
  return '没有匹配的错题'
})

onMounted(async () => {
  await Promise.all([
    historyStore.loadRecords(),
    bankStore.loadBuiltinBanks(),
    bankStore.loadUserBanks(),
  ])
})
</script>

<style scoped>
.wrongbook-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.wrongbook-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.wrongbook-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-wrap {
  padding-top: 2rem;
}

.mobile-filters {
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.filter-scroll {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.filter-scroll-label {
  flex-shrink: 0;
  font-weight: 500;
}

.chip {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.chip.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

@media (max-width: 1023px) {
  .mobile-filters {
    display: flex;
  }
  .wrongbook-layout {
    flex-direction: column;
  }
  .wrongbook-view {
    padding-bottom: 72px;
  }
  .sidebar-slot {
    display: none;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .page-header h1 {
    font-size: 1.1rem;
  }

  .filter-scroll {
    flex-wrap: wrap;
  }

  .chip {
    flex-shrink: 0;
  }
}
</style>
