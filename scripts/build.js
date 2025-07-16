import { build } from 'vite'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, readFileSync, writeFileSync } from 'fs'

async function buildExtension() {
  console.log('🚀 Building Chrome Extension...')

  try {
    // 构建项目
    await build()

    // 移动 HTML 文件到根目录
    console.log('📄 Moving HTML files...')
    moveHtmlFiles()

    // 重命名以下划线开头的文件
    console.log('🔧 Fixing underscore filenames...')
    fixUnderscoreFilenames()

    // 修复 HTML 文件中的资源路径
    console.log('🔗 Fixing HTML resource paths...')
    fixHtmlPaths()

    // 复制 manifest.json 到 dist 目录
    console.log('📋 Copying manifest.json...')
    copyFileSync(
      resolve(process.cwd(), 'public/manifest.json'),
      resolve(process.cwd(), 'dist/manifest.json')
    )

    // 复制 content.css 到 dist 目录
    console.log('🎨 Copying content.css...')
    copyFileSync(
      resolve(process.cwd(), 'public/content.css'),
      resolve(process.cwd(), 'dist/content.css')
    )
    
    // 复制图标文件夹（如果存在）
    const iconsDir = resolve(process.cwd(), 'public/icons')
    const distIconsDir = resolve(process.cwd(), 'dist/icons')

    if (existsSync(iconsDir)) {
      console.log('🖼️ Copying icons...')
      if (!existsSync(distIconsDir)) {
        mkdirSync(distIconsDir, { recursive: true })
      }

      // 复制图标文件
      const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png']
      iconFiles.forEach(iconFile => {
        const srcPath = resolve(iconsDir, iconFile)
        const destPath = resolve(distIconsDir, iconFile)
        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath)
        }
      })
    }
    
    console.log('✅ Build completed successfully!')
    console.log('📦 Extension files are ready in the dist/ directory')
    console.log('💡 You can now load the extension in Chrome by:')
    console.log('   1. Open Chrome and go to chrome://extensions/')
    console.log('   2. Enable "Developer mode"')
    console.log('   3. Click "Load unpacked" and select the dist/ folder')
    
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

function moveHtmlFiles() {
  const distDir = resolve(process.cwd(), 'dist')
  const srcDir = resolve(distDir, 'src')

  if (existsSync(srcDir)) {
    // 移动 popup/index.html 到 popup.html
    const popupHtml = resolve(srcDir, 'popup/index.html')
    if (existsSync(popupHtml)) {
      renameSync(popupHtml, resolve(distDir, 'popup.html'))
    }

    // 移动 options/index.html 到 options.html
    const optionsHtml = resolve(srcDir, 'options/index.html')
    if (existsSync(optionsHtml)) {
      renameSync(optionsHtml, resolve(distDir, 'options.html'))
    }

    // 清理空的 src 目录
    try {
      rmSync(srcDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略删除错误
    }
  }
}

function fixUnderscoreFilenames() {
  const distDir = resolve(process.cwd(), 'dist')

  if (existsSync(distDir)) {
    const files = readdirSync(distDir)

    files.forEach(filename => {
      if (filename.startsWith('_')) {
        const oldPath = resolve(distDir, filename)
        const newFilename = filename.substring(1) // 移除开头的下划线
        const newPath = resolve(distDir, newFilename)

        try {
          renameSync(oldPath, newPath)
          console.log(`   Renamed: ${filename} -> ${newFilename}`)
        } catch (error) {
          console.warn(`   Failed to rename ${filename}:`, error.message)
        }
      }
    })
  }
}

function fixHtmlPaths() {
  const distDir = resolve(process.cwd(), 'dist')
  const htmlFiles = ['popup.html', 'options.html']
  const jsFiles = ['popup.js', 'options.js', 'content.js']

  // 修复 HTML 文件中的路径
  htmlFiles.forEach(filename => {
    const filePath = resolve(distDir, filename)
    if (existsSync(filePath)) {
      try {
        let content = readFileSync(filePath, 'utf8')

        // 修复绝对路径为相对路径
        content = content.replace(/src="\/([^"]+)"/g, 'src="./$1"')
        content = content.replace(/href="\/([^"]+)"/g, 'href="./$1"')

        // 修复重命名后的文件引用
        content = content.replace(/_plugin-vue_export-helper\.js/g, 'plugin-vue_export-helper.js')

        writeFileSync(filePath, content, 'utf8')
        console.log(`   Fixed paths in: ${filename}`)
      } catch (error) {
        console.warn(`   Failed to fix paths in ${filename}:`, error.message)
      }
    }
  })

  // 修复 JS 文件中的导入路径
  jsFiles.forEach(filename => {
    const filePath = resolve(distDir, filename)
    if (existsSync(filePath)) {
      try {
        let content = readFileSync(filePath, 'utf8')

        // 修复重命名后的文件引用
        content = content.replace(/"\.\/_plugin-vue_export-helper\.js"/g, '"./plugin-vue_export-helper.js"')
        content = content.replace(/'\.\/_plugin-vue_export-helper\.js'/g, "'./plugin-vue_export-helper.js'")

        writeFileSync(filePath, content, 'utf8')
        console.log(`   Fixed imports in: ${filename}`)
      } catch (error) {
        console.warn(`   Failed to fix imports in ${filename}:`, error.message)
      }
    }
  })
}

function createPlaceholderIcons(iconsDir) {
  // 创建简单的 SVG 图标作为占位符
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#007bff">
    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 21H5V3H13V9H19Z"/>
  </svg>`

  // 这里应该生成实际的 PNG 图标文件
  // 由于这是一个简化版本，我们暂时跳过图标生成
  console.log('   ⚠️ Note: Please add actual icon files (icon16.png, icon48.png, icon128.png) to public/icons/')
}

buildExtension()
