/**
 * Create basic icon files for VoiceInk Windows
 * This script creates simple PNG icons for the system tray and app icon
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function createIcon(size, text, filename) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // Background
  ctx.fillStyle = '#2563eb' // Blue background
  ctx.fillRect(0, 0, size, size)
  
  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(__dirname, filename), buffer)
  console.log(`Created ${filename} (${size}x${size})`)
}

// Create icons only if canvas module is available
try {
  // Create tray icon (16x16)
  createIcon(16, 'V', 'tray.png')
  
  // Create app icon (32x32)
  createIcon(32, 'VI', 'icon.png')
  
  // Create larger app icon for ICO format
  createIcon(256, 'VI', 'icon-256.png')
  
  console.log('Icons created successfully!')
} catch (err) {
  console.log('Canvas module not available, creating placeholder icons...')
  
  // Create placeholder files that Windows can still use
  const placeholders = ['tray.png', 'icon.png', 'icon.ico']
  placeholders.forEach(filename => {
    fs.writeFileSync(path.join(__dirname, filename), Buffer.alloc(0))
    console.log(`Created placeholder ${filename}`)
  })
}