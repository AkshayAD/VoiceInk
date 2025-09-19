/**
 * Advanced Workflow Automation and Triggers (Step 118)
 * Event-driven automation with complex workflows and integrations
 */

import { EventEmitter } from 'events'
import * as cron from 'node-cron'

export interface Workflow {
  id: string
  name: string
  description: string
  triggers: Trigger[]
  actions: Action[]
  conditions: Condition[]
  status: 'active' | 'paused' | 'error'
  schedule?: string
  createdAt: Date
  lastRun?: Date
  runCount: number
}

export interface Trigger {
  id: string
  type: 'event' | 'schedule' | 'webhook' | 'file' | 'condition'
  config: TriggerConfig
}

export interface TriggerConfig {
  eventName?: string
  schedule?: string // cron expression
  webhookUrl?: string
  filePath?: string
  condition?: string
  debounce?: number
}

export interface Action {
  id: string
  type: 'transcribe' | 'export' | 'notify' | 'api' | 'script' | 'chain'
  config: ActionConfig
  retryPolicy?: RetryPolicy
  timeout?: number
}

export interface ActionConfig {
  method?: string
  url?: string
  headers?: { [key: string]: string }
  body?: any
  script?: string
  template?: string
  destination?: string
  format?: string
  chainedWorkflow?: string
}

export interface Condition {
  id: string
  type: 'if' | 'while' | 'foreach' | 'switch'
  expression: string
  trueBranch?: Action[]
  falseBranch?: Action[]
  cases?: { [key: string]: Action[] }
}

export interface RetryPolicy {
  maxAttempts: number
  backoffType: 'linear' | 'exponential'
  initialDelay: number
  maxDelay: number
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  results: any[]
  errors?: any[]
  variables: { [key: string]: any }
}

