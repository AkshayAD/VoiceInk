import { PrismaClient, Transcription } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./voiceink.db'
    }
  }
})

// Initialize database connection
prisma.$connect()
  .then(() => console.log('✅ Database connected'))
  .catch((error) => console.error('❌ Database connection failed:', error))

export interface TranscriptionData {
  text: string
  originalText?: string
  audioPath?: string
  duration?: number
  model: string
  language?: string
  applicationName?: string
  applicationPath?: string
  url?: string
  enhanced?: boolean
  enhancedBy?: string
  promptUsed?: string
  wordCount?: number
  segments?: any[]
  speakers?: any[]
  confidence?: number
}

export interface SearchOptions {
  query?: string
  startDate?: Date
  endDate?: Date
  language?: string
  applicationName?: string
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'duration' | 'wordCount'
  orderDirection?: 'asc' | 'desc'
}

class TranscriptionRepository {
  
  /**
   * Save a new transcription
   */
  async create(data: TranscriptionData): Promise<Transcription> {
    try {
      const transcription = await prisma.transcription.create({
        data: {
          id: uuidv4(),
          text: data.text,
          originalText: data.originalText || data.text,
          audioPath: data.audioPath,
          duration: data.duration || 0,
          model: data.model,
          language: data.language || 'en',
          applicationName: data.applicationName,
          applicationPath: data.applicationPath,
          url: data.url,
          enhanced: data.enhanced || false,
          enhancedBy: data.enhancedBy,
          promptUsed: data.promptUsed,
          wordCount: data.wordCount || data.text.split(/\s+/).length
        }
      })
      
      console.log('✅ Transcription saved:', transcription.id)
      return transcription
      
    } catch (error) {
      console.error('Failed to save transcription:', error)
      throw error
    }
  }
  
  /**
   * Get transcription by ID
   */
  async findById(id: string): Promise<Transcription | null> {
    try {
      return await prisma.transcription.findUnique({
        where: { id }
      })
    } catch (error) {
      console.error('Failed to find transcription:', error)
      return null
    }
  }
  
  /**
   * Get all transcriptions with optional filters
   */
  async findAll(options: SearchOptions = {}): Promise<Transcription[]> {
    try {
      const where: any = {}
      
      // Text search
      if (options.query) {
        where.OR = [
          { text: { contains: options.query } },
          { originalText: { contains: options.query } }
        ]
      }
      
      // Date range
      if (options.startDate || options.endDate) {
        where.createdAt = {}
        if (options.startDate) {
          where.createdAt.gte = options.startDate
        }
        if (options.endDate) {
          where.createdAt.lte = options.endDate
        }
      }
      
      // Language filter
      if (options.language) {
        where.language = options.language
      }
      
      // Application filter
      if (options.applicationName) {
        where.applicationName = options.applicationName
      }
      
      // Build order
      const orderBy: any = {}
      const field = options.orderBy || 'createdAt'
      orderBy[field] = options.orderDirection || 'desc'
      
      return await prisma.transcription.findMany({
        where,
        orderBy,
        take: options.limit || 100,
        skip: options.offset || 0
      })
      
    } catch (error) {
      console.error('Failed to fetch transcriptions:', error)
      return []
    }
  }
  
