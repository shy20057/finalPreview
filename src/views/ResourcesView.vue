<template>
  <div class="resources-view">
    <div class="page-header-row">
      <div>
        <h1 class="page-title">学习资源</h1>
        <p class="text-muted text-sm page-subtitle">
          这里汇集了课程相关的辅助资源，点击卡片即可查看或在新窗口中打开。
        </p>
      </div>
      <div v-if="hiddenIds.length > 0" class="header-actions">
        <button class="btn btn-ghost btn-sm" @click="showHidden = !showHidden">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {{ showHidden ? '隐藏已删项' : `查看已删（${hiddenIds.length}）` }}
        </button>
      </div>
    </div>

    <!-- 资源卡片网格 -->
    <div v-if="visibleResources.length > 0" class="resources-grid">
      <div
        v-for="res in visibleResources"
        :key="res.id"
        class="resource-card card"
        @click="openResource(res.file)"
      >
        <button
          class="card-delete-btn"
          @click.stop="removeResource(res.id, $event)"
          title="移除该资源"
          aria-label="移除该资源"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="resource-icon" :style="res.iconStyle">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" v-html="res.iconPath"></svg>
        </div>
        <div class="resource-info">
          <h3>{{ res.title }}</h3>
          <p class="text-muted text-sm">{{ res.desc }}</p>
          <div class="resource-tags">
            <span v-for="tag in res.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state card">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <p class="text-muted">没有可显示的资源</p>
      <button v-if="hiddenIds.length > 0" class="btn btn-primary btn-sm" @click="showHidden = true">
        查看已删除项
      </button>
    </div>

    <!-- 已删除区 -->
    <Transition name="reveal">
      <section v-if="showHidden && hiddenResources.length > 0" class="hidden-section">
        <div class="hidden-header">
          <h2 class="hidden-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            已移除 · {{ hiddenResources.length }}
          </h2>
          <div class="hidden-actions">
            <button class="btn btn-secondary btn-sm" @click="restoreAll">全部恢复</button>
            <button class="btn btn-ghost btn-sm" @click="showHidden = false">收起</button>
          </div>
        </div>
        <div class="hidden-list">
          <div v-for="res in hiddenResources" :key="res.id" class="hidden-item">
            <div class="hidden-item-icon" :style="res.iconStyle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" v-html="res.iconPath"></svg>
            </div>
            <div class="hidden-item-info">
              <div class="hidden-item-title">{{ res.title }}</div>
              <div class="text-muted text-xs">{{ res.tags.join(' · ') }}</div>
            </div>
            <div class="hidden-item-actions">
              <button class="btn btn-secondary btn-sm" @click="restoreResource(res.id)">恢复</button>
              <button class="btn btn-danger-outline btn-sm" @click="permanentlyDelete(res.id)">彻底删除</button>
            </div>
          </div>
        </div>
      </section>
    </Transition>

    <!-- 撤销 Toast -->
    <Transition name="toast">
      <div v-if="undoInfo" class="undo-toast">
        <span class="undo-text">已移除「{{ undoInfo.title }}」</span>
        <button class="undo-btn" @click="undoRemove">撤销</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const STORAGE_KEY = 'resources-hidden-ids'
const hiddenIds = ref([])
const showHidden = ref(false)
const undoInfo = ref(null)  // { id, title, timer }
const UNDO_TIMEOUT = 5000

// 资源数据（保留原 6 张硬编码资源作为内置数据）
const allResources = [
  {
    id: 'disk-scheduling',
    file: 'disk-scheduling',
    title: '磁盘调度算法动画演示',
    desc: 'FCFS、SSTF、SCAN、CSCAN、FSCAN 五种磁盘调度算法的可视化动画演示。',
    tags: ['HTML 演示', '交互式'],
    iconPath: '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><circle cx="12" cy="12" r="3"/>',
    iconStyle: '',
  },
  {
    id: 'tcp-congestion',
    file: 'tcp-congestion',
    title: 'TCP 拥塞控制分析讲解',
    desc: '通过典型例题，动画演示 TCP Reno 慢启动、拥塞避免、快速恢复等拥塞控制机制。',
    tags: ['HTML 演示', '交互式', '计算机网络'],
    iconPath: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    iconStyle: '',
  },
  {
    id: 'ip-fragmentation',
    file: 'ip-fragmentation',
    title: 'IP 分片与 TCP 报文动画演示',
    desc: '通过两道典型例题，动画演示 IP 数据报分片原理与 TCP 报文封装分片过程。',
    tags: ['HTML 演示', '交互式', '计算机网络'],
    iconPath: '<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M8 8h8M8 12h4M8 16h6"/><path d="M16 16l2 2"/>',
    iconStyle: '',
  },
  {
    id: 'arp-protocol',
    file: 'arp-protocol',
    title: 'ARP 协议工作过程动画演示',
    desc: '同一子网内主机1→主机2发送数据时，ARP 协议将 IP 地址解析为 MAC 地址的完整动画演示。',
    tags: ['HTML 演示', '交互式', '计算机网络'],
    iconPath: '<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/><circle cx="17" cy="16" r="2"/>',
    iconStyle: '',
  },
  {
    id: 'memory-management',
    file: 'memory-management',
    title: '存储管理原理动画讲解',
    desc: '以动画形式逐步讲解分页、分段、段页式存储管理原理，辅以文字讲解，重点剖析地址翻译过程。',
    tags: ['HTML 演示', '动画讲解', '操作系统'],
    iconPath: '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="2" y1="16" x2="22" y2="16"/><polygon points="17,7 20,4 23,7"/><line x1="20" y1="4" x2="20" y2="11"/>',
    iconStyle: 'background: rgba(59, 130, 246, 0.1); color: #60a5fa;',
  },
  {
    id: 'memory-recycle',
    file: 'memory-recycle',
    title: '内存回收四种相邻情况精讲',
    desc: '动画演示释放区与空闲分区 F1/F2 的四种相邻关系及对应分区表操作，含分步讲解与总结对比。',
    tags: ['HTML 演示', '动画讲解', '操作系统'],
    iconPath: '<rect x="2" y="2" width="20" height="20" rx="3"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/><line x1="8" y1="8" x2="8" y2="22"/><line x1="16" y1="8" x2="16" y2="22"/><path d="M9 11l2 2 4-4"/>',
    iconStyle: 'background: rgba(244, 63, 94, 0.1); color: #f87171;',
  },
  {
    id: '2026-06-28-qa',
    file: '2026-06-28-qa',
    title: '复习笔记 · 虚拟内存 & 计算机网络',
    desc: '2026.06.28 下午问答精编，涵盖虚拟内存、TLB、计算机网络分类、IP首部、交换机原理等 14 个问答。',
    tags: ['问答速记', '操作系统', '计算机网络'],
    iconPath: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    iconStyle: 'background: rgba(34, 197, 94, 0.1); color: #22c55e;',
  },
]

