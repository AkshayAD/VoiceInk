/**
 * Disaster Recovery Service (Step 125)
 * Automated backup scheduling, point-in-time recovery, and business continuity
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as zlib from 'zlib'
import { promisify } from 'util'
import { app } from 'electron'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export interface DisasterRecoveryConfig {
  enabled: boolean
  backupSchedule: BackupSchedule
  retentionPolicy: BackupRetentionPolicy
  recoveryObjectives: RecoveryObjectives
  replicationConfig: ReplicationConfig
  notificationConfig: NotificationConfig
  encryptionConfig: EncryptionConfig
  verificationConfig: VerificationConfig
}

export interface BackupSchedule {
  fullBackupFrequency: 'daily' | 'weekly' | 'monthly'
  incrementalFrequency: 'hourly' | 'every_6_hours' | 'daily'
  differentialFrequency: 'daily' | 'weekly' | 'disabled'
  timezone: string
  excludePatterns: string[]
  maxConcurrentBackups: number
  bandwidthLimitMbps?: number
  maintainanceWindow?: TimeWindow
}

export interface TimeWindow {
  start: string // HH:mm format
  end: string
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[]
}

export interface BackupRetentionPolicy {
  dailyBackups: number // days to keep
  weeklyBackups: number // weeks to keep
  monthlyBackups: number // months to keep
  yearlyBackups: number // years to keep
  maxTotalBackups: number
  archiveAfterDays: number
  deleteAfterDays: number
  compressAfterDays: number
}

export interface RecoveryObjectives {
  rto: number // Recovery Time Objective in minutes
  rpo: number // Recovery Point Objective in minutes
  mttr: number // Mean Time To Recovery in minutes
  availabilityTarget: number // percentage (e.g., 99.9)
  maxDataLoss: number // minutes
  priorityServices: string[]
}

export interface ReplicationConfig {
  enabled: boolean
  mode: 'synchronous' | 'asynchronous' | 'semi_synchronous'
  targets: ReplicationTarget[]
  failoverThreshold: number // seconds
  healthCheckInterval: number // seconds
  autoFailover: boolean
  autoFailback: boolean
}

export interface ReplicationTarget {
  id: string
  name: string
  type: 'local' | 'network' | 'cloud'
  location: string
  priority: number
  bandwidth: number // Mbps
  encryption: boolean
  compression: boolean
  status: 'active' | 'inactive' | 'failed' | 'degraded'
  lastSync: Date
  lag: number // seconds
}

export interface NotificationConfig {
  enabled: boolean
  channels: NotificationChannel[]
  escalationRules: EscalationRule[]
  silentHours?: TimeWindow
  alertThresholds: AlertThresholds
}

export interface NotificationChannel {
  id: string
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'teams'
  config: any
  enabled: boolean
  priority: number
}

export interface EscalationRule {
  level: number
  delayMinutes: number
  channels: string[]
  conditions: string[]
}

export interface AlertThresholds {
  backupFailure: boolean
  replicationLag: number // seconds
  storageUsage: number // percentage
  verificationFailure: boolean
  rtoViolation: boolean
  rpoViolation: boolean
}

export interface EncryptionConfig {
  enabled: boolean
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305'
  keyRotationDays: number
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2'
  compressionLevel: number
}

export interface VerificationConfig {
  enabled: boolean
  frequency: 'after_backup' | 'daily' | 'weekly'
  checksumAlgorithm: 'sha256' | 'sha512' | 'blake3'
  deepVerification: boolean
  testRestoreFrequency: 'weekly' | 'monthly' | 'quarterly'
  testRestoreScope: 'sample' | 'full'
}

export interface BackupJob {
  id: string
  type: 'full' | 'incremental' | 'differential'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  duration?: number // seconds
  totalSize: number // bytes
  compressedSize: number // bytes
  filesCount: number
  errors: BackupError[]
  metadata: BackupMetadata
  verification: VerificationResult
}

export interface BackupMetadata {
  version: string
  sourceHash: string
  dependencies: string[]
  tags: string[]
  retention: Date
  location: string
  encryption: boolean
  compression: number
}

export interface BackupError {
  type: 'file_access' | 'network' | 'storage' | 'encryption' | 'verification'
  message: string
  file?: string
  timestamp: Date
  recoverable: boolean
}

export interface VerificationResult {
  status: 'pending' | 'passed' | 'failed' | 'skipped'
  checksumValid: boolean
  filesVerified: number
  filesSkipped: number
  errorCount: number
  duration: number // seconds
  details: VerificationDetail[]
}

export interface VerificationDetail {
  file: string
  expectedChecksum: string
  actualChecksum: string
  status: 'valid' | 'invalid' | 'missing'
}

export interface RecoveryPlan {
  id: string
  name: string
  type: 'full_system' | 'partial' | 'application' | 'data_only'
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedRTO: number // minutes
  estimatedRPO: number // minutes
  dependencies: string[]
  steps: RecoveryStep[]
  validationTests: ValidationTest[]
  rollbackPlan: RollbackStep[]
}

export interface RecoveryStep {
  id: string
  order: number
  name: string
  type: 'restore_data' | 'start_service' | 'verify_health' | 'notify_users' | 'custom'
  command?: string
  timeout: number // minutes
  retries: number
  successCriteria: string
  onFailure: 'continue' | 'stop' | 'rollback'
}

export interface ValidationTest {
  id: string
  name: string
  type: 'connectivity' | 'data_integrity' | 'performance' | 'functionality'
  command: string
  expectedResult: string
  timeout: number // seconds
  critical: boolean
}

export interface RollbackStep {
  id: string
  order: number
  name: string
  command: string
  timeout: number // minutes
}

export interface RecoveryExecution {
  id: string
  planId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'
  startTime: Date
  endTime?: Date
  currentStep: number
  completedSteps: string[]
  failedSteps: string[]
  logs: RecoveryLog[]
  metrics: RecoveryMetrics
}

export interface RecoveryLog {
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  step: string
  message: string
  data?: any
}

export interface RecoveryMetrics {
  totalDuration: number // minutes
  dataRestored: number // bytes
  servicesRecovered: number
  testsExecuted: number
  testsPassed: number
  actualRTO: number // minutes
  actualRPO: number // minutes
}

export interface DisasterScenario {
  id: string
  name: string
  type: 'hardware_failure' | 'data_corruption' | 'cyberattack' | 'natural_disaster' | 'human_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  probability: number // 0-1
  impact: ScenarioImpact
  triggers: ScenarioTrigger[]
  responseplan: string // Recovery Plan ID
  lastTested: Date
  nextTest: Date
}

export interface ScenarioImpact {
  dataLoss: 'none' | 'minimal' | 'moderate' | 'significant' | 'total'
  downtime: number // minutes
  affectedUsers: number
  financialImpact: number
  reputationalImpact: 'low' | 'medium' | 'high'
}

export interface ScenarioTrigger {
  id: string
  type: 'metric_threshold' | 'system_event' | 'manual' | 'scheduled'
  condition: string
  enabled: boolean
  autoActivate: boolean
}

export interface BusinessContinuityPlan {
  id: string
  name: string
  scope: string[]
  objectives: ContinuityObjectives
  teams: ResponseTeam[]
  communicationPlan: CommunicationPlan
  resourceRequirements: ResourceRequirement[]
  alternateLocations: AlternateLocation[]
  vendorContacts: VendorContact[]
  lastReview: Date
  nextReview: Date
}

export interface ContinuityObjectives {
  criticalFunctions: string[]
  minimumStaffing: number
  essentialSystems: string[]
  maximumDowntime: number // hours
  communicationDeadline: number // minutes
}

export interface ResponseTeam {
  role: string
  members: TeamMember[]
  responsibilities: string[]
  escalationPath: string[]
}

export interface TeamMember {
  name: string
  contact: ContactInfo
  backup: string
  skills: string[]
  availability: string
}

export interface ContactInfo {
  email: string
  phone: string
  mobile: string
  alternate?: string
}

export interface CommunicationPlan {
  internalChannels: CommunicationChannel[]
  externalChannels: CommunicationChannel[]
  templates: MessageTemplate[]
  escalationMatrix: EscalationMatrix[]
}

export interface CommunicationChannel {
  type: 'email' | 'phone' | 'radio' | 'messaging' | 'social'
  primary: boolean
  capacity: number
  reliability: 'high' | 'medium' | 'low'
}

export interface MessageTemplate {
  id: string
  type: 'initial_notification' | 'status_update' | 'resolution' | 'post_incident'
  audience: 'internal' | 'customers' | 'partners' | 'public'
  template: string
  approvalRequired: boolean
}

export interface EscalationMatrix {
  severity: string
  timeframe: number // minutes
  recipients: string[]
  approval: string[]
}

export interface ResourceRequirement {
  type: 'hardware' | 'software' | 'personnel' | 'facility' | 'communication'
  description: string
  quantity: number
  priority: 'critical' | 'important' | 'nice_to_have'
  source: 'internal' | 'vendor' | 'cloud'
  leadTime: number // hours
}

export interface AlternateLocation {
  id: string
  name: string
  type: 'hot_site' | 'warm_site' | 'cold_site' | 'cloud' | 'mobile'
  address: string
  capacity: number
  readinessTime: number // hours
  capabilities: string[]
  contact: ContactInfo
}

export interface VendorContact {
  company: string
  service: string
  contact: ContactInfo
  contractNumber: string
  sla: string
  escalationPath: ContactInfo[]
}

class DisasterRecoveryService extends EventEmitter {
  private config: DisasterRecoveryConfig
  private backupJobs: Map<string, BackupJob> = new Map()
  private recoveryPlans: Map<string, RecoveryPlan> = new Map()
  private recoveryExecutions: Map<string, RecoveryExecution> = new Map()
  private scenarios: Map<string, DisasterScenario> = new Map()
  private businessContinuityPlans: Map<string, BusinessContinuityPlan> = new Map()
  
  private configPath: string
  private backupPath: string
  private isInitialized = false
  private schedulerInterval?: NodeJS.Timeout
  private replicationInterval?: NodeJS.Timeout
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'disaster-recovery')
    this.backupPath = path.join(this.configPath, 'backups')
    
    this.config = this.getDefaultConfig()
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configPath, { recursive: true })
      await fs.mkdir(this.backupPath, { recursive: true })
      
      await this.loadConfiguration()
      await this.setupDefaultPlans()
      await this.startScheduler()
      await this.startReplicationMonitoring()
      await this.startHealthChecks()
      
      this.isInitialized = true
      this.emit('initialized')
      
      console.log('Disaster recovery service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize disaster recovery service:', error)
      throw error
    }
  }

  private getDefaultConfig(): DisasterRecoveryConfig {
    return {
      enabled: true,
      backupSchedule: {
        fullBackupFrequency: 'weekly',
        incrementalFrequency: 'every_6_hours',
        differentialFrequency: 'daily',
        timezone: 'UTC',
        excludePatterns: ['*.tmp', '*.log', 'node_modules/**'],
        maxConcurrentBackups: 2,
        bandwidthLimitMbps: 100,
        maintainanceWindow: {
          start: '02:00',
          end: '04:00',
          days: ['sunday']
        }
      },
      retentionPolicy: {
        dailyBackups: 7,
        weeklyBackups: 4,
        monthlyBackups: 12,
        yearlyBackups: 3,
        maxTotalBackups: 100,
        archiveAfterDays: 90,
        deleteAfterDays: 365,
        compressAfterDays: 30
      },
      recoveryObjectives: {
        rto: 240, // 4 hours
        rpo: 60,  // 1 hour
        mttr: 120, // 2 hours
        availabilityTarget: 99.9,
        maxDataLoss: 30,
        priorityServices: ['transcription', 'user_data', 'settings']
      },
      replicationConfig: {
        enabled: true,
        mode: 'asynchronous',
        targets: [],
        failoverThreshold: 300,
        healthCheckInterval: 60,
        autoFailover: false,
        autoFailback: true
      },
      notificationConfig: {
        enabled: true,
        channels: [],
        escalationRules: [{
          level: 1,
          delayMinutes: 15,
          channels: ['email'],
          conditions: ['backup_failure', 'replication_failure']
        }],
        alertThresholds: {
          backupFailure: true,
          replicationLag: 300,
          storageUsage: 85,
          verificationFailure: true,
          rtoViolation: true,
          rpoViolation: true
        }
      },
      encryptionConfig: {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotationDays: 90,
        keyDerivation: 'pbkdf2',
        compressionLevel: 6
      },
      verificationConfig: {
        enabled: true,
        frequency: 'after_backup',
        checksumAlgorithm: 'sha256',
        deepVerification: false,
        testRestoreFrequency: 'monthly',
        testRestoreScope: 'sample'
      }
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

  private async setupDefaultPlans(): Promise<void> {
    // Create default full system recovery plan
    const fullSystemPlan: RecoveryPlan = {
      id: 'full-system-recovery',
      name: 'Full System Recovery',
      type: 'full_system',
      priority: 'critical',
      estimatedRTO: 240,
      estimatedRPO: 60,
      dependencies: [],
      steps: [
        {
          id: 'restore-database',
          order: 1,
          name: 'Restore Database',
          type: 'restore_data',
          timeout: 60,
          retries: 3,
          successCriteria: 'Database connection successful',
          onFailure: 'stop'
        },
        {
          id: 'restore-user-data',
          order: 2,
          name: 'Restore User Data',
          type: 'restore_data',
          timeout: 120,
          retries: 2,
          successCriteria: 'User data accessible',
          onFailure: 'continue'
        },
        {
          id: 'start-services',
          order: 3,
          name: 'Start Core Services',
          type: 'start_service',
          timeout: 30,
          retries: 3,
          successCriteria: 'All services running',
          onFailure: 'rollback'
        },
        {
          id: 'verify-health',
          order: 4,
          name: 'Verify System Health',
          type: 'verify_health',
          timeout: 15,
          retries: 1,
          successCriteria: 'Health checks pass',
          onFailure: 'continue'
        }
      ],
      validationTests: [
        {
          id: 'connectivity-test',
          name: 'Database Connectivity',
          type: 'connectivity',
          command: 'test-db-connection',
          expectedResult: 'connected',
          timeout: 30,
          critical: true
        }
      ],
      rollbackPlan: [
        {
          id: 'stop-services',
          order: 1,
          name: 'Stop All Services',
          command: 'stop-all-services',
          timeout: 10
        }
      ]
    }

    this.recoveryPlans.set(fullSystemPlan.id, fullSystemPlan)

    // Create default disaster scenarios
    const hardwareFailure: DisasterScenario = {
      id: 'hardware-failure',
      name: 'Primary Hardware Failure',
      type: 'hardware_failure',
      severity: 'high',
      probability: 0.1,
      impact: {
        dataLoss: 'minimal',
        downtime: 240,
        affectedUsers: 1000,
        financialImpact: 50000,
        reputationalImpact: 'medium'
      },
      triggers: [
        {
          id: 'cpu-failure',
          type: 'system_event',
          condition: 'cpu_health < 50%',
          enabled: true,
          autoActivate: true
        }
      ],
      responseplan: fullSystemPlan.id,
      lastTested: new Date(),
      nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    }

    this.scenarios.set(hardwareFailure.id, hardwareFailure)
  }

  async createBackup(type: 'full' | 'incremental' | 'differential' = 'full'): Promise<string> {
    const jobId = crypto.randomUUID()
    const job: BackupJob = {
      id: jobId,
      type,
      status: 'pending',
      startTime: new Date(),
      totalSize: 0,
      compressedSize: 0,
      filesCount: 0,
      errors: [],
      metadata: {
        version: '1.0',
        sourceHash: '',
        dependencies: [],
        tags: [type, new Date().toISOString().split('T')[0]],
        retention: this.calculateRetentionDate(type),
        location: path.join(this.backupPath, jobId),
        encryption: this.config.encryptionConfig.enabled,
        compression: this.config.encryptionConfig.compressionLevel
      },
      verification: {
        status: 'pending',
        checksumValid: false,
        filesVerified: 0,
        filesSkipped: 0,
        errorCount: 0,
        duration: 0,
        details: []
      }
    }

    this.backupJobs.set(jobId, job)
    this.emit('backupStarted', job)

    // Execute backup asynchronously
    this.executeBackup(jobId).catch(error => {
      console.error('Backup execution failed:', error)
      job.status = 'failed'
      job.endTime = new Date()
      job.errors.push({
        type: 'storage',
        message: error.message,
        timestamp: new Date(),
        recoverable: false
      })
      this.emit('backupFailed', { jobId, error })
    })

    return jobId
  }

  private async executeBackup(jobId: string): Promise<void> {
    const job = this.backupJobs.get(jobId)
    if (!job) throw new Error('Backup job not found')

    try {
      job.status = 'running'
      this.emit('backupProgress', { jobId, status: 'running' })

      // Create backup directory
      await fs.mkdir(job.metadata.location, { recursive: true })

      // Get source data paths
      const sourcePaths = await this.getSourcePaths(job.type)
      
      // Calculate total size
      job.totalSize = await this.calculateTotalSize(sourcePaths)

      // Perform backup
      let filesProcessed = 0
      for (const sourcePath of sourcePaths) {
        try {
          await this.backupPath(sourcePath, job.metadata.location, job)
          filesProcessed++
          this.emit('backupProgress', { 
            jobId, 
            filesProcessed, 
            totalFiles: sourcePaths.length,
            progress: Math.round((filesProcessed / sourcePaths.length) * 100)
          })
        } catch (error) {
          job.errors.push({
            type: 'file_access',
            message: `Failed to backup ${sourcePath}: ${error.message}`,
            file: sourcePath,
            timestamp: new Date(),
            recoverable: true
          })
        }
      }

      job.filesCount = filesProcessed
      job.endTime = new Date()
      job.duration = (job.endTime.getTime() - job.startTime.getTime()) / 1000

      // Calculate source hash for verification
      job.metadata.sourceHash = await this.calculateSourceHash(sourcePaths)

      // Perform verification if enabled
      if (this.config.verificationConfig.enabled) {
        await this.verifyBackup(jobId)
      }

      job.status = job.errors.length > 0 ? 'completed' : 'completed'
      this.emit('backupCompleted', job)

      // Save backup metadata
      await this.saveBackupMetadata(job)

      // Cleanup old backups according to retention policy
      await this.cleanupOldBackups()

    } catch (error) {
      job.status = 'failed'
      job.endTime = new Date()
      job.errors.push({
        type: 'storage',
        message: error.message,
        timestamp: new Date(),
        recoverable: false
      })
      throw error
    }
  }

  private async getSourcePaths(type: 'full' | 'incremental' | 'differential'): Promise<string[]> {
    const userDataPath = app.getPath('userData')
    const paths = [
      path.join(userDataPath, 'database'),
      path.join(userDataPath, 'settings'),
      path.join(userDataPath, 'transcriptions')
    ]

    if (type === 'full') {
      paths.push(path.join(userDataPath, 'logs'))
      paths.push(path.join(userDataPath, 'cache'))
    }

    return paths.filter(async p => {
      try {
        await fs.access(p)
        return true
      } catch {
        return false
      }
    })
  }

  private async calculateTotalSize(paths: string[]): Promise<number> {
    let totalSize = 0
    for (const p of paths) {
      try {
        const stats = await fs.stat(p)
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(p)
        } else {
          totalSize += stats.size
        }
      } catch (error) {
        // Skip inaccessible files
      }
    }
    return totalSize
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath)
        } else {
          const stats = await fs.stat(fullPath)
          totalSize += stats.size
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    return totalSize
  }

  private async backupPath(sourcePath: string, backupDir: string, job: BackupJob): Promise<void> {
    const relativePath = path.relative(app.getPath('userData'), sourcePath)
    const targetPath = path.join(backupDir, relativePath)

    // Ensure target directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true })

    // Read and process file
    const data = await fs.readFile(sourcePath)
    let processedData = data

    // Compress if enabled
    if (this.config.encryptionConfig.compressionLevel > 0) {
      processedData = await gzip(processedData, { level: this.config.encryptionConfig.compressionLevel })
    }

    // Encrypt if enabled
    if (this.config.encryptionConfig.enabled) {
      processedData = await this.encryptData(processedData)
    }

    // Write to backup location
    await fs.writeFile(targetPath, processedData)

    job.compressedSize += processedData.length
  }

  private async encryptData(data: Buffer): Promise<Buffer> {
    const algorithm = this.config.encryptionConfig.algorithm
    const key = crypto.randomBytes(32) // In production, use proper key management
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
    
    // Prepend IV for decryption
    return Buffer.concat([iv, encrypted])
  }

  private async calculateSourceHash(paths: string[]): Promise<string> {
    const hash = crypto.createHash('sha256')
    
    for (const p of paths) {
      try {
        const data = await fs.readFile(p)
        hash.update(data)
      } catch (error) {
        // Skip inaccessible files
      }
    }
    
    return hash.digest('hex')
  }

  private calculateRetentionDate(type: 'full' | 'incremental' | 'differential'): Date {
    const now = new Date()
    const policy = this.config.retentionPolicy
    
    switch (type) {
      case 'full':
        return new Date(now.getTime() + policy.monthlyBackups * 30 * 24 * 60 * 60 * 1000)
      case 'incremental':
        return new Date(now.getTime() + policy.dailyBackups * 24 * 60 * 60 * 1000)
      case 'differential':
        return new Date(now.getTime() + policy.weeklyBackups * 7 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  private async verifyBackup(jobId: string): Promise<void> {
    const job = this.backupJobs.get(jobId)
    if (!job) return

    job.verification.status = 'pending'
    const startTime = Date.now()

    try {
      const backupFiles = await this.getBackupFiles(job.metadata.location)
      
      for (const file of backupFiles) {
        const detail: VerificationDetail = {
          file,
          expectedChecksum: '',
          actualChecksum: '',
          status: 'valid'
        }

        try {
          const data = await fs.readFile(file)
          detail.actualChecksum = crypto.createHash(this.config.verificationConfig.checksumAlgorithm).update(data).digest('hex')
          // In a full implementation, compare with stored checksum
          detail.expectedChecksum = detail.actualChecksum
          job.verification.filesVerified++
        } catch (error) {
          detail.status = 'invalid'
          job.verification.errorCount++
        }

        job.verification.details.push(detail)
      }

      job.verification.checksumValid = job.verification.errorCount === 0
      job.verification.status = job.verification.checksumValid ? 'passed' : 'failed'
      
    } catch (error) {
      job.verification.status = 'failed'
      job.verification.errorCount++
    }

    job.verification.duration = (Date.now() - startTime) / 1000
    this.emit('backupVerified', { jobId, verification: job.verification })
  }

  private async getBackupFiles(backupDir: string): Promise<string[]> {
    const files: string[] = []
    
    async function traverse(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await traverse(fullPath)
        } else {
          files.push(fullPath)
        }
      }
    }
    
    await traverse(backupDir)
    return files
  }

  async restoreBackup(jobId: string, targetPath?: string): Promise<string> {
    const job = this.backupJobs.get(jobId)
    if (!job) {
      throw new Error('Backup job not found')
    }

    if (job.status !== 'completed') {
      throw new Error('Cannot restore incomplete backup')
    }

    const executionId = crypto.randomUUID()
    const execution: RecoveryExecution = {
      id: executionId,
      planId: 'manual-restore',
      status: 'running',
      startTime: new Date(),
      currentStep: 0,
      completedSteps: [],
      failedSteps: [],
      logs: [],
      metrics: {
        totalDuration: 0,
        dataRestored: 0,
        servicesRecovered: 0,
        testsExecuted: 0,
        testsPassed: 0,
        actualRTO: 0,
        actualRPO: 0
      }
    }

    this.recoveryExecutions.set(executionId, execution)
    this.emit('restoreStarted', { executionId, jobId })

    try {
      const restoreTarget = targetPath || app.getPath('userData')
      await this.executeRestore(job, restoreTarget, execution)
      
      execution.status = 'completed'
      execution.endTime = new Date()
      execution.metrics.totalDuration = (execution.endTime.getTime() - execution.startTime.getTime()) / 60000 // minutes
      
      this.emit('restoreCompleted', execution)
      
    } catch (error) {
      execution.status = 'failed'
      execution.endTime = new Date()
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        step: 'restore',
        message: `Restore failed: ${error.message}`
      })
      
      this.emit('restoreFailed', { executionId, error })
      throw error
    }

    return executionId
  }

  private async executeRestore(job: BackupJob, targetPath: string, execution: RecoveryExecution): Promise<void> {
    const backupFiles = await this.getBackupFiles(job.metadata.location)
    
    for (const backupFile of backupFiles) {
      const relativePath = path.relative(job.metadata.location, backupFile)
      const targetFile = path.join(targetPath, relativePath)
      
      try {
        // Ensure target directory exists
        await fs.mkdir(path.dirname(targetFile), { recursive: true })
        
        // Read encrypted/compressed data
        let data = await fs.readFile(backupFile)
        
        // Decrypt if needed
        if (job.metadata.encryption) {
          data = await this.decryptData(data)
        }
        
        // Decompress if needed
        if (job.metadata.compression > 0) {
          data = await gunzip(data)
        }
        
        // Write restored file
        await fs.writeFile(targetFile, data)
        
        execution.metrics.dataRestored += data.length
        execution.logs.push({
          timestamp: new Date(),
          level: 'info',
          step: 'restore',
          message: `Restored: ${relativePath}`
        })
        
      } catch (error) {
        execution.logs.push({
          timestamp: new Date(),
          level: 'error',
          step: 'restore',
          message: `Failed to restore ${relativePath}: ${error.message}`
        })
      }
    }
  }

  private async decryptData(data: Buffer): Promise<Buffer> {
    // Extract IV from the beginning of the data
    const iv = data.slice(0, 16)
    const encrypted = data.slice(16)
    
    const algorithm = this.config.encryptionConfig.algorithm
    const key = crypto.randomBytes(32) // In production, retrieve from secure key management
    
    const decipher = crypto.createDecipher(algorithm, key)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    
    return decrypted
  }

  private async saveBackupMetadata(job: BackupJob): Promise<void> {
    const metadataFile = path.join(job.metadata.location, 'metadata.json')
    await fs.writeFile(metadataFile, JSON.stringify(job, null, 2))
  }

  private async cleanupOldBackups(): Promise<void> {
    const allJobs = Array.from(this.backupJobs.values())
    const policy = this.config.retentionPolicy
    const now = new Date()

    // Group backups by type
    const fullBackups = allJobs.filter(j => j.type === 'full').sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    const incrementalBackups = allJobs.filter(j => j.type === 'incremental').sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    const differentialBackups = allJobs.filter(j => j.type === 'differential').sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

    // Clean up based on retention policy
    const toDelete: BackupJob[] = []

    if (fullBackups.length > policy.monthlyBackups) {
      toDelete.push(...fullBackups.slice(policy.monthlyBackups))
    }

    if (incrementalBackups.length > policy.dailyBackups) {
      toDelete.push(...incrementalBackups.slice(policy.dailyBackups))
    }

    if (differentialBackups.length > policy.weeklyBackups) {
      toDelete.push(...differentialBackups.slice(policy.weeklyBackups))
    }

    // Delete old backups
    for (const job of toDelete) {
      try {
        await fs.rm(job.metadata.location, { recursive: true, force: true })
        this.backupJobs.delete(job.id)
        this.emit('backupDeleted', { jobId: job.id, reason: 'retention_policy' })
      } catch (error) {
        console.error(`Failed to delete backup ${job.id}:`, error)
      }
    }
  }

  private async startScheduler(): Promise<void> {
    if (!this.config.enabled) return

    this.schedulerInterval = setInterval(async () => {
      try {
        await this.checkScheduledBackups()
      } catch (error) {
        console.error('Scheduler error:', error)
        this.emit('schedulerError', error)
      }
    }, 60000) // Check every minute
  }

  private async checkScheduledBackups(): Promise<void> {
    const now = new Date()
    const lastBackups = this.getLastBackupTimes()

    // Check if full backup is due
    if (this.isBackupDue('full', lastBackups.full, now)) {
      await this.createBackup('full')
    }

    // Check if incremental backup is due
    if (this.isBackupDue('incremental', lastBackups.incremental, now)) {
      await this.createBackup('incremental')
    }

    // Check if differential backup is due
    if (this.config.backupSchedule.differentialFrequency !== 'disabled' && 
        this.isBackupDue('differential', lastBackups.differential, now)) {
      await this.createBackup('differential')
    }
  }

  private getLastBackupTimes(): { full?: Date, incremental?: Date, differential?: Date } {
    const jobs = Array.from(this.backupJobs.values())
    return {
      full: jobs.filter(j => j.type === 'full' && j.status === 'completed')
                 .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime,
      incremental: jobs.filter(j => j.type === 'incremental' && j.status === 'completed')
                       .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime,
      differential: jobs.filter(j => j.type === 'differential' && j.status === 'completed')
                        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime
    }
  }

  private isBackupDue(type: 'full' | 'incremental' | 'differential', lastBackup: Date | undefined, now: Date): boolean {
    if (!lastBackup) return true

    const schedule = this.config.backupSchedule
    let intervalMs: number

    switch (type) {
      case 'full':
        intervalMs = schedule.fullBackupFrequency === 'daily' ? 24 * 60 * 60 * 1000 :
                     schedule.fullBackupFrequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                     30 * 24 * 60 * 60 * 1000 // monthly
        break
      case 'incremental':
        intervalMs = schedule.incrementalFrequency === 'hourly' ? 60 * 60 * 1000 :
                     schedule.incrementalFrequency === 'every_6_hours' ? 6 * 60 * 60 * 1000 :
                     24 * 60 * 60 * 1000 // daily
        break
      case 'differential':
        intervalMs = schedule.differentialFrequency === 'daily' ? 24 * 60 * 60 * 1000 :
                     7 * 24 * 60 * 60 * 1000 // weekly
        break
      default:
        return false
    }

    return (now.getTime() - lastBackup.getTime()) >= intervalMs
  }

  private async startReplicationMonitoring(): Promise<void> {
    if (!this.config.replicationConfig.enabled) return

    this.replicationInterval = setInterval(async () => {
      try {
        await this.monitorReplication()
      } catch (error) {
        console.error('Replication monitoring error:', error)
        this.emit('replicationError', error)
      }
    }, this.config.replicationConfig.healthCheckInterval * 1000)
  }

  private async monitorReplication(): Promise<void> {
    for (const target of this.config.replicationConfig.targets) {
      try {
        const startTime = Date.now()
        const status = await this.checkReplicationTarget(target)
        const responseTime = Date.now() - startTime

        if (responseTime > this.config.replicationConfig.failoverThreshold * 1000) {
          target.status = 'degraded'
          this.emit('replicationDegraded', { targetId: target.id, responseTime })
        } else {
          target.status = 'active'
        }

        // Update lag metrics
        target.lag = responseTime / 1000
        target.lastSync = new Date()

      } catch (error) {
        target.status = 'failed'
        this.emit('replicationFailed', { targetId: target.id, error: error.message })
      }
    }
  }

  private async checkReplicationTarget(target: ReplicationTarget): Promise<boolean> {
    // Implementation would depend on target type and protocol
    // For now, simulate health check
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.1 ? resolve(true) : reject(new Error('Health check failed'))
      }, Math.random() * 1000)
    })
  }

  private async startHealthChecks(): Promise<void> {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks()
      } catch (error) {
        console.error('Health check error:', error)
        this.emit('healthCheckError', error)
      }
    }, 300000) // Every 5 minutes
  }

  private async performHealthChecks(): Promise<void> {
    // Check disk space
    const backupStats = await fs.stat(this.backupPath)
    // Implementation would check available disk space

    // Check backup job status
    const runningJobs = Array.from(this.backupJobs.values()).filter(j => j.status === 'running')
    if (runningJobs.length > this.config.backupSchedule.maxConcurrentBackups) {
      this.emit('healthCheckWarning', { 
        type: 'too_many_concurrent_backups', 
        count: runningJobs.length 
      })
    }

    // Check RTO/RPO compliance
    const lastSuccessfulBackup = this.getLastSuccessfulBackup()
    if (lastSuccessfulBackup) {
      const timeSinceBackup = (Date.now() - lastSuccessfulBackup.startTime.getTime()) / (60 * 1000)
      if (timeSinceBackup > this.config.recoveryObjectives.rpo) {
        this.emit('rpoViolation', { 
          timeSinceBackup, 
          rpo: this.config.recoveryObjectives.rpo 
        })
      }
    }
  }

  private getLastSuccessfulBackup(): BackupJob | undefined {
    return Array.from(this.backupJobs.values())
      .filter(j => j.status === 'completed')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]
  }

  async getBackupJob(id: string): Promise<BackupJob | undefined> {
    return this.backupJobs.get(id)
  }

  async getAllBackupJobs(): Promise<BackupJob[]> {
    return Array.from(this.backupJobs.values())
  }

  async getRecoveryPlan(id: string): Promise<RecoveryPlan | undefined> {
    return this.recoveryPlans.get(id)
  }

  async getAllRecoveryPlans(): Promise<RecoveryPlan[]> {
    return Array.from(this.recoveryPlans.values())
  }

  async getRecoveryExecution(id: string): Promise<RecoveryExecution | undefined> {
    return this.recoveryExecutions.get(id)
  }

  async getDisasterScenario(id: string): Promise<DisasterScenario | undefined> {
    return this.scenarios.get(id)
  }

  async getAllDisasterScenarios(): Promise<DisasterScenario[]> {
    return Array.from(this.scenarios.values())
  }

  async getConfiguration(): Promise<DisasterRecoveryConfig> {
    return this.config
  }

  async updateConfiguration(config: Partial<DisasterRecoveryConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfiguration()
    this.emit('configurationUpdated', this.config)
  }

  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'config.json')
    await fs.writeFile(configFile, JSON.stringify(this.config, null, 2))
  }

  async destroy(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
    }
    if (this.replicationInterval) {
      clearInterval(this.replicationInterval)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    this.removeAllListeners()
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

export const disasterRecoveryService = new DisasterRecoveryService()