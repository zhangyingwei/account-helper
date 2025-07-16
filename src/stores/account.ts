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
      const authStore = useAuthStore()
      const password = masterPassword || authStore.masterPassword
      const data = await StorageService.getAccounts(password)
      accounts.value = data
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      loading.value = false
    }
  }

  const addAccount = async (formData: AccountFormData) => {
    const account: Account = {
      id: generateId(),
      ...formData,
      createTime: Date.now(),
      lastUsed: 0
    }
    
    accounts.value.push(account)
    await saveAccounts()
  }

  const updateAccount = async (id: string, formData: AccountFormData) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index] = {
        ...accounts.value[index],
        ...formData
      }
      await saveAccounts()
    }
  }

  const deleteAccount = async (id: string) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      await saveAccounts()
    }
  }

  const updateLastUsed = async (id: string) => {
    const account = accounts.value.find(acc => acc.id === id)
    if (account) {
      account.lastUsed = Date.now()
      await saveAccounts()
    }
  }

  const getAccountsByDomain = (domain: string) => {
    return accounts.value.filter(account => 
      !account.domain || account.domain === '' || domain.includes(account.domain)
    )
  }

  const saveAccounts = async () => {
    try {
      const authStore = useAuthStore()
      await StorageService.saveAccounts(accounts.value, authStore.masterPassword)
    } catch (error) {
      console.error('Failed to save accounts:', error)
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