const visibleResources = computed(() => allResources.filter(r => !hiddenIds.value.includes(r.id)))
const hiddenResources = computed(() => allResources.filter(r => hiddenIds.value.includes(r.id)))

function loadHidden() {
  try {
    hiddenIds.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    hiddenIds.value = []
  }
}
function persistHidden() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds.value))
}

function openResource(file) {
  const url = `${import.meta.env.BASE_URL}resources/${file}.html`
  window.open(url, '_blank', 'width=1280,height=800,noopener,noreferrer')
}

function removeResource(id, event) {
  const res = allResources.find(r => r.id === id)
  if (!res) return
  // 取消上一个 undo 的 timer
  if (undoInfo.value?.timer) clearTimeout(undoInfo.value.timer)
  hiddenIds.value = [...hiddenIds.value, id]
  persistHidden()
  undoInfo.value = {
    id,
    title: res.title,
    timer: setTimeout(() => {
      undoInfo.value = null
    }, UNDO_TIMEOUT),
  }
}

function undoRemove() {
  if (!undoInfo.value) return
  clearTimeout(undoInfo.value.timer)
  hiddenIds.value = hiddenIds.value.filter(id => id !== undoInfo.value.id)
  persistHidden()
  undoInfo.value = null
}

function restoreResource(id) {
  hiddenIds.value = hiddenIds.value.filter(i => i !== id)
  persistHidden()
}

function restoreAll() {
  hiddenIds.value = []
  persistHidden()
}

function permanentlyDelete(id) {
  hiddenIds.value = hiddenIds.value.filter(i => i !== id)
  persistHidden()
  // 注意：内置资源无法真正"删除"，只是从已删除列表移除（不再出现在恢复区）
  // 用户如想再次使用，需重置或刷新页面重新加载 allResources
}

onMounted(loadHidden)
</script>

<style scoped>
.resources-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  max-width: 60ch;
}

.header-actions {
  flex-shrink: 0;
  margin-top: 0.5rem;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(4, 280px);
  gap: 1rem;
  align-items: stretch;
  justify-content: center;
}

@media (max-width: 1200px) {
  .resources-grid { grid-template-columns: repeat(3, 260px); }
}

@media (max-width: 900px) {
  .resources-grid { grid-template-columns: repeat(2, 240px); }
}

@media (max-width: 600px) {
  .resources-grid { grid-template-columns: 1fr; }
  .page-header-row { flex-direction: column; }
}

.resource-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.resource-card:hover {
  border-color: var(--accent-border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* 删除按钮 */
.card-delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 2;
}

.resource-card:hover .card-delete-btn {
  opacity: 0.7;
}

.card-delete-btn:hover {
  opacity: 1 !important;
  background: var(--error-soft);
  border-color: var(--error-border);
  color: var(--error);
  transform: scale(1.08);
}

.resource-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent-primary);
  border-radius: var(--radius-md);
}

.resource-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.resource-info h3 {
  font-size: 0.95rem;
  font-weight: 600;
}

.resource-tags {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
}

/* ===== 已删除区 ===== */
.hidden-section {
  margin-top: 2rem;
  padding: 1rem 1.25rem 1.25rem;
  background: var(--bg-surface);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

.hidden-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.875rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hidden-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.hidden-actions {
  display: flex;
  gap: 0.5rem;
}

.hidden-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hidden-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  opacity: 0.85;
}

.hidden-item-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden-item-info {
  flex: 1;
  min-width: 0;
}

.hidden-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.125rem;
}

.hidden-item-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

/* ===== 撤销 Toast ===== */
.undo-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.625rem 1rem 0.625rem 1.25rem;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  font-size: 0.875rem;
}

.undo-text {
  color: var(--text-secondary);
}

.undo-btn {
  border: 1px solid var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent-primary);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.undo-btn:hover {
  background: var(--accent-primary);
  color: #fff;
}

/* ===== Transitions ===== */
.reveal-enter-active, .reveal-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal-enter-from, .reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}

.empty-state {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--bg-surface-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
</style>
