<!-- mobile/pages/resources/index.vue -->
<!--
  Port of src/views/ResourcesView.vue
  Deltas: HTML 标签 → uni 组件（div/button/h1/h2/h3/p/li/pre → view，span/code → text），
  `localStorage` → uni.getStorageSync/setStorageSync，
  `window.open(url,'_blank')` → plus.runtime.openURL（App 端用系统浏览器新窗口打开），
  `alert()` → uni.showModal，
  文件上传：web 的 <input type="file"> + 拖拽 → uni.chooseFile（App 端无拖拽）。
-->
<template>
  <AppShell>
    <view class="resources-view" @click="closeMenu">
      <view class="page-header-row">
        <view>
          <view class="page-title">学习资源</view>
          <view class="text-muted text-sm page-subtitle">
            点击卡片即可在新窗口中打开资源。支持上传 HTML 文件、软删除（仅界面隐藏）与硬删除（删除磁盘文件）。
          </view>
        </view>
        <view class="header-actions">
          <view class="btn btn-primary btn-sm" @click="openUploadModal">
            <AppIcon name="i4e4dc137" :size="14" />
            上传资源
          </view>
          <view v-if="hiddenIds.length > 0" class="btn btn-ghost btn-sm" @click="showHidden = !showHidden">
            <AppIcon name="ib3a080f4" :size="14" />
            {{ showHidden ? '隐藏已删项' : `已删（${hiddenIds.length}）` }}
          </view>
          <view class="btn btn-ghost btn-sm" @click="refresh" :style="disabledStyle(loading)" title="刷新列表">
            <AppIcon name="i7309fd85" :size="14" :class="{ 'spin': loading }" />
          </view>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="loading && resources.length === 0" class="empty-state card">
        <view class="empty-state-icon">
          <AppIcon name="i19de0b89" :size="32" class="spin" />
        </view>
        <view class="text-muted">加载资源列表中…</view>
      </view>

      <!-- 资源卡片网格 -->
      <view v-else-if="visibleResources.length > 0" class="resources-grid">
        <view
          v-for="res in visibleResources"
          :key="res.file"
          class="resource-card card"
          @click="openResource(res.file)"
        >
          <!-- 删除下拉触发器 -->
          <view class="card-actions">
            <view
              class="card-action-btn"
              @click.stop="toggleDeleteMenu(res.file)"
              :aria-label="`操作菜单 ${res.name}`"
              title="操作"
            >
              <AppIcon name="i9862afe9" :size="14" />
            </view>
            <!-- 下拉菜单 -->
            <ViewTransition name="menu">
              <view v-if="openMenu === res.file" class="delete-menu" @click.stop>
                <view class="delete-menu-item" @click="softDelete(res)">
                  <view class="menu-icon menu-icon-soft">
                    <AppIcon name="i62d22477" :size="14" />
                  </view>
                  <view class="menu-text">
                    <view class="menu-title">软删除</view>
                    <view class="menu-desc">仅界面隐藏，文件保留</view>
                  </view>
                </view>
                <view class="delete-menu-item delete-menu-danger" @click="hardDelete(res)">
                  <view class="menu-icon menu-icon-hard">
                    <AppIcon name="i1fb760bf" :size="14" />
                  </view>
                  <view class="menu-text">
                    <view class="menu-title">硬删除</view>
                    <view class="menu-desc">删除磁盘文件，不可恢复</view>
                  </view>
                </view>
              </view>
            </ViewTransition>
          </view>
          <view class="resource-icon">
            <AppIcon name="i4142e4cc" :size="32" />
          </view>
          <view class="resource-info">
            <view class="resource-title">{{ res.title || res.name }}</view>
            <view class="text-muted text-sm meta-line">
              <text>{{ formatSize(res.size) }}</text>
              <text class="dot">·</text>
              <text>{{ formatDate(res.mtime) }}</text>
            </view>
            <view class="resource-tags">
              <text class="tag">HTML</text>
              <text class="tag" v-if="res.isBuiltin">内置</text>
              <text class="tag" v-else>用户上传</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state card">
        <view class="empty-state-icon">
          <AppIcon name="i4142e4cc" :size="32" />
        </view>
        <view class="text-muted">还没有任何资源</view>
        <view class="btn btn-primary btn-sm" @click="openUploadModal">上传第一个资源</view>
      </view>

      <!-- 已软删除区 -->
      <ViewTransition name="reveal">
        <view v-if="showHidden && hiddenResources.length > 0" class="hidden-section">
          <view class="hidden-header">
            <view class="hidden-title">
              <AppIcon name="i1fb760bf" :size="16" />
              软删除 · {{ hiddenResources.length }}
            </view>
            <view class="hidden-actions">
              <view class="btn btn-secondary btn-sm" @click="restoreAll">全部恢复</view>
              <view class="btn btn-ghost btn-sm" @click="showHidden = false">收起</view>
            </view>
          </view>
          <view class="hidden-list">
            <view v-for="res in hiddenResources" :key="'h-' + res.file" class="hidden-item">
              <view class="hidden-item-icon">
                <AppIcon name="i4142e4cc" :size="20" />
              </view>
              <view class="hidden-item-info">
                <view class="hidden-item-title">{{ res.title || res.name }}</view>
                <view class="text-muted text-xs">{{ formatSize(res.size) }} · {{ formatDate(res.mtime) }}</view>
              </view>
              <view class="hidden-item-actions">
                <view class="btn btn-secondary btn-sm" @click="restoreResource(res.file)">恢复</view>
                <view class="btn btn-danger-outline btn-sm" @click="hardDeleteFromHidden(res)">硬删除</view>
              </view>
            </view>
          </view>
        </view>
      </ViewTransition>

      <!-- 撤销 Toast -->
      <ViewTransition name="toast">
        <view v-if="undoInfo" class="undo-toast">
          <text class="undo-text">已软删除「{{ undoInfo.name }}」</text>
          <view class="undo-btn" @click="undoRemove">撤销</view>
        </view>
      </ViewTransition>

      <!-- 上传弹窗 -->
      <ViewTransition name="modal">
        <view v-if="uploadOpen" class="upload-modal-overlay" @click.self="closeUploadModal">
          <view class="upload-modal card animate-scaleIn">
            <view class="upload-modal-header">
              <view class="upload-modal-title">上传 HTML 资源</view>
              <view class="close-btn" @click="closeUploadModal" aria-label="关闭">
                <AppIcon name="ieba488ee" :size="18" />
              </view>
            </view>
            <view class="upload-modal-body">
              <view
                class="upload-dropzone"
                :class="{ error: uploadError }"
                @click="handleUploadSelect"
              >
                <view class="upload-icon">
                  <AppIcon name="ib57f0e77" :size="40" />
                </view>
                <view class="upload-text">拖拽 .html 文件到此处</view>
                <view class="upload-hint">或点击此处选择文件</view>
                <view class="upload-formats">
                  <text class="format-chip">.html / .htm</text>
                  <text class="format-chip">≤ 10MB</text>
                </view>
              </view>

              <!-- 文件名预览 -->
              <view v-if="pendingFile" class="pending-file">
                <AppIcon name="i4e69e8e2" :size="16" />
                <text class="pending-name">{{ pendingFile.name }}</text>
                <text class="pending-size text-muted text-xs">{{ formatSize(pendingFile.size) }}</text>
                <view class="pending-clear" @click="clearPending" aria-label="清除">
                  <AppIcon name="i7176c948" :size="12" />
                </view>
              </view>

              <view v-if="uploadError" class="upload-error">
                <AppIcon name="i0e4b50ef" :size="14" />
                <text>{{ uploadError }}</text>
              </view>

              <view class="upload-tip">
                <AppIcon name="i2f64d701" :size="14" />
                <text>上传后文件保存到服务器 <text class="code">public/resources/</text> 目录，所有用户可见。</text>
              </view>

              <!-- 格式要求说明 -->
              <view class="upload-format-guide">
                <view class="format-guide-title">
                  <AppIcon name="i0e190ac8" :size="14" />
                  <text>格式要求</text>
                </view>
                <view class="format-guide-list">
                  <view>文件必须包含 <text class="code">&lt;title&gt;</text> 标签，内容将作为卡片标题显示</view>
                  <view>建议使用 UTF-8 编码，避免中文乱码</view>
                  <view>文件名仅允许字母、数字、<text class="code">-</text>、<text class="code">_</text>，特殊字符会被替换</view>
                  <view>文件大小不超过 10MB</view>
                </view>
                <view class="format-guide-example">
                  <view class="example-label">示例 HTML 结构：</view>
                  <view class="example-code"><text class="code">&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;磁盘调度算法详解&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;磁盘调度算法&lt;/h1&gt;
  &lt;p&gt;FCFS、SSTF、SCAN、C-SCAN...&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</text></view>
                </view>
              </view>
            </view>
            <view class="upload-modal-footer">
              <view class="btn btn-secondary" @click="closeUploadModal">取消</view>
              <view class="btn btn-primary" :style="disabledStyle(!pendingFile || uploading)" @click="confirmUpload">
                <text v-if="uploading" class="upload-spinner"></text>
                <text v-else>{{ pendingFile ? '上传' : '请选择文件' }}</text>
              </view>
            </view>
          </view>
        </view>
      </ViewTransition>

      <!-- 硬删除确认弹窗 -->
      <ViewTransition name="modal">
        <view v-if="hardDeleteConfirm" class="confirm-overlay" @click.self="hardDeleteConfirm = null">
          <view class="confirm-dialog card animate-scaleIn">
            <view class="confirm-icon">
              <AppIcon name="ibd544ad3" :size="28" />
            </view>
            <view class="confirm-title">确认硬删除</view>
            <view class="confirm-desc">即将从磁盘永久删除文件 <text class="code">{{ hardDeleteConfirm.file }}</text></view>
            <view class="confirm-warning">此操作不可恢复，所有用户都将无法访问该资源。</view>
            <view class="confirm-actions">
              <view class="btn btn-secondary" @click="hardDeleteConfirm = null">取消</view>
              <view class="btn btn-danger" :style="disabledStyle(hardDeleting)" @click="confirmHardDelete">
                <text v-if="hardDeleting" class="upload-spinner"></text>
                <text v-else>确认删除</text>
              </view>
            </view>
          </view>
        </view>
      </ViewTransition>
    </view>
  </AppShell>
