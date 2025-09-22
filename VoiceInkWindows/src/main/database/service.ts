/**
 * Database Service
 * Handles all database operations using Prisma
 */

import { PrismaClient, Transcription, PowerModeConfig, AIPrompt } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'

export class DatabaseService {
  private prisma: PrismaClient
  private dbPath: string

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'voiceink.db')
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${this.dbPath}`
        }
      }
    })
  }

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    try {
      // Run migrations if needed
      await this.prisma.$connect()
      console.log('Database connected:', this.dbPath)
      
      // Initialize default data
      await this.initializeDefaults()
    } catch (err) {
      console.error('Database initialization failed:', err)
      throw err
    }
  }

  /**
   * Initialize default data
   */
  private async initializeDefaults(): Promise<void> {
    // Check if we have default prompts
    const promptCount = await this.prisma.aIPrompt.count()
    
    if (promptCount === 0) {
      // Add default AI prompts
      await this.prisma.aIPrompt.createMany({
        data: [
          {
            name: 'Fix Grammar',
            prompt: 'Fix any grammar and spelling mistakes in the following text:',
            category: 'correction',
            isDefault: true
          },
          {
            name: 'Make Professional',
            prompt: 'Rewrite the following text in a professional tone:',
            category: 'style',
            isDefault: true
          },
          {
            name: 'Summarize',
            prompt: 'Summarize the following text concisely:',
            category: 'summary',
            isDefault: true
          },
          {
            name: 'Expand',
            prompt: 'Expand on the following text with more detail:',
            category: 'expansion',
            isDefault: true
          }
        ]
      })
    }
  }

  /**
   * Save transcription
   */
  async saveTranscription(data: {
    text: string
    originalText?: string
    model: string
    duration?: number
    applicationName?: string
    applicationPath?: string
    url?: string
    enhanced?: boolean
    enhancedBy?: string
    promptUsed?: string
  }): Promise<Transcription> {
    const wordCount = data.text.split(/\s+/).length
    
    const transcription = await this.prisma.transcription.create({
      data: {
        ...data,
        wordCount,
        audioPath: null // Will be implemented when audio saving is added
      }
    })

    // Update usage metrics
    await this.updateMetrics({
      transcriptionCount: 1,
      totalDuration: data.duration || 0,
      totalWords: wordCount,
      enhancedCount: data.enhanced ? 1 : 0
    })

    return transcription
  }

  /**
   * Get transcriptions with pagination
   */
  async getTranscriptions(options: {
    page?: number
    limit?: number
    search?: string
    applicationName?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{ transcriptions: Transcription[], total: number }> {
    const {
      page = 1,
      limit = 50,
      search,
      applicationName,
      startDate,
      endDate
    } = options

    const where: any = {}

    if (search) {
      where.text = { contains: search }
    }

    if (applicationName) {
      where.applicationName = applicationName
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [transcriptions, total] = await Promise.all([
      this.prisma.transcription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.transcription.count({ where })
    ])

    return { transcriptions, total }
  }

  /**
   * Get last transcription
   */
  async getLastTranscription(): Promise<Transcription | null> {
    return this.prisma.transcription.findFirst({
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Delete transcription
   */
  async deleteTranscription(id: string): Promise<void> {
    await this.prisma.transcription.delete({ where: { id } })
  }

  /**
   * Clear all transcriptions
   */
  async clearTranscriptions(): Promise<void> {
    await this.prisma.transcription.deleteMany()
  }

  /**
   * Get Power Mode configurations
   */
  async getPowerModeConfigs(): Promise<PowerModeConfig[]> {
    return this.prisma.powerModeConfig.findMany({
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Save Power Mode configuration
   */
  async savePowerModeConfig(config: Omit<PowerModeConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<PowerModeConfig> {
    return this.prisma.powerModeConfig.create({ data: config })
  }

  /**
   * Update Power Mode configuration
   */
  async updatePowerModeConfig(id: string, config: Partial<PowerModeConfig>): Promise<PowerModeConfig> {
    return this.prisma.powerModeConfig.update({
      where: { id },
      data: config
    })
  }

  /**
   * Delete Power Mode configuration
   */
  async deletePowerModeConfig(id: string): Promise<void> {
    await this.prisma.powerModeConfig.delete({ where: { id } })
  }

  /**
   * Get Power Mode config for app or URL
   */
  async getPowerModeForContext(appIdentifier?: string, url?: string): Promise<PowerModeConfig | null> {
    // First try URL match if provided
    if (url) {
      const configs = await this.prisma.powerModeConfig.findMany({
        where: { urlPattern: { not: null } }
      })

      for (const config of configs) {
        if (config.urlPattern && new RegExp(config.urlPattern).test(url)) {
          return config
        }
      }
    }

    // Then try app identifier
    if (appIdentifier) {
      return this.prisma.powerModeConfig.findFirst({
        where: { appIdentifier }
      })
    }

    return null
  }

  /**
   * Get AI prompts
   */
  async getAIPrompts(category?: string): Promise<AIPrompt[]> {
    const where = category ? { category } : {}
    return this.prisma.aIPrompt.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { name: 'asc' }
      ]
    })
  }

  /**
   * Save custom AI prompt
   */
  async saveAIPrompt(prompt: Omit<AIPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPrompt> {
    return this.prisma.aIPrompt.create({ data: prompt })
  }

  /**
   * Update AI prompt usage count
   */
  async incrementPromptUsage(id: string): Promise<void> {
    await this.prisma.aIPrompt.update({
      where: { id },
      data: { usageCount: { increment: 1 } }
    })
  }

  /**
   * Get custom words
   */
  async getCustomWords(): Promise<string[]> {
    const words = await this.prisma.customWord.findMany({
      select: { word: true }
    })
    return words.map(w => w.word)
  }

  /**
   * Add custom word
   */
  async addCustomWord(word: string, phonetic?: string, context?: string): Promise<void> {
    await this.prisma.customWord.upsert({
      where: { word },
      create: { word, phonetic, context },
      update: { phonetic, context }
    })
  }

  /**
   * Remove custom word
   */
  async removeCustomWord(word: string): Promise<void> {
    await this.prisma.customWord.delete({ where: { word } })
  }

  /**
   * Get replacements
   */
  async getReplacements(): Promise<Array<{ pattern: string, replacement: string, isRegex: boolean }>> {
    const replacements = await this.prisma.replacement.findMany({
      where: { isEnabled: true },
      select: { pattern: true, replacement: true, isRegex: true }
    })
    return replacements
  }

  /**
   * Add replacement
   */
  async addReplacement(pattern: string, replacement: string, isRegex = false): Promise<void> {
    await this.prisma.replacement.upsert({
      where: { pattern },
      create: { pattern, replacement, isRegex },
      update: { replacement, isRegex }
    })
  }

  /**
   * Remove replacement
   */
  async removeReplacement(pattern: string): Promise<void> {
    await this.prisma.replacement.delete({ where: { pattern } })
  }

  /**
   * Get usage metrics
   */
  async getMetrics(days = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await this.prisma.usageMetrics.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    })

    // Calculate totals
    const totals = metrics.reduce((acc, m) => ({
      transcriptions: acc.transcriptions + m.transcriptionCount,
      duration: acc.duration + m.totalDuration,
      words: acc.words + m.totalWords,
      enhanced: acc.enhanced + m.enhancedCount
    }), { transcriptions: 0, duration: 0, words: 0, enhanced: 0 })

    return { daily: metrics, totals }
  }

  /**
   * Update usage metrics
   */
  private async updateMetrics(data: {
    transcriptionCount: number
    totalDuration: number
    totalWords: number
    enhancedCount: number
  }): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await this.prisma.usageMetrics.upsert({
      where: { date: today },
      create: {
        date: today,
        ...data
      },
      update: {
        transcriptionCount: { increment: data.transcriptionCount },
        totalDuration: { increment: data.totalDuration },
        totalWords: { increment: data.totalWords },
        enhancedCount: { increment: data.enhancedCount }
      }
    })
  }

  /**
   * Export data
   */
  async exportData(): Promise<any> {
    const [transcriptions, powerModeConfigs, customWords, replacements, prompts] = await Promise.all([
      this.prisma.transcription.findMany(),
      this.prisma.powerModeConfig.findMany(),
      this.prisma.customWord.findMany(),
      this.prisma.replacement.findMany(),
      this.prisma.aIPrompt.findMany({ where: { isDefault: false } })
    ])

    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        transcriptions,
        powerModeConfigs,
        customWords,
        replacements,
        customPrompts: prompts
      }
    }
  }

  /**
   * Import data
   */
  async importData(data: any): Promise<void> {
    // Validate data structure
    if (!data.version || !data.data) {
      throw new Error('Invalid import data format')
    }

    // Import in transaction
    await this.prisma.$transaction(async (tx) => {
      // Import transcriptions
      if (data.data.transcriptions?.length) {
        await tx.transcription.createMany({
          data: data.data.transcriptions,
          skipDuplicates: true
        })
      }

      // Import other data...
      // Similar for other entities
    })
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(daysToKeep = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    await this.prisma.transcription.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    })
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }
}