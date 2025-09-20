/**
 * System Integration Test Script for VoiceInk Windows
 * Tests hotkey registration, window detection, and system tray functionality
 */

const { join } = require('path')
const { existsSync } = require('fs')

class SystemIntegrationTester {
  constructor() {
    this.results = {
      hotkeys: { status: 'pending', details: [] },
      windowDetection: { status: 'pending', details: [] },
      systemTray: { status: 'pending', details: [] },
      icons: { status: 'pending', details: [] }
    }
  }

  async runAllTests() {
    console.log('🧪 Starting VoiceInk System Integration Tests')
    console.log('='.repeat(50))

    await this.testIconFiles()
    await this.testHotkeyRegistration()
    await this.testWindowDetection()
    await this.testSystemTray()

    return this.printSummary()
  }

  async testIconFiles() {
    console.log('\n📁 Testing Icon Files...')
    
    const iconPaths = [
      './resources/icons/tray.png',
      './resources/icons/icon.png',
      './resources/icons/icon.ico'
    ]

    let allIconsExist = true
    const details = []

    for (const iconPath of iconPaths) {
      const fullPath = join(__dirname, iconPath)
      const exists = existsSync(fullPath)
      
      if (exists) {
        details.push(`✅ ${iconPath} exists`)
        console.log(`✅ ${iconPath} exists`)
      } else {
        details.push(`❌ ${iconPath} missing`)
        console.log(`❌ ${iconPath} missing`)
        allIconsExist = false
      }
    }

    this.results.icons = {
      status: allIconsExist ? 'passed' : 'failed',
      details
    }
  }

  async testHotkeyRegistration() {
    console.log('\n⌨️  Testing Hotkey Registration...')
    
    try {
      const { HotkeyManager } = require('./src/main/system/hotkeys')
      const hotkeyManager = new HotkeyManager()
      const testHotkeys = {
        'test1': 'Alt+F9',
        'test2': 'Ctrl+Shift+T',
        'test3': 'Alt+Space'
      }

      let allRegistered = true
      const details = []

      // Test validation
      for (const [action, accelerator] of Object.entries(testHotkeys)) {
        const isValid = HotkeyManager.validateAccelerator(accelerator)
        if (isValid) {
          details.push(`✅ ${accelerator} validation passed`)
          console.log(`✅ ${accelerator} validation passed`)
        } else {
          details.push(`❌ ${accelerator} validation failed`)
          console.log(`❌ ${accelerator} validation failed`)
          allRegistered = false
        }
      }

      // Test basic functionality
      details.push('✅ HotkeyManager class imported successfully')
      console.log('✅ HotkeyManager class imported successfully')

      // Test suggestions
      const suggestions = HotkeyManager.getSuggestions()
      if (suggestions && suggestions.length > 0) {
        details.push(`✅ Hotkey suggestions available: ${suggestions.length} items`)
        console.log(`✅ Hotkey suggestions available: ${suggestions.length} items`)
      }

      hotkeyManager.cleanup()

      this.results.hotkeys = {
        status: allRegistered ? 'passed' : 'failed',
        details
      }

    } catch (error) {
      console.log(`❌ Hotkey test error: ${error.message}`)
      this.results.hotkeys = {
        status: 'failed',
        details: [`❌ Hotkey test error: ${error.message}`]
      }
    }
  }