</template>

<script setup>
import { pickTextFile } from '../../utils/fs.js'
import { accountStorageKey } from '../../utils/accountScope.js'
import { onPageReady } from '../../composables/usePageReady.js'

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { listResources, uploadResource, deleteResource, getApiBase } from '../../utils/api.js'
import { useAuthStore } from '../../stores/auth.js'
import AppShell from '../../components/AppShell.vue'

const STORAGE_KEY = 'resources-hidden-ids'
const authStore = useAuthStore()
const hiddenStorageKey = () => accountStorageKey(STORAGE_KEY, authStore.user?.id)
const BUILTIN_FILES = [
  'disk-scheduling.html',
  'tcp-congestion.html',
  'ip-fragmentation.html',
  'arp-protocol.html',
  'memory-management.html',
  'memory-recycle.html',
  '2026-06-28-qa.html',
]

const resources = ref([])
const hiddenIds = ref([])
const showHidden = ref(false)
const loading = ref(true)
const openMenu = ref(null)  // 当前打开下拉菜单的 file 名

// 上传弹窗状态
const uploadOpen = ref(false)
const pendingFile = ref(null)
const uploadError = ref('')
const uploading = ref(false)

// 硬删除确认
const hardDeleteConfirm = ref(null)
const hardDeleting = ref(false)

