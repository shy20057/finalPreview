<template>
  <view class="tree-node-wrapper">
    <!-- 拖拽指示器：上方插入线 -->
    <view v-if="dropPosition === 'before'" class="drop-indicator drop-before"></view>

    <view
      class="tree-node"
      :class="{ 'is-dragging-over': dropPosition === 'inside' }"
    >
      <view
        class="tree-node-row"
        :class="{
          'is-selected': noteStore.currentNoteId === node.id,
          'is-folder': node.type === 'folder',
          'is-note': node.type === 'note',
        }"
        :style="{ paddingLeft: `${depth * 16 + 8}px` }"
        :data-note-id="node.id" @longpress.stop="startNoteDrag(node.id)" @touchmove.stop="moveNoteDrag" @touchend="finishDrag" @touchcancel="cancelNoteDrag"
        @click="selectNode"
      >
        <!-- 展开/折叠按钮（仅文件夹） -->
        <button
          v-if="node.type === 'folder'"
          class="web-button expand-btn"
          :class="{ 'is-expanded': expanded }"
          @click.stop="toggleExpand"
        >
          <AppIcon name="i63439ce0" :size="12" />
        </button>
        <text v-else class="expand-spacer"></text>

        <!-- 图标 -->
        <text class="node-icon">
          <AppIcon name="id975c911" :size="15" v-if="node.type === 'folder'" />
          <AppIcon name="i9aad0dd1" :size="14" v-else />
        </text>

        <!-- 标题（双击重命名） -->
        <text
          v-if="!renaming"
          class="node-title"
          @dblclick.stop="startRename"
        >{{ node.title }}</text>
        <input
          v-else
          ref="renameInput"
          v-model="renameValue"
          class="rename-input input" :focus="renaming"
          @blur="commitRename"
          @confirm="commitRename"
          @keydown.escape="cancelRename"
          @click.stop
        />

        <!-- 右键菜单按钮 -->
        <button class="web-button node-menu btn btn-ghost btn-sm" @click.stop="menuOpen = !menuOpen">
          <AppIcon name="ibff0d4f1" :size="12" />
        </button>
        <view v-if="menuOpen" class="node-dropdown card" @click.stop>
          <button @click="startRename(); menuOpen = false" class="web-button">重命名</button>
          <button v-if="node.type === 'note'" @click="exportCurrentNode" class="web-button">导出</button>
          <button class="web-button danger" @click="deleteCurrentNode">删除</button>
        </view>
      </view>

      <!-- 子节点（仅文件夹展开） -->
      <view v-if="node.type === 'folder' && expanded" class="tree-children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
        />
        <!-- 空文件夹提示 -->
        <view v-if="node.children.length === 0" class="tree-empty-hint" :style="{ paddingLeft: `${(depth + 1) * 16 + 8}px` }">
          空文件夹
        </view>
      </view>
    </view>

    <!-- 拖拽指示器：下方插入线 -->
    <view v-if="dropPosition === 'after'" class="drop-indicator drop-after"></view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { noteDrag, startNoteDrag, moveNoteDrag, finishNoteDrag, cancelNoteDrag } from '../../utils/noteDrag.js'
import { writeTextFile, shareFile } from '../../utils/fs.js'
import { confirmAction, showError } from '../../utils/dialog.js'
import { ref, nextTick } from 'vue'
import { useNoteStore } from '../../stores/note.js'

const props = defineProps({ node: Object, depth: { type: Number, default: 0 } })
const noteStore = useNoteStore()

const expanded = ref(true)
const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref(null)
const menuOpen = ref(false)
const dropPosition = computed(() => noteDrag.targetId === props.node.id ? noteDrag.position : null) // 'before' | 'after' | 'inside' | null

function toggleExpand() {
  expanded.value = !expanded.value
}

function selectNode() {
  if (wasDragging || noteDrag.sourceId !== null) return
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
  
}
async function commitRename() {
  if (!renaming.value) return
  const title = renameValue.value.trim()
  renaming.value = false
  try { if (title) await noteStore.renameNode(props.node.id, title) }
  catch (error) { showError(error, '重命名失败') }
}
function cancelRename() { renaming.value = false }

let wasDragging = false
async function finishDrag() {
  wasDragging = noteDrag.sourceId !== null
  await finishNoteDrag()
  setTimeout(() => { wasDragging = false }, 300)
}
async function exportCurrentNode() {
  menuOpen.value = false
  try {
    const result = await noteStore.downloadNote(props.node.id)
    const filePath = await writeTextFile(result.filename, result.content)
    await shareFile(filePath, '导出笔记')
  } catch (error) { if (error.message !== 'cancel') showError(error, '导出失败') }
}
async function deleteCurrentNode() {
  menuOpen.value = false
  if (!await confirmAction('确定删除该笔记或文件夹及其内容吗？')) return
  try { await noteStore.removeNode(props.node.id) } catch (error) { showError(error, '删除失败') }
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
.expand-btn .app-icon {
  transition: transform 0.15s ease;
}
.expand-btn.is-expanded .app-icon {
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
.node-icon .app-icon { flex-shrink: 0; }

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
.node-dropdown .web-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  text-align: left;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-primary);
}
.node-dropdown .web-button:hover { background: var(--bg-surface-raised); }
.node-dropdown .web-button.danger { color: var(--error); }

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
