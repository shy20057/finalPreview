import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  loadNotesTree,
  createTreeNote,
  updateTreeNote,
  deleteTreeNote,
  reorderTreeNotes,
  exportNote,
  importNote,
} from '../utils/api.js'

export const useNoteStore = defineStore('notes', () => {
  // 扁平化节点列表
  const nodes = ref([])

  // 节点 Map，O(1) 查找
  const nodeMap = computed(() => {
    const m = new Map()
    for (const n of nodes.value) m.set(n.id, n)
    return m
  })

  // 当前选中的笔记 id
  const currentNoteId = ref(null)

  const currentNote = computed(() =>
    currentNoteId.value ? nodeMap.value.get(currentNoteId.value) ?? null : null
  )

  // 根节点
  const rootNodes = computed(() =>
    nodes.value
      .filter(n => n.parent_id === null)
      .sort((a, b) => a.sort_order - b.sort_order)
  )

  // 获取子节点
  function getChildren(parentId) {
    return nodes.value
      .filter(n => n.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  // 递归构建树（用于渲染）
  function buildTree(parentId) {
    return getChildren(parentId).map(n => ({
      ...n,
      children: n.type === 'folder' ? buildTree(n.id) : []
    }))
  }

  const tree = computed(() => buildTree(null))

  // 加载
  async function loadTree() {
    nodes.value = await loadNotesTree()
  }

  // 创建
  async function addNote({ parent_id = null, title = '未命名', type = 'note', content = '' } = {}) {
    const record = await createTreeNote({ parent_id, title, type, content })
    nodes.value.push(record)
    return record
  }

  // 更新内容（自动保存用）
  async function saveContent(id, content) {
    await updateTreeNote(id, { content })
    const n = nodeMap.value.get(id)
    if (n) n.content = content
  }

  // 更新标题
  async function renameNode(id, title) {
    await updateTreeNote(id, { title })
    const n = nodeMap.value.get(id)
    if (n) n.title = title
  }

  // 移动节点到新 parent
  async function moveNode(id, newParentId) {
    const maxOrder = nodes.value
      .filter(n => n.parent_id === (newParentId ?? null) && n.id !== id)
      .reduce((max, n) => Math.max(max, n.sort_order), -1)
    await updateTreeNote(id, { parent_id: newParentId, sort_order: maxOrder + 1 })
    await loadTree() // 重新加载以保证一致性
  }

  // 同级排序：将 id 节点移动到 targetId 节点的 before/after 位置
  async function reorderNode(id, targetId, position) {
    const target = nodeMap.value.get(targetId)
    if (!target) return
    const parentId = target.parent_id
    const siblings = nodes.value
      .filter(n => n.parent_id === parentId && n.id !== id)
      .sort((a, b) => a.sort_order - b.sort_order)

    const idx = siblings.findIndex(n => n.id === targetId)
    const insertIndex = position === 'before' ? idx : idx + 1

    // 移除被拖拽节点（如果已在列表中）
    const dragged = nodes.value.find(n => n.id === id)
    if (!dragged) return

    // 构建新的顺序数组
    const newOrder = [...siblings]
    newOrder.splice(insertIndex, 0, dragged)

    // 生成批量更新数据
    const orders = newOrder.map((n, i) => ({ id: n.id, sort_order: i }))
    await reorderTreeNotes(orders)

    // 如果被拖拽节点的父节点变了，单独更新 parent_id
    if (dragged.parent_id !== parentId) {
      await updateTreeNote(id, { parent_id: parentId })
    }

    // 同步更新本地状态
    for (const o of orders) {
      const n = nodeMap.value.get(o.id)
      if (n) {
        n.sort_order = o.sort_order
        n.parent_id = parentId
      }
    }
  }

  // 删除（级联）
  async function removeNode(id) {
    await deleteTreeNote(id)
    await loadTree()
    if (currentNoteId.value === id) currentNoteId.value = null
  }

  // 导出
  async function downloadNote(id) {
    return exportNote(id)
  }

  // 导入（到根目录）
  async function uploadNote(file) {
    const record = await importNote(file)
    nodes.value.push(record)
    return record
  }

  function selectNote(id) {
    currentNoteId.value = id
  }

  return {
    nodes, nodeMap, currentNoteId, currentNote,
    rootNodes, tree, getChildren,
    loadTree, addNote, saveContent, renameNode,
    moveNode, reorderNode, removeNode, downloadNote, uploadNote, selectNote,
  }
})