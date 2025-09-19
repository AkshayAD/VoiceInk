import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Map<string, string>;
  aggregations: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: {
    grid: Array<{
      widgetId: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }>;
  };
  widgets: Map<string, Widget>;
  filters: FilterSet;
  refreshInterval: number;
  permissions: string[];
}

interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'funnel' | 'gauge';
  title: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  realtime: boolean;
  alertRules: AlertRule[];
}

interface DataSource {
  type: 'metric' | 'query' | 'aggregate' | 'stream';
  metric?: string;
  query?: string;
  aggregation?: {
    function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
    groupBy?: string[];
    window: number;
  };
  stream?: {
    endpoint: string;
    protocol: 'websocket' | 'sse';
  };
}

interface VisualizationConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  colors?: string[];
  axes?: {
    x: { label: string; scale: 'linear' | 'log' | 'time' };
    y: { label: string; scale: 'linear' | 'log' };
  };
  thresholds?: Array<{
    value: number;
    color: string;
    label: string;
  }>;
}

interface FilterSet {
  timeRange: {
    start: Date;
    end: Date;
    relative?: string; // e.g., 'last-1h', 'last-24h'
  };
  dimensions: Map<string, string[]>;
  search?: string;
}

interface AlertRule {
  id: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration: number; // seconds
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'notification';
    config: any;
  }>;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

interface Report {
  id: string;
  name: string;
  dashboards: string[];
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    recipients: string[];
  };
  format: 'pdf' | 'excel' | 'csv' | 'html';
  filters: FilterSet;
}

class AnalyticsDashboardService extends EventEmitter {
  private metrics: Map<string, AnalyticsMetric[]> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, Widget> = new Map();
  private reports: Map<string, Report> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, any> = new Map();
  private dataStreams: Map<string, any> = new Map();
  private aggregationCache: Map<string, any> = new Map();
  private storageDir: string;

