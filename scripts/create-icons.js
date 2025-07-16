import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

function createIcon(size, outputPath) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // 背景
  ctx.fillStyle = '#007bff'
  ctx.fillRect(0, 0, size, size)
  
  // 用户图标
  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'white'
  ctx.lineWidth = size * 0.05
  
  // 头部
  const centerX = size / 2
  const centerY = size / 2
  const headRadius = size * 0.15
  
  ctx.beginPath()
  ctx.arc(centerX, centerY - size * 0.1, headRadius, 0, 2 * Math.PI)
  ctx.fill()
  
  // 身体
  const bodyWidth = size * 0.4
  const bodyHeight = size * 0.25
  const bodyX = centerX - bodyWidth / 2
  const bodyY = centerY + size * 0.05
  
  ctx.beginPath()
  ctx.arc(centerX, bodyY + bodyHeight, bodyWidth / 2, Math.PI, 0)
  ctx.fill()
  
  // 保存为 PNG
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)
}

function createSimpleIcon(size, outputPath) {
  // 创建一个简单的 SVG 图标并转换为 PNG
  // 由于没有 canvas 库，我们创建一个简单的彩色方块
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#007bff"/>
      <circle cx="${size/2}" cy="${size/2 - size*0.1}" r="${size*0.15}" fill="white"/>
      <path d="M ${size*0.3} ${size*0.6} Q ${size/2} ${size*0.8} ${size*0.7} ${size*0.6} L ${size*0.7} ${size*0.9} L ${size*0.3} ${size*0.9} Z" fill="white"/>
    </svg>
  `
  
  // 这里应该将 SVG 转换为 PNG，但为了简化，我们先创建 SVG 文件
  writeFileSync(outputPath.replace('.png', '.svg'), canvas)
  
  // 创建一个简单的占位 PNG（实际上是文本文件）
  writeFileSync(outputPath, `PNG placeholder for ${size}x${size} icon`)
}

function main() {
  const iconsDir = resolve(process.cwd(), 'public/icons')
  
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }
  
  console.log('Creating placeholder icons...')
  
  // 创建占位图标
  createSimpleIcon(16, resolve(iconsDir, 'icon16.png'))
  createSimpleIcon(48, resolve(iconsDir, 'icon48.png'))
  createSimpleIcon(128, resolve(iconsDir, 'icon128.png'))
  
  console.log('✅ Placeholder icons created')
  console.log('⚠️ Note: These are placeholder files. Please replace with actual PNG icons.')
}

main()
