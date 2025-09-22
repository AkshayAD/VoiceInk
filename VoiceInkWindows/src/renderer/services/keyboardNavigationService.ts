/**
 * Advanced Keyboard Navigation Service
 * Provides system-wide keyboard navigation, shortcuts, and accessibility
 */

export interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  action: () => void
  category: string
  context?: string
  enabled: boolean
}

export interface NavigationContext {
  id: string
  name: string
  shortcuts: KeyboardShortcut[]
  active: boolean
}

export class KeyboardNavigationService {
  private contexts: Map<string, NavigationContext> = new Map()
  private activeContext: string = 'global'
  private listeners: Map<string, (event: KeyboardEvent) => void> = new Map()
  private navigationHistory: string[] = []
  private focusableElements: NodeListOf<Element> | null = null
  private currentFocusIndex: number = 0

  constructor() {
    this.initializeGlobalShortcuts()
    this.setupEventListeners()
    this.updateFocusableElements()
  }

  /**
   * Initialize global keyboard shortcuts
   */
  private initializeGlobalShortcuts() {
    const globalShortcuts: KeyboardShortcut[] = [
      {
        id: 'navigate-next',
        keys: ['Tab'],
        description: 'Navigate to next element',
        action: () => this.navigateNext(),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'navigate-prev',
        keys: ['Shift', 'Tab'],
        description: 'Navigate to previous element',
        action: () => this.navigatePrevious(),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'activate-element',
        keys: ['Enter'],
        description: 'Activate focused element',
        action: () => this.activateElement(),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'escape-context',
        keys: ['Escape'],
        description: 'Escape current context',
        action: () => this.escapeContext(),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'toggle-recorder',
        keys: ['Ctrl', 'r'],
        description: 'Toggle recording',
        action: () => this.triggerRecordingToggle(),
        category: 'Recording',
        enabled: true
      },
      {
        id: 'quick-search',
        keys: ['Ctrl', 'k'],
        description: 'Open quick search',
        action: () => this.openQuickSearch(),
        category: 'Search',
        enabled: true
      },
      {
        id: 'focus-search',
        keys: ['Ctrl', 'f'],
        description: 'Focus search bar',
        action: () => this.focusSearchBar(),
        category: 'Search',
        enabled: true
      },
      {
        id: 'navigate-home',
        keys: ['Alt', 'h'],
        description: 'Navigate to home',
        action: () => this.navigateToPage('dashboard'),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'navigate-recorder',
        keys: ['Alt', 'r'],
        description: 'Navigate to recorder',
        action: () => this.navigateToPage('recorder'),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'navigate-history',
        keys: ['Alt', 'y'],
        description: 'Navigate to history',
        action: () => this.navigateToPage('history'),
        category: 'Navigation',
        enabled: true
      },
      {
        id: 'navigate-settings',
        keys: ['Alt', 's'],
        description: 'Navigate to settings',
        action: () => this.navigateToPage('settings'),
        category: 'Navigation',
        enabled: true
      }
    ]

    this.addContext({
      id: 'global',
      name: 'Global Navigation',
      shortcuts: globalShortcuts,
      active: true
    })
  }

