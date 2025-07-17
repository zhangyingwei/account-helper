<template>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Account Helper</h1>
      <button @click="openOptions" class="options-btn">⚙️</button>
    </header>
    
    <div class="search-section">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索账号..." 
        class="search-input"
      />
    </div>

    <!-- 认证状态提示 -->
    <div v-if="authStore.hasPassword && !authStore.isAuthenticated" class="auth-status">
      <div class="auth-warning">
        <p>🔒 需要输入主密码才能访问账号</p>
        <button @click="showAuthModal = true" class="unlock-btn">解锁</button>
      </div>
    </div>

    <div v-else class="accounts-section">
      <!-- 顶部操作栏 -->
      <!-- <div class="top-actions">
        <button @click="showAddForm = true" class="add-btn">+ 添加账号</button>
        <button @click="forceRefresh" class="refresh-btn" title="刷新账号列表">🔄</button>
      </div> -->

      <!-- 调试信息 -->
      <div class="debug-info" style="background: #f0f0f0; padding: 4px 8px; margin-bottom: 8px; font-size: 11px; border-radius: 4px;">
        账号: {{ accounts.length }} | 过滤: {{ filteredAccounts.length }} | 搜索: "{{ searchQuery }}"
      </div>

      <div v-if="filteredAccounts.length === 0" class="no-accounts">
        <p>暂无账号数据</p>
        <p class="hint">点击下方"添加账号"按钮开始使用</p>
      </div>
      
      <div v-else class="accounts-list">
        <!-- 按分组展示账号 -->
        <div v-for="group in groupedAccounts" :key="group.name" class="account-group-section">
          <div class="group-header">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">({{ group.accounts.length }})</span>
          </div>
          <div class="group-accounts">
            <div
              v-for="account in group.accounts"
              :key="account.id"
              class="account-item"
              @click="selectAccount(account)"
            >
              <div class="account-info">
                <div class="account-name">{{ account.name }}</div>
                <div class="account-username">{{ account.username }}</div>
                <div v-if="account.domain" class="account-domain">{{ account.domain }}</div>
              </div>
              <div class="account-actions">
                <button @click.stop="editAccount(account)" class="edit-btn" title="编辑">✏️</button>
                <button @click.stop="deleteAccount(account.id)" class="delete-btn" title="删除">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-section">
      <button @click="showAddForm = true" class="add-account-btn">
        + 添加账号
      </button>
    </div>

    <!-- 添加/编辑账号表单 -->
    <div v-if="showAddForm || editingAccount" class="modal-overlay" @click="closeForm">
      <div class="modal-content" @click.stop>
        <h3>{{ editingAccount ? '编辑账号' : '添加账号' }}</h3>
        <form @submit.prevent="saveAccount">
          <input 
            v-model="formData.name" 
            type="text" 
            placeholder="账号名称" 
            required 
            class="form-input"
          />
          <input 
            v-model="formData.username" 
            type="text" 
            placeholder="用户名" 
            required 
            class="form-input"
          />
          <input 
            v-model="formData.password" 
            type="password" 
            placeholder="密码" 
            required 
            class="form-input"
          />
          <input 
            v-model="formData.group" 
            type="text" 
            placeholder="分组 (可选)" 
            class="form-input"
          />
          <input 
            v-model="formData.domain" 
            type="text" 
            placeholder="适用域名 (可选)" 
            class="form-input"
          />
          <div class="form-actions">
            <button type="button" @click="closeForm" class="cancel-btn">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 认证模态框 -->
    <AuthModal
      v-if="showAuthModal"
      :is-setup="authModalSetup"
      @success="handleAuthSuccess"
      @cancel="handleAuthCancel"
      @setup="handleAuthSetup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import type { Account } from '@/shared/types'
import AuthModal from './components/AuthModal.vue'

const accountStore = useAccountStore()
const authStore = useAuthStore()
const { accounts } = storeToRefs(accountStore)
const searchQuery = ref('')
const showAddForm = ref(false)
const editingAccount = ref<Account | null>(null)
const showAuthModal = ref(false)
const authModalSetup = ref(false)

const formData = ref({
  name: '',
  username: '',
  password: '',
  group: '',
  domain: ''
})

const filteredAccounts = computed(() => {
  if (!searchQuery.value) {
    return accounts.value
  }
  return accounts.value.filter(account =>
    account.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    account.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (account.group && account.group.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    (account.domain && account.domain.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
})

// 按分组整理账号
const groupedAccounts = computed(() => {
  const groups = new Map<string, any[]>()

  // 将账号按分组分类
  filteredAccounts.value.forEach(account => {
    const groupName = account.group || '未分组'
    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }
    groups.get(groupName)!.push(account)
  })

  // 转换为数组并排序
  const result = Array.from(groups.entries()).map(([name, accounts]) => ({
    name,
    accounts: accounts.sort((a, b) => a.name.localeCompare(b.name))
  }))

  // 分组排序：未分组放最后，其他按名称排序
  return result.sort((a, b) => {
    if (a.name === '未分组') return 1
    if (b.name === '未分组') return -1
    return a.name.localeCompare(b.name)
  })
})

const selectAccount = async (account: Account) => {
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab.id) {
      // 向 content script 发送填入账号信息的消息
      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillAccount',
        account: account
      })
      // 更新最后使用时间
      accountStore.updateLastUsed(account.id)
      // 关闭弹窗
      window.close()
    }
  } catch (error) {
    console.error('Failed to fill account:', error)
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
      // 删除成功后重新加载账号列表
      await accountStore.loadAccounts()
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('删除账号失败：' + (error as Error).message)
    }
  }
}

