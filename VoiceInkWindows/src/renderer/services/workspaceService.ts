/**
 * Workspace and Project Management Service
 * Manages multiple workspaces, projects, and their transcriptions
 */

export interface Workspace {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  createdAt: Date
  updatedAt: Date
  settings: WorkspaceSettings
  projects: Project[]
  isDefault: boolean
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string
  tags: string[]
  language: string
  model: string
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
  lastActivityAt: Date
  transcriptionCount: number
  totalDuration: number
  status: 'active' | 'archived' | 'completed'
}

export interface WorkspaceSettings {
  defaultLanguage: string
  defaultModel: string
  autoSave: boolean
  enableSpeakerDiarization: boolean
  enableTimestamps: boolean
  exportFormat: string
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
}

export interface ProjectSettings {
  language?: string
  model?: string
  enableSpeakerDiarization?: boolean
  enableTimestamps?: boolean
  maxSpeakers?: number
  customPrompt?: string
  outputFormat?: string
  autoTranscribe?: boolean
}

export class WorkspaceService {
  private workspaces: Map<string, Workspace> = new Map()
  private currentWorkspaceId: string = ''
  private currentProjectId: string = ''
  private storageKey = 'voiceink-workspaces'

  constructor() {
    this.loadWorkspaces()
    this.initializeDefaultWorkspace()
  }

