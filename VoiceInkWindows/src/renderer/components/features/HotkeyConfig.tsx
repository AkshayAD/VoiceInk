import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Keyboard, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface HotkeyConfig {
  recordToggle: string
  openMini: string
  pauseResume: string
  stopRecording: string
}

interface HotkeyItemProps {
  label: string
  description: string
  accelerator: string
  onAcceleratorChange: (accelerator: string) => void
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  error?: string
}

const HotkeyItem: React.FC<HotkeyItemProps> = ({
  label,
  description,
  accelerator,
  onAcceleratorChange,
  isRecording,
  onStartRecording,
  onStopRecording,
  error
}) => {
  const [keys, setKeys] = useState<string[]>([])

  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const modifiers = []
      if (e.ctrlKey || e.metaKey) modifiers.push(e.metaKey ? 'Command' : 'Control')
      if (e.altKey) modifiers.push('Alt')
      if (e.shiftKey) modifiers.push('Shift')

      const key = e.key
      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
        setKeys([...modifiers])
        return
      }

      const finalKeys = [...modifiers, key.toUpperCase()]
      setKeys(finalKeys)

      // Auto-complete after a brief delay
      setTimeout(() => {
        if (finalKeys.length > 1) {
          const accelerator = finalKeys.join('+')
          onAcceleratorChange(accelerator)
          onStopRecording()
        }
      }, 100)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.length === 0) return

      const modifiers = []
      if (e.ctrlKey || e.metaKey) modifiers.push(e.metaKey ? 'Command' : 'Control')
      if (e.altKey) modifiers.push('Alt')
      if (e.shiftKey) modifiers.push('Shift')

      setKeys(modifiers)
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup', handleKeyUp, { capture: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup', handleKeyUp, { capture: true })
    }
  }, [isRecording, keys, onAcceleratorChange, onStopRecording])

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium">{label}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      <div className="flex items-center gap-3">
        {error && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
          </div>
        )}
        
        <div className="min-w-[200px]">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">
                Recording... {keys.join('+')}
              </Badge>
              <Button size="sm" variant="outline" onClick={onStopRecording}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={accelerator}
                onChange={(e) => onAcceleratorChange(e.target.value)}
                placeholder="CommandOrControl+Shift+R"
                className="font-mono text-sm"
              />
              <Button size="sm" variant="outline" onClick={onStartRecording}>
                <Keyboard className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const HotkeyConfig: React.FC = () => {
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>({
    recordToggle: 'CommandOrControl+Shift+R',
    openMini: 'CommandOrControl+Shift+M',
    pauseResume: 'CommandOrControl+Shift+P',
    stopRecording: 'CommandOrControl+Shift+S'
  })
  
  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadHotkeys()
  }, [])

  const loadHotkeys = async () => {
    try {
      const savedHotkeys = await window.electronAPI?.hotkeys?.get()
      if (savedHotkeys) {
        setHotkeys(savedHotkeys)
      }
    } catch (error) {
      console.error('Failed to load hotkeys:', error)
    }
  }

  const validateAccelerator = async (accelerator: string): Promise<string | null> => {
    if (!accelerator.trim()) {
      return 'Hotkey cannot be empty'
    }

    try {
      const result = await window.electronAPI?.hotkeys?.test(accelerator)
      if (!result?.valid) {
        return result?.error || 'Invalid hotkey'
      }
      return null
    } catch (error: any) {
      return error.message || 'Invalid hotkey'
    }
  }

  const handleAcceleratorChange = async (key: keyof HotkeyConfig, accelerator: string) => {
    const newHotkeys = { ...hotkeys, [key]: accelerator }
    setHotkeys(newHotkeys)
    setHasChanges(true)

    // Validate the new accelerator
    const error = await validateAccelerator(accelerator)
    setErrors(prev => ({
      ...prev,
      [key]: error || ''
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Validate all hotkeys first
      const validationPromises = Object.entries(hotkeys).map(async ([key, accelerator]) => {
        const error = await validateAccelerator(accelerator)
        return { key, error }
      })
      
      const validationResults = await Promise.all(validationPromises)
      const newErrors: Record<string, string> = {}
      
      validationResults.forEach(({ key, error }) => {
        if (error) newErrors[key] = error
      })

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Save hotkeys
      const result = await window.electronAPI?.hotkeys?.set(hotkeys)
      
      if (result?.success) {
        setHasChanges(false)
        setErrors({})
        // Show success notification
        window.electronAPI?.notifications?.show?.({
          title: 'Hotkeys Updated',
          body: 'Global hotkeys have been updated successfully',
          type: 'success'
        })
      } else {
        throw new Error(result?.error || 'Failed to save hotkeys')
      }
    } catch (error: any) {
      console.error('Failed to save hotkeys:', error)
      window.electronAPI?.notifications?.show?.({
        title: 'Error',
        body: error.message || 'Failed to save hotkeys',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      const defaultHotkeys = await window.electronAPI?.hotkeys?.reset()
      if (defaultHotkeys) {
        setHotkeys(defaultHotkeys)
        setHasChanges(false)
        setErrors({})
      }
    } catch (error) {
      console.error('Failed to reset hotkeys:', error)
    }
  }

  const hotkeyItems = [
    {
      key: 'recordToggle' as keyof HotkeyConfig,
      label: 'Toggle Recording',
      description: 'Start or stop audio recording'
    },
    {
      key: 'openMini' as keyof HotkeyConfig,
      label: 'Open Mini Recorder',
      description: 'Open the floating mini recorder window'
    },
    {
      key: 'pauseResume' as keyof HotkeyConfig,
      label: 'Pause/Resume',
      description: 'Pause or resume active recording'
    },
    {
      key: 'stopRecording' as keyof HotkeyConfig,
      label: 'Stop Recording',
      description: 'Stop recording and process transcription'
    }
  ]

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Global Hotkeys
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system-wide keyboard shortcuts for VoiceInk
          </p>
        </div>

        <div className="space-y-4">
          {hotkeyItems.map(({ key, label, description }) => (
            <HotkeyItem
              key={key}
              label={label}
              description={description}
              accelerator={hotkeys[key]}
              onAcceleratorChange={(accelerator) => handleAcceleratorChange(key, accelerator)}
              isRecording={recordingKey === key}
              onStartRecording={() => setRecordingKey(key)}
              onStopRecording={() => setRecordingKey(null)}
              error={errors[key]}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="secondary">Unsaved changes</Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || Object.values(errors).some(e => e)}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Hotkeys'}
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use CommandOrControl for cross-platform compatibility</li>
            <li>• Combine multiple modifiers for unique shortcuts</li>
            <li>• Avoid common system shortcuts</li>
            <li>• Test hotkeys to ensure they're not already in use</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}