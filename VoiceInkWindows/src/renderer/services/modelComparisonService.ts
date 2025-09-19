/**
 * AI Model Comparison and A/B Testing Service
 * Allows testing multiple models on same audio, comparing results, and tracking performance
 */

export interface ModelTest {
  id: string
  name: string
  description?: string
  audioFileId: string
  audioFileName: string
  models: ModelTestConfig[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  results: ModelTestResult[]
  winner?: string // model ID with best score
  metrics: ComparisonMetrics
}

export interface ModelTestConfig {
  id: string
  name: string
  model: string // e.g., 'gemini-2.5-flash', 'gemini-2.5-pro'
  options: {
    language?: string
    enableSpeakerDiarization?: boolean
    enableTimestamps?: boolean
    temperature?: number
    maxSpeakers?: number
    prompt?: string
  }
  enabled: boolean
}

export interface ModelTestResult {
  id: string
  testId: string
  modelId: string
  modelName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  transcription?: any
  error?: string
  metrics: ResultMetrics
}

export interface ResultMetrics {
  // Performance metrics
  processingTime: number // seconds
  requestTime: number // API request time
  tokensUsed?: number
  cost?: number // estimated cost

  // Quality metrics (if ground truth available)
  accuracy?: number // 0-1
  wordErrorRate?: number // 0-1
  confidence: number // average confidence
  
  // Feature metrics
  speakerCount?: number
  segmentCount: number
  wordCount: number
  characterCount: number
  
  // User ratings (can be set manually)
  readabilityRating?: number // 1-5
  accuracyRating?: number // 1-5
  overallRating?: number // 1-5
}

export interface ComparisonMetrics {
  totalTests: number
  completedTests: number
  failedTests: number
  averageProcessingTime: number
  bestAccuracy?: number
  bestModel?: string
  costEfficiency?: { model: string, score: number }[]
}

export interface ABTestConfig {
  name: string
  description?: string
  models: string[]
  testSplit: number // percentage (e.g., 50 for 50/50 split)
  criteria: 'speed' | 'accuracy' | 'cost' | 'user_preference'
  duration: number // days
  minSampleSize: number
}

export interface ABTestResult {
  id: string
  config: ABTestConfig
  status: 'active' | 'completed' | 'paused'
  startDate: Date
  endDate?: Date
  samples: ABTestSample[]
  results: ABTestMetrics
}

export interface ABTestSample {
  id: string
  audioId: string
  assignedModel: string
  userRating?: number
  metrics: ResultMetrics
  timestamp: Date
}

export interface ABTestMetrics {
  [modelName: string]: {
    sampleCount: number
    avgProcessingTime: number
    avgAccuracy: number
    avgUserRating: number
    avgCost: number
    winRate: number // percentage of times this model was preferred
  }
}

export class ModelComparisonService {
  private tests: Map<string, ModelTest> = new Map()
  private abTests: Map<string, ABTestResult> = new Map()
  private storageKey = 'voiceink-model-tests'
  private abStorageKey = 'voiceink-ab-tests'

  constructor() {
    this.loadTests()
    this.loadABTests()
  }

