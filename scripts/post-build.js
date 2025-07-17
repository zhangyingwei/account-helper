import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 构建后处理脚本
// 删除Chrome扩展不允许的以下划线开头的文件

const distDir = path.resolve(__dirname, '../dist')

function removeUnderscoreFiles(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      removeUnderscoreFiles(filePath)
    } else if (file.startsWith('_')) {
      console.log(`Removing file: ${filePath}`)
      fs.unlinkSync(filePath)
    }
  })
}

console.log('Running post-build cleanup...')

// 首先处理JS文件中的导入引用
function fixJsImports(dir) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      fixJsImports(filePath)
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8')

      // 检查是否包含对_plugin-vue_export-helper.js的导入
      if (content.includes('_plugin-vue_export-helper.js')) {
        console.log(`Fixing imports in: ${filePath}`)

        // 创建一个简单的Vue导出助手内联版本
        const inlineHelper = `const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};`

        // 更精确的正则表达式来匹配导入语句
        const importRegex = /import\{[^}]+\}from"[^"]*_plugin-vue_export-helper\.js";/

        if (importRegex.test(content)) {
          // 替换导入语句为内联代码
          content = content.replace(importRegex, inlineHelper)

          // 替换所有对导出助手的引用 (通常是 _ as O 或类似的)
          content = content.replace(/_\s*as\s*(\w+)/g, '_export_sfc as $1')
          content = content.replace(/(\w+)\(([^,]+),\[\["__scopeId"/g, '_export_sfc($2,[["__scopeId"')

          fs.writeFileSync(filePath, content)
          console.log(`Successfully fixed imports in: ${filePath}`)
        }
      }
    }
  })
}

fixJsImports(distDir)
removeUnderscoreFiles(distDir)

// 移动HTML文件到正确位置
const popupHtml = path.join(distDir, 'src/popup/index.html')
const optionsHtml = path.join(distDir, 'src/options/index.html')
const popupTarget = path.join(distDir, 'popup.html')
const optionsTarget = path.join(distDir, 'options.html')

function fixHtmlReferences(htmlPath) {
  if (fs.existsSync(htmlPath)) {
    let content = fs.readFileSync(htmlPath, 'utf8')

    // 移除对已删除文件的引用
    content = content.replace(/<link[^>]*_plugin-vue_export-helper\.js[^>]*>/g, '')

    // 修复绝对路径为相对路径
    content = content.replace(/src="\/([^"]+)"/g, 'src="./$1"')
    content = content.replace(/href="\/([^"]+)"/g, 'href="./$1"')

    fs.writeFileSync(htmlPath, content)
  }
}

if (fs.existsSync(popupHtml)) {
  console.log('Moving popup.html to root directory...')
  fs.copyFileSync(popupHtml, popupTarget)
  fixHtmlReferences(popupTarget)
}

if (fs.existsSync(optionsHtml)) {
  console.log('Moving options.html to root directory...')
  fs.copyFileSync(optionsHtml, optionsTarget)
  fixHtmlReferences(optionsTarget)
}

// 删除src目录
const srcDir = path.join(distDir, 'src')
if (fs.existsSync(srcDir)) {
  console.log('Removing src directory...')
  fs.rmSync(srcDir, { recursive: true, force: true })
}

console.log('Post-build cleanup completed!')
