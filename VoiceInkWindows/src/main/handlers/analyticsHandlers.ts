// Privacy-respecting telemetry and analytics
import { ipcMain } from 'electron'
import Store from 'electron-store'
import * as crypto from 'crypto'

interface AnalyticsSettings {
  enabled: boolean
  includePerformance: boolean
  includeErrors: boolean
  includeUsage: boolean
  anonymizeData: boolean
}

interface AnalyticsEvent {
  event: string
  properties: Record<string, any>
  timestamp: string
  sessionId: string
  userId?: string
}

interface PerformanceMetric {
  name: string
  value: number
  timestamp: string
  context?: Record<string, any>
}

const store = new Store()
let sessionId: string = generateSessionId()
let userId: string | null = null

const defaultSettings: AnalyticsSettings = {
  enabled: false, // Opt-in by default
  includePerformance: true,
  includeErrors: true,
  includeUsage: true,
  anonymizeData: true
}

export function setupAnalytics() {
  // Generate or load user ID
  userId = store.get('analytics.userId') as string
  if (!userId) {
    userId = generateUserId()
    store.set('analytics.userId', userId)
  }

  // Register IPC handlers
  registerAnalyticsHandlers()

  console.log('📊 Analytics system initialized')
}

function registerAnalyticsHandlers() {
  // Get analytics settings
  ipcMain.handle('analytics:getSettings', () => {
    return store.get('analytics.settings', defaultSettings)
  })

  // Update analytics settings
  ipcMain.handle('analytics:setSettings', (_, settings: AnalyticsSettings) => {
    store.set('analytics.settings', settings)
    return { success: true }
  })

  // Track event
  ipcMain.handle('analytics:track', async (_, eventName: string, properties: Record<string, any> = {}) => {
    const settings = store.get('analytics.settings', defaultSettings) as AnalyticsSettings
    
    if (!settings.enabled || !settings.includeUsage) {
      return { success: false, reason: 'Analytics disabled' }
    }

    const event: AnalyticsEvent = {
      event: eventName,
      properties: settings.anonymizeData ? anonymizeProperties(properties) : properties,
      timestamp: new Date().toISOString(),
      sessionId,
      userId: settings.anonymizeData ? hashUserId(userId!) : userId!
    }

    await storeEvent(event)
    return { success: true }
  })

  // Track performance metric
  ipcMain.handle('analytics:performance', async (_, name: string, value: number, context?: Record<string, any>) => {
    const settings = store.get('analytics.settings', defaultSettings) as AnalyticsSettings
    
    if (!settings.enabled || !settings.includePerformance) {
      return { success: false, reason: 'Performance tracking disabled' }
    }

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      context: settings.anonymizeData ? anonymizeProperties(context || {}) : context
    }

    await storePerformanceMetric(metric)
    return { success: true }
  })

  // Track error
  ipcMain.handle('analytics:error', async (_, error: { message: string; stack?: string; context?: Record<string, any> }) => {
    const settings = store.get('analytics.settings', defaultSettings) as AnalyticsSettings
    
    if (!settings.enabled || !settings.includeErrors) {
      return { success: false, reason: 'Error tracking disabled' }
    }

    const errorEvent = {
      event: 'error',
      properties: {
        message: error.message,
        stack: settings.anonymizeData ? anonymizeStackTrace(error.stack) : error.stack,
        context: settings.anonymizeData ? anonymizeProperties(error.context || {}) : error.context,
        userAgent: 'VoiceInk/Electron',
        platform: process.platform,
        arch: process.arch
      },
      timestamp: new Date().toISOString(),
      sessionId,
      userId: settings.anonymizeData ? hashUserId(userId!) : userId!
    }

    await storeEvent(errorEvent)
    return { success: true }
  })

  // Get analytics summary
  ipcMain.handle('analytics:getSummary', async () => {
    try {
      const events = await getStoredEvents()
      const metrics = await getStoredMetrics()
      
      return {
        success: true,
        summary: {
          totalEvents: events.length,
          totalMetrics: metrics.length,
          sessionCount: new Set(events.map(e => e.sessionId)).size,
          dateRange: events.length > 0 ? {
            start: events[0].timestamp,
            end: events[events.length - 1].timestamp
          } : null,
          topEvents: getTopEvents(events),
          averageMetrics: getAverageMetrics(metrics)
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Export analytics data
  ipcMain.handle('analytics:export', async () => {
    try {
      const events = await getStoredEvents()
      const metrics = await getStoredMetrics()
      
      const exportData = {
        exportDate: new Date().toISOString(),
        events,
        metrics,
        settings: store.get('analytics.settings', defaultSettings)
      }
      
      return { success: true, data: exportData }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Clear analytics data
  ipcMain.handle('analytics:clear', async () => {
    try {
      store.delete('analytics.events')
      store.delete('analytics.metrics')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function generateUserId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16)
}

function anonymizeProperties(properties: Record<string, any>): Record<string, any> {
  const anonymized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      // Anonymize potential PII
      if (key.toLowerCase().includes('email') || key.toLowerCase().includes('name') || key.toLowerCase().includes('user')) {
        anonymized[key] = hashString(value)
      } else if (key.toLowerCase().includes('path') || key.toLowerCase().includes('file')) {
        anonymized[key] = anonymizePath(value)
      } else {
        anonymized[key] = value
      }
    } else {
      anonymized[key] = value
    }
  }
  
  return anonymized
}

function anonymizeStackTrace(stack?: string): string | undefined {
  if (!stack) return stack
  
  // Remove file paths and replace with generic markers
  return stack
    .replace(/[A-Za-z]:\\[^\\n]+/g, '[FILE_PATH]')
    .replace(/\/[^\\n]+/g, '[FILE_PATH]')
    .replace(/at [^\\n]+\\([^)]+\\)/g, 'at [FUNCTION]([FILE_PATH])')
}

function anonymizePath(path: string): string {
  // Replace user-specific parts of paths
  return path
    .replace(/[A-Za-z]:\\Users\\[^\\\\]+/g, '[USER_HOME]')
    .replace(/\/Users\/[^\/]+/g, '[USER_HOME]')
    .replace(/\/home\/[^\/]+/g, '[USER_HOME]')
}

function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16)
}

async function storeEvent(event: AnalyticsEvent): Promise<void> {
  const events = store.get('analytics.events', []) as AnalyticsEvent[]
  events.push(event)
  
  // Keep only last 1000 events to prevent unlimited growth
  if (events.length > 1000) {
    events.splice(0, events.length - 1000)
  }
  
  store.set('analytics.events', events)
}

async function storePerformanceMetric(metric: PerformanceMetric): Promise<void> {
  const metrics = store.get('analytics.metrics', []) as PerformanceMetric[]
  metrics.push(metric)
  
  // Keep only last 1000 metrics
  if (metrics.length > 1000) {
    metrics.splice(0, metrics.length - 1000)
  }
  
  store.set('analytics.metrics', metrics)
}

async function getStoredEvents(): Promise<AnalyticsEvent[]> {
  return store.get('analytics.events', []) as AnalyticsEvent[]
}

async function getStoredMetrics(): Promise<PerformanceMetric[]> {
  return store.get('analytics.metrics', []) as PerformanceMetric[]
}

function getTopEvents(events: AnalyticsEvent[]): Array<{ event: string; count: number }> {
  const counts: Record<string, number> = {}
  
  events.forEach(event => {
    counts[event.event] = (counts[event.event] || 0) + 1
  })
  
  return Object.entries(counts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getAverageMetrics(metrics: PerformanceMetric[]): Array<{ name: string; average: number; count: number }> {
  const grouped: Record<string, number[]> = {}
  
  metrics.forEach(metric => {
    if (!grouped[metric.name]) {
      grouped[metric.name] = []
    }
    grouped[metric.name].push(metric.value)
  })
  
  return Object.entries(grouped)
    .map(([name, values]) => ({
      name,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length
    }))
    .sort((a, b) => b.count - a.count)
}

// Auto-track application events
export function trackAppStart() {
  const settings = store.get('analytics.settings', defaultSettings) as AnalyticsSettings
  if (settings.enabled && settings.includeUsage) {
    storeEvent({
      event: 'app_start',
      properties: {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      },
      timestamp: new Date().toISOString(),
      sessionId,
      userId: settings.anonymizeData ? hashUserId(userId!) : userId!
    })
  }
}

export function trackAppExit() {
  const settings = store.get('analytics.settings', defaultSettings) as AnalyticsSettings
  if (settings.enabled && settings.includeUsage) {
    storeEvent({
      event: 'app_exit',
      properties: {
        sessionDuration: Date.now() - parseInt(sessionId, 16)
      },
      timestamp: new Date().toISOString(),
      sessionId,
      userId: settings.anonymizeData ? hashUserId(userId!) : userId!
    })
  }
}