const saveAccount = async () => {
  try {
    console.log('Saving account with form data:', formData.value)

    // 基本表单验证
    if (!formData.value.name.trim()) {
      alert('请输入账号名称')
      return
    }
    if (!formData.value.username.trim()) {
      alert('请输入用户名')
      return
    }
    if (!formData.value.password.trim()) {
      alert('请输入密码')
      return
    }

    if (editingAccount.value) {
      console.log('Updating existing account:', editingAccount.value.id)
      await accountStore.updateAccount(editingAccount.value.id, formData.value)
    } else {
      console.log('Adding new account')
      await accountStore.addAccount(formData.value)
    }

    console.log('Account operation completed')
    // 不需要重新加载，因为store中的数据已经更新
    // await accountStore.loadAccounts()
    console.log('Current accounts in store:', accountStore.accounts.length)
    closeForm()
  } catch (error) {
    console.error('Failed to save account:', error)
    alert('保存账号失败：' + (error as Error).message)
  }
}

const forceRefresh = async () => {
  console.log('Force refreshing accounts...')
  await accountStore.loadAccounts()
  console.log('Force refresh completed, accounts:', accountStore.accounts.length)
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

const openOptions = () => {
  chrome.runtime.openOptionsPage()
}

const checkAuthAndLoadAccounts = async () => {
  await authStore.checkMasterPassword()

  if (authStore.hasPassword && !authStore.isAuthenticated) {
    showAuthModal.value = true
    authModalSetup.value = false
  } else if (!authStore.hasPassword) {
    // 首次使用，可以选择是否设置主密码
    await accountStore.loadAccounts()
  } else {
    // 已认证，加载账号
    await accountStore.loadAccounts()
  }
}

const handleAuthSuccess = async () => {
  showAuthModal.value = false
  await accountStore.loadAccounts()
}

const handleAuthCancel = () => {
  showAuthModal.value = false
  // 可以选择关闭弹窗或显示无认证状态
}

const handleAuthSetup = () => {
  authModalSetup.value = true
}

onMounted(() => {
  checkAuthAndLoadAccounts()
})
</script>

<style scoped>
.popup-container {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.popup-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.options-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.options-btn:hover {
  background-color: #f0f0f0;
}

.search-section {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
}

.auth-status {
  margin-bottom: 16px;
}

.auth-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.auth-warning p {
  margin: 0 0 12px 0;
  color: #856404;
  font-size: 14px;
}

.unlock-btn {
  background-color: #ffc107;
  color: #212529;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.unlock-btn:hover {
  background-color: #e0a800;
}

.top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.refresh-btn {
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  min-width: 32px;
  height: 32px;
}

.refresh-btn:hover {
  background: #5a6268;
}

.no-accounts {
  text-align: center;
  padding: 32px 16px;
  color: #666;
}

.no-accounts .hint {
  font-size: 12px;
  color: #adb5bd;
  margin-top: 8px;
}

.accounts-list {
  max-height: 300px;
  overflow-y: auto;
}

.account-group-section {
  margin-bottom: 16px;
}

.account-group-section:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #e9ecef;
  border-radius: 4px;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
  color: #495057;
}

.group-name {
  flex: 1;
}

.group-count {
  font-size: 12px;
  color: #6c757d;
  font-weight: normal;
}

.group-accounts {
  padding-left: 8px;
}

.account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.account-item:hover {
  background-color: #f8f9fa;
}

.account-info {
  flex: 1;
}

.account-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.account-username {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.account-domain {
  font-size: 11px;
  color: #28a745;
  background-color: #d4edda;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
  border: 1px solid #c3e6cb;
}

.account-group {
  font-size: 11px;
  color: #999;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
}

.account-actions {
  display: flex;
  gap: 4px;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
}

.edit-btn:hover {
  background-color: #e3f2fd;
}

.delete-btn:hover {
  background-color: #ffebee;
}

.actions-section {
  margin-top: 16px;
}

.add-account-btn, .add-btn {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-account-btn:hover, .add-btn:hover {
  background-color: #0056b3;
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
  padding: 24px;
  border-radius: 8px;
  width: 300px;
  max-width: 90vw;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.save-btn:hover {
  background-color: #0056b3;
}
</style>
