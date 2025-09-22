import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileAudio, X, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

interface DroppedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: any
}

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void
  onFileProcessed?: (fileId: string, result: any) => void
  onFileError?: (fileId: string, error: string) => void
  acceptedTypes?: string[]
  maxFiles?: number
  maxFileSize?: number // in MB
  className?: string
  disabled?: boolean
  showPreview?: boolean
}

const SUPPORTED_AUDIO_TYPES = [
  'audio/wav', 
  'audio/mpeg', 
  'audio/mp4', 
  'audio/m4a',
  'audio/ogg', 
  'audio/webm', 
  'audio/flac',
  'audio/aac'
]

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesDropped,
  onFileProcessed,
  onFileError,
  acceptedTypes = SUPPORTED_AUDIO_TYPES,
  maxFiles = 10,
  maxFileSize = 100, // 100MB default
  className = '',
  disabled = false,
  showPreview = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current++
    
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current--
    
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragOver(false)
    dragCounterRef.current = 0

    if (disabled) return

    const files = Array.from(e.dataTransfer?.files || [])
    processFiles(files)
  }, [disabled, maxFiles, maxFileSize, acceptedTypes])

  /**
   * Handle file input change
   */
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  /**
   * Process selected/dropped files
   */
  const processFiles = useCallback((files: File[]) => {
    console.log(`📁 Processing ${files.length} files`)

    // Validate file count
    if (files.length > maxFiles) {
      console.warn(`Too many files. Maximum ${maxFiles} allowed.`)
      return
    }

    // Filter and validate files
    const validFiles: File[] = []
    const errors: string[] = []

    files.forEach(file => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type (${file.type})`)
        return
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > maxFileSize) {
        errors.push(`${file.name}: File too large (${fileSizeMB.toFixed(1)}MB > ${maxFileSize}MB)`)
        return
      }

      validFiles.push(file)
    })

    // Show errors if any
    if (errors.length > 0) {
      errors.forEach(error => console.warn(error))
      // You could show toast notifications here
    }

    // Process valid files
    if (validFiles.length > 0) {
      const newFiles: DroppedFile[] = validFiles.map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending'
      }))

      setDroppedFiles(prev => [...prev, ...newFiles])
      onFilesDropped(validFiles)
    }
  }, [maxFiles, maxFileSize, acceptedTypes, onFilesDropped])

  /**
   * Update file status
   */
  const updateFileStatus = useCallback((fileId: string, status: DroppedFile['status'], data?: any) => {
    setDroppedFiles(prev => prev.map(file => 
      file.id === fileId ? { 
        ...file, 
        status,
        ...(status === 'completed' && { result: data }),
        ...(status === 'error' && { error: data })
      } : file
    ))

    if (status === 'completed' && onFileProcessed) {
      onFileProcessed(fileId, data)
    } else if (status === 'error' && onFileError) {
      onFileError(fileId, data)
    }
  }, [onFileProcessed, onFileError])

  /**
   * Remove file from list
   */
  const removeFile = useCallback((fileId: string) => {
    setDroppedFiles(prev => prev.filter(file => file.id !== fileId))
  }, [])

  /**
   * Clear all files
   */
  const clearAllFiles = useCallback(() => {
    setDroppedFiles([])
  }, [])

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get status icon
   */
  const getStatusIcon = (status: DroppedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload size={16} className="text-gray-400" />
      case 'processing':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200',
          'flex flex-col items-center justify-center text-center space-y-4',
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          'min-h-32'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className={cn(
          'text-4xl transition-colors duration-200',
          isDragOver ? 'text-blue-500' : 'text-gray-400'
        )}>
          <FileAudio size={48} />
        </div>

        <div>
          <p className={cn(
            'text-lg font-medium transition-colors duration-200',
            isDragOver ? 'text-blue-700' : 'text-gray-700'
          )}>
            {isDragOver ? 'Drop files here' : 'Drag & drop audio files'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or <span className="text-blue-600 underline">browse files</span>
          </p>
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Supported formats: WAV, MP3, MP4, M4A, OGG, WebM, FLAC, AAC</p>
          <p>Maximum {maxFiles} files, {maxFileSize}MB each</p>
        </div>
      </div>

      {/* File Preview */}
      {showPreview && droppedFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Files ({droppedFiles.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFiles}
              className="text-gray-500"
            >
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {droppedFiles.map(file => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  file.status === 'error' ? 'border-red-200 bg-red-50' :
                  file.status === 'completed' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{file.status}</span>
                      {file.status === 'processing' && file.progress && (
                        <>
                          <span>•</span>
                          <span>{file.progress}%</span>
                        </>
                      )}
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DragDropZone