  /**
   * Load tests from storage
   */
  private loadTests(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        data.forEach((test: any) => {
          // Convert date strings back to Date objects
          test.createdAt = new Date(test.createdAt)
          if (test.completedAt) test.completedAt = new Date(test.completedAt)
          test.results.forEach((result: any) => {
            if (result.startTime) result.startTime = new Date(result.startTime)
            if (result.endTime) result.endTime = new Date(result.endTime)
          })
          this.tests.set(test.id, test)
        })
      }
    } catch (error) {
      console.error('Failed to load model tests:', error)
    }
  }

  /**
   * Save tests to storage
   */
  private saveTests(): void {
    try {
      const data = Array.from(this.tests.values())
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save model tests:', error)
    }
  }

  /**
   * Load A/B tests from storage
   */
  private loadABTests(): void {
    try {
      const stored = localStorage.getItem(this.abStorageKey)
      if (stored) {
        const data = JSON.parse(stored)
        data.forEach((abTest: any) => {
          abTest.startDate = new Date(abTest.startDate)
          if (abTest.endDate) abTest.endDate = new Date(abTest.endDate)
          abTest.samples.forEach((sample: any) => {
            sample.timestamp = new Date(sample.timestamp)
          })
          this.abTests.set(abTest.id, abTest)
        })
      }
    } catch (error) {
      console.error('Failed to load A/B tests:', error)
    }
  }

  /**
   * Save A/B tests to storage
   */
  private saveABTests(): void {
    try {
      const data = Array.from(this.abTests.values())
      localStorage.setItem(this.abStorageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save A/B tests:', error)
    }
  }

  /**
   * Create new model comparison test
   */
  async createTest(config: {
    name: string
    description?: string
    audioFile: File
    models: ModelTestConfig[]
  }): Promise<ModelTest> {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const test: ModelTest = {
      id: testId,
      name: config.name,
      description: config.description,
      audioFileId: `audio-${Date.now()}`,
      audioFileName: config.audioFile.name,
      models: config.models,
      status: 'pending',
      createdAt: new Date(),
      results: [],
      metrics: {
        totalTests: config.models.filter(m => m.enabled).length,
        completedTests: 0,
        failedTests: 0,
        averageProcessingTime: 0
      }
    }

    this.tests.set(testId, test)
    this.saveTests()

    console.log(`🧪 Created model test: ${test.name}`)
    return test
  }

  /**
   * Run model comparison test
   */
  async runTest(testId: string): Promise<void> {
    const test = this.tests.get(testId)
    if (!test) throw new Error('Test not found')

    test.status = 'running'
    this.saveTests()

    console.log(`🚀 Running model test: ${test.name}`)

    try {
      const enabledModels = test.models.filter(m => m.enabled)
      
      for (const model of enabledModels) {
        await this.runModelTest(testId, model)
      }

      // Calculate final metrics
      test.metrics = this.calculateTestMetrics(test)
      test.winner = this.determineWinner(test)
      test.status = 'completed'
      test.completedAt = new Date()

    } catch (error) {
      console.error('Test failed:', error)
      test.status = 'failed'
    }

    this.saveTests()
  }

  /**
   * Run test for single model
   */
  private async runModelTest(testId: string, modelConfig: ModelTestConfig): Promise<void> {
    const test = this.tests.get(testId)
    if (!test) return

    const resultId = `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const result: ModelTestResult = {
      id: resultId,
      testId,
      modelId: modelConfig.id,
      modelName: modelConfig.name,
      status: 'running',
      startTime: new Date(),
      metrics: {
        processingTime: 0,
        requestTime: 0,
        confidence: 0,
        segmentCount: 0,
        wordCount: 0,
        characterCount: 0
      }
    }

    test.results.push(result)
    this.saveTests()

    try {
      // Simulate API call to transcription service
      const startTime = Date.now()
      
      // This would be replaced with actual API calls
      const transcriptionResult = await this.simulateTranscription(modelConfig)
      
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      // Update result
      result.status = 'completed'
      result.endTime = new Date()
      result.duration = duration
      result.transcription = transcriptionResult
      result.metrics = this.calculateResultMetrics(transcriptionResult, duration)

      test.metrics.completedTests++

    } catch (error) {
      console.error(`Model ${modelConfig.name} failed:`, error)
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : 'Unknown error'
      test.metrics.failedTests++
    }

    this.saveTests()
  }

  /**
   * Simulate transcription for testing purposes
   */
  private async simulateTranscription(modelConfig: ModelTestConfig): Promise<any> {
    // Simulate different processing times and results for different models
    const processingTime = modelConfig.model.includes('pro') ? 
      2000 + Math.random() * 3000 : // Pro models: 2-5 seconds
      1000 + Math.random() * 2000   // Flash models: 1-3 seconds

    await new Promise(resolve => setTimeout(resolve, processingTime))

    // Simulate different quality levels
    const quality = modelConfig.model.includes('pro') ? 0.9 : 0.85
    const confidence = quality + (Math.random() * 0.1 - 0.05)

    return {
      text: `Simulated transcription from ${modelConfig.name}`,
      confidence,
      segments: [
        {
          text: `Sample transcription segment from ${modelConfig.name}`,
          startTime: 0,
          endTime: 5,
          confidence
        }
      ],
      speakers: modelConfig.options.enableSpeakerDiarization ? ['Speaker 1'] : [],
      language: modelConfig.options.language || 'en',
      duration: 5,
      model: modelConfig.model
    }
  }

  /**
   * Calculate result metrics
   */
  private calculateResultMetrics(transcription: any, processingTime: number): ResultMetrics {
    const text = transcription.text || ''
    
    return {
      processingTime,
      requestTime: processingTime * 0.8, // Assume 80% is request time
      confidence: transcription.confidence || 0,
      segmentCount: transcription.segments?.length || 0,
      wordCount: text.split(/\s+/).filter(w => w).length,
      characterCount: text.length,
      speakerCount: transcription.speakers?.length || 0
    }
  }

  /**
   * Calculate overall test metrics
   */
  private calculateTestMetrics(test: ModelTest): ComparisonMetrics {
    const completedResults = test.results.filter(r => r.status === 'completed')
    
    const averageProcessingTime = completedResults.length > 0 ?
      completedResults.reduce((sum, r) => sum + r.metrics.processingTime, 0) / completedResults.length : 0

    const bestAccuracy = Math.max(...completedResults.map(r => r.metrics.accuracy || 0))
    const bestModel = completedResults.find(r => r.metrics.accuracy === bestAccuracy)?.modelName

    return {
      totalTests: test.models.filter(m => m.enabled).length,
      completedTests: completedResults.length,
      failedTests: test.results.filter(r => r.status === 'failed').length,
      averageProcessingTime,
      bestAccuracy: bestAccuracy > 0 ? bestAccuracy : undefined,
      bestModel
    }
  }

  /**
   * Determine test winner
   */
  private determineWinner(test: ModelTest): string | undefined {
    const completedResults = test.results.filter(r => r.status === 'completed')
    if (completedResults.length === 0) return undefined

    // Score based on accuracy (60%), speed (30%), confidence (10%)
    let bestScore = 0
    let winner: string | undefined

    completedResults.forEach(result => {
      const accuracy = result.metrics.accuracy || result.metrics.confidence
      const speed = 1 / Math.max(result.metrics.processingTime, 0.1) // Inverse of time
      const confidence = result.metrics.confidence

      const score = (accuracy * 0.6) + (speed * 0.3) + (confidence * 0.1)

      if (score > bestScore) {
        bestScore = score
        winner = result.modelName
      }
    })

    return winner
  }

  /**
   * Create A/B test
   */
  createABTest(config: ABTestConfig): ABTestResult {
    const id = `ab-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const abTest: ABTestResult = {
      id,
      config,
      status: 'active',
      startDate: new Date(),
      samples: [],
      results: {}
    }

    // Initialize results for each model
    config.models.forEach(model => {
      abTest.results[model] = {
        sampleCount: 0,
        avgProcessingTime: 0,
        avgAccuracy: 0,
        avgUserRating: 0,
        avgCost: 0,
        winRate: 0
      }
    })

    this.abTests.set(id, abTest)
    this.saveABTests()

    console.log(`🧪 Created A/B test: ${config.name}`)
    return abTest
  }

  /**
   * Add sample to A/B test
   */
  addABTestSample(testId: string, sample: Omit<ABTestSample, 'id'>): void {
    const abTest = this.abTests.get(testId)
    if (!abTest || abTest.status !== 'active') return

    const sampleWithId: ABTestSample = {
      id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...sample
    }

    abTest.samples.push(sampleWithId)
    
    // Update results
    this.updateABTestResults(abTest)
    
    this.saveABTests()
  }

  /**
   * Update A/B test results
   */
  private updateABTestResults(abTest: ABTestResult): void {
    const samplesByModel: { [model: string]: ABTestSample[] } = {}
    
    // Group samples by model
    abTest.samples.forEach(sample => {
      if (!samplesByModel[sample.assignedModel]) {
        samplesByModel[sample.assignedModel] = []
      }
      samplesByModel[sample.assignedModel].push(sample)
    })

    // Calculate metrics for each model
    Object.keys(abTest.results).forEach(model => {
      const samples = samplesByModel[model] || []
      
      if (samples.length > 0) {
        abTest.results[model] = {
          sampleCount: samples.length,
          avgProcessingTime: samples.reduce((sum, s) => sum + s.metrics.processingTime, 0) / samples.length,
          avgAccuracy: samples.reduce((sum, s) => sum + (s.metrics.accuracy || 0), 0) / samples.length,
          avgUserRating: samples.filter(s => s.userRating).reduce((sum, s) => sum + (s.userRating || 0), 0) / Math.max(1, samples.filter(s => s.userRating).length),
          avgCost: samples.reduce((sum, s) => sum + (s.metrics.cost || 0), 0) / samples.length,
          winRate: 0 // Will be calculated later
        }
      }
    })

    // Calculate win rates based on comparison criteria
    this.calculateWinRates(abTest)
  }

  /**
   * Calculate win rates for A/B test
   */
  private calculateWinRates(abTest: ABTestResult): void {
    const models = abTest.config.models
    const criteria = abTest.config.criteria

    models.forEach(model => {
      let wins = 0
      let comparisons = 0

      // Compare this model against others
      models.forEach(otherModel => {
        if (model === otherModel) return

        const modelMetrics = abTest.results[model]
        const otherMetrics = abTest.results[otherModel]

        if (modelMetrics.sampleCount === 0 || otherMetrics.sampleCount === 0) return

        comparisons++

        // Determine winner based on criteria
        let modelWins = false
        switch (criteria) {
          case 'speed':
            modelWins = modelMetrics.avgProcessingTime < otherMetrics.avgProcessingTime
            break
          case 'accuracy':
            modelWins = modelMetrics.avgAccuracy > otherMetrics.avgAccuracy
            break
          case 'cost':
            modelWins = modelMetrics.avgCost < otherMetrics.avgCost
            break
          case 'user_preference':
            modelWins = modelMetrics.avgUserRating > otherMetrics.avgUserRating
            break
        }

        if (modelWins) wins++
      })

      if (comparisons > 0) {
        abTest.results[model].winRate = (wins / comparisons) * 100
      }
    })
  }

  /**
   * Get test by ID
   */
  getTest(id: string): ModelTest | null {
    return this.tests.get(id) || null
  }

  /**
   * Get all tests
   */
  getAllTests(): ModelTest[] {
    return Array.from(this.tests.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Get A/B test by ID
   */
  getABTest(id: string): ABTestResult | null {
    return this.abTests.get(id) || null
  }

  /**
   * Get all A/B tests
   */
  getAllABTests(): ABTestResult[] {
    return Array.from(this.abTests.values()).sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  }

  /**
   * Delete test
   */
  deleteTest(id: string): boolean {
    const deleted = this.tests.delete(id)
    if (deleted) {
      this.saveTests()
      console.log(`🗑️ Deleted test: ${id}`)
    }
    return deleted
  }

  /**
   * End A/B test
   */
  endABTest(id: string): boolean {
    const abTest = this.abTests.get(id)
    if (abTest && abTest.status === 'active') {
      abTest.status = 'completed'
      abTest.endDate = new Date()
      this.saveABTests()
      console.log(`🏁 Ended A/B test: ${abTest.config.name}`)
      return true
    }
    return false
  }

  /**
   * Get model performance summary
   */
  getModelPerformanceSummary(): { [model: string]: any } {
    const summary: { [model: string]: any } = {}
    
    // Aggregate data from all tests
    this.tests.forEach(test => {
      test.results.forEach(result => {
        if (result.status !== 'completed') return

        if (!summary[result.modelName]) {
          summary[result.modelName] = {
            testCount: 0,
            avgProcessingTime: 0,
            avgConfidence: 0,
            successRate: 0,
            totalTests: 0
          }
        }

        const model = summary[result.modelName]
        model.testCount++
        model.totalTests++
        model.avgProcessingTime = (model.avgProcessingTime * (model.testCount - 1) + result.metrics.processingTime) / model.testCount
        model.avgConfidence = (model.avgConfidence * (model.testCount - 1) + result.metrics.confidence) / model.testCount
      })
    })

    // Calculate success rates
    this.tests.forEach(test => {
      test.results.forEach(result => {
        if (summary[result.modelName]) {
          summary[result.modelName].successRate = (summary[result.modelName].testCount / summary[result.modelName].totalTests) * 100
        }
      })
    })

    return summary
  }
}

// Export singleton instance
export const modelComparison = new ModelComparisonService()