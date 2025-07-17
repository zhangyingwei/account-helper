import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // 禁用Vue的导出助手
      customElement: false,
      template: {
        compilerOptions: {
          hoistStatic: false,
          cacheHandlers: false
        }
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      external: (id) => {
        // 不要将Vue导出助手作为外部依赖
        return false
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // 为不同类型的文件使用不同的命名策略
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js'
          }
          // 处理以下划线开头的文件名
          let name = chunkInfo.name || 'entry'
          if (name.startsWith('_')) {
            name = name.substring(1)
          }
          if (name.includes('plugin-vue')) {
            name = 'vue-helper'
          }
          return `assets/${name}-[hash].js`
        },
        chunkFileNames: (chunkInfo) => {
          // 避免以下划线开头的文件名
          let name = chunkInfo.name || 'chunk'
          if (name.startsWith('_')) {
            name = name.substring(1)
          }
          // 特殊处理Vue插件文件
          if (name.includes('plugin-vue')) {
            name = 'vue-helper'
          }
          return `assets/${name}-[hash].js`
        },
        manualChunks: (id) => {
          // 将Vue相关的代码打包到一个不以下划线开头的chunk中
          if (id.includes('plugin-vue') || id.includes('vue/dist')) {
            return 'vue-helper'
          }
          // 强制内联Vue导出助手
          if (id.includes('_plugin-vue_export-helper')) {
            return undefined // 返回undefined会内联到主chunk中
          }
          return undefined
        },
        assetFileNames: (assetInfo) => {
          // CSS 文件直接放在根目录，不使用 hash
          if (assetInfo.name?.endsWith('.css')) {
            return '[name].[ext]'
          }
          // 避免以下划线开头的文件名
          const name = assetInfo.name?.startsWith('_') ? assetInfo.name.substring(1) : assetInfo.name
          return `assets/${name}-[hash].[ext]`
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    // 确保生成的代码兼容 Chrome 扩展环境
    target: 'es2020',
    minify: false // 开发时不压缩，便于调试
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 开发服务器配置
  server: {
    port: 3000,
    open: false
  }
})
