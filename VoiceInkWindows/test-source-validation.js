/**
 * Source Code Validation Test for VoiceInk Windows
 * Validates the system integration source files without runtime dependencies
 */

const fs = require('fs')
const path = require('path')

class SourceValidator {
  constructor() {
    this.results = {
      hotkeys: { status: 'pending', details: [] },
      windowDetection: { status: 'pending', details: [] },
      systemTray: { status: 'pending', details: [] },
      icons: { status: 'pending', details: [] },
      mainApp: { status: 'pending', details: [] }
    }
  }

  async runAllValidations() {
    console.log('🔍 VoiceInk Windows - Source Code Validation')
    console.log('='.repeat(50))

    this.validateIconFiles()
    this.validateHotkeyImplementation()
    this.validateWindowDetection()
    this.validateSystemTray()
    this.validateMainApp()

    return this.printSummary()
  }

  validateIconFiles() {
    console.log('\n📁 Validating Icon Files...')
    
    const iconPaths = [
      'resources/icons/tray.png',
      'resources/icons/icon.png',
      'resources/icons/icon.ico'
    ]

    let allValid = true
    const details = []

    for (const iconPath of iconPaths) {
      const fullPath = path.join(__dirname, iconPath)
      try {
        const exists = fs.existsSync(fullPath)
        if (exists) {
          const stats = fs.statSync(fullPath)
          details.push(`✅ ${iconPath} exists (${stats.size} bytes)`)
          console.log(`✅ ${iconPath} exists (${stats.size} bytes)`)
        } else {
          details.push(`❌ ${iconPath} missing`)
          console.log(`❌ ${iconPath} missing`)
          allValid = false
        }
      } catch (error) {
        details.push(`❌ Error checking ${iconPath}: ${error.message}`)
        console.log(`❌ Error checking ${iconPath}: ${error.message}`)
        allValid = false
      }
    }

    this.results.icons = {
      status: allValid ? 'passed' : 'failed',
      details
    }
  }

  validateHotkeyImplementation() {
    console.log('\n⌨️  Validating Hotkey Implementation...')
    
    const hotkeyFile = path.join(__dirname, 'src/main/system/hotkeys.ts')
    const details = []
    let isValid = true

    try {
      if (!fs.existsSync(hotkeyFile)) {
        details.push('❌ hotkeys.ts file missing')
        console.log('❌ hotkeys.ts file missing')
        isValid = false
      } else {
        const content = fs.readFileSync(hotkeyFile, 'utf8')
        
        // Check for key components
        const checks = [
          { pattern: /class HotkeyManager/, name: 'HotkeyManager class' },
          { pattern: /register\(.*?\)/, name: 'register method' },
          { pattern: /unregister\(.*?\)/, name: 'unregister method' },
          { pattern: /validateAccelerator/, name: 'validateAccelerator method' },
          { pattern: /cleanup\(\)/, name: 'cleanup method' },
          { pattern: /globalShortcut/, name: 'Electron globalShortcut import' },
          { pattern: /EventEmitter/, name: 'EventEmitter inheritance' }
        ]

        checks.forEach(check => {
          if (check.pattern.test(content)) {
            details.push(`✅ ${check.name} found`)
            console.log(`✅ ${check.name} found`)
          } else {
            details.push(`❌ ${check.name} missing`)
            console.log(`❌ ${check.name} missing`)
            isValid = false
          }
        })

        // Check for proper hotkey combinations
        const defaultHotkeys = ['Alt+Space', 'Alt+Shift+R', 'Alt+Shift+V']
        defaultHotkeys.forEach(hotkey => {
          if (content.includes(hotkey)) {
            details.push(`✅ Default hotkey ${hotkey} configured`)
            console.log(`✅ Default hotkey ${hotkey} configured`)
          }
        })
      }
    } catch (error) {
      details.push(`❌ Error reading hotkeys.ts: ${error.message}`)
      console.log(`❌ Error reading hotkeys.ts: ${error.message}`)
      isValid = false
    }

    this.results.hotkeys = {
      status: isValid ? 'passed' : 'failed',
      details
    }
  }

