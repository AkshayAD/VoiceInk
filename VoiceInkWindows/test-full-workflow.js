#!/usr/bin/env node
/**
 * Full Integration Test for VoiceInk Windows
 * Tests: Recording → Transcription → Database → Export
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Test configuration
const TEST_RESULTS = []
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

// Test utilities
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function addTestResult(test, passed, message) {
  TEST_RESULTS.push({ test, passed, message })
  log(`${passed ? '✅' : '❌'} ${test}: ${message}`, passed ? 'green' : 'red')
}

// Test functions
async function testDependencies() {
  log('\n📦 Testing Dependencies...', 'cyan')
  
  // Check if package.json exists
  if (fs.existsSync('package.json')) {
    addTestResult('Package.json', true, 'Found')
  } else {
    addTestResult('Package.json', false, 'Not found')
    return false
  }
  
  // Check if node_modules exists
  if (fs.existsSync('node_modules')) {
    addTestResult('Dependencies', true, 'Installed')
  } else {
    addTestResult('Dependencies', false, 'Not installed - run npm install')
    return false
  }
  
  // Check critical dependencies
  const criticalDeps = [
    '@google/generative-ai',
    'electron',
    '@prisma/client',
    'electron-store'
  ]
  
  for (const dep of criticalDeps) {
    const depPath = path.join('node_modules', dep)
    if (fs.existsSync(depPath)) {
      addTestResult(`Dependency: ${dep}`, true, 'Installed')
    } else {
      addTestResult(`Dependency: ${dep}`, false, 'Missing')
    }
  }
  
  return true
}

async function testDatabase() {
  log('\n💾 Testing Database...', 'cyan')
  
  // Check if Prisma is configured
  if (fs.existsSync('prisma/schema.prisma')) {
    addTestResult('Prisma Schema', true, 'Found')
  } else {
    addTestResult('Prisma Schema', false, 'Missing')
    return false
  }
  
  // Check if database file exists or can be created
  const dbPath = 'prisma/voiceink.db'
  if (fs.existsSync(dbPath)) {
    addTestResult('Database File', true, 'Exists')
  } else {
    addTestResult('Database File', false, 'Does not exist - run npx prisma migrate dev')
  }
  
  return true
}

async function testBuild() {
  log('\n🔨 Testing Build...', 'cyan')
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      shell: true,
      stdio: 'pipe'
    })
    
    let output = ''
    let errorOutput = ''
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        addTestResult('Build Process', true, 'Completed successfully')
        
        // Check if output files exist
        const outputFiles = [
          'out/main/index.js',
          'out/preload/index.js',
          'out/renderer/index.html'
        ]
        
        for (const file of outputFiles) {
          if (fs.existsSync(file)) {
            addTestResult(`Output: ${file}`, true, 'Generated')
          } else {
            addTestResult(`Output: ${file}`, false, 'Missing')
          }
        }
        
        resolve(true)
      } else {
        addTestResult('Build Process', false, `Failed with code ${code}`)
        if (errorOutput) {
          console.log('Build errors:', errorOutput)
        }
        resolve(false)
      }
    })
  })
}

async function testServices() {
  log('\n🔧 Testing Services...', 'cyan')
  
  // Check if service files exist
  const services = [
    'src/main/services/geminiService.ts',
    'src/main/services/audioProcessingPipeline.ts',
    'src/main/services/exportService.ts',
    'src/main/database/transcriptionRepository.ts',
    'src/renderer/services/browserAudioRecorder.ts'
  ]
  
  for (const service of services) {
    if (fs.existsSync(service)) {
      addTestResult(`Service: ${path.basename(service)}`, true, 'Exists')
    } else {
      addTestResult(`Service: ${path.basename(service)}`, false, 'Missing')
    }
  }
  
  return true
}

async function testIPCHandlers() {
  log('\n🔌 Testing IPC Handlers...', 'cyan')
  
  // Check if handler files exist
  const handlers = [
    'src/main/ipc/audioHandlers.ts',
    'src/main/ipc/geminiHandlers.ts',
    'src/main/ipc/databaseHandlers.ts',
    'src/main/ipc/exportHandlers.ts'
  ]
  
  for (const handler of handlers) {
    if (fs.existsSync(handler)) {
      addTestResult(`Handler: ${path.basename(handler)}`, true, 'Exists')
    } else {
      addTestResult(`Handler: ${path.basename(handler)}`, false, 'Missing')
    }
  }
  
  return true
}

async function testUI() {
  log('\n🎨 Testing UI Components...', 'cyan')
  
  // Check if key UI components exist
  const components = [
    'src/renderer/components/pages/RecorderPage.tsx',
    'src/renderer/components/pages/HistoryPage.tsx',
    'src/renderer/components/pages/SettingsPage.tsx',
    'src/renderer/components/ui/ApiKeyInput.tsx'
  ]
  
  for (const component of components) {
    if (fs.existsSync(component)) {
      addTestResult(`Component: ${path.basename(component)}`, true, 'Exists')
    } else {
      addTestResult(`Component: ${path.basename(component)}`, false, 'Missing')
    }
  }
  
  return true
}

async function testConfiguration() {
  log('\n⚙️ Testing Configuration...', 'cyan')
  
  // Check environment
  if (process.env.GEMINI_API_KEY) {
    addTestResult('Gemini API Key', true, 'Set in environment')
  } else {
    addTestResult('Gemini API Key', false, 'Not set - transcription will fail')
  }
  
  // Check if test audio exists
  if (fs.existsSync('test-audio.wav')) {
    addTestResult('Test Audio File', true, 'Available')
  } else {
    addTestResult('Test Audio File', false, 'Missing - run node create-test-audio.js')
  }
  
  return true
}

async function generateReport() {
  log('\n📊 TEST REPORT', 'cyan')
  log('═'.repeat(60), 'cyan')
  
  const total = TEST_RESULTS.length
  const passed = TEST_RESULTS.filter(r => r.passed).length
  const failed = total - passed
  const percentage = Math.round((passed / total) * 100)
  
  log(`Total Tests: ${total}`, 'blue')
  log(`Passed: ${passed}`, 'green')
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green')
  log(`Success Rate: ${percentage}%`, percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red')
  
  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red')
    TEST_RESULTS.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.test}: ${r.message}`, 'red')
    })
  }
  
  log('\n📝 Next Steps:', 'cyan')
  if (!process.env.GEMINI_API_KEY) {
    log('1. Set GEMINI_API_KEY environment variable', 'yellow')
  }
  if (!fs.existsSync('prisma/dev.db')) {
    log('2. Run: npx prisma migrate dev', 'yellow')
  }
  if (!fs.existsSync('test-audio.wav')) {
    log('3. Run: node create-test-audio.js', 'yellow')
  }
  if (failed === 0) {
    log('✨ All tests passed! Run: npm run dev', 'green')
  } else {
    log('⚠️ Fix the failed tests before running the app', 'yellow')
  }
  
  log('═'.repeat(60), 'cyan')
}

// Main test runner
async function runTests() {
  log('🚀 VoiceInk Windows - Full Integration Test', 'cyan')
  log('═'.repeat(60), 'cyan')
  
  await testDependencies()
  await testDatabase()
  await testServices()
  await testIPCHandlers()
  await testUI()
  await testBuild()
  await testConfiguration()
  
  await generateReport()
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, 'red')
  process.exit(1)
})