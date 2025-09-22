import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Clock, 
  Cpu, 
  HardDrive, 
  Wifi, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Database,
  Cloud,
  Gauge
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface PerformanceMetrics {
  cpu: {
    usage: number
    temperature?: number
    cores: number
    frequency?: number
  }
  memory: {
    used: number
    total: number
    percentage: number
    available: number
  }
  disk: {
    used: number
    total: number
    percentage: number
    free: number
    readSpeed?: number
    writeSpeed?: number
  }
  network: {
    uploadSpeed: number
    downloadSpeed: number
    latency: number
    connected: boolean
  }
  app: {
    transcriptionsProcessed: number
    averageProcessingTime: number
    successRate: number
    errorRate: number
    uptime: number
    memoryUsage: number
    activeConnections: number
  }
  ai: {
    apiLatency: number
    tokenUsage: number
    costToday: number
    requestsToday: number
    errorRate: number
    modelsUsed: string[]
  }
}

interface AlertItem {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
  resolved: boolean
}

export const PerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000)
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      fetchMetrics() // Initial fetch
      return () => clearInterval(interval)
    }
  }, [isMonitoring, refreshInterval])

  /**
   * Fetch current performance metrics
   */
  const fetchMetrics = async () => {
    try {
      // This would typically call an IPC method to get system metrics
      const mockMetrics: PerformanceMetrics = {
        cpu: {
          usage: 15 + Math.random() * 20,
          temperature: 45 + Math.random() * 15,
          cores: 8,
          frequency: 2400 + Math.random() * 800
        },
        memory: {
          used: 4.2 + Math.random() * 2,
          total: 16,
          percentage: 0,
          available: 0
        },
        disk: {
          used: 120 + Math.random() * 50,
          total: 512,
          percentage: 0,
          free: 0,
          readSpeed: 500 + Math.random() * 200,
          writeSpeed: 300 + Math.random() * 150
        },
        network: {
          uploadSpeed: 10 + Math.random() * 40,
          downloadSpeed: 50 + Math.random() * 100,
          latency: 20 + Math.random() * 30,
          connected: true
        },
        app: {
          transcriptionsProcessed: 156 + Math.floor(Math.random() * 10),
          averageProcessingTime: 3.2 + Math.random() * 2,
          successRate: 96 + Math.random() * 3,
          errorRate: 1 + Math.random() * 2,
          uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days
          memoryUsage: 150 + Math.random() * 50,
          activeConnections: 2 + Math.floor(Math.random() * 3)
        },
        ai: {
          apiLatency: 800 + Math.random() * 400,
          tokenUsage: 45000 + Math.floor(Math.random() * 5000),
          costToday: 2.45 + Math.random() * 1,
          requestsToday: 89 + Math.floor(Math.random() * 20),
          errorRate: 0.5 + Math.random() * 1.5,
          modelsUsed: ['gemini-2.5-flash', 'gemini-2.5-pro']
        }
      }

      // Calculate derived metrics
      mockMetrics.memory.percentage = (mockMetrics.memory.used / mockMetrics.memory.total) * 100
      mockMetrics.memory.available = mockMetrics.memory.total - mockMetrics.memory.used
      
      mockMetrics.disk.percentage = (mockMetrics.disk.used / mockMetrics.disk.total) * 100
      mockMetrics.disk.free = mockMetrics.disk.total - mockMetrics.disk.used

      setMetrics(mockMetrics)
      
      // Add to historical data
      setHistoricalData(prev => {
        const newData = [...prev, { timestamp: new Date(), ...mockMetrics }]
        return newData.slice(-100) // Keep last 100 data points
      })

      // Check for alerts
      checkForAlerts(mockMetrics)

    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  /**
   * Check metrics for alert conditions
   */
  const checkForAlerts = (metrics: PerformanceMetrics) => {
    const newAlerts: AlertItem[] = []

    if (metrics.cpu.usage > 80) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'warning',
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      })
    }

    if (metrics.memory.percentage > 85) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'warning',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      })
    }

    if (metrics.disk.percentage > 90) {
      newAlerts.push({
        id: `disk-${Date.now()}`,
        type: 'error',
        message: `Low disk space: ${metrics.disk.percentage.toFixed(1)}% used`,
        timestamp: new Date(),
        resolved: false
      })
    }

    if (metrics.app.errorRate > 5) {
      newAlerts.push({
        id: `error-rate-${Date.now()}`,
        type: 'warning',
        message: `High error rate: ${metrics.app.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      })
    }

    if (metrics.ai.errorRate > 3) {
      newAlerts.push({
        id: `ai-error-${Date.now()}`,
        type: 'warning',
        message: `AI service error rate high: ${metrics.ai.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      })
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)) // Keep last 50 alerts
    }
  }

  /**
   * Format uptime
   */
  const formatUptime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  /**
   * Get status color based on value and thresholds
   */
  const getStatusColor = (value: number, warning: number, critical: number): string => {
    if (value >= critical) return 'text-red-500'
    if (value >= warning) return 'text-yellow-500'
    return 'text-green-500'
  }

  /**
   * Get progress bar color
   */
  const getProgressColor = (value: number, warning: number, critical: number): string => {
    if (value >= critical) return 'bg-red-500'
    if (value >= warning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading performance metrics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system and application performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Monitoring' : 'Paused'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Cpu size={16} className="mr-2" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.cpu.usage, 60, 80)}`}>
                {metrics.cpu.usage.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {metrics.cpu.cores} cores
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.cpu.usage, 60, 80)}`}
                style={{ width: `${Math.min(metrics.cpu.usage, 100)}%` }}
              />
            </div>
            {metrics.cpu.temperature && (
              <p className="text-xs text-muted-foreground mt-1">
                Temp: {metrics.cpu.temperature.toFixed(1)}°C
              </p>
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardDrive size={16} className="mr-2" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.memory.percentage, 70, 85)}`}>
                {metrics.memory.percentage.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {metrics.memory.used.toFixed(1)} / {metrics.memory.total} GB
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.memory.percentage, 70, 85)}`}
                style={{ width: `${Math.min(metrics.memory.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available: {metrics.memory.available.toFixed(1)} GB
            </p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database size={16} className="mr-2" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.disk.percentage, 80, 90)}`}>
                {metrics.disk.percentage.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {metrics.disk.used} / {metrics.disk.total} GB
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics.disk.percentage, 80, 90)}`}
                style={{ width: `${Math.min(metrics.disk.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Free: {metrics.disk.free} GB
            </p>
          </CardContent>
        </Card>

        {/* Network */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wifi size={16} className="mr-2" />
              Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${metrics.network.connected ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.network.latency.toFixed(0)}ms
              </span>
              <Badge variant={metrics.network.connected ? 'default' : 'destructive'} className="text-xs">
                {metrics.network.connected ? 'Connected' : 'Offline'}
              </Badge>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>↓ {metrics.network.downloadSpeed.toFixed(1)} Mbps</span>
                <span>↑ {metrics.network.uploadSpeed.toFixed(1)} Mbps</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity size={20} className="mr-2" />
              Application Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Transcriptions Processed</p>
                <p className="text-2xl font-bold">{metrics.app.transcriptionsProcessed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-500">{metrics.app.successRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                <p className="text-2xl font-bold">{metrics.app.averageProcessingTime.toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold text-yellow-500">{metrics.app.errorRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">{formatUptime(metrics.app.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="font-medium">{metrics.app.memoryUsage.toFixed(0)} MB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cloud size={20} className="mr-2" />
              AI Service Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">API Latency</p>
                <p className="text-2xl font-bold">{metrics.ai.apiLatency.toFixed(0)}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requests Today</p>
                <p className="text-2xl font-bold">{metrics.ai.requestsToday}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Token Usage</p>
                <p className="text-2xl font-bold">{(metrics.ai.tokenUsage / 1000).toFixed(1)}K</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost Today</p>
                <p className="text-2xl font-bold text-blue-500">${metrics.ai.costToday.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Error Rate</span>
                <span className={`font-medium ${getStatusColor(metrics.ai.errorRate, 2, 5)}`}>
                  {metrics.ai.errorRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Models Used</span>
                <span className="font-medium">{metrics.ai.modelsUsed.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Recent Alerts ({alerts.filter(a => !a.resolved).length} active)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.slice(0, 10).map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.resolved ? 'bg-gray-50 border-gray-200' :
                    alert.type === 'error' ? 'bg-red-50 border-red-200' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {alert.resolved ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : alert.type === 'error' ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAlerts(prev => prev.map(a => 
                          a.id === alert.id ? { ...a, resolved: true } : a
                        ))
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}