// 撤销 Toast
const undoInfo = ref(null)
const UNDO_TIMEOUT = 5000

// App 端 <view> 没有 :disabled，用内联样式复现原版 `.btn:disabled` 的观感
function disabledStyle(disabled) {
  return disabled ? 'opacity: 0.4; pointer-events: none;' : ''
}

const visibleResources = computed(() =>
  resources.value.filter(r => !hiddenIds.value.includes(r.file))
)
const hiddenResources = computed(() =>
  resources.value.filter(r => hiddenIds.value.includes(r.file))
)

function loadHidden() {
  try {
    hiddenIds.value = JSON.parse(uni.getStorageSync(hiddenStorageKey()) || '[]')
  } catch {
    hiddenIds.value = []
  }
}
function persistHidden() {
  uni.setStorageSync(hiddenStorageKey(), JSON.stringify(hiddenIds.value))
}

async function refresh() {
  loading.value = true
  try {
    const { files } = await listResources()
    // 标记内置资源
    resources.value = files.map(f => ({
      ...f,
      isBuiltin: BUILTIN_FILES.includes(f.file),
    }))
    // 清理 hiddenIds 中已不存在的 file
    const validFiles = new Set(files.map(f => f.file))
    hiddenIds.value = hiddenIds.value.filter(id => validFiles.has(id))
    persistHidden()
  } catch (e) {
    console.error('load resources failed:', e)
  } finally {
    loading.value = false
  }
}

// 原版 window.open(url, '_blank') —— App 端用系统浏览器新窗口打开
function openResource(file) {
  const url = `${getApiBase()}/resources/${encodeURIComponent(file)}`
  try {
    if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
      plus.runtime.openURL(url)
      return
    }
  } catch (e) {
    console.error('open resource failed:', e)
  }
  uni.showModal({ title: '打开资源', content: url, showCancel: false })
}

