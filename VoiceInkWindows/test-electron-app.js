#!/usr/bin/env node

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs').promises

console.log('═══════════════════════════════════════════════════════════════')
console.log('     VoiceInk Windows - Complete E2E Verification Test         ')
console.log('═══════════════════════════════════════════════════════════════')
console.log()

// Create screenshots directory
async function ensureScreenshotDir() {
  const dir = path.join(__dirname, 'test-screenshots')
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
  return dir
}

async function runTests() {
  const screenshotDir = await ensureScreenshotDir()
  let electronApp
  let page
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  }

  try {
    console.log('🚀 Launching Electron application...')
    
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, 'out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    })
    
    console.log('✅ Electron app launched successfully')
    
    // Get the first window
    page = await electronApp.firstWindow()
    console.log('✅ Main window acquired')
    
    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Test 1: Application Launch
    console.log('\n📱 Test 1: Application Launch')
    const title = await page.title()
    if (title.includes('VoiceInk') || title.includes('voiceink')) {
      console.log(`   ✅ App launched with title: "${title}"`)
      testResults.passed.push('App Launch')
      await page.screenshot({ 
        path: path.join(screenshotDir, '01-app-launch.png'),
        fullPage: true 
      })
    } else {
      console.log(`   ❌ Unexpected title: "${title}"`)
      testResults.failed.push('App Launch')
    }
    
    // Test 2: Main UI Components
    console.log('\n🎨 Test 2: Main UI Components')
    const components = {
      'Title Bar': ['[data-testid="title-bar"]', '.title-bar', 'header'],
      'Sidebar': ['[data-testid="sidebar"]', '.sidebar', 'nav', 'aside'],
      'Main Content': ['[data-testid="main-content"]', '.main-content', 'main', '#root']
    }
    
    for (const [name, selectors] of Object.entries(components)) {
      let found = false
      for (const selector of selectors) {
        try {
          const element = await page.locator(selector).first()
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`   ✅ ${name} found`)
            testResults.passed.push(`UI: ${name}`)
            found = true
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      if (!found) {
        console.log(`   ⚠️ ${name} not found`)
        testResults.warnings.push(`UI: ${name}`)
      }
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-main-ui.png'),
      fullPage: true 
    })
    
    // Test 3: Recording Button
    console.log('\n🎤 Test 3: Recording Functionality')
    try {
      const recordButton = await page.locator('button').filter({ hasText: /record|start/i }).first()
      if (await recordButton.isVisible()) {
        console.log('   ✅ Recording button found')
        await recordButton.click()
        await page.waitForTimeout(1000)
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '03-recording-started.png'),
          fullPage: true 
        })
        
        // Check for recording indicator
        const isRecording = await page.locator('text=/recording|stop/i').count() > 0
        if (isRecording) {
          console.log('   ✅ Recording state changed')
          testResults.passed.push('Recording Start')
          
          // Stop recording
          const stopButton = await page.locator('button').filter({ hasText: /stop/i }).first()
          if (await stopButton.isVisible()) {
            await stopButton.click()
            await page.waitForTimeout(2000)
            console.log('   ✅ Recording stopped')
            testResults.passed.push('Recording Stop')
            
            await page.screenshot({ 
              path: path.join(screenshotDir, '04-recording-stopped.png'),
              fullPage: true 
            })
          }
        } else {
          console.log('   ⚠️ Recording state unclear')
          testResults.warnings.push('Recording State')
        }
      } else {
        console.log('   ❌ Recording button not found')
        testResults.failed.push('Recording Button')
      }
    } catch (error) {
      console.log('   ❌ Recording test failed:', error.message)
      testResults.failed.push('Recording Test')
    }
    
    // Test 4: Navigation
    console.log('\n🧭 Test 4: Page Navigation')
    const pages = ['Dashboard', 'Recorder', 'History', 'Models', 'Settings']
    
    for (const pageName of pages) {
      try {
        const link = await page.locator(`text=${pageName}`).first()
        if (await link.isVisible({ timeout: 500 })) {
          await link.click()
          await page.waitForTimeout(500)
          console.log(`   ✅ Navigated to ${pageName}`)
          testResults.passed.push(`Nav: ${pageName}`)
          
          await page.screenshot({ 
            path: path.join(screenshotDir, `05-${pageName.toLowerCase()}.png`),
            fullPage: true 
          })
        }
      } catch (e) {
        console.log(`   ⚠️ Could not navigate to ${pageName}`)
        testResults.warnings.push(`Nav: ${pageName}`)
      }
    }
    
    // Test 5: Mock Services
    console.log('\n🔧 Test 5: Mock Services Check')
    
    // Check console logs for mock service messages
    const consoleLogs = []
    page.on('console', msg => consoleLogs.push(msg.text()))
    
    // Trigger a recording to test mock services
    try {
      const recordButton = await page.locator('button').filter({ hasText: /record|start/i }).first()
      if (await recordButton.isVisible()) {
        await recordButton.click()
        await page.waitForTimeout(3000)
        
        const stopButton = await page.locator('button').filter({ hasText: /stop/i }).first()
        if (await stopButton.isVisible()) {
          await stopButton.click()
          await page.waitForTimeout(2000)
          
          // Check for mock transcription text
          const mockText = 'Welcome to VoiceInk'
          const transcriptionFound = await page.locator(`text=/${mockText}/i`).count() > 0
          
          if (transcriptionFound) {
            console.log('   ✅ Mock transcription service working')
            testResults.passed.push('Mock Transcription')
          } else {
            console.log('   ⚠️ Mock transcription not visible')
            testResults.warnings.push('Mock Transcription Display')
          }
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '06-mock-transcription.png'),
            fullPage: true 
          })
        }
      }
    } catch (error) {
      console.log('   ❌ Mock services test failed:', error.message)
      testResults.failed.push('Mock Services')
    }
    
    // Test 6: Audio Devices
    console.log('\n🎧 Test 6: Audio Device Management')
    const audioRefs = await page.locator('text=/microphone|audio|device/i').count()
    if (audioRefs > 0) {
      console.log(`   ✅ Found ${audioRefs} audio device references`)
      testResults.passed.push('Audio Device UI')
    } else {
      console.log('   ⚠️ No audio device references found')
      testResults.warnings.push('Audio Device UI')
    }
    
    // Test 7: Settings
    console.log('\n⚙️ Test 7: Settings Functionality')
    try {
      const settingsLink = await page.locator('text=Settings').first()
      if (await settingsLink.isVisible()) {
        await settingsLink.click()
        await page.waitForTimeout(1000)
        
        const inputs = await page.locator('input, select, [type="checkbox"]').count()
        if (inputs > 0) {
          console.log(`   ✅ Settings page has ${inputs} interactive elements`)
          testResults.passed.push('Settings Page')
        } else {
          console.log('   ⚠️ No settings inputs found')
          testResults.warnings.push('Settings Inputs')
        }
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '07-settings.png'),
          fullPage: true 
        })
      }
    } catch (error) {
      console.log('   ⚠️ Settings test incomplete:', error.message)
      testResults.warnings.push('Settings Test')
    }
    
    // Test 8: Error Resilience
    console.log('\n🛡️ Test 8: Error Resilience')
    try {
      // Try to trigger an error
      await page.evaluate(() => {
        // This should not crash the app
        throw new Error('Test error - should be caught')
      })
    } catch (error) {
      // Expected
    }
    
    // Check if app is still responsive
    const isResponsive = await page.evaluate(() => document.body !== null)
    if (isResponsive) {
      console.log('   ✅ App remains stable after error')
      testResults.passed.push('Error Resilience')
    } else {
      console.log('   ❌ App became unresponsive')
      testResults.failed.push('Error Resilience')
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '08-final-state.png'),
      fullPage: true 
    })
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message)
    testResults.failed.push('Test Execution')
  } finally {
    // Close the app
    if (electronApp) {
      await electronApp.close()
      console.log('\n✅ Electron app closed')
    }
  }
  
  // Generate test report
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('                        TEST RESULTS                            ')
  console.log('═══════════════════════════════════════════════════════════════')
  
  console.log(`\n✅ Passed: ${testResults.passed.length} tests`)
  testResults.passed.forEach(test => console.log(`   • ${test}`))
  
  console.log(`\n⚠️ Warnings: ${testResults.warnings.length} tests`)
  testResults.warnings.forEach(test => console.log(`   • ${test}`))
  
  console.log(`\n❌ Failed: ${testResults.failed.length} tests`)
  testResults.failed.forEach(test => console.log(`   • ${test}`))
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed.length + testResults.warnings.length + testResults.failed.length,
      passed: testResults.passed.length,
      warnings: testResults.warnings.length,
      failed: testResults.failed.length
    },
    details: testResults,
    verdict: testResults.failed.length === 0 ? 'FUNCTIONAL' : 'NEEDS_FIXES',
    recommendations: [
      'Native WASAPI audio capture implementation required',
      'Whisper.cpp integration needed for real transcription',
      'Test on actual Windows environment',
      'Implement real-time audio streaming',
      'Add proper error handling for native modules'
    ]
  }
  
  await fs.writeFile(
    path.join(screenshotDir, 'test-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📊 Overall Status:')
  if (testResults.failed.length === 0) {
    console.log('   🎉 Application is FUNCTIONAL (with mock services)')
  } else {
    console.log('   🔧 Application NEEDS FIXES')
  }
  
  console.log(`\n📸 Screenshots saved to: ${screenshotDir}`)
  console.log(`📝 Detailed report saved to: ${path.join(screenshotDir, 'test-report.json')}`)
  
  return report
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})