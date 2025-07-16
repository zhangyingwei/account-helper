/**
 * 加密服务
 * 使用 Web Crypto API 进行数据加密
 */

export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  /**
   * 从密码生成加密密钥
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    
    // 导入密码作为原始密钥材料
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    )
    
    // 使用 PBKDF2 派生密钥
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * 加密数据
   */
  static async encrypt(data: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      
      // 生成随机盐和 IV
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      
      // 派生密钥
      const key = await this.deriveKey(password, salt)
      
      // 加密数据
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        dataBuffer
      )
      
      // 组合盐、IV 和加密数据
      const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)
      
      // 转换为 Base64
      return this.arrayBufferToBase64(combined)
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * 解密数据
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // 从 Base64 解码
      const combined = this.base64ToArrayBuffer(encryptedData)
      
      // 提取盐、IV 和加密数据
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 16 + this.IV_LENGTH)
      const encrypted = combined.slice(16 + this.IV_LENGTH)
      
      // 派生密钥
      const key = await this.deriveKey(password, salt)
      
      // 解密数据
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encrypted
      )
      
      // 转换为字符串
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data - invalid password or corrupted data')
    }
  }

  /**
   * 生成随机密码
   */
  static generatePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    
    return Array.from(array, byte => charset[byte % charset.length]).join('')
  }

  /**
   * 验证密码强度
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('密码至少需要8个字符')
    }

    if (/[a-z]/.test(password)) score += 1
    else feedback.push('需要包含小写字母')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('需要包含大写字母')

    if (/\d/.test(password)) score += 1
    else feedback.push('需要包含数字')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
    else feedback.push('需要包含特殊字符')

    return {
      isValid: score >= 3,
      score,
      feedback
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * 生成哈希值（用于验证）
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    return this.arrayBufferToBase64(hashBuffer)
  }
}
