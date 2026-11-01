import { reactive } from 'vue'
import { useNoteStore } from '../stores/note.js'
import { showError } from './dialog.js'

export const noteDrag = reactive({ sourceId: null, targetId: null, position: null, moved: false })
let rows = []
export function startNoteDrag(id) {
  noteDrag.sourceId = id
  noteDrag.moved = false
  uni.createSelectorQuery().selectAll('.tree-node-row').fields({ rect: true, size: true, dataset: true }, found => {
    rows = (found || []).filter(row => row.height > 0)
  }).exec()
}
export function moveNoteDrag(event) {
  if (noteDrag.sourceId === null) return
  const point = event.touches?.[0]
  if (!point) return
  const row = rows.find(r => point.clientY >= r.top && point.clientY <= r.bottom && point.clientX >= r.left && point.clientX <= r.right)
  if (!row) { noteDrag.targetId = null; return }
  const target = useNoteStore().nodes.find(n => String(n.id) === String(row.dataset.noteId))
  if (!target || target.id === noteDrag.sourceId) return
  noteDrag.targetId = target.id
  const ratio = (point.clientY - row.top) / row.height
  noteDrag.position = target.type === 'folder' && ratio >= .25 && ratio <= .75 ? 'inside' : ratio < .5 ? 'before' : 'after'
  noteDrag.moved = true
}
export async function finishNoteDrag() {
  const { sourceId, targetId, position } = noteDrag
  cancelNoteDrag()
  if (sourceId === null || targetId === null || sourceId === targetId) return
  try {
    const store = useNoteStore()
    if (position === 'inside') await store.moveNode(sourceId, targetId)
    else await store.reorderNode(sourceId, targetId, position)
  } catch (error) { showError(error, '移动失败') }
}
export function cancelNoteDrag() {
  noteDrag.sourceId = null
  noteDrag.targetId = null
  noteDrag.position = null
}
