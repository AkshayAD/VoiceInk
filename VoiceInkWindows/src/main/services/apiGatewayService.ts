/**
 * API Gateway Service (Step 126)
 * Rate limiting, API versioning, authentication, and request/response transformation
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface APIGatewayConfig {
  enabled: boolean
  port: number
  host: string
  rateLimiting: RateLimitingConfig
  authentication: AuthenticationConfig
  versioning: VersioningConfig
  transformation: TransformationConfig
  analytics: AnalyticsConfig
  circuitBreaker: CircuitBreakerConfig
  cors: CorsConfig
  compression: CompressionConfig
}

export interface RateLimitingConfig {
  enabled: boolean
  strategies: RateLimitStrategy[]
  defaultLimits: RateLimit
  customLimits: Map<string, RateLimit>
  storage: 'memory' | 'redis' | 'database'
  skipSuccessfulRequests: boolean
  skipFailedRequests: boolean
  keyGenerator: (req: APIRequest) => string
}

export interface RateLimitStrategy {
  type: 'fixed_window' | 'sliding_window' | 'token_bucket' | 'leaky_bucket'
  windowSize: number // seconds
  maxRequests: number
  refillRate?: number // for token bucket
  capacity?: number // for token bucket
}

export interface RateLimit {
  requests: number
  period: number // seconds
  burst?: number
  retryAfter?: number
  skipPaths?: string[]
  headers: boolean
}

export interface AuthenticationConfig {
  enabled: boolean
  providers: AuthProvider[]
  tokenValidation: TokenValidationConfig
  apiKeys: APIKeyConfig
  oauth: OAuthConfig
  jwt: JWTConfig
  mfa: MFAConfig
}

export interface AuthProvider {
  id: string
  type: 'api_key' | 'oauth' | 'jwt' | 'basic' | 'custom'
  enabled: boolean
  priority: number
  config: any
}

export interface TokenValidationConfig {
  enabled: boolean
  cache: boolean
  cacheTtl: number // seconds
  introspectionEndpoint?: string
  publicKeys?: string[]
  algorithms: string[]
}

export interface APIKeyConfig {
  enabled: boolean
  header: string
  query?: string
  prefix?: string
  encryption: boolean
  rotation: boolean
  rotationDays: number
}

export interface OAuthConfig {
  enabled: boolean
  providers: OAuthProvider[]
  scopes: OAuthScope[]
  tokenEndpoint: string
  introspectionEndpoint?: string
  revocationEndpoint?: string
}

export interface OAuthProvider {
  id: string
  name: string
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  scope: string[]
  enabled: boolean
}

export interface OAuthScope {
  name: string
  description: string
  required: boolean
  resources: string[]
  permissions: string[]
}

export interface JWTConfig {
  enabled: boolean
  secret?: string
  publicKey?: string
  algorithm: string
  issuer?: string
  audience?: string
  expiration: number // seconds
  clockTolerance: number // seconds
}

export interface MFAConfig {
  enabled: boolean
  methods: ('totp' | 'sms' | 'email' | 'push')[]
  required: boolean
  exemptPaths: string[]
  sessionTimeout: number // minutes
}

export interface VersioningConfig {
  enabled: boolean
  strategy: 'header' | 'query' | 'path' | 'accept_header'
  headerName?: string
  queryParam?: string
  pathPrefix?: string
  defaultVersion: string
  supportedVersions: APIVersion[]
  deprecationWarnings: boolean
}

export interface APIVersion {
  version: string
  status: 'active' | 'deprecated' | 'sunset'
  releaseDate: Date
  deprecationDate?: Date
  sunsetDate?: Date
  changeLog: string[]
  backwardCompatible: boolean
}

export interface TransformationConfig {
  enabled: boolean
  requestTransforms: TransformRule[]
  responseTransforms: TransformRule[]
  middleware: MiddlewareConfig[]
  validation: ValidationConfig
}

export interface TransformRule {
  id: string
  name: string
  enabled: boolean
  conditions: TransformCondition[]
  actions: TransformAction[]
  priority: number
}

export interface TransformCondition {
  type: 'path' | 'method' | 'header' | 'query' | 'body' | 'version'
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'not_exists'
  value: any
  caseSensitive?: boolean
}

export interface TransformAction {
  type: 'add_header' | 'remove_header' | 'modify_header' | 'add_query' | 'remove_query' | 'modify_body' | 'redirect'
  target: string
  value: any
  condition?: string
}

export interface MiddlewareConfig {
  id: string
  name: string
  enabled: boolean
  order: number
  config: any
  paths: string[]
  methods: string[]
}

export interface ValidationConfig {
  enabled: boolean
  schemas: ValidationSchema[]
  strictMode: boolean
  customValidators: CustomValidator[]
}

export interface ValidationSchema {
  path: string
  method: string
  version?: string
  requestSchema?: any
  responseSchema?: any
  enabled: boolean
}

export interface CustomValidator {
  name: string
  function: string
  async: boolean
  errorMessage: string
}

export interface AnalyticsConfig {
  enabled: boolean
  metrics: MetricConfig[]
  retention: number // days
  sampling: SamplingConfig
  export: ExportConfig
  alerts: AlertConfig[]
}

export interface MetricConfig {
  name: string
  type: 'counter' | 'histogram' | 'gauge' | 'summary'
  enabled: boolean
  labels: string[]
  buckets?: number[]
  quantiles?: number[]
}

export interface SamplingConfig {
  enabled: boolean
  rate: number // 0-1
  strategy: 'random' | 'deterministic' | 'adaptive'
  excludePaths: string[]
}

export interface ExportConfig {
  enabled: boolean
  format: 'prometheus' | 'json' | 'csv'
  endpoint?: string
  interval: number // seconds
  compression: boolean
}

export interface AlertConfig {
  id: string
  name: string
  enabled: boolean
  metric: string
  condition: string
  threshold: number
  duration: number // seconds
  cooldown: number // seconds
  channels: string[]
}

export interface CircuitBreakerConfig {
  enabled: boolean
  failureThreshold: number
  resetTimeout: number // seconds
  monitoringPeriod: number // seconds
  fallbackResponse?: any
  healthCheck?: HealthCheckConfig
}

export interface HealthCheckConfig {
  enabled: boolean
  endpoint: string
  interval: number // seconds
  timeout: number // seconds
  expectedStatus: number
  expectedBody?: string
}

export interface CorsConfig {
  enabled: boolean
  origins: string[]
  methods: string[]
  headers: string[]
  credentials: boolean
  maxAge: number // seconds
  preflightContinue: boolean
  optionsSuccessStatus: number
}

export interface CompressionConfig {
  enabled: boolean
  algorithms: ('gzip' | 'deflate' | 'br')[]
  level: number
  threshold: number // bytes
  filter: (req: APIRequest) => boolean
}

export interface APIRequest {
  id: string
  method: string
  url: string
  path: string
  query: { [key: string]: any }
  headers: { [key: string]: string }
  body?: any
  version?: string
  timestamp: Date
  remoteAddress: string
  userAgent?: string
  apiKey?: string
  userId?: string
  metadata: { [key: string]: any }
}

export interface APIResponse {
  id: string
  requestId: string
  status: number
  headers: { [key: string]: string }
  body?: any
  timestamp: Date
  duration: number // milliseconds
  cached: boolean
  transformed: boolean
  metadata: { [key: string]: any }
}

export interface APIEndpoint {
  id: string
  path: string
  method: string
  version: string
  handler: EndpointHandler
  middleware: string[]
  rateLimit?: RateLimit
  authentication: boolean
  authorization?: AuthorizationRule[]
  validation?: ValidationSchema
  documentation: EndpointDocumentation
  deprecated: boolean
  internal: boolean
}

export interface EndpointHandler {
  type: 'function' | 'proxy' | 'static' | 'redirect'
  target: string
  config: any
  timeout: number // seconds
  retries: number
  cache?: CacheConfig
}

export interface CacheConfig {
  enabled: boolean
  ttl: number // seconds
  key: string
  vary: string[]
  invalidation: InvalidationRule[]
}

export interface InvalidationRule {
  type: 'time' | 'event' | 'dependency'
  config: any
}

export interface AuthorizationRule {
  type: 'role' | 'permission' | 'scope' | 'custom'
  value: string
  operator: 'equals' | 'contains' | 'matches'
  required: boolean
}

export interface EndpointDocumentation {
  summary: string
  description: string
  tags: string[]
  parameters: ParameterDoc[]
  requestBody?: RequestBodyDoc
  responses: ResponseDoc[]
  examples: ExampleDoc[]
  security: SecurityDoc[]
}

export interface ParameterDoc {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  required: boolean
  type: string
  description: string
  example?: any
  schema?: any
}

export interface RequestBodyDoc {
  description: string
  required: boolean
  contentType: string
  schema: any
  example?: any
}

export interface ResponseDoc {
  status: number
  description: string
  contentType?: string
  schema?: any
  example?: any
  headers?: { [key: string]: string }
}

export interface ExampleDoc {
  name: string
  description: string
  request?: any
  response?: any
}

export interface SecurityDoc {
  type: string
  scheme?: string
  scopes?: string[]
}

export interface APIMetrics {
  requests: RequestMetrics
  responses: ResponseMetrics
  performance: PerformanceMetrics
  errors: ErrorMetrics
  authentication: AuthMetrics
  rateLimiting: RateLimitMetrics
}

export interface RequestMetrics {
  total: number
  perSecond: number
  perMinute: number
  perHour: number
  byMethod: { [method: string]: number }
  byPath: { [path: string]: number }
  byVersion: { [version: string]: number }
  byUserAgent: { [userAgent: string]: number }
}

export interface ResponseMetrics {
  total: number
  byStatus: { [status: string]: number }
  successRate: number
  errorRate: number
  avgResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
}

export interface PerformanceMetrics {
  throughput: number
  latency: LatencyMetrics
  bandwidth: BandwidthMetrics
  concurrency: number
  queueDepth: number
}

export interface LatencyMetrics {
  min: number
  max: number
  avg: number
  median: number
  p95: number
  p99: number
  p999: number
}

export interface BandwidthMetrics {
  inbound: number // bytes/sec
  outbound: number // bytes/sec
  total: number // bytes
}

export interface ErrorMetrics {
  total: number
  rate: number
  byType: { [type: string]: number }
  byEndpoint: { [endpoint: string]: number }
  recent: ErrorSummary[]
}

export interface ErrorSummary {
  timestamp: Date
  type: string
  endpoint: string
  message: string
  count: number
}

export interface AuthMetrics {
  attempts: number
  successes: number
  failures: number
  successRate: number
  byProvider: { [provider: string]: number }
  tokenUsage: TokenUsageMetrics
}

export interface TokenUsageMetrics {
  active: number
  expired: number
  revoked: number
  issued: number
  validated: number
}

export interface RateLimitMetrics {
  total: number
  blocked: number
  blockRate: number
  byKey: { [key: string]: number }
  resetTime: Date
}

export interface APIGatewayState {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  uptime: number // seconds
  version: string
  endpoints: number
  activeConnections: number
  totalRequests: number
  lastRestart: Date
  healthChecks: HealthCheckResult[]
}

export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  lastCheck: Date
  duration: number // milliseconds
  message?: string
}

class APIGatewayService extends EventEmitter {
  private config: APIGatewayConfig
  private endpoints: Map<string, APIEndpoint> = new Map()
  private requests: Map<string, APIRequest> = new Map()
  private responses: Map<string, APIResponse> = new Map()
  private rateLimitStore: Map<string, RateLimitData> = new Map()
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private metrics: APIMetrics
  private state: APIGatewayState
  
  private configPath: string
  private isInitialized = false
  private metricsInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'api-gateway')
    
    this.config = this.getDefaultConfig()
    this.metrics = this.initializeMetrics()
    this.state = this.initializeState()
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configPath, { recursive: true })
      
      await this.loadConfiguration()
      await this.setupDefaultEndpoints()
      await this.startMetricsCollection()
      await this.startCleanupTask()
      await this.startHealthChecks()
      
      this.state.status = 'running'
      this.state.lastRestart = new Date()
      
      this.isInitialized = true
      this.emit('initialized')
      
      console.log('API Gateway service initialized successfully')
    } catch (error) {
      this.state.status = 'error'
      console.error('Failed to initialize API Gateway service:', error)
      throw error
    }
  }

  private getDefaultConfig(): APIGatewayConfig {
    return {
      enabled: true,
      port: 3001,
      host: 'localhost',
      rateLimiting: {
        enabled: true,
        strategies: [{
          type: 'sliding_window',
          windowSize: 60,
          maxRequests: 100
        }],
        defaultLimits: {
          requests: 100,
          period: 60,
          burst: 20,
          retryAfter: 60,
          headers: true
        },
        customLimits: new Map(),
        storage: 'memory',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => req.remoteAddress
      },
      authentication: {
        enabled: true,
        providers: [],
        tokenValidation: {
          enabled: true,
          cache: true,
          cacheTtl: 300,
          algorithms: ['HS256', 'RS256']
        },
        apiKeys: {
          enabled: true,
          header: 'X-API-Key',
          query: 'api_key',
          encryption: true,
          rotation: true,
          rotationDays: 90
        },
        oauth: {
          enabled: false,
          providers: [],
          scopes: [],
          tokenEndpoint: '',
          introspectionEndpoint: '',
          revocationEndpoint: ''
        },
        jwt: {
          enabled: true,
          algorithm: 'HS256',
          expiration: 3600,
          clockTolerance: 60
        },
        mfa: {
          enabled: false,
          methods: ['totp'],
          required: false,
          exemptPaths: ['/health', '/metrics'],
          sessionTimeout: 30
        }
      },
      versioning: {
        enabled: true,
        strategy: 'header',
        headerName: 'API-Version',
        defaultVersion: 'v1',
        supportedVersions: [{
          version: 'v1',
          status: 'active',
          releaseDate: new Date(),
          backwardCompatible: true,
          changeLog: ['Initial version']
        }],
        deprecationWarnings: true
      },
      transformation: {
        enabled: true,
        requestTransforms: [],
        responseTransforms: [],
        middleware: [],
        validation: {
          enabled: true,
          schemas: [],
          strictMode: false,
          customValidators: []
        }
      },
      analytics: {
        enabled: true,
        metrics: [
          { name: 'http_requests_total', type: 'counter', enabled: true, labels: ['method', 'path', 'status'] },
          { name: 'http_request_duration', type: 'histogram', enabled: true, labels: ['method', 'path'], buckets: [0.1, 0.5, 1, 2, 5] }
        ],
        retention: 30,
        sampling: {
          enabled: false,
          rate: 1.0,
          strategy: 'random',
          excludePaths: []
        },
        export: {
          enabled: false,
          format: 'prometheus',
          interval: 60,
          compression: true
        },
        alerts: []
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60,
        monitoringPeriod: 30,
        healthCheck: {
          enabled: true,
          endpoint: '/health',
          interval: 30,
          timeout: 5,
          expectedStatus: 200
        }
      },
      cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'X-API-Key', 'API-Version'],
        credentials: false,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 200
      },
      compression: {
        enabled: true,
        algorithms: ['gzip', 'deflate'],
        level: 6,
        threshold: 1024,
        filter: (req) => req.headers['content-type']?.includes('application/json') || false
      }
    }
  }

  private initializeMetrics(): APIMetrics {
    return {
      requests: {
        total: 0,
        perSecond: 0,
        perMinute: 0,
        perHour: 0,
        byMethod: {},
        byPath: {},
        byVersion: {},
        byUserAgent: {}
      },
      responses: {
        total: 0,
        byStatus: {},
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      performance: {
        throughput: 0,
        latency: {
          min: 0,
          max: 0,
          avg: 0,
          median: 0,
          p95: 0,
          p99: 0,
          p999: 0
        },
        bandwidth: {
          inbound: 0,
          outbound: 0,
          total: 0
        },
        concurrency: 0,
        queueDepth: 0
      },
      errors: {
        total: 0,
        rate: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      },
      authentication: {
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        byProvider: {},
        tokenUsage: {
          active: 0,
          expired: 0,
          revoked: 0,
          issued: 0,
          validated: 0
        }
      },
      rateLimiting: {
        total: 0,
        blocked: 0,
        blockRate: 0,
        byKey: {},
        resetTime: new Date()
      }
    }
  }

  private initializeState(): APIGatewayState {
    return {
      status: 'starting',
      uptime: 0,
      version: '1.0.0',
      endpoints: 0,
      activeConnections: 0,
      totalRequests: 0,
      lastRestart: new Date(),
      healthChecks: []
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configFile = path.join(this.configPath, 'config.json')
      const data = await fs.readFile(configFile, 'utf-8')
      this.config = { ...this.config, ...JSON.parse(data) }
    } catch (error) {
      console.log('No existing configuration found, using defaults')
    }
  }

  private async setupDefaultEndpoints(): Promise<void> {
    // Health check endpoint
    const healthEndpoint: APIEndpoint = {
      id: 'health-check',
      path: '/health',
      method: 'GET',
      version: 'v1',
      handler: {
        type: 'function',
        target: 'healthCheck',
        config: {},
        timeout: 5,
        retries: 0
      },
      middleware: [],
      authentication: false,
      documentation: {
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API Gateway',
        tags: ['health'],
        parameters: [],
        responses: [{
          status: 200,
          description: 'Healthy',
          contentType: 'application/json',
          schema: { type: 'object', properties: { status: { type: 'string' } } }
        }],
        examples: [],
        security: []
      },
      deprecated: false,
      internal: true
    }

    // Metrics endpoint
    const metricsEndpoint: APIEndpoint = {
      id: 'metrics',
      path: '/metrics',
      method: 'GET',
      version: 'v1',
      handler: {
        type: 'function',
        target: 'getMetrics',
        config: {},
        timeout: 10,
        retries: 0
      },
      middleware: [],
      authentication: true,
      documentation: {
        summary: 'Get API metrics',
        description: 'Returns comprehensive API usage metrics',
        tags: ['metrics'],
        parameters: [],
        responses: [{
          status: 200,
          description: 'Metrics data',
          contentType: 'application/json'
        }],
        examples: [],
        security: [{ type: 'apiKey' }]
      },
      deprecated: false,
      internal: true
    }

    // Transcription API endpoint
    const transcriptionEndpoint: APIEndpoint = {
      id: 'transcription',
      path: '/api/v1/transcription',
      method: 'POST',
      version: 'v1',
      handler: {
        type: 'proxy',
        target: 'http://localhost:3000/transcription',
        config: {},
        timeout: 30,
        retries: 2,
        cache: {
          enabled: false,
          ttl: 0,
          key: '',
          vary: [],
          invalidation: []
        }
      },
      middleware: ['rateLimiter', 'validator', 'transformer'],
      rateLimit: {
        requests: 10,
        period: 60,
        burst: 5,
        headers: true
      },
      authentication: true,
      authorization: [{
        type: 'scope',
        value: 'transcription:write',
        operator: 'equals',
        required: true
      }],
      validation: {
        path: '/api/v1/transcription',
        method: 'POST',
        version: 'v1',
        requestSchema: {
          type: 'object',
          properties: {
            audio: { type: 'string', description: 'Base64 encoded audio data' },
            language: { type: 'string', enum: ['en', 'es', 'fr', 'de'] },
            model: { type: 'string', enum: ['whisper-base', 'whisper-large'] }
          },
          required: ['audio']
        },
        responseSchema: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            confidence: { type: 'number' },
            duration: { type: 'number' }
          }
        },
        enabled: true
      },
      documentation: {
        summary: 'Create transcription',
        description: 'Transcribe audio to text using AI models',
        tags: ['transcription'],
        parameters: [],
        requestBody: {
          description: 'Audio transcription request',
          required: true,
          contentType: 'application/json',
          schema: {
            type: 'object',
            properties: {
              audio: { type: 'string', description: 'Base64 encoded audio data' },
              language: { type: 'string', description: 'Language code' },
              model: { type: 'string', description: 'AI model to use' }
            }
          }
        },
        responses: [{
          status: 200,
          description: 'Transcription result',
          contentType: 'application/json'
        }],
        examples: [{
          name: 'Basic transcription',
          description: 'Simple audio transcription',
          request: {
            audio: 'base64audiodata...',
            language: 'en'
          },
          response: {
            text: 'Hello world',
            confidence: 0.95,
            duration: 2.5
          }
        }],
        security: [{ type: 'apiKey', scopes: ['transcription:write'] }]
      },
      deprecated: false,
      internal: false
    }

    this.endpoints.set(healthEndpoint.id, healthEndpoint)
    this.endpoints.set(metricsEndpoint.id, metricsEndpoint)
    this.endpoints.set(transcriptionEndpoint.id, transcriptionEndpoint)

    this.state.endpoints = this.endpoints.size
  }

  async processRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): Promise<APIResponse> {
    const requestId = crypto.randomUUID()
    const apiRequest: APIRequest = {
      id: requestId,
      timestamp: new Date(),
      metadata: {},
      ...request
    }

    this.requests.set(requestId, apiRequest)
    this.state.activeConnections++
    this.state.totalRequests++

    const startTime = Date.now()

    try {
      // Update request metrics
      this.updateRequestMetrics(apiRequest)

      // Rate limiting check
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = await this.checkRateLimit(apiRequest)
        if (!rateLimitResult.allowed) {
          return this.createErrorResponse(requestId, 429, 'Rate limit exceeded', { 
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
          })
        }
      }

      // Authentication check
      if (this.config.authentication.enabled) {
        const authResult = await this.authenticateRequest(apiRequest)
        if (!authResult.success) {
          this.metrics.authentication.failures++
          return this.createErrorResponse(requestId, 401, authResult.message || 'Authentication failed')
        }
        this.metrics.authentication.successes++
        apiRequest.userId = authResult.userId
        apiRequest.apiKey = authResult.apiKey
      }

      // Find matching endpoint
      const endpoint = this.findEndpoint(apiRequest)
      if (!endpoint) {
        return this.createErrorResponse(requestId, 404, 'Endpoint not found')
      }

      // Authorization check
      if (endpoint.authorization) {
        const authzResult = await this.authorizeRequest(apiRequest, endpoint)
        if (!authzResult.allowed) {
          return this.createErrorResponse(requestId, 403, authzResult.message || 'Forbidden')
        }
      }

      // Validation
      if (endpoint.validation && this.config.transformation.validation.enabled) {
        const validationResult = await this.validateRequest(apiRequest, endpoint)
        if (!validationResult.valid) {
          return this.createErrorResponse(requestId, 400, `Validation failed: ${validationResult.errors.join(', ')}`)
        }
      }

      // Request transformation
      if (this.config.transformation.enabled) {
        await this.transformRequest(apiRequest)
      }

      // Circuit breaker check
      if (this.config.circuitBreaker.enabled) {
        const circuitState = this.getCircuitBreakerState(endpoint.id)
        if (circuitState.state === 'open') {
          return this.createErrorResponse(requestId, 503, 'Service temporarily unavailable')
        }
      }

      // Execute endpoint handler
      const response = await this.executeEndpoint(apiRequest, endpoint)

      // Response transformation
      if (this.config.transformation.enabled) {
        await this.transformResponse(response)
      }

      // Update circuit breaker
      if (this.config.circuitBreaker.enabled) {
        this.updateCircuitBreaker(endpoint.id, response.status < 500)
      }

      // Update response metrics
      this.updateResponseMetrics(response, Date.now() - startTime)

      return response

    } catch (error) {
      console.error('Request processing error:', error)
      
      const errorResponse = this.createErrorResponse(requestId, 500, 'Internal server error')
      this.updateResponseMetrics(errorResponse, Date.now() - startTime)
      
      // Update error metrics
      this.metrics.errors.total++
      this.metrics.errors.rate = this.metrics.errors.total / this.metrics.requests.total
      
      return errorResponse
      
    } finally {
      this.state.activeConnections--
      
      // Clean up old requests
      setTimeout(() => {
        this.requests.delete(requestId)
      }, 60000) // Keep for 1 minute
    }
  }

  private async checkRateLimit(request: APIRequest): Promise<RateLimitResult> {
    const key = this.config.rateLimiting.keyGenerator(request)
    const now = Date.now()
    
    let data = this.rateLimitStore.get(key)
    if (!data) {
      data = {
        requests: [],
        blocked: 0,
        resetTime: new Date(now + this.config.rateLimiting.defaultLimits.period * 1000)
      }
      this.rateLimitStore.set(key, data)
    }

    // Clean old requests (sliding window)
    const windowStart = now - (this.config.rateLimiting.defaultLimits.period * 1000)
    data.requests = data.requests.filter(time => time > windowStart)

    const currentRequests = data.requests.length
    const limit = this.config.rateLimiting.defaultLimits.requests

    if (currentRequests >= limit) {
      data.blocked++
      this.metrics.rateLimiting.blocked++
      
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfter: this.config.rateLimiting.defaultLimits.retryAfter || 60,
        resetTime: data.resetTime
      }
    }

    data.requests.push(now)
    this.metrics.rateLimiting.total++

    return {
      allowed: true,
      limit,
      remaining: limit - currentRequests - 1,
      retryAfter: 0,
      resetTime: data.resetTime
    }
  }

  private async authenticateRequest(request: APIRequest): Promise<AuthResult> {
    this.metrics.authentication.attempts++

    // API Key authentication
    if (this.config.authentication.apiKeys.enabled) {
      const apiKey = request.headers[this.config.authentication.apiKeys.header.toLowerCase()] || 
                     request.query[this.config.authentication.apiKeys.query || 'api_key']

      if (apiKey) {
        const isValid = await this.validateAPIKey(apiKey)
        if (isValid) {
          return { success: true, apiKey, userId: this.extractUserIdFromAPIKey(apiKey) }
        }
      }
    }

    // JWT authentication
    if (this.config.authentication.jwt.enabled) {
      const authHeader = request.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const jwtResult = await this.validateJWT(token)
        if (jwtResult.valid) {
          return { success: true, token, userId: jwtResult.userId }
        }
      }
    }

    return { success: false, message: 'Invalid authentication credentials' }
  }

  private async validateAPIKey(apiKey: string): Promise<boolean> {
    // In production, this would validate against a secure store
    // For now, accept any key that matches a pattern
    return /^vk_[a-zA-Z0-9]{32}$/.test(apiKey)
  }

  private extractUserIdFromAPIKey(apiKey: string): string {
    // Extract user ID from API key (simplified)
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16)
  }

  private async validateJWT(token: string): Promise<JWTValidationResult> {
    try {
      // In production, use proper JWT validation library
      const parts = token.split('.')
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' }
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      const now = Math.floor(Date.now() / 1000)

      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token expired' }
      }

      return { valid: true, userId: payload.sub || payload.userId }
    } catch (error) {
      return { valid: false, error: 'Token validation failed' }
    }
  }

  private findEndpoint(request: APIRequest): APIEndpoint | undefined {
    for (const endpoint of this.endpoints.values()) {
      if (this.matchesEndpoint(request, endpoint)) {
        return endpoint
      }
    }
    return undefined
  }

  private matchesEndpoint(request: APIRequest, endpoint: APIEndpoint): boolean {
    // Method match
    if (request.method !== endpoint.method) {
      return false
    }

    // Path match (simplified - in production use proper path matching)
    if (!this.pathMatches(request.path, endpoint.path)) {
      return false
    }

    // Version match
    const requestVersion = this.extractVersion(request)
    if (requestVersion && requestVersion !== endpoint.version) {
      return false
    }

    return true
  }

  private pathMatches(requestPath: string, endpointPath: string): boolean {
    // Simple path matching - in production use proper path-to-regexp
    const requestSegments = requestPath.split('/').filter(s => s)
    const endpointSegments = endpointPath.split('/').filter(s => s)

    if (requestSegments.length !== endpointSegments.length) {
      return false
    }

    for (let i = 0; i < requestSegments.length; i++) {
      const requestSegment = requestSegments[i]
      const endpointSegment = endpointSegments[i]

      if (endpointSegment.startsWith(':')) {
        // Parameter segment, always matches
        continue
      }

      if (requestSegment !== endpointSegment) {
        return false
      }
    }

    return true
  }

  private extractVersion(request: APIRequest): string | undefined {
    const config = this.config.versioning
    if (!config.enabled) {
      return config.defaultVersion
    }

    switch (config.strategy) {
      case 'header':
        return request.headers[config.headerName?.toLowerCase() || 'api-version']
      case 'query':
        return request.query[config.queryParam || 'version']
      case 'path':
        const pathMatch = request.path.match(/^\/(v\d+)\//)
        return pathMatch ? pathMatch[1] : undefined
      case 'accept_header':
        const accept = request.headers['accept']
        const versionMatch = accept?.match(/application\/vnd\.api\.(v\d+)\+json/)
        return versionMatch ? versionMatch[1] : undefined
      default:
        return config.defaultVersion
    }
  }

  private async authorizeRequest(request: APIRequest, endpoint: APIEndpoint): Promise<AuthzResult> {
    if (!endpoint.authorization) {
      return { allowed: true }
    }

    for (const rule of endpoint.authorization) {
      const hasPermission = await this.checkAuthorizationRule(request, rule)
      if (!hasPermission && rule.required) {
        return { allowed: false, message: `Missing required ${rule.type}: ${rule.value}` }
      }
    }

    return { allowed: true }
  }

  private async checkAuthorizationRule(request: APIRequest, rule: AuthorizationRule): Promise<boolean> {
    // Simplified authorization check - in production integrate with proper RBAC
    switch (rule.type) {
      case 'scope':
        return this.hasScope(request, rule.value)
      case 'role':
        return this.hasRole(request, rule.value)
      case 'permission':
        return this.hasPermission(request, rule.value)
      default:
        return true
    }
  }

  private hasScope(request: APIRequest, scope: string): boolean {
    // Extract scopes from token or API key
    // For now, assume all authenticated requests have basic scopes
    return request.apiKey !== undefined || request.headers['authorization'] !== undefined
  }

  private hasRole(request: APIRequest, role: string): boolean {
    // Extract role from user context
    // For now, assume authenticated users have 'user' role
    return (request.userId !== undefined) && (role === 'user' || role === 'admin')
  }

  private hasPermission(request: APIRequest, permission: string): boolean {
    // Check specific permissions
    // For now, assume authenticated users have basic permissions
    return request.userId !== undefined && permission.startsWith('transcription:')
  }

  private async validateRequest(request: APIRequest, endpoint: APIEndpoint): Promise<ValidationResult> {
    if (!endpoint.validation) {
      return { valid: true, errors: [] }
    }

    const errors: string[] = []

    // Validate request schema
    if (endpoint.validation.requestSchema && request.body) {
      const schemaErrors = this.validateAgainstSchema(request.body, endpoint.validation.requestSchema)
      errors.push(...schemaErrors)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private validateAgainstSchema(data: any, schema: any): string[] {
    const errors: string[] = []
    
    // Basic schema validation - in production use proper JSON schema validator
    if (schema.type === 'object' && schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties as any)) {
        if (schema.required?.includes(prop) && !(prop in data)) {
          errors.push(`Missing required property: ${prop}`)
        }
        
        if (prop in data) {
          const propValue = data[prop]
          const propSchemaObj = propSchema as any
          
          if (propSchemaObj.type === 'string' && typeof propValue !== 'string') {
            errors.push(`Property ${prop} must be a string`)
          }
          
          if (propSchemaObj.enum && !propSchemaObj.enum.includes(propValue)) {
            errors.push(`Property ${prop} must be one of: ${propSchemaObj.enum.join(', ')}`)
          }
        }
      }
    }
    
    return errors
  }

  private async transformRequest(request: APIRequest): Promise<void> {
    for (const rule of this.config.transformation.requestTransforms) {
      if (!rule.enabled) continue
      
      const conditionsMet = rule.conditions.every(condition => this.evaluateCondition(condition, request))
      if (conditionsMet) {
        for (const action of rule.actions) {
          await this.applyTransformAction(action, request)
        }
      }
    }
  }

  private async transformResponse(response: APIResponse): Promise<void> {
    for (const rule of this.config.transformation.responseTransforms) {
      if (!rule.enabled) continue
      
      // Apply response transformations
      for (const action of rule.actions) {
        await this.applyResponseTransformAction(action, response)
      }
    }
  }

  private evaluateCondition(condition: TransformCondition, request: APIRequest): boolean {
    let value: any

    switch (condition.type) {
      case 'path':
        value = request.path
        break
      case 'method':
        value = request.method
        break
      case 'header':
        value = request.headers[condition.value.toLowerCase()]
        break
      case 'query':
        value = request.query[condition.value]
        break
      case 'version':
        value = this.extractVersion(request)
        break
      default:
        return false
    }

    switch (condition.operator) {
      case 'equals':
        return condition.caseSensitive ? value === condition.value : 
               value?.toString().toLowerCase() === condition.value?.toString().toLowerCase()
      case 'contains':
        return value?.toString().includes(condition.value)
      case 'matches':
        return new RegExp(condition.value).test(value)
      case 'exists':
        return value !== undefined && value !== null
      case 'not_exists':
        return value === undefined || value === null
      default:
        return false
    }
  }

  private async applyTransformAction(action: TransformAction, request: APIRequest): Promise<void> {
    switch (action.type) {
      case 'add_header':
        request.headers[action.target] = action.value
        break
      case 'remove_header':
        delete request.headers[action.target]
        break
      case 'modify_header':
        if (request.headers[action.target]) {
          request.headers[action.target] = action.value
        }
        break
      case 'add_query':
        request.query[action.target] = action.value
        break
      case 'remove_query':
        delete request.query[action.target]
        break
      case 'modify_body':
        if (request.body && typeof request.body === 'object') {
          request.body[action.target] = action.value
        }
        break
    }
  }

  private async applyResponseTransformAction(action: TransformAction, response: APIResponse): Promise<void> {
    switch (action.type) {
      case 'add_header':
        response.headers[action.target] = action.value
        break
      case 'remove_header':
        delete response.headers[action.target]
        break
      case 'modify_header':
        if (response.headers[action.target]) {
          response.headers[action.target] = action.value
        }
        break
    }
    
    response.transformed = true
  }

  private async executeEndpoint(request: APIRequest, endpoint: APIEndpoint): Promise<APIResponse> {
    const startTime = Date.now()

    try {
      switch (endpoint.handler.type) {
        case 'function':
          return await this.executeFunctionHandler(request, endpoint)
        case 'proxy':
          return await this.executeProxyHandler(request, endpoint)
        case 'static':
          return await this.executeStaticHandler(request, endpoint)
        case 'redirect':
          return await this.executeRedirectHandler(request, endpoint)
        default:
          throw new Error(`Unknown handler type: ${endpoint.handler.type}`)
      }
    } catch (error) {
      throw new Error(`Endpoint execution failed: ${error.message}`)
    }
  }

  private async executeFunctionHandler(request: APIRequest, endpoint: APIEndpoint): Promise<APIResponse> {
    const response: APIResponse = {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      timestamp: new Date(),
      duration: 0,
      cached: false,
      transformed: false,
      metadata: {}
    }

    switch (endpoint.handler.target) {
      case 'healthCheck':
        response.body = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: this.state.uptime,
          version: this.state.version
        }
        break
      
      case 'getMetrics':
        response.body = this.getMetricsSnapshot()
        break
      
      default:
        response.status = 404
        response.body = { error: 'Handler not found' }
    }

    response.duration = Date.now() - response.timestamp.getTime()
    return response
  }

  private async executeProxyHandler(request: APIRequest, endpoint: APIEndpoint): Promise<APIResponse> {
    // Simulate proxy request - in production use actual HTTP client
    const response: APIResponse = {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      timestamp: new Date(),
      duration: 0,
      cached: false,
      transformed: false,
      metadata: { proxied: true, target: endpoint.handler.target }
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

    if (endpoint.id === 'transcription') {
      response.body = {
        text: 'Transcribed text from audio',
        confidence: 0.95,
        duration: 2.5,
        model: request.body?.model || 'whisper-base',
        language: request.body?.language || 'en'
      }
    } else {
      response.body = { message: 'Proxied response' }
    }

    response.duration = Date.now() - response.timestamp.getTime()
    return response
  }

  private async executeStaticHandler(request: APIRequest, endpoint: APIEndpoint): Promise<APIResponse> {
    return {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Static content',
      timestamp: new Date(),
      duration: 1,
      cached: false,
      transformed: false,
      metadata: {}
    }
  }

  private async executeRedirectHandler(request: APIRequest, endpoint: APIEndpoint): Promise<APIResponse> {
    return {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 302,
      headers: { 'Location': endpoint.handler.target },
      timestamp: new Date(),
      duration: 1,
      cached: false,
      transformed: false,
      metadata: {}
    }
  }

  private createErrorResponse(requestId: string, status: number, message: string, headers: { [key: string]: string } = {}): APIResponse {
    return {
      id: crypto.randomUUID(),
      requestId,
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: { error: message, timestamp: new Date().toISOString() },
      timestamp: new Date(),
      duration: 0,
      cached: false,
      transformed: false,
      metadata: {}
    }
  }

  private updateRequestMetrics(request: APIRequest): void {
    this.metrics.requests.total++
    this.metrics.requests.byMethod[request.method] = (this.metrics.requests.byMethod[request.method] || 0) + 1
    this.metrics.requests.byPath[request.path] = (this.metrics.requests.byPath[request.path] || 0) + 1
    
    if (request.version) {
      this.metrics.requests.byVersion[request.version] = (this.metrics.requests.byVersion[request.version] || 0) + 1
    }
    
    if (request.userAgent) {
      this.metrics.requests.byUserAgent[request.userAgent] = (this.metrics.requests.byUserAgent[request.userAgent] || 0) + 1
    }
  }

  private updateResponseMetrics(response: APIResponse, duration: number): void {
    this.metrics.responses.total++
    this.metrics.responses.byStatus[response.status.toString()] = (this.metrics.responses.byStatus[response.status.toString()] || 0) + 1
    
    // Update response time metrics
    const responseTimesKey = `response_times`
    if (!this.metrics.performance.latency) {
      this.metrics.performance.latency = {
        min: duration,
        max: duration,
        avg: duration,
        median: duration,
        p95: duration,
        p99: duration,
        p999: duration
      }
    } else {
      this.metrics.performance.latency.min = Math.min(this.metrics.performance.latency.min, duration)
      this.metrics.performance.latency.max = Math.max(this.metrics.performance.latency.max, duration)
      this.metrics.performance.latency.avg = (this.metrics.performance.latency.avg + duration) / 2
    }

    // Calculate success/error rates
    const successCount = Object.entries(this.metrics.responses.byStatus)
      .filter(([status]) => status.startsWith('2'))
      .reduce((sum, [, count]) => sum + count, 0)
    
    this.metrics.responses.successRate = (successCount / this.metrics.responses.total) * 100
    this.metrics.responses.errorRate = 100 - this.metrics.responses.successRate
  }

  private getCircuitBreakerState(endpointId: string): CircuitBreakerState {
    let state = this.circuitBreakers.get(endpointId)
    if (!state) {
      state = {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        lastSuccess: null,
        nextAttempt: null
      }
      this.circuitBreakers.set(endpointId, state)
    }
    return state
  }

  private updateCircuitBreaker(endpointId: string, success: boolean): void {
    const state = this.getCircuitBreakerState(endpointId)
    const now = new Date()

    if (success) {
      state.lastSuccess = now
      state.failures = 0
      
      if (state.state === 'half_open') {
        state.state = 'closed'
      }
    } else {
      state.lastFailure = now
      state.failures++

      if (state.failures >= this.config.circuitBreaker.failureThreshold) {
        state.state = 'open'
        state.nextAttempt = new Date(now.getTime() + this.config.circuitBreaker.resetTimeout * 1000)
      }
    }

    // Check if circuit should move to half-open
    if (state.state === 'open' && state.nextAttempt && now >= state.nextAttempt) {
      state.state = 'half_open'
    }
  }

  private getMetricsSnapshot(): APIMetrics {
    return JSON.parse(JSON.stringify(this.metrics))
  }

  private async startMetricsCollection(): Promise<void> {
    this.metricsInterval = setInterval(() => {
      try {
        this.updateTimeBasedMetrics()
      } catch (error) {
        console.error('Metrics collection error:', error)
      }
    }, 1000) // Update every second
  }

  private updateTimeBasedMetrics(): void {
    const now = Date.now()
    
    // Update uptime
    this.state.uptime = Math.floor((now - this.state.lastRestart.getTime()) / 1000)
    
    // Calculate rates
    const timePeriods = {
      second: 1000,
      minute: 60000,
      hour: 3600000
    }
    
    // This is simplified - in production you'd maintain time-series data
    this.metrics.requests.perSecond = this.calculateRate(this.metrics.requests.total, timePeriods.second)
    this.metrics.requests.perMinute = this.calculateRate(this.metrics.requests.total, timePeriods.minute)
    this.metrics.requests.perHour = this.calculateRate(this.metrics.requests.total, timePeriods.hour)
  }

  private calculateRate(total: number, periodMs: number): number {
    // Simplified rate calculation - in production use proper time-series
    const elapsedMs = Date.now() - this.state.lastRestart.getTime()
    const periods = elapsedMs / periodMs
    return periods > 0 ? total / periods : 0
  }

  private async startCleanupTask(): Promise<void> {
    this.cleanupInterval = setInterval(() => {
      try {
        this.performCleanup()
      } catch (error) {
        console.error('Cleanup task error:', error)
      }
    }, 300000) // Every 5 minutes
  }

  private performCleanup(): void {
    const now = Date.now()
    const maxAge = 3600000 // 1 hour

    // Clean old requests
    for (const [id, request] of this.requests) {
      if (now - request.timestamp.getTime() > maxAge) {
        this.requests.delete(id)
      }
    }

    // Clean old responses
    for (const [id, response] of this.responses) {
      if (now - response.timestamp.getTime() > maxAge) {
        this.responses.delete(id)
      }
    }

    // Clean rate limit data
    for (const [key, data] of this.rateLimitStore) {
      const windowStart = now - (this.config.rateLimiting.defaultLimits.period * 1000)
      data.requests = data.requests.filter(time => time > windowStart)
      
      if (data.requests.length === 0 && data.blocked === 0) {
        this.rateLimitStore.delete(key)
      }
    }
  }

  private async startHealthChecks(): Promise<void> {
    if (!this.config.circuitBreaker.healthCheck?.enabled) return

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks()
      } catch (error) {
        console.error('Health check error:', error)
      }
    }, (this.config.circuitBreaker.healthCheck.interval || 30) * 1000)
  }

  private async performHealthChecks(): Promise<void> {
    const results: HealthCheckResult[] = []

    // Self health check
    results.push({
      service: 'api-gateway',
      status: 'healthy',
      lastCheck: new Date(),
      duration: 1,
      message: 'API Gateway is running'
    })

    // Check endpoint health
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.internal) continue

      const result: HealthCheckResult = {
        service: endpoint.id,
        status: 'healthy',
        lastCheck: new Date(),
        duration: 0
      }

      const circuitState = this.getCircuitBreakerState(endpoint.id)
      if (circuitState.state === 'open') {
        result.status = 'unhealthy'
        result.message = 'Circuit breaker open'
      } else if (circuitState.state === 'half_open') {
        result.status = 'degraded'
        result.message = 'Circuit breaker half-open'
      }

      results.push(result)
    }

    this.state.healthChecks = results
    this.emit('healthCheckCompleted', results)
  }

  async getEndpoint(id: string): Promise<APIEndpoint | undefined> {
    return this.endpoints.get(id)
  }

  async getAllEndpoints(): Promise<APIEndpoint[]> {
    return Array.from(this.endpoints.values())
  }

  async addEndpoint(endpoint: APIEndpoint): Promise<void> {
    this.endpoints.set(endpoint.id, endpoint)
    this.state.endpoints = this.endpoints.size
    this.emit('endpointAdded', endpoint)
  }

  async removeEndpoint(id: string): Promise<boolean> {
    const removed = this.endpoints.delete(id)
    if (removed) {
      this.state.endpoints = this.endpoints.size
      this.emit('endpointRemoved', id)
    }
    return removed
  }

  async getMetrics(): Promise<APIMetrics> {
    return this.getMetricsSnapshot()
  }

  async getState(): Promise<APIGatewayState> {
    return { ...this.state }
  }

  async getConfiguration(): Promise<APIGatewayConfig> {
    return JSON.parse(JSON.stringify(this.config))
  }

  async updateConfiguration(config: Partial<APIGatewayConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfiguration()
    this.emit('configurationUpdated', this.config)
  }

  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'config.json')
    await fs.writeFile(configFile, JSON.stringify(this.config, null, 2))
  }

  async destroy(): Promise<void> {
    this.state.status = 'stopping'

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.state.status = 'stopped'
    this.removeAllListeners()
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

interface RateLimitData {
  requests: number[]
  blocked: number
  resetTime: Date
}

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfter: number
  resetTime: Date
}

interface AuthResult {
  success: boolean
  message?: string
  userId?: string
  apiKey?: string
  token?: string
}

interface JWTValidationResult {
  valid: boolean
  userId?: string
  error?: string
}

interface AuthzResult {
  allowed: boolean
  message?: string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open'
  failures: number
  lastFailure: Date | null
  lastSuccess: Date | null
  nextAttempt: Date | null
}

export const apiGatewayService = new APIGatewayService()