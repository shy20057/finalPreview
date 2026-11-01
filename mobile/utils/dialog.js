export function confirmAction(content, title = '确认操作') {
  return new Promise(resolve => uni.showModal({ title, content, success: r => resolve(!!r.confirm), fail: () => resolve(false) }))
}
export function showError(error, title = '操作失败') {
  uni.showModal({ title, content: error?.message || String(error), showCancel: false })
}
export function promptText(title, value = '') {
  return new Promise(resolve => uni.showModal({
    title, editable: true, content: value, placeholderText: value,
    success: r => resolve(r.confirm ? (r.content || '').trim() : null), fail: () => resolve(null),
  }))
}
