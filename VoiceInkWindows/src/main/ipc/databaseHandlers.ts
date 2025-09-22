import { ipcMain, BrowserWindow } from 'electron'
import { transcriptionRepository } from '../database/transcriptionRepository'

export function setupDatabaseHandlers(mainWindow: BrowserWindow) {
  
  // Get transcriptions with filters
  ipcMain.handle('db:get-transcriptions', async (event, options: any = {}) => {
    try {
      const transcriptions = await transcriptionRepository.findAll(options)
      return transcriptions
    } catch (error) {
      console.error('Failed to get transcriptions:', error)
      throw error
    }
  })
  
  // Save new transcription
  ipcMain.handle('db:save-transcription', async (event, transcription: any) => {
    try {
      const saved = await transcriptionRepository.create(transcription)
      
      // Notify renderer of new transcription
      mainWindow.webContents.send('transcription-saved', saved)
      
      return saved
    } catch (error) {
      console.error('Failed to save transcription:', error)
      throw error
    }
  })
  
  // Update transcription
  ipcMain.handle('db:update-transcription', async (event, id: string, updates: any) => {
    try {
      const updated = await transcriptionRepository.update(id, updates)
      
      if (updated) {
        mainWindow.webContents.send('transcription-updated', updated)
      }
      
      return updated
    } catch (error) {
      console.error('Failed to update transcription:', error)
      throw error
    }
  })
  
  // Delete transcription
  ipcMain.handle('db:delete-transcription', async (event, id: string) => {
    try {
      const deleted = await transcriptionRepository.delete(id)
      
      if (deleted) {
        mainWindow.webContents.send('transcription-deleted', id)
      }
      
      return deleted
    } catch (error) {
      console.error('Failed to delete transcription:', error)
      throw error
    }
  })
  
  // Clear all transcriptions
  ipcMain.handle('db:clear-transcriptions', async () => {
    try {
      const count = await transcriptionRepository.deleteAll()
      
      mainWindow.webContents.send('transcriptions-cleared', count)
      
      return count
    } catch (error) {
      console.error('Failed to clear transcriptions:', error)
      throw error
    }
  })
  
  // Get last transcription
  ipcMain.handle('db:get-last-transcription', async () => {
    try {
      return await transcriptionRepository.findLast()
    } catch (error) {
      console.error('Failed to get last transcription:', error)
      return null
    }
  })
  
  // Search transcriptions
  ipcMain.handle('db:search-transcriptions', async (event, query: string) => {
    try {
      return await transcriptionRepository.search(query)
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  })
  
  // Get transcription by ID
  ipcMain.handle('db:get-transcription-by-id', async (event, id: string) => {
    try {
      return await transcriptionRepository.findById(id)
    } catch (error) {
      console.error('Failed to get transcription by ID:', error)
      return null
    }
  })
  
  // Get transcriptions by date range
  ipcMain.handle('db:get-by-date-range', async (event, startDate: Date, endDate: Date) => {
    try {
      return await transcriptionRepository.findByDateRange(startDate, endDate)
    } catch (error) {
      console.error('Failed to get by date range:', error)
      return []
    }
  })
  
  // Get statistics
  ipcMain.handle('db:get-statistics', async (event, days: number = 30) => {
    try {
      return await transcriptionRepository.getStatistics(days)
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return null
    }
  })
  
  // Get transcriptions by application
  ipcMain.handle('db:get-by-application', async (event, applicationName: string) => {
    try {
      return await transcriptionRepository.findByApplication(applicationName)
    } catch (error) {
      console.error('Failed to get by application:', error)
      return []
    }
  })
  
  // Batch create transcriptions
  ipcMain.handle('db:create-many', async (event, transcriptions: any[]) => {
    try {
      return await transcriptionRepository.createMany(transcriptions)
    } catch (error) {
      console.error('Failed to batch create:', error)
      return 0
    }
  })
  
  // Export transcriptions
  ipcMain.handle('db:export-transcriptions', async (event, ids?: string[]) => {
    try {
      return await transcriptionRepository.exportToJson(ids)
    } catch (error) {
      console.error('Failed to export:', error)
      return []
    }
  })
  
  // Get database info
  ipcMain.handle('db:get-info', async () => {
    try {
      return await transcriptionRepository.getDatabaseInfo()
    } catch (error) {
      console.error('Failed to get database info:', error)
      return null
    }
  })
}