  /**
   * Setup keyboard event listeners
   */
  private setupEventListeners() {
    const keydownHandler = (event: KeyboardEvent) => {
      this.handleKeydown(event)
    }

    document.addEventListener('keydown', keydownHandler, { capture: true })
    
    // Track focus changes for accessibility
    document.addEventListener('focusin', (event) => {
      this.updateFocusIndex(event.target as Element)
    })

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements()
    })

    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled']
    })
  }

  /**
   * Handle keydown events
   */
  private handleKeydown(event: KeyboardEvent) {
    const activeContext = this.contexts.get(this.activeContext)
    if (!activeContext) return

    // Build pressed keys array
    const pressedKeys: string[] = []
    if (event.ctrlKey) pressedKeys.push('Ctrl')
    if (event.shiftKey) pressedKeys.push('Shift')
    if (event.altKey) pressedKeys.push('Alt')
    if (event.metaKey) pressedKeys.push('Meta')
    
    // Add the main key
    if (event.key !== 'Control' && event.key !== 'Shift' && event.key !== 'Alt' && event.key !== 'Meta') {
      pressedKeys.push(event.key)
    }

    // Find matching shortcut
    const matchingShortcut = activeContext.shortcuts.find(shortcut => 
      shortcut.enabled && this.arraysEqual(shortcut.keys, pressedKeys)
    )

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      console.log(`🎹 Keyboard shortcut triggered: ${matchingShortcut.id}`)
      matchingShortcut.action()
    }
  }

  /**
   * Compare two arrays for equality
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
  }

  /**
   * Add navigation context
   */
  addContext(context: NavigationContext): void {
    this.contexts.set(context.id, context)
    console.log(`🎹 Added navigation context: ${context.id}`)
  }

  /**
   * Switch to navigation context
   */
  switchContext(contextId: string): void {
    const context = this.contexts.get(contextId)
    if (context) {
      this.navigationHistory.push(this.activeContext)
      this.activeContext = contextId
      console.log(`🎹 Switched to context: ${contextId}`)
    }
  }

  /**
   * Escape current context
   */
  private escapeContext(): void {
    if (this.navigationHistory.length > 0) {
      this.activeContext = this.navigationHistory.pop() || 'global'
      console.log(`🎹 Escaped to context: ${this.activeContext}`)
    }
  }

  /**
   * Update focusable elements
   */
  private updateFocusableElements(): void {
    this.focusableElements = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )
  }

  /**
   * Navigate to next focusable element
   */
  private navigateNext(): void {
    if (!this.focusableElements || this.focusableElements.length === 0) return
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length
    const nextElement = this.focusableElements[this.currentFocusIndex] as HTMLElement
    nextElement.focus()
    this.announceNavigation(nextElement)
  }

  /**
   * Navigate to previous focusable element
   */
  private navigatePrevious(): void {
    if (!this.focusableElements || this.focusableElements.length === 0) return
    
    this.currentFocusIndex = this.currentFocusIndex - 1
    if (this.currentFocusIndex < 0) {
      this.currentFocusIndex = this.focusableElements.length - 1
    }
    
    const prevElement = this.focusableElements[this.currentFocusIndex] as HTMLElement
    prevElement.focus()
    this.announceNavigation(prevElement)
  }

  /**
   * Update focus index based on focused element
   */
  private updateFocusIndex(element: Element): void {
    if (!this.focusableElements) return
    
    for (let i = 0; i < this.focusableElements.length; i++) {
      if (this.focusableElements[i] === element) {
        this.currentFocusIndex = i
        break
      }
    }
  }

  /**
   * Activate focused element
   */
  private activateElement(): void {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
      if (activeElement.click) {
        activeElement.click()
      } else if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        // Focus input elements
        activeElement.focus()
      }
    }
  }

  /**
   * Announce navigation for screen readers
   */
  private announceNavigation(element: HTMLElement): void {
    // Get element description for screen readers
    const description = this.getElementDescription(element)
    
    // Create or update live region
    let liveRegion = document.getElementById('keyboard-navigation-announcer')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'keyboard-navigation-announcer'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }
    
    liveRegion.textContent = `Focused: ${description}`
  }

  /**
   * Get element description for accessibility
   */
  private getElementDescription(element: HTMLElement): string {
    // Try aria-label first
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label')!
    }
    
    // Try text content
    if (element.textContent && element.textContent.trim()) {
      return element.textContent.trim()
    }
    
    // Try placeholder for inputs
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const placeholder = element.getAttribute('placeholder')
      if (placeholder) return `Input: ${placeholder}`
    }
    
    // Try title attribute
    if (element.getAttribute('title')) {
      return element.getAttribute('title')!
    }
    
    // Fallback to tag name
    return element.tagName.toLowerCase()
  }

  /**
   * Trigger recording toggle
   */
  private triggerRecordingToggle(): void {
    // Emit custom event that recorder can listen to
    window.dispatchEvent(new CustomEvent('keyboard-toggle-recording'))
  }

  /**
   * Open quick search
   */
  private openQuickSearch(): void {
    window.dispatchEvent(new CustomEvent('keyboard-open-search'))
  }

  /**
   * Focus search bar
   */
  private focusSearchBar(): void {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  /**
   * Navigate to specific page
   */
  private navigateToPage(page: string): void {
    window.dispatchEvent(new CustomEvent('keyboard-navigate', { 
      detail: { page }
    }))
  }

  /**
   * Get all available shortcuts
   */
  getAvailableShortcuts(): { [category: string]: KeyboardShortcut[] } {
    const activeContext = this.contexts.get(this.activeContext)
    if (!activeContext) return {}

    const grouped: { [category: string]: KeyboardShortcut[] } = {}
    
    activeContext.shortcuts.forEach(shortcut => {
      if (!grouped[shortcut.category]) {
        grouped[shortcut.category] = []
      }
      grouped[shortcut.category].push(shortcut)
    })

    return grouped
  }

  /**
   * Enable/disable shortcut
   */
  toggleShortcut(shortcutId: string, enabled: boolean): void {
    const activeContext = this.contexts.get(this.activeContext)
    if (!activeContext) return

    const shortcut = activeContext.shortcuts.find(s => s.id === shortcutId)
    if (shortcut) {
      shortcut.enabled = enabled
      console.log(`🎹 Shortcut ${shortcutId} ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  /**
   * Add custom shortcut
   */
  addShortcut(contextId: string, shortcut: KeyboardShortcut): void {
    const context = this.contexts.get(contextId)
    if (context) {
      context.shortcuts.push(shortcut)
      console.log(`🎹 Added shortcut: ${shortcut.id} to context ${contextId}`)
    }
  }

  /**
   * Remove shortcut
   */
  removeShortcut(contextId: string, shortcutId: string): void {
    const context = this.contexts.get(contextId)
    if (context) {
      context.shortcuts = context.shortcuts.filter(s => s.id !== shortcutId)
      console.log(`🎹 Removed shortcut: ${shortcutId} from context ${contextId}`)
    }
  }

  /**
   * Get current context info
   */
  getCurrentContext(): NavigationContext | undefined {
    return this.contexts.get(this.activeContext)
  }

  /**
   * Focus specific element by selector
   */
  focusElement(selector: string): boolean {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
      return true
    }
    return false
  }

  /**
   * Show keyboard help
   */
  showKeyboardHelp(): void {
    window.dispatchEvent(new CustomEvent('show-keyboard-help', {
      detail: { shortcuts: this.getAvailableShortcuts() }
    }))
  }
}

// Export singleton instance
export const keyboardNavigation = new KeyboardNavigationService()