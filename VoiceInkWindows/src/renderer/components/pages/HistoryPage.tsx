import React, { useState, useMemo } from 'react'
import { Search, Calendar, Filter, Download, Trash2, Play, FileText, Clock, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { cn, formatTime, formatFileSize, truncateText } from '../../lib/utils'

interface TranscriptionRecord {
  id: string
  title: string
  content: string
  duration: number
  fileSize: number
  createdAt: Date
  tags: string[]
  model: string
  accuracy: number
  language: string
  wordCount: number
  application?: string
}

interface HistoryPageProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

export const HistoryPage: React.FC<HistoryPageProps> = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])

  // Mock data - in real app this would come from database
  const [records] = useState<TranscriptionRecord[]>([
    {
      id: '1',
      title: 'Meeting Notes - Q4 Planning',
      content: 'Welcome everyone to our Q4 planning meeting. Today we will be discussing our roadmap for the next quarter, including new feature releases, bug fixes, and performance improvements...',
      duration: 1823, // 30:23
      fileSize: 45600000, // ~45MB
      createdAt: new Date('2024-01-15T14:30:00'),
      tags: ['meeting', 'planning', 'work'],
      model: 'Whisper Base',
      accuracy: 94.5,
      language: 'English',
      wordCount: 456,
      application: 'Microsoft Teams'
    },
    {
      id: '2',
      title: 'Voice Memo - Grocery List',
      content: 'I need to pick up milk, eggs, bread, chicken, vegetables for the week. Also remember to get cat food and paper towels...',
      duration: 45,
      fileSize: 1200000, // ~1.2MB
      createdAt: new Date('2024-01-14T09:15:00'),
      tags: ['personal', 'shopping'],
      model: 'Whisper Tiny',
      accuracy: 89.2,
      language: 'English',
      wordCount: 32
    },
    {
      id: '3',
      title: 'Interview - John Smith',
      content: 'Thank you for taking the time to interview with us today. Can you start by telling me about your background and experience with React development...',
      duration: 2147, // 35:47
      fileSize: 52800000, // ~53MB
      createdAt: new Date('2024-01-13T16:00:00'),
      tags: ['interview', 'work', 'hr'],
      model: 'Whisper Small',
      accuracy: 96.8,
      language: 'English',
      wordCount: 678,
      application: 'Zoom'
    },
    {
      id: '4',
      title: 'Lecture - Introduction to AI',
      content: 'Today we will explore the fundamentals of artificial intelligence, including machine learning algorithms, neural networks, and their practical applications...',
      duration: 3621, // 60:21
      fileSize: 89400000, // ~89MB
      createdAt: new Date('2024-01-12T10:00:00'),
      tags: ['education', 'ai', 'lecture'],
      model: 'Whisper Medium',
      accuracy: 97.2,
      language: 'English',
      wordCount: 1234
    },
    {
      id: '5',
      title: 'Phone Call - Customer Support',
      content: 'Hello, I am calling about an issue with my recent order. The package arrived damaged and I would like to request a replacement...',
      duration: 678, // 11:18
      fileSize: 16800000, // ~17MB
      createdAt: new Date('2024-01-11T13:45:00'),
      tags: ['support', 'phone'],
      model: 'Whisper Base',
      accuracy: 91.4,
      language: 'English',
      wordCount: 156
    }
  ])

  // Filter and search logic
  const filteredRecords = useMemo(() => {
    let filtered = records

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(record => record.tags.includes(selectedFilter))
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.createdAt.getTime() - a.createdAt.getTime()
        case 'date-asc':
          return a.createdAt.getTime() - b.createdAt.getTime()
        case 'duration-desc':
          return b.duration - a.duration
        case 'duration-asc':
          return a.duration - b.duration
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

    return filtered
  }, [records, searchQuery, selectedFilter, sortBy])

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    )
  }

  const handleSelectAll = () => {
    setSelectedRecords(
      selectedRecords.length === filteredRecords.length 
        ? [] 
        : filteredRecords.map(r => r.id)
    )
  }

  const handleExport = (recordId?: string) => {
    const recordsToExport = recordId ? [recordId] : selectedRecords
    console.log('Exporting records:', recordsToExport)
    // TODO: Implement export functionality
  }

  const handleDelete = (recordId?: string) => {
    const recordsToDelete = recordId ? [recordId] : selectedRecords
    console.log('Deleting records:', recordsToDelete)
    // TODO: Implement delete functionality
    setSelectedRecords([])
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'success'
    if (accuracy >= 90) return 'warning'
    return 'destructive'
  }

  // Get unique tags for filter dropdown
  const availableTags = Array.from(new Set(records.flatMap(r => r.tags)))

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transcription History</h1>
          <p className="text-muted-foreground mt-1">
            Search and manage your recorded transcriptions
          </p>
        </div>
        
        {selectedRecords.length > 0 && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleExport()}
            >
              <Download size={16} className="mr-1" />
              Export ({selectedRecords.length})
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleDelete()}
            >
              <Trash2 size={16} className="mr-1" />
              Delete ({selectedRecords.length})
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transcriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="all">All Categories</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="duration-desc">Longest First</option>
            <option value="duration-asc">Shortest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} transcriptions
        </p>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
              onChange={handleSelectAll}
            />
            Select All
          </label>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No transcriptions found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search terms or filters"
                  : "Start recording to see your transcriptions here"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <Card key={record.id} className={cn(
              "transition-all hover:shadow-md",
              selectedRecords.includes(record.id) && "ring-2 ring-primary"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <CardTitle className="text-lg">{record.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(record.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(record.duration)}
                        </span>
                        <span>{formatFileSize(record.fileSize)}</span>
                        <span>{record.wordCount} words</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Play size={16} className="mr-1" />
                      Play
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleExport(record.id)}
                    >
                      <Download size={16} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Content Preview */}
                <p className="text-sm leading-relaxed">
                  {truncateText(record.content, 200)}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <Badge variant="outline">{record.model}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Accuracy:</span>
                    <Badge variant={getAccuracyColor(record.accuracy)}>
                      {record.accuracy}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Language:</span>
                    <Badge variant="outline">{record.language}</Badge>
                  </div>
                  
                  {record.application && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">App:</span>
                      <Badge variant="outline">{record.application}</Badge>
                    </div>
                  )}
                </div>
                
                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag size={14} className="text-muted-foreground" />
                  {record.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}