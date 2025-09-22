/**
 * Advanced Export Service with Templates and Formatting
 * Comprehensive export system with customizable templates and multiple formats
 */

import * as fs from 'fs'
import * as path from 'path'
import { Document, Paragraph, TextRun, Header, Footer, HeadingLevel } from 'docx'

export interface ExportTemplate {
  id: string
  name: string
  description: string
  category: 'transcript' | 'report' | 'article' | 'meeting' | 'custom'
  format: ExportFormat
  settings: TemplateSettings
  layout: LayoutSettings
  styling: StylingSettings
  variables: TemplateVariable[]
  sections: TemplateSection[]
}

export interface TemplateSettings {
  includeMetadata: boolean
  includeTimestamps: boolean
  includeSpeakers: boolean
  includeConfidence: boolean
  includeWordTimings: boolean
  pageNumbers: boolean
  tableOfContents: boolean
  headerFooter: boolean
  watermark?: string
}

export interface LayoutSettings {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3'
  orientation: 'portrait' | 'landscape'
  margins: { top: number, bottom: number, left: number, right: number }
  columns: number
  spacing: { line: number, paragraph: number }
  indentation: { first: number, hanging: number }
}

export interface StylingSettings {
  fontFamily: string
  fontSize: number
  titleFont: { family: string, size: number, color: string }
  headingFont: { family: string, size: number, color: string }
  bodyFont: { family: string, size: number, color: string }
  speakerFont: { family: string, size: number, color: string }
  timestampFont: { family: string, size: number, color: string }
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }
  borders: boolean
  shadows: boolean
  highlighting: boolean
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  defaultValue: any
  options?: string[]
  required: boolean
}

export interface TemplateSection {
  id: string
  name: string
  type: 'header' | 'body' | 'footer' | 'sidebar' | 'custom'
  content: string
  variables: string[]
  conditional?: string
  formatting: SectionFormatting
}

export interface SectionFormatting {
  alignment: 'left' | 'center' | 'right' | 'justify'
  indent: number
  spacing: { before: number, after: number }
  style: 'normal' | 'bold' | 'italic' | 'underline'
  color: string
  backgroundColor?: string
}

export type ExportFormat = 
  | 'pdf' 
  | 'docx' 
  | 'html' 
  | 'markdown' 
  | 'txt' 
  | 'rtf' 
  | 'json' 
  | 'xml' 
  | 'csv' 
  | 'xlsx'
  | 'srt'
  | 'vtt'
  | 'ass'
  | 'sbv'

export interface ExportOptions {
  templateId?: string
  format: ExportFormat
  filename?: string
  customVariables?: { [key: string]: any }
  outputPath?: string
  compression?: boolean
  encryption?: { enabled: boolean, password?: string }
  branding?: { logo?: string, company?: string }
}

export interface ExportResult {
  success: boolean
  filePath?: string
  size?: number
  format: ExportFormat
  template?: string
  duration: number
  error?: string
}

export class AdvancedExportService {
  private templates: Map<string, ExportTemplate> = new Map()
  private defaultTemplates: ExportTemplate[] = []

  constructor() {
    this.initializeDefaultTemplates()
  }

