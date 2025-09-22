import React, { useState, useCallback } from 'react'
import { Upload, FileAudio, Play, Pause, X, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import { LanguageSelector } from '../ui/LanguageSelector'
import { cn } from '../../lib/utils'

interface BatchFile {
  id: string
  name: string
  path: string
  size: number
  duration?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: {
    text: string
    wordCount: number
    confidence: number
    processingTime: number
  }
  error?: string
}

export const BatchProcessingPage: React.FC = () => {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [dragActive, setDragActive] = useState(false)

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFileSelect = async () => {
    try {
      const result = await (window as any).electronAPI.selectFiles({
        filters: [
          { name: 'Audio Files', extensions: ['wav', 'mp3', 'mp4', 'm4a', 'webm', 'ogg'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      })
      
      if (result.filePaths && result.filePaths.length > 0) {
        const newFiles = result.filePaths.map((path: string, index: number) => ({
          id: `file-${Date.now()}-${index}`,
          name: path.split('/').pop() || 'Unknown',
          path,
          size: 0, // Would need to get actual size
          status: 'pending' as const,
          progress: 0
        }))
        
        setFiles(prev => [...prev, ...newFiles])
      }
    } catch (error) {
      console.error('File selection failed:', error)
    }
  }

  const handleFiles = (fileList: File[]) => {
    const audioFiles = fileList.filter(file => 
      file.type.startsWith('audio/') || 
      ['.wav', '.mp3', '.mp4', '.m4a', '.webm', '.ogg'].some(ext => file.name.endsWith(ext))
    )

    const newFiles: BatchFile[] = audioFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      path: file.path || '',
      size: file.size,
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const startBatchProcessing = async () => {
    setIsProcessing(true)
    
    for (const file of files) {
      if (file.status === 'completed' || file.status === 'processing') continue
      
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'processing' as const, progress: 0 } : f
      ))

      try {
        // Simulate processing with progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200))
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ))
        }

        // Simulate transcription result
        const result = {
          text: `Transcribed content of ${file.name}...`,
          wordCount: Math.floor(Math.random() * 500) + 100,
          confidence: 0.85 + Math.random() * 0.15,
          processingTime: Math.random() * 10 + 2
        }

        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'completed' as const, progress: 100, result }
            : f
        ))
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'failed' as const, error: 'Processing failed' }
            : f
        ))
      }
    }
    
    setIsProcessing(false)
  }

  const exportResults = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.result)
    const exportData = completedFiles.map(f => ({
      fileName: f.name,
      text: f.result?.text,
      wordCount: f.result?.wordCount,
      confidence: f.result?.confidence,
      processingTime: f.result?.processingTime
    }))

    console.log('Exporting results:', exportData)
    // TODO: Implement actual export
  }

  // Calculate statistics
  const stats = {
    total: files.length,
    completed: files.filter(f => f.status === 'completed').length,
    failed: files.filter(f => f.status === 'failed').length,
    pending: files.filter(f => f.status === 'pending').length,
    totalWords: files.reduce((acc, f) => acc + (f.result?.wordCount || 0), 0),
    avgConfidence: files.filter(f => f.result).reduce((acc, f) => acc + (f.result?.confidence || 0), 0) / 
                   (files.filter(f => f.result).length || 1)
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Processing</h1>
          <p className="text-muted-foreground mt-1">
            Process multiple audio files at once
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={exportResults}
            disabled={stats.completed === 0}
            variant="outline"
          >
            Export Results
          </Button>
          <Button
            onClick={startBatchProcessing}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                Start Processing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileAudio size={24} className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Words</p>
                <p className="text-2xl font-bold">{stats.totalWords.toLocaleString()}</p>
              </div>
              <BarChart3 size={24} className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(1)}%</p>
              </div>
              <Clock size={24} className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <LanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                variant="compact"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-1 rounded-md border text-sm"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked />
                  Timestamps
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" />
                  Diarization
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Drop Zone */}
      <Card>
        <CardContent className="p-0">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-all',
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
              'hover:border-primary hover:bg-gray-50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Drop audio files here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports WAV, MP3, MP4, M4A, WebM, and OGG formats
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-white"
              >
                <FileAudio size={24} className="text-muted-foreground" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{file.name}</span>
                    <Badge
                      variant={
                        file.status === 'completed' ? 'success' :
                        file.status === 'failed' ? 'destructive' :
                        file.status === 'processing' ? 'warning' :
                        'secondary'
                      }
                    >
                      {file.status}
                    </Badge>
                  </div>
                  
                  {file.status === 'processing' && (
                    <Progress value={file.progress} className="mt-2" />
                  )}
                  
                  {file.result && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {file.result.wordCount} words • 
                      {(file.result.confidence * 100).toFixed(1)}% confidence • 
                      {file.result.processingTime.toFixed(1)}s
                    </div>
                  )}
                  
                  {file.error && (
                    <div className="text-sm text-red-600 mt-1">
                      {file.error}
                    </div>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === 'processing'}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}