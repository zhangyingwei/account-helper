<template>
  <div class="options-container">
    <header class="options-header">
      <h1>Account Helper - 设置</h1>
      <p>管理您的账号和插件设置</p>
    </header>

    <div class="options-content">
      <!-- 账号管理 -->
      <section class="section">
        <h2>账号管理</h2>

        <!-- 认证状态提示 -->
        <div v-if="settings.encryptionEnabled && authStore.hasPassword && !authStore.isAuthenticated" class="auth-warning">
          <div class="warning-content">
            <p>🔒 需要输入主密码才能访问账号数据</p>
            <button @click="requestAuthentication" class="btn btn-primary">输入密码</button>
          </div>
        </div>

        <div v-else>
          <div class="section-actions">
            <button @click="showAddForm = true" class="btn btn-primary">
              + 添加账号
            </button>
            <button @click="exportAccounts" class="btn btn-secondary">
              导出账号
            </button>
            <button @click="importAccounts" class="btn btn-secondary">
              导入账号
            </button>
          </div>

          <div class="accounts-table">
            <table v-if="accounts.length > 0">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>用户名</th>
                  <th>分组</th>
                  <th>域名</th>
                  <th>最后使用</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="account in accounts" :key="account.id">
                  <td>{{ account.name }}</td>
                  <td>{{ account.username }}</td>
                  <td>{{ account.group || '-' }}</td>
                  <td>{{ account.domain || '所有域名' }}</td>
                  <td>{{ formatDate(account.lastUsed) }}</td>
                  <td>
                    <button @click="editAccount(account)" class="btn-small">编辑</button>
                    <button @click="deleteAccount(account.id)" class="btn-small btn-danger">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">
              <p>暂无账号数据</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 插件设置 -->
      <section class="section">
        <h2>插件设置</h2>

        <div class="setting-item">
          <label>
            <input
              v-model="settings.autoDetection"
              type="checkbox"
              @change="saveSettings"
            />
            自动检测登录页面
          </label>
          <p class="setting-description">
            自动识别登录页面并显示账号选择按钮
          </p>
        </div>

        <div class="setting-item">
          <label>
            <input
              v-model="settings.autoSubmit"
              type="checkbox"
              @change="saveSettings"
            />
            填入后自动提交表单
          </label>
          <p class="setting-description">
            选择账号后自动提交登录表单（延迟1秒）
          </p>
        </div>
      </section>

      <!-- 安全设置 -->
      <section class="section">
        <h2>安全设置</h2>

        <div class="setting-item">
          <div class="setting-header">
            <label>
              <input
                v-model="settings.encryptionEnabled"
                type="checkbox"
                @change="handleEncryptionToggle"
                :disabled="encryptionLoading"
              />
              启用数据加密
            </label>
            <span v-if="authStore.hasPassword" class="status-badge success">已设置主密码</span>
            <span v-else class="status-badge warning">未设置主密码</span>
          </div>
          <p class="setting-description">
            使用主密码加密存储的账号信息，提高数据安全性
          </p>

          <div v-if="settings.encryptionEnabled" class="encryption-controls">
            <button
              v-if="!authStore.hasPassword"
              @click="showSetMasterPassword = true"
              class="btn btn-primary"
            >
              设置主密码
            </button>

            <div v-else class="master-password-actions">
              <button @click="showChangeMasterPassword = true" class="btn btn-secondary">
                修改主密码
              </button>
              <button @click="showDisableEncryption = true" class="btn btn-danger">
                禁用加密
              </button>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <h4>快捷键</h4>
          <p class="setting-description">
            <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> - 在登录页面快速打开账号选择
          </p>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="section">
        <h2>数据管理</h2>
        
        <div class="danger-zone">
          <h3>危险操作</h3>
          <button @click="clearAllData" class="btn btn-danger">
            清除所有数据
          </button>
          <p class="warning-text">
            此操作将删除所有账号和设置，且无法恢复
          </p>
        </div>
      </section>
    </div>

    <!-- 添加/编辑账号模态框 -->
    <div v-if="showAddForm || editingAccount" class="modal-overlay" @click="closeForm">
      <div class="modal-content" @click.stop>
        <h3>{{ editingAccount ? '编辑账号' : '添加账号' }}</h3>
        <form @submit.prevent="saveAccount">
          <div class="form-group">
            <label>账号名称 *</label>
            <input 
              v-model="formData.name" 
              type="text" 
              required 
              placeholder="例如：测试账号1"
            />
          </div>
          
          <div class="form-group">
            <label>用户名 *</label>
            <input 
              v-model="formData.username" 
              type="text" 
              required 
              placeholder="用户名或邮箱"
            />
          </div>
          
          <div class="form-group">
            <label>密码 *</label>
            <input 
              v-model="formData.password" 
              type="password" 
              required 
              placeholder="密码"
            />
          </div>
          
          <div class="form-group">
            <label>分组</label>
            <input 
              v-model="formData.group" 
              type="text" 
              placeholder="例如：测试环境、生产环境"
            />
          </div>
          
          <div class="form-group">
            <label>适用域名</label>
            <input 
              v-model="formData.domain" 
              type="text" 
              placeholder="例如：example.com（留空表示所有域名）"
            />
          </div>
          
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn btn-secondary">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".json" 
      style="display: none" 
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { StorageService } from '@/shared/storage'
import type { Account, Settings } from '@/shared/types'

const accountStore = useAccountStore()
const authStore = useAuthStore()
const accounts = ref<Account[]>([])
const settings = ref<Settings>({
  autoDetection: true,
  autoSubmit: false,
  encryptionEnabled: false
})

