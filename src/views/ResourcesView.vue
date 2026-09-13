<template>
  <div class="resources-view">
    <div class="page-header-row">
      <div>
        <h1 class="page-title">学习资源</h1>
        <p class="text-muted text-sm page-subtitle">
          点击卡片即可在新窗口中打开资源。支持上传 HTML 文件、软删除（仅界面隐藏）与硬删除（删除磁盘文件）。
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" @click="openUploadModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          上传资源
        </button>
        <button v-if="hiddenIds.length > 0" class="btn btn-ghost btn-sm" @click="showHidden = !showHidden">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {{ showHidden ? '隐藏已删项' : `已删（${hiddenIds.length}）` }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="refresh" :disabled="loading" title="刷新列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'spin': loading }">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="loading && resources.length === 0" class="empty-state card">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
      <p class="text-muted">加载资源列表中…</p>
    </div>

    <!-- 资源卡片网格 -->
    <div v-else-if="visibleResources.length > 0" class="resources-grid">
      <div
        v-for="res in visibleResources"
        :key="res.file"
        class="resource-card card"
        @click="openResource(res.file)"
      >
        <!-- 删除下拉触发器 -->
        <div class="card-actions">
          <button
            class="card-action-btn"
            @click.stop="toggleDeleteMenu(res.file)"
            :aria-label="`操作菜单 ${res.name}`"
            title="操作"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          <!-- 下拉菜单 -->
          <Transition name="menu">
            <div v-if="openMenu === res.file" class="delete-menu" @click.stop>
              <button class="delete-menu-item" @click="softDelete(res)">
                <span class="menu-icon menu-icon-soft">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </span>
                <div class="menu-text">
                  <div class="menu-title">软删除</div>
                  <div class="menu-desc">仅界面隐藏，文件保留</div>
                </div>
              </button>
              <button class="delete-menu-item delete-menu-danger" @click="hardDelete(res)">
                <span class="menu-icon menu-icon-hard">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </span>
                <div class="menu-text">
                  <div class="menu-title">硬删除</div>
                  <div class="menu-desc">删除磁盘文件，不可恢复</div>
                </div>
              </button>
            </div>
          </Transition>
        </div>
        <div class="resource-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div class="resource-info">
          <h3>{{ res.title || res.name }}</h3>
          <p class="text-muted text-sm meta-line">
            <span>{{ formatSize(res.size) }}</span>
            <span class="dot">·</span>
            <span>{{ formatDate(res.mtime) }}</span>
          </p>
          <div class="resource-tags">
            <span class="tag">HTML</span>
            <span class="tag" v-if="res.isBuiltin">内置</span>
            <span class="tag" v-else>用户上传</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state card">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <p class="text-muted">还没有任何资源</p>
      <button class="btn btn-primary btn-sm" @click="openUploadModal">上传第一个资源</button>
    </div>

    <!-- 已软删除区 -->
    <Transition name="reveal">
      <section v-if="showHidden && hiddenResources.length > 0" class="hidden-section">
        <div class="hidden-header">
          <h2 class="hidden-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            软删除 · {{ hiddenResources.length }}
          </h2>
          <div class="hidden-actions">
            <button class="btn btn-secondary btn-sm" @click="restoreAll">全部恢复</button>
            <button class="btn btn-ghost btn-sm" @click="showHidden = false">收起</button>
          </div>
        </div>
        <div class="hidden-list">
          <div v-for="res in hiddenResources" :key="'h-' + res.file" class="hidden-item">
            <div class="hidden-item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div class="hidden-item-info">
              <div class="hidden-item-title">{{ res.title || res.name }}</div>
              <div class="text-muted text-xs">{{ formatSize(res.size) }} · {{ formatDate(res.mtime) }}</div>
            </div>
            <div class="hidden-item-actions">
              <button class="btn btn-secondary btn-sm" @click="restoreResource(res.file)">恢复</button>
              <button class="btn btn-danger-outline btn-sm" @click="hardDeleteFromHidden(res)">硬删除</button>
            </div>
          </div>
        </div>
      </section>
    </Transition>

    <!-- 撤销 Toast -->
    <Transition name="toast">
      <div v-if="undoInfo" class="undo-toast">
        <span class="undo-text">已软删除「{{ undoInfo.name }}」</span>
        <button class="undo-btn" @click="undoRemove">撤销</button>
      </div>
    </Transition>

    <!-- 上传弹窗 -->
    <Transition name="modal">
      <div v-if="uploadOpen" class="upload-modal-overlay" @click.self="closeUploadModal">
        <div class="upload-modal card animate-scaleIn">
          <div class="upload-modal-header">
            <h2>上传 HTML 资源</h2>
            <button class="close-btn" @click="closeUploadModal" aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="upload-modal-body">
            <div
              class="upload-dropzone"
              :class="{ dragging: isDragging, error: uploadError }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleUploadDrop"
              @click="$refs.htmlInput.click()"
            >
              <input
                type="file"
                accept=".html,.htm"
                @change="handleUploadSelect"
                ref="htmlInput"
                style="display: none"
              />
              <div class="upload-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p class="upload-text">拖拽 .html 文件到此处</p>
              <p class="upload-hint">或点击此处选择文件</p>
              <div class="upload-formats">
                <span class="format-chip">.html / .htm</span>
                <span class="format-chip">≤ 10MB</span>
              </div>
            </div>

            <!-- 文件名预览 -->
            <div v-if="pendingFile" class="pending-file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span class="pending-name">{{ pendingFile.name }}</span>
              <span class="pending-size text-muted text-xs">{{ formatSize(pendingFile.size) }}</span>
              <button class="pending-clear" @click="clearPending" aria-label="清除">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div v-if="uploadError" class="upload-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{{ uploadError }}</span>
            </div>

            <div class="upload-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>上传后文件保存到服务器 <code>public/resources/</code> 目录，所有用户可见。</span>
            </div>

            <!-- 格式要求说明 -->
            <div class="upload-format-guide">
              <div class="format-guide-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <span>格式要求</span>
              </div>
              <ul class="format-guide-list">
                <li>文件必须包含 <code>&lt;title&gt;</code> 标签，内容将作为卡片标题显示</li>
                <li>建议使用 UTF-8 编码，避免中文乱码</li>
                <li>文件名仅允许字母、数字、<code>-</code>、<code>_</code>，特殊字符会被替换</li>
                <li>文件大小不超过 10MB</li>
              </ul>
              <div class="format-guide-example">
                <div class="example-label">示例 HTML 结构：</div>
                <pre class="example-code"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;磁盘调度算法详解&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;磁盘调度算法&lt;/h1&gt;
  &lt;p&gt;FCFS、SSTF、SCAN、C-SCAN...&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
              </div>
            </div>
          </div>
          <div class="upload-modal-footer">
            <button class="btn btn-secondary" @click="closeUploadModal">取消</button>
            <button class="btn btn-primary" :disabled="!pendingFile || uploading" @click="confirmUpload">
              <span v-if="uploading" class="upload-spinner"></span>
              <span v-else>{{ pendingFile ? '上传' : '请选择文件' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 硬删除确认弹窗 -->
    <Transition name="modal">
      <div v-if="hardDeleteConfirm" class="confirm-overlay" @click.self="hardDeleteConfirm = null">
        <div class="confirm-dialog card animate-scaleIn">
          <div class="confirm-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3>确认硬删除</h3>
          <p>即将从磁盘永久删除文件 <code>{{ hardDeleteConfirm.file }}</code></p>
          <p class="confirm-warning">此操作不可恢复，所有用户都将无法访问该资源。</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="hardDeleteConfirm = null">取消</button>
            <button class="btn btn-danger" @click="confirmHardDelete" :disabled="hardDeleting">
              <span v-if="hardDeleting" class="upload-spinner"></span>
              <span v-else>确认删除</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { listResources, uploadResource, deleteResource } from '../utils/api.js'
import { useAuthStore } from '../stores/auth.js'

const STORAGE_KEY = 'resources-hidden-ids'
const authStore = useAuthStore()
const hiddenStorageKey = () => `${STORAGE_KEY}:${authStore.user?.id}`
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
const isDragging = ref(false)
const pendingFile = ref(null)
const uploadError = ref('')
const uploading = ref(false)
const htmlInput = ref(null)

// 硬删除确认
const hardDeleteConfirm = ref(null)
const hardDeleting = ref(false)

// 撤销 Toast
const undoInfo = ref(null)
const UNDO_TIMEOUT = 5000

const visibleResources = computed(() =>
  resources.value.filter(r => !hiddenIds.value.includes(r.file))
)
const hiddenResources = computed(() =>
  resources.value.filter(r => hiddenIds.value.includes(r.file))
)

function loadHidden() {
  try {
    hiddenIds.value = JSON.parse(localStorage.getItem(hiddenStorageKey()) || '[]')
  } catch {
    hiddenIds.value = []
  }
}
function persistHidden() {
  localStorage.setItem(hiddenStorageKey(), JSON.stringify(hiddenIds.value))
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

function openResource(file) {
  const url = `${import.meta.env.BASE_URL}resources/${file}`
  window.open(url, '_blank', 'width=1280,height=800,noopener,noreferrer')
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
  if (!hardDeleteConfirm.value) return
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
    alert(`硬删除失败：${e.message}`)
  } finally {
    hardDeleting.value = false
  }
}

// ===== 上传 =====
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
  if (htmlInput.value) htmlInput.value.value = ''
}
async function handleUploadSelect(event) {
  const file = event.target.files[0]
  if (file) setPendingFile(file)
  event.target.value = ''
}
function handleUploadDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (!file) return
  if (!/\.(html?|htm)$/i.test(file.name)) {
    uploadError.value = '请上传 .html 或 .htm 文件'
    return
  }
  setPendingFile(file)
}
function setPendingFile(file) {
  uploadError.value = ''
  pendingFile.value = file
}
async function confirmUpload() {
  if (!pendingFile.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    const content = await pendingFile.value.text()
    await uploadResource(pendingFile.value.name, content)
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

// ===== 全局点击关闭下拉菜单 =====
function onDocClick(e) {
  // 只在没点到 .card-actions 内的元素时关闭
  if (openMenu.value && !e.target.closest('.card-actions')) {
    openMenu.value = null
  }
}

onMounted(() => {
  loadHidden()
  refresh()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
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

.resource-info h3 {
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

.upload-modal-header h2 {
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

.upload-tip code {
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

.format-guide-list li {
  position: relative;
  padding-left: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.format-guide-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
}

.format-guide-list code,
.upload-format-guide code {
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

.example-code code {
  background: none;
  padding: 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
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

.confirm-dialog h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
}

.confirm-dialog p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
  line-height: 1.5;
}

.confirm-dialog code {
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