  /**
   * Initialize default export templates
   */
  private initializeDefaultTemplates(): void {
    const templates: ExportTemplate[] = [
      {
        id: 'standard-transcript',
        name: 'Standard Transcript',
        description: 'Clean, professional transcript with timestamps',
        category: 'transcript',
        format: 'docx',
        settings: {
          includeMetadata: true,
          includeTimestamps: true,
          includeSpeakers: true,
          includeConfidence: false,
          includeWordTimings: false,
          pageNumbers: true,
          tableOfContents: false,
          headerFooter: true
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 25, bottom: 25, left: 25, right: 25 },
          columns: 1,
          spacing: { line: 1.15, paragraph: 6 },
          indentation: { first: 0, hanging: 0 }
        },
        styling: {
          fontFamily: 'Arial',
          fontSize: 11,
          titleFont: { family: 'Arial', size: 16, color: '#1a1a1a' },
          headingFont: { family: 'Arial', size: 13, color: '#2563eb' },
          bodyFont: { family: 'Arial', size: 11, color: '#1a1a1a' },
          speakerFont: { family: 'Arial', size: 11, color: '#dc2626' },
          timestampFont: { family: 'Courier New', size: 9, color: '#6b7280' },
          colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#dc2626',
            text: '#1a1a1a',
            background: '#ffffff'
          },
          borders: false,
          shadows: false,
          highlighting: false
        },
        variables: [
          { name: 'title', label: 'Document Title', type: 'text', defaultValue: 'Transcript', required: true },
          { name: 'author', label: 'Author', type: 'text', defaultValue: '', required: false },
          { name: 'date', label: 'Date', type: 'date', defaultValue: new Date(), required: true }
        ],
        sections: [
          {
            id: 'header',
            name: 'Document Header',
            type: 'header',
            content: '{{title}} - {{date}}',
            variables: ['title', 'date'],
            formatting: {
              alignment: 'center',
              indent: 0,
              spacing: { before: 0, after: 12 },
              style: 'bold',
              color: '#1a1a1a'
            }
          },
          {
            id: 'metadata',
            name: 'Metadata Section',
            type: 'body',
            content: 'Duration: {{duration}}\nLanguage: {{language}}\nModel: {{model}}\nConfidence: {{confidence}}%',
            variables: ['duration', 'language', 'model', 'confidence'],
            formatting: {
              alignment: 'left',
              indent: 0,
              spacing: { before: 0, after: 18 },
              style: 'normal',
              color: '#6b7280'
            }
          },
          {
            id: 'transcript',
            name: 'Main Transcript',
            type: 'body',
            content: '{{transcript_content}}',
            variables: ['transcript_content'],
            formatting: {
              alignment: 'left',
              indent: 0,
              spacing: { before: 0, after: 6 },
              style: 'normal',
              color: '#1a1a1a'
            }
          }
        ]
      },
      {
        id: 'meeting-minutes',
        name: 'Meeting Minutes',
        description: 'Structured meeting minutes with action items',
        category: 'meeting',
        format: 'docx',
        settings: {
          includeMetadata: true,
          includeTimestamps: true,
          includeSpeakers: true,
          includeConfidence: false,
          includeWordTimings: false,
          pageNumbers: true,
          tableOfContents: true,
          headerFooter: true
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 30, bottom: 30, left: 25, right: 25 },
          columns: 1,
          spacing: { line: 1.2, paragraph: 8 },
          indentation: { first: 0, hanging: 0 }
        },
        styling: {
          fontFamily: 'Calibri',
          fontSize: 11,
          titleFont: { family: 'Calibri', size: 18, color: '#1a1a1a' },
          headingFont: { family: 'Calibri', size: 14, color: '#2563eb' },
          bodyFont: { family: 'Calibri', size: 11, color: '#1a1a1a' },
          speakerFont: { family: 'Calibri', size: 11, color: '#dc2626' },
          timestampFont: { family: 'Consolas', size: 9, color: '#6b7280' },
          colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#dc2626',
            text: '#1a1a1a',
            background: '#ffffff'
          },
          borders: true,
          shadows: false,
          highlighting: true
        },
        variables: [
          { name: 'meeting_title', label: 'Meeting Title', type: 'text', defaultValue: 'Meeting Minutes', required: true },
          { name: 'meeting_date', label: 'Meeting Date', type: 'date', defaultValue: new Date(), required: true },
          { name: 'meeting_location', label: 'Location', type: 'text', defaultValue: '', required: false },
          { name: 'chairperson', label: 'Chairperson', type: 'text', defaultValue: '', required: false }
        ],
        sections: [
          {
            id: 'title',
            name: 'Meeting Title',
            type: 'header',
            content: '{{meeting_title}}',
            variables: ['meeting_title'],
            formatting: {
              alignment: 'center',
              indent: 0,
              spacing: { before: 0, after: 18 },
              style: 'bold',
              color: '#1a1a1a'
            }
          },
          {
            id: 'details',
            name: 'Meeting Details',
            type: 'body',
            content: 'Date: {{meeting_date}}\nLocation: {{meeting_location}}\nChairperson: {{chairperson}}\nDuration: {{duration}}',
            variables: ['meeting_date', 'meeting_location', 'chairperson', 'duration'],
            formatting: {
              alignment: 'left',
              indent: 0,
              spacing: { before: 0, after: 18 },
              style: 'normal',
              color: '#6b7280'
            }
          }
        ]
      },
      {
        id: 'interview-transcript',
        name: 'Interview Transcript',
        description: 'Professional interview format with Q&A structure',
        category: 'transcript',
        format: 'docx',
        settings: {
          includeMetadata: true,
          includeTimestamps: false,
          includeSpeakers: true,
          includeConfidence: false,
          includeWordTimings: false,
          pageNumbers: true,
          tableOfContents: false,
          headerFooter: true
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 25, bottom: 25, left: 30, right: 25 },
          columns: 1,
          spacing: { line: 1.5, paragraph: 12 },
          indentation: { first: 0, hanging: 20 }
        },
        styling: {
          fontFamily: 'Times New Roman',
          fontSize: 12,
          titleFont: { family: 'Times New Roman', size: 16, color: '#1a1a1a' },
          headingFont: { family: 'Times New Roman', size: 14, color: '#1a1a1a' },
          bodyFont: { family: 'Times New Roman', size: 12, color: '#1a1a1a' },
          speakerFont: { family: 'Times New Roman', size: 12, color: '#1a1a1a' },
          timestampFont: { family: 'Courier New', size: 10, color: '#6b7280' },
          colors: {
            primary: '#1a1a1a',
            secondary: '#64748b',
            accent: '#dc2626',
            text: '#1a1a1a',
            background: '#ffffff'
          },
          borders: false,
          shadows: false,
          highlighting: false
        },
        variables: [
          { name: 'interview_title', label: 'Interview Title', type: 'text', defaultValue: 'Interview Transcript', required: true },
          { name: 'interviewer', label: 'Interviewer', type: 'text', defaultValue: '', required: true },
          { name: 'interviewee', label: 'Interviewee', type: 'text', defaultValue: '', required: true }
        ],
        sections: []
      }
    ]

    templates.forEach(template => {
      this.templates.set(template.id, template)
    })

    this.defaultTemplates = templates
    console.log(`📋 Initialized ${templates.length} default export templates`)
  }

  /**
   * Export transcription with template
   */
  async exportWithTemplate(
    transcriptionData: any,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()
    
    try {
      console.log(`📤 Starting export with format: ${options.format}`)

      // Get template
      const template = options.templateId ? 
        this.templates.get(options.templateId) : 
        this.getDefaultTemplate(options.format)

      if (!template) {
        throw new Error(`Template not found: ${options.templateId}`)
      }

      // Process template variables
      const processedData = this.processTemplateVariables(
        transcriptionData,
        template,
        options.customVariables || {}
      )

      // Generate content based on format
      let result: ExportResult

      switch (options.format) {
        case 'docx':
          result = await this.exportToDocx(processedData, template, options)
          break
        case 'pdf':
          result = await this.exportToPdf(processedData, template, options)
          break
        case 'html':
          result = await this.exportToHtml(processedData, template, options)
          break
        case 'markdown':
          result = await this.exportToMarkdown(processedData, template, options)
          break
        case 'json':
          result = await this.exportToJson(processedData, template, options)
          break
        case 'csv':
          result = await this.exportToCsv(processedData, template, options)
          break
        case 'srt':
          result = await this.exportToSrt(processedData, template, options)
          break
        case 'vtt':
          result = await this.exportToVtt(processedData, template, options)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      result.duration = Date.now() - startTime
      console.log(`✅ Export completed in ${result.duration}ms`)
      
      return result

    } catch (error) {
      console.error('Export failed:', error)
      return {
        success: false,
        format: options.format,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get default template for format
   */
  private getDefaultTemplate(format: ExportFormat): ExportTemplate | null {
    const defaultMap: { [key in ExportFormat]?: string } = {
      docx: 'standard-transcript',
      pdf: 'standard-transcript',
      html: 'standard-transcript',
      markdown: 'standard-transcript'
    }

    const templateId = defaultMap[format]
    return templateId ? this.templates.get(templateId) || null : null
  }

  /**
   * Process template variables
   */
  private processTemplateVariables(
    transcriptionData: any,
    template: ExportTemplate,
    customVariables: { [key: string]: any }
  ): any {
    const variables = {
      // Built-in variables
      title: transcriptionData.title || 'Transcription',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      duration: this.formatDuration(transcriptionData.duration || 0),
      language: transcriptionData.language || 'Unknown',
      model: transcriptionData.model || 'Unknown',
      confidence: Math.round((transcriptionData.confidence || 0) * 100),
      speaker_count: transcriptionData.speakers?.length || 0,
      word_count: transcriptionData.text?.split(/\s+/).length || 0,
      
      // Custom variables
      ...customVariables,
      
      // Template-specific variables
      ...template.variables.reduce((acc, variable) => {
        acc[variable.name] = customVariables[variable.name] || variable.defaultValue
        return acc
      }, {} as any)
    }

    // Process transcript content
    variables.transcript_content = this.formatTranscriptContent(
      transcriptionData,
      template.settings
    )

    return {
      ...transcriptionData,
      variables,
      template
    }
  }

  /**
   * Format transcript content based on settings
   */
  private formatTranscriptContent(data: any, settings: TemplateSettings): string {
    if (!data.segments || !Array.isArray(data.segments)) {
      return data.text || ''
    }

    const lines: string[] = []
    
    data.segments.forEach((segment: any, index: number) => {
      const parts: string[] = []
      
      // Add timestamp
      if (settings.includeTimestamps && segment.startTime !== undefined) {
        const timestamp = this.formatTimestamp(segment.startTime)
        parts.push(`[${timestamp}]`)
      }
      
      // Add speaker
      if (settings.includeSpeakers && segment.speakerId) {
        parts.push(`${segment.speakerId}:`)
      }
      
      // Add text
      parts.push(segment.text)
      
      // Add confidence
      if (settings.includeConfidence && segment.confidence !== undefined) {
        const confidence = Math.round(segment.confidence * 100)
        parts.push(`(${confidence}%)`)
      }
      
      lines.push(parts.join(' '))
    })
    
    return lines.join('\n\n')
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  /**
   * Export to DOCX format
   */
  private async exportToDocx(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: this.processTemplateString(template.sections[0]?.content || '', data.variables),
                alignment: 'center'
              })
            ]
          })
        },
        children: [
          // Title
          new Paragraph({
            text: data.variables.title,
            heading: HeadingLevel.TITLE,
            alignment: 'center'
          }),
          
          // Metadata
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${data.variables.date}`, break: 1 }),
              new TextRun({ text: `Duration: ${data.variables.duration}`, break: 1 }),
              new TextRun({ text: `Language: ${data.variables.language}`, break: 1 }),
              new TextRun({ text: `Confidence: ${data.variables.confidence}%`, break: 1 })
            ],
            spacing: { after: 400 }
          }),
          
          // Transcript content
          new Paragraph({
            text: data.variables.transcript_content,
            spacing: { line: Math.round(template.layout.spacing.line * 240) }
          })
        ]
      }]
    })

    // Generate filename
    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.docx`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })

    // Save document
    const buffer = await doc.generate()
    await fs.promises.writeFile(outputPath, buffer)

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'docx',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPdf(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    // First generate HTML, then convert to PDF
    const htmlResult = await this.exportToHtml(data, template, {
      ...options,
      format: 'html'
    })

    if (!htmlResult.success || !htmlResult.filePath) {
      throw new Error('Failed to generate HTML for PDF conversion')
    }

    // In a real implementation, you would use a library like Puppeteer
    // For now, we'll just return the HTML result with PDF format
    const pdfPath = htmlResult.filePath.replace('.html', '.pdf')
    
    // Placeholder: Copy HTML file as PDF (in real implementation, convert)
    await fs.promises.copyFile(htmlResult.filePath, pdfPath)
    
    const stats = await fs.promises.stat(pdfPath)

    return {
      success: true,
      filePath: pdfPath,
      size: stats.size,
      format: 'pdf',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Export to HTML format
   */
  private async exportToHtml(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.variables.title}</title>
    <style>
        body {
            font-family: ${template.styling.fontFamily}, sans-serif;
            font-size: ${template.styling.fontSize}pt;
            color: ${template.styling.colors.text};
            background-color: ${template.styling.colors.background};
            margin: ${template.layout.margins.top}mm ${template.layout.margins.right}mm ${template.layout.margins.bottom}mm ${template.layout.margins.left}mm;
            line-height: ${template.layout.spacing.line};
        }
        .header {
            text-align: center;
            font-size: ${template.styling.titleFont.size}pt;
            font-weight: bold;
            color: ${template.styling.titleFont.color};
            margin-bottom: 20px;
        }
        .metadata {
            color: ${template.styling.colors.secondary};
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid ${template.styling.colors.primary};
        }
        .transcript {
            white-space: pre-wrap;
            line-height: ${template.layout.spacing.line};
        }
        .timestamp {
            font-family: ${template.styling.timestampFont.family};
            font-size: ${template.styling.timestampFont.size}pt;
            color: ${template.styling.timestampFont.color};
        }
        .speaker {
            font-weight: bold;
            color: ${template.styling.speakerFont.color};
        }
    </style>
</head>
<body>
    <div class="header">${data.variables.title}</div>
    
    <div class="metadata">
        <strong>Date:</strong> ${data.variables.date}<br>
        <strong>Duration:</strong> ${data.variables.duration}<br>
        <strong>Language:</strong> ${data.variables.language}<br>
        <strong>Confidence:</strong> ${data.variables.confidence}%
    </div>
    
    <div class="transcript">
${this.formatHtmlTranscript(data, template.settings)}
    </div>
</body>
</html>`

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.html`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, html, 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'html',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Format transcript content for HTML
   */
  private formatHtmlTranscript(data: any, settings: TemplateSettings): string {
    if (!data.segments || !Array.isArray(data.segments)) {
      return data.text || ''
    }

    const lines: string[] = []
    
    data.segments.forEach((segment: any) => {
      const parts: string[] = []
      
      if (settings.includeTimestamps && segment.startTime !== undefined) {
        const timestamp = this.formatTimestamp(segment.startTime)
        parts.push(`<span class="timestamp">[${timestamp}]</span>`)
      }
      
      if (settings.includeSpeakers && segment.speakerId) {
        parts.push(`<span class="speaker">${segment.speakerId}:</span>`)
      }
      
      parts.push(segment.text)
      
      lines.push(`<p>${parts.join(' ')}</p>`)
    })
    
    return lines.join('\n')
  }

  /**
   * Export to Markdown format
   */
  private async exportToMarkdown(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const markdown = `# ${data.variables.title}

**Date:** ${data.variables.date}  
**Duration:** ${data.variables.duration}  
**Language:** ${data.variables.language}  
**Confidence:** ${data.variables.confidence}%

---

## Transcript

${this.formatMarkdownTranscript(data, template.settings)}
`

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.md`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, markdown, 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'markdown',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Format transcript content for Markdown
   */
  private formatMarkdownTranscript(data: any, settings: TemplateSettings): string {
    if (!data.segments || !Array.isArray(data.segments)) {
      return data.text || ''
    }

    const lines: string[] = []
    
    data.segments.forEach((segment: any) => {
      const parts: string[] = []
      
      if (settings.includeTimestamps && segment.startTime !== undefined) {
        const timestamp = this.formatTimestamp(segment.startTime)
        parts.push(`**[${timestamp}]**`)
      }
      
      if (settings.includeSpeakers && segment.speakerId) {
        parts.push(`**${segment.speakerId}:**`)
      }
      
      parts.push(segment.text)
      
      lines.push(parts.join(' '))
    })
    
    return lines.join('\n\n')
  }

  /**
   * Export to JSON format
   */
  private async exportToJson(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const jsonData = {
      metadata: {
        title: data.variables.title,
        date: data.variables.date,
        duration: data.variables.duration,
        language: data.variables.language,
        model: data.variables.model,
        confidence: data.variables.confidence,
        exportTemplate: template.id,
        exportDate: new Date().toISOString()
      },
      transcript: {
        text: data.text,
        segments: data.segments,
        speakers: data.speakers,
        words: data.words
      },
      settings: template.settings
    }

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.json`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'json',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCsv(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const headers = ['Start Time', 'End Time', 'Speaker', 'Text', 'Confidence']
    const rows = [headers.join(',')]

    if (data.segments && Array.isArray(data.segments)) {
      data.segments.forEach((segment: any) => {
        const row = [
          this.formatTimestamp(segment.startTime || 0),
          this.formatTimestamp(segment.endTime || 0),
          segment.speakerId || '',
          `"${(segment.text || '').replace(/"/g, '""')}"`,
          segment.confidence || 0
        ]
        rows.push(row.join(','))
      })
    }

    const csv = rows.join('\n')

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.csv`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, csv, 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'csv',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Export to SRT subtitle format
   */
  private async exportToSrt(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const srtLines: string[] = []

    if (data.segments && Array.isArray(data.segments)) {
      data.segments.forEach((segment: any, index: number) => {
        const startTime = this.formatSrtTimestamp(segment.startTime || 0)
        const endTime = this.formatSrtTimestamp(segment.endTime || segment.startTime + 3)
        
        srtLines.push(`${index + 1}`)
        srtLines.push(`${startTime} --> ${endTime}`)
        srtLines.push(segment.text || '')
        srtLines.push('')
      })
    }

    const srt = srtLines.join('\n')

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.srt`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, srt, 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'srt',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Export to VTT subtitle format
   */
  private async exportToVtt(
    data: any,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<ExportResult> {
    const vttLines = ['WEBVTT', '']

    if (data.segments && Array.isArray(data.segments)) {
      data.segments.forEach((segment: any, index: number) => {
        const startTime = this.formatVttTimestamp(segment.startTime || 0)
        const endTime = this.formatVttTimestamp(segment.endTime || segment.startTime + 3)
        
        vttLines.push(`${startTime} --> ${endTime}`)
        vttLines.push(segment.text || '')
        vttLines.push('')
      })
    }

    const vtt = vttLines.join('\n')

    const filename = options.filename || 
      `transcript_${data.variables.date.replace(/\//g, '-')}.vtt`
    
    const outputPath = options.outputPath || 
      path.join(process.cwd(), 'exports', filename)

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.promises.writeFile(outputPath, vtt, 'utf8')

    const stats = await fs.promises.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      size: stats.size,
      format: 'vtt',
      template: template.id,
      duration: 0
    }
  }

  /**
   * Format timestamp for SRT format
   */
  private formatSrtTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  /**
   * Format timestamp for VTT format
   */
  private formatVttTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  /**
   * Process template string with variables
   */
  private processTemplateString(template: string, variables: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }

  /**
   * Get available templates
   */
  getTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ExportTemplate | null {
    return this.templates.get(id) || null
  }

  /**
   * Create custom template
   */
  createTemplate(template: Omit<ExportTemplate, 'id'>): ExportTemplate {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullTemplate: ExportTemplate = { id, ...template }
    
    this.templates.set(id, fullTemplate)
    console.log(`📋 Created custom template: ${fullTemplate.name}`)
    
    return fullTemplate
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<ExportTemplate>): ExportTemplate | null {
    const template = this.templates.get(id)
    if (!template) return null

    const updated = { ...template, ...updates, id }
    this.templates.set(id, updated)
    
    console.log(`📋 Updated template: ${updated.name}`)
    return updated
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id)
    if (deleted) {
      console.log(`🗑️ Deleted template: ${id}`)
    }
    return deleted
  }
}

// Export singleton instance
export const advancedExport = new AdvancedExportService()