  /**
   * Search transcriptions by text
   */
  async search(query: string, limit: number = 20): Promise<Transcription[]> {
    try {
      return await prisma.transcription.findMany({
        where: {
          OR: [
            { text: { contains: query } },
            { originalText: { contains: query } },
            { applicationName: { contains: query } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }
  
  /**
   * Update transcription
   */
  async update(id: string, data: Partial<TranscriptionData>): Promise<Transcription | null> {
    try {
      const updateData: any = {}
      
      if (data.text !== undefined) {
        updateData.text = data.text
        updateData.wordCount = data.text.split(/\s+/).length
      }
      
      if (data.enhanced !== undefined) updateData.enhanced = data.enhanced
      if (data.enhancedBy !== undefined) updateData.enhancedBy = data.enhancedBy
      if (data.promptUsed !== undefined) updateData.promptUsed = data.promptUsed
      if (data.language !== undefined) updateData.language = data.language
      
      return await prisma.transcription.update({
        where: { id },
        data: updateData
      })
      
    } catch (error) {
      console.error('Failed to update transcription:', error)
      return null
    }
  }
  
  /**
   * Delete transcription
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.transcription.delete({
        where: { id }
      })
      console.log('✅ Transcription deleted:', id)
      return true
    } catch (error) {
      console.error('Failed to delete transcription:', error)
      return false
    }
  }
  
  /**
   * Delete all transcriptions
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await prisma.transcription.deleteMany()
      console.log(`✅ Deleted ${result.count} transcriptions`)
      return result.count
    } catch (error) {
      console.error('Failed to delete all transcriptions:', error)
      return 0
    }
  }
  
  /**
   * Get last transcription
   */
  async findLast(): Promise<Transcription | null> {
    try {
      return await prisma.transcription.findFirst({
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      console.error('Failed to get last transcription:', error)
      return null
    }
  }
  
  /**
   * Get transcriptions by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Transcription[]> {
    try {
      return await prisma.transcription.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      console.error('Failed to get transcriptions by date:', error)
      return []
    }
  }
  
  /**
   * Get transcription statistics
   */
  async getStatistics(days: number = 30): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const transcriptions = await prisma.transcription.findMany({
        where: {
          createdAt: { gte: startDate }
        }
      })
      
      const totalCount = transcriptions.length
      const totalDuration = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0)
      const totalWords = transcriptions.reduce((sum, t) => sum + t.wordCount, 0)
      const enhancedCount = transcriptions.filter(t => t.enhanced).length
      
      const languageStats: { [key: string]: number } = {}
      const appStats: { [key: string]: number } = {}
      
      transcriptions.forEach(t => {
        // Language statistics
        if (t.language) {
          languageStats[t.language] = (languageStats[t.language] || 0) + 1
        }
        
        // Application statistics
        if (t.applicationName) {
          appStats[t.applicationName] = (appStats[t.applicationName] || 0) + 1
        }
      })
      
      return {
        totalCount,
        totalDuration,
        totalWords,
        enhancedCount,
        averageDuration: totalCount > 0 ? totalDuration / totalCount : 0,
        averageWords: totalCount > 0 ? totalWords / totalCount : 0,
        enhancementRate: totalCount > 0 ? enhancedCount / totalCount : 0,
        languageStats,
        appStats,
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
      
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return null
    }
  }
  
  /**
   * Get transcriptions by application
   */
  async findByApplication(applicationName: string): Promise<Transcription[]> {
    try {
      return await prisma.transcription.findMany({
        where: { applicationName },
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      console.error('Failed to get transcriptions by app:', error)
      return []
    }
  }
  
  /**
   * Batch create transcriptions
   */
  async createMany(transcriptions: TranscriptionData[]): Promise<number> {
    try {
      const data = transcriptions.map(t => ({
        id: uuidv4(),
        text: t.text,
        originalText: t.originalText || t.text,
        audioPath: t.audioPath,
        duration: t.duration || 0,
        model: t.model,
        language: t.language || 'en',
        applicationName: t.applicationName,
        applicationPath: t.applicationPath,
        url: t.url,
        enhanced: t.enhanced || false,
        enhancedBy: t.enhancedBy,
        promptUsed: t.promptUsed,
        wordCount: t.wordCount || t.text.split(/\s+/).length
      }))
      
      const result = await prisma.transcription.createMany({ data })
      console.log(`✅ Created ${result.count} transcriptions`)
      return result.count
      
    } catch (error) {
      console.error('Failed to batch create:', error)
      return 0
    }
  }
  
  /**
   * Export transcriptions to JSON
   */
  async exportToJson(ids?: string[]): Promise<any[]> {
    try {
      if (ids && ids.length > 0) {
        return await prisma.transcription.findMany({
          where: { id: { in: ids } }
        })
      } else {
        return await prisma.transcription.findMany()
      }
    } catch (error) {
      console.error('Failed to export:', error)
      return []
    }
  }
  
  /**
   * Get database info
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      const count = await prisma.transcription.count()
      const oldest = await prisma.transcription.findFirst({
        orderBy: { createdAt: 'asc' }
      })
      const newest = await prisma.transcription.findFirst({
        orderBy: { createdAt: 'desc' }
      })
      
      return {
        totalRecords: count,
        oldestRecord: oldest?.createdAt,
        newestRecord: newest?.createdAt,
        databasePath: process.env.DATABASE_URL || 'file:./voiceink.db'
      }
      
    } catch (error) {
      console.error('Failed to get database info:', error)
      return null
    }
  }
}

// Export singleton instance
export const transcriptionRepository = new TranscriptionRepository()

// Clean up on exit
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})