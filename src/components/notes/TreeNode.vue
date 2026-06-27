<template>
  <div class="tree-node-wrapper">
    <!-- 拖拽指示器：上方插入线 -->
    <div v-if="dropPosition === 'before'" class="drop-indicator drop-before"></div>

    <div
      class="tree-node"
      :class="{ 'is-dragging-over': dropPosition === 'inside' }"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div
        class="tree-node-row"
        :class="{
          'is-selected': noteStore.currentNoteId === node.id,
          'is-folder': node.type === 'folder',
          'is-note': node.type === 'note',
        }"
        :style="{ paddingLeft: `${depth * 16 + 8}px` }"
        draggable="true"
        @click="selectNode"
        @dragstart="onDragStart"
        @dragend="onDragEnd"
      >
        <!-- 展开/折叠按钮（仅文件夹） -->
        <button
          v-if="node.type === 'folder'"
          class="expand-btn"
          :class="{ 'is-expanded': expanded }"
          @click.stop="toggleExpand"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
        <span v-else class="expand-spacer"></span>

        <!-- 图标 -->
        <span class="node-icon">
          <svg v-if="node.type === 'folder'" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </span>

        <!-- 标题（双击重命名） -->
        <span
          v-if="!renaming"
          class="node-title"
          @dblclick.stop="startRename"
        >{{ node.title }}</span>
        <input
          v-else
          ref="renameInput"
          v-model="renameValue"
          class="rename-input input"
          @blur="commitRename"
          @keydown.enter="commitRename"
          @keydown.escape="cancelRename"
          @click.stop
        />

        <!-- 右键菜单按钮 -->
        <button class="node-menu btn btn-ghost btn-sm" @click.stop="menuOpen = !menuOpen">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
        <div v-if="menuOpen" class="node-dropdown card">
          <button @click="startRename(); menuOpen = false">重命名</button>
          <button v-if="node.type === 'note'" @click="noteStore.downloadNote(node.id); menuOpen = false">导出</button>
          <button class="danger" @click="noteStore.removeNode(node.id); menuOpen = false">删除</button>
        </div>
      </div>

      <!-- 子节点（仅文件夹展开） -->
      <div v-if="node.type === 'folder' && expanded" class="tree-children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
        />
        <!-- 空文件夹提示 -->
        <div v-if="node.children.length === 0" class="tree-empty-hint" :style="{ paddingLeft: `${(depth + 1) * 16 + 8}px` }">
          空文件夹
        </div>
      </div>
    </div>

    <!-- 拖拽指示器：下方插入线 -->
    <div v-if="dropPosition === 'after'" class="drop-indicator drop-after"></div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useNoteStore } from '../../stores/note.js'

const props = defineProps({ node: Object, depth: { type: Number, default: 0 } })
const noteStore = useNoteStore()

const expanded = ref(true)
const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref(null)
const menuOpen = ref(false)
const dropPosition = ref(null) // 'before' | 'after' | 'inside' | null

function toggleExpand() {
  expanded.value = !expanded.value
}

function selectNode() {
  if (props.node.type === 'folder') {
    // 点击文件夹：展开/折叠，不选中编辑器
    toggleExpand()
  } else {
    // 点击笔记：打开编辑器
    noteStore.selectNote(props.node.id)
  }
}

// 重命名
async function startRename() {
  renameValue.value = props.node.title
  renaming.value = true
  await nextTick()
  renameInput.value?.select()
}
async function commitRename() {
  if (renameValue.value.trim()) {
    await noteStore.renameNode(props.node.id, renameValue.value.trim())
  }
  renaming.value = false
}
function cancelRename() { renaming.value = false }

