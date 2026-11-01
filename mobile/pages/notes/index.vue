<template>
  <AppShell>
  <view class="notes-view">
    <!-- 侧边栏 -->
    <view
      class="notes-sidebar"
      :class="{ collapsed }"
      :style="collapsed ? {} : { width: sidebarWidth + 'px' }"
    >
      <!-- 展开状态内容 -->
      <template v-if="!collapsed">
        <view class="sidebar-header">
          <view class="web-h2">笔记</view>
          <view class="sidebar-actions">
            <button class="web-button btn btn-sm btn-ghost" @click="addFolder" title="新建文件夹">
              <AppIcon name="ic8460f6b" :size="16" />
            </button>
            <button class="web-button btn btn-sm btn-ghost" @click="addNote" title="新建笔记">
              <AppIcon name="icaab5e76" :size="16" />
            </button>
            <button class="web-button btn btn-sm btn-ghost" @click="showImport" title="导入">
              <AppIcon name="i15ffbe30" :size="16" />
            </button>
            <button class="web-button btn btn-sm btn-ghost collapse-btn" @click="collapseSidebar" title="收起侧边栏">
              <AppIcon name="ia032faaf" :size="16" />
            </button>
          </view>
        </view>
        <view class="tree-container">
          <NoteTree />
        </view>
      </template>

      <!-- 收起状态：只显示一个箭头按钮 -->
      <template v-else>
        <button class="web-button expand-btn" @click="expandSidebar" title="展开侧边栏">
          <AppIcon name="i969f20dd" :size="16" />
        </button>
      </template>
    </view>

    <!-- 可拖动分隔线 -->
    <view
      v-if="!collapsed"
      class="resizer"
      @touchstart="startResize" @touchmove.stop.prevent="moveResize" @touchend="stopResize" @touchcancel="stopResize"
    />

    <!-- 编辑区 -->
    <view class="notes-editor-area">
      <!-- 移动端顶部工具栏 -->
      <view class="mobile-toolbar hide-desktop">
        <button class="web-button btn btn-sm btn-secondary" @click="showMobileDrawer = true">
          <AppIcon name="if7424767" :size="16" />
          笔记列表
        </button>
        <text v-if="noteStore.currentNote" class="current-note-title">{{ noteStore.currentNote.title }}</text>
      </view>

      <NoteEditor v-if="noteStore.currentNote" :key="noteStore.currentNoteId" />
      <view v-else class="notes-empty-state">
        <view class="empty-state-icon">
          <AppIcon name="ifb735fd7" :size="40" />
        </view>
        <view class="web-p text-muted">选择或新建一篇笔记</view>
      </view>
    </view>

    <!-- 移动端笔记列表抽屉 -->
    <ViewTransition name="drawer">
      <view v-if="showMobileDrawer" class="drawer-overlay" @click.self="showMobileDrawer = false">
        <view class="mobile-drawer card">
          <view class="drawer-header">
            <view class="web-h3">笔记列表</view>
            <button class="web-button close-btn" @click="showMobileDrawer = false">
              <AppIcon name="ieba488ee" :size="18" />
            </button>
          </view>
          <view class="drawer-body">
            <view class="drawer-actions">
              <button class="web-button btn btn-sm btn-ghost" @click="addFolder">
                <AppIcon name="ic8460f6b" :size="14" />
                新建文件夹
              </button>
              <button class="web-button btn btn-sm btn-ghost" @click="addNote">
                <AppIcon name="i360f6692" :size="14" />
                新建笔记
              </button>
            </view>
            <view class="drawer-tree">
              <NoteTree />
            </view>
          </view>
        </view>
      </view>
    </ViewTransition>

    <ImportModal v-if="importModalOpen" @close="importModalOpen = false" @import="handleImport" />
  </view>

  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { showError } from '../../utils/dialog.js'

import AppShell from '../../components/AppShell.vue'

import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNoteStore } from '../../stores/note.js'
import NoteTree from '../../components/notes/NoteTree.vue'
import NoteEditor from '../../components/notes/NoteEditor.vue'
import ImportModal from '../../components/notes/ImportModal.vue'

const noteStore = useNoteStore()
const importModalOpen = ref(false)
const showMobileDrawer = ref(false)

const collapsed = ref(false)
const sidebarWidth = ref(320)
let preCollapseWidth = 320
let isResizing = false

onPageReady(() => noteStore.loadTree())

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
  resizeStart = { x: e.touches[0].clientX, width: sidebarWidth.value }
}
let resizeStart = { x: 0, width: 320 }
function moveResize(e) {
  if (!isResizing || !e.touches?.length) return
  const width = uni.getSystemInfoSync().windowWidth
  sidebarWidth.value = Math.max(200, Math.min(resizeStart.width + e.touches[0].clientX - resizeStart.x, width - 300))
}
function stopResize() { isResizing = false }

async function addNote() {
  const note = await noteStore.addNote({ type: 'note', title: '新笔记' })
  noteStore.selectNote(note.id)
}
async function addFolder() {
  const folder = await noteStore.addNote({ type: 'folder', title: '新建文件夹' })
}
function showImport() { importModalOpen.value = true }
async function handleImport(filename, content) {
  try {
    await noteStore.uploadNote(filename, content)
    importModalOpen.value = false
  } catch (error) { showError(error, '导入失败') }
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
.sidebar-header .web-h2 { font-size: 1rem; font-weight: 600; }
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

  .drawer-header .web-h3 {
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