// ===== 下拉菜单 =====
function toggleDeleteMenu(file) {
  openMenu.value = openMenu.value === file ? null : file
}
function closeMenu() {
  openMenu.value = null
}

// ===== 软删除 =====
function softDelete(res) {
  closeMenu()
  if (undoInfo.value?.timer) clearTimeout(undoInfo.value.timer)
  hiddenIds.value = [...hiddenIds.value, res.file]
  persistHidden()
  undoInfo.value = {
    file: res.file,
    name: res.title || res.name,
    timer: setTimeout(() => {
      undoInfo.value = null
    }, UNDO_TIMEOUT),
  }
}
function undoRemove() {
  if (!undoInfo.value) return
  clearTimeout(undoInfo.value.timer)
  hiddenIds.value = hiddenIds.value.filter(id => id !== undoInfo.value.file)
  persistHidden()
  undoInfo.value = null
}
function restoreResource(file) {
  hiddenIds.value = hiddenIds.value.filter(i => i !== file)
  persistHidden()
}
function restoreAll() {
  hiddenIds.value = []
  persistHidden()
}

// ===== 硬删除 =====
function hardDelete(res) {
  closeMenu()
  hardDeleteConfirm.value = res
}
function hardDeleteFromHidden(res) {
  hardDeleteConfirm.value = res
}
async function confirmHardDelete() {
  if (!hardDeleteConfirm.value || hardDeleting.value) return
  const target = hardDeleteConfirm.value
  hardDeleting.value = true
  try {
    await deleteResource(target.file)
    // 从列表移除
    resources.value = resources.value.filter(r => r.file !== target.file)
    // 从软删除列表也移除（如果存在）
    hiddenIds.value = hiddenIds.value.filter(i => i !== target.file)
    persistHidden()
    hardDeleteConfirm.value = null
  } catch (e) {
    console.error('hard delete failed:', e)
    uni.showModal({ title: '硬删除失败', content: `硬删除失败：${e.message}`, showCancel: false })
  } finally {
    hardDeleting.value = false
  }
}

// ===== 上传 =====
// App 端没有 <input type="file">，改用 uni.chooseFile 选择并读取内容
async function pickHtmlFile() {
  const file = await pickTextFile(['.html', '.htm'])
  return { name: file.filename, size: file.size, content: file.content }
}

function openUploadModal() {
  uploadOpen.value = true
  uploadError.value = ''
  pendingFile.value = null
}
function closeUploadModal() {
  uploadOpen.value = false
  pendingFile.value = null
  uploadError.value = ''
}
function clearPending() {
  pendingFile.value = null
  uploadError.value = ''
}
async function handleUploadSelect() {
  try {
    const file = await pickHtmlFile()
    setPendingFile(file)
  } catch (e) {
    // 用户取消选择时不提示
    if (/cancel/i.test(e?.message || '')) return
    uploadError.value = e?.message || '选择文件失败'
  }
}
function setPendingFile(file) {
  uploadError.value = ''
  pendingFile.value = file
}
async function confirmUpload() {
  if (!pendingFile.value || uploading.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    await uploadResource(pendingFile.value.name, pendingFile.value.content)
    await refresh()
    closeUploadModal()
  } catch (e) {
    console.error('upload failed:', e)
    uploadError.value = e.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

// ===== 格式化辅助 =====
function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onPageReady(() => {
  loadHidden()
  refresh()
})
onUnmounted(() => {
  if (undoInfo.value?.timer) clearTimeout(undoInfo.value.timer)
})
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
  display: flex;
  gap: 0.5rem;
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
  .header-actions { flex-wrap: wrap; }
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

/* 操作菜单触发器 */
.card-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3;
}

.card-action-btn {
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
}

.resource-card:hover .card-action-btn {
  opacity: 0.7;
}

.card-action-btn:hover {
  opacity: 1 !important;
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

/* 下拉菜单 */
.delete-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 220px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
  overflow: hidden;
  z-index: 10;
}

.delete-menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s ease;
}

.delete-menu-item + .delete-menu-item {
  border-top: 1px solid var(--border-color);
}

.delete-menu-item:hover {
  background: var(--bg-surface);
}

.delete-menu-danger:hover {
  background: var(--error-soft);
}

.menu-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon-soft {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.menu-icon-hard {
  background: var(--error-soft);
  color: var(--error);
}

.menu-text {
  flex: 1;
}

.menu-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1px;
}

