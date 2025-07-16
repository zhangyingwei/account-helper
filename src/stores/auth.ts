import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StorageService } from '@/shared/storage'
import { CryptoService } from '@/shared/crypto'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const masterPassword = ref('')
  const hasPassword = ref(false)
  const loading = ref(false)

  const checkMasterPassword = async () => {
    loading.value = true
    try {
      hasPassword.value = await StorageService.hasMasterPassword()
    } catch (error) {
      console.error('Failed to check master password:', error)
    } finally {
      loading.value = false
    }
  }

  const setMasterPassword = async (password: string) => {
    loading.value = true
    try {
      // 验证密码强度
      const validation = CryptoService.validatePasswordStrength(password)
      if (!validation.isValid) {
        throw new Error(`密码强度不足: ${validation.feedback.join(', ')}`)
      }

      await StorageService.enableEncryption(password)
      masterPassword.value = password
      isAuthenticated.value = true
      hasPassword.value = true
    } catch (error) {
      console.error('Failed to set master password:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const authenticate = async (password: string) => {
    loading.value = true
    try {
      const isValid = await StorageService.verifyMasterPassword(password)
      if (isValid) {
        masterPassword.value = password
        isAuthenticated.value = true
        return true
      } else {
        throw new Error('密码错误')
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    isAuthenticated.value = false
    masterPassword.value = ''
  }

  const disableEncryption = async (password: string) => {
    loading.value = true
    try {
      const isValid = await StorageService.verifyMasterPassword(password)
      if (!isValid) {
        throw new Error('密码错误')
      }

      await StorageService.disableEncryption(password)
      isAuthenticated.value = false
      masterPassword.value = ''
      hasPassword.value = false
    } catch (error) {
      console.error('Failed to disable encryption:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const changeMasterPassword = async (oldPassword: string, newPassword: string) => {
    loading.value = true
    try {
      // 验证旧密码
      const isValid = await StorageService.verifyMasterPassword(oldPassword)
      if (!isValid) {
        throw new Error('当前密码错误')
      }

      // 验证新密码强度
      const validation = CryptoService.validatePasswordStrength(newPassword)
      if (!validation.isValid) {
        throw new Error(`新密码强度不足: ${validation.feedback.join(', ')}`)
      }

      // 获取当前账号数据
      const accounts = await StorageService.getAccounts(oldPassword)
      
      // 设置新密码
      await StorageService.setMasterPassword(newPassword)
      
      // 用新密码重新加密数据
      await StorageService.saveAccounts(accounts, newPassword)
      
      masterPassword.value = newPassword
    } catch (error) {
      console.error('Failed to change master password:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    isAuthenticated,
    masterPassword,
    hasPassword,
    loading,
    checkMasterPassword,
    setMasterPassword,
    authenticate,
    logout,
    disableEncryption,
    changeMasterPassword
  }
})
