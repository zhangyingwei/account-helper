export interface Account {
  id: string
  name: string
  username: string
  password: string
  group: string
  domain: string
  createTime: number
  lastUsed: number
  encrypted?: boolean // 标记是否已加密
}

export interface AccountFormData {
  name: string
  username: string
  password: string
  group: string
  domain: string
}

export interface LoginDetectionResult {
  isLoginPage: boolean
  usernameField?: HTMLInputElement
  passwordField?: HTMLInputElement
  form?: HTMLFormElement
}

export interface ChromeMessage {
  action: string
  account?: Account
  data?: any
}

export interface StorageData {
  accounts: Account[]
  settings: Settings
}

export interface Settings {
  autoDetection: boolean
  autoSubmit: boolean
  encryptionEnabled: boolean
  masterPassword?: string
}
