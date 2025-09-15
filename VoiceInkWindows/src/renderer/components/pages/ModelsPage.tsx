import React, { useState } from 'react'
import { Download, CheckCircle, AlertCircle, Trash2, RefreshCw, Zap, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

interface AIModel {
  id: string
  name: string
  size: string
  sizeBytes: number
  accuracy: string
  speed: string
  language: string[]
  description: string
  status: 'available' | 'downloaded' | 'downloading' | 'error'
  downloadProgress?: number
  isRecommended?: boolean
  isActive?: boolean
}

interface ModelsPageProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

export const ModelsPage: React.FC<ModelsPageProps> = () => {
  const [models, setModels] = useState<AIModel[]>([
    {
      id: 'whisper-tiny',
      name: 'Whisper Tiny',
      size: '39 MB',
      sizeBytes: 39 * 1024 * 1024,
      accuracy: 'Good',
      speed: 'Very Fast',
      language: ['English'],
      description: 'Fastest model, ideal for real-time transcription with good accuracy',
      status: 'downloaded',
      isActive: true
    },
    {
      id: 'whisper-base',
      name: 'Whisper Base',
      size: '74 MB',
      sizeBytes: 74 * 1024 * 1024,
      accuracy: 'Very Good',
      speed: 'Fast',
      language: ['English', 'Multilingual'],
      description: 'Balanced performance and accuracy, recommended for most users',
      status: 'downloaded',
      isRecommended: true
    },
    {
      id: 'whisper-small',
      name: 'Whisper Small',
      size: '244 MB',
      sizeBytes: 244 * 1024 * 1024,
      accuracy: 'Excellent',
      speed: 'Medium',
      language: ['English', 'Multilingual'],
      description: 'Higher accuracy with moderate performance impact',
      status: 'available'
    },
    {
      id: 'whisper-medium',
      name: 'Whisper Medium',
      size: '769 MB',
      sizeBytes: 769 * 1024 * 1024,
      accuracy: 'Excellent',
      speed: 'Slow',
      language: ['English', 'Multilingual'],
      description: 'Professional-grade accuracy for critical applications',
      status: 'available'
    },
    {
      id: 'whisper-large',
      name: 'Whisper Large',
      size: '1.5 GB',
      sizeBytes: 1.5 * 1024 * 1024 * 1024,
      accuracy: 'Outstanding',
      speed: 'Very Slow',
      language: ['English', 'Multilingual'],
      description: 'Highest accuracy available, requires significant resources',
      status: 'available'
    }
  ])

  const [downloadingModel, setDownloadingModel] = useState<string | null>(null)

  const handleDownload = (modelId: string) => {
    setDownloadingModel(modelId)
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { ...model, status: 'downloading', downloadProgress: 0 }
        : model
    ))

    // Simulate download progress
    const interval = setInterval(() => {
      setModels(prev => prev.map(model => {
        if (model.id === modelId && model.status === 'downloading') {
          const newProgress = (model.downloadProgress || 0) + Math.random() * 15
          if (newProgress >= 100) {
            clearInterval(interval)
            setDownloadingModel(null)
            return { ...model, status: 'downloaded', downloadProgress: 100 }
          }
          return { ...model, downloadProgress: newProgress }
        }
        return model
      }))
    }, 500)
  }

  const handleDelete = (modelId: string) => {
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { ...model, status: 'available', downloadProgress: 0, isActive: false }
        : model
    ))
  }

  const handleSetActive = (modelId: string) => {
    setModels(prev => prev.map(model => ({
      ...model,
      isActive: model.id === modelId
    })))
  }

  const getAccuracyColor = (accuracy: string) => {
    switch (accuracy) {
      case 'Outstanding': return 'bg-purple-500'
      case 'Excellent': return 'bg-green-500'
      case 'Very Good': return 'bg-blue-500'
      case 'Good': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'Very Fast': return 'bg-green-500'
      case 'Fast': return 'bg-blue-500'
      case 'Medium': return 'bg-yellow-500'
      case 'Slow': return 'bg-orange-500'
      case 'Very Slow': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const downloadedModels = models.filter(m => m.status === 'downloaded')
  const totalDownloadedSize = downloadedModels.reduce((acc, model) => acc + model.sizeBytes, 0)

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage and download AI transcription models
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw size={16} className="mr-2" />
          Check for Updates
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Downloaded Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{downloadedModels.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(totalDownloadedSize)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {models.find(m => m.isActive)?.name || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently selected for transcription
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalDownloadedSize)}</div>
            <p className="text-xs text-muted-foreground">
              of available space
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Models</h2>
        
        <div className="grid gap-4">
          {models.map((model) => (
            <Card key={model.id} className={cn(
              "transition-all",
              model.isActive && "ring-2 ring-primary"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      {model.name}
                      {model.isRecommended && (
                        <Badge variant="success">Recommended</Badge>
                      )}
                      {model.isActive && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </CardTitle>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {model.status === 'downloaded' ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : model.status === 'downloading' ? (
                      <RefreshCw size={20} className="text-blue-500 animate-spin" />
                    ) : model.status === 'error' ? (
                      <AlertCircle size={20} className="text-red-500" />
                    ) : (
                      <Download size={20} className="text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {model.description}
                </p>

                {/* Model Stats */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getAccuracyColor(model.accuracy))} />
                    <span className="text-sm">Accuracy: {model.accuracy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={getSpeedColor(model.speed).replace('bg-', 'text-')} />
                    <span className="text-sm">Speed: {model.speed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={14} />
                    <span className="text-sm">{model.language.join(', ')}</span>
                  </div>
                </div>

                {/* Download Progress */}
                {model.status === 'downloading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Downloading...</span>
                      <span>{Math.round(model.downloadProgress || 0)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${model.downloadProgress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    Size: {model.size}
                  </div>
                  
                  <div className="flex gap-2">
                    {model.status === 'available' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleDownload(model.id)}
                        disabled={downloadingModel !== null}
                      >
                        <Download size={16} className="mr-1" />
                        Download
                      </Button>
                    )}
                    
                    {model.status === 'downloaded' && (
                      <>
                        {!model.isActive && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSetActive(model.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(model.id)}
                          disabled={model.isActive}
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                    
                    {model.status === 'downloading' && (
                      <Button size="sm" variant="outline" disabled>
                        Downloading...
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}