// 拖拽
function onDragStart(e) {
  e.dataTransfer.setData('text/plain', String(props.node.id))
  e.dataTransfer.effectAllowed = 'move'
  // 设置拖拽时的视觉效果
  const el = e.target.closest('.tree-node-row')
  if (el) el.classList.add('is-dragging')
}
function onDragEnd(e) {
  const el = e.target.closest('.tree-node-row')
  if (el) el.classList.remove('is-dragging')
  dropPosition.value = null
}
function onDragOver(e) {
  const draggedIdStr = e.dataTransfer.getData('text/plain')
  const draggedId = Number(draggedIdStr)
  if (draggedId === props.node.id) return

  e.preventDefault()
  e.stopPropagation()

  const rect = e.currentTarget.querySelector('.tree-node-row').getBoundingClientRect()
  const offsetY = e.clientY - rect.top
  const height = rect.height

  if (props.node.type === 'folder') {
    // 文件夹：上 25% before，下 25% after，中间 50% inside
    if (offsetY < height * 0.25) dropPosition.value = 'before'
    else if (offsetY > height * 0.75) dropPosition.value = 'after'
    else dropPosition.value = 'inside'
  } else {
    // 笔记：上半部分 before，下半部分 after
    dropPosition.value = offsetY < height / 2 ? 'before' : 'after'
  }
}
function onDragLeave(e) {
  // 只有真正离开整个 tree-node 时才清除
  const wrapper = e.currentTarget.closest('.tree-node-wrapper')
  if (!wrapper.contains(e.relatedTarget)) {
    dropPosition.value = null
  }
}
async function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()

  const draggedId = Number(e.dataTransfer.getData('text/plain'))
  const position = dropPosition.value
  dropPosition.value = null

  if (!draggedId || draggedId === props.node.id) return

  if (position === 'inside' && props.node.type === 'folder') {
    await noteStore.moveNode(draggedId, props.node.id)
  } else if (position === 'before' || position === 'after') {
    await noteStore.reorderNode(draggedId, props.node.id, position)
  }
}
</script>

<style scoped>
.tree-node-wrapper { position: relative; }
.tree-node { }

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background 0.1s;
  margin: 1px 4px;
}

/* 笔记默认样式 */
.tree-node-row.is-note {
  color: var(--text-secondary);
}
.tree-node-row.is-note:hover {
  background: var(--bg-surface-raised);
}
.tree-node-row.is-note.is-selected {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

/* 文件夹样式：更突出 */
.tree-node-row.is-folder {
  color: var(--text-primary);
  font-weight: 500;
}
.tree-node-row.is-folder:hover {
  background: var(--bg-surface-raised);
}
.tree-node-row.is-folder.is-selected {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

/* 拖拽时 */
.tree-node-row.is-dragging {
  opacity: 0.5;
}

/* 拖拽到文件夹上时高亮 */
.tree-node.is-dragging-over > .tree-node-row.is-folder {
  background: var(--accent-soft);
  outline: 2px dashed var(--accent-primary);
  outline-offset: -2px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  transition: background 0.15s, transform 0.15s;
}
.expand-btn:hover {
  background: var(--bg-surface-hover);
}
.expand-btn svg {
  transition: transform 0.15s ease;
}
.expand-btn.is-expanded svg {
  transform: rotate(90deg);
}
.expand-spacer { width: 18px; flex-shrink: 0; }

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
}
.node-icon svg { flex-shrink: 0; }

/* 文件夹图标颜色 */
.tree-node-row.is-folder .node-icon {
  color: var(--accent-primary);
}
/* 笔记图标颜色 */
.tree-node-row.is-note .node-icon {
  color: var(--text-muted);
}

.node-title {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.rename-input {
  flex: 1;
  font-size: 0.875rem;
  padding: 2px 6px;
}
.node-menu {
  opacity: 0;
  transition: opacity 0.1s;
  flex-shrink: 0;
}
.tree-node-row:hover .node-menu { opacity: 1; }
.node-dropdown {
  position: absolute;
  right: 8px;
  top: calc(100% + 2px);
  z-index: 50;
  min-width: 100px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.node-dropdown button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  text-align: left;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-primary);
}
.node-dropdown button:hover { background: var(--bg-surface-raised); }
.node-dropdown button.danger { color: var(--error); }

.tree-children { padding: 1px 0; }
.tree-empty-hint {
  padding: 4px 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  user-select: none;
}

/* 拖拽指示器 */
.drop-indicator {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--accent-primary);
  border-radius: 1px;
  z-index: 10;
  pointer-events: none;
}
.drop-before {
  top: -1px;
}
.drop-after {
  bottom: -1px;
}
</style>
