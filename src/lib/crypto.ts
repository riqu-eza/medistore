
/**
 * Get crypto instance (works in both Node.js and Edge Runtime)
 */
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  throw new Error('Crypto API not available')
}

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(str)
  return new Uint8Array(encoded.buffer.slice(0) as ArrayBuffer) as Uint8Array<ArrayBuffer>
}

/**
 * Convert Uint8Array to string
 */
function uint8ArrayToString(arr: Uint8Array): string {
  const decoder = new TextDecoder()
  return decoder.decode(arr)
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes as Uint8Array<ArrayBuffer>
}

function toBuffer(arr: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer) as Uint8Array<ArrayBuffer>
}
/**
 * 
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Get encryption key from environment
 */


// ============================================================================
// ENCRYPTION FUNCTIONS (AES-GCM)
// ============================================================================

/**
 * Encrypt a string using Web Crypto API (AES-GCM)
 */

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!keyString) throw new Error('ENCRYPTION_KEY or NEXTAUTH_SECRET is not set')
  const crypto = getCrypto()
  const keyData = stringToUint8Array(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)  // ✅
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(text: string): Promise<string> {
  try {
    const crypto = getCrypto()
    const key = await getEncryptionKey()
    const iv = toBuffer(crypto.getRandomValues(new Uint8Array(12)))  // ✅
    const encoded = stringToUint8Array(text)                          // ✅
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)
    return uint8ArrayToHex(combined)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const crypto = getCrypto()
    const key = await getEncryptionKey()
    const combined = hexToUint8Array(encryptedData)
    const iv = toBuffer(combined.slice(0, 12))    // ✅
    const ciphertext = toBuffer(combined.slice(12)) // ✅
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return uint8ArrayToString(new Uint8Array(decrypted))
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

export async function hash(data: string): Promise<string> {
  const crypto = getCrypto()
  const encoded = stringToUint8Array(data)  // ✅
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return uint8ArrayToHex(new Uint8Array(hashBuffer))
}

export async function createHmac(data: string, secret: string): Promise<string> {
  const crypto = getCrypto()
  const keyData = stringToUint8Array(secret)  // ✅
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const encoded = stringToUint8Array(data)    // ✅
  const signature = await crypto.subtle.sign('HMAC', key, encoded)
  return uint8ArrayToHex(new Uint8Array(signature))
}
// ============================================================================
// PASSWORD HASHING (bcrypt - must be imported dynamically in server context)
// ============================================================================

/**
 * Hash a password using bcrypt
 * Note: This MUST be called from server-side code only
 */
export async function hashPassword(password: string): Promise<string> {
  // Dynamic import to avoid Edge Runtime issues
  const bcrypt = await import('bcryptjs')
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 * Note: This MUST be called from server-side code only
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Dynamic import to avoid Edge Runtime issues
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

// ============================================================================
// RANDOM GENERATION (Web Crypto)
// ============================================================================

/**
 * Generate a secure random token (hex string)
 */
export function generateToken(length: number = 32): string {
  const crypto = getCrypto()
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return uint8ArrayToHex(bytes)
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureString(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const crypto = getCrypto()
  const randomBytes = crypto.getRandomValues(new Uint8Array(length))
  
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  
  return result
}

/**
 * Generate a secure OTP (One-Time Password)
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789'
  const crypto = getCrypto()
  const randomBytes = crypto.getRandomValues(new Uint8Array(length))
  
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length]
  }
  
  return otp
}

// ============================================================================
// HASHING (Web Crypto)
// ============================================================================

/**
 * Hash data using SHA-256
 */


/**
 * Verify HMAC signature
 */
export async function verifyHmac(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await createHmac(data, secret)
    
    // Constant-time comparison
    if (signature.length !== expectedSignature.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }
    
    return result === 0
  } catch (error) {
    return false
  }
}

// ============================================================================
// API KEY GENERATION
// ============================================================================

/**
 * Generate API key
 */
export function generateApiKey(): string {
  const prefix = 'pk_live_'
  const randomPart = generateSecureString(32)
  return prefix + randomPart
}

/**
 * Hash API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return hash(apiKey)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask sensitive data for logs
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '****'
  }
  
  const visible = data.slice(-visibleChars)
  const masked = '*'.repeat(data.length - visibleChars)
  return masked + visible
}

/**
 * Encrypt object to JSON
 */
export async function encryptObject(obj: any): Promise<string> {
  const json = JSON.stringify(obj)
  return encrypt(json)
}

/**
 * Decrypt JSON to object
 */
export async function decryptObject<T>(encryptedData: string): Promise<T> {
  const json = await decrypt(encryptedData)
  return JSON.parse(json) as T
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecial: boolean
}

export function getPasswordRequirements(): PasswordRequirements {
  return {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  }
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = getPasswordRequirements()
  const errors: string[] = []

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters`)
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (requirements.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (requirements.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Generate a secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = uppercase + lowercase + numbers + special
  const crypto = getCrypto()
  
  let password = ''
  
  // Ensure at least one of each required type
  password += uppercase[crypto.getRandomValues(new Uint8Array(1))[0] % uppercase.length]
  password += lowercase[crypto.getRandomValues(new Uint8Array(1))[0] % lowercase.length]
  password += numbers[crypto.getRandomValues(new Uint8Array(1))[0] % numbers.length]
  password += special[crypto.getRandomValues(new Uint8Array(1))[0] % special.length]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.getRandomValues(new Uint8Array(1))[0] % allChars.length]
  }
  
  // Shuffle the password
  const passwordArray = password.split('')
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint8Array(1))[0] % (i + 1)
    ;[passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]]
  }
  
  return passwordArray.join('')
}