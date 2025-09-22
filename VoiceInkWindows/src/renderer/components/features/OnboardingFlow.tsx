import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  ChevronRight, 
  ChevronLeft,
  CheckCircle, 
  Mic, 
  Settings, 
  Zap,
  Download,
  Play,
  Volume2,
  Headphones
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ onNext: () => void; onSkip?: () => void }>
  optional?: boolean
}

const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
      <Mic className="w-10 h-10 text-primary-foreground" />
    </div>
    <div>
      <h2 className="text-2xl font-bold mb-2">Welcome to VoiceInk</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Transform your voice into text with AI-powered transcription. 
        Let's set up your perfect recording environment.
      </p>
    </div>
    <div className="flex flex-col gap-3 max-w-sm mx-auto">
      <div className="flex items-center gap-3 text-sm">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span>Real-time AI transcription</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span>Multiple AI models</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span>Global hotkeys</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span>Export to multiple formats</span>
      </div>
    </div>
    <Button onClick={onNext} size="lg" className="px-8">
      Get Started
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
)

const AudioSetupStep: React.FC<{ onNext: () => void; onSkip?: () => void }> = ({ onNext, onSkip }) => {
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    loadAudioDevices()
  }, [])

  const loadAudioDevices = async () => {
    try {
      const deviceList = await window.electronAPI?.audio?.getDevices()
      setDevices(deviceList || [])
      if (deviceList?.length > 0) {
        setSelectedDevice(deviceList[0].id)
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error)
    }
  }

  const testMicrophone = async () => {
    setIsTestingMic(true)
    try {
      if (selectedDevice) {
        await window.electronAPI?.audio?.selectDevice(selectedDevice)
      }
      
      // Start test recording
      await window.electronAPI?.audio?.startRecording({ test: true })
      
      // Listen for audio levels
      window.electronAPI?.audio?.onLevel?.((level: number) => {
        setAudioLevel(level)
      })
      
      // Stop after 5 seconds
      setTimeout(async () => {
        await window.electronAPI?.audio?.stopRecording()
        setIsTestingMic(false)
        setAudioLevel(0)
      }, 5000)
    } catch (error) {
      console.error('Failed to test microphone:', error)
      setIsTestingMic(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Headphones className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Audio Setup</h2>
        <p className="text-muted-foreground">
          Choose your microphone and test the audio quality
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Microphone</label>
          <select 
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full p-2 border rounded-lg bg-background"
          >
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Test Microphone</label>
            <Button 
              onClick={testMicrophone}
              disabled={isTestingMic || !selectedDevice}
              size="sm"
              variant="outline"
            >
              {isTestingMic ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-2" />
                  Test Audio
                </>
              )}
            </Button>
          </div>
          
          {/* Audio level indicator */}
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
            />
          </div>
          
          {isTestingMic && (
            <p className="text-xs text-muted-foreground mt-1">
              Speak into your microphone to see the audio levels
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip for Now
          </Button>
        )}
        <Button 
          onClick={onNext} 
          className="flex-1"
          disabled={!selectedDevice}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

const ModelSetupStep: React.FC<{ onNext: () => void; onSkip?: () => void }> = ({ onNext, onSkip }) => {
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const modelList = await window.electronAPI?.transcription?.getModels()
      setModels(modelList || [])
      
      // Pre-select recommended model
      const recommended = modelList?.find((m: any) => m.recommended)
      if (recommended) {
        setSelectedModel(recommended.id)
      } else if (modelList?.length > 0) {
        setSelectedModel(modelList[0].id)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const downloadModel = async () => {
    if (!selectedModel) return
    
    setIsDownloading(true)
    try {
      // Listen for download progress
      window.electronAPI?.transcription?.onDownloadProgress?.((progress: any) => {
        setDownloadProgress(progress.percent || 0)
      })
      
      await window.electronAPI?.transcription?.downloadModel(selectedModel)
      
      // Select the downloaded model
      await window.electronAPI?.transcription?.selectModel(selectedModel)
      
      setIsDownloading(false)
      onNext()
    } catch (error) {
      console.error('Failed to download model:', error)
      setIsDownloading(false)
    }
  }

  const selectedModelInfo = models.find(m => m.id === selectedModel)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Choose AI Model</h2>
        <p className="text-muted-foreground">
          Select a transcription model based on your needs
        </p>
      </div>

      <div className="space-y-3">
        {models.map(model => (
          <div
            key={model.id}
            className={cn(
              "p-4 border rounded-lg cursor-pointer transition-all",
              selectedModel === model.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onClick={() => setSelectedModel(model.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{model.name}</h4>
                  {model.recommended && (
                    <Badge variant="secondary">Recommended</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {model.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Size: {model.size}</span>
                  <span>Speed: {model.speed}</span>
                  <span>Quality: {model.quality}</span>
                </div>
              </div>
              <div className={cn(
                "w-4 h-4 rounded-full border-2",
                selectedModel === model.id ? "border-primary bg-primary" : "border-border"
              )} />
            </div>
          </div>
        ))}
      </div>

      {selectedModelInfo && !selectedModelInfo.downloaded && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm mb-2">
            This model needs to be downloaded ({selectedModelInfo.size})
          </p>
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Downloading...</span>
                <span>{downloadProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip for Now
          </Button>
        )}
        <Button 
          onClick={selectedModelInfo?.downloaded ? onNext : downloadModel}
          className="flex-1"
          disabled={!selectedModel || isDownloading}
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2" />
              Downloading...
            </>
          ) : selectedModelInfo?.downloaded ? (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

const HotkeysStep: React.FC<{ onNext: () => void; onSkip?: () => void }> = ({ onNext, onSkip }) => {
  const [hotkeys, setHotkeys] = useState({
    recordToggle: 'CommandOrControl+Shift+R',
    openMini: 'CommandOrControl+Shift+M'
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Global Hotkeys</h2>
        <p className="text-muted-foreground">
          Set up keyboard shortcuts for quick access
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Toggle Recording</h4>
              <p className="text-sm text-muted-foreground">Start/stop recording from anywhere</p>
            </div>
            <Badge variant="outline" className="font-mono">
              {hotkeys.recordToggle}
            </Badge>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Open Mini Recorder</h4>
              <p className="text-sm text-muted-foreground">Show floating recorder window</p>
            </div>
            <Badge variant="outline" className="font-mono">
              {hotkeys.openMini}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-600">
          💡 You can customize these hotkeys later in Settings
        </p>
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip
          </Button>
        )}
        <Button onClick={onNext} className="flex-1">
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

const CompletionStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
      <CheckCircle className="w-10 h-10 text-white" />
    </div>
    <div>
      <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        VoiceInk is ready to transform your voice into text. 
        Start your first recording or explore the features.
      </p>
    </div>
    <div className="flex flex-col gap-3 max-w-sm mx-auto">
      <Button variant="outline" size="sm">
        Take a Quick Tour
      </Button>
      <Button onClick={onNext} size="lg" className="px-8">
        Start Recording
        <Mic className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </div>
)

export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Welcome to VoiceInk',
      component: WelcomeStep
    },
    {
      id: 'audio',
      title: 'Audio Setup',
      description: 'Configure your microphone',
      component: AudioSetupStep,
      optional: true
    },
    {
      id: 'models',
      title: 'AI Models',
      description: 'Choose transcription model',
      component: ModelSetupStep,
      optional: true
    },
    {
      id: 'hotkeys',
      title: 'Hotkeys',
      description: 'Set up shortcuts',
      component: HotkeysStep,
      optional: true
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'Setup complete',
      component: CompletionStep
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Mark onboarding as complete
      window.electronAPI?.settings?.set('onboardingCompleted', true)
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleNext()
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {steps[currentStep].title}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <CurrentStepComponent 
          onNext={handleNext} 
          onSkip={steps[currentStep].optional ? handleSkip : undefined}
        />

        {/* Navigation */}
        {currentStep > 0 && currentStep < steps.length - 1 && (
          <div className="mt-8 pt-6 border-t">
            <Button 
              variant="ghost" 
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}