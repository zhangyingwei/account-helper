import type { Account, Settings } from './types'
import { IndexedDBService } from './indexeddb'

export class StorageService {
  /**
   * 获取所有账号
   */
  static async getAccounts(masterPassword?: string): Promise<Account[]> {
    try {
      console.log('StorageService: Getting accounts from IndexedDB')
      const accounts = await IndexedDBService.getAccounts(masterPassword)
      console.log('StorageService: Retrieved accounts:', accounts.length)
      return accounts
    } catch (error) {
      console.error('Failed to get accounts from IndexedDB:', error)
      return []
    }
  }

  /**
   * 保存所有账号
   */
  static async saveAccounts(accounts: Account[], masterPassword?: string): Promise<void> {
    try {
      console.log('StorageService: Saving accounts to IndexedDB, count:', accounts.length)
      await IndexedDBService.saveAccounts(accounts, masterPassword)
      console.log('StorageService: Accounts saved successfully')
    } catch (error) {
      console.error('Failed to save accounts to IndexedDB:', error)
      throw error
    }
  }

  /**
   * 获取设置
   */
  static async getSettings(): Promise<Settings> {
    try {
      const settings = await IndexedDBService.getSettings()
      console.log('StorageService: Retrieved settings:', settings)
      return settings
    } catch (error) {
      console.error('Failed to get settings from IndexedDB:', error)
      return {
        autoDetection: true,
        autoSubmit: false,
        encryptionEnabled: false
      }
    }
  }

  /**
   * 保存设置
   */
  static async saveSettings(settings: Settings): Promise<void> {
    try {
      console.log('StorageService: Saving settings to IndexedDB:', settings)
      await IndexedDBService.saveSettings(settings)
      console.log('StorageService: Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings to IndexedDB:', error)
      throw error
    }
  }

  /**
   * 检查是否已设置主密码
   */
  static async hasMasterPassword(): Promise<boolean> {
    try {
      const hasPassword = await IndexedDBService.hasMasterPassword()
      console.log('StorageService: Has master password:', hasPassword)
      return hasPassword
    } catch (error) {
      console.error('Failed to check master password:', error)
      return false
    }
  }

  /**
   * 设置主密码
   */
  static async setMasterPassword(password: string): Promise<void> {
    try {
      console.log('StorageService: Setting master password')
      await IndexedDBService.setMasterPassword(password)
      console.log('StorageService: Master password set successfully')
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
      const isValid = await IndexedDBService.verifyMasterPassword(password)
      console.log('StorageService: Master password verification:', isValid)
      return isValid
    } catch (error) {
      console.error('Failed to verify master password:', error)
      return false
    }
  }

  /**
   * 清除主密码
   */
  static async clearMasterPassword(): Promise<void> {
    try {
      console.log('StorageService: Clearing master password')
      await IndexedDBService.clearMasterPassword()
      console.log('StorageService: Master password cleared successfully')
    } catch (error) {
      console.error('Failed to clear master password:', error)
      throw error
    }
  }

  /**
   * 启用加密（迁移现有数据）
   */
  static async enableEncryption(masterPassword: string): Promise<void> {
    try {
      console.log('StorageService: Enabling encryption')

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

      console.log('StorageService: Encryption enabled successfully')
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
      console.log('StorageService: Disabling encryption')

      // 获取加密的账号数据
      const accounts = await this.getAccounts(masterPassword)

      // 更新设置
      const settings = await this.getSettings()
      settings.encryptionEnabled = false
      await this.saveSettings(settings)

      // 保存未加密的账号数据
      await this.saveAccounts(accounts)

      // 清除主密码
      await this.clearMasterPassword()

      console.log('StorageService: Encryption disabled successfully')
    } catch (error) {
      console.error('Failed to disable encryption:', error)
      throw error
    }
  }

  /**
   * 添加单个账号
   */
  static async addAccount(account: Account, masterPassword?: string): Promise<void> {
    try {
      console.log('StorageService: Adding account to IndexedDB:', account.id)
      await IndexedDBService.addAccount(account, masterPassword)
      console.log('StorageService: Account added successfully')
    } catch (error) {
      console.error('Failed to add account to IndexedDB:', error)
      throw error
    }
  }

  /**
   * 更新账号
   */
  static async updateAccount(account: Account, masterPassword?: string): Promise<void> {
    try {
      console.log('StorageService: Updating account in IndexedDB:', account.id)
      await IndexedDBService.updateAccount(account, masterPassword)
      console.log('StorageService: Account updated successfully')
    } catch (error) {
      console.error('Failed to update account in IndexedDB:', error)
      throw error
    }
  }

  /**
   * 删除账号
   */
  static async deleteAccount(id: string): Promise<void> {
    try {
      console.log('StorageService: Deleting account from IndexedDB:', id)
      await IndexedDBService.deleteAccount(id)
      console.log('StorageService: Account deleted successfully')
    } catch (error) {
      console.error('Failed to delete account from IndexedDB:', error)
      throw error
    }
  }

  /**
   * 清除所有数据
   */
  static async clearAll(): Promise<void> {
    try {
      console.log('StorageService: Clearing all data')

      // 清除所有账号
      await this.saveAccounts([])

      // 重置设置
      await this.saveSettings({
        autoDetection: true,
        autoSubmit: false,
        encryptionEnabled: false
      })

      // 清除主密码
      await this.clearMasterPassword()

      console.log('StorageService: All data cleared successfully')
    } catch (error) {
      console.error('Failed to clear all data:', error)
      throw error
    }
  }
}
