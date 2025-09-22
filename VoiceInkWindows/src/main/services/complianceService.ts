/**
 * Compliance Management Service (Step 124)
 * GDPR, CCPA, HIPAA compliance tracking with automated policy enforcement
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface ComplianceRegulation {
  id: string
  name: 'GDPR' | 'CCPA' | 'HIPAA' | 'PIPEDA' | 'LGPD' | 'SOX' | 'CUSTOM'
  region: string
  version: string
  enabled: boolean
  requirements: ComplianceRequirement[]
  auditFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  penalties: PenaltyInfo
}

export interface ComplianceRequirement {
  id: string
  category: 'data_retention' | 'consent' | 'access_rights' | 'breach_notification' | 'privacy_by_design' | 'dpo_requirement'
  description: string
  mandatory: boolean
  implementation: RequirementImplementation
  deadline?: Date
  status: 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable'
  lastAssessed: Date
  evidence: ComplianceEvidence[]
}

export interface RequirementImplementation {
  automated: boolean
  controls: string[]
  procedures: string[]
  responsible: string
  monitoring: MonitoringConfig
}

export interface MonitoringConfig {
  enabled: boolean
  frequency: 'continuous' | 'daily' | 'weekly'
  alerts: AlertConfig[]
  metrics: string[]
}

export interface AlertConfig {
  type: 'violation' | 'warning' | 'info'
  threshold: number
  recipients: string[]
  escalation: EscalationRule[]
}

export interface EscalationRule {
  level: number
  delay: number // minutes
  recipients: string[]
  actions: string[]
}

export interface ComplianceEvidence {
  id: string
  type: 'document' | 'log' | 'certificate' | 'assessment' | 'training'
  title: string
  description: string
  filePath?: string
  hash: string
  timestamp: Date
  validity: Date
  approved: boolean
  approver?: string
}

export interface DataSubject {
  id: string
  email: string
  identifiers: string[]
  consentRecords: ConsentRecord[]
  dataRequests: DataRequest[]
  retentionPolicy: RetentionPolicy
  classification: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface ConsentRecord {
  id: string
  purpose: string
  categories: string[]
  consentDate: Date
  withdrawalDate?: Date
  method: 'explicit' | 'implicit' | 'opt_in' | 'opt_out'
  evidence: string
  granular: boolean
  processors: string[]
  retentionPeriod: number
  version: string
}

export interface DataRequest {
  id: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'partially_fulfilled'
  submittedAt: Date
  deadline: Date
  completedAt?: Date
  evidence: ComplianceEvidence[]
  actions: RequestAction[]
  communication: RequestCommunication[]
}

export interface RequestAction {
  id: string
  type: string
  description: string
  executedAt: Date
  executor: string
  result: 'success' | 'failure' | 'partial'
  affectedSystems: string[]
}

export interface RequestCommunication {
  id: string
  type: 'acknowledgment' | 'clarification' | 'completion' | 'rejection'
  sentAt: Date
  method: 'email' | 'portal' | 'letter'
  content: string
  received: boolean
}

export interface RetentionPolicy {
  id: string
  name: string
  dataCategories: string[]
  retentionPeriod: number // days
  deletionMethod: 'secure_delete' | 'anonymize' | 'pseudonymize' | 'archive'
  legalBasis: string
  exceptions: RetentionException[]
  automaticDeletion: boolean
  approvalRequired: boolean
}

export interface RetentionException {
  reason: string
  extendedPeriod: number
  approver: string
  expiresAt: Date
}

export interface BreachIncident {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'confidentiality' | 'integrity' | 'availability'
  affectedData: AffectedData
  discoveredAt: Date
  containedAt?: Date
  rootCause: string
  impactAssessment: ImpactAssessment
  notifications: BreachNotification[]
  remediation: RemediationAction[]
  status: 'open' | 'contained' | 'resolved' | 'closed'
}

export interface AffectedData {
  subjects: number
  categories: string[]
  sensitivity: 'low' | 'medium' | 'high' | 'critical'
  geographicScope: string[]
  timeRange: { start: Date; end: Date }
}

export interface ImpactAssessment {
  likelihood: 'low' | 'medium' | 'high'
  severity: 'low' | 'medium' | 'high'
  riskScore: number
  financialImpact: number
  reputationalImpact: string
  operationalImpact: string
  mitigatingFactors: string[]
}

export interface BreachNotification {
  id: string
  recipient: 'authority' | 'subjects' | 'partner' | 'media'
  required: boolean
  deadline: Date
  sentAt?: Date
  method: string
  content: string
  acknowledgment?: string
}

export interface RemediationAction {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee: string
  deadline: Date
  completedAt?: Date
  status: 'pending' | 'in_progress' | 'completed'
  effectiveness: string
}

export interface ComplianceAudit {
  id: string
  regulation: string
  auditor: string
  startDate: Date
  endDate?: Date
  scope: string[]
  findings: AuditFinding[]
  recommendations: AuditRecommendation[]
  score: number
  certification?: AuditCertification
  status: 'planned' | 'in_progress' | 'completed' | 'failed'
}

export interface AuditFinding {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: string[]
  requirement: string
  recommendation: string
  remediation: RemediationAction
}

export interface AuditRecommendation {
  id: string
  priority: 'low' | 'medium' | 'high'
  description: string
  implementation: string
  timeline: number // days
  cost: number
  benefit: string
}

export interface AuditCertification {
  id: string
  issuer: string
  validFrom: Date
  validUntil: Date
  scope: string
  certificate: string
  publicUrl?: string
}

export interface PenaltyInfo {
  maxFine: number
  currency: string
  calculation: 'fixed' | 'percentage' | 'revenue_based'
  additionalSanctions: string[]
}

export interface ComplianceMetrics {
  overallScore: number
  regulationScores: { [regulation: string]: number }
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  trends: ComplianceTrend[]
  violations: ViolationSummary[]
  improvements: string[]
}

export interface ComplianceTrend {
  metric: string
  period: string
  values: number[]
  trend: 'improving' | 'stable' | 'declining'
}

export interface ViolationSummary {
  regulation: string
  count: number
  severity: string
  latestIncident: Date
  status: string
}

class ComplianceService extends EventEmitter {
  private regulations: Map<string, ComplianceRegulation> = new Map()
  private dataSubjects: Map<string, DataSubject> = new Map()
  private dataRequests: Map<string, DataRequest> = new Map()
  private retentionPolicies: Map<string, RetentionPolicy> = new Map()
  private breachIncidents: Map<string, BreachIncident> = new Map()
  private audits: Map<string, ComplianceAudit> = new Map()
  private evidence: Map<string, ComplianceEvidence> = new Map()
  
  private configPath: string
  private dataPath: string
  private isInitialized = false
  private monitoringInterval?: NodeJS.Timeout
  private retentionInterval?: NodeJS.Timeout

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'compliance')
    this.dataPath = path.join(this.configPath, 'data')
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configPath, { recursive: true })
      await fs.mkdir(this.dataPath, { recursive: true })
      
      await this.loadConfiguration()
      await this.setupDefaultRegulations()
      await this.startMonitoring()
      await this.startRetentionScheduler()
      
      this.isInitialized = true
      this.emit('initialized')
      
      console.log('Compliance service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize compliance service:', error)
      throw error
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configFile = path.join(this.configPath, 'regulations.json')
      const data = await fs.readFile(configFile, 'utf-8')
      const regulations = JSON.parse(data)
      
      for (const reg of regulations) {
        this.regulations.set(reg.id, {
          ...reg,
          requirements: reg.requirements.map((req: any) => ({
            ...req,
            lastAssessed: new Date(req.lastAssessed),
            deadline: req.deadline ? new Date(req.deadline) : undefined
          }))
        })
      }
    } catch (error) {
      console.log('No existing configuration found, will create default')
    }
  }

  private async setupDefaultRegulations(): Promise<void> {
    if (this.regulations.size === 0) {
      const gdpr: ComplianceRegulation = {
        id: 'gdpr-2018',
        name: 'GDPR',
        region: 'EU',
        version: '2018',
        enabled: true,
        auditFrequency: 'quarterly',
        penalties: {
          maxFine: 20000000,
          currency: 'EUR',
          calculation: 'percentage',
          additionalSanctions: ['data processing ban', 'operational restrictions']
        },
        requirements: [
          {
            id: 'gdpr-consent',
            category: 'consent',
            description: 'Obtain explicit consent for data processing',
            mandatory: true,
            implementation: {
              automated: true,
              controls: ['consent banners', 'opt-in forms', 'consent logs'],
              procedures: ['consent collection', 'consent withdrawal', 'consent renewal'],
              responsible: 'Data Protection Officer',
              monitoring: {
                enabled: true,
                frequency: 'continuous',
                alerts: [{
                  type: 'violation',
                  threshold: 1,
                  recipients: ['dpo@company.com'],
                  escalation: [{
                    level: 1,
                    delay: 15,
                    recipients: ['legal@company.com'],
                    actions: ['notify authorities', 'suspend processing']
                  }]
                }],
                metrics: ['consent_rate', 'withdrawal_rate', 'consent_freshness']
              }
            },
            status: 'compliant',
            lastAssessed: new Date(),
            evidence: []
          },
          {
            id: 'gdpr-breach-notification',
            category: 'breach_notification',
            description: 'Notify authorities within 72 hours of breach discovery',
            mandatory: true,
            implementation: {
              automated: true,
              controls: ['breach detection', 'automated alerts', 'notification templates'],
              procedures: ['incident response', 'authority notification', 'subject notification'],
              responsible: 'Security Team',
              monitoring: {
                enabled: true,
                frequency: 'continuous',
                alerts: [{
                  type: 'violation',
                  threshold: 1,
                  recipients: ['security@company.com', 'dpo@company.com'],
                  escalation: [{
                    level: 1,
                    delay: 30,
                    recipients: ['ceo@company.com', 'legal@company.com'],
                    actions: ['emergency response', 'external counsel']
                  }]
                }],
                metrics: ['detection_time', 'notification_time', 'breach_count']
              }
            },
            status: 'compliant',
            lastAssessed: new Date(),
            evidence: []
          }
        ]
      }

      const ccpa: ComplianceRegulation = {
        id: 'ccpa-2020',
        name: 'CCPA',
        region: 'California',
        version: '2020',
        enabled: true,
        auditFrequency: 'annually',
        penalties: {
          maxFine: 7500,
          currency: 'USD',
          calculation: 'fixed',
          additionalSanctions: ['cease operations', 'corrective action orders']
        },
        requirements: [
          {
            id: 'ccpa-privacy-rights',
            category: 'access_rights',
            description: 'Provide consumers right to know, delete, and opt-out',
            mandatory: true,
            implementation: {
              automated: true,
              controls: ['privacy portal', 'request forms', 'opt-out mechanisms'],
              procedures: ['request verification', 'data discovery', 'response delivery'],
              responsible: 'Privacy Team',
              monitoring: {
                enabled: true,
                frequency: 'daily',
                alerts: [{
                  type: 'warning',
                  threshold: 10,
                  recipients: ['privacy@company.com'],
                  escalation: [{
                    level: 1,
                    delay: 45,
                    recipients: ['compliance@company.com'],
                    actions: ['process review', 'resource allocation']
                  }]
                }],
                metrics: ['request_volume', 'response_time', 'fulfillment_rate']
              }
            },
            status: 'compliant',
            lastAssessed: new Date(),
            evidence: []
          }
        ]
      }

      this.regulations.set(gdpr.id, gdpr)
      this.regulations.set(ccpa.id, ccpa)
      
      await this.saveConfiguration()
    }
  }

  async registerDataSubject(subject: Omit<DataSubject, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    const dataSubject: DataSubject = {
      id,
      ...subject
    }
    
    this.dataSubjects.set(id, dataSubject)
    await this.saveDataSubjects()
    
    this.emit('dataSubjectRegistered', dataSubject)
    return id
  }

  async recordConsent(subjectId: string, consent: Omit<ConsentRecord, 'id'>): Promise<string> {
    const subject = this.dataSubjects.get(subjectId)
    if (!subject) {
      throw new Error('Data subject not found')
    }

    const consentId = crypto.randomUUID()
    const consentRecord: ConsentRecord = {
      id: consentId,
      ...consent
    }

    subject.consentRecords.push(consentRecord)
    this.dataSubjects.set(subjectId, subject)
    await this.saveDataSubjects()

    this.emit('consentRecorded', { subjectId, consent: consentRecord })
    return consentId
  }

  async withdrawConsent(subjectId: string, consentId: string): Promise<void> {
    const subject = this.dataSubjects.get(subjectId)
    if (!subject) {
      throw new Error('Data subject not found')
    }

    const consent = subject.consentRecords.find(c => c.id === consentId)
    if (!consent) {
      throw new Error('Consent record not found')
    }

    consent.withdrawalDate = new Date()
    this.dataSubjects.set(subjectId, subject)
    await this.saveDataSubjects()

    this.emit('consentWithdrawn', { subjectId, consentId })
  }

  async submitDataRequest(subjectId: string, request: Omit<DataRequest, 'id' | 'status' | 'submittedAt' | 'deadline' | 'actions' | 'communication'>): Promise<string> {
    const subject = this.dataSubjects.get(subjectId)
    if (!subject) {
      throw new Error('Data subject not found')
    }

    const requestId = crypto.randomUUID()
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30) // 30 days default

    const dataRequest: DataRequest = {
      id: requestId,
      status: 'pending',
      submittedAt: new Date(),
      deadline,
      actions: [],
      communication: [],
      ...request
    }

    subject.dataRequests.push(dataRequest)
    this.dataRequests.set(requestId, dataRequest)
    this.dataSubjects.set(subjectId, subject)
    
    await this.saveDataSubjects()
    await this.saveDataRequests()

    // Send acknowledgment
    await this.sendRequestCommunication(requestId, {
      id: crypto.randomUUID(),
      type: 'acknowledgment',
      sentAt: new Date(),
      method: 'email',
      content: `Your data request has been received and will be processed within 30 days.`,
      received: false
    })

    this.emit('dataRequestSubmitted', dataRequest)
    return requestId
  }

  async processDataRequest(requestId: string, actions: Omit<RequestAction, 'id' | 'executedAt'>[]): Promise<void> {
    const request = this.dataRequests.get(requestId)
    if (!request) {
      throw new Error('Data request not found')
    }

    for (const actionData of actions) {
      const action: RequestAction = {
        id: crypto.randomUUID(),
        executedAt: new Date(),
        ...actionData
      }
      request.actions.push(action)
    }

    request.status = 'in_progress'
    this.dataRequests.set(requestId, request)
    await this.saveDataRequests()

    this.emit('dataRequestProcessed', { requestId, actions })
  }

  async completeDataRequest(requestId: string, result: 'completed' | 'rejected' | 'partially_fulfilled'): Promise<void> {
    const request = this.dataRequests.get(requestId)
    if (!request) {
      throw new Error('Data request not found')
    }

    request.status = result
    request.completedAt = new Date()
    this.dataRequests.set(requestId, request)
    await this.saveDataRequests()

    // Send completion notification
    await this.sendRequestCommunication(requestId, {
      id: crypto.randomUUID(),
      type: 'completion',
      sentAt: new Date(),
      method: 'email',
      content: `Your data request has been ${result}.`,
      received: false
    })

    this.emit('dataRequestCompleted', { requestId, result })
  }

  private async sendRequestCommunication(requestId: string, communication: RequestCommunication): Promise<void> {
    const request = this.dataRequests.get(requestId)
    if (!request) return

    request.communication.push(communication)
    this.dataRequests.set(requestId, request)
    await this.saveDataRequests()

    this.emit('communicationSent', { requestId, communication })
  }

  async reportBreach(incident: Omit<BreachIncident, 'id' | 'status' | 'notifications' | 'remediation'>): Promise<string> {
    const incidentId = crypto.randomUUID()
    const breach: BreachIncident = {
      id: incidentId,
      status: 'open',
      notifications: [],
      remediation: [],
      ...incident
    }

    this.breachIncidents.set(incidentId, breach)
    await this.saveBreachIncidents()

    // Auto-generate required notifications
    await this.generateBreachNotifications(incidentId)

    this.emit('breachReported', breach)
    return incidentId
  }

  private async generateBreachNotifications(incidentId: string): Promise<void> {
    const incident = this.breachIncidents.get(incidentId)
    if (!incident) return

    const notifications: BreachNotification[] = []

    // Check if authority notification is required (GDPR: high risk, CCPA: always)
    if (incident.impactAssessment.riskScore >= 7 || incident.severity === 'high' || incident.severity === 'critical') {
      const deadline = new Date(incident.discoveredAt)
      deadline.setHours(deadline.getHours() + 72) // 72 hours for GDPR

      notifications.push({
        id: crypto.randomUUID(),
        recipient: 'authority',
        required: true,
        deadline,
        method: 'official_portal',
        content: 'Data breach notification as required by applicable regulations.'
      })
    }

    // Check if subject notification is required
    if (incident.impactAssessment.likelihood === 'high' || incident.severity === 'critical') {
      const deadline = new Date(incident.discoveredAt)
      deadline.setDate(deadline.getDate() + 3) // Within reasonable time

      notifications.push({
        id: crypto.randomUUID(),
        recipient: 'subjects',
        required: true,
        deadline,
        method: 'email',
        content: 'Important security notice regarding your personal data.'
      })
    }

    incident.notifications = notifications
    this.breachIncidents.set(incidentId, incident)
    await this.saveBreachIncidents()
  }

  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    const retentionPolicy: RetentionPolicy = {
      id,
      ...policy
    }

    this.retentionPolicies.set(id, retentionPolicy)
    await this.saveRetentionPolicies()

    this.emit('retentionPolicyCreated', retentionPolicy)
    return id
  }

  async scheduleDataDeletion(): Promise<void> {
    const now = new Date()
    
    for (const [subjectId, subject] of this.dataSubjects) {
      const policy = this.retentionPolicies.get(subject.retentionPolicy.id)
      if (!policy || !policy.automaticDeletion) continue

      const expirationDate = new Date(subject.retentionPolicy.retentionPeriod * 24 * 60 * 60 * 1000)
      
      if (now > expirationDate) {
        await this.executeDataDeletion(subjectId, policy.deletionMethod)
      }
    }
  }

  private async executeDataDeletion(subjectId: string, method: RetentionPolicy['deletionMethod']): Promise<void> {
    const subject = this.dataSubjects.get(subjectId)
    if (!subject) return

    switch (method) {
      case 'secure_delete':
        this.dataSubjects.delete(subjectId)
        break
      case 'anonymize':
        subject.email = 'anonymized@example.com'
        subject.identifiers = ['anonymized']
        this.dataSubjects.set(subjectId, subject)
        break
      case 'pseudonymize':
        subject.email = crypto.createHash('sha256').update(subject.email).digest('hex') + '@pseudonymized.com'
        this.dataSubjects.set(subjectId, subject)
        break
      case 'archive':
        // Move to archive storage (implementation depends on storage strategy)
        break
    }

    this.emit('dataDeleted', { subjectId, method })
  }

  async performComplianceCheck(regulationId: string): Promise<ComplianceMetrics> {
    const regulation = this.regulations.get(regulationId)
    if (!regulation) {
      throw new Error('Regulation not found')
    }

    let totalScore = 0
    const requirementCount = regulation.requirements.length
    const violations: ViolationSummary[] = []

    for (const requirement of regulation.requirements) {
      const score = await this.assessRequirement(requirement)
      totalScore += score

      if (score < 0.7) { // Below 70% compliance
        violations.push({
          regulation: regulation.name,
          count: 1,
          severity: requirement.implementation.monitoring.alerts[0]?.type || 'warning',
          latestIncident: requirement.lastAssessed,
          status: requirement.status
        })
      }
    }

    const overallScore = totalScore / requirementCount
    const riskLevel = this.calculateRiskLevel(overallScore, violations.length)

    const metrics: ComplianceMetrics = {
      overallScore,
      regulationScores: { [regulationId]: overallScore },
      riskLevel,
      trends: [],
      violations,
      improvements: this.generateImprovementRecommendations(regulation, violations)
    }

    this.emit('complianceChecked', { regulationId, metrics })
    return metrics
  }

  private async assessRequirement(requirement: ComplianceRequirement): Promise<number> {
    // Simplified assessment logic - in production, this would involve
    // complex rule evaluation, evidence verification, and metric analysis
    switch (requirement.status) {
      case 'compliant': return 1.0
      case 'in_progress': return 0.5
      case 'non_compliant': return 0.0
      case 'not_applicable': return 1.0
      default: return 0.0
    }
  }

  private calculateRiskLevel(score: number, violationCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9 && violationCount === 0) return 'low'
    if (score >= 0.7 && violationCount <= 2) return 'medium'
    if (score >= 0.5 && violationCount <= 5) return 'high'
    return 'critical'
  }

  private generateImprovementRecommendations(regulation: ComplianceRegulation, violations: ViolationSummary[]): string[] {
    const recommendations: string[] = []

    if (violations.length > 0) {
      recommendations.push('Address identified compliance violations immediately')
      recommendations.push('Implement automated monitoring for critical requirements')
    }

    recommendations.push('Conduct regular compliance training for staff')
    recommendations.push('Update policies and procedures based on regulatory changes')
    recommendations.push('Establish clear escalation procedures for incidents')

    return recommendations
  }

  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performAutomatedChecks()
      } catch (error) {
        console.error('Compliance monitoring error:', error)
        this.emit('monitoringError', error)
      }
    }, 60000) // Check every minute
  }

  private async performAutomatedChecks(): Promise<void> {
    // Check for upcoming deadlines
    const now = new Date()
    const warningPeriod = 7 * 24 * 60 * 60 * 1000 // 7 days

    for (const request of this.dataRequests.values()) {
      if (request.status === 'pending' || request.status === 'in_progress') {
        const timeRemaining = request.deadline.getTime() - now.getTime()
        
        if (timeRemaining <= warningPeriod && timeRemaining > 0) {
          this.emit('deadlineWarning', { requestId: request.id, daysRemaining: Math.ceil(timeRemaining / (24 * 60 * 60 * 1000)) })
        } else if (timeRemaining <= 0) {
          this.emit('deadlineViolation', { requestId: request.id })
        }
      }
    }

    // Check breach notification deadlines
    for (const incident of this.breachIncidents.values()) {
      for (const notification of incident.notifications) {
        if (!notification.sentAt && notification.deadline < now) {
          this.emit('notificationViolation', { incidentId: incident.id, notificationId: notification.id })
        }
      }
    }
  }

  private async startRetentionScheduler(): Promise<void> {
    this.retentionInterval = setInterval(async () => {
      try {
        await this.scheduleDataDeletion()
      } catch (error) {
        console.error('Retention scheduler error:', error)
        this.emit('retentionError', error)
      }
    }, 24 * 60 * 60 * 1000) // Check daily
  }

  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'regulations.json')
    const regulations = Array.from(this.regulations.values())
    await fs.writeFile(configFile, JSON.stringify(regulations, null, 2))
  }

  private async saveDataSubjects(): Promise<void> {
    const dataFile = path.join(this.dataPath, 'subjects.json')
    const subjects = Array.from(this.dataSubjects.values())
    await fs.writeFile(dataFile, JSON.stringify(subjects, null, 2))
  }

  private async saveDataRequests(): Promise<void> {
    const dataFile = path.join(this.dataPath, 'requests.json')
    const requests = Array.from(this.dataRequests.values())
    await fs.writeFile(dataFile, JSON.stringify(requests, null, 2))
  }

  private async saveRetentionPolicies(): Promise<void> {
    const dataFile = path.join(this.dataPath, 'retention.json')
    const policies = Array.from(this.retentionPolicies.values())
    await fs.writeFile(dataFile, JSON.stringify(policies, null, 2))
  }

  private async saveBreachIncidents(): Promise<void> {
    const dataFile = path.join(this.dataPath, 'breaches.json')
    const incidents = Array.from(this.breachIncidents.values())
    await fs.writeFile(dataFile, JSON.stringify(incidents, null, 2))
  }

  async getRegulation(id: string): Promise<ComplianceRegulation | undefined> {
    return this.regulations.get(id)
  }

  async getAllRegulations(): Promise<ComplianceRegulation[]> {
    return Array.from(this.regulations.values())
  }

  async getDataSubject(id: string): Promise<DataSubject | undefined> {
    return this.dataSubjects.get(id)
  }

  async getDataRequest(id: string): Promise<DataRequest | undefined> {
    return this.dataRequests.get(id)
  }

  async getBreachIncident(id: string): Promise<BreachIncident | undefined> {
    return this.breachIncidents.get(id)
  }

  async getComplianceEvidence(id: string): Promise<ComplianceEvidence | undefined> {
    return this.evidence.get(id)
  }

  async destroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval)
    }
    
    this.removeAllListeners()
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

export const complianceService = new ComplianceService()