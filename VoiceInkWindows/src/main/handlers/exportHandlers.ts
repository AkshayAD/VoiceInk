// Data export/import functionality
import { ipcMain, dialog, shell } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Document, Packer, Paragraph, TextRun } from 'docx'

interface TranscriptionData {
  id: string
  text: string
  timestamp: string
  duration: number
  model: string
  language: string
  wordCount: number
  confidence?: number
  speaker?: string
  tags?: string[]
}

interface ExportOptions {
  format: 'txt' | 'json' | 'csv' | 'docx' | 'srt'
  includeMetadata: boolean
  includeSpeakers: boolean
  includeTimestamps: boolean
  dateRange?: {
    start: string
    end: string
  }
  tags?: string[]
}

export function registerExportHandlers() {
  // Export single transcription
  ipcMain.handle('export:single', async (_, transcriptionId: string, options: ExportOptions) => {
    try {
      // Get transcription from database (mock for now)
      const transcription = await getTranscriptionById(transcriptionId)
      if (!transcription) {
        throw new Error('Transcription not found')
      }

      const content = await formatTranscription([transcription], options)
      const result = await saveExportFile(content, options.format, transcription.timestamp)
      
      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('Export failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Export multiple transcriptions
  ipcMain.handle('export:multiple', async (_, transcriptionIds: string[], options: ExportOptions) => {
    try {
      const transcriptions = await getTranscriptionsByIds(transcriptionIds)
      const content = await formatTranscription(transcriptions, options)
      const result = await saveExportFile(content, options.format, 'bulk_export')
      
      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('Bulk export failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Export all transcriptions
  ipcMain.handle('export:all', async (_, options: ExportOptions) => {
    try {
      const transcriptions = await getAllTranscriptions(options)
      const content = await formatTranscription(transcriptions, options)
      const result = await saveExportFile(content, options.format, 'all_transcriptions')
      
      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('Full export failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Import transcriptions
  ipcMain.handle('import:file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Transcriptions',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths[0]) {
        return { success: false, error: 'No file selected' }
      }

      const filePath = result.filePaths[0]
      const importResult = await importTranscriptions(filePath)
      
      return importResult
    } catch (error: any) {
      console.error('Import failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Show exported file in folder
  ipcMain.handle('export:showFile', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Get export statistics
  ipcMain.handle('export:getStats', async () => {
    try {
      const stats = await getExportStatistics()
      return { success: true, stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

async function formatTranscription(transcriptions: TranscriptionData[], options: ExportOptions): Promise<Buffer | string> {
  switch (options.format) {
    case 'txt':
      return formatAsTxt(transcriptions, options)
    case 'json':
      return formatAsJson(transcriptions, options)
    case 'csv':
      return formatAsCsv(transcriptions, options)
    case 'docx':
      return formatAsDocx(transcriptions, options)
    case 'srt':
      return formatAsSrt(transcriptions, options)
    default:
      throw new Error(`Unsupported format: ${options.format}`)
  }
}

function formatAsTxt(transcriptions: TranscriptionData[], options: ExportOptions): string {
  return transcriptions.map(t => {
    let output = ''
    
    if (options.includeTimestamps) {
      output += `[${new Date(t.timestamp).toLocaleString()}] `
    }
    
    if (options.includeSpeakers && t.speaker) {
      output += `${t.speaker}: `
    }
    
    output += t.text
    
    if (options.includeMetadata) {
      output += `\n  Duration: ${Math.round(t.duration)}s | Model: ${t.model} | Words: ${t.wordCount}`
      if (t.confidence) {
        output += ` | Confidence: ${(t.confidence * 100).toFixed(1)}%`
      }
    }
    
    return output
  }).join('\n\n')
}

function formatAsJson(transcriptions: TranscriptionData[], options: ExportOptions): string {
  const data = {
    exportDate: new Date().toISOString(),
    format: 'json',
    options,
    count: transcriptions.length,
    transcriptions: transcriptions.map(t => {
      const item: any = {
        id: t.id,
        text: t.text,
        timestamp: t.timestamp
      }
      
      if (options.includeMetadata) {
        item.duration = t.duration
        item.model = t.model
        item.language = t.language
        item.wordCount = t.wordCount
        if (t.confidence) item.confidence = t.confidence
        if (t.tags) item.tags = t.tags
      }
      
      if (options.includeSpeakers && t.speaker) {
        item.speaker = t.speaker
      }
      
      return item
    })
  }
  
  return JSON.stringify(data, null, 2)
}

function formatAsCsv(transcriptions: TranscriptionData[], options: ExportOptions): string {
  const headers = ['ID', 'Text', 'Timestamp']
  
  if (options.includeMetadata) {
    headers.push('Duration', 'Model', 'Language', 'Word Count', 'Confidence')
  }
  
  if (options.includeSpeakers) {
    headers.push('Speaker')
  }
  
  const rows = transcriptions.map(t => {
    const row = [
      t.id,
      `"${t.text.replace(/"/g, '""')}"`, // Escape quotes
      t.timestamp
    ]
    
    if (options.includeMetadata) {
      row.push(
        t.duration.toString(),
        t.model,
        t.language,
        t.wordCount.toString(),
        t.confidence ? (t.confidence * 100).toFixed(1) : ''
      )
    }
    
    if (options.includeSpeakers) {
      row.push(t.speaker || '')
    }
    
    return row.join(',')
  })
  
  return [headers.join(','), ...rows].join('\n')
}

async function formatAsDocx(transcriptions: TranscriptionData[], options: ExportOptions): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'VoiceInk Transcriptions',
              bold: true,
              size: 32
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Exported: ${new Date().toLocaleString()}`,
              italics: true,
              size: 20
            })
          ]
        }),
        new Paragraph({ text: '' }), // Empty line
        
        ...transcriptions.flatMap(t => {
          const paragraphs = []
          
          // Header with timestamp
          if (options.includeTimestamps) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date(t.timestamp).toLocaleString(),
                    bold: true,
                    size: 24
                  })
                ]
              })
            )
          }
          
          // Speaker if included
          if (options.includeSpeakers && t.speaker) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Speaker: ${t.speaker}`,
                    italics: true
                  })
                ]
              })
            )
          }
          
          // Main text
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: t.text
                })
              ]
            })
          )
          
          // Metadata
          if (options.includeMetadata) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Duration: ${Math.round(t.duration)}s | Model: ${t.model} | Words: ${t.wordCount}`,
                    size: 18,
                    color: '666666'
                  })
                ]
              })
            )
          }
          
          // Separator
          paragraphs.push(new Paragraph({ text: '' }))
          
          return paragraphs
        })
      ]
    }]
  })
  
  return await Packer.toBuffer(doc)
}

function formatAsSrt(transcriptions: TranscriptionData[], options: ExportOptions): string {
  // SRT subtitle format
  return transcriptions.map((t, index) => {
    const startTime = new Date(t.timestamp)
    const endTime = new Date(startTime.getTime() + (t.duration * 1000))
    
    const formatTime = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())},${date.getMilliseconds().toString().padStart(3, '0')}`
    }
    
    const speaker = options.includeSpeakers && t.speaker ? `${t.speaker}: ` : ''
    
    return `${index + 1}\n${formatTime(startTime)} --> ${formatTime(endTime)}\n${speaker}${t.text}\n`
  }).join('\n')
}

async function saveExportFile(content: string | Buffer, format: string, prefix: string): Promise<{ filePath: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `${prefix}_${timestamp}.${format}`
  
  const result = await dialog.showSaveDialog({
    title: 'Save Export',
    defaultPath: filename,
    filters: [
      { name: `${format.toUpperCase()} Files`, extensions: [format] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (result.canceled || !result.filePath) {
    throw new Error('Save canceled by user')
  }
  
  await fs.writeFile(result.filePath, content)
  
  return { filePath: result.filePath }
}

async function importTranscriptions(filePath: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const content = await fs.readFile(filePath, 'utf8')
    
    let transcriptions: TranscriptionData[]
    
    if (ext === '.json') {
      const data = JSON.parse(content)
      transcriptions = data.transcriptions || [data] // Handle single or bulk format
    } else if (ext === '.csv') {
      transcriptions = parseCsvTranscriptions(content)
    } else {
      throw new Error('Unsupported file format')
    }
    
    // Import to database (mock for now)
    const importedCount = await importToDatabase(transcriptions)
    
    return { success: true, count: importedCount }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

function parseCsvTranscriptions(content: string): TranscriptionData[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const transcription: any = { id: `imported_${Date.now()}_${index}` }
    
    headers.forEach((header, i) => {
      const value = values[i] || ''
      switch (header.toLowerCase()) {
        case 'text':
          transcription.text = value
          break
        case 'timestamp':
          transcription.timestamp = value
          break
        case 'duration':
          transcription.duration = parseFloat(value) || 0
          break
        case 'model':
          transcription.model = value
          break
        case 'language':
          transcription.language = value
          break
        case 'word count':
          transcription.wordCount = parseInt(value) || 0
          break
        case 'confidence':
          transcription.confidence = parseFloat(value) / 100
          break
        case 'speaker':
          transcription.speaker = value
          break
      }
    })
    
    return transcription as TranscriptionData
  })
}

// Mock database functions
async function getTranscriptionById(id: string): Promise<TranscriptionData | null> {
  // This would query the actual database
  return {
    id,
    text: "Sample transcription text",
    timestamp: new Date().toISOString(),
    duration: 120,
    model: "base.en",
    language: "en",
    wordCount: 25
  }
}

async function getTranscriptionsByIds(ids: string[]): Promise<TranscriptionData[]> {
  // This would query the actual database
  return ids.map(id => ({
    id,
    text: `Sample transcription text for ${id}`,
    timestamp: new Date().toISOString(),
    duration: 120,
    model: "base.en",
    language: "en",
    wordCount: 25
  }))
}

async function getAllTranscriptions(options: ExportOptions): Promise<TranscriptionData[]> {
  // This would query the actual database with filters
  return [
    {
      id: "1",
      text: "Sample transcription text 1",
      timestamp: new Date().toISOString(),
      duration: 120,
      model: "base.en",
      language: "en",
      wordCount: 25
    },
    {
      id: "2",
      text: "Sample transcription text 2",
      timestamp: new Date().toISOString(),
      duration: 180,
      model: "base.en",
      language: "en",
      wordCount: 40
    }
  ]
}

async function importToDatabase(transcriptions: TranscriptionData[]): Promise<number> {
  // This would insert into the actual database
  console.log(`Importing ${transcriptions.length} transcriptions`)
  return transcriptions.length
}

async function getExportStatistics() {
  // This would query actual database statistics
  return {
    totalTranscriptions: 247,
    totalDuration: 18.5 * 3600, // 18.5 hours in seconds
    totalWords: 42300,
    averageDuration: 272,
    languages: ['en', 'es', 'fr'],
    models: ['base.en', 'small.en', 'medium.en']
  }
}