  constructor(storageDir: string = './analytics') {
    super();
    this.storageDir = storageDir;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.ensureStorageDirectory();
    this.startMetricsCollection();
    this.startAggregationEngine();
    this.startAlertEngine();
  }

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'metrics'), { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'dashboards'), { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'reports'), { recursive: true });
  }

  // Metrics Collection
  async recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): Promise<void> {
    const metric: AnalyticsMetric = {
      id: crypto.randomUUID(),
      name,
      value,
      unit: this.inferUnit(name),
      timestamp: new Date(),
      tags: new Map(Object.entries(tags)),
      aggregations: await this.calculateAggregations(name, value)
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);

    // Persist to time-series storage
    await this.persistMetric(metric);

    // Check alerts
    await this.checkAlerts(metric);

    // Emit for real-time dashboards
    this.emit('metric', metric);
  }

  private inferUnit(metricName: string): string {
    if (metricName.includes('time') || metricName.includes('duration')) return 'ms';
    if (metricName.includes('size') || metricName.includes('bytes')) return 'bytes';
    if (metricName.includes('count') || metricName.includes('total')) return 'count';
    if (metricName.includes('rate') || metricName.includes('throughput')) return 'ops/s';
    if (metricName.includes('percentage') || metricName.includes('percent')) return '%';
    return 'unit';
  }

  private async calculateAggregations(
    name: string,
    newValue: number
  ): Promise<AnalyticsMetric['aggregations']> {
    const metrics = this.metrics.get(name) || [];
    const values = [...metrics.map(m => m.value), newValue].sort((a, b) => a - b);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      sum: values.reduce((a, b) => a + b, 0),
      count: values.length,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99)
    };
  }

  private percentile(values: number[], p: number): number {
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, index)];
  }

  // Dashboard Management
  async createDashboard(config: {
    name: string;
    description: string;
    widgets: Widget[];
  }): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name: config.name,
      description: config.description,
      layout: this.autoLayout(config.widgets),
      widgets: new Map(config.widgets.map(w => [w.id, w])),
      filters: {
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          relative: 'last-24h'
        },
        dimensions: new Map()
      },
      refreshInterval: 30000,
      permissions: ['view', 'edit']
    };

    this.dashboards.set(dashboard.id, dashboard);
    await this.saveDashboard(dashboard);
    
    // Start data streams for real-time widgets
    for (const widget of dashboard.widgets.values()) {
      if (widget.realtime) {
        await this.startDataStream(widget);
      }
    }

    return dashboard;
  }

  private autoLayout(widgets: Widget[]): Dashboard['layout']['grid'] {
    const grid: Dashboard['layout']['grid'] = [];
    let currentY = 0;
    let currentX = 0;
    const maxWidth = 12;

    for (const widget of widgets) {
      const width = this.getWidgetWidth(widget.type);
      const height = this.getWidgetHeight(widget.type);

      if (currentX + width > maxWidth) {
        currentX = 0;
        currentY += 4;
      }

      grid.push({
        widgetId: widget.id,
        x: currentX,
        y: currentY,
        w: width,
        h: height
      });

      currentX += width;
    }

    return grid;
  }

  private getWidgetWidth(type: Widget['type']): number {
    switch (type) {
      case 'metric': return 3;
      case 'gauge': return 3;
      case 'chart': return 6;
      case 'table': return 6;
      case 'heatmap': return 6;
      case 'funnel': return 4;
      default: return 4;
    }
  }

  private getWidgetHeight(type: Widget['type']): number {
    switch (type) {
      case 'metric': return 2;
      case 'gauge': return 3;
      case 'chart': return 4;
      case 'table': return 4;
      case 'heatmap': return 4;
      case 'funnel': return 4;
      default: return 3;
    }
  }

  // Real-time Data Streaming
  private async startDataStream(widget: Widget): Promise<void> {
    if (widget.dataSource.type === 'stream' && widget.dataSource.stream) {
      const { endpoint, protocol } = widget.dataSource.stream;
      
      if (protocol === 'websocket') {
        // WebSocket implementation would go here
        this.dataStreams.set(widget.id, {
          type: 'websocket',
          endpoint,
          connection: null // Would be actual WebSocket
        });
      } else if (protocol === 'sse') {
        // Server-Sent Events implementation would go here
        this.dataStreams.set(widget.id, {
          type: 'sse',
          endpoint,
          connection: null // Would be actual EventSource
        });
      }
    }
  }

  // Query Engine
  async queryMetrics(
    query: string,
    filters: FilterSet
  ): Promise<AnalyticsMetric[]> {
    const results: AnalyticsMetric[] = [];
    
    // Parse query (simplified PromQL-like syntax)
    const { metric, aggregation, groupBy } = this.parseQuery(query);
    
    const metricsData = this.metrics.get(metric) || [];
    
    // Apply time range filter
    const filtered = metricsData.filter(m => {
      return m.timestamp >= filters.timeRange.start &&
             m.timestamp <= filters.timeRange.end;
    });

    // Apply dimension filters
    const dimensionFiltered = filtered.filter(m => {
      for (const [key, values] of filters.dimensions) {
        if (!values.includes(m.tags.get(key) || '')) {
          return false;
        }
      }
      return true;
    });

    // Apply aggregation
    if (aggregation) {
      return this.aggregate(dimensionFiltered, aggregation, groupBy);
    }

    return dimensionFiltered;
  }

  private parseQuery(query: string): any {
    // Simplified query parsing
    const parts = query.split(/\s+/);
    return {
      metric: parts[0],
      aggregation: parts.includes('by') ? parts[parts.indexOf('by') - 1] : null,
      groupBy: parts.includes('by') ? parts.slice(parts.indexOf('by') + 1) : []
    };
  }

  private aggregate(
    metrics: AnalyticsMetric[],
    func: string,
    groupBy: string[]
  ): AnalyticsMetric[] {
    if (groupBy.length === 0) {
      // Global aggregation
      const value = this.applyAggregation(metrics.map(m => m.value), func);
      return [{
        id: crypto.randomUUID(),
        name: `${func}(${metrics[0]?.name || 'unknown'})`,
        value,
        unit: metrics[0]?.unit || 'unit',
        timestamp: new Date(),
        tags: new Map(),
        aggregations: metrics[0]?.aggregations || this.defaultAggregations()
      }];
    }

    // Group by dimensions
    const groups = new Map<string, AnalyticsMetric[]>();
    for (const metric of metrics) {
      const key = groupBy.map(dim => metric.tags.get(dim) || 'null').join(':');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(metric);
    }

    const results: AnalyticsMetric[] = [];
    for (const [key, group] of groups) {
      const value = this.applyAggregation(group.map(m => m.value), func);
      const tags = new Map<string, string>();
      const keyParts = key.split(':');
      groupBy.forEach((dim, i) => tags.set(dim, keyParts[i]));

      results.push({
        id: crypto.randomUUID(),
        name: `${func}(${group[0].name})`,
        value,
        unit: group[0].unit,
        timestamp: new Date(),
        tags,
        aggregations: group[0].aggregations
      });
    }

    return results;
  }

  private applyAggregation(values: number[], func: string): number {
    switch (func) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'count': return values.length;
      default: return 0;
    }
  }

  private defaultAggregations(): AnalyticsMetric['aggregations'] {
    return {
      min: 0, max: 0, avg: 0, sum: 0, count: 0,
      p50: 0, p95: 0, p99: 0
    };
  }

  // Alert Engine
  async createAlert(rule: AlertRule): Promise<void> {
    this.alerts.set(rule.id, rule);
    this.emit('alert-created', rule);
  }

  private async checkAlerts(metric: AnalyticsMetric): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;
      if (alert.condition.metric !== metric.name) continue;

      const triggered = this.evaluateCondition(
        metric.value,
        alert.condition.operator,
        alert.condition.threshold
      );

      if (triggered) {
        if (!this.activeAlerts.has(alert.id)) {
          this.activeAlerts.set(alert.id, {
            startTime: new Date(),
            metric: metric.name,
            value: metric.value,
            threshold: alert.condition.threshold
          });

          // Wait for duration before triggering
          setTimeout(() => {
            if (this.activeAlerts.has(alert.id)) {
              this.triggerAlert(alert, metric);
            }
          }, alert.condition.duration * 1000);
        }
      } else {
        // Clear active alert
        if (this.activeAlerts.has(alert.id)) {
          this.activeAlerts.delete(alert.id);
          this.emit('alert-resolved', { alert, metric });
        }
      }
    }
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  private async triggerAlert(alert: AlertRule, metric: AnalyticsMetric): Promise<void> {
    this.emit('alert-triggered', { alert, metric });

    for (const action of alert.actions) {
      switch (action.type) {
        case 'email':
          await this.sendEmailAlert(action.config, alert, metric);
          break;
        case 'webhook':
          await this.sendWebhookAlert(action.config, alert, metric);
          break;
        case 'notification':
          this.emit('notification', {
            severity: alert.severity,
            title: `Alert: ${alert.condition.metric}`,
            message: `Value ${metric.value} ${alert.condition.operator} ${alert.condition.threshold}`,
            timestamp: new Date()
          });
          break;
      }
    }
  }

  private async sendEmailAlert(config: any, alert: AlertRule, metric: AnalyticsMetric): Promise<void> {
    // Email sending implementation
    console.log('Email alert sent:', { config, alert: alert.id, metric: metric.value });
  }

  private async sendWebhookAlert(config: any, alert: AlertRule, metric: AnalyticsMetric): Promise<void> {
    // Webhook implementation
    console.log('Webhook alert sent:', { config, alert: alert.id, metric: metric.value });
  }

  // Report Generation
  async generateReport(reportId: string): Promise<Buffer> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found');

    const data: any[] = [];

    for (const dashboardId of report.dashboards) {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) continue;

      for (const widget of dashboard.widgets.values()) {
        const widgetData = await this.getWidgetData(widget, report.filters);
        data.push({
          dashboard: dashboard.name,
          widget: widget.title,
          data: widgetData
        });
      }
    }

    // Generate report in requested format
    switch (report.format) {
      case 'pdf':
        return this.generatePDFReport(data, report);
      case 'excel':
        return this.generateExcelReport(data, report);
      case 'csv':
        return this.generateCSVReport(data, report);
      case 'html':
        return this.generateHTMLReport(data, report);
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }
  }

  private async getWidgetData(widget: Widget, filters: FilterSet): Promise<any> {
    switch (widget.dataSource.type) {
      case 'metric':
        return this.metrics.get(widget.dataSource.metric || '') || [];
      case 'query':
        return this.queryMetrics(widget.dataSource.query || '', filters);
      case 'aggregate':
        // Implementation for aggregated data
        return [];
      default:
        return [];
    }
  }

  private generatePDFReport(data: any[], report: Report): Buffer {
    // PDF generation (would use libraries like pdfkit)
    return Buffer.from(JSON.stringify(data));
  }

  private generateExcelReport(data: any[], report: Report): Buffer {
    // Excel generation (would use libraries like xlsx)
    return Buffer.from(JSON.stringify(data));
  }

  private generateCSVReport(data: any[], report: Report): Buffer {
    // CSV generation
    const csv = data.map(row => {
      return `"${row.dashboard}","${row.widget}","${JSON.stringify(row.data)}"`;
    }).join('\n');
    return Buffer.from(csv);
  }

  private generateHTMLReport(data: any[], report: Report): Buffer {
    // HTML generation
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>${report.name}</title></head>
      <body>
        <h1>${report.name}</h1>
        ${data.map(d => `
          <div>
            <h2>${d.dashboard} - ${d.widget}</h2>
            <pre>${JSON.stringify(d.data, null, 2)}</pre>
          </div>
        `).join('')}
      </body>
      </html>
    `;
    return Buffer.from(html);
  }

  // Storage
  private async persistMetric(metric: AnalyticsMetric): Promise<void> {
    const fileName = `${metric.name}_${Date.now()}.json`;
    const filePath = path.join(this.storageDir, 'metrics', fileName);
    await fs.writeFile(filePath, JSON.stringify(metric));
  }

  private async saveDashboard(dashboard: Dashboard): Promise<void> {
    const filePath = path.join(this.storageDir, 'dashboards', `${dashboard.id}.json`);
    await fs.writeFile(filePath, JSON.stringify({
      ...dashboard,
      widgets: Array.from(dashboard.widgets.entries())
    }));
  }

  // Background Tasks
  private startMetricsCollection(): void {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.recordMetric('system.memory', process.memoryUsage().heapUsed);
      this.recordMetric('system.cpu', process.cpuUsage().user);
    }, 10000);
  }

  private startAggregationEngine(): void {
    // Run aggregations every minute
    setInterval(() => {
      for (const [name, metrics] of this.metrics) {
        // Keep only last hour of raw metrics
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.metrics.set(
          name,
          metrics.filter(m => m.timestamp.getTime() > oneHourAgo)
        );
      }
    }, 60000);
  }

  private startAlertEngine(): void {
    // Check for stale alerts every 30 seconds
    setInterval(() => {
      for (const [alertId, activeAlert] of this.activeAlerts) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
          this.activeAlerts.delete(alertId);
          continue;
        }

        // Check if alert has been active too long
        const duration = Date.now() - activeAlert.startTime.getTime();
        if (duration > 3600000) { // 1 hour
          this.emit('alert-escalated', { alert, duration });
        }
      }
    }, 30000);
  }

  // Public API
  async exportDashboard(dashboardId: string): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    return JSON.stringify({
      ...dashboard,
      widgets: Array.from(dashboard.widgets.entries()),
      filters: {
        ...dashboard.filters,
        dimensions: Array.from(dashboard.filters.dimensions.entries())
      }
    }, null, 2);
  }

  async importDashboard(data: string): Promise<Dashboard> {
    const parsed = JSON.parse(data);
    const dashboard: Dashboard = {
      ...parsed,
      id: crypto.randomUUID(), // Generate new ID
      widgets: new Map(parsed.widgets),
      filters: {
        ...parsed.filters,
        dimensions: new Map(parsed.filters.dimensions)
      }
    };

    this.dashboards.set(dashboard.id, dashboard);
    await this.saveDashboard(dashboard);
    return dashboard;
  }

  async getMetricStats(metricName: string): Promise<any> {
    const metrics = this.metrics.get(metricName) || [];
    if (metrics.length === 0) return null;

    const latest = metrics[metrics.length - 1];
    return {
      name: metricName,
      latest: latest.value,
      unit: latest.unit,
      aggregations: latest.aggregations,
      dataPoints: metrics.length,
      timeRange: {
        start: metrics[0].timestamp,
        end: latest.timestamp
      }
    };
  }
}

export default AnalyticsDashboardService;