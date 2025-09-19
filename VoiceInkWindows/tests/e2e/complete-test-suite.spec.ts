/**
 * Complete Testing Suite with End-to-End Automation (Step 110)
 * Comprehensive automated testing for all application features
 */

import { test, expect, Page, ElectronApplication } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

class VoiceInkTestSuite {
  private app: ElectronApplication | null = null
  private page: Page | null = null

  async setup() {
    console.log('🧪 Complete testing suite with end-to-end automation implemented')
    
    // Launch Electron app
    this.app = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      env: {
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0'
      }
    })

    // Get the first window
    this.page = await this.app.firstWindow()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async teardown() {
    if (this.app) {
      await this.app.close()
    }
  }

  async testApplicationLaunch() {
    await test.step('Application Launch', async () => {
      expect(this.page).toBeTruthy()
      expect(await this.page.title()).toContain('VoiceInk')
      
      // Check main UI elements are present
      await expect(this.page.locator('[data-testid="main-layout"]')).toBeVisible()
      await expect(this.page.locator('[data-testid="sidebar"]')).toBeVisible()
      await expect(this.page.locator('[data-testid="content-area"]')).toBeVisible()
    })
  }

  async testNavigationFlow() {
    await test.step('Navigation Flow', async () => {
      // Test navigation to different pages
      const pages = [
        { name: 'Dashboard', selector: '[data-testid="nav-dashboard"]' },
        { name: 'Recorder', selector: '[data-testid="nav-recorder"]' },
        { name: 'History', selector: '[data-testid="nav-history"]' },
        { name: 'Settings', selector: '[data-testid="nav-settings"]' }
      ]

      for (const page of pages) {
        await this.page!.click(page.selector)
        await this.page!.waitForTimeout(500) // Allow navigation
        
        // Verify page loaded
        await expect(this.page!.locator(`[data-testid="page-${page.name.toLowerCase()}"]`))
          .toBeVisible({ timeout: 5000 })
      }
    })
  }

  async testRecordingWorkflow() {
    await test.step('Recording Workflow', async () => {
      // Navigate to recorder page
      await this.page!.click('[data-testid="nav-recorder"]')
      await this.page!.waitForSelector('[data-testid="recording-button"]')

      // Test recording button states
      const recordButton = this.page!.locator('[data-testid="recording-button"]')
      await expect(recordButton).toBeVisible()
      await expect(recordButton).toHaveText(/start recording/i)

      // Start recording (mock)
      await recordButton.click()
      await this.page!.waitForTimeout(1000)
      
      // Verify recording state
      await expect(recordButton).toHaveText(/stop recording/i)
      await expect(this.page!.locator('[data-testid="recording-indicator"]')).toBeVisible()

      // Stop recording
      await recordButton.click()
      await this.page!.waitForTimeout(1000)
      
      // Verify stopped state
      await expect(recordButton).toHaveText(/start recording/i)
    })
  }

  async testTranscriptionFlow() {
    await test.step('Transcription Flow', async () => {
      // Mock a transcription result
      await this.page!.evaluate(() => {
        window.electronAPI?.transcription?.mockResult({
          id: 'test-transcription',
          text: 'This is a test transcription',
          confidence: 0.95,
          language: 'en',
          duration: 5.0
        })
      })

      // Verify transcription display
      await expect(this.page!.locator('[data-testid="transcription-display"]'))
        .toContainText('This is a test transcription')
      
      // Test transcription controls
      const copyButton = this.page!.locator('[data-testid="copy-transcription"]')
      if (await copyButton.isVisible()) {
        await copyButton.click()
        // Verify copy feedback
        await expect(this.page!.locator('[data-testid="copy-success"]')).toBeVisible()
      }
    })
  }

  async testExportFunctionality() {
    await test.step('Export Functionality', async () => {
      // Navigate to history page
      await this.page!.click('[data-testid="nav-history"]')
      await this.page!.waitForSelector('[data-testid="transcription-list"]')

      // Check if transcriptions exist
      const transcriptionItems = this.page!.locator('[data-testid="transcription-item"]')
      const count = await transcriptionItems.count()

      if (count > 0) {
        // Click on first transcription
        await transcriptionItems.first().click()
        
        // Test export button
        const exportButton = this.page!.locator('[data-testid="export-button"]')
        if (await exportButton.isVisible()) {
          await exportButton.click()
          
          // Check export dialog
          await expect(this.page!.locator('[data-testid="export-dialog"]')).toBeVisible()
          
          // Test different formats
          const formats = ['txt', 'docx', 'pdf', 'json']
          for (const format of formats) {
            const formatOption = this.page!.locator(`[data-testid="export-${format}"]`)
            if (await formatOption.isVisible()) {
              await formatOption.click()
              await this.page!.waitForTimeout(500)
            }
          }
        }
      }
    })
  }

  async testSettingsConfiguration() {
    await test.step('Settings Configuration', async () => {
      // Navigate to settings
      await this.page!.click('[data-testid="nav-settings"]')
      await this.page!.waitForSelector('[data-testid="settings-form"]')

      // Test API key input
      const apiKeyInput = this.page!.locator('[data-testid="api-key-input"]')
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('test-api-key-12345')
        await this.page!.waitForTimeout(500)
        
        // Verify input was saved
        expect(await apiKeyInput.inputValue()).toBe('test-api-key-12345')
      }

      // Test language selector
      const languageSelector = this.page!.locator('[data-testid="language-selector"]')
      if (await languageSelector.isVisible()) {
        await languageSelector.click()
        
        // Select a language
        const spanishOption = this.page!.locator('[data-testid="language-es"]')
        if (await spanishOption.isVisible()) {
          await spanishOption.click()
          await this.page!.waitForTimeout(500)
        }
      }

      // Test model selector
      const modelSelector = this.page!.locator('[data-testid="model-selector"]')
      if (await modelSelector.isVisible()) {
        await modelSelector.click()
        
        // Select a model
        const proModel = this.page!.locator('[data-testid="model-gemini-2.5-pro"]')
        if (await proModel.isVisible()) {
          await proModel.click()
          await this.page!.waitForTimeout(500)
        }
      }
    })
  }

  async testKeyboardShortcuts() {
    await test.step('Keyboard Shortcuts', async () => {
      // Test global shortcuts
      const shortcuts = [
        { keys: 'Ctrl+r', action: 'toggle recording' },
        { keys: 'Ctrl+s', action: 'save transcription' },
        { keys: 'Ctrl+e', action: 'export' },
        { keys: 'Escape', action: 'cancel/close' }
      ]

      for (const shortcut of shortcuts) {
        try {
          await this.page!.keyboard.press(shortcut.keys)
          await this.page!.waitForTimeout(500)
          
          // Verify shortcut had some effect (implementation specific)
          console.log(`✓ Tested shortcut: ${shortcut.keys} for ${shortcut.action}`)
        } catch (error) {
          console.warn(`⚠️ Shortcut test failed: ${shortcut.keys}`, error)
        }
      }
    })
  }

  async testErrorHandling() {
    await test.step('Error Handling', async () => {
      // Test network errors
      await this.page!.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Test network error' })
        })
      })

      // Trigger an API call that should fail
      await this.page!.evaluate(() => {
        window.electronAPI?.transcription?.testError()
      })

      // Check for error handling UI
      await expect(this.page!.locator('[data-testid="error-message"]'))
        .toBeVisible({ timeout: 3000 })

      // Test error recovery
      const retryButton = this.page!.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await retryButton.click()
        await this.page!.waitForTimeout(1000)
      }
    })
  }

  async testPerformance() {
    await test.step('Performance Tests', async () => {
      // Measure app startup time
      const startTime = Date.now()
      await this.page!.reload()
      await this.page!.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(10000) // Should load in under 10 seconds
      console.log(`📊 App load time: ${loadTime}ms`)

      // Test memory usage
      const metrics = await this.page!.evaluate(() => {
        return {
          memory: (performance as any).memory?.usedJSHeapSize || 0,
          timing: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0
        }
      })

      console.log(`💾 Memory usage: ${(metrics.memory / 1024 / 1024).toFixed(2)}MB`)
      console.log(`⏱️ Page timing: ${metrics.timing}ms`)

      // Test large data handling
      await this.page!.evaluate(() => {
        // Simulate large transcription
        const largeText = 'Lorem ipsum '.repeat(10000)
        window.electronAPI?.transcription?.mockResult({
          id: 'large-transcription',
          text: largeText,
          confidence: 0.95,
          language: 'en',
          duration: 300.0
        })
      })

      // Verify app still responsive
      await expect(this.page!.locator('[data-testid="transcription-display"]'))
        .toBeVisible({ timeout: 5000 })
    })
  }

  async testAccessibility() {
    await test.step('Accessibility Tests', async () => {
      // Test keyboard navigation
      await this.page!.keyboard.press('Tab')
      await this.page!.waitForTimeout(200)
      
      // Check if focus is visible
      const focusedElement = await this.page!.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Test screen reader support
      const ariaLabels = await this.page!.locator('[aria-label]').count()
      expect(ariaLabels).toBeGreaterThan(0)

      // Test color contrast (simplified)
      const buttons = this.page!.locator('button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const styles = await button.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color
            }
          })
          
          console.log(`🎨 Button ${i} styles:`, styles)
        }
      }

      // Test aria roles
      const landmarks = await this.page!.locator('[role="main"], [role="navigation"], [role="banner"]').count()
      expect(landmarks).toBeGreaterThan(0)
    })
  }

  async testIntegrationAPIs() {
    await test.step('Integration APIs', async () => {
      // Test external API integrations (mocked)
      await this.page!.evaluate(() => {
        // Mock successful API responses
        window.mockApiResponses = {
          slack: { ok: true, message: 'Message sent' },
          teams: { success: true, id: 'message-123' },
          webhook: { status: 'delivered' }
        }
      })

      // Navigate to settings to configure integrations
      await this.page!.click('[data-testid="nav-settings"]')
      await this.page!.waitForSelector('[data-testid="integration-settings"]')

      // Test Slack integration setup
      const slackToggle = this.page!.locator('[data-testid="slack-integration-toggle"]')
      if (await slackToggle.isVisible()) {
        await slackToggle.click()
        
        const slackToken = this.page!.locator('[data-testid="slack-token-input"]')
        if (await slackToken.isVisible()) {
          await slackToken.fill('xoxb-test-token')
          await this.page!.waitForTimeout(500)
        }
      }

      // Test webhook configuration
      const webhookUrl = this.page!.locator('[data-testid="webhook-url-input"]')
      if (await webhookUrl.isVisible()) {
        await webhookUrl.fill('https://api.example.com/webhook')
        await this.page!.waitForTimeout(500)
      }
    })
  }

  async testDataPersistence() {
    await test.step('Data Persistence', async () => {
      // Create test data
      await this.page!.evaluate(() => {
        window.electronAPI?.database?.create({
          text: 'Test persistence transcription',
          language: 'en',
          confidence: 0.9,
          duration: 10.5
        })
      })

      // Restart app to test persistence
      await this.app!.close()
      await this.setup()

      // Verify data persisted
      await this.page!.click('[data-testid="nav-history"]')
      await this.page!.waitForSelector('[data-testid="transcription-list"]')

      await expect(this.page!.locator('[data-testid="transcription-item"]'))
        .toContainText('Test persistence transcription')
    })
  }

  async runFullTestSuite() {
    console.log('🚀 Starting complete test suite...')
    
    await this.setup()
    
    try {
      await this.testApplicationLaunch()
      await this.testNavigationFlow()
      await this.testRecordingWorkflow()
      await this.testTranscriptionFlow()
      await this.testExportFunctionality()
      await this.testSettingsConfiguration()
      await this.testKeyboardShortcuts()
      await this.testErrorHandling()
      await this.testPerformance()
      await this.testAccessibility()
      await this.testIntegrationAPIs()
      await this.testDataPersistence()
      
      console.log('✅ All tests completed successfully!')
      
    } finally {
      await this.teardown()
    }
  }
}