export class WorkflowAutomationService extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map()
  private executions: Map<string, WorkflowExecution> = new Map()
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map()
  private eventHandlers: Map<string, Set<string>> = new Map()
  private webhookListeners: Map<string, any> = new Map()
  private watchedFiles: Map<string, any> = new Map()

  constructor() {
    super()
    this.initializeBuiltInWorkflows()
    this.startExecutionMonitor()
    console.log('🔄 Advanced workflow automation and triggers initialized')
  }

  private initializeBuiltInWorkflows(): void {
    // Auto-transcription workflow
    this.createWorkflow({
      id: 'auto-transcribe',
      name: 'Auto-Transcription',
      description: 'Automatically transcribe when audio file is added',
      triggers: [{
        id: 't1',
        type: 'file',
        config: {
          filePath: './recordings/*.wav',
          debounce: 1000
        }
      }],
      actions: [{
        id: 'a1',
        type: 'transcribe',
        config: {
          destination: './transcriptions'
        }
      }, {
        id: 'a2',
        type: 'notify',
        config: {
          template: 'Transcription complete for {{fileName}}'
        }
      }],
      conditions: [],
      status: 'active',
      runCount: 0,
      createdAt: new Date()
    })

    // Daily summary workflow
    this.createWorkflow({
      id: 'daily-summary',
      name: 'Daily Summary',
      description: 'Generate daily transcription summary',
      triggers: [{
        id: 't2',
        type: 'schedule',
        config: {
          schedule: '0 18 * * *' // 6 PM daily
        }
      }],
      actions: [{
        id: 'a3',
        type: 'script',
        config: {
          script: 'generateDailySummary'
        }
      }, {
        id: 'a4',
        type: 'export',
        config: {
          format: 'pdf',
          destination: './summaries'
        }
      }],
      conditions: [],
      status: 'active',
      schedule: '0 18 * * *',
      runCount: 0,
      createdAt: new Date()
    })
  }

  createWorkflow(workflow: Workflow): Workflow {
    this.workflows.set(workflow.id, workflow)
    this.setupTriggers(workflow)
    return workflow
  }

  private setupTriggers(workflow: Workflow): void {
    for (const trigger of workflow.triggers) {
      switch (trigger.type) {
        case 'event':
          this.setupEventTrigger(workflow.id, trigger)
          break
        case 'schedule':
          this.setupScheduleTrigger(workflow.id, trigger)
          break
        case 'webhook':
          this.setupWebhookTrigger(workflow.id, trigger)
          break
        case 'file':
          this.setupFileTrigger(workflow.id, trigger)
          break
      }
    }
  }

  private setupEventTrigger(workflowId: string, trigger: Trigger): void {
    const eventName = trigger.config.eventName!
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set())
    }
    this.eventHandlers.get(eventName)!.add(workflowId)
    
    // Listen for events
    this.on(eventName, (data) => {
      this.executeWorkflow(workflowId, { trigger: 'event', event: eventName, data })
    })
  }

  private setupScheduleTrigger(workflowId: string, trigger: Trigger): void {
    const schedule = trigger.config.schedule!
    const task = cron.schedule(schedule, () => {
      this.executeWorkflow(workflowId, { trigger: 'schedule' })
    }, { scheduled: false })
    
    this.scheduledTasks.set(workflowId, task)
    const workflow = this.workflows.get(workflowId)
    if (workflow?.status === 'active') {
      task.start()
    }
  }

  private setupWebhookTrigger(workflowId: string, trigger: Trigger): void {
    // Register webhook endpoint
    const webhookUrl = trigger.config.webhookUrl!
    this.webhookListeners.set(webhookUrl, workflowId)
  }

  private setupFileTrigger(workflowId: string, trigger: Trigger): void {
    const filePath = trigger.config.filePath!
    const fs = require('fs')
    const path = require('path')
    const chokidar = require('chokidar')
    
    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true
    })
    
    const debounce = trigger.config.debounce || 1000
    let timeout: NodeJS.Timeout
    
    watcher.on('add', (file: string) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        this.executeWorkflow(workflowId, { 
          trigger: 'file', 
          filePath: file,
          fileName: path.basename(file)
        })
      }, debounce)
    })
    
    this.watchedFiles.set(workflowId, watcher)
  }

  async executeWorkflow(workflowId: string, context: any = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow || workflow.status !== 'active') {
      throw new Error('Workflow not found or inactive')
    }

    const executionId = `exec_${Date.now()}`
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: new Date(),
      results: [],
      variables: { ...context }
    }

    this.executions.set(executionId, execution)
    this.emit('workflow:started', { executionId, workflowId })

    try {
      // Execute actions sequentially
      for (const action of workflow.actions) {
        const result = await this.executeAction(action, execution.variables)
        execution.results.push(result)
        
        // Update variables with result
        execution.variables[action.id] = result
      }

      // Process conditions
      for (const condition of workflow.conditions) {
        await this.evaluateCondition(condition, execution.variables)
      }

      execution.status = 'completed'
      execution.endTime = new Date()
      
      workflow.lastRun = new Date()
      workflow.runCount++
      
      this.emit('workflow:completed', { executionId, results: execution.results })
    } catch (error) {
      execution.status = 'failed'
      execution.endTime = new Date()
      execution.errors = [error]
      
      this.emit('workflow:failed', { executionId, error })
      throw error
    }

    return execution
  }

  private async executeAction(action: Action, variables: any): Promise<any> {
    const timeout = action.timeout || 30000
    const retryPolicy = action.retryPolicy || { 
      maxAttempts: 1, 
      backoffType: 'exponential', 
      initialDelay: 1000,
      maxDelay: 10000 
    }

    let lastError
    for (let attempt = 0; attempt < retryPolicy.maxAttempts; attempt++) {
      try {
        return await this.executeActionWithTimeout(action, variables, timeout)
      } catch (error) {
        lastError = error
        if (attempt < retryPolicy.maxAttempts - 1) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  private async executeActionWithTimeout(action: Action, variables: any, timeout: number): Promise<any> {
    return Promise.race([
      this.executeActionInternal(action, variables),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Action timeout')), timeout)
      )
    ])
  }

  private async executeActionInternal(action: Action, variables: any): Promise<any> {
    switch (action.type) {
      case 'transcribe':
        return this.executeTranscribeAction(action.config, variables)
      case 'export':
        return this.executeExportAction(action.config, variables)
      case 'notify':
        return this.executeNotifyAction(action.config, variables)
      case 'api':
        return this.executeApiAction(action.config, variables)
      case 'script':
        return this.executeScriptAction(action.config, variables)
      case 'chain':
        return this.executeChainAction(action.config, variables)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  private async executeTranscribeAction(config: ActionConfig, variables: any): Promise<any> {
    // Simulate transcription
    return {
      text: `Transcribed: ${variables.fileName || 'audio'}`,
      duration: 1234,
      words: 100
    }
  }

  private async executeExportAction(config: ActionConfig, variables: any): Promise<any> {
    const format = config.format || 'txt'
    const destination = config.destination || './exports'
    
    return {
      exported: true,
      format,
      path: `${destination}/export_${Date.now()}.${format}`
    }
  }

  private async executeNotifyAction(config: ActionConfig, variables: any): Promise<any> {
    const template = config.template || 'Notification'
    const message = this.interpolateTemplate(template, variables)
    
    this.emit('notification', { message })
    return { notified: true, message }
  }

  private async executeApiAction(config: ActionConfig, variables: any): Promise<any> {
    const fetch = require('node-fetch')
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || {},
      body: JSON.stringify(this.interpolateObject(config.body, variables))
    })
    
    return response.json()
  }

  private async executeScriptAction(config: ActionConfig, variables: any): Promise<any> {
    const vm = require('vm')
    const script = new vm.Script(config.script!)
    const context = vm.createContext({ ...variables, console, require })
    return script.runInContext(context)
  }

  private async executeChainAction(config: ActionConfig, variables: any): Promise<any> {
    const chainedWorkflowId = config.chainedWorkflow!
    return this.executeWorkflow(chainedWorkflowId, variables)
  }

  private async evaluateCondition(condition: Condition, variables: any): Promise<void> {
    const vm = require('vm')
    const script = new vm.Script(condition.expression)
    const context = vm.createContext(variables)
    const result = script.runInContext(context)

    if (condition.type === 'if') {
      const branch = result ? condition.trueBranch : condition.falseBranch
      if (branch) {
        for (const action of branch) {
          await this.executeAction(action, variables)
        }
      }
    } else if (condition.type === 'switch' && condition.cases) {
      const caseActions = condition.cases[result]
      if (caseActions) {
        for (const action of caseActions) {
          await this.executeAction(action, variables)
        }
      }
    }
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number
    if (policy.backoffType === 'exponential') {
      delay = policy.initialDelay * Math.pow(2, attempt)
    } else {
      delay = policy.initialDelay * (attempt + 1)
    }
    return Math.min(delay, policy.maxDelay)
  }

  private interpolateTemplate(template: string, variables: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }

  private interpolateObject(obj: any, variables: any): any {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, variables)
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, variables))
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, variables)
      }
      return result
    }
    return obj
  }

  private startExecutionMonitor(): void {
    setInterval(() => {
      // Clean up old executions
      const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
      for (const [id, execution] of this.executions) {
        if (execution.endTime && execution.endTime.getTime() < cutoff) {
          this.executions.delete(id)
        }
      }
    }, 60000) // Every minute
  }

  pauseWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId)
    if (workflow) {
      workflow.status = 'paused'
      
      // Pause scheduled tasks
      const task = this.scheduledTasks.get(workflowId)
      if (task) {
        task.stop()
      }
    }
  }

  resumeWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId)
    if (workflow) {
      workflow.status = 'active'
      
      // Resume scheduled tasks
      const task = this.scheduledTasks.get(workflowId)
      if (task) {
        task.start()
      }
    }
  }

  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  getWorkflowTemplates(): Workflow[] {
    return [
      {
        id: 'template-meeting',
        name: 'Meeting Processing',
        description: 'Process meeting recordings end-to-end',
        triggers: [],
        actions: [],
        conditions: [],
        status: 'active',
        runCount: 0,
        createdAt: new Date()
      },
      {
        id: 'template-podcast',
        name: 'Podcast Production',
        description: 'Automate podcast transcription and publishing',
        triggers: [],
        actions: [],
        conditions: [],
        status: 'active',
        runCount: 0,
        createdAt: new Date()
      }
    ]
  }
}

export const workflowAutomation = new WorkflowAutomationService()