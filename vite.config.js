import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'sandbox-shared-resources',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/resources/')) {
            res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups')
          }
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/resources/')) {
            res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups')
          }
          next()
        })
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
