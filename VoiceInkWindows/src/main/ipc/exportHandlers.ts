import { ipcMain } from 'electron'
import { exportService } from '../services/exportService'

export function setupExportHandlers() {
  
  ipcMain.handle('export:transcriptions', async (_, format: string, ids: string[]) => {
    try {
      let filePath: string
      
      switch (format.toLowerCase()) {
        case 'json':
          filePath = await exportService.exportToJSON(ids)
          break
        case 'txt':
        case 'text':
          filePath = await exportService.exportToTXT(ids, { includeMetadata: true })
          break
        case 'csv':
          filePath = await exportService.exportToCSV(ids)
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }
      
      return { success: true, filePath }
    } catch (error: any) {
      console.error('Export failed:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('export:srt', async (_, transcriptionId: string) => {
    try {
      const filePath = await exportService.exportToSRT(transcriptionId)
      return { success: true, filePath }
    } catch (error: any) {
      console.error('SRT export failed:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('export:vtt', async (_, transcriptionId: string) => {
    try {
      const filePath = await exportService.exportToVTT(transcriptionId)
      return { success: true, filePath }
    } catch (error: any) {
      console.error('VTT export failed:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Legacy handlers for backward compatibility
  ipcMain.handle('export:docx', async (_, transcriptionIds: string[]) => {
    try {
      // For now, export as TXT with formatting
      const filePath = await exportService.exportToTXT(transcriptionIds, {
        includeMetadata: true,
        separator: '\n\n' + '─'.repeat(60) + '\n\n'
      })
      return { success: true, filePath, note: 'Exported as TXT format' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('export:pdf', async (_, transcriptionIds: string[]) => {
    try {
      // For now, export as TXT
      const filePath = await exportService.exportToTXT(transcriptionIds, {
        includeMetadata: true,
        separator: '\n\n' + '─'.repeat(60) + '\n\n'
      })
      return { success: true, filePath, note: 'Exported as TXT format' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}