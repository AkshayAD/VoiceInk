/**
 * Export Service
 * Handles exporting transcriptions to various formats
 */

import * as fs from 'fs'
import * as path from 'path'
import { dialog, app } from 'electron'
import { transcriptionRepository } from '../database/transcriptionRepository'

interface ExportOptions {
  format: 'json' | 'txt' | 'csv' | 'srt' | 'vtt'
  includeTimestamps?: boolean
  includeMetadata?: boolean
  separator?: string
}

class ExportService {
  
  /**
   * Export transcriptions to JSON format
   */
  async exportToJSON(transcriptionIds: string[]): Promise<string> {
    const transcriptions = await this.getTranscriptions(transcriptionIds)
    
    const exportData = transcriptions.map(t => ({
      id: t.id,
      text: t.text,
      originalText: t.originalText,
      createdAt: t.createdAt,
      duration: t.duration,
      language: t.language,
      model: t.model,
      wordCount: t.wordCount,
      applicationName: t.applicationName,
      enhanced: t.enhanced
    }))
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const filePath = await this.saveToFile(jsonContent, 'json', 'transcriptions.json')
    return filePath
  }
  
  /**
   * Export transcriptions to plain text format
   */
  async exportToTXT(transcriptionIds: string[], options: ExportOptions = {}): Promise<string> {
    const transcriptions = await this.getTranscriptions(transcriptionIds)
    
    let content = ''
    const separator = options.separator || '\n\n' + '='.repeat(60) + '\n\n'
    
    for (const t of transcriptions) {
      if (options.includeMetadata) {
        content += `Date: ${new Date(t.createdAt).toLocaleString()}\n`
        content += `Duration: ${this.formatDuration(t.duration)}\n`
        content += `Language: ${t.language}\n`
        content += `Model: ${t.model}\n`
        if (t.applicationName) {
          content += `Application: ${t.applicationName}\n`
        }
        content += '\n'
      }
      
      content += t.text
      content += separator
    }
    
    const filePath = await this.saveToFile(content, 'txt', 'transcriptions.txt')
    return filePath
  }
  
  /**
   * Export transcriptions to CSV format
   */
  async exportToCSV(transcriptionIds: string[]): Promise<string> {
    const transcriptions = await this.getTranscriptions(transcriptionIds)
    
    // CSV headers
    const headers = ['ID', 'Date', 'Text', 'Duration', 'Language', 'Model', 'Word Count', 'Application']
    let csvContent = headers.join(',') + '\n'
    
    // CSV rows
    for (const t of transcriptions) {
      const row = [
        t.id,
        new Date(t.createdAt).toISOString(),
        `"${t.text.replace(/"/g, '""')}"`, // Escape quotes
        t.duration.toString(),
        t.language,
        t.model,
        t.wordCount.toString(),
        t.applicationName || ''
      ]
      csvContent += row.join(',') + '\n'
    }
    
    const filePath = await this.saveToFile(csvContent, 'csv', 'transcriptions.csv')
    return filePath
  }
  
  /**
   * Export transcription to SRT subtitle format
   */
  async exportToSRT(transcriptionId: string): Promise<string> {
    const transcription = await transcriptionRepository.findById(transcriptionId)
    if (!transcription) {
      throw new Error('Transcription not found')
    }
    
    // Parse segments if available
    let segments: any[] = []
    try {
      // If segments are stored as JSON string
      if (typeof transcription.originalText === 'string') {
        const data = JSON.parse(transcription.originalText)
        segments = data.segments || []
      }
    } catch (e) {
      // If no segments, create fake ones
      const words = transcription.text.split(' ')
      const wordsPerSegment = 10
      const segmentDuration = 3 // seconds
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        segments.push({
          text: words.slice(i, i + wordsPerSegment).join(' '),
          startTime: i / wordsPerSegment * segmentDuration,
          endTime: (i / wordsPerSegment + 1) * segmentDuration
        })
      }
    }
    
    // Generate SRT content
    let srtContent = ''
    segments.forEach((segment, index) => {
      srtContent += `${index + 1}\n`
      srtContent += `${this.formatSRTTime(segment.startTime)} --> ${this.formatSRTTime(segment.endTime)}\n`
      srtContent += `${segment.text}\n\n`
    })
    
    const filePath = await this.saveToFile(srtContent, 'srt', 'subtitles.srt')
    return filePath
  }
  
  /**
   * Export transcription to WebVTT format
   */
  async exportToVTT(transcriptionId: string): Promise<string> {
    const transcription = await transcriptionRepository.findById(transcriptionId)
    if (!transcription) {
      throw new Error('Transcription not found')
    }
    
    // Similar to SRT but with VTT format
    let vttContent = 'WEBVTT\n\n'
    
    // Parse segments if available
    let segments: any[] = []
    try {
      if (typeof transcription.originalText === 'string') {
        const data = JSON.parse(transcription.originalText)
        segments = data.segments || []
      }
    } catch (e) {
      // Create fake segments
      const words = transcription.text.split(' ')
      const wordsPerSegment = 10
      const segmentDuration = 3
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        segments.push({
          text: words.slice(i, i + wordsPerSegment).join(' '),
          startTime: i / wordsPerSegment * segmentDuration,
          endTime: (i / wordsPerSegment + 1) * segmentDuration
        })
      }
    }
    
    segments.forEach((segment) => {
      vttContent += `${this.formatVTTTime(segment.startTime)} --> ${this.formatVTTTime(segment.endTime)}\n`
      vttContent += `${segment.text}\n\n`
    })
    
    const filePath = await this.saveToFile(vttContent, 'vtt', 'subtitles.vtt')
    return filePath
  }
  
  /**
   * Get transcriptions by IDs
   */
  private async getTranscriptions(ids: string[]) {
    const transcriptions = []
    for (const id of ids) {
      const t = await transcriptionRepository.findById(id)
      if (t) transcriptions.push(t)
    }
    return transcriptions
  }
  
  /**
   * Save content to file with dialog
   */
  private async saveToFile(content: string, extension: string, defaultName: string): Promise<string> {
    const result = await dialog.showSaveDialog({
      title: `Export as ${extension.toUpperCase()}`,
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: `${extension.toUpperCase()} files`, extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePath) {
      throw new Error('Export canceled')
    }
    
    await fs.promises.writeFile(result.filePath, content, 'utf8')
    return result.filePath
  }
  
  /**
   * Format duration in seconds to readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  /**
   * Format time for SRT format (00:00:00,000)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }
  
  /**
   * Format time for VTT format (00:00:00.000)
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }
}

export const exportService = new ExportService()