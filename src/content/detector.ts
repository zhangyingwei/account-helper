import type { LoginDetectionResult } from '@/shared/types'

export class LoginDetector {
  private readonly LOGIN_URL_PATTERNS = [
    /login/i,
    /signin/i,
    /auth/i,
    /sso/i,
    /登录/,
    /登陆/
  ]

  private readonly LOGIN_TITLE_PATTERNS = [
    /login/i,
    /sign in/i,
    /登录/,
    /登陆/,
    /authentication/i
  ]

  private readonly USERNAME_SELECTORS = [
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="account"]',
    'input[type="text"][name*="login"]',
    'input[type="email"]',
    'input[id*="user"]',
    'input[id*="account"]',
    'input[id*="login"]',
    'input[placeholder*="用户名"]',
    'input[placeholder*="账号"]',
    'input[placeholder*="邮箱"]',
    'input[placeholder*="username"]',
    'input[placeholder*="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[name="account"]',
    'input[name="user"]'
  ]

  private readonly PASSWORD_SELECTORS = [
    'input[type="password"]',
    'input[name*="pass"]',
    'input[name*="pwd"]',
    'input[id*="pass"]',
    'input[id*="pwd"]',
    'input[placeholder*="密码"]',
    'input[placeholder*="password"]'
  ]

  detectLoginPage(): LoginDetectionResult {
    const result: LoginDetectionResult = {
      isLoginPage: false
    }

    // 检查是否存在密码输入框
    const passwordField = this.findPasswordField()
    if (!passwordField) {
      return result
    }

    // 检查是否存在用户名输入框
    const usernameField = this.findUsernameField(passwordField)
    if (!usernameField) {
      return result
    }

    // 找到表单
    const form = this.findForm(passwordField, usernameField)

    // 进行多重验证
    const isLoginPage = this.validateLoginPage(passwordField, usernameField, form)

    if (isLoginPage) {
      result.isLoginPage = true
      result.usernameField = usernameField
      result.passwordField = passwordField
      result.form = form || undefined
    }

    return result
  }

  private findPasswordField(): HTMLInputElement | null {
    for (const selector of this.PASSWORD_SELECTORS) {
      const field = document.querySelector(selector) as HTMLInputElement
      if (field && this.isVisible(field)) {
        return field
      }
    }
    return null
  }

  private findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
    // 首先在密码字段的表单内查找
    const form = passwordField.closest('form')
    
    for (const selector of this.USERNAME_SELECTORS) {
      let field: HTMLInputElement | null = null
      
      if (form) {
        field = form.querySelector(selector) as HTMLInputElement
      } else {
        field = document.querySelector(selector) as HTMLInputElement
      }
      
      if (field && this.isVisible(field) && field !== passwordField) {
        return field
      }
    }

    // 如果没找到，尝试查找密码字段附近的文本输入框
    return this.findNearbyUsernameField(passwordField)
  }

  private findNearbyUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
    const container = passwordField.closest('div, section, main, form') || document.body
    const textInputs = container.querySelectorAll('input[type="text"], input[type="email"], input:not([type])') as NodeListOf<HTMLInputElement>
    
    for (const input of textInputs) {
      if (this.isVisible(input) && input !== passwordField) {
        return input
      }
    }
    
    return null
  }

  private findForm(passwordField: HTMLInputElement, usernameField: HTMLInputElement): HTMLFormElement | null {
    // 尝试找到包含这两个字段的表单
    const passwordForm = passwordField.closest('form')
    const usernameForm = usernameField.closest('form')
    
    if (passwordForm && passwordForm === usernameForm) {
      return passwordForm
    }
    
    if (passwordForm) {
      return passwordForm
    }
    
    if (usernameForm) {
      return usernameForm
    }
    
    return null
  }

  private validateLoginPage(
    passwordField: HTMLInputElement, 
    usernameField: HTMLInputElement, 
    form: HTMLFormElement | null
  ): boolean {
    let score = 0

    // 基础分数：找到了用户名和密码字段
    score += 3

    // URL 检查
    if (this.LOGIN_URL_PATTERNS.some(pattern => pattern.test(window.location.href))) {
      score += 2
    }

    // 页面标题检查
    if (this.LOGIN_TITLE_PATTERNS.some(pattern => pattern.test(document.title))) {
      score += 2
    }

    // 表单 action 检查
    if (form && form.action) {
      if (this.LOGIN_URL_PATTERNS.some(pattern => pattern.test(form.action))) {
        score += 1
      }
    }

    // 页面内容检查
    const pageText = document.body.innerText.toLowerCase()
    if (pageText.includes('login') || pageText.includes('sign in') || 
        pageText.includes('登录') || pageText.includes('登陆')) {
      score += 1
    }

    // 字段属性检查
    if (this.hasLoginRelatedAttributes(usernameField)) {
      score += 1
    }

    if (this.hasLoginRelatedAttributes(passwordField)) {
      score += 1
    }

    // 分数阈值判断
    return score >= 4
  }

  private hasLoginRelatedAttributes(field: HTMLInputElement): boolean {
    const attributes = ['name', 'id', 'placeholder', 'class']
    const loginKeywords = ['user', 'account', 'login', 'email', 'pass', 'pwd', '用户', '账号', '密码']
    
    return attributes.some(attr => {
      const value = field.getAttribute(attr)
      if (value) {
        return loginKeywords.some(keyword => 
          value.toLowerCase().includes(keyword.toLowerCase())
        )
      }
      return false
    })
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0
  }
}
