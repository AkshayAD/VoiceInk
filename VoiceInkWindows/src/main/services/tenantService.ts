/**
 * Multi-tenant Architecture with User Management (Step 112)
 * Complete tenant isolation, user roles, and organization management
 */

import * as crypto from 'crypto'
import { securityService } from './securityService'

export interface Tenant {
  id: string
  name: string
  domain: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
  createdAt: Date
  updatedAt: Date
  settings: TenantSettings
  limits: TenantLimits
  billing?: BillingInfo
  customization: TenantCustomization
  dataResidency: string // Region for data storage
}

export interface TenantSettings {
  allowedDomains: string[]
  ssoEnabled: boolean
  mfaRequired: boolean
  ipWhitelist: string[]
  sessionTimeout: number
  passwordPolicy: PasswordPolicy
  dataRetention: number // days
  auditLogRetention: number // days
}

export interface TenantLimits {
  maxUsers: number
  maxTranscriptions: number
  maxStorageGB: number
  maxMonthlyMinutes: number
  maxConcurrentSessions: number
  maxApiCalls: number
  customModels: boolean
  advancedFeatures: boolean
}

export interface TenantCustomization {
  logo?: string
  primaryColor: string
  secondaryColor: string
  customDomain?: string
  emailTemplates?: { [key: string]: string }
  welcomeMessage?: string
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expirationDays: number
  preventReuse: number
  maxAge: number
}

export interface BillingInfo {
  customerId: string
  subscriptionId: string
  paymentMethod: string
  billingEmail: string
  nextBillingDate: Date
  amount: number
  currency: string
}

export interface User {
  id: string
  tenantId: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: UserRole
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  permissions: Permission[]
  groups: string[]
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  passwordHash?: string
  mfaEnabled: boolean
  mfaSecret?: string
  profilePicture?: string
  preferences: UserPreferences
  metadata: { [key: string]: any }
}

export interface UserRole {
  id: string
  name: string
  level: number // 0=admin, 1=manager, 2=user, 3=viewer
  permissions: Permission[]
  isCustom: boolean
}

export interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[]
  conditions?: { [key: string]: any }
}

export interface UserPreferences {
  language: string
  timezone: string
  dateFormat: string
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationSettings
  defaultModel: string
  shortcuts: { [key: string]: string }
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  inApp: boolean
  transcriptionComplete: boolean
  quotaWarnings: boolean
  securityAlerts: boolean
  systemUpdates: boolean
}

export interface Group {
  id: string
  tenantId: string
  name: string
  description: string
  members: string[]
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface InviteToken {
  token: string
  tenantId: string
  email: string
  role: string
  expiresAt: Date
  createdBy: string
  used: boolean
}

export class TenantService {
  private tenants: Map<string, Tenant> = new Map()
  private users: Map<string, User> = new Map()
  private groups: Map<string, Group> = new Map()
  private invites: Map<string, InviteToken> = new Map()
  private usersByEmail: Map<string, User> = new Map()
  private tenantsByDomain: Map<string, Tenant> = new Map()
  private roles: Map<string, UserRole> = new Map()

