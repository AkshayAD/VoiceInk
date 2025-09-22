import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Calendar, Filter, Tag, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface SearchFilters {
  dateFrom?: Date
  dateTo?: Date
  language?: string
  application?: string
  speaker?: string
  minConfidence?: number
  minDuration?: number
  tags?: string[]
}

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void
  onClear?: () => void
  placeholder?: string
  showFilters?: boolean
  suggestions?: string[]
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  placeholder = 'Search transcriptions...',
  showFilters = true,
  suggestions = [],
  className = ''
}) => {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Handle search submission
  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query, filters)
      
      // Add to recent searches
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
      
      setShowSuggestions(false)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        setQuery(filteredSuggestions[selectedSuggestionIndex])
        setSelectedSuggestionIndex(-1)
        setShowSuggestions(false)
        handleSearch()
      } else {
        handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        Math.min(prev + 1, filteredSuggestions.length - 1)
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setShowFilterPanel(false)
    }
  }

  // Handle clear
  const handleClear = () => {
    setQuery('')
    setFilters({})
    setShowSuggestions(false)
    onClear?.()
    inputRef.current?.focus()
  }

  // Filter suggestions based on query
  const filteredSuggestions = [
    ...suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())),
    ...recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !suggestions.includes(s))
  ].slice(0, 8)

  // Active filter count
  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(e.target.value.length > 0)
            setSelectedSuggestionIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(query.length > 0 || recentSearches.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-24 py-2 rounded-lg border',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            'transition-all'
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-7 w-7 p-0"
            >
              <X size={16} />
            </Button>
          )}
          
          {showFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                'h-7 px-2',
                activeFilterCount > 0 && 'text-primary'
              )}
            >
              <Filter size={16} />
              {activeFilterCount > 0 && (
                <Badge variant="primary" className="ml-1 px-1 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
          
          <Button
            size="sm"
            onClick={handleSearch}
            className="h-7"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (filteredSuggestions.length > 0 || (query === '' && recentSearches.length > 0)) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border z-50">
          {query === '' && recentSearches.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    handleSearch()
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Search size={14} className="text-muted-foreground" />
                  {search}
                </button>
              ))}
            </>
          )}
          
          {filteredSuggestions.length > 0 && (
            <>
              {query !== '' && (
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  Suggestions
                </div>
              )}
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion)
                    handleSearch()
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2',
                    selectedSuggestionIndex === index && 'bg-gray-100'
                  )}
                >
                  <Search size={14} className="text-muted-foreground" />
                  <span dangerouslySetInnerHTML={{
                    __html: suggestion.replace(
                      new RegExp(query, 'gi'),
                      match => `<mark class="bg-yellow-200">${match}</mark>`
                    )
                  }} />
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && showFilterPanel && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border p-4 z-50">
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar size={14} />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateFrom: e.target.value ? new Date(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-1 border rounded-md text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar size={14} />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateTo: e.target.value ? new Date(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-1 border rounded-md text-sm"
                />
              </div>
            </div>

            {/* Other Filters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={filters.language || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    language: e.target.value || undefined
                  }))}
                  className="w-full px-3 py-1 border rounded-md text-sm"
                >
                  <option value="">All</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Confidence</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(filters.minConfidence || 0) * 100}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minConfidence: parseInt(e.target.value) / 100
                  }))}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">
                  {((filters.minConfidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Duration (s)</label>
                <input
                  type="number"
                  min="0"
                  value={filters.minDuration || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minDuration: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-1 border rounded-md text-sm"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilters({})
                  setShowFilterPanel(false)
                }}
              >
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleSearch()
                  setShowFilterPanel(false)
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}