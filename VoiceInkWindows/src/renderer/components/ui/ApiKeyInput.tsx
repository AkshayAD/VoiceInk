import React, { useState } from 'react'
import { Eye, EyeOff, Key, Save, AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card'

interface ApiKeyInputProps {
  title?: string
  description?: string
  currentKey?: string
  onSave: (apiKey: string) => Promise<void>
  onValidate?: (apiKey: string) => Promise<boolean>
  placeholder?: string
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  title = "API Key",
  description = "Enter your API key for authentication",
  currentKey = "",
  onSave,
  onValidate,
  placeholder = "sk-..."
}) => {
  const [apiKey, setApiKey] = useState(currentKey)
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key cannot be empty')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate if validator provided
      if (onValidate) {
        setIsValidating(true)
        const isValid = await onValidate(apiKey)
        setIsValidating(false)
        
        if (!isValid) {
          setError('Invalid API key. Please check and try again.')
          setIsSaving(false)
          return
        }
      }

      // Save the key
      await onSave(apiKey)
      setSuccess(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key size={20} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError(null)
                setSuccess(false)
              }}
              placeholder={placeholder}
              className={error ? "border-red-500" : success ? "border-green-500" : ""}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || isValidating || !apiKey.trim()}
            className="min-w-[100px]"
          >
            {isSaving ? (
              "Saving..."
            ) : isValidating ? (
              "Validating..."
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Save size={16} />
            API key saved successfully!
          </div>
        )}

        {/* Current Key Display */}
        {currentKey && !apiKey && (
          <div className="text-sm text-muted-foreground">
            Current key: {maskApiKey(currentKey)}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Your API key is stored securely and never sent to our servers</p>
          <p>• You can obtain an API key from the provider's dashboard</p>
          <p>• The key is required for transcription services to work</p>
        </div>
      </CardContent>
    </Card>
  )
}