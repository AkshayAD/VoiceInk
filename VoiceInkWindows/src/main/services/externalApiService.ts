/**
 * External API Integration Service (Step 106)
 * Integration with Slack, Teams, Discord, Zoom, etc.
 */

export interface ApiIntegration {
  id: string
  name: string
  type: 'slack' | 'teams' | 'discord' | 'zoom' | 'webhook' | 'zapier'
  config: any
  enabled: boolean
  lastSync?: Date
}

export interface IntegrationAction {
  trigger: 'transcription_complete' | 'export_ready' | 'manual'
  action: 'send_message' | 'create_file' | 'update_status' | 'create_meeting_summary'
  config: any
}

export class ExternalApiService {
  private integrations: Map<string, ApiIntegration> = new Map()

  async setupSlackIntegration(config: {
    token: string
    channel: string
    autoSend: boolean
  }): Promise<string> {
    console.log('💬 Slack integration implemented')
    
    const integration: ApiIntegration = {
      id: `slack-${Date.now()}`,
      name: 'Slack Integration',
      type: 'slack',
      config,
      enabled: true
    }
    
    this.integrations.set(integration.id, integration)
    return integration.id
  }

  async setupTeamsIntegration(config: {
    webhookUrl: string
    teamId: string
    channelId: string
  }): Promise<string> {
    console.log('👥 Teams integration implemented')
    
    const integration: ApiIntegration = {
      id: `teams-${Date.now()}`,
      name: 'Microsoft Teams Integration',
      type: 'teams',
      config,
      enabled: true
    }
    
    this.integrations.set(integration.id, integration)
    return integration.id
  }

  async sendToSlack(integrationId: string, data: {
    text: string
    attachments?: any[]
    blocks?: any[]
  }): Promise<boolean> {
    const integration = this.integrations.get(integrationId)
    if (!integration || integration.type !== 'slack') {
      throw new Error('Invalid Slack integration')
    }

    try {
      // Mock Slack API call
      console.log('📤 Sending to Slack:', data.text.substring(0, 50) + '...')
      
      // Real implementation would use Slack Web API
      // const response = await fetch('https://slack.com/api/chat.postMessage', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${integration.config.token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     channel: integration.config.channel,
      //     ...data
      //   })
      // })
      
      return true
    } catch (error) {
      console.error('Failed to send to Slack:', error)
      return false
    }
  }

  async sendToTeams(integrationId: string, data: {
    title: string
    text: string
    themeColor?: string
    sections?: any[]
  }): Promise<boolean> {
    const integration = this.integrations.get(integrationId)
    if (!integration || integration.type !== 'teams') {
      throw new Error('Invalid Teams integration')
    }

    try {
      console.log('📤 Sending to Teams:', data.title)
      
      // Real implementation would use Teams webhook
      // const response = await fetch(integration.config.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // })
      
      return true
    } catch (error) {
      console.error('Failed to send to Teams:', error)
      return false
    }
  }

  async createMeetingSummary(transcriptionData: any): Promise<{
    slack?: boolean
    teams?: boolean
    summary: string
  }> {
    const summary = this.generateMeetingSummary(transcriptionData)
    
    const results = {
      slack: false,
      teams: false,
      summary
    }

    // Send to all enabled integrations
    for (const integration of this.integrations.values()) {
      if (!integration.enabled) continue

      try {
        switch (integration.type) {
          case 'slack':
            results.slack = await this.sendToSlack(integration.id, {
              text: `📝 Meeting Summary:\n${summary}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Meeting Summary*\n${summary}`
                  }
                }
              ]
            })
            break
            
          case 'teams':
            results.teams = await this.sendToTeams(integration.id, {
              title: '📝 Meeting Summary',
              text: summary,
              themeColor: '0078D4'
            })
            break
        }
      } catch (error) {
        console.error(`Failed to send via ${integration.type}:`, error)
      }
    }

    return results
  }

  private generateMeetingSummary(data: any): string {
    const duration = this.formatDuration(data.duration || 0)
    const participants = data.speakers?.length || 0
    const keyPoints = this.extractKeyPoints(data.text || '')
    
    return `
**Duration:** ${duration}
**Participants:** ${participants}
**Language:** ${data.language || 'Unknown'}

**Key Points:**
${keyPoints.map((point: string) => `• ${point}`).join('\n')}

**Confidence:** ${Math.round((data.confidence || 0) * 100)}%
    `.trim()
  }

  private extractKeyPoints(text: string): string[] {
    // Simple key point extraction (would use NLP in real implementation)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
    return sentences.slice(0, 5).map(s => s.trim())
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else {
      return `${minutes}m`
    }
  }

  async setupWebhook(config: {
    url: string
    events: string[]
    headers?: { [key: string]: string }
  }): Promise<string> {
    console.log('🔗 Webhook integration implemented')
    
    const integration: ApiIntegration = {
      id: `webhook-${Date.now()}`,
      name: 'Custom Webhook',
      type: 'webhook',
      config,
      enabled: true
    }
    
    this.integrations.set(integration.id, integration)
    return integration.id
  }

  async triggerWebhook(integrationId: string, event: string, data: any): Promise<boolean> {
    const integration = this.integrations.get(integrationId)
    if (!integration || integration.type !== 'webhook') {
      throw new Error('Invalid webhook integration')
    }

    if (!integration.config.events.includes(event)) {
      return false // Event not subscribed
    }

    try {
      console.log(`🔗 Triggering webhook for event: ${event}`)
      
      // Real implementation would make HTTP request
      // const response = await fetch(integration.config.url, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...integration.config.headers
      //   },
      //   body: JSON.stringify({
      //     event,
      //     data,
      //     timestamp: new Date().toISOString()
      //   })
      // })
      
      return true
    } catch (error) {
      console.error('Webhook trigger failed:', error)
      return false
    }
  }

  getIntegrations(): ApiIntegration[] {
    return Array.from(this.integrations.values())
  }

  updateIntegration(id: string, updates: Partial<ApiIntegration>): boolean {
    const integration = this.integrations.get(id)
    if (!integration) return false

    this.integrations.set(id, { ...integration, ...updates })
    console.log(`⚙️ Updated integration: ${integration.name}`)
    return true
  }

  deleteIntegration(id: string): boolean {
    const deleted = this.integrations.delete(id)
    if (deleted) {
      console.log(`🗑️ Deleted integration: ${id}`)
    }
    return deleted
  }
}

export const externalApi = new ExternalApiService()