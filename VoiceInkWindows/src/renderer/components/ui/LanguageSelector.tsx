import React, { useState, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Language {
  code: string
  name: string
  nativeName: string
  flag?: string
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto-detect', nativeName: 'Auto', flag: '🌐' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' }
]

interface LanguageSelectorProps {
  value?: string
  onChange: (language: string) => void
  showFlags?: boolean
  showNativeName?: boolean
  className?: string
  disabled?: boolean
  variant?: 'dropdown' | 'grid' | 'compact'
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value = 'auto',
  onChange,
  showFlags = true,
  showNativeName = false,
  className = '',
  disabled = false,
  variant = 'dropdown'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredLanguages, setFilteredLanguages] = useState(SUPPORTED_LANGUAGES)

  useEffect(() => {
    if (searchTerm) {
      const filtered = SUPPORTED_LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredLanguages(filtered)
    } else {
      setFilteredLanguages(SUPPORTED_LANGUAGES)
    }
  }, [searchTerm])

  const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === value) || SUPPORTED_LANGUAGES[0]

  const handleSelect = (langCode: string) => {
    onChange(langCode)
    setIsOpen(false)
    setSearchTerm('')
  }

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {SUPPORTED_LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            disabled={disabled}
            className={cn(
              'p-2 rounded-lg border transition-all text-sm',
              'hover:bg-gray-50 hover:border-primary',
              value === lang.code && 'bg-primary/10 border-primary',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-1">
              {showFlags && <span>{lang.flag}</span>}
              <span className="truncate">{lang.name}</span>
            </div>
            {value === lang.code && (
              <Check size={14} className="ml-auto text-primary" />
            )}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <select
        value={value}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        className={cn(
          'px-3 py-1 rounded-md border text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {SUPPORTED_LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {showFlags ? `${lang.flag} ` : ''}{lang.name}
          </option>
        ))}
      </select>
    )
  }

  // Default dropdown variant
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg border',
          'bg-white hover:bg-gray-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-primary'
        )}
      >
        <Globe size={18} />
        {showFlags && <span>{selectedLanguage.flag}</span>}
        <span className="font-medium">
          {selectedLanguage.name}
          {showNativeName && selectedLanguage.code !== 'auto' && (
            <span className="text-muted-foreground ml-1">
              ({selectedLanguage.nativeName})
            </span>
          )}
        </span>
        <svg
          className={cn(
            'w-4 h-4 ml-auto transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 max-h-80 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Language list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors',
                    'flex items-center gap-3',
                    value === lang.code && 'bg-primary/10'
                  )}
                >
                  {showFlags && <span className="text-xl">{lang.flag}</span>}
                  <div className="flex-1">
                    <div className="font-medium">{lang.name}</div>
                    {showNativeName && lang.code !== 'auto' && (
                      <div className="text-xs text-muted-foreground">
                        {lang.nativeName}
                      </div>
                    )}
                  </div>
                  {value === lang.code && (
                    <Check size={16} className="text-primary" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}