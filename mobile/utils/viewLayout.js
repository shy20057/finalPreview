// Browser-view compatibility for older Android System WebViews (renderjs only).
export function installViewLayout(root) {
  if (!root || root.__fpLayoutInstalled) return
  root.__fpLayoutInstalled = true
  document.documentElement.style.setProperty('font-size', '16px', 'important')
  if (!document.getElementById('fp-view-compat')) {
    const sheet = document.createElement('style')
    sheet.id = 'fp-view-compat'
    sheet.textContent = '.app-icon{display:inline-block!important;flex-shrink:0;vertical-align:middle}.app-icon>svg{width:100%;height:100%;display:block}.fp-gap-measuring *{transition:none!important}.fp-gap-left{margin-left:calc(var(--fp-gap-margin) + var(--fp-gap-size))!important}.fp-gap-top{margin-top:calc(var(--fp-gap-margin) + var(--fp-gap-size))!important}.fp-gap-right{margin-right:calc(var(--fp-gap-right-margin) + var(--fp-gap-size))!important}'
    document.head.appendChild(sheet)
  }
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;left:-9999px;display:flex;flex-direction:column;row-gap:1px'
  probe.innerHTML = '<div style="height:1px"></div><div style="height:1px"></div>'
  document.body.appendChild(probe)
  const nativeGap = probe.offsetHeight === 3
  probe.remove()
  let scheduled = false
  function update() {
    scheduled = false
    document.documentElement.style.setProperty('font-size', '16px', 'important')
    if (nativeGap || !root.isConnected) return
    root.classList.add('fp-gap-measuring')
    const elements = [root, ...root.querySelectorAll('*')].filter(e => e instanceof HTMLElement)
    elements.forEach(e => e.classList.remove('fp-gap-left', 'fp-gap-top', 'fp-gap-right'))
    for (const parent of elements) {
      const style = getComputedStyle(parent)
      if (!['flex', 'inline-flex'].includes(style.display)) continue
      const column = style.flexDirection.startsWith('column')
      const gap = parseFloat(column ? style.rowGap : style.columnGap)
      if (!gap) continue
      const children = [...parent.children].filter(e => getComputedStyle(e).display !== 'none')
      children.forEach((child, index) => {
        const css = getComputedStyle(child)
        const beforeText = !column && child.previousSibling?.nodeType === 3 && child.previousSibling.textContent.trim()
        const afterText = !column && child.nextSibling?.nodeType === 3 && child.nextSibling.textContent.trim()
        if (index || beforeText) {
          child.style.setProperty('--fp-gap-margin', column ? css.marginTop : css.marginLeft)
          child.style.setProperty('--fp-gap-size', `${gap}px`)
          child.classList.add(column ? 'fp-gap-top' : 'fp-gap-left')
        }
        if (afterText) {
          child.style.setProperty('--fp-gap-right-margin', css.marginRight)
          child.style.setProperty('--fp-gap-size', `${gap}px`)
          child.classList.add('fp-gap-right')
        }
      })
    }
    void root.offsetHeight
    root.classList.remove('fp-gap-measuring')
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update) } }
  const observer = new MutationObserver(schedule)
  observer.observe(root, { childList: true, subtree: true })
  window.addEventListener('resize', schedule)
  document.fonts?.ready.then(schedule)
  update()
}
