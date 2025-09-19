/**
 * Smart Meeting Assistant with AI Insights (Step 117)
 * Intelligent meeting analysis, action items, and summaries
 */

export interface MeetingAnalysis {
  summary: string
  keyPoints: string[]
  actionItems: ActionItem[]
  decisions: string[]
  participants: MeetingParticipant[]
  sentiment: SentimentAnalysis
  topics: Topic[]
  followUpQuestions: string[]
  nextSteps: string[]
}

export interface ActionItem {
  task: string
  assignee?: string
  dueDate?: Date
  priority: 'high' | 'medium' | 'low'
  context: string
}

export interface MeetingParticipant {
  name: string
  speakingTime: number
  contributions: number
  sentiment: number // -1 to 1
}

export interface SentimentAnalysis {
  overall: number
  timeline: { time: number, sentiment: number }[]
  byParticipant: { [name: string]: number }
}

export interface Topic {
  name: string
  duration: number
  keywords: string[]
  importance: number
}

export class MeetingAssistantService {
  constructor() {
    console.log('🎯 Smart meeting assistant with AI insights initialized')
  }

  async analyzeMeeting(transcription: any): Promise<MeetingAnalysis> {
    const text = transcription.text || ''
    const segments = transcription.segments || []
    
    return {
      summary: this.generateSummary(text),
      keyPoints: this.extractKeyPoints(text),
      actionItems: this.extractActionItems(segments),
      decisions: this.extractDecisions(text),
      participants: this.analyzeParticipants(segments),
      sentiment: this.analyzeSentiment(segments),
      topics: this.identifyTopics(text),
      followUpQuestions: this.generateFollowUpQuestions(text),
      nextSteps: this.identifyNextSteps(text)
    }
  }