.delete-menu-danger .menu-title {
  color: var(--error);
}

.menu-desc {
  font-size: 0.7rem;
  color: var(--text-muted);
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

.resource-info .resource-title {
  font-size: 0.95rem;
  font-weight: 600;
  /* 文件名可能很长，截断 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.72rem;
}

.meta-line .dot {
  color: var(--border-color);
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
  background: var(--bg-surface);
  color: var(--text-muted);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* ===== 上传弹窗 ===== */
.upload-modal-overlay,
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.upload-modal {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.upload-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.upload-modal-header .upload-modal-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.upload-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.upload-dropzone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2rem 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--bg-surface);
  cursor: pointer;
}

.upload-dropzone:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.upload-dropzone.dragging {
  border-color: var(--accent-primary);
  background: var(--accent-soft);
  transform: scale(1.01);
}

.upload-dropzone.error {
  border-color: var(--error);
}

.upload-icon {
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.upload-dropzone:hover .upload-icon,
.upload-dropzone.dragging .upload-icon {
  color: var(--accent-primary);
}

.upload-text {
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.upload-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.upload-formats {
  display: flex;
  gap: 0.375rem;
  justify-content: center;
}

.format-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
}

.pending-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  color: var(--accent-primary);
  font-size: 0.82rem;
}

.pending-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-clear {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
}

.pending-clear:hover {
  color: var(--text-primary);
}

.upload-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--error-soft);
  border: 1px solid var(--error-border);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 0.8rem;
}

.upload-tip {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.upload-tip .code {
  background: var(--bg-card);
  padding: 0.05em 0.35em;
  border-radius: 3px;
  color: var(--accent-primary);
}

/* 格式要求说明 */
.upload-format-guide {
  padding: 0.75rem 0.875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  line-height: 1.6;
}

.format-guide-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.format-guide-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.625rem 0;
}

.format-guide-list view {
  position: relative;
  padding-left: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.format-guide-list view::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
}

.format-guide-list .code,
.upload-format-guide .code {
  background: var(--bg-card);
  padding: 0.05em 0.35em;
  border-radius: 3px;
  color: var(--accent-primary);
  font-size: 0.7rem;
}

.format-guide-example {
  margin-top: 0.5rem;
}

.example-label {
  color: var(--text-muted);
  margin-bottom: 0.375rem;
  font-size: 0.7rem;
}

.example-code {
  margin: 0;
  padding: 0.625rem 0.75rem;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 0.68rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.example-code .code {
  background: none;
  padding: 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  /* 原 <pre> 的默认换行/缩进保留（uni 的 <text> 默认 white-space: pre-line） */
  white-space: pre-wrap;
}

.upload-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.upload-modal-footer .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.upload-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ===== 硬删除确认弹窗 ===== */
.confirm-dialog {
  width: 100%;
  max-width: 420px;
  padding: 1.75rem 1.5rem 1.25rem;
  text-align: center;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--error-soft);
  color: var(--error);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.875rem;
}

.confirm-dialog .confirm-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
}

.confirm-dialog .confirm-desc,
.confirm-dialog .confirm-warning {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
  line-height: 1.5;
}

.confirm-dialog .code {
  background: var(--bg-surface);
  padding: 0.05em 0.4em;
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--text-primary);
  word-break: break-all;
}

.confirm-warning {
  color: var(--error) !important;
  font-size: 0.78rem !important;
  margin-top: 0.25rem;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1.25rem;
}

.confirm-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

/* ===== 空状态 ===== */
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

/* ===== 工具类（按钮变体） ===== */
.btn-danger {
  background: var(--error);
  color: #fff;
  border-color: var(--error);
}
.btn-danger:hover {
  filter: brightness(1.1);
}
.btn-danger-outline {
  background: transparent;
  color: var(--error);
  border: 1px solid var(--error-border);
}
.btn-danger-outline:hover {
  background: var(--error-soft);
}

/* ===== 旋转动画 ===== */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.menu-enter-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}
.menu-leave-active {
  transition: all 0.12s ease;
}
.menu-enter-from, .menu-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}

.modal-enter-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active .upload-modal,
.modal-enter-active .confirm-dialog {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}
.modal-leave-active {
  transition: opacity 0.14s ease;
}
.modal-leave-active .upload-modal,
.modal-leave-active .confirm-dialog {
  transition: transform 0.14s ease, opacity 0.14s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .upload-modal,
.modal-enter-from .confirm-dialog,
.modal-leave-to .upload-modal,
.modal-leave-to .confirm-dialog {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>