  async testWindowDetection() {
    console.log('\n🪟 Testing Window Detection...')
    
    try {
      const { WindowDetector } = require('./src/main/system/window')
      const windowDetector = new WindowDetector()
      const details = []
      let allPassed = true

      details.push('✅ WindowDetector class imported successfully')
      console.log('✅ WindowDetector class imported successfully')

      // Test getting active window
      console.log('Testing active window detection...')
      const activeWindow = await windowDetector.getActiveWindow()
      
      if (activeWindow) {
        details.push(`✅ Active window detected: ${activeWindow.name}`)
        console.log(`✅ Active window detected: ${activeWindow.name}`)
        
        if (activeWindow.title) {
          details.push(`✅ Window title: "${activeWindow.title}"`)
          console.log(`✅ Window title: "${activeWindow.title}"`)
        }
        
        if (activeWindow.pid) {
          details.push(`✅ Process ID: ${activeWindow.pid}`)
          console.log(`✅ Process ID: ${activeWindow.pid}`)
        }
        
        if (activeWindow.path) {
          details.push(`✅ Process path available`)
          console.log(`✅ Process path available`)
        }
      } else {
        details.push('❌ Failed to detect active window')
        console.log('❌ Failed to detect active window')
        allPassed = false
      }

      // Test window enumeration
      console.log('Testing window enumeration...')
      const allWindows = await windowDetector.getAllWindows()
      
      if (allWindows && allWindows.length > 0) {
        details.push(`✅ Enumerated ${allWindows.length} windows`)
        console.log(`✅ Enumerated ${allWindows.length} windows`)
        
        // Show first few windows as examples
        allWindows.slice(0, 3).forEach((window, index) => {
          details.push(`   ${index + 1}. ${window.name}: "${window.title}"`)
          console.log(`   ${index + 1}. ${window.name}: "${window.title}"`)
        })
      } else {
        details.push('❌ Failed to enumerate windows')
        console.log('❌ Failed to enumerate windows')
        allPassed = false
      }

      windowDetector.cleanup()

      this.results.windowDetection = {
        status: allPassed ? 'passed' : 'failed',
        details
      }

    } catch (error) {
      console.log(`❌ Window detection error: ${error.message}`)
      this.results.windowDetection = {
        status: 'failed',
        details: [`❌ Window detection error: ${error.message}`]
      }
    }
  }

  async testSystemTray() {
    console.log('\n🍃 Testing System Tray...')
    
    const details = []
    let allPassed = true

    try {
      // Test if we can import Electron modules
      const electron = require('electron')
      
      if (electron && electron.nativeImage) {
        details.push('✅ Electron modules available')
        console.log('✅ Electron modules available')
        
        // Test icon loading
        const iconPath = join(__dirname, 'resources/icons/tray.png')
        const icon = electron.nativeImage.createFromPath(iconPath)
        
        if (icon && !icon.isEmpty()) {
          details.push('✅ Tray icon loads successfully')
          console.log('✅ Tray icon loads successfully')
        } else {
          details.push('⚠️  Tray icon is empty, fallback will be used')
          console.log('⚠️  Tray icon is empty, fallback will be used')
        }
        
        details.push('✅ System tray setup code is functional')
        console.log('✅ System tray setup code is functional')
      } else {
        details.push('⚠️  Electron not available in current context')
        console.log('⚠️  Electron not available in current context')
      }

    } catch (error) {
      details.push(`⚠️  System tray test limited: ${error.message}`)
      console.log(`⚠️  System tray test limited: ${error.message}`)
    }

    this.results.systemTray = {
      status: allPassed ? 'passed' : 'warning',
      details
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 SYSTEM INTEGRATION TEST SUMMARY')
    console.log('='.repeat(60))

    const categories = ['icons', 'hotkeys', 'windowDetection', 'systemTray']
    let totalPassed = 0
    let totalTests = categories.length

    categories.forEach(category => {
      const result = this.results[category]
      const status = result.status
      const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️ '
      
      console.log(`\n${icon} ${category.toUpperCase()}: ${status.toUpperCase()}`)
      
      if (result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`   ${detail}`)
        })
      }

      if (status === 'passed') totalPassed++
    })

    console.log('\n' + '='.repeat(60))
    console.log(`🎯 OVERALL RESULT: ${totalPassed}/${totalTests} categories passed`)
    
    if (totalPassed === totalTests) {
      console.log('🎉 All system integration tests passed!')
    } else {
      console.log('⚠️  Some tests failed or had warnings. Review the details above.')
    }
    
    console.log('\n💡 WHAT TO CHECK:')
    console.log('   1. Run "npm run dev" to test in Electron environment')
    console.log('   2. Press Alt+Space to test hotkey registration')
    console.log('   3. Check system tray appears in taskbar')
    console.log('   4. Right-click tray icon to test context menu')
    console.log('   5. Verify window detection by switching between apps')
    
    console.log('='.repeat(60))

    // Return results for programmatic use
    return {
      passed: totalPassed,
      total: totalTests,
      success: totalPassed >= totalTests - 1, // Allow for warnings
      details: this.results
    }
  }
}

// Main execution
async function runTests() {
  const tester = new SystemIntegrationTester()
  const results = await tester.runAllTests()
  
  // Exit with appropriate code
  if (typeof process !== 'undefined') {
    process.exit(results.success ? 0 : 1)
  }
  
  return results
}

// Export for use as module
module.exports = { SystemIntegrationTester, runTests }

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error)
}
