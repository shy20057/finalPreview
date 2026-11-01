import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { useAuthStore } from '../stores/auth.js'
import { guardAuth, syncRoute } from '../utils/router.js'

/** Run page loading after route options and the account have been resolved.
 * Refresh revisited lists; quiz initialization opts out to preserve answers.
 */
export function onPageReady(load, { refresh = true } = {}) {
  let started = false
  let hidden = false
  let loading = false
  async function run(options) {
    if (loading) return
    loading = true
    try {
      syncRoute(options)
      const allowed = await guardAuth()
      if (allowed && useAuthStore().isLoggedIn) await load()
    } catch (error) {
      uni.showModal({ title: '加载失败', content: error?.message || '请检查网络后重试', showCancel: false })
    } finally {
      loading = false
    }
  }
  onLoad(options => { started = true; return run(options) })
  onHide(() => { hidden = true })
  onShow(() => {
    syncRoute()
    if (started && hidden && refresh) { hidden = false; return run() }
  })
}