  validateWindowDetection() {
    console.log('\n🪟 Validating Window Detection...')
    
    const windowFile = path.join(__dirname, 'src/main/system/window.ts')
    const details = []
    let isValid = true

    try {
      if (!fs.existsSync(windowFile)) {
        details.push('❌ window.ts file missing')
        console.log('❌ window.ts file missing')
        isValid = false
      } else {
        const content = fs.readFileSync(windowFile, 'utf8')
        
        // Check for key components
        const checks = [
          { pattern: /class WindowDetector/, name: 'WindowDetector class' },
          { pattern: /getActiveWindow/, name: 'getActiveWindow method' },
          { pattern: /getAllWindows/, name: 'getAllWindows method' },
          { pattern: /startMonitoring/, name: 'startMonitoring method' },
          { pattern: /stopMonitoring/, name: 'stopMonitoring method' },
          { pattern: /PowerShell/, name: 'PowerShell integration' },
          { pattern: /GetForegroundWindow/, name: 'Windows API calls' },
          { pattern: /window-changed/, name: 'Window change events' }
        ]

        checks.forEach(check => {
          if (check.pattern.test(content)) {
            details.push(`✅ ${check.name} found`)
            console.log(`✅ ${check.name} found`)
          } else {
            details.push(`❌ ${check.name} missing`)
            console.log(`❌ ${check.name} missing`)
            isValid = false
          }
        })

        // Check for browser detection
        if (content.includes('isBrowser')) {
          details.push('✅ Browser detection implemented')
          console.log('✅ Browser detection implemented')
        }

        // Check for self-filtering (avoid detecting VoiceInk itself)
        if (content.includes('voiceink') || content.includes('electron')) {
          details.push('✅ Self-filtering implemented')
          console.log('✅ Self-filtering implemented')
        }
      }
    } catch (error) {
      details.push(`❌ Error reading window.ts: ${error.message}`)
      console.log(`❌ Error reading window.ts: ${error.message}`)
      isValid = false
    }

    this.results.windowDetection = {
      status: isValid ? 'passed' : 'failed',
      details
    }
  }