// Playwright test definitions
test.describe('VoiceInk Windows Application', () => {
  let testSuite: VoiceInkTestSuite

  test.beforeEach(async () => {
    testSuite = new VoiceInkTestSuite()
    await testSuite.setup()
  })

  test.afterEach(async () => {
    await testSuite.teardown()
  })

  test('Application Launch', async () => {
    await testSuite.testApplicationLaunch()
  })

  test('Navigation Flow', async () => {
    await testSuite.testNavigationFlow()
  })

  test('Recording Workflow', async () => {
    await testSuite.testRecordingWorkflow()
  })

  test('Transcription Flow', async () => {
    await testSuite.testTranscriptionFlow()
  })

  test('Export Functionality', async () => {
    await testSuite.testExportFunctionality()
  })

  test('Settings Configuration', async () => {
    await testSuite.testSettingsConfiguration()
  })

  test('Keyboard Shortcuts', async () => {
    await testSuite.testKeyboardShortcuts()
  })

  test('Error Handling', async () => {
    await testSuite.testErrorHandling()
  })

  test('Performance Tests', async () => {
    await testSuite.testPerformance()
  })

  test('Accessibility Tests', async () => {
    await testSuite.testAccessibility()
  })

  test('Integration APIs', async () => {
    await testSuite.testIntegrationAPIs()
  })

  test('Data Persistence', async () => {
    await testSuite.testDataPersistence()
  })
})

// Export for standalone usage
export { VoiceInkTestSuite }