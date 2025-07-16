<template>
  <div class="auth-modal-overlay">
    <div class="auth-modal">
      <div class="auth-header">
        <h3>{{ isSetup ? '设置主密码' : '输入主密码' }}</h3>
        <p class="auth-description">
          {{ isSetup ? '设置主密码以加密保护您的账号信息' : '请输入主密码以访问您的账号' }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="isSetup" class="form-group">
          <label>主密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="至少8位，包含大小写字母、数字和特殊字符"
            required 
            class="form-input"
            :class="{ 'error': passwordError }"
          />
          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          
          <!-- 密码强度指示器 -->
          <div v-if="password" class="password-strength">
            <div class="strength-bar">
              <div 
                class="strength-fill" 
                :style="{ width: strengthPercentage + '%' }"
                :class="strengthClass"
              ></div>
            </div>
            <div class="strength-text">
              密码强度: {{ strengthText }}
            </div>
            <ul v-if="strengthFeedback.length > 0" class="strength-feedback">
              <li v-for="feedback in strengthFeedback" :key="feedback">{{ feedback }}</li>
            </ul>
          </div>
        </div>

        <div v-if="isSetup" class="form-group">
          <label>确认密码</label>
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="再次输入密码"
            required 
            class="form-input"
            :class="{ 'error': confirmError }"
          />
          <div v-if="confirmError" class="error-message">{{ confirmError }}</div>
        </div>

        <div v-if="!isSetup" class="form-group">
          <label>主密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="输入主密码"
            required 
            class="form-input"
            :class="{ 'error': authError }"
          />
          <div v-if="authError" class="error-message">{{ authError }}</div>
        </div>

        <div class="form-actions">
          <button 
            type="button" 
            @click="$emit('cancel')" 
            class="btn btn-secondary"
            :disabled="loading"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            {{ loading ? '处理中...' : (isSetup ? '设置密码' : '解锁') }}
          </button>
        </div>
      </form>

      <div v-if="!isSetup" class="auth-footer">
        <button @click="showSetup" class="link-button">
          忘记密码？重新设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { CryptoService } from '@/shared/crypto'

interface Props {
  isSetup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSetup: false
})

const emit = defineEmits<{
  success: []
  cancel: []
  setup: []
}>()

const authStore = useAuthStore()

const password = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const confirmError = ref('')
const authError = ref('')
const loading = ref(false)

// 密码强度验证
const passwordStrength = computed(() => {
  if (!password.value) return { isValid: false, score: 0, feedback: [] }
  return CryptoService.validatePasswordStrength(password.value)
})

const strengthPercentage = computed(() => {
  return (passwordStrength.value.score / 5) * 100
})

const strengthClass = computed(() => {
  const score = passwordStrength.value.score
  if (score <= 2) return 'weak'
  if (score <= 3) return 'medium'
  return 'strong'
})

const strengthText = computed(() => {
  const score = passwordStrength.value.score
  if (score <= 2) return '弱'
  if (score <= 3) return '中等'
  return '强'
})

const strengthFeedback = computed(() => {
  return passwordStrength.value.feedback
})

const isFormValid = computed(() => {
  if (props.isSetup) {
    return passwordStrength.value.isValid && 
           password.value === confirmPassword.value &&
           !passwordError.value && 
           !confirmError.value
  } else {
    return password.value.length > 0
  }
})

// 监听密码变化
watch(password, () => {
  passwordError.value = ''
  authError.value = ''
})

watch(confirmPassword, () => {
  confirmError.value = ''
  if (confirmPassword.value && password.value !== confirmPassword.value) {
    confirmError.value = '两次输入的密码不一致'
  }
})

const handleSubmit = async () => {
  loading.value = true
  
  try {
    if (props.isSetup) {
      // 设置主密码
      if (!passwordStrength.value.isValid) {
        passwordError.value = '密码强度不足'
        return
      }
      
      if (password.value !== confirmPassword.value) {
        confirmError.value = '两次输入的密码不一致'
        return
      }
      
      await authStore.setMasterPassword(password.value)
      emit('success')
    } else {
      // 验证主密码
      await authStore.authenticate(password.value)
      emit('success')
    }
  } catch (error) {
    if (props.isSetup) {
      passwordError.value = error.message
    } else {
      authError.value = error.message
    }
  } finally {
    loading.value = false
  }
}

const showSetup = () => {
  emit('setup')
}
</script>

<style scoped>
.auth-modal-overlay {
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

.auth-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.auth-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.auth-description {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
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

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input.error {
  border-color: #dc3545;
}

.error-message {
  margin-top: 4px;
  color: #dc3545;
  font-size: 12px;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-fill.weak {
  background-color: #dc3545;
}

.strength-fill.medium {
  background-color: #ffc107;
}

.strength-fill.strong {
  background-color: #28a745;
}

.strength-text {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.strength-feedback {
  margin: 4px 0 0 0;
  padding: 0;
  list-style: none;
}

.strength-feedback li {
  font-size: 11px;
  color: #dc3545;
  margin-bottom: 2px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.auth-footer {
  margin-top: 16px;
  text-align: center;
}

.link-button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
}

.link-button:hover {
  color: #0056b3;
}
</style>
