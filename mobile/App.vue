<!-- mobile/App.vue — uni-app 应用入口（全局样式 + 启动逻辑） -->
<script>
import { useAppStore } from './stores/app.js'
import { useAuthStore } from './stores/auth.js'

export default {
  onLaunch() {
    // 原版在 App.vue 的 onMounted 里做同样的事
  },
  async onShow() {
    const authStore = useAuthStore()
    await authStore.init()
    if (authStore.isLoggedIn) {
      const appStore = useAppStore()
      await appStore.fetchAiConfigs().catch(() => {})
    }
  },
}
</script>

<style>
@import './styles/fonts.css';
@import './styles/web-elements.css';
@import './styles/app.css';
</style>
