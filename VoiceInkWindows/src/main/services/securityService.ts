/**
 * Advanced Security and Encryption Layer (Step 111)
 * Comprehensive security implementation with AES-256, RSA, key management, and secure storage
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface SecurityConfig {
  encryptionAlgorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305'
  keyDerivationFunction: 'pbkdf2' | 'scrypt' | 'argon2'
  keyLength: 128 | 192 | 256
  iterations: number
  saltLength: number
  ivLength: number
  tagLength: number
  rsaKeySize: 2048 | 4096
  sessionTimeout: number // minutes
  maxFailedAttempts: number
  enableHardwareKey: boolean
  enableBiometric: boolean
  enableMFA: boolean
}

export interface EncryptedData {
  algorithm: string
  iv: string
  authTag?: string
  salt: string
  data: string
  timestamp: number
  keyId: string
}

export interface SecureSession {
  id: string
  userId: string
  token: string
  publicKey: string
  privateKey?: string // Only stored in memory, never persisted
  expiresAt: Date
  permissions: string[]
  ipAddress: string
  userAgent: string
}

export interface SecurityAuditLog {
  id: string
  timestamp: Date
  action: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  result: 'success' | 'failure'
  details: any
  threat?: 'low' | 'medium' | 'high' | 'critical'
}

export interface KeyPair {
  publicKey: string
  privateKey: string
  fingerprint: string
  createdAt: Date
  expiresAt?: Date
}

export class SecurityService {
  private config: SecurityConfig
  private masterKey: Buffer | null = null
  private sessions: Map<string, SecureSession> = new Map()
  private failedAttempts: Map<string, number> = new Map()
  private auditLogs: SecurityAuditLog[] = []
  private keyStore: Map<string, KeyPair> = new Map()
  private blacklistedTokens: Set<string> = new Set()

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationFunction: 'pbkdf2',
      keyLength: 256,
      iterations: 100000,
      saltLength: 32,
      ivLength: 16,
      tagLength: 16,
      rsaKeySize: 2048,
      sessionTimeout: 30,
      maxFailedAttempts: 5,
      enableHardwareKey: false,
      enableBiometric: false,
      enableMFA: false,
      ...config
    }

    this.initializeSecurity()
  }

  /**
   * Initialize security system
   */
  private async initializeSecurity(): Promise<void> {
    try {
      // Generate or load master key
      await this.initializeMasterKey()
      
      // Set up secure storage
      await this.setupSecureStorage()
      
      // Initialize threat detection
      this.startThreatDetection()
      
      // Clean up expired sessions periodically
      setInterval(() => this.cleanupExpiredSessions(), 60000)
      
      console.log('🔐 Advanced security and encryption layer initialized')
      this.logAudit('system', 'security_initialized', 'success')
      
    } catch (error) {
      console.error('Failed to initialize security:', error)
      this.logAudit('system', 'security_initialization_failed', 'failure', { error })
    }
  }

  /**
   * Initialize or load master key
   */
  private async initializeMasterKey(): Promise<void> {
    const keyPath = path.join(app.getPath('userData'), '.key')
    
    try {
      if (fs.existsSync(keyPath)) {
        // Load existing key (in production, this would be from secure hardware/TPM)
        const encryptedKey = await fs.promises.readFile(keyPath)
        this.masterKey = await this.decryptMasterKey(encryptedKey)
      } else {
        // Generate new master key
        this.masterKey = crypto.randomBytes(32)
        const encryptedKey = await this.encryptMasterKey(this.masterKey)
        await fs.promises.writeFile(keyPath, encryptedKey, { mode: 0o600 })
      }
    } catch (error) {
      // Fallback to memory-only key
      this.masterKey = crypto.randomBytes(32)
      console.warn('Using temporary master key (not persisted)')
    }
  }

  /**
   * Encrypt master key for storage (simplified - would use HSM/TPM in production)
   */
  private async encryptMasterKey(key: Buffer): Promise<Buffer> {
    const machineId = this.getMachineId()
    const derivedKey = crypto.pbkdf2Sync(machineId, 'voiceink-salt', 100000, 32, 'sha256')
    
    const iv = crypto.randomBytes(this.config.ivLength)
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(key),
      cipher.final(),
      cipher.getAuthTag()
    ])
    
    return Buffer.concat([iv, encrypted])
  }

  /**
   * Decrypt master key from storage
   */
  private async decryptMasterKey(encryptedData: Buffer): Promise<Buffer> {
    const machineId = this.getMachineId()
    const derivedKey = crypto.pbkdf2Sync(machineId, 'voiceink-salt', 100000, 32, 'sha256')
    
    const iv = encryptedData.slice(0, this.config.ivLength)
    const authTag = encryptedData.slice(-this.config.tagLength)
    const encrypted = encryptedData.slice(this.config.ivLength, -this.config.tagLength)
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv)
    decipher.setAuthTag(authTag)
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
  }

  /**
   * Get machine-specific ID for key derivation
   */
  private getMachineId(): string {
    // In production, this would use hardware identifiers
    const hostname = require('os').hostname()
    const platform = process.platform
    const arch = process.arch
    return `${hostname}-${platform}-${arch}`
  }

  /**
   * Setup secure storage
   */
  private async setupSecureStorage(): Promise<void> {
    const storagePath = path.join(app.getPath('userData'), 'secure')
    
    if (!fs.existsSync(storagePath)) {
      await fs.promises.mkdir(storagePath, { recursive: true, mode: 0o700 })
    }
    
    // Set up encrypted database for sensitive data
    // In production, this would use SQLCipher or similar
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encrypt(data: string | Buffer, keyId?: string): Promise<EncryptedData> {
    if (!this.masterKey) {
      throw new Error('Security system not initialized')
    }

    const salt = crypto.randomBytes(this.config.saltLength)
    const iv = crypto.randomBytes(this.config.ivLength)
    
    // Derive encryption key from master key
    const key = await this.deriveKey(this.masterKey, salt)
    
    const cipher = crypto.createCipheriv(this.config.encryptionAlgorithm, key, iv)
    
    const inputData = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
    const encrypted = Buffer.concat([
      cipher.update(inputData),
      cipher.final()
    ])
    
    let authTag: Buffer | undefined
    if (this.config.encryptionAlgorithm.includes('gcm')) {
      authTag = (cipher as any).getAuthTag()
    }

    const result: EncryptedData = {
      algorithm: this.config.encryptionAlgorithm,
      iv: iv.toString('base64'),
      authTag: authTag?.toString('base64'),
      salt: salt.toString('base64'),
      data: encrypted.toString('base64'),
      timestamp: Date.now(),
      keyId: keyId || 'master'
    }

    this.logAudit('system', 'data_encrypted', 'success', { keyId, size: inputData.length })
    
    return result
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Security system not initialized')
    }

    try {
      const salt = Buffer.from(encryptedData.salt, 'base64')
      const iv = Buffer.from(encryptedData.iv, 'base64')
      const encrypted = Buffer.from(encryptedData.data, 'base64')
      
      // Derive decryption key
      const key = await this.deriveKey(this.masterKey, salt)
      
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv)
      
      if (encryptedData.authTag && encryptedData.algorithm.includes('gcm')) {
        (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'base64'))
      }
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])
      
      this.logAudit('system', 'data_decrypted', 'success', { keyId: encryptedData.keyId })
      
      return decrypted.toString('utf8')
      
    } catch (error) {
      this.logAudit('system', 'data_decryption_failed', 'failure', { error }, 'high')
      throw new Error('Decryption failed - data may be corrupted or tampered')
    }
  }

  /**
   * Derive key using PBKDF2
   */
  private async deriveKey(masterKey: Buffer, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(masterKey, salt, this.config.iterations, this.config.keyLength / 8, 'sha256', (err, key) => {
        if (err) reject(err)
        else resolve(key)
      })
    })
  }

  /**
   * Generate RSA key pair
   */
  async generateKeyPair(userId: string): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: this.config.rsaKeySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: this.masterKey!.toString('hex')
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(err)
          return
        }

        const fingerprint = crypto
          .createHash('sha256')
          .update(publicKey)
          .digest('hex')

        const keyPair: KeyPair = {
          publicKey,
          privateKey,
          fingerprint,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }

        this.keyStore.set(userId, keyPair)
        this.logAudit(userId, 'keypair_generated', 'success', { fingerprint })
        
        resolve(keyPair)
      })
    })
  }

  /**
   * Sign data with private key
   */
  async signData(data: string | Buffer, userId: string): Promise<string> {
    const keyPair = this.keyStore.get(userId)
    if (!keyPair) {
      throw new Error('Key pair not found for user')
    }

    const sign = crypto.createSign('RSA-SHA256')
    sign.update(data)
    sign.end()
    
    const signature = sign.sign({
      key: keyPair.privateKey,
      passphrase: this.masterKey!.toString('hex')
    })
    
    return signature.toString('base64')
  }

  /**
   * Verify signature with public key
   */
  async verifySignature(data: string | Buffer, signature: string, publicKey: string): Promise<boolean> {
    try {
      const verify = crypto.createVerify('RSA-SHA256')
      verify.update(data)
      verify.end()
      
      const isValid = verify.verify(publicKey, signature, 'base64')
      
      this.logAudit('system', 'signature_verified', isValid ? 'success' : 'failure', { isValid })
      
      return isValid
    } catch (error) {
      this.logAudit('system', 'signature_verification_error', 'failure', { error }, 'medium')
      return false
    }
  }

  /**
   * Create secure session
   */
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<SecureSession> {
    // Check for rate limiting
    if (this.isRateLimited(userId)) {
      this.logAudit(userId, 'session_creation_rate_limited', 'failure', { ipAddress }, 'high')
      throw new Error('Too many login attempts. Please try again later.')
    }

    const sessionId = crypto.randomBytes(32).toString('hex')
    const token = crypto.randomBytes(64).toString('base64url')
    
    // Generate session keys
    const keyPair = await this.generateKeyPair(userId)
    
    const session: SecureSession = {
      id: sessionId,
      userId,
      token,
      publicKey: keyPair.publicKey,
      expiresAt: new Date(Date.now() + this.config.sessionTimeout * 60 * 1000),
      permissions: [],
      ipAddress,
      userAgent
    }

    this.sessions.set(sessionId, session)
    this.logAudit(userId, 'session_created', 'success', { sessionId, ipAddress })
    
    return session
  }

  /**
   * Validate session
   */
  async validateSession(token: string): Promise<SecureSession | null> {
    // Check if token is blacklisted
    if (this.blacklistedTokens.has(token)) {
      this.logAudit('unknown', 'blacklisted_token_used', 'failure', { token: token.substring(0, 8) }, 'critical')
      return null
    }

    for (const session of this.sessions.values()) {
      if (session.token === token) {
        if (session.expiresAt > new Date()) {
          // Extend session on activity
          session.expiresAt = new Date(Date.now() + this.config.sessionTimeout * 60 * 1000)
          return session
        } else {
          // Session expired
          this.sessions.delete(session.id)
          this.logAudit(session.userId, 'session_expired', 'success', { sessionId: session.id })
          return null
        }
      }
    }
    
    this.logAudit('unknown', 'invalid_session_token', 'failure', { token: token.substring(0, 8) }, 'medium')
    return null
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.blacklistedTokens.add(session.token)
      this.sessions.delete(sessionId)
      this.logAudit(session.userId, 'session_revoked', 'success', { sessionId })
    }
  }

  /**
   * Check rate limiting
   */
  private isRateLimited(identifier: string): boolean {
    const attempts = this.failedAttempts.get(identifier) || 0
    return attempts >= this.config.maxFailedAttempts
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(identifier: string): void {
    const current = this.failedAttempts.get(identifier) || 0
    this.failedAttempts.set(identifier, current + 1)
    
    // Reset after 15 minutes
    setTimeout(() => {
      this.failedAttempts.delete(identifier)
    }, 15 * 60 * 1000)
    
    if (current + 1 >= this.config.maxFailedAttempts) {
      this.logAudit(identifier, 'rate_limit_triggered', 'failure', { attempts: current + 1 }, 'high')
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId)
        this.blacklistedTokens.add(session.token)
      }
    }
  }

  /**
   * Start threat detection monitoring
   */
  private startThreatDetection(): void {
    // Monitor for suspicious patterns
    setInterval(() => {
      this.analyzeThreatPatterns()
    }, 30000) // Every 30 seconds
  }

  /**
   * Analyze threat patterns
   */
  private analyzeThreatPatterns(): void {
    const recentLogs = this.auditLogs.filter(log => 
      log.timestamp.getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    )

    // Check for brute force attempts
    const failedLogins = recentLogs.filter(log => 
      log.action.includes('login') && log.result === 'failure'
    )
    
    if (failedLogins.length > 10) {
      this.logAudit('system', 'brute_force_detected', 'failure', 
        { attempts: failedLogins.length }, 'critical')
    }

    // Check for data exfiltration attempts
    const largeDecryptions = recentLogs.filter(log =>
      log.action === 'data_decrypted' && log.details?.size > 10000000 // 10MB
    )
    
    if (largeDecryptions.length > 5) {
      this.logAudit('system', 'possible_data_exfiltration', 'failure',
        { count: largeDecryptions.length }, 'critical')
    }
  }

  /**
   * Log security audit event
   */
  private logAudit(
    userId: string,
    action: string,
    result: 'success' | 'failure',
    details?: any,
    threat?: SecurityAuditLog['threat']
  ): void {
    const log: SecurityAuditLog = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      action,
      userId: userId !== 'system' && userId !== 'unknown' ? userId : undefined,
      result,
      details,
      threat
    }

    this.auditLogs.push(log)
    
    // Keep only last 10000 logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs.shift()
    }

    // Alert on critical threats
    if (threat === 'critical') {
      console.error('🚨 CRITICAL SECURITY THREAT:', action, details)
      // In production, this would trigger alerts
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filters?: {
    userId?: string
    action?: string
    result?: 'success' | 'failure'
    threat?: SecurityAuditLog['threat']
    startDate?: Date
    endDate?: Date
  }): SecurityAuditLog[] {
    let logs = [...this.auditLogs]

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId)
      }
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action))
      }
      if (filters.result) {
        logs = logs.filter(log => log.result === filters.result)
      }
      if (filters.threat) {
        logs = logs.filter(log => log.threat === filters.threat)
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!)
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Secure file operations
   */
  async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    const data = await fs.promises.readFile(inputPath)
    const encrypted = await this.encrypt(data)
    await fs.promises.writeFile(outputPath, JSON.stringify(encrypted), 'utf8')
    
    this.logAudit('system', 'file_encrypted', 'success', { 
      inputPath, 
      outputPath,
      size: data.length
    })
  }

  async decryptFile(inputPath: string, outputPath: string): Promise<void> {
    const encryptedJson = await fs.promises.readFile(inputPath, 'utf8')
    const encrypted = JSON.parse(encryptedJson) as EncryptedData
    const decrypted = await this.decrypt(encrypted)
    await fs.promises.writeFile(outputPath, decrypted)
    
    this.logAudit('system', 'file_decrypted', 'success', {
      inputPath,
      outputPath
    })
  }

  /**
   * Hash password with salt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32)
    const iterations = 100000
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, hash) => {
        if (err) reject(err)
        else {
          const combined = Buffer.concat([salt, hash])
          resolve(combined.toString('base64'))
        }
      })
    })
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashBuffer = Buffer.from(hash, 'base64')
    const salt = hashBuffer.slice(0, 32)
    const storedHash = hashBuffer.slice(32)
    const iterations = 100000
    
    return new Promise((resolve) => {
      crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedHash) => {
        if (err) {
          resolve(false)
        } else {
          resolve(crypto.timingSafeEqual(storedHash, derivedHash))
        }
      })
    })
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url')
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    // Remove potential SQL injection patterns
    let sanitized = input.replace(/['";\\]/g, '')
    
    // Remove potential XSS patterns
    sanitized = sanitized.replace(/<script.*?>.*?<\/script>/gi, '')
    sanitized = sanitized.replace(/<iframe.*?>.*?<\/iframe>/gi, '')
    sanitized = sanitized.replace(/javascript:/gi, '')
    sanitized = sanitized.replace(/on\w+\s*=/gi, '')
    
    // Remove potential command injection patterns
    sanitized = sanitized.replace(/[;&|`$]/g, '')
    
    return sanitized.trim()
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    initialized: boolean
    activeSessions: number
    failedAttempts: number
    threats: number
    lastThreat?: SecurityAuditLog
  } {
    const threats = this.auditLogs.filter(log => log.threat && log.threat !== 'low')
    const lastThreat = threats[threats.length - 1]
    
    return {
      initialized: this.masterKey !== null,
      activeSessions: this.sessions.size,
      failedAttempts: Array.from(this.failedAttempts.values()).reduce((a, b) => a + b, 0),
      threats: threats.length,
      lastThreat
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService()