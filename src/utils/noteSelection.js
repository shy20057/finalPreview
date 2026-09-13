export function toggleVisibleSelection(selectedIds, visibleIds) {
  const next = new Set(selectedIds)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => next.has(id))

  for (const id of visibleIds) {
    if (allVisibleSelected) next.delete(id)
    else next.add(id)
  }

  return next
}
