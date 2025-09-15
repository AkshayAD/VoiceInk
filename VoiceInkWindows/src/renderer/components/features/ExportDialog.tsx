import React, { useState } from 'react'
import { 
  Download, 
  FileText, 
  FileCode, 
  FileImage, 
  Clipboard,
  Check,
  X,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'

interface ExportFormat {
  id: string
  name: string
  description: string
  extension: string
  icon: React.ReactNode
  options?: string[]
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  content: string
  title?: string
  onExport: (format: string, options: any) => Promise<boolean>
}

const exportFormats: ExportFormat[] = [
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text file with transcription content',
    extension: 'txt',
    icon: <FileText size={24} />
  },
  {
    id: 'docx',
    name: 'Word Document',
    description: 'Microsoft Word document with formatting',
    extension: 'docx',
    icon: <FileText size={24} className="text-blue-600" />
  },
  {
    id: 'pdf',
    name: 'PDF Document',
    description: 'Portable document format with professional layout',
    extension: 'pdf',
    icon: <FileText size={24} className="text-red-600" />
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Structured data with timestamps and metadata',
    extension: 'json',
    icon: <FileCode size={24} className="text-green-600" />,
    options: ['include-timestamps', 'include-confidence', 'include-metadata']
  },
  {
    id: 'srt',
    name: 'Subtitle File',
    description: 'SubRip subtitle format for video',
    extension: 'srt',
    icon: <FileText size={24} className="text-purple-600" />,
    options: ['time-format']
  },
  {
    id: 'csv',
    name: 'CSV Spreadsheet',
    description: 'Comma-separated values for data analysis',
    extension: 'csv',
    icon: <FileText size={24} className="text-yellow-600" />
  }
]

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  content,
  title = 'Transcription',
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('txt')
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<Record<string, any>>({})
  const [fileName, setFileName] = useState(title)
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isOpen) return null

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const success = await onExport(selectedFormat, {
        fileName,
        options: exportOptions,
        content
      })
      if (success) {
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Download size={20} />
              Export Transcription
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
            >
              <X size={16} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="flex-1"
            >
              <Clipboard size={16} className="mr-2" />
              Copy to Clipboard
            </Button>
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">File Name</label>
            <div className="flex gap-2">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
                className="flex-1"
              />
              <Badge variant="outline" className="flex items-center">
                .{selectedFormatData?.extension}
              </Badge>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Export Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportFormats.map((format) => (
                <Card
                  key={format.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedFormat === format.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {format.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{format.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format.description}
                        </p>
                      </div>
                      {selectedFormat === format.id && (
                        <Check size={16} className="text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Format Options */}
          {selectedFormatData?.options && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Export Options</h3>
              <div className="space-y-3">
                {selectedFormatData.options.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions[option] || false}
                      onChange={(e) =>
                        setExportOptions(prev => ({
                          ...prev,
                          [option]: e.target.checked
                        }))
                      }
                    />
                    <span className="text-sm">
                      {option.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Content Preview</h3>
            <div className="max-h-32 overflow-auto bg-muted/50 p-3 rounded-md text-sm">
              {content.length > 200 ? `${content.substring(0, 200)}...` : content}
            </div>
            <p className="text-xs text-muted-foreground">
              {content.length} characters, ~{Math.ceil(content.split(' ').length)} words
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
              <Check size={16} className="text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                {selectedFormat === 'clipboard' ? 'Copied to clipboard!' : 'Export completed successfully!'}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !fileName.trim()}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Settings size={16} className="mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Export File
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}