  /**
   * Load workspaces from storage
   */
  private loadWorkspaces(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        data.forEach((workspace: any) => {
          // Convert date strings back to Date objects
          workspace.createdAt = new Date(workspace.createdAt)
          workspace.updatedAt = new Date(workspace.updatedAt)
          workspace.projects.forEach((project: any) => {
            project.createdAt = new Date(project.createdAt)
            project.updatedAt = new Date(project.updatedAt)
            project.lastActivityAt = new Date(project.lastActivityAt)
          })
          this.workspaces.set(workspace.id, workspace)
        })
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    }
  }

  /**
   * Save workspaces to storage
   */
  private saveWorkspaces(): void {
    try {
      const data = Array.from(this.workspaces.values())
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save workspaces:', error)
    }
  }

  /**
   * Initialize default workspace if none exists
   */
  private initializeDefaultWorkspace(): void {
    if (this.workspaces.size === 0) {
      const defaultWorkspace = this.createWorkspace({
        name: 'Personal Workspace',
        description: 'Default workspace for personal projects',
        color: '#3b82f6',
        icon: '🏠',
        isDefault: true
      })
      this.setCurrentWorkspace(defaultWorkspace.id)
    } else {
      // Set current workspace to the first one or default
      const defaultWorkspace = Array.from(this.workspaces.values()).find(w => w.isDefault)
      this.currentWorkspaceId = defaultWorkspace?.id || Array.from(this.workspaces.keys())[0]
    }
  }

  /**
   * Create new workspace
   */
  createWorkspace(data: Partial<Workspace>): Workspace {
    const id = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const workspace: Workspace = {
      id,
      name: data.name || 'New Workspace',
      description: data.description || '',
      color: data.color || '#6b7280',
      icon: data.icon || '📁',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        defaultLanguage: 'auto',
        defaultModel: 'gemini-2.5-flash',
        autoSave: true,
        enableSpeakerDiarization: false,
        enableTimestamps: true,
        exportFormat: 'json',
        theme: 'auto',
        notifications: true,
        ...data.settings
      },
      projects: [],
      isDefault: data.isDefault || false
    }

    this.workspaces.set(id, workspace)
    this.saveWorkspaces()
    
    console.log(`📁 Created workspace: ${workspace.name}`)
    return workspace
  }

  /**
   * Update workspace
   */
  updateWorkspace(id: string, updates: Partial<Workspace>): Workspace | null {
    const workspace = this.workspaces.get(id)
    if (!workspace) return null

    const updated = {
      ...workspace,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    }

    this.workspaces.set(id, updated)
    this.saveWorkspaces()
    
    console.log(`📁 Updated workspace: ${updated.name}`)
    return updated
  }

  /**
   * Delete workspace
   */
  deleteWorkspace(id: string): boolean {
    const workspace = this.workspaces.get(id)
    if (!workspace) return false

    // Can't delete default workspace if it's the only one
    if (workspace.isDefault && this.workspaces.size === 1) {
      console.warn('Cannot delete the only workspace')
      return false
    }

    this.workspaces.delete(id)
    
    // If deleting current workspace, switch to another
    if (this.currentWorkspaceId === id) {
      const remaining = Array.from(this.workspaces.keys())
      this.currentWorkspaceId = remaining[0] || ''
    }

    this.saveWorkspaces()
    console.log(`📁 Deleted workspace: ${workspace.name}`)
    return true
  }

  /**
   * Create new project
   */
  createProject(workspaceId: string, data: Partial<Project>): Project | null {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) return null

    const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const project: Project = {
      id,
      workspaceId,
      name: data.name || 'New Project',
      description: data.description || '',
      tags: data.tags || [],
      language: data.language || workspace.settings.defaultLanguage,
      model: data.model || workspace.settings.defaultModel,
      settings: {
        enableSpeakerDiarization: workspace.settings.enableSpeakerDiarization,
        enableTimestamps: workspace.settings.enableTimestamps,
        ...data.settings
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
      transcriptionCount: 0,
      totalDuration: 0,
      status: 'active'
    }

    workspace.projects.push(project)
    workspace.updatedAt = new Date()
    
    this.workspaces.set(workspaceId, workspace)
    this.saveWorkspaces()
    
    console.log(`📄 Created project: ${project.name} in ${workspace.name}`)
    return project
  }

  /**
   * Update project
   */
  updateProject(projectId: string, updates: Partial<Project>): Project | null {
    for (const workspace of this.workspaces.values()) {
      const projectIndex = workspace.projects.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        const project = workspace.projects[projectIndex]
        const updated = {
          ...project,
          ...updates,
          id: projectId, // Ensure ID doesn't change
          updatedAt: new Date(),
          lastActivityAt: new Date()
        }

        workspace.projects[projectIndex] = updated
        workspace.updatedAt = new Date()
        
        this.workspaces.set(workspace.id, workspace)
        this.saveWorkspaces()
        
        console.log(`📄 Updated project: ${updated.name}`)
        return updated
      }
    }
    return null
  }

  /**
   * Delete project
   */
  deleteProject(projectId: string): boolean {
    for (const workspace of this.workspaces.values()) {
      const projectIndex = workspace.projects.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        const project = workspace.projects[projectIndex]
        workspace.projects.splice(projectIndex, 1)
        workspace.updatedAt = new Date()
        
        // Clear current project if it's being deleted
        if (this.currentProjectId === projectId) {
          this.currentProjectId = ''
        }
        
        this.workspaces.set(workspace.id, workspace)
        this.saveWorkspaces()
        
        console.log(`📄 Deleted project: ${project.name}`)
        return true
      }
    }
    return false
  }

  /**
   * Get all workspaces
   */
  getWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values())
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(id: string): Workspace | null {
    return this.workspaces.get(id) || null
  }

  /**
   * Get current workspace
   */
  getCurrentWorkspace(): Workspace | null {
    return this.workspaces.get(this.currentWorkspaceId) || null
  }

  /**
   * Set current workspace
   */
  setCurrentWorkspace(id: string): boolean {
    if (this.workspaces.has(id)) {
      this.currentWorkspaceId = id
      console.log(`📁 Switched to workspace: ${this.workspaces.get(id)?.name}`)
      return true
    }
    return false
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | null {
    for (const workspace of this.workspaces.values()) {
      const project = workspace.projects.find(p => p.id === projectId)
      if (project) return project
    }
    return null
  }

  /**
   * Get current project
   */
  getCurrentProject(): Project | null {
    return this.getProject(this.currentProjectId)
  }

  /**
   * Set current project
   */
  setCurrentProject(id: string): boolean {
    const project = this.getProject(id)
    if (project) {
      this.currentProjectId = id
      // Also switch to the project's workspace
      this.setCurrentWorkspace(project.workspaceId)
      console.log(`📄 Switched to project: ${project.name}`)
      return true
    }
    return false
  }

  /**
   * Get projects in workspace
   */
  getProjectsInWorkspace(workspaceId: string): Project[] {
    const workspace = this.workspaces.get(workspaceId)
    return workspace?.projects || []
  }

  /**
   * Search projects
   */
  searchProjects(query: string, filters?: {
    workspaceId?: string
    status?: Project['status']
    language?: string
    tags?: string[]
  }): Project[] {
    let projects: Project[] = []
    
    // Collect projects from specified workspace or all workspaces
    if (filters?.workspaceId) {
      projects = this.getProjectsInWorkspace(filters.workspaceId)
    } else {
      for (const workspace of this.workspaces.values()) {
        projects.push(...workspace.projects)
      }
    }

    // Apply filters
    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status)
    }
    
    if (filters?.language) {
      projects = projects.filter(p => p.language === filters.language)
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      projects = projects.filter(p => 
        filters.tags!.some(tag => p.tags.includes(tag))
      )
    }

    // Apply text search
    if (query.trim()) {
      const queryLower = query.toLowerCase()
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.description?.toLowerCase().includes(queryLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(queryLower))
      )
    }

    return projects.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
  }

  /**
   * Update project activity
   */
  updateProjectActivity(projectId: string, transcriptionCount?: number, duration?: number): void {
    const project = this.getProject(projectId)
    if (project) {
      this.updateProject(projectId, {
        lastActivityAt: new Date(),
        transcriptionCount: transcriptionCount !== undefined ? 
          project.transcriptionCount + transcriptionCount : project.transcriptionCount,
        totalDuration: duration !== undefined ? 
          project.totalDuration + duration : project.totalDuration
      })
    }
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats(workspaceId: string): {
    projectCount: number
    activeProjects: number
    archivedProjects: number
    totalTranscriptions: number
    totalDuration: number
    recentActivity: Date | null
  } {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      return {
        projectCount: 0,
        activeProjects: 0,
        archivedProjects: 0,
        totalTranscriptions: 0,
        totalDuration: 0,
        recentActivity: null
      }
    }

    const activeProjects = workspace.projects.filter(p => p.status === 'active').length
    const archivedProjects = workspace.projects.filter(p => p.status === 'archived').length
    const totalTranscriptions = workspace.projects.reduce((sum, p) => sum + p.transcriptionCount, 0)
    const totalDuration = workspace.projects.reduce((sum, p) => sum + p.totalDuration, 0)
    const recentActivity = workspace.projects.length > 0 ? 
      new Date(Math.max(...workspace.projects.map(p => p.lastActivityAt.getTime()))) : null

    return {
      projectCount: workspace.projects.length,
      activeProjects,
      archivedProjects,
      totalTranscriptions,
      totalDuration,
      recentActivity
    }
  }

  /**
   * Export workspace data
   */
  exportWorkspace(workspaceId: string): any {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) return null

    return {
      workspace,
      exportedAt: new Date(),
      version: '1.0'
    }
  }

  /**
   * Import workspace data
   */
  importWorkspace(data: any): Workspace | null {
    try {
      const workspace = data.workspace
      if (!workspace) return null

      // Generate new IDs to avoid conflicts
      const newId = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      workspace.id = newId
      workspace.isDefault = false
      workspace.updatedAt = new Date()

      // Update project IDs
      workspace.projects.forEach((project: Project) => {
        project.id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        project.workspaceId = newId
      })

      this.workspaces.set(newId, workspace)
      this.saveWorkspaces()

      console.log(`📁 Imported workspace: ${workspace.name}`)
      return workspace
    } catch (error) {
      console.error('Failed to import workspace:', error)
      return null
    }
  }

  /**
   * Get current context (workspace + project)
   */
  getCurrentContext(): {
    workspace: Workspace | null
    project: Project | null
  } {
    return {
      workspace: this.getCurrentWorkspace(),
      project: this.getCurrentProject()
    }
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService()