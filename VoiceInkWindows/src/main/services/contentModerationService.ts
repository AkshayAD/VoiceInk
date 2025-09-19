/**
 * Content Moderation Service (Step 127)
 * Profanity detection, content filtering, sentiment analysis, and automated moderation
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface ContentModerationConfig {
  enabled: boolean
  filters: FilterConfig[]
  profanity: ProfanityConfig
  sentiment: SentimentConfig
  content: ContentFilterConfig
  moderation: ModerationConfig
  multilingual: MultilingualConfig
  falsePositive: FalsePositiveConfig
  automation: AutomationConfig
  reporting: ReportingConfig
}

export interface FilterConfig {
  id: string
  name: string
  type: 'profanity' | 'spam' | 'hate_speech' | 'violence' | 'adult_content' | 'custom'
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'flag' | 'blur' | 'remove' | 'review' | 'block'
  threshold: number // 0-1 confidence score
  patterns: FilterPattern[]
  whitelist: string[]
  blacklist: string[]
  contexts: string[] // where to apply this filter
}

export interface FilterPattern {
  pattern: string
  type: 'exact' | 'contains' | 'regex' | 'soundex' | 'levenshtein'
  caseSensitive: boolean
  wholeWord: boolean
  weight: number
  language?: string
  context?: string[]
}

export interface ProfanityConfig {
  enabled: boolean
  strictMode: boolean
  categories: ProfanityCategory[]
  replacement: ReplacementConfig
  detection: ProfanityDetection
  customWords: CustomWord[]
  exemptions: string[]
}

export interface ProfanityCategory {
  name: string
  enabled: boolean
  severity: 'mild' | 'moderate' | 'severe' | 'extreme'
  words: string[]
  variants: string[]
  action: 'flag' | 'replace' | 'remove' | 'block'
}

export interface ReplacementConfig {
  enabled: boolean
  strategy: 'asterisks' | 'underscores' | 'custom' | 'remove'
  customReplacements: { [word: string]: string }
  preserveLength: boolean
  maskCharacter: string
}

export interface ProfanityDetection {
  leetSpeak: boolean
  spacing: boolean
  repetition: boolean
  homoglyphs: boolean
  contextual: boolean
  abbreviations: boolean
}

export interface CustomWord {
  word: string
  category: string
  severity: string
  alternatives: string[]
  context: string[]
  enabled: boolean
}

export interface SentimentConfig {
  enabled: boolean
  models: SentimentModel[]
  thresholds: SentimentThresholds
  analysis: SentimentAnalysis
  emotions: EmotionDetection
  toxicity: ToxicityDetection
}

export interface SentimentModel {
  id: string
  name: string
  type: 'rule_based' | 'machine_learning' | 'transformer' | 'lexicon'
  language: string
  enabled: boolean
  accuracy: number
  path?: string
  endpoint?: string
}

export interface SentimentThresholds {
  positive: number
  negative: number
  neutral: number
  mixed: number
  confidence: number
}

export interface SentimentAnalysis {
  realTime: boolean
  contextLength: number
  aggregation: 'average' | 'weighted' | 'latest'
  history: boolean
  trends: boolean
}

export interface EmotionDetection {
  enabled: boolean
  emotions: string[] // joy, anger, fear, sadness, surprise, disgust
  intensity: boolean
  multiLabel: boolean
  confidence: number
}

export interface ToxicityDetection {
  enabled: boolean
  categories: string[] // toxic, severe_toxic, obscene, threat, insult, identity_hate
  threshold: number
  severity: boolean
  attribution: boolean
}

export interface ContentFilterConfig {
  enabled: boolean
  categories: ContentCategory[]
  imageFilter: ImageFilterConfig
  linkFilter: LinkFilterConfig
  lengthFilter: LengthFilterConfig
  duplicateFilter: DuplicateFilterConfig
}

export interface ContentCategory {
  id: string
  name: string
  type: 'spam' | 'advertising' | 'scam' | 'phishing' | 'malware' | 'inappropriate'
  enabled: boolean
  patterns: string[]
  keywords: string[]
  domains: string[]
  action: 'flag' | 'remove' | 'quarantine'
}

export interface ImageFilterConfig {
  enabled: boolean
  nudity: boolean
  violence: boolean
  inappropriate: boolean
  faces: boolean
  text: boolean
  confidence: number
}

export interface LinkFilterConfig {
  enabled: boolean
  malicious: boolean
  phishing: boolean
  shortened: boolean
  whitelist: string[]
  blacklist: string[]
  reputation: boolean
}

export interface LengthFilterConfig {
  enabled: boolean
  minLength: number
  maxLength: number
  wordCount: boolean
  characterCount: boolean
  action: 'warn' | 'truncate' | 'reject'
}

export interface DuplicateFilterConfig {
  enabled: boolean
  threshold: number // similarity percentage
  timeWindow: number // minutes
  action: 'flag' | 'remove' | 'merge'
  algorithm: 'exact' | 'fuzzy' | 'semantic'
}

export interface ModerationConfig {
  enabled: boolean
  queue: ModerationQueue
  reviewers: ReviewerConfig[]
  workflows: ModerationWorkflow[]
  escalation: EscalationConfig
  appeals: AppealConfig
  automation: AutoModerationConfig
}

export interface ModerationQueue {
  enabled: boolean
  priority: 'fifo' | 'severity' | 'age' | 'user_tier'
  capacity: number
  timeouts: QueueTimeouts
  assignment: 'round_robin' | 'load_based' | 'skill_based'
}

export interface QueueTimeouts {
  review: number // minutes
  escalation: number // minutes
  auto_approve: number // minutes for low-risk content
  expire: number // hours
}

export interface ReviewerConfig {
  id: string
  name: string
  email: string
  skills: string[]
  languages: string[]
  capacity: number // items per hour
  accuracy: number // historical accuracy percentage
  specializations: string[]
  schedule: ReviewerSchedule
}

export interface ReviewerSchedule {
  timezone: string
  hours: { [day: string]: { start: string; end: string } }
  breaks: BreakPeriod[]
  availability: 'available' | 'busy' | 'offline'
}

export interface BreakPeriod {
  start: string
  end: string
  type: 'lunch' | 'break' | 'meeting' | 'training'
}

export interface ModerationWorkflow {
  id: string
  name: string
  triggers: WorkflowTrigger[]
  steps: WorkflowStep[]
  sla: WorkflowSLA
  notifications: WorkflowNotification[]
}

export interface WorkflowTrigger {
  type: 'content_type' | 'severity' | 'user_tier' | 'volume' | 'time'
  condition: string
  value: any
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'auto_filter' | 'human_review' | 'ai_review' | 'escalation' | 'action'
  assignee?: string
  timeout: number // minutes
  criteria: StepCriteria
  actions: StepAction[]
}

export interface StepCriteria {
  conditions: string[]
  approvalThreshold: number
  rejectionThreshold: number
  consensus: boolean
}

export interface StepAction {
  type: 'approve' | 'reject' | 'edit' | 'flag' | 'escalate' | 'ban' | 'warn'
  parameters: any
  notification: boolean
}

export interface WorkflowSLA {
  initial: number // minutes for first response
  resolution: number // minutes for final decision
  escalation: number // minutes before auto-escalation
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface WorkflowNotification {
  trigger: 'start' | 'step_complete' | 'escalation' | 'resolution' | 'timeout'
  recipients: string[]
  method: 'email' | 'slack' | 'webhook' | 'sms'
  template: string
}

export interface EscalationConfig {
  enabled: boolean
  levels: EscalationLevel[]
  autoEscalation: boolean
  timeouts: number[]
  criteria: EscalationCriteria
}

export interface EscalationLevel {
  level: number
  name: string
  reviewers: string[]
  authority: string[]
  sla: number // minutes
  notifications: string[]
}

export interface EscalationCriteria {
  severity: string[]
  contentTypes: string[]
  userComplaints: number
  falsePositives: number
  disagreement: boolean
}

export interface AppealConfig {
  enabled: boolean
  timeLimit: number // days
  reviewers: string[]
  evidence: boolean
  autoReview: boolean
  sla: number // hours
}

export interface AutoModerationConfig {
  enabled: boolean
  confidence: number
  actions: AutoAction[]
  humanReview: boolean
  learning: boolean
  feedback: boolean
}

export interface AutoAction {
  trigger: string
  condition: string
  action: string
  parameters: any
  reversible: boolean
}

export interface MultilingualConfig {
  enabled: boolean
  languages: LanguageSupport[]
  translation: TranslationConfig
  detection: LanguageDetection
  fallback: string
}

export interface LanguageSupport {
  code: string
  name: string
  enabled: boolean
  confidence: number
  models: string[]
  reviewers: string[]
}

export interface TranslationConfig {
  enabled: boolean
  provider: 'google' | 'azure' | 'aws' | 'local'
  caching: boolean
  quality: 'basic' | 'premium' | 'neural'
  preserve: string[] // elements to preserve during translation
}

export interface LanguageDetection {
  enabled: boolean
  confidence: number
  fallback: string
  mixedLanguage: boolean
}

export interface FalsePositiveConfig {
  enabled: boolean
  learning: boolean
  feedback: FeedbackConfig
  adjustment: AdjustmentConfig
  reporting: boolean
}

export interface FeedbackConfig {
  collection: boolean
  sources: string[]
  weighting: { [source: string]: number }
  validation: boolean
  anonymize: boolean
}

export interface AdjustmentConfig {
  automatic: boolean
  threshold: number // false positive rate threshold
  algorithm: 'simple' | 'weighted' | 'ml'
  frequency: 'realtime' | 'hourly' | 'daily'
}

export interface AutomationConfig {
  enabled: boolean
  rules: AutomationRule[]
  learning: MachineLearningConfig
  triggers: AutomationTrigger[]
  limits: AutomationLimits
}

export interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  cooldown: number // seconds
}

export interface RuleCondition {
  type: 'content' | 'user' | 'time' | 'volume' | 'pattern'
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'matches'
  value: any
  weight: number
}

export interface RuleAction {
  type: 'approve' | 'reject' | 'flag' | 'escalate' | 'modify' | 'defer'
  parameters: any
  confidence: number
  reversible: boolean
}

export interface MachineLearningConfig {
  enabled: boolean
  models: MLModel[]
  training: TrainingConfig
  inference: InferenceConfig
  feedback: MLFeedbackConfig
}

export interface MLModel {
  id: string
  name: string
  type: 'classification' | 'sentiment' | 'toxicity' | 'spam'
  version: string
  accuracy: number
  enabled: boolean
  path: string
  lastTrained: Date
}

export interface TrainingConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  dataSize: number
  validation: number // percentage
  testing: number // percentage
  features: string[]
}

export interface InferenceConfig {
  batchSize: number
  timeout: number // milliseconds
  fallback: boolean
  caching: boolean
  monitoring: boolean
}

export interface MLFeedbackConfig {
  enabled: boolean
  collection: 'all' | 'disagreements' | 'errors'
  labeling: 'manual' | 'auto' | 'hybrid'
  quality: QualityControl
}

export interface QualityControl {
  validation: boolean
  consensus: number // number of reviewers
  accuracy: number // minimum accuracy
  calibration: boolean
}

export interface AutomationTrigger {
  type: 'volume' | 'pattern' | 'time' | 'quality' | 'user'
  threshold: number
  window: number // minutes
  action: string
  enabled: boolean
}

export interface AutomationLimits {
  maxActions: number // per hour
  maxUsers: number // affected per action
  maxContent: number // items per action
  safetyOverride: boolean
}

export interface ReportingConfig {
  enabled: boolean
  reports: ReportTemplate[]
  schedule: ReportSchedule
  recipients: ReportRecipient[]
  retention: number // days
}

export interface ReportTemplate {
  id: string
  name: string
  type: 'summary' | 'detailed' | 'trends' | 'accuracy'
  metrics: string[]
  format: 'pdf' | 'html' | 'json' | 'csv'
  filters: ReportFilter[]
}

export interface ReportFilter {
  field: string
  operator: string
  value: any
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  time: string
  timezone: string
  enabled: boolean
}

export interface ReportRecipient {
  email: string
  name: string
  reports: string[]
  format: string
}

export interface ModerationItem {
  id: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'file'
  source: string
  userId?: string
  timestamp: Date
  language?: string
  metadata: any
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'escalated' | 'appealed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  flags: ModerationFlag[]
  reviews: ModerationReview[]
  actions: ModerationAction[]
  appeal?: AppealRequest
}

export interface ModerationFlag {
  id: string
  type: string
  category: string
  severity: string
  confidence: number
  source: 'auto' | 'user' | 'reviewer'
  timestamp: Date
  details: any
  resolved: boolean
}

export interface ModerationReview {
  id: string
  reviewerId: string
  decision: 'approve' | 'reject' | 'escalate' | 'edit'
  reason: string
  confidence: number
  timestamp: Date
  duration: number // seconds
  notes?: string
  tags: string[]
}

export interface ModerationAction {
  id: string
  type: 'approve' | 'reject' | 'edit' | 'flag' | 'ban' | 'warn' | 'remove'
  executor: string
  timestamp: Date
  reason: string
  parameters: any
  reversible: boolean
  reversed?: boolean
  impact: ActionImpact
}

export interface ActionImpact {
  usersAffected: number
  contentAffected: number
  severity: string
  appeal: boolean
  public: boolean
}

export interface AppealRequest {
  id: string
  userId: string
  reason: string
  evidence: string[]
  timestamp: Date
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  reviewerId?: string
  decision?: AppealDecision
}

export interface AppealDecision {
  decision: 'uphold' | 'overturn' | 'modify'
  reason: string
  changes: string[]
  timestamp: Date
  finalReview: boolean
}

export interface ModerationStats {
  total: ModerationItemStats
  flags: FlagStats
  reviews: ReviewStats
  actions: ActionStats
  accuracy: AccuracyStats
  performance: PerformanceStats
  trends: TrendStats
}

export interface ModerationItemStats {
  total: number
  pending: number
  approved: number
  rejected: number
  escalated: number
  appealed: number
  byType: { [type: string]: number }
  byPriority: { [priority: string]: number }
}

export interface FlagStats {
  total: number
  autoGenerated: number
  userReported: number
  reviewerGenerated: number
  byCategory: { [category: string]: number }
  accuracy: number
}

export interface ReviewStats {
  total: number
  avgTime: number
  byReviewer: { [reviewerId: string]: ReviewerStats }
  consensus: number
  disagreements: number
  escalations: number
}

export interface ReviewerStats {
  reviews: number
  accuracy: number
  avgTime: number
  specializations: string[]
  productivity: number
}

export interface ActionStats {
  total: number
  automated: number
  manual: number
  reversed: number
  byType: { [type: string]: number }
  impact: ActionImpactStats
}

export interface ActionImpactStats {
  usersAffected: number
  contentRemoved: number
  appealsReceived: number
  falsPositives: number
}

export interface AccuracyStats {
  overall: number
  automation: number
  humanReview: number
  falsePositives: number
  falseNegatives: number
  improvement: number
}

export interface PerformanceStats {
  throughput: number
  avgProcessingTime: number
  queueLength: number
  slaCompliance: number
  bottlenecks: string[]
}

export interface TrendStats {
  volume: TrendData[]
  flagRate: TrendData[]
  accuracy: TrendData[]
  types: { [type: string]: TrendData[] }
}

export interface TrendData {
  timestamp: Date
  value: number
  change: number
}

class ContentModerationService extends EventEmitter {
  private config: ContentModerationConfig
  private moderationItems: Map<string, ModerationItem> = new Map()
  private reviewers: Map<string, ReviewerConfig> = new Map()
  private queue: ModerationItem[] = []
  private stats: ModerationStats
  private profanityDatabase: Set<string> = new Set()
  private sentimentCache: Map<string, any> = new Map()
  
  private configPath: string
  private dataPath: string
  private isInitialized = false
  private processingInterval?: NodeJS.Timeout
  private statsInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'content-moderation')
    this.dataPath = path.join(this.configPath, 'data')
    
    this.config = this.getDefaultConfig()
    this.stats = this.initializeStats()
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configPath, { recursive: true })
      await fs.mkdir(this.dataPath, { recursive: true })
      
      await this.loadConfiguration()
      await this.loadProfanityDatabase()
      await this.setupDefaultFilters()
      await this.startProcessing()
      await this.startStatsCollection()
      await this.startCleanupTask()
      
      this.isInitialized = true
      this.emit('initialized')
      
      console.log('Content moderation service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize content moderation service:', error)
      throw error
    }
  }

  private getDefaultConfig(): ContentModerationConfig {
    return {
      enabled: true,
      filters: [],
      profanity: {
        enabled: true,
        strictMode: false,
        categories: [
          {
            name: 'mild',
            enabled: true,
            severity: 'mild',
            words: ['damn', 'hell', 'crap'],
            variants: [],
            action: 'flag'
          },
          {
            name: 'moderate',
            enabled: true,
            severity: 'moderate', 
            words: ['shit', 'ass', 'bitch'],
            variants: [],
            action: 'replace'
          },
          {
            name: 'severe',
            enabled: true,
            severity: 'severe',
            words: ['fuck', 'pussy', 'cock'],
            variants: [],
            action: 'remove'
          }
        ],
        replacement: {
          enabled: true,
          strategy: 'asterisks',
          customReplacements: {},
          preserveLength: true,
          maskCharacter: '*'
        },
        detection: {
          leetSpeak: true,
          spacing: true,
          repetition: true,
          homoglyphs: true,
          contextual: true,
          abbreviations: true
        },
        customWords: [],
        exemptions: ['scunthorpe', 'arsenal'] // words that contain profanity but are not profane
      },
      sentiment: {
        enabled: true,
        models: [{
          id: 'basic-sentiment',
          name: 'Basic Sentiment Analysis',
          type: 'lexicon',
          language: 'en',
          enabled: true,
          accuracy: 0.75
        }],
        thresholds: {
          positive: 0.7,
          negative: -0.7,
          neutral: 0.3,
          mixed: 0.5,
          confidence: 0.6
        },
        analysis: {
          realTime: true,
          contextLength: 500,
          aggregation: 'average',
          history: true,
          trends: true
        },
        emotions: {
          enabled: true,
          emotions: ['joy', 'anger', 'fear', 'sadness', 'surprise', 'disgust'],
          intensity: true,
          multiLabel: true,
          confidence: 0.5
        },
        toxicity: {
          enabled: true,
          categories: ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'],
          threshold: 0.7,
          severity: true,
          attribution: false
        }
      },
      content: {
        enabled: true,
        categories: [],
        imageFilter: {
          enabled: false,
          nudity: true,
          violence: true,
          inappropriate: true,
          faces: false,
          text: true,
          confidence: 0.8
        },
        linkFilter: {
          enabled: true,
          malicious: true,
          phishing: true,
          shortened: true,
          whitelist: ['trusted-domain.com'],
          blacklist: ['malicious-site.com'],
          reputation: true
        },
        lengthFilter: {
          enabled: true,
          minLength: 3,
          maxLength: 10000,
          wordCount: true,
          characterCount: true,
          action: 'warn'
        },
        duplicateFilter: {
          enabled: true,
          threshold: 95,
          timeWindow: 60,
          action: 'flag',
          algorithm: 'fuzzy'
        }
      },
      moderation: {
        enabled: true,
        queue: {
          enabled: true,
          priority: 'severity',
          capacity: 1000,
          timeouts: {
            review: 30,
            escalation: 60,
            auto_approve: 15,
            expire: 24
          },
          assignment: 'round_robin'
        },
        reviewers: [],
        workflows: [],
        escalation: {
          enabled: true,
          levels: [{
            level: 1,
            name: 'Senior Reviewer',
            reviewers: [],
            authority: [],
            sla: 60,
            notifications: []
          }],
          autoEscalation: true,
          timeouts: [30, 60, 120],
          criteria: {
            severity: ['high', 'critical'],
            contentTypes: ['hate_speech', 'violence'],
            userComplaints: 3,
            falsePositives: 5,
            disagreement: true
          }
        },
        appeals: {
          enabled: true,
          timeLimit: 7,
          reviewers: [],
          evidence: true,
          autoReview: false,
          sla: 48
        },
        automation: {
          enabled: true,
          confidence: 0.9,
          actions: [],
          humanReview: true,
          learning: true,
          feedback: true
        }
      },
      multilingual: {
        enabled: true,
        languages: [{
          code: 'en',
          name: 'English',
          enabled: true,
          confidence: 0.9,
          models: ['basic-sentiment'],
          reviewers: []
        }],
        translation: {
          enabled: false,
          provider: 'google',
          caching: true,
          quality: 'basic',
          preserve: ['@mentions', '#hashtags', 'URLs']
        },
        detection: {
          enabled: true,
          confidence: 0.8,
          fallback: 'en',
          mixedLanguage: true
        },
        fallback: 'en'
      },
      falsePositive: {
        enabled: true,
        learning: true,
        feedback: {
          collection: true,
          sources: ['reviewers', 'users', 'appeals'],
          weighting: { 'reviewers': 1.0, 'users': 0.5, 'appeals': 0.8 },
          validation: true,
          anonymize: true
        },
        adjustment: {
          automatic: true,
          threshold: 0.1, // 10% false positive rate
          algorithm: 'weighted',
          frequency: 'daily'
        },
        reporting: true
      },
      automation: {
        enabled: true,
        rules: [],
        learning: {
          enabled: true,
          models: [],
          training: {
            enabled: true,
            frequency: 'weekly',
            dataSize: 10000,
            validation: 20,
            testing: 10,
            features: ['length', 'sentiment', 'profanity', 'language']
          },
          inference: {
            batchSize: 100,
            timeout: 5000,
            fallback: true,
            caching: true,
            monitoring: true
          },
          feedback: {
            enabled: true,
            collection: 'disagreements',
            labeling: 'hybrid',
            quality: {
              validation: true,
              consensus: 2,
              accuracy: 0.85,
              calibration: true
            }
          }
        },
        triggers: [],
        limits: {
          maxActions: 1000,
          maxUsers: 100,
          maxContent: 10000,
          safetyOverride: true
        }
      },
      reporting: {
        enabled: true,
        reports: [],
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'UTC',
          enabled: true
        },
        recipients: [],
        retention: 90
      }
    }
  }

  private initializeStats(): ModerationStats {
    return {
      total: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
        appealed: 0,
        byType: {},
        byPriority: {}
      },
      flags: {
        total: 0,
        autoGenerated: 0,
        userReported: 0,
        reviewerGenerated: 0,
        byCategory: {},
        accuracy: 0
      },
      reviews: {
        total: 0,
        avgTime: 0,
        byReviewer: {},
        consensus: 0,
        disagreements: 0,
        escalations: 0
      },
      actions: {
        total: 0,
        automated: 0,
        manual: 0,
        reversed: 0,
        byType: {},
        impact: {
          usersAffected: 0,
          contentRemoved: 0,
          appealsReceived: 0,
          falsPositives: 0
        }
      },
      accuracy: {
        overall: 0,
        automation: 0,
        humanReview: 0,
        falsePositives: 0,
        falseNegatives: 0,
        improvement: 0
      },
      performance: {
        throughput: 0,
        avgProcessingTime: 0,
        queueLength: 0,
        slaCompliance: 0,
        bottlenecks: []
      },
      trends: {
        volume: [],
        flagRate: [],
        accuracy: [],
        types: {}
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

  private async loadProfanityDatabase(): Promise<void> {
    try {
      const dbFile = path.join(this.configPath, 'profanity.json')
      const data = await fs.readFile(dbFile, 'utf-8')
      const words = JSON.parse(data)
      
      this.profanityDatabase = new Set(words)
    } catch (error) {
      // Load default profanity words
      const defaultWords = [
        'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'crap',
        'piss', 'cock', 'pussy', 'tits', 'bastard', 'whore'
      ]
      
      this.profanityDatabase = new Set(defaultWords)
      await this.saveProfanityDatabase()
    }
  }

  private async saveProfanityDatabase(): Promise<void> {
    const dbFile = path.join(this.configPath, 'profanity.json')
    const words = Array.from(this.profanityDatabase)
    await fs.writeFile(dbFile, JSON.stringify(words, null, 2))
  }

  private async setupDefaultFilters(): Promise<void> {
    if (this.config.filters.length === 0) {
      const defaultFilters: FilterConfig[] = [
        {
          id: 'profanity-filter',
          name: 'Profanity Filter',
          type: 'profanity',
          enabled: true,
          severity: 'medium',
          action: 'flag',
          threshold: 0.8,
          patterns: [{
            pattern: '\\b(fuck|shit|damn)\\b',
            type: 'regex',
            caseSensitive: false,
            wholeWord: true,
            weight: 1.0
          }],
          whitelist: [],
          blacklist: [],
          contexts: ['text', 'audio']
        },
        {
          id: 'spam-filter',
          name: 'Spam Detection',
          type: 'spam',
          enabled: true,
          severity: 'low',
          action: 'review',
          threshold: 0.7,
          patterns: [{
            pattern: '(buy now|limited time|click here|free money)',
            type: 'contains',
            caseSensitive: false,
            wholeWord: false,
            weight: 0.8
          }],
          whitelist: [],
          blacklist: [],
          contexts: ['text']
        }
      ]

      this.config.filters = defaultFilters
    }
  }

  async moderateContent(content: string, type: 'text' | 'image' | 'video' | 'audio' | 'link' | 'file' = 'text', metadata: any = {}): Promise<string> {
    const itemId = crypto.randomUUID()
    
    const item: ModerationItem = {
      id: itemId,
      content,
      type,
      source: metadata.source || 'api',
      userId: metadata.userId,
      timestamp: new Date(),
      language: metadata.language,
      metadata,
      status: 'pending',
      priority: 'medium',
      flags: [],
      reviews: [],
      actions: [],
      appeal: undefined
    }

    this.moderationItems.set(itemId, item)
    this.stats.total.total++
    this.stats.total.pending++
    this.stats.total.byType[type] = (this.stats.total.byType[type] || 0) + 1

    try {
      // Detect language if not provided
      if (!item.language) {
        item.language = await this.detectLanguage(content)
      }

      // Apply automated filters
      await this.applyAutomatedFilters(item)

      // Analyze sentiment
      if (this.config.sentiment.enabled && type === 'text') {
        await this.analyzeSentiment(item)
      }

      // Check for profanity
      if (this.config.profanity.enabled && type === 'text') {
        await this.checkProfanity(item)
      }

      // Apply content filters
      if (this.config.content.enabled) {
        await this.applyContentFilters(item)
      }

      // Determine if human review is needed
      const needsReview = this.needsHumanReview(item)
      
      if (needsReview) {
        this.addToQueue(item)
      } else {
        // Auto-approve or auto-reject based on flags
        await this.autoModerate(item)
      }

      this.emit('contentModerated', { itemId, status: item.status, flags: item.flags })
      
    } catch (error) {
      console.error('Content moderation error:', error)
      item.status = 'escalated'
      this.addToQueue(item)
      this.emit('moderationError', { itemId, error: error.message })
    }

    return itemId
  }

  private async detectLanguage(content: string): Promise<string> {
    // Simplified language detection - in production use proper library
    const commonWords = {
      en: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'],
      es: ['el', 'la', 'y', 'o', 'pero', 'en', 'por', 'para', 'de', 'que'],
      fr: ['le', 'la', 'et', 'ou', 'mais', 'dans', 'sur', 'à', 'pour', 'de'],
      de: ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'zu', 'für']
    }

    const words = content.toLowerCase().split(/\s+/)
    const scores: { [lang: string]: number } = {}

    for (const [lang, commonLangWords] of Object.entries(commonWords)) {
      scores[lang] = 0
      for (const word of words) {
        if (commonLangWords.includes(word)) {
          scores[lang]++
        }
      }
    }

    let detectedLang = this.config.multilingual.fallback
    let maxScore = 0

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score
        detectedLang = lang
      }
    }

    return detectedLang
  }

  private async applyAutomatedFilters(item: ModerationItem): Promise<void> {
    for (const filter of this.config.filters) {
      if (!filter.enabled) continue

      const matches = await this.checkFilter(item.content, filter)
      
      for (const match of matches) {
        const flag: ModerationFlag = {
          id: crypto.randomUUID(),
          type: filter.type,
          category: filter.name,
          severity: filter.severity,
          confidence: match.confidence,
          source: 'auto',
          timestamp: new Date(),
          details: match,
          resolved: false
        }

        item.flags.push(flag)
        this.stats.flags.total++
        this.stats.flags.autoGenerated++
        this.stats.flags.byCategory[filter.type] = (this.stats.flags.byCategory[filter.type] || 0) + 1
      }
    }
  }

  private async checkFilter(content: string, filter: FilterConfig): Promise<FilterMatch[]> {
    const matches: FilterMatch[] = []

    for (const pattern of filter.patterns) {
      const patternMatches = await this.checkPattern(content, pattern)
      
      for (const match of patternMatches) {
        if (match.confidence >= filter.threshold) {
          matches.push({
            pattern: pattern.pattern,
            match: match.text,
            position: match.position,
            confidence: match.confidence * pattern.weight,
            context: match.context
          })
        }
      }
    }

    return matches
  }

  private async checkPattern(content: string, pattern: FilterPattern): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = []

    switch (pattern.type) {
      case 'exact':
        const exactIndex = content.indexOf(pattern.pattern)
        if (exactIndex !== -1) {
          matches.push({
            text: pattern.pattern,
            position: exactIndex,
            confidence: 1.0,
            context: this.extractContext(content, exactIndex, pattern.pattern.length)
          })
        }
        break

      case 'contains':
        const containsRegex = new RegExp(pattern.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), pattern.caseSensitive ? 'g' : 'gi')
        let match
        while ((match = containsRegex.exec(content)) !== null) {
          matches.push({
            text: match[0],
            position: match.index,
            confidence: 0.9,
            context: this.extractContext(content, match.index, match[0].length)
          })
        }
        break

      case 'regex':
        const regex = new RegExp(pattern.pattern, pattern.caseSensitive ? 'g' : 'gi')
        let regexMatch
        while ((regexMatch = regex.exec(content)) !== null) {
          matches.push({
            text: regexMatch[0],
            position: regexMatch.index,
            confidence: 0.85,
            context: this.extractContext(content, regexMatch.index, regexMatch[0].length)
          })
        }
        break

      case 'soundex':
        // Simplified soundex matching
        const words = content.split(/\s+/)
        for (let i = 0; i < words.length; i++) {
          if (this.soundexMatch(words[i], pattern.pattern)) {
            const position = content.indexOf(words[i])
            matches.push({
              text: words[i],
              position,
              confidence: 0.7,
              context: this.extractContext(content, position, words[i].length)
            })
          }
        }
        break

      case 'levenshtein':
        // Simplified Levenshtein distance matching
        const levenWords = content.split(/\s+/)
        for (let i = 0; i < levenWords.length; i++) {
          const distance = this.levenshteinDistance(levenWords[i].toLowerCase(), pattern.pattern.toLowerCase())
          const similarity = 1 - (distance / Math.max(levenWords[i].length, pattern.pattern.length))
          
          if (similarity > 0.8) {
            const position = content.indexOf(levenWords[i])
            matches.push({
              text: levenWords[i],
              position,
              confidence: similarity,
              context: this.extractContext(content, position, levenWords[i].length)
            })
          }
        }
        break
    }

    return matches
  }

  private extractContext(content: string, position: number, length: number): string {
    const start = Math.max(0, position - 20)
    const end = Math.min(content.length, position + length + 20)
    return content.substring(start, end)
  }

  private soundexMatch(word1: string, word2: string): boolean {
    return this.soundex(word1) === this.soundex(word2)
  }

  private soundex(word: string): string {
    // Simplified soundex algorithm
    if (!word) return '0000'
    
    word = word.toUpperCase()
    let result = word[0]
    
    const mapping: { [key: string]: string } = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    }
    
    for (let i = 1; i < word.length; i++) {
      for (const [letters, code] of Object.entries(mapping)) {
        if (letters.includes(word[i])) {
          if (result[result.length - 1] !== code) {
            result += code
          }
          break
        }
      }
    }
    
    return (result + '0000').substring(0, 4)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private async analyzeSentiment(item: ModerationItem): Promise<void> {
    const cacheKey = crypto.createHash('md5').update(item.content).digest('hex')
    
    if (this.sentimentCache.has(cacheKey)) {
      const cachedResult = this.sentimentCache.get(cacheKey)
      item.metadata.sentiment = cachedResult
      return
    }

    // Simplified sentiment analysis - in production use proper ML models
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disgusting', 'horrible', 'angry', 'sad', 'disappointed']
    const toxicWords = ['kill', 'die', 'murder', 'threat', 'harm', 'violence', 'attack']

    const words = item.content.toLowerCase().split(/\s+/)
    let positiveScore = 0
    let negativeScore = 0
    let toxicScore = 0

    for (const word of words) {
      if (positiveWords.includes(word)) positiveScore++
      if (negativeWords.includes(word)) negativeScore++
      if (toxicWords.includes(word)) toxicScore++
    }

    const totalWords = words.length
    const sentiment = {
      positive: positiveScore / totalWords,
      negative: negativeScore / totalWords,
      toxic: toxicScore / totalWords,
      neutral: 1 - (positiveScore + negativeScore) / totalWords,
      overall: (positiveScore - negativeScore) / totalWords,
      confidence: 0.7
    }

    // Check toxicity threshold
    if (sentiment.toxic > this.config.sentiment.toxicity.threshold) {
      const flag: ModerationFlag = {
        id: crypto.randomUUID(),
        type: 'toxicity',
        category: 'toxic_content',
        severity: 'high',
        confidence: sentiment.confidence,
        source: 'auto',
        timestamp: new Date(),
        details: { sentiment, toxicWords: words.filter(w => toxicWords.includes(w)) },
        resolved: false
      }
      item.flags.push(flag)
    }

    item.metadata.sentiment = sentiment
    this.sentimentCache.set(cacheKey, sentiment)
  }

  private async checkProfanity(item: ModerationItem): Promise<void> {
    const content = item.content.toLowerCase()
    const words = content.split(/\s+/)
    const profanityMatches: string[] = []

    for (const word of words) {
      // Check exact matches
      if (this.profanityDatabase.has(word)) {
        profanityMatches.push(word)
        continue
      }

      // Check with leet speak conversion
      if (this.config.profanity.detection.leetSpeak) {
        const normalizedWord = this.normalizeLeetSpeak(word)
        if (this.profanityDatabase.has(normalizedWord)) {
          profanityMatches.push(word)
          continue
        }
      }

      // Check with spacing removed
      if (this.config.profanity.detection.spacing) {
        const noSpaceWord = word.replace(/[^a-z]/g, '')
        if (this.profanityDatabase.has(noSpaceWord)) {
          profanityMatches.push(word)
          continue
        }
      }

      // Check for repetition patterns
      if (this.config.profanity.detection.repetition) {
        const deduplicatedWord = word.replace(/(.)\1+/g, '$1')
        if (this.profanityDatabase.has(deduplicatedWord)) {
          profanityMatches.push(word)
          continue
        }
      }
    }

    if (profanityMatches.length > 0) {
      const severity = this.determineProfanitySeverity(profanityMatches)
      const category = this.config.profanity.categories.find(c => c.severity === severity)
      
      if (category) {
        const flag: ModerationFlag = {
          id: crypto.randomUUID(),
          type: 'profanity',
          category: category.name,
          severity: category.severity,
          confidence: 0.95,
          source: 'auto',
          timestamp: new Date(),
          details: { matches: profanityMatches, action: category.action },
          resolved: false
        }
        
        item.flags.push(flag)

        // Apply replacement if configured
        if (category.action === 'replace' && this.config.profanity.replacement.enabled) {
          item.content = this.replaceProfanity(item.content, profanityMatches)
          item.metadata.modified = true
        }
      }
    }
  }

  private normalizeLeetSpeak(word: string): string {
    const leetMap: { [key: string]: string } = {
      '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
      '7': 't', '8': 'b', '@': 'a', '$': 's', '+': 't'
    }

    return word.replace(/[0-9@$+]/g, char => leetMap[char] || char)
  }

  private determineProfanitySeverity(matches: string[]): 'mild' | 'moderate' | 'severe' | 'extreme' {
    const severityScores = matches.map(match => {
      for (const category of this.config.profanity.categories) {
        if (category.words.includes(match.toLowerCase()) || category.variants.includes(match.toLowerCase())) {
          switch (category.severity) {
            case 'mild': return 1
            case 'moderate': return 2
            case 'severe': return 3
            case 'extreme': return 4
          }
        }
      }
      return 1
    })

    const maxScore = Math.max(...severityScores)
    switch (maxScore) {
      case 4: return 'extreme'
      case 3: return 'severe'
      case 2: return 'moderate'
      default: return 'mild'
    }
  }

  private replaceProfanity(content: string, matches: string[]): string {
    let result = content
    const config = this.config.profanity.replacement

    for (const match of matches) {
      const replacement = config.customReplacements[match.toLowerCase()] || 
                         (config.preserveLength ? config.maskCharacter.repeat(match.length) : config.maskCharacter)
      
      const regex = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      result = result.replace(regex, replacement)
    }

    return result
  }

  private async applyContentFilters(item: ModerationItem): Promise<void> {
    // Length filter
    if (this.config.content.lengthFilter.enabled) {
      const length = this.config.content.lengthFilter.characterCount ? 
                    item.content.length : 
                    item.content.split(/\s+/).length

      if (length < this.config.content.lengthFilter.minLength || 
          length > this.config.content.lengthFilter.maxLength) {
        const flag: ModerationFlag = {
          id: crypto.randomUUID(),
          type: 'content',
          category: 'length_violation',
          severity: 'low',
          confidence: 1.0,
          source: 'auto',
          timestamp: new Date(),
          details: { length, limits: this.config.content.lengthFilter },
          resolved: false
        }
        item.flags.push(flag)
      }
    }

    // Duplicate filter
    if (this.config.content.duplicateFilter.enabled) {
      const duplicates = await this.checkForDuplicates(item)
      if (duplicates.length > 0) {
        const flag: ModerationFlag = {
          id: crypto.randomUUID(),
          type: 'content',
          category: 'duplicate_content',
          severity: 'low',
          confidence: 0.8,
          source: 'auto',
          timestamp: new Date(),
          details: { duplicates },
          resolved: false
        }
        item.flags.push(flag)
      }
    }

    // Link filter
    if (this.config.content.linkFilter.enabled && item.type === 'text') {
      const links = this.extractLinks(item.content)
      for (const link of links) {
        const linkSafety = await this.checkLinkSafety(link)
        if (!linkSafety.safe) {
          const flag: ModerationFlag = {
            id: crypto.randomUUID(),
            type: 'content',
            category: 'malicious_link',
            severity: linkSafety.severity,
            confidence: linkSafety.confidence,
            source: 'auto',
            timestamp: new Date(),
            details: { link, reason: linkSafety.reason },
            resolved: false
          }
          item.flags.push(flag)
        }
      }
    }
  }

  private async checkForDuplicates(item: ModerationItem): Promise<string[]> {
    const duplicates: string[] = []
    const threshold = this.config.content.duplicateFilter.threshold / 100
    const windowMs = this.config.content.duplicateFilter.timeWindow * 60 * 1000
    const cutoffTime = new Date(Date.now() - windowMs)

    for (const [id, existingItem] of this.moderationItems) {
      if (id === item.id || existingItem.timestamp < cutoffTime) continue
      
      const similarity = this.calculateSimilarity(item.content, existingItem.content)
      if (similarity >= threshold) {
        duplicates.push(id)
      }
    }

    return duplicates
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simplified similarity calculation - in production use proper algorithms
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  private extractLinks(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = content.match(urlRegex)
    return matches || []
  }

  private async checkLinkSafety(link: string): Promise<LinkSafetyResult> {
    try {
      const domain = new URL(link).hostname

      // Check blacklist
      if (this.config.content.linkFilter.blacklist.includes(domain)) {
        return {
          safe: false,
          reason: 'Domain in blacklist',
          severity: 'high',
          confidence: 1.0
        }
      }

      // Check whitelist
      if (this.config.content.linkFilter.whitelist.includes(domain)) {
        return {
          safe: true,
          reason: 'Domain in whitelist',
          severity: 'low',
          confidence: 1.0
        }
      }

      // Check for URL shorteners
      if (this.config.content.linkFilter.shortened) {
        const shorteners = ['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly']
        if (shorteners.includes(domain)) {
          return {
            safe: false,
            reason: 'Shortened URL',
            severity: 'medium',
            confidence: 0.8
          }
        }
      }

      // In production, integrate with URL reputation services
      return {
        safe: true,
        reason: 'No threats detected',
        severity: 'low',
        confidence: 0.7
      }
    } catch (error) {
      return {
        safe: false,
        reason: 'Invalid URL',
        severity: 'medium',
        confidence: 0.9
      }
    }
  }

  private needsHumanReview(item: ModerationItem): boolean {
    // High severity flags always need review
    const highSeverityFlags = item.flags.filter(f => f.severity === 'high' || f.severity === 'critical')
    if (highSeverityFlags.length > 0) {
      return true
    }

    // Multiple flags need review
    if (item.flags.length >= 3) {
      return true
    }

    // Low confidence flags need review
    const lowConfidenceFlags = item.flags.filter(f => f.confidence < 0.8)
    if (lowConfidenceFlags.length > 0) {
      return true
    }

    // New users or users with history of violations
    if (item.userId && this.isHighRiskUser(item.userId)) {
      return true
    }

    return false
  }

  private isHighRiskUser(userId: string): boolean {
    // In production, check user's moderation history
    // For now, simplified check
    return false
  }

  private addToQueue(item: ModerationItem): void {
    this.queue.push(item)
    this.stats.total.pending++
    
    // Sort queue by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    this.emit('itemQueued', { itemId: item.id, queuePosition: this.queue.length })
  }

  private async autoModerate(item: ModerationItem): Promise<void> {
    const hasViolations = item.flags.some(f => f.severity === 'high' || f.severity === 'critical')
    
    if (hasViolations) {
      item.status = 'rejected'
      this.stats.total.rejected++
      
      const action: ModerationAction = {
        id: crypto.randomUUID(),
        type: 'reject',
        executor: 'system',
        timestamp: new Date(),
        reason: 'Automated rejection due to policy violations',
        parameters: { flags: item.flags.map(f => f.id) },
        reversible: true,
        reversed: false,
        impact: {
          usersAffected: 1,
          contentAffected: 1,
          severity: 'medium',
          appeal: true,
          public: false
        }
      }
      
      item.actions.push(action)
      this.stats.actions.total++
      this.stats.actions.automated++
      
    } else {
      item.status = 'approved'
      this.stats.total.approved++
      
      const action: ModerationAction = {
        id: crypto.randomUUID(),
        type: 'approve',
        executor: 'system',
        timestamp: new Date(),
        reason: 'Automated approval - no violations detected',
        parameters: {},
        reversible: false,
        reversed: false,
        impact: {
          usersAffected: 0,
          contentAffected: 0,
          severity: 'low',
          appeal: false,
          public: true
        }
      }
      
      item.actions.push(action)
      this.stats.actions.total++
      this.stats.actions.automated++
    }

    this.stats.total.pending--
    this.emit('itemProcessed', { itemId: item.id, status: item.status, automated: true })
  }

  private async startProcessing(): Promise<void> {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue()
      } catch (error) {
        console.error('Queue processing error:', error)
        this.emit('processingError', error)
      }
    }, 5000) // Process every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return

    const item = this.queue.shift()
    if (!item) return

    this.stats.performance.queueLength = this.queue.length

    try {
      // Simulate human review for high-priority items
      if (item.priority === 'high' || item.priority === 'critical') {
        await this.simulateHumanReview(item)
      } else {
        await this.autoModerate(item)
      }
    } catch (error) {
      console.error('Item processing error:', error)
      item.status = 'escalated'
      this.emit('itemEscalated', { itemId: item.id, reason: error.message })
    }
  }

  private async simulateHumanReview(item: ModerationItem): Promise<void> {
    // Simulate review time
    const reviewTime = Math.random() * 30 + 10 // 10-40 seconds

    await new Promise(resolve => setTimeout(resolve, reviewTime * 1000))

    // Simulate reviewer decision
    const decision = Math.random() > 0.7 ? 'approve' : 'reject'
    
    const review: ModerationReview = {
      id: crypto.randomUUID(),
      reviewerId: 'system-reviewer',
      decision: decision as any,
      reason: decision === 'approve' ? 'No policy violations found' : 'Content violates community guidelines',
      confidence: 0.85,
      timestamp: new Date(),
      duration: reviewTime,
      notes: 'Automated simulation of human review',
      tags: item.flags.map(f => f.category)
    }

    item.reviews.push(review)
    item.status = decision === 'approve' ? 'approved' : 'rejected'

    this.stats.total.pending--
    if (decision === 'approve') {
      this.stats.total.approved++
    } else {
      this.stats.total.rejected++
    }

    this.stats.reviews.total++
    this.stats.reviews.avgTime = (this.stats.reviews.avgTime + reviewTime) / 2

    this.emit('itemReviewed', { itemId: item.id, decision, reviewTime })
  }

  private async startStatsCollection(): Promise<void> {
    this.statsInterval = setInterval(() => {
      try {
        this.updateStats()
      } catch (error) {
        console.error('Stats collection error:', error)
      }
    }, 60000) // Update every minute
  }

  private updateStats(): void {
    // Update performance metrics
    this.stats.performance.queueLength = this.queue.length
    this.stats.performance.throughput = this.stats.total.total / Math.max(1, Date.now() / 60000) // items per minute

    // Update accuracy metrics
    if (this.stats.total.total > 0) {
      this.stats.accuracy.overall = (this.stats.total.approved + this.stats.total.rejected) / this.stats.total.total
      this.stats.accuracy.automation = this.stats.actions.automated / this.stats.actions.total
    }

    // Update flag accuracy
    if (this.stats.flags.total > 0) {
      this.stats.flags.accuracy = 1 - (this.stats.actions.impact.falsPositives / this.stats.flags.total)
    }

    this.emit('statsUpdated', this.stats)
  }

  private async startCleanupTask(): Promise<void> {
    this.cleanupInterval = setInterval(() => {
      try {
        this.performCleanup()
      } catch (error) {
        console.error('Cleanup task error:', error)
      }
    }, 3600000) // Every hour
  }

  private performCleanup(): void {
    const now = new Date()
    const retentionMs = 30 * 24 * 60 * 60 * 1000 // 30 days

    // Clean old moderation items
    for (const [id, item] of this.moderationItems) {
      if (now.getTime() - item.timestamp.getTime() > retentionMs) {
        this.moderationItems.delete(id)
      }
    }

    // Clean old sentiment cache
    if (this.sentimentCache.size > 10000) {
      this.sentimentCache.clear()
    }

    // Clean expired queue items
    this.queue = this.queue.filter(item => {
      const age = now.getTime() - item.timestamp.getTime()
      return age < (this.config.moderation.queue.timeouts.expire * 60 * 60 * 1000)
    })
  }

  async getModerationItem(id: string): Promise<ModerationItem | undefined> {
    return this.moderationItems.get(id)
  }

  async getQueueStatus(): Promise<{ length: number; avgWaitTime: number; oldestItem: Date | null }> {
    return {
      length: this.queue.length,
      avgWaitTime: this.queue.length > 0 ? 
                   this.queue.reduce((sum, item) => sum + (Date.now() - item.timestamp.getTime()), 0) / this.queue.length / 1000 :
                   0,
      oldestItem: this.queue.length > 0 ? this.queue[this.queue.length - 1].timestamp : null
    }
  }

  async getStats(): Promise<ModerationStats> {
    return JSON.parse(JSON.stringify(this.stats))
  }

  async addCustomProfanity(words: string[]): Promise<void> {
    for (const word of words) {
      this.profanityDatabase.add(word.toLowerCase())
    }
    await this.saveProfanityDatabase()
    this.emit('profanityDatabaseUpdated', { added: words })
  }

  async removeCustomProfanity(words: string[]): Promise<void> {
    for (const word of words) {
      this.profanityDatabase.delete(word.toLowerCase())
    }
    await this.saveProfanityDatabase()
    this.emit('profanityDatabaseUpdated', { removed: words })
  }

  async getConfiguration(): Promise<ContentModerationConfig> {
    return JSON.parse(JSON.stringify(this.config))
  }

  async updateConfiguration(config: Partial<ContentModerationConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfiguration()
    this.emit('configurationUpdated', this.config)
  }

  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'config.json')
    await fs.writeFile(configFile, JSON.stringify(this.config, null, 2))
  }

  async destroy(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.removeAllListeners()
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

interface FilterMatch {
  pattern: string
  match: string
  position: number
  confidence: number
  context: string
}

interface PatternMatch {
  text: string
  position: number
  confidence: number
  context: string
}

interface LinkSafetyResult {
  safe: boolean
  reason: string
  severity: 'low' | 'medium' | 'high'
  confidence: number
}

export const contentModerationService = new ContentModerationService()