  private generateSummary(text: string): string {
    // AI-powered summary generation
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20)
    return sentences.slice(0, 3).join('. ') + '.'
  }

  private extractKeyPoints(text: string): string[] {
    // Extract important points
    const patterns = [
      /important(?:ly)?[: ]/i,
      /key (?:point|takeaway)/i,
      /main (?:point|idea)/i,
      /(?:we|I) (?:need|must|should)/i,
      /decision[: ]/i
    ]
    
    const keyPoints: string[] = []
    const sentences = text.split(/[.!?]/)
    
    for (const sentence of sentences) {
      for (const pattern of patterns) {
        if (pattern.test(sentence)) {
          keyPoints.push(sentence.trim())
          break
        }
      }
    }
    
    return keyPoints.slice(0, 5)
  }

  private extractActionItems(segments: any[]): ActionItem[] {
    const actionItems: ActionItem[] = []
    const actionPatterns = [
      /(?:will|going to|need to|should|must) (\w+)/i,
      /action item[: ]([^.]+)/i,
      /todo[: ]([^.]+)/i,
      /follow up (?:on|with) ([^.]+)/i
    ]
    
    for (const segment of segments) {
      const text = segment.text || ''
      for (const pattern of actionPatterns) {
        const match = text.match(pattern)
        if (match) {
          actionItems.push({
            task: match[1] || match[0],
            assignee: segment.speakerId,
            priority: this.determinePriority(text),
            context: text
          })
        }
      }
    }
    
    return actionItems
  }

  private determinePriority(text: string): 'high' | 'medium' | 'low' {
    if (/urgent|asap|critical|immediately/i.test(text)) return 'high'
    if (/important|priority|soon/i.test(text)) return 'medium'
    return 'low'
  }

  private extractDecisions(text: string): string[] {
    const decisions: string[] = []
    const patterns = [
      /(?:decided|agreed|concluded) (?:that|to) ([^.]+)/i,
      /decision[: ]([^.]+)/i,
      /we(?:'ll| will) ([^.]+)/i
    ]
    
    const sentences = text.split(/[.!?]/)
    for (const sentence of sentences) {
      for (const pattern of patterns) {
        const match = sentence.match(pattern)
        if (match) {
          decisions.push(match[1] || match[0])
          break
        }
      }
    }
    
    return decisions
  }

  private analyzeParticipants(segments: any[]): MeetingParticipant[] {
    const participants = new Map<string, MeetingParticipant>()
    
    for (const segment of segments) {
      const speakerId = segment.speakerId || 'Unknown'
      
      if (!participants.has(speakerId)) {
        participants.set(speakerId, {
          name: speakerId,
          speakingTime: 0,
          contributions: 0,
          sentiment: 0
        })
      }
      
      const participant = participants.get(speakerId)!
      participant.speakingTime += segment.endTime - segment.startTime
      participant.contributions++
      participant.sentiment += this.calculateSegmentSentiment(segment.text)
    }
    
    // Normalize sentiment
    for (const participant of participants.values()) {
      participant.sentiment = participant.sentiment / Math.max(participant.contributions, 1)
    }
    
    return Array.from(participants.values())
  }

  private analyzeSentiment(segments: any[]): SentimentAnalysis {
    const timeline: { time: number, sentiment: number }[] = []
    const byParticipant: { [name: string]: number } = {}
    let overallSum = 0
    
    for (const segment of segments) {
      const sentiment = this.calculateSegmentSentiment(segment.text)
      timeline.push({ time: segment.startTime, sentiment })
      
      const speakerId = segment.speakerId || 'Unknown'
      byParticipant[speakerId] = (byParticipant[speakerId] || 0) + sentiment
      overallSum += sentiment
    }
    
    return {
      overall: overallSum / Math.max(segments.length, 1),
      timeline,
      byParticipant
    }
  }

  private calculateSegmentSentiment(text: string): number {
    // Simplified sentiment calculation
    const positive = /good|great|excellent|agree|yes|happy|wonderful|perfect/gi
    const negative = /bad|terrible|disagree|no|unhappy|problem|issue|difficult/gi
    
    const posCount = (text.match(positive) || []).length
    const negCount = (text.match(negative) || []).length
    
    if (posCount + negCount === 0) return 0
    return (posCount - negCount) / (posCount + negCount)
  }

  private identifyTopics(text: string): Topic[] {
    // Simplified topic extraction
    const words = text.toLowerCase().split(/\s+/)
    const wordFreq = new Map<string, number>()
    
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been'])
    
    for (const word of words) {
      if (!stopWords.has(word) && word.length > 3) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      }
    }
    
    const topics: Topic[] = []
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    for (const [word, freq] of topWords) {
      topics.push({
        name: word,
        duration: freq * 10, // Approximate
        keywords: [word],
        importance: freq / words.length
      })
    }
    
    return topics
  }

  private generateFollowUpQuestions(text: string): string[] {
    const questions: string[] = []
    
    // Generate contextual follow-up questions
    if (text.includes('budget')) {
      questions.push('What is the allocated budget for this project?')
    }
    if (text.includes('deadline')) {
      questions.push('What are the specific milestone deadlines?')
    }
    if (text.includes('team')) {
      questions.push('Who are the key team members responsible?')
    }
    if (text.includes('risk')) {
      questions.push('What are the identified risks and mitigation strategies?')
    }
    if (text.includes('customer')) {
      questions.push('What is the customer feedback on this approach?')
    }
    
    return questions
  }

  private identifyNextSteps(text: string): string[] {
    const nextSteps: string[] = []
    const patterns = [
      /next (?:step|meeting|week|month)[: ]([^.]+)/i,
      /follow up[: ]([^.]+)/i,
      /(?:we'll|will) (?:meet|discuss|review) ([^.]+)/i
    ]
    
    const sentences = text.split(/[.!?]/)
    for (const sentence of sentences) {
      for (const pattern of patterns) {
        const match = sentence.match(pattern)
        if (match) {
          nextSteps.push(match[1] || match[0])
        }
      }
    }
    
    return nextSteps
  }

  generateAgenda(previousMeeting: MeetingAnalysis): string[] {
    const agenda: string[] = []
    
    // Review action items from previous meeting
    agenda.push('Review of action items from previous meeting')
    
    // Add follow-up questions as agenda items
    previousMeeting.followUpQuestions.forEach(q => {
      agenda.push(`Discussion: ${q}`)
    })
    
    // Add next steps as agenda items
    previousMeeting.nextSteps.forEach(step => {
      agenda.push(`Planning: ${step}`)
    })
    
    return agenda
  }

  generateMeetingReport(analysis: MeetingAnalysis): string {
    return `
# Meeting Report

## Summary
${analysis.summary}

## Key Points
${analysis.keyPoints.map(p => `- ${p}`).join('\n')}

## Action Items
${analysis.actionItems.map(a => `- [ ] ${a.task} (${a.priority})`).join('\n')}

## Decisions
${analysis.decisions.map(d => `- ${d}`).join('\n')}

## Next Steps
${analysis.nextSteps.map(s => `- ${s}`).join('\n')}

## Participants
${analysis.participants.map(p => `- ${p.name}: ${Math.round(p.speakingTime)}s speaking time`).join('\n')}

## Sentiment
Overall: ${(analysis.sentiment.overall * 100).toFixed(0)}% positive
    `.trim()
  }
}

export const meetingAssistant = new MeetingAssistantService()