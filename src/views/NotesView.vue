<template>
  <div class="notes-view">
    <!-- 侧边栏 -->
    <aside
      class="notes-sidebar"
      :class="{ collapsed }"
      :style="collapsed ? {} : { width: sidebarWidth + 'px' }"
    >
      <!-- 展开状态内容 -->
      <template v-if="!collapsed">
        <div class="sidebar-header">
          <h2>笔记</h2>
          <div class="sidebar-actions">
            <button class="btn btn-sm btn-ghost" @click="addFolder" title="新建文件夹">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-ghost" @click="addNote" title="新建笔记">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-ghost" @click="showImport" title="导入">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-ghost collapse-btn" @click="collapseSidebar" title="收起侧边栏">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="tree-container">
          <NoteTree />
        </div>
      </template>

      <!-- 收起状态：只显示一个箭头按钮 -->
      <template v-else>
        <button class="expand-btn" @click="expandSidebar" title="展开侧边栏">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </template>
    </aside>

    <!-- 可拖动分隔线 -->
    <div
      v-if="!collapsed"
      class="resizer"
      @mousedown="startResize"
    />

    <!-- 编辑区 -->
    <main class="notes-editor-area">
      <!-- 移动端顶部工具栏 -->
      <div class="mobile-toolbar hide-desktop">
        <button class="btn btn-sm btn-secondary" @click="showMobileDrawer = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          笔记列表
        </button>
        <span v-if="noteStore.currentNote" class="current-note-title">{{ noteStore.currentNote.title }}</span>
      </div>

      <NoteEditor v-if="noteStore.currentNote" :key="noteStore.currentNoteId" />
      <div v-else class="notes-empty-state">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <p class="text-muted">选择或新建一篇笔记</p>
      </div>
    </main>

    <!-- 移动端笔记列表抽屉 -->
    <transition name="drawer">
      <div v-if="showMobileDrawer" class="drawer-overlay" @click.self="showMobileDrawer = false">
        <aside class="mobile-drawer card">
          <header class="drawer-header">
            <h3>笔记列表</h3>
            <button class="close-btn" @click="showMobileDrawer = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="drawer-body">
            <div class="drawer-actions">
              <button class="btn btn-sm btn-ghost" @click="addFolder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                新建文件夹
              </button>
              <button class="btn btn-sm btn-ghost" @click="addNote">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                新建笔记
              </button>
            </div>
            <div class="drawer-tree">
              <NoteTree />
            </div>
          </div>
        </aside>
      </div>
    </transition>

    <ImportModal v-if="importModalOpen" @close="importModalOpen = false" @import="handleImport" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNoteStore } from '../stores/note.js'
import NoteTree from '../components/notes/NoteTree.vue'
import NoteEditor from '../components/notes/NoteEditor.vue'
import ImportModal from '../components/notes/ImportModal.vue'

const noteStore = useNoteStore()
const importModalOpen = ref(false)
const showMobileDrawer = ref(false)

const collapsed = ref(false)
const sidebarWidth = ref(320)
let preCollapseWidth = 320
let isResizing = false

onMounted(() => noteStore.loadTree())

// 移动端选择笔记后自动关闭抽屉
watch(() => noteStore.currentNoteId, () => {
  if (noteStore.currentNoteId) {
    showMobileDrawer.value = false
  }
})

function collapseSidebar() {
  preCollapseWidth = sidebarWidth.value
  collapsed.value = true
}

function expandSidebar() {
  collapsed.value = false
  sidebarWidth.value = preCollapseWidth
}

function startResize(e) {
  isResizing = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMouseMove(e) {
    if (!isResizing) return
    const delta = e.clientX - startX
    sidebarWidth.value = Math.max(200, Math.min(startWidth + delta, window.innerWidth - 300))
  }

  function onMouseUp() {
    isResizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

async function addNote() {
  const note = await noteStore.addNote({ type: 'note', title: '新笔记' })
  noteStore.selectNote(note.id)
}
async function addFolder() {
  const folder = await noteStore.addNote({ type: 'folder', title: '新建文件夹' })
}
function showImport() { importModalOpen.value = true }
async function handleImport(file) {
  await noteStore.uploadNote(file)
  importModalOpen.value = false
}
</script>

<style scoped>
.notes-view {
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.notes-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-right: 1px solid var(--border-color);
}

.notes-sidebar.collapsed {
  width: 44px !important;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
}
.sidebar-header h2 { font-size: 1rem; font-weight: 600; }
.sidebar-actions { display: flex; gap: 0.25rem; align-items: center; }

.collapse-btn {
  margin-left: auto;
}

.tree-container { flex: 1; overflow-y: auto; padding: 0.75rem; }

/* 收起状态的展开按钮 */
.expand-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 0;
  border-bottom: 1px solid var(--border-color);
  transition: color 0.15s, background 0.15s;
}

.expand-btn:hover {
  color: var(--accent-primary);
  background: var(--accent-soft);
}

/* 可拖动分隔线 */
.resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.15s;
  z-index: 10;
}

.resizer:hover,
.resizer:active {
  background: var(--accent-primary);
}

.notes-editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.notes-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

@media (max-width: 768px) {
  .notes-view {
    position: static;
    height: auto;
    min-height: calc(100vh - 64px);
    padding-bottom: 72px;
  }
  .notes-sidebar { display: none; }
  .resizer { display: none; }
  .notes-editor-area {
    min-height: calc(100vh - 64px - 72px);
  }

  .mobile-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0.5rem;
  }

  .current-note-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 移动端抽屉 */
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 200;
    display: flex;
    justify-content: flex-end;
  }

  .mobile-drawer {
    width: 300px;
    max-width: 85vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-radius: 0;
    background: var(--bg-card);
    border-left: 1px solid var(--border-color);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .drawer-header h3 {
    font-size: 1rem;
    font-weight: 600;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--bg-surface-raised);
    color: var(--text-primary);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .drawer-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .drawer-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .drawer-tree {
    flex: 1;
    overflow-y: auto;
  }

  /* 抽屉动画 */
  .drawer-enter-active, .drawer-leave-active {
    transition: opacity 0.2s ease;
  }
  .drawer-enter-active .mobile-drawer, .drawer-leave-active .mobile-drawer {
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .drawer-enter-from, .drawer-leave-to {
    opacity: 0;
  }
  .drawer-enter-from .mobile-drawer, .drawer-leave-to .mobile-drawer {
    transform: translateX(100%);
  }
}
</style>