  validateSystemTray() {
    console.log('\n🍃 Validating System Tray Implementation...')
    
    const mainFile = path.join(__dirname, 'src/main/index.ts')
    const details = []
    let isValid = true

    try {
      if (!fs.existsSync(mainFile)) {
        details.push('❌ main/index.ts file missing')
        console.log('❌ main/index.ts file missing')
        isValid = false
      } else {
        const content = fs.readFileSync(mainFile, 'utf8')
        
        // Check for key components
        const checks = [
          { pattern: /setupSystemTray/, name: 'setupSystemTray method' },
          { pattern: /updateTrayMenu/, name: 'updateTrayMenu method' },
          { pattern: /updateTrayTooltip/, name: 'updateTrayTooltip method' },
          { pattern: /new Tray/, name: 'Tray creation' },
          { pattern: /setContextMenu/, name: 'Context menu setup' },
          { pattern: /setToolTip/, name: 'Tooltip setup' },
          { pattern: /tray\.on\('click'/, name: 'Tray click handler' },
          { pattern: /Menu\.buildFromTemplate/, name: 'Menu building' }
        ]

        checks.forEach(check => {
          if (check.pattern.test(content)) {
            details.push(`✅ ${check.name} found`)
            console.log(`✅ ${check.name} found`)
          } else {
            details.push(`❌ ${check.name} missing`)
            console.log(`❌ ${check.name} missing`)
            isValid = false
          }
        })

        // Check for essential tray menu items
        const menuItems = ['Start Recording', 'Stop Recording', 'Settings', 'Quit']
        menuItems.forEach(item => {
          if (content.includes(item)) {
            details.push(`✅ Menu item "${item}" found`)
            console.log(`✅ Menu item "${item}" found`)
          }
        })

        // Check for icon fallback
        if (content.includes('fallback') || content.includes('createFromDataURL')) {
          details.push('✅ Icon fallback mechanism implemented')
          console.log('✅ Icon fallback mechanism implemented')
        }
      }
    } catch (error) {
      details.push(`❌ Error reading main/index.ts: ${error.message}`)
      console.log(`❌ Error reading main/index.ts: ${error.message}`)
      isValid = false
    }

    this.results.systemTray = {
      status: isValid ? 'passed' : 'failed',
      details
    }
  }

  validateMainApp() {
    console.log('\n🎯 Validating Main App Integration...')
    
    const mainFile = path.join(__dirname, 'src/main/index.ts')
    const details = []
    let isValid = true

    try {
      if (!fs.existsSync(mainFile)) {
        details.push('❌ main/index.ts file missing')
        console.log('❌ main/index.ts file missing')
        isValid = false
      } else {
        const content = fs.readFileSync(mainFile, 'utf8')
        
        // Check for service integrations
        const integrationChecks = [
          { pattern: /HotkeyManager/, name: 'HotkeyManager integration' },
          { pattern: /WindowDetector/, name: 'WindowDetector integration' },
          { pattern: /registerGlobalShortcuts/, name: 'Global shortcuts registration' },
          { pattern: /hotkeyManager\.registerAll/, name: 'Hotkey manager usage' },
          { pattern: /hotkeyManager\.cleanup/, name: 'Hotkey cleanup' },
          { pattern: /windowDetector\.startMonitoring/, name: 'Window monitoring start' },
          { pattern: /windowDetector\.cleanup/, name: 'Window detector cleanup' },
          { pattern: /toggleRecording/, name: 'Recording toggle function' }
        ]

        integrationChecks.forEach(check => {
          if (check.pattern.test(content)) {
            details.push(`✅ ${check.name} found`)
            console.log(`✅ ${check.name} found`)
          } else {
            details.push(`❌ ${check.name} missing`)
            console.log(`❌ ${check.name} missing`)
            isValid = false
          }
        })

        // Check for proper event handling
        if (content.includes('hotkey-triggered')) {
          details.push('✅ Hotkey event handling implemented')
          console.log('✅ Hotkey event handling implemented')
        }

        // Check for tray updates during recording
        if (content.includes('updateTrayMenu') && content.includes('updateTrayTooltip')) {
          details.push('✅ Dynamic tray updates implemented')
          console.log('✅ Dynamic tray updates implemented')
        }
      }
    } catch (error) {
      details.push(`❌ Error reading main app: ${error.message}`)
      console.log(`❌ Error reading main app: ${error.message}`)
      isValid = false
    }

    this.results.mainApp = {
      status: isValid ? 'passed' : 'failed',
      details
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 SOURCE CODE VALIDATION SUMMARY')
    console.log('='.repeat(60))

    const categories = ['icons', 'hotkeys', 'windowDetection', 'systemTray', 'mainApp']
    let totalPassed = 0
    let totalTests = categories.length

    categories.forEach(category => {
      const result = this.results[category]
      const status = result.status
      const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️ '
      
      console.log(`\n${icon} ${category.toUpperCase()}: ${status.toUpperCase()}`)
      
      if (result.details.length > 0) {
        result.details.slice(0, 5).forEach(detail => { // Show first 5 details
          console.log(`   ${detail}`)
        })
        if (result.details.length > 5) {
          console.log(`   ... and ${result.details.length - 5} more`)
        }
      }

      if (status === 'passed') totalPassed++
    })

    console.log('\n' + '='.repeat(60))
    console.log(`🎯 VALIDATION RESULT: ${totalPassed}/${totalTests} categories passed`)
    
    if (totalPassed === totalTests) {
      console.log('🎉 All source code validations passed!')
      console.log('💡 The system integration features are properly implemented.')
    } else {
      console.log('⚠️  Some validations failed. Review the details above.')
    }

    console.log('\n🚀 NEXT STEPS:')
    console.log('   1. Run "npm run build" to compile TypeScript')
    console.log('   2. Run "npm run dev" to test in Electron environment')
    console.log('   3. Test hotkeys: Alt+Space, Alt+Shift+R, Alt+Shift+V')
    console.log('   4. Verify system tray appears and context menu works')
    console.log('   5. Switch between applications to test window detection')
    
    console.log('='.repeat(60))

    return {
      passed: totalPassed,
      total: totalTests,
      success: totalPassed >= totalTests,
      details: this.results
    }
  }
}

// Main execution
async function runValidation() {
  const validator = new SourceValidator()
  const results = await validator.runAllValidations()
  
  // Exit with appropriate code
  if (typeof process !== 'undefined') {
    process.exit(results.success ? 0 : 1)
  }
  
  return results
}

// Export for use as module
module.exports = { SourceValidator, runValidation }

// Run if called directly
if (require.main === module) {
  runValidation().catch(console.error)
}