const showAddForm = ref(false)
const editingAccount = ref<Account | null>(null)
const fileInput = ref<HTMLInputElement>()
const encryptionLoading = ref(false)
const showSetMasterPassword = ref(false)
const showChangeMasterPassword = ref(false)
const showDisableEncryption = ref(false)

const formData = ref({
  name: '',
  username: '',
  password: '',
  group: '',
  domain: ''
})

const loadData = async () => {
  try {
    // 先加载设置
    settings.value = await StorageService.getSettings()

    // 检查认证状态
    await authStore.checkMasterPassword()

    // 如果启用了加密但未认证，需要先认证
    if (settings.value.encryptionEnabled && authStore.hasPassword && !authStore.isAuthenticated) {
      console.log('Encryption enabled but not authenticated')
      accounts.value = []
      return
    }

    // 加载账号数据
    if (settings.value.encryptionEnabled && authStore.isAuthenticated) {
      accounts.value = await StorageService.getAccounts(authStore.masterPassword)
    } else {
      accounts.value = await StorageService.getAccounts()
    }
  } catch (error) {
    console.error('Failed to load data:', error)
    accounts.value = []
  }
}

const saveSettings = async () => {
  try {
    await StorageService.saveSettings(settings.value)
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

const editAccount = (account: Account) => {
  editingAccount.value = account
  formData.value = {
    name: account.name,
    username: account.username,
    password: account.password,
    group: account.group,
    domain: account.domain
  }
}

const deleteAccount = async (id: string) => {
  if (confirm('确定要删除这个账号吗？')) {
    try {
      await accountStore.deleteAccount(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }
}

const saveAccount = async () => {
  try {
    if (editingAccount.value) {
      await accountStore.updateAccount(editingAccount.value.id, formData.value)
    } else {
      await accountStore.addAccount(formData.value)
    }
    await loadData()
    closeForm()
  } catch (error) {
    console.error('Failed to save account:', error)
  }
}

const closeForm = () => {
  showAddForm.value = false
  editingAccount.value = null
  formData.value = {
    name: '',
    username: '',
    password: '',
    group: '',
    domain: ''
  }
}

const exportAccounts = () => {
  const data = {
    accounts: accounts.value,
    exportTime: new Date().toISOString(),
    version: '1.0'
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `account-helper-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importAccounts = () => {
  fileInput.value?.click()
}

const handleFileImport = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    if (data.accounts && Array.isArray(data.accounts)) {
      // 合并导入的账号
      const existingAccounts = await StorageService.getAccounts()
      const newAccounts = [...existingAccounts, ...data.accounts]
      
      await StorageService.saveAccounts(newAccounts)
      await loadData()
      
      alert(`成功导入 ${data.accounts.length} 个账号`)
    } else {
      alert('无效的导入文件格式')
    }
  } catch (error) {
    console.error('Import failed:', error)
    alert('导入失败，请检查文件格式')
  }
}

const clearAllData = async () => {
  if (confirm('确定要清除所有数据吗？此操作无法恢复！')) {
    if (confirm('请再次确认：这将删除所有账号和设置')) {
      try {
        await StorageService.clearAll()
        await loadData()
        alert('所有数据已清除')
      } catch (error) {
        console.error('Failed to clear data:', error)
        alert('清除数据失败')
      }
    }
  }
}

const handleEncryptionToggle = async () => {
  if (settings.value.encryptionEnabled) {
    // 启用加密
    if (!authStore.hasPassword) {
      showSetMasterPassword.value = true
    }
  } else {
    // 禁用加密
    if (authStore.hasPassword) {
      if (confirm('禁用加密将使用明文存储账号信息，确定继续吗？')) {
        try {
          encryptionLoading.value = true
          // 需要当前密码来禁用加密
          const password = prompt('请输入当前主密码以禁用加密：')
          if (password) {
            await authStore.disableEncryption(password)
            await loadData()
          } else {
            settings.value.encryptionEnabled = true // 回滚
          }
        } catch (error) {
          console.error('Failed to disable encryption:', error)
          alert('禁用加密失败：' + (error as Error).message)
          settings.value.encryptionEnabled = true // 回滚
        } finally {
          encryptionLoading.value = false
        }
      } else {
        settings.value.encryptionEnabled = true // 回滚
      }
    }
  }
  await saveSettings()
}

const requestAuthentication = async () => {
  const password = prompt('请输入主密码：')
  if (password) {
    try {
      await authStore.authenticate(password)
      await loadData()
    } catch (error) {
      alert('密码错误：' + (error as Error).message)
    }
  }
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return '从未使用'
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.options-container {
  min-height: 100vh;
}

.options-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  text-align: center;
}

.options-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.options-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.options-content {
  padding: 32px;
}

.section {
  margin-bottom: 48px;
}

.section h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

.section-actions {
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  cursor: pointer;
}

.btn-small:hover {
  background-color: #e9ecef;
}

.accounts-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.accounts-table th,
.accounts-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.accounts-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.no-data {
  text-align: center;
  padding: 48px;
  color: #6c757d;
}

.auth-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 24px;
  margin-bottom: 24px;
}

.warning-content {
  text-align: center;
}

.warning-content p {
  margin: 0 0 16px 0;
  color: #856404;
  font-size: 16px;
}

.setting-item {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.setting-item label {
  display: flex;
  align-items: center;
  font-weight: 500;
  cursor: pointer;
}

.setting-item input[type="checkbox"] {
  margin-right: 8px;
  transform: scale(1.2);
}

.setting-description {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #6c757d;
}

.danger-zone {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 24px;
}

.danger-zone h3 {
  margin: 0 0 16px 0;
  color: #c53030;
  font-size: 16px;
}

.warning-text {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #c53030;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 32px;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 24px 0;
  font-size: 18px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
}
</style>
