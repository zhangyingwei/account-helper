import type { Account, Settings } from './types'
import { CryptoService } from './crypto'

export class StorageService {
  private static readonly ACCOUNTS_KEY = 'accounts'
  private static readonly SETTINGS_KEY = 'settings'
  private static readonly ENCRYPTED_ACCOUNTS_KEY = 'encrypted_accounts'
  private static readonly MASTER_PASSWORD_HASH_KEY = 'master_password_hash'

  static async getAccounts(masterPassword?: string): Promise<Account[]> {
    try {
      const settings = await this.getSettings()

      if (settings.encryptionEnabled && masterPassword) {
        // 获取加密的账号数据
        const result = await chrome.storage.sync.get([this.ENCRYPTED_ACCOUNTS_KEY])
        const encryptedData = result[this.ENCRYPTED_ACCOUNTS_KEY]

        if (encryptedData) {
          const decryptedData = await CryptoService.decrypt(encryptedData, masterPassword)
          return JSON.parse(decryptedData)
        }
        return []
      } else {
        // 获取未加密的账号数据
        const result = await chrome.storage.sync.get([this.ACCOUNTS_KEY])
        return result[this.ACCOUNTS_KEY] || []
      }
    } catch (error) {
      console.error('Failed to get accounts from storage:', error)
      return []
    }
  }

  static async saveAccounts(accounts: Account[], masterPassword?: string): Promise<void> {
    try {
      const settings = await this.getSettings()

      if (settings.encryptionEnabled && masterPassword) {
        // 加密并保存账号数据
        const dataToEncrypt = JSON.stringify(accounts)
        const encryptedData = await CryptoService.encrypt(dataToEncrypt, masterPassword)

        await chrome.storage.sync.set({
          [this.ENCRYPTED_ACCOUNTS_KEY]: encryptedData
        })

        // 清除未加密的数据
        await chrome.storage.sync.remove([this.ACCOUNTS_KEY])
      } else {
        // 保存未加密的账号数据
        await chrome.storage.sync.set({
          [this.ACCOUNTS_KEY]: accounts
        })

        // 清除加密的数据
        await chrome.storage.sync.remove([this.ENCRYPTED_ACCOUNTS_KEY])
      }
    } catch (error) {
      console.error('Failed to save accounts to storage:', error)
      throw error
    }
  }

  static async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get([this.SETTINGS_KEY])
      return result[this.SETTINGS_KEY] || {
        autoDetection: true,
        autoSubmit: false,
        encryptionEnabled: false
      }
    } catch (error) {
      console.error('Failed to get settings from storage:', error)
      return {
        autoDetection: true,
        autoSubmit: false,
        encryptionEnabled: false
      }
    }
  }

  static async saveSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.SETTINGS_KEY]: settings
      })
    } catch (error) {
      console.error('Failed to save settings to storage:', error)
      throw error
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await chrome.storage.sync.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
      throw error
    }
  }

  /**
   * 设置主密码
   */
  static async setMasterPassword(password: string): Promise<void> {
    try {
      const passwordHash = await CryptoService.hash(password)
      await chrome.storage.sync.set({
        [this.MASTER_PASSWORD_HASH_KEY]: passwordHash
      })
    } catch (error) {
      console.error('Failed to set master password:', error)
      throw error
    }
  }

  /**
   * 验证主密码
   */
  static async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const result = await chrome.storage.sync.get([this.MASTER_PASSWORD_HASH_KEY])
      const storedHash = result[this.MASTER_PASSWORD_HASH_KEY]

      if (!storedHash) {
        return false
      }

      const passwordHash = await CryptoService.hash(password)
      return passwordHash === storedHash
    } catch (error) {
      console.error('Failed to verify master password:', error)
      return false
    }
  }

  /**
   * 检查是否已设置主密码
   */
  static async hasMasterPassword(): Promise<boolean> {
    try {
      const result = await chrome.storage.sync.get([this.MASTER_PASSWORD_HASH_KEY])
      return !!result[this.MASTER_PASSWORD_HASH_KEY]
    } catch (error) {
      console.error('Failed to check master password:', error)
      return false
    }
  }

  /**
   * 启用加密（迁移现有数据）
   */
  static async enableEncryption(masterPassword: string): Promise<void> {
    try {
      // 获取现有的未加密账号
      const accounts = await this.getAccounts()

      // 设置主密码
      await this.setMasterPassword(masterPassword)

      // 更新设置
      const settings = await this.getSettings()
      settings.encryptionEnabled = true
      await this.saveSettings(settings)

      // 保存加密的账号数据
      await this.saveAccounts(accounts, masterPassword)
    } catch (error) {
      console.error('Failed to enable encryption:', error)
      throw error
    }
  }

  /**
   * 禁用加密（迁移现有数据）
   */
  static async disableEncryption(masterPassword: string): Promise<void> {
    try {
      // 获取加密的账号数据
      const accounts = await this.getAccounts(masterPassword)

      // 更新设置
      const settings = await this.getSettings()
      settings.encryptionEnabled = false
      await this.saveSettings(settings)

      // 保存未加密的账号数据
      await this.saveAccounts(accounts)

      // 清除主密码和加密数据
      await chrome.storage.sync.remove([
        this.MASTER_PASSWORD_HASH_KEY,
        this.ENCRYPTED_ACCOUNTS_KEY
      ])
    } catch (error) {
      console.error('Failed to disable encryption:', error)
      throw error
    }
  }
}
