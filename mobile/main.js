import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { syncRoute, guardAuth, installRouteHooks } from './utils/router.js'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from './components/AppIcon.vue'
import RouteLink from './components/RouteLink.vue'
import HtmlContent from './components/HtmlContent.vue'
import ViewTransition from './components/ViewTransition.vue'

// uni-app 没有 vue-router，路由守卫以 mixin 的形式在页面显示时执行
export function createApp() {
  installRouteHooks({ onLoad, onShow })
  const app = createSSRApp(App)
  app.use(createPinia())
  app.component('AppIcon', AppIcon)
  app.component('RouteLink', RouteLink)
  app.component('HtmlContent', HtmlContent)
  app.component('ViewTransition', ViewTransition)

  app.mixin({
    async onShow() {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      if (!page) return
      syncRoute()
      await guardAuth()
    },
  })

  return { app }
}
