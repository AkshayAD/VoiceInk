/**
 * Advanced User Analytics and Insights Dashboard (Step 109)
 * Comprehensive usage analytics and intelligent insights
 */

export interface AnalyticsEvent {
  id: string
  type: string
  category: 'usage' | 'performance' | 'error' | 'engagement'
  action: string
  label?: string
  value?: number
  properties: { [key: string]: any }
  timestamp: Date
  sessionId: string
  userId?: string
}

export interface UserSession {
  id: string
  userId?: string
  startTime: Date
  endTime?: Date
  duration?: number
  pageViews: number
  events: number
  features: string[]
  device: DeviceInfo
}

export interface DeviceInfo {
  platform: string
  os: string
  browser: string
  screen: { width: number, height: number }
  language: string
  timezone: string
}

export interface UsageMetrics {
  dailyActiveUsers: number
  sessionDuration: number
  featuresUsed: { [feature: string]: number }
  errorRate: number
  retentionRate: number
  transcriptionCount: number
  totalDuration: number
}

export interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'achievement'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  data: any
  actionable: boolean
  dismissed: boolean
  createdAt: Date
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = []
  private sessions: Map<string, UserSession> = new Map()
  private currentSession: UserSession | null = null
  private insights: Insight[] = []
  private isTracking = true

  constructor() {
    console.log('📊 Advanced user analytics and insights dashboard implemented')
    this.initializeSession()
    this.startInsightGeneration()
  }

  private initializeSession(): void {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      pageViews: 0,
      events: 0,
      features: [],
      device: this.getDeviceInfo()
    }
    
    this.sessions.set(sessionId, this.currentSession)
    this.track('session_start', 'engagement', 'Session started')
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      platform: process.platform || 'unknown',
      os: navigator.platform || 'unknown',
      browser: navigator.userAgent || 'unknown',
      screen: {
        width: screen.width || 0,
        height: screen.height || 0
      },
      language: navigator.language || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
    }
  }

  track(
    action: string,
    category: AnalyticsEvent['category'] = 'usage',
    label?: string,
    value?: number,
    properties: { [key: string]: any } = {}
  ): void {
    if (!this.isTracking || !this.currentSession) return

    const event: AnalyticsEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: action,
      category,
      action,
      label,
      value,
      properties,
      timestamp: new Date(),
      sessionId: this.currentSession.id
    }

    this.events.push(event)
    this.currentSession.events++

    // Track feature usage
    if (category === 'usage' && !this.currentSession.features.includes(action)) {
      this.currentSession.features.push(action)
    }

    console.log(`📈 Analytics event tracked: ${action}`)
    
    // Trigger real-time insights
    this.analyzeEvent(event)
  }

  trackPageView(page: string, properties: { [key: string]: any } = {}): void {
    if (!this.currentSession) return

    this.currentSession.pageViews++
    this.track('page_view', 'usage', page, 1, { page, ...properties })
  }

  trackTranscription(
    duration: number,
    language: string,
    model: string,
    confidence: number,
    speakerCount: number
  ): void {
    this.track('transcription_completed', 'usage', 'Transcription', duration, {
      language,
      model,
      confidence,
      speakerCount,
      wordCount: Math.floor(duration * 150) // Estimate ~150 words per minute
    })
  }

  trackError(
    error: Error,
    context: string,
    properties: { [key: string]: any } = {}
  ): void {
    this.track('error', 'error', error.name, 1, {
      message: error.message,
      stack: error.stack,
      context,
      ...properties
    })
  }

  trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    properties: { [key: string]: any } = {}
  ): void {
    this.track('performance', 'performance', operation, duration, {
      success,
      ...properties
    })
  }

  trackEngagement(
    feature: string,
    action: string,
    value?: number,
    properties: { [key: string]: any } = {}
  ): void {
    this.track(`${feature}_${action}`, 'engagement', feature, value, properties)
  }

  endSession(): void {
    if (!this.currentSession) return

    this.currentSession.endTime = new Date()
    this.currentSession.duration = 
      this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()

    this.track('session_end', 'engagement', 'Session ended', this.currentSession.duration)
    
    console.log(`📊 Session ended: ${this.currentSession.duration}ms`)
    this.currentSession = null
  }

  private analyzeEvent(event: AnalyticsEvent): void {
    // Real-time insights based on events
    if (event.category === 'error') {
      this.generateErrorInsight(event)
    } else if (event.action === 'transcription_completed') {
      this.generateTranscriptionInsight(event)
    } else if (event.category === 'performance' && event.value && event.value > 10000) {
      this.generatePerformanceInsight(event)
    }
  }

  private generateErrorInsight(event: AnalyticsEvent): void {
    const errorCount = this.events.filter(e => 
      e.category === 'error' && 
      e.timestamp.getTime() > Date.now() - 60000 // Last minute
    ).length

    if (errorCount >= 3) {
      this.addInsight({
        type: 'anomaly',
        title: 'High Error Rate Detected',
        description: `${errorCount} errors occurred in the last minute. Check system health.`,
        priority: 'high',
        data: { errorCount, recentErrors: this.getRecentErrors() },
        actionable: true
      })
    }
  }

  private generateTranscriptionInsight(event: AnalyticsEvent): void {
    const transcriptions = this.events.filter(e => e.action === 'transcription_completed')
    
    if (transcriptions.length > 0 && transcriptions.length % 10 === 0) {
      const avgConfidence = transcriptions.reduce((sum, e) => 
        sum + (e.properties.confidence || 0), 0) / transcriptions.length
      
      this.addInsight({
        type: 'achievement',
        title: `${transcriptions.length} Transcriptions Completed`,
        description: `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
        priority: 'medium',
        data: { count: transcriptions.length, avgConfidence },
        actionable: false
      })
    }
  }

  private generatePerformanceInsight(event: AnalyticsEvent): void {
    this.addInsight({
      type: 'anomaly',
      title: 'Slow Performance Detected',
      description: `${event.action} took ${(event.value! / 1000).toFixed(1)}s to complete`,
      priority: 'medium',
      data: { operation: event.action, duration: event.value },
      actionable: true
    })
  }

  private addInsight(insight: Omit<Insight, 'id' | 'createdAt' | 'dismissed'>): void {
    const fullInsight: Insight = {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      dismissed: false,
      ...insight
    }

    this.insights.push(fullInsight)
    console.log(`💡 New insight generated: ${fullInsight.title}`)
  }

  private startInsightGeneration(): void {
    // Generate periodic insights
    setInterval(() => {
      this.generatePeriodicInsights()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private generatePeriodicInsights(): void {
    const now = Date.now()
    const recentEvents = this.events.filter(e => 
      now - e.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )

    // Usage trends
    this.analyzeUsageTrends(recentEvents)
    
    // Feature adoption
    this.analyzeFeatureAdoption(recentEvents)
    
    // Performance trends
    this.analyzePerformanceTrends(recentEvents)
  }

  private analyzeUsageTrends(events: AnalyticsEvent[]): void {
    const transcriptionEvents = events.filter(e => e.action === 'transcription_completed')
    
    if (transcriptionEvents.length > 0) {
      const totalDuration = transcriptionEvents.reduce((sum, e) => 
        sum + (e.value || 0), 0)
      
      const avgDuration = totalDuration / transcriptionEvents.length
      
      if (avgDuration > 300) { // 5 minutes average
        this.addInsight({
          type: 'trend',
          title: 'Long Transcriptions Trend',
          description: `Users are creating longer transcriptions (avg: ${(avgDuration / 60).toFixed(1)} min)`,
          priority: 'low',
          data: { avgDuration, count: transcriptionEvents.length },
          actionable: false
        })
      }
    }
  }

  private analyzeFeatureAdoption(events: AnalyticsEvent[]): void {
    const featureUsage = events.reduce((acc, event) => {
      if (event.category === 'usage') {
        acc[event.action] = (acc[event.action] || 0) + 1
      }
      return acc
    }, {} as { [feature: string]: number })

    const mostUsedFeature = Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)[0]

    if (mostUsedFeature && mostUsedFeature[1] > 10) {
      this.addInsight({
        type: 'trend',
        title: `Popular Feature: ${mostUsedFeature[0]}`,
        description: `Used ${mostUsedFeature[1]} times recently`,
        priority: 'low',
        data: { feature: mostUsedFeature[0], usage: mostUsedFeature[1] },
        actionable: false
      })
    }
  }

  private analyzePerformanceTrends(events: AnalyticsEvent[]): void {
    const performanceEvents = events.filter(e => e.category === 'performance')
    
    if (performanceEvents.length > 5) {
      const avgPerformance = performanceEvents.reduce((sum, e) => 
        sum + (e.value || 0), 0) / performanceEvents.length

      if (avgPerformance > 5000) { // 5 seconds average
        this.addInsight({
          type: 'recommendation',
          title: 'Performance Optimization Needed',
          description: `Average operation time: ${(avgPerformance / 1000).toFixed(1)}s`,
          priority: 'medium',
          data: { avgPerformance, sampleSize: performanceEvents.length },
          actionable: true
        })
      }
    }
  }

  getUsageMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): UsageMetrics {
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    }

    const cutoff = Date.now() - timeRanges[timeRange]
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > cutoff)
    const recentSessions = Array.from(this.sessions.values())
      .filter(s => s.startTime.getTime() > cutoff)

    const transcriptionEvents = recentEvents.filter(e => e.action === 'transcription_completed')
    const errorEvents = recentEvents.filter(e => e.category === 'error')

    const featuresUsed = recentEvents.reduce((acc, event) => {
      if (event.category === 'usage') {
        acc[event.action] = (acc[event.action] || 0) + 1
      }
      return acc
    }, {} as { [feature: string]: number })

    return {
      dailyActiveUsers: new Set(recentSessions.map(s => s.userId).filter(Boolean)).size,
      sessionDuration: recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length,
      featuresUsed,
      errorRate: errorEvents.length / Math.max(recentEvents.length, 1),
      retentionRate: 0.85, // Mock retention rate
      transcriptionCount: transcriptionEvents.length,
      totalDuration: transcriptionEvents.reduce((sum, e) => sum + (e.value || 0), 0)
    }
  }

  getInsights(): Insight[] {
    return this.insights
      .filter(i => !i.dismissed)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  dismissInsight(insightId: string): void {
    const insight = this.insights.find(i => i.id === insightId)
    if (insight) {
      insight.dismissed = true
    }
  }

  getEvents(filters?: {
    category?: AnalyticsEvent['category']
    action?: string
    timeRange?: number
  }): AnalyticsEvent[] {
    let events = this.events

    if (filters) {
      if (filters.category) {
        events = events.filter(e => e.category === filters.category)
      }
      if (filters.action) {
        events = events.filter(e => e.action === filters.action)
      }
      if (filters.timeRange) {
        const cutoff = Date.now() - filters.timeRange
        events = events.filter(e => e.timestamp.getTime() > cutoff)
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getSessions(): UserSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  getCurrentSession(): UserSession | null {
    return this.currentSession
  }

  private getRecentErrors(): AnalyticsEvent[] {
    return this.events
      .filter(e => e.category === 'error')
      .slice(-5) // Last 5 errors
  }

  exportAnalytics(): {
    events: AnalyticsEvent[]
    sessions: UserSession[]
    insights: Insight[]
    metrics: UsageMetrics
  } {
    return {
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      insights: this.insights,
      metrics: this.getUsageMetrics()
    }
  }

  setTracking(enabled: boolean): void {
    this.isTracking = enabled
    console.log(`📊 Analytics tracking ${enabled ? 'enabled' : 'disabled'}`)
  }

  clearData(): void {
    this.events = []
    this.sessions.clear()
    this.insights = []
    this.currentSession = null
    console.log('🗑️ Analytics data cleared')
  }
}

export const analytics = new AnalyticsService()