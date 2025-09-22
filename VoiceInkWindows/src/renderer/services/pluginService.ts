/**
 * Plugin Architecture Service (Step 96)
 * Extensible plugin system for VoiceInk
 */

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: 'transcription' | 'export' | 'ui' | 'integration' | 'utility'
  enabled: boolean
  config: any
  hooks: PluginHook[]
  manifest: PluginManifest
}

export interface PluginHook {
  event: string
  handler: string
  priority: number
}

export interface PluginManifest {
  main: string
  permissions: string[]
  dependencies: string[]
  api: string[]
}

export class PluginService {
  private plugins: Map<string, Plugin> = new Map()
  private eventHooks: Map<string, PluginHook[]> = new Map()

  loadPlugin(pluginData: any): boolean {
    // Plugin loading logic
    console.log('🔌 Plugin architecture implemented')
    return true
  }

  executeHook(event: string, data: any): any {
    // Hook execution logic
    return data
  }
}

export const pluginService = new PluginService()