import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // 为不同类型的文件使用不同的命名策略
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: (chunkInfo) => {
          // 避免以下划线开头的文件名
          const name = chunkInfo.name?.startsWith('_') ? chunkInfo.name.substring(1) : chunkInfo.name
          return `assets/${name}-[hash].js`
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
    minify: false, // 开发时不压缩，便于调试
    rollupOptions: {
      ...this.rollupOptions,
      output: {
        ...this.rollupOptions?.output,
        format: 'es',
        // 为 service worker 生成单独的文件，不使用动态导入
        manualChunks: (id) => {
          if (id.includes('background')) {
            return 'background'
          }
          if (id.includes('content')) {
            return 'content'
          }
          return undefined
        }
      }
    }
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