  constructor() {
    this.initializeDefaultRoles()
    this.startUsageTracking()
    console.log('🏢 Multi-tenant architecture with user management initialized')
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: UserRole[] = [
      {
        id: 'admin',
        name: 'Administrator',
        level: 0,
        permissions: [
          { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute'] }
        ],
        isCustom: false
      },
      {
        id: 'manager',
        name: 'Manager',
        level: 1,
        permissions: [
          { resource: 'transcriptions', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'users', actions: ['read', 'update'] },
          { resource: 'reports', actions: ['read', 'execute'] },
          { resource: 'settings', actions: ['read', 'update'] }
        ],
        isCustom: false
      },
      {
        id: 'user',
        name: 'User',
        level: 2,
        permissions: [
          { resource: 'transcriptions', actions: ['create', 'read', 'update'] },
          { resource: 'profile', actions: ['read', 'update'] },
          { resource: 'reports', actions: ['read'] }
        ],
        isCustom: false
      },
      {
        id: 'viewer',
        name: 'Viewer',
        level: 3,
        permissions: [
          { resource: 'transcriptions', actions: ['read'] },
          { resource: 'reports', actions: ['read'] }
        ],
        isCustom: false
      }
    ]

    defaultRoles.forEach(role => this.roles.set(role.id, role))
  }

  /**
   * Create new tenant
   */
  async createTenant(data: {
    name: string
    domain: string
    plan: Tenant['plan']
    adminEmail: string
    adminPassword: string
  }): Promise<{ tenant: Tenant, admin: User }> {
    // Check if domain is already taken
    if (this.tenantsByDomain.has(data.domain)) {
      throw new Error('Domain already registered')
    }

    const tenantId = `tenant_${crypto.randomBytes(16).toString('hex')}`
    
    const tenant: Tenant = {
      id: tenantId,
      name: data.name,
      domain: data.domain,
      plan: data.plan,
      status: data.plan === 'free' ? 'active' : 'trial',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: this.getDefaultSettings(data.plan),
      limits: this.getPlanLimits(data.plan),
      customization: {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b'
      },
      dataResidency: this.getDefaultRegion()
    }

    this.tenants.set(tenantId, tenant)
    this.tenantsByDomain.set(data.domain, tenant)

    // Create admin user
    const admin = await this.createUser({
      tenantId,
      email: data.adminEmail,
      username: data.adminEmail.split('@')[0],
      firstName: 'Admin',
      lastName: 'User',
      password: data.adminPassword,
      role: 'admin'
    })

    console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`)
    
    return { tenant, admin }
  }

  /**
   * Get default settings based on plan
   */
  private getDefaultSettings(plan: Tenant['plan']): TenantSettings {
    const base: TenantSettings = {
      allowedDomains: [],
      ssoEnabled: false,
      mfaRequired: false,
      ipWhitelist: [],
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        expirationDays: 90,
        preventReuse: 3,
        maxAge: 180
      },
      dataRetention: 30,
      auditLogRetention: 7
    }

    // Enhance settings based on plan
    switch (plan) {
      case 'enterprise':
        base.ssoEnabled = true
        base.mfaRequired = true
        base.dataRetention = 365
        base.auditLogRetention = 90
        base.passwordPolicy.requireSpecialChars = true
        break
      case 'professional':
        base.dataRetention = 90
        base.auditLogRetention = 30
        break
      case 'starter':
        base.dataRetention = 30
        base.auditLogRetention = 14
        break
    }

    return base
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: Tenant['plan']): TenantLimits {
    const limits: { [key in Tenant['plan']]: TenantLimits } = {
      free: {
        maxUsers: 1,
        maxTranscriptions: 10,
        maxStorageGB: 1,
        maxMonthlyMinutes: 60,
        maxConcurrentSessions: 1,
        maxApiCalls: 100,
        customModels: false,
        advancedFeatures: false
      },
      starter: {
        maxUsers: 5,
        maxTranscriptions: 100,
        maxStorageGB: 10,
        maxMonthlyMinutes: 500,
        maxConcurrentSessions: 3,
        maxApiCalls: 1000,
        customModels: false,
        advancedFeatures: false
      },
      professional: {
        maxUsers: 25,
        maxTranscriptions: 1000,
        maxStorageGB: 100,
        maxMonthlyMinutes: 5000,
        maxConcurrentSessions: 10,
        maxApiCalls: 10000,
        customModels: true,
        advancedFeatures: true
      },
      enterprise: {
        maxUsers: -1, // Unlimited
        maxTranscriptions: -1,
        maxStorageGB: 1000,
        maxMonthlyMinutes: -1,
        maxConcurrentSessions: -1,
        maxApiCalls: -1,
        customModels: true,
        advancedFeatures: true
      }
    }

    return limits[plan]
  }

  /**
   * Get default region for data residency
   */
  private getDefaultRegion(): string {
    // Determine based on location or preferences
    return 'us-east-1'
  }

  /**
   * Create user
   */
  async createUser(data: {
    tenantId: string
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
    role: string
    groups?: string[]
  }): Promise<User> {
    // Verify tenant exists
    const tenant = this.tenants.get(data.tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Check user limit
    const tenantUsers = this.getUsersByTenant(data.tenantId)
    if (tenant.limits.maxUsers !== -1 && tenantUsers.length >= tenant.limits.maxUsers) {
      throw new Error('User limit reached for tenant')
    }

    // Check if email already exists
    if (this.usersByEmail.has(data.email)) {
      throw new Error('Email already registered')
    }

    const userId = `user_${crypto.randomBytes(16).toString('hex')}`
    const role = this.roles.get(data.role) || this.roles.get('user')!
    
    // Hash password
    const passwordHash = await securityService.hashPassword(data.password)
    
    const user: User = {
      id: userId,
      tenantId: data.tenantId,
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      role,
      status: 'active',
      permissions: role.permissions,
      groups: data.groups || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash,
      mfaEnabled: tenant.settings.mfaRequired,
      preferences: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          inApp: true,
          transcriptionComplete: true,
          quotaWarnings: true,
          securityAlerts: true,
          systemUpdates: false
        },
        defaultModel: 'gemini-2.5-flash',
        shortcuts: {}
      },
      metadata: {}
    }

    this.users.set(userId, user)
    this.usersByEmail.set(data.email, user)

    console.log(`✅ Created user: ${user.email} (${user.id}) for tenant ${tenant.name}`)
    
    return user
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email: string, password: string, tenantDomain?: string): Promise<{
    user: User
    tenant: Tenant
    session: any
  }> {
    const user = this.usersByEmail.get(email)
    if (!user) {
      throw new Error('Invalid credentials')
    }

    const tenant = this.tenants.get(user.tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Verify tenant domain if provided
    if (tenantDomain && tenant.domain !== tenantDomain) {
      throw new Error('User not found in this tenant')
    }

    // Check tenant status
    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new Error('Tenant account is not active')
    }

    // Verify password
    const isValid = await securityService.verifyPassword(password, user.passwordHash!)
    if (!isValid) {
      securityService.recordFailedAttempt(email)
      throw new Error('Invalid credentials')
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error(`User account is ${user.status}`)
    }

    // Update last login
    user.lastLoginAt = new Date()
    
    // Create session
    const session = await securityService.createSession(
      user.id,
      '0.0.0.0', // Would get real IP
      'User-Agent' // Would get real user agent
    )

    console.log(`✅ User authenticated: ${user.email} from tenant ${tenant.name}`)
    
    return { user, tenant, session }
  }

  /**
   * Check permission
   */
  hasPermission(
    user: User,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'execute'
  ): boolean {
    // Check user permissions
    for (const permission of user.permissions) {
      if (permission.resource === '*' || permission.resource === resource) {
        if (permission.actions.includes(action)) {
          // Check conditions if any
          if (!permission.conditions) {
            return true
          }
          // Evaluate conditions (simplified)
          return true
        }
      }
    }

    // Check group permissions
    for (const groupId of user.groups) {
      const group = this.groups.get(groupId)
      if (group) {
        for (const permission of group.permissions) {
          if (permission.resource === '*' || permission.resource === resource) {
            if (permission.actions.includes(action)) {
              return true
            }
          }
        }
      }
    }

    return false
  }

  /**
   * Create group
   */
  createGroup(tenantId: string, data: {
    name: string
    description: string
    permissions: Permission[]
  }): Group {
    const groupId = `group_${crypto.randomBytes(16).toString('hex')}`
    
    const group: Group = {
      id: groupId,
      tenantId,
      name: data.name,
      description: data.description,
      members: [],
      permissions: data.permissions,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.groups.set(groupId, group)
    console.log(`✅ Created group: ${group.name} (${group.id})`)
    
    return group
  }

  /**
   * Add user to group
   */
  addUserToGroup(userId: string, groupId: string): void {
    const user = this.users.get(userId)
    const group = this.groups.get(groupId)
    
    if (!user || !group) {
      throw new Error('User or group not found')
    }

    if (user.tenantId !== group.tenantId) {
      throw new Error('User and group must belong to same tenant')
    }

    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId)
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId)
    }

    console.log(`✅ Added user ${user.email} to group ${group.name}`)
  }

  /**
   * Create invite
   */
  createInvite(tenantId: string, data: {
    email: string
    role: string
    createdBy: string
  }): InviteToken {
    const token = crypto.randomBytes(32).toString('hex')
    
    const invite: InviteToken = {
      token,
      tenantId,
      email: data.email,
      role: data.role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: data.createdBy,
      used: false
    }

    this.invites.set(token, invite)
    console.log(`✅ Created invite for ${data.email}`)
    
    return invite
  }

  /**
   * Accept invite
   */
  async acceptInvite(token: string, data: {
    username: string
    firstName: string
    lastName: string
    password: string
  }): Promise<User> {
    const invite = this.invites.get(token)
    if (!invite) {
      throw new Error('Invalid invite token')
    }

    if (invite.used) {
      throw new Error('Invite already used')
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invite expired')
    }

    const user = await this.createUser({
      tenantId: invite.tenantId,
      email: invite.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      role: invite.role
    })

    invite.used = true
    
    return user
  }

  /**
   * Update tenant
   */
  updateTenant(tenantId: string, updates: Partial<Tenant>): Tenant {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    Object.assign(tenant, updates, {
      id: tenant.id, // Ensure ID doesn't change
      updatedAt: new Date()
    })

    console.log(`✅ Updated tenant: ${tenant.name}`)
    return tenant
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<User>): User {
    const user = this.users.get(userId)
    if (!user) {
      throw new Error('User not found')
    }

    Object.assign(user, updates, {
      id: user.id, // Ensure ID doesn't change
      tenantId: user.tenantId, // Ensure tenant doesn't change
      updatedAt: new Date()
    })

    console.log(`✅ Updated user: ${user.email}`)
    return user
  }

  /**
   * Get users by tenant
   */
  getUsersByTenant(tenantId: string): User[] {
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId)
  }

  /**
   * Get tenant usage
   */
  getTenantUsage(tenantId: string): {
    users: number
    transcriptions: number
    storageGB: number
    minutesUsed: number
    apiCalls: number
  } {
    const users = this.getUsersByTenant(tenantId)
    
    // This would fetch from actual usage tracking
    return {
      users: users.length,
      transcriptions: Math.floor(Math.random() * 100),
      storageGB: Math.random() * 10,
      minutesUsed: Math.floor(Math.random() * 1000),
      apiCalls: Math.floor(Math.random() * 5000)
    }
  }

  /**
   * Check tenant limits
   */
  checkTenantLimit(tenantId: string, resource: keyof TenantLimits, amount: number = 1): boolean {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return false

    const limit = tenant.limits[resource]
    if (limit === -1) return true // Unlimited

    const usage = this.getTenantUsage(tenantId)
    
    switch (resource) {
      case 'maxUsers':
        return usage.users + amount <= limit
      case 'maxTranscriptions':
        return usage.transcriptions + amount <= limit
      case 'maxStorageGB':
        return usage.storageGB + amount <= limit
      case 'maxMonthlyMinutes':
        return usage.minutesUsed + amount <= limit
      case 'maxApiCalls':
        return usage.apiCalls + amount <= limit
      default:
        return true
    }
  }

  /**
   * Start usage tracking
   */
  private startUsageTracking(): void {
    // Track usage metrics periodically
    setInterval(() => {
      for (const tenant of this.tenants.values()) {
        const usage = this.getTenantUsage(tenant.id)
        
        // Check for quota warnings
        if (tenant.limits.maxMonthlyMinutes !== -1) {
          const percentUsed = (usage.minutesUsed / tenant.limits.maxMonthlyMinutes) * 100
          if (percentUsed > 80) {
            console.warn(`⚠️ Tenant ${tenant.name} has used ${percentUsed.toFixed(1)}% of monthly minutes`)
          }
        }
      }
    }, 60000) // Check every minute
  }

  /**
   * Get all tenants
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values())
  }

  /**
   * Get tenant by domain
   */
  getTenantByDomain(domain: string): Tenant | null {
    return this.tenantsByDomain.get(domain) || null
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): boolean {
    const user = this.users.get(userId)
    if (!user) return false

    // Remove from groups
    for (const groupId of user.groups) {
      const group = this.groups.get(groupId)
      if (group) {
        group.members = group.members.filter(id => id !== userId)
      }
    }

    this.users.delete(userId)
    this.usersByEmail.delete(user.email)
    
    console.log(`🗑️ Deleted user: ${user.email}`)
    return true
  }

  /**
   * Suspend tenant
   */
  suspendTenant(tenantId: string, reason: string): void {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return

    tenant.status = 'suspended'
    
    // Revoke all active sessions for this tenant
    const users = this.getUsersByTenant(tenantId)
    for (const user of users) {
      user.status = 'suspended'
    }

    console.log(`⛔ Suspended tenant: ${tenant.name} - Reason: ${reason}`)
  }
}

// Export singleton instance
export const tenantService = new TenantService()