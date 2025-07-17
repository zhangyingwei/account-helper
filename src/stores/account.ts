import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Account, AccountFormData } from '@/shared/types'
import { StorageService } from '@/shared/storage'
import { useAuthStore } from './auth'

export const useAccountStore = defineStore('account', () => {
  const accounts = ref<Account[]>([])
  const loading = ref(false)

  const loadAccounts = async (masterPassword?: string) => {
    loading.value = true
    try {
      console.log('Loading accounts...')
      const authStore = useAuthStore()
      const password = masterPassword || authStore.masterPassword
      console.log('Using password for loading:', password ? 'Yes' : 'No')

      const data = await StorageService.getAccounts(password)
      console.log('Loaded data from storage:', data)

      // 确保data是数组
      accounts.value = Array.isArray(data) ? data : []
      console.log('Final accounts.value:', accounts.value)
      console.log('Number of accounts loaded:', accounts.value.length)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      accounts.value = []
    } finally {
      loading.value = false
    }
  }

  const addAccount = async (formData: AccountFormData) => {
    try {
      console.log('Adding account with data:', formData)

      const account: Account = {
        id: generateId(),
        ...formData,
        createTime: Date.now(),
        lastUsed: 0
      }

      // 确保accounts.value是数组
      if (!Array.isArray(accounts.value)) {
        console.log('accounts.value is not an array, initializing as empty array')
        accounts.value = []
      }

      console.log('Current accounts before adding:', accounts.value.length)
      // 直接使用IndexedDB添加账号，而不是先添加到数组再保存
      const authStore = useAuthStore()
      await StorageService.addAccount(account, authStore.masterPassword)
      console.log('Account saved to IndexedDB successfully')

      // 添加到本地数组并触发响应式更新
      accounts.value.push(account)
      console.log('Current accounts after adding:', accounts.value.length)

      // 强制触发响应式更新
      accounts.value = [...accounts.value]
      console.log('Triggered reactive update')
    } catch (error) {
      console.error('Failed to add account:', error)
      throw error
    }
  }

  const updateAccount = async (id: string, formData: AccountFormData) => {
    // 确保accounts.value是数组
    if (!Array.isArray(accounts.value)) {
      accounts.value = []
      return
    }

    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      const updatedAccount = {
        ...accounts.value[index],
        ...formData
      }

      // 直接更新IndexedDB
      const authStore = useAuthStore()
      await StorageService.updateAccount(updatedAccount, authStore.masterPassword)

      // 更新本地数组
      accounts.value[index] = updatedAccount

      // 强制触发响应式更新
      accounts.value = [...accounts.value]
    }
  }

  const deleteAccount = async (id: string) => {
    // 确保accounts.value是数组
    if (!Array.isArray(accounts.value)) {
      accounts.value = []
      return
    }

    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      // 直接从IndexedDB删除
      await StorageService.deleteAccount(id)

      // 从本地数组删除
      accounts.value.splice(index, 1)

      // 强制触发响应式更新
      accounts.value = [...accounts.value]
    }
  }

  const updateLastUsed = async (id: string) => {
    // 确保accounts.value是数组
    if (!Array.isArray(accounts.value)) {
      accounts.value = []
      return
    }

    const account = accounts.value.find(acc => acc.id === id)
    if (account) {
      account.lastUsed = Date.now()
      await saveAccounts()
    }
  }

  const getAccountsByDomain = (domain: string) => {
    // 确保accounts.value是数组
    if (!Array.isArray(accounts.value)) {
      return []
    }

    return accounts.value.filter(account =>
      !account.domain || account.domain === '' || domain.includes(account.domain)
    )
  }

  const saveAccounts = async () => {
    try {
      console.log('Saving accounts to storage, count:', accounts.value.length)
      console.log('Accounts to save:', accounts.value)

      const authStore = useAuthStore()
      console.log('Using master password for saving:', authStore.masterPassword ? 'Yes' : 'No')

      await StorageService.saveAccounts(accounts.value, authStore.masterPassword)
      console.log('Accounts saved to storage successfully')
    } catch (error) {
      console.error('Failed to save accounts:', error)
      throw error // 重新抛出错误，让调用方知道保存失败
    }
  }

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  return {
    accounts,
    loading,
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    updateLastUsed,
    getAccountsByDomain
  }
})
