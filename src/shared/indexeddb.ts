import type { Account, Settings } from './types'
import { CryptoService } from './crypto'

export class IndexedDBService {
  private static readonly DB_NAME = 'AccountHelperDB'
  private static readonly DB_VERSION = 1
  private static readonly ACCOUNTS_STORE = 'accounts'
  private static readonly SETTINGS_STORE = 'settings'
  private static readonly MASTER_PASSWORD_STORE = 'masterPassword'

  private static db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  static async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建账号存储
        if (!db.objectStoreNames.contains(this.ACCOUNTS_STORE)) {
          const accountStore = db.createObjectStore(this.ACCOUNTS_STORE, { keyPath: 'id' })
          accountStore.createIndex('domain', 'domain', { unique: false })
          accountStore.createIndex('group', 'group', { unique: false })
        }

        // 创建设置存储
        if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
          db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' })
        }

        // 创建主密码存储
        if (!db.objectStoreNames.contains(this.MASTER_PASSWORD_STORE)) {
          db.createObjectStore(this.MASTER_PASSWORD_STORE, { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * 获取所有账号
   */
  static async getAccounts(masterPassword?: string): Promise<Account[]> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.ACCOUNTS_STORE], 'readonly')
      const store = transaction.objectStore(this.ACCOUNTS_STORE)
      const request = store.getAll()

      request.onsuccess = async () => {
        try {
          let accounts = request.result || []
          
          // 如果有主密码，解密账号数据
          if (masterPassword && accounts.length > 0) {
            const decryptedAccounts = await Promise.all(
              accounts.map(async (account: any) => {
                if (account.encrypted) {
                  return {
                    ...account,
                    username: await CryptoService.decrypt(account.username, masterPassword),
                    password: await CryptoService.decrypt(account.password, masterPassword),
                    encrypted: false
                  }
                }
                return account
              })
            )
            accounts = decryptedAccounts
          }
          
          resolve(Array.isArray(accounts) ? accounts : [])
        } catch (error) {
          console.error('Failed to decrypt accounts:', error)
          resolve([])
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to get accounts from IndexedDB'))
      }
    })
  }

  /**
   * 保存所有账号
   */
  static async saveAccounts(accounts: Account[], masterPassword?: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([this.ACCOUNTS_STORE], 'readwrite')
        const store = transaction.objectStore(this.ACCOUNTS_STORE)

        // 清空现有数据
        await new Promise<void>((clearResolve, clearReject) => {
          const clearRequest = store.clear()
          clearRequest.onsuccess = () => clearResolve()
          clearRequest.onerror = () => clearReject(new Error('Failed to clear accounts'))
        })

        // 保存新数据
        const savePromises = accounts.map(async (account) => {
          let accountToSave = { ...account }
          
          // 如果有主密码，加密敏感数据
          if (masterPassword) {
            accountToSave = {
              ...account,
              username: await CryptoService.encrypt(account.username, masterPassword),
              password: await CryptoService.encrypt(account.password, masterPassword),
              encrypted: true
            }
          }

          return new Promise<void>((saveResolve, saveReject) => {
            const saveRequest = store.add(accountToSave)
            saveRequest.onsuccess = () => saveResolve()
            saveRequest.onerror = () => saveReject(new Error(`Failed to save account ${account.id}`))
          })
        })

        await Promise.all(savePromises)

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(new Error('Transaction failed'))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 添加单个账号
   */
  static async addAccount(account: Account, masterPassword?: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise(async (resolve, reject) => {
      try {
        let accountToSave = { ...account }
        
        // 如果有主密码，加密敏感数据
        if (masterPassword) {
          accountToSave = {
            ...account,
            username: await CryptoService.encrypt(account.username, masterPassword),
            password: await CryptoService.encrypt(account.password, masterPassword),
            encrypted: true
          }
        }

        const transaction = db.transaction([this.ACCOUNTS_STORE], 'readwrite')
        const store = transaction.objectStore(this.ACCOUNTS_STORE)
        const request = store.add(accountToSave)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('Failed to add account to IndexedDB'))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 更新账号
   */
  static async updateAccount(account: Account, masterPassword?: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise(async (resolve, reject) => {
      try {
        let accountToSave = { ...account }
        
        // 如果有主密码，加密敏感数据
        if (masterPassword) {
          accountToSave = {
            ...account,
            username: await CryptoService.encrypt(account.username, masterPassword),
            password: await CryptoService.encrypt(account.password, masterPassword),
            encrypted: true
          }
        }

        const transaction = db.transaction([this.ACCOUNTS_STORE], 'readwrite')
        const store = transaction.objectStore(this.ACCOUNTS_STORE)
        const request = store.put(accountToSave)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('Failed to update account in IndexedDB'))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 删除账号
   */
  static async deleteAccount(id: string): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.ACCOUNTS_STORE], 'readwrite')
      const store = transaction.objectStore(this.ACCOUNTS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete account from IndexedDB'))
    })
  }

  /**
   * 获取设置
   */
  static async getSettings(): Promise<Settings> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.SETTINGS_STORE], 'readonly')
      const store = transaction.objectStore(this.SETTINGS_STORE)
      const request = store.get('settings')

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : {
          autoDetection: true,
          autoSubmit: false,
          encryptionEnabled: false
        })
      }

      request.onerror = () => {
        reject(new Error('Failed to get settings from IndexedDB'))
      }
    })
  }

  /**
   * 保存设置
   */
  static async saveSettings(settings: Settings): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.SETTINGS_STORE], 'readwrite')
      const store = transaction.objectStore(this.SETTINGS_STORE)
      const request = store.put({ key: 'settings', value: settings })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to save settings to IndexedDB'))
    })
  }

  /**
   * 检查是否有主密码
   */
  static async hasMasterPassword(): Promise<boolean> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.MASTER_PASSWORD_STORE], 'readonly')
      const store = transaction.objectStore(this.MASTER_PASSWORD_STORE)
      const request = store.get('hash')

      request.onsuccess = () => {
        resolve(!!request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to check master password'))
      }
    })
  }

  /**
   * 设置主密码
   */
  static async setMasterPassword(password: string): Promise<void> {
    const hash = await CryptoService.hash(password)
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.MASTER_PASSWORD_STORE], 'readwrite')
      const store = transaction.objectStore(this.MASTER_PASSWORD_STORE)
      const request = store.put({ key: 'hash', value: hash })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to set master password'))
    })
  }

  /**
   * 验证主密码
   */
  static async verifyMasterPassword(password: string): Promise<boolean> {
    const db = await this.initDB()
    
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([this.MASTER_PASSWORD_STORE], 'readonly')
        const store = transaction.objectStore(this.MASTER_PASSWORD_STORE)
        const request = store.get('hash')

        request.onsuccess = async () => {
          if (!request.result) {
            resolve(false)
            return
          }

          const storedHash = request.result.value
          const inputHash = await CryptoService.hash(password)
          resolve(storedHash === inputHash)
        }

        request.onerror = () => {
          reject(new Error('Failed to verify master password'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 清除主密码
   */
  static async clearMasterPassword(): Promise<void> {
    const db = await this.initDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.MASTER_PASSWORD_STORE], 'readwrite')
      const store = transaction.objectStore(this.MASTER_PASSWORD_STORE)
      const request = store.delete('hash')

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear master password'))
    })
  }
}
