// 内联类型定义，避免导入问题
interface ChromeMessage {
  action: string
  account?: any
  data?: any
}

// 内联存储服务，避免导入问题
class StorageService {
  private static readonly ACCOUNTS_KEY = 'accounts'
  private static readonly SETTINGS_KEY = 'settings'
  private static readonly ENCRYPTED_ACCOUNTS_KEY = 'encrypted_accounts'
  private static readonly MASTER_PASSWORD_HASH_KEY = 'master_password_hash'

  static async getAccounts(masterPassword?: string): Promise<any[]> {
    try {
      const settings = await this.getSettings()

      if (settings.encryptionEnabled && masterPassword) {
        const result = await chrome.storage.sync.get([this.ENCRYPTED_ACCOUNTS_KEY])
        const encryptedData = result[this.ENCRYPTED_ACCOUNTS_KEY]

        if (encryptedData) {
          // 这里应该解密，但为了简化，暂时返回空数组
          return []
        }
        return []
      } else {
        const result = await chrome.storage.sync.get([this.ACCOUNTS_KEY])
        return result[this.ACCOUNTS_KEY] || []
      }
    } catch (error) {
      console.error('Failed to get accounts from storage:', error)
      return []
    }
  }

  static async saveAccounts(accounts: any[], masterPassword?: string): Promise<void> {
    try {
      const settings = await this.getSettings()

      if (settings.encryptionEnabled && masterPassword) {
        // 这里应该加密，但为了简化，暂时保存到普通存储
        await chrome.storage.sync.set({
          [this.ACCOUNTS_KEY]: accounts
        })
      } else {
        await chrome.storage.sync.set({
          [this.ACCOUNTS_KEY]: accounts
        })
      }
    } catch (error) {
      console.error('Failed to save accounts to storage:', error)
      throw error
    }
  }

  static async getSettings(): Promise<any> {
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

  static async saveSettings(settings: any): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.SETTINGS_KEY]: settings
      })
    } catch (error) {
      console.error('Failed to save settings to storage:', error)
      throw error
    }
  }
}

class BackgroundScript {
  constructor() {
    this.init()
  }

  private init() {
    // 监听来自 content script 和 popup 的消息
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // 保持消息通道开放
    })

    // 监听扩展安装事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details)
    })

    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab)
    })
  }

  private async handleMessage(
    message: ChromeMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ) {
    try {
      switch (message.action) {
        case 'getAccountsForDomain':
          await this.handleGetAccountsForDomain(message, sendResponse)
          break

        case 'fillAccount':
          await this.handleFillAccount(message, sender, sendResponse)
          break

        case 'getAccounts':
          await this.handleGetAccounts(sendResponse)
          break

        case 'saveAccount':
          await this.handleSaveAccount(message, sendResponse)
          break

        case 'deleteAccount':
          await this.handleDeleteAccount(message, sendResponse)
          break

        case 'getSettings':
          await this.handleGetSettings(sendResponse)
          break

        case 'saveSettings':
          await this.handleSaveSettings(message, sendResponse)
          break

        case 'updateLastUsed':
          await this.handleUpdateLastUsed(message, sendResponse)
          break

        default:
          sendResponse({ error: 'Unknown action' })
      }
    } catch (error) {
      console.error('Error handling message:', error)
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleGetAccountsForDomain(message: ChromeMessage, sendResponse: (response?: any) => void) {
    try {
      // 检查是否启用了加密
      const settings = await StorageService.getSettings()

      if (settings.encryptionEnabled) {
        // 如果启用了加密，需要主密码才能获取账号
        sendResponse({
          error: 'Encryption enabled - master password required',
          requiresAuth: true
        })
        return
      }

      const accounts = await StorageService.getAccounts()
      const domain = message.data?.domain || ''

      // 过滤适用于当前域名的账号
      const filteredAccounts = accounts.filter(account =>
        !account.domain || account.domain === '' || domain.includes(account.domain)
      )

      sendResponse({ accounts: filteredAccounts })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleFillAccount(
    message: ChromeMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ) {
    try {
      if (!sender.tab?.id || !message.account) {
        sendResponse({ error: 'Invalid request' })
        return
      }

      // 向 content script 发送填入账号的消息
      await chrome.tabs.sendMessage(sender.tab.id, {
        action: 'fillAccount',
        account: message.account
      })

      // 更新账号的最后使用时间
      const accounts = await StorageService.getAccounts()
      const accountIndex = accounts.findIndex(acc => acc.id === message.account.id)
      
      if (accountIndex !== -1) {
        accounts[accountIndex].lastUsed = Date.now()
        await StorageService.saveAccounts(accounts)
      }

      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleGetAccounts(sendResponse: (response?: any) => void) {
    try {
      const accounts = await StorageService.getAccounts()
      sendResponse({ accounts })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleSaveAccount(message: ChromeMessage, sendResponse: (response?: any) => void) {
    try {
      const accounts = await StorageService.getAccounts()
      
      if (message.data?.id) {
        // 更新现有账号
        const index = accounts.findIndex(acc => acc.id === message.data.id)
        if (index !== -1) {
          accounts[index] = { ...accounts[index], ...message.data }
        }
      } else {
        // 添加新账号
        const newAccount = {
          id: this.generateId(),
          createTime: Date.now(),
          lastUsed: 0,
          ...message.data
        }
        accounts.push(newAccount)
      }
      
      await StorageService.saveAccounts(accounts)
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleDeleteAccount(message: ChromeMessage, sendResponse: (response?: any) => void) {
    try {
      const accounts = await StorageService.getAccounts()
      const filteredAccounts = accounts.filter(acc => acc.id !== message.data?.id)
      
      await StorageService.saveAccounts(filteredAccounts)
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleGetSettings(sendResponse: (response?: any) => void) {
    try {
      const settings = await StorageService.getSettings()
      sendResponse({ settings })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleSaveSettings(message: ChromeMessage, sendResponse: (response?: any) => void) {
    try {
      await StorageService.saveSettings(message.data)
      sendResponse({ success: true })
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private async handleUpdateLastUsed(message: ChromeMessage, sendResponse: (response?: any) => void) {
    try {
      const accounts = await StorageService.getAccounts()
      const accountIndex = accounts.findIndex(acc => acc.id === message.data?.accountId)

      if (accountIndex !== -1) {
        accounts[accountIndex].lastUsed = Date.now()
        await StorageService.saveAccounts(accounts)
        sendResponse({ success: true })
      } else {
        sendResponse({ error: 'Account not found' })
      }
    } catch (error) {
      sendResponse({ error: (error as Error).message })
    }
  }

  private handleInstalled(details: chrome.runtime.InstalledDetails) {
    if (details.reason === 'install') {
      console.log('Account Helper extension installed')
      // 可以在这里设置默认设置或显示欢迎页面
    } else if (details.reason === 'update') {
      console.log('Account Helper extension updated')
      // 可以在这里处理版本更新逻辑
    }
  }

  private handleTabUpdated(
    tabId: number,
    changeInfo: any,
    tab: chrome.tabs.Tab
  ) {
    // 当页面完成加载时，可以检查是否为登录页面
    if (changeInfo.status === 'complete' && tab.url) {
      // 这里可以添加自动检测逻辑
      // 例如：向 content script 发送检测消息
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// 初始化 background script
new BackgroundScript()
