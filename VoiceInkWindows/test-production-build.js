#!/usr/bin/env node
/**
 * Production Build Test
 * Verifies that the application is ready for production
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TESTS = []
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function test(name, fn) {
  try {
    const result = fn()
    TESTS.push({ name, passed: true })
    log(`✅ ${name}`, 'green')
    return result
  } catch (error) {
    TESTS.push({ name, passed: false, error: error.message })
    log(`❌ ${name}: ${error.message}`, 'red')
    return false
  }
}

// Test Suite
log('\n🚀 Production Build Verification\n', 'cyan')

// 1. Check dependencies
test('Dependencies installed', () => {
  if (!fs.existsSync('node_modules')) {
    throw new Error('node_modules not found')
  }
  return true
})

// 2. Check build configuration
test('Electron builder config exists', () => {
  if (!fs.existsSync('electron-builder.yml')) {
    throw new Error('electron-builder.yml not found')
  }
  return true
})

// 3. Test TypeScript compilation
test('TypeScript builds without errors', () => {
  try {
    execSync('npm run build', { stdio: 'pipe' })
    return true
  } catch (error) {
    throw new Error('Build failed')
  }
})

// 4. Check output files
test('Build outputs exist', () => {
  const outputs = [
    'out/main/index.js',
    'out/preload/index.js',
    'out/renderer/index.html'
  ]
  
  for (const output of outputs) {
    if (!fs.existsSync(output)) {
      throw new Error(`Missing: ${output}`)
    }
  }
  return true
})

// 5. Check database
test('Database configured', () => {
  if (!fs.existsSync('prisma/voiceink.db')) {
    throw new Error('Database not initialized')
  }
  return true
})

// 6. Check for production assets
test('Production assets ready', () => {
  const requiredFiles = [
    'package.json',
    'prisma/schema.prisma',
    'electron-builder.yml'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing: ${file}`)
    }
  }
  return true
})

// 7. Check package.json scripts
test('Build scripts configured', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredScripts = ['build', 'dist', 'dist:win']
  
  for (const script of requiredScripts) {
    if (!pkg.scripts[script]) {
      throw new Error(`Missing script: ${script}`)
    }
  }
  return true
})

// 8. Security check
test('No sensitive data in code', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  // Check for API keys in package.json
  const pkgString = JSON.stringify(pkg)
  if (pkgString.includes('sk-') || pkgString.includes('api_key')) {
    throw new Error('Potential API key found in package.json')
  }
  
  return true
})

// Generate report
log('\n📊 Build Verification Report\n', 'cyan')
const passed = TESTS.filter(t => t.passed).length
const failed = TESTS.filter(t => !t.passed).length
const percentage = Math.round((passed / TESTS.length) * 100)

log(`Total Tests: ${TESTS.length}`, 'blue')
log(`Passed: ${passed}`, 'green')
log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green')
log(`Success Rate: ${percentage}%\n`, percentage === 100 ? 'green' : 'yellow')

if (failed > 0) {
  log('Failed Tests:', 'red')
  TESTS.filter(t => !t.passed).forEach(t => {
    log(`  - ${t.name}: ${t.error}`, 'red')
  })
  log('\n')
}

// Production readiness
if (percentage === 100) {
  log('✨ Application is ready for production build!', 'green')
  log('\nTo build for production:', 'cyan')
  log('  Windows: npm run dist:win', 'blue')
  log('  macOS:   npm run dist:mac', 'blue')
  log('  Linux:   npm run dist:linux', 'blue')
  log('  All:     npm run dist:all', 'blue')
} else if (percentage >= 75) {
  log('⚠️ Application is mostly ready but needs fixes', 'yellow')
} else {
  log('❌ Application is not ready for production', 'red')
}

log('\n' + '='.repeat(60) + '\n', 'cyan')

process.exit(failed > 0 ? 1 : 0)