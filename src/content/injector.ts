import type { LoginDetectionResult, Account } from '@/shared/types'

export class FormInjector {
  private injectedElements: Set<HTMLElement> = new Set()
  private currentDetection: LoginDetectionResult | null = null

  async injectHelperButtons(detection: LoginDetectionResult) {
    this.currentDetection = detection
    if (!detection.usernameField || !detection.passwordField) {
      return
    }

    // 避免重复注入
    if (this.isAlreadyInjected(detection.usernameField)) {
      return
    }

    try {
      // 获取当前域名的账号列表
      const accounts = await this.getAccountsForCurrentDomain()
      
      if (accounts.length === 0) {
        return
      }

      // 在用户名字段旁边注入选择按钮
      this.injectAccountSelector(detection.usernameField, accounts)
      
    } catch (error) {
      console.error('Error injecting helper buttons:', error)
    }
  }

  private async getAccountsForCurrentDomain(): Promise<Account[]> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getAccountsForDomain', data: { domain: window.location.hostname } },
        (response) => {
          if (response?.requiresAuth) {
            // 如果需要认证，暂时返回空数组
            // 在实际应用中，这里可以显示一个认证提示
            console.log('Encryption enabled - authentication required')
            resolve([])
          } else {
            resolve(response?.accounts || [])
          }
        }
      )
    })
  }

  private injectAccountSelector(usernameField: HTMLInputElement, accounts: Account[]) {
    // 创建容器
    const container = this.createSelectorContainer()
    
    // 创建触发按钮
    const triggerButton = this.createTriggerButton()
    
    // 创建下拉菜单
    const dropdown = this.createDropdown(accounts)
    
    container.appendChild(triggerButton)
    container.appendChild(dropdown)
    
    // 插入到用户名字段旁边
    this.insertBesideField(usernameField, container)
    
    // 绑定事件
    this.bindEvents(triggerButton, dropdown, accounts)
    
    // 记录已注入的元素
    this.injectedElements.add(container)
  }

  private createSelectorContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'account-helper-container'
    container.style.cssText = `
      position: relative;
      display: inline-block;
      margin-left: 8px;
      z-index: 10000;
    `
    return container
  }

  private createTriggerButton(): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'account-helper-trigger'
    button.innerHTML = '👤'
    button.title = '选择账号'
    button.style.cssText = `
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `
    
    // 悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f8f9fa'
      button.style.borderColor = '#007bff'
    })
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'white'
      button.style.borderColor = '#ddd'
    })
    
    return button
  }

  private createDropdown(accounts: Account[]): HTMLDivElement {
    const dropdown = document.createElement('div')
    dropdown.className = 'account-helper-dropdown'
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 200px;
      max-width: 300px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      z-index: 10001;
      max-height: 300px;
      overflow-y: auto;
    `
    
    // 添加账号选项
    accounts.forEach(account => {
      const option = this.createAccountOption(account)
      dropdown.appendChild(option)
    })
    
    return dropdown
  }

  private createAccountOption(account: Account): HTMLDivElement {
    const option = document.createElement('div')
    option.className = 'account-helper-option'
    option.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s;
    `
    
    option.innerHTML = `
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${this.escapeHtml(account.name)}</div>
      <div style="font-size: 12px; color: #666;">${this.escapeHtml(account.username)}</div>
      ${account.group ? `<div style="font-size: 11px; color: #999; margin-top: 2px;">${this.escapeHtml(account.group)}</div>` : ''}
    `
    
    // 悬停效果
    option.addEventListener('mouseenter', () => {
      option.style.backgroundColor = '#f8f9fa'
    })
    
    option.addEventListener('mouseleave', () => {
      option.style.backgroundColor = 'white'
    })
    
    // 点击事件
    option.addEventListener('click', () => {
      this.selectAccount(account)
    })
    
    return option
  }

  private bindEvents(triggerButton: HTMLButtonElement, dropdown: HTMLDivElement, accounts: Account[]) {
    // 点击按钮显示/隐藏下拉菜单
    triggerButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const isVisible = dropdown.style.display === 'block'
      
      // 隐藏所有其他下拉菜单
      this.hideAllDropdowns()
      
      if (!isVisible) {
        dropdown.style.display = 'block'
      }
    })
    
    // 点击页面其他地方隐藏下拉菜单
    document.addEventListener('click', (e) => {
      if (!triggerButton.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        dropdown.style.display = 'none'
      }
    })
  }

  private selectAccount(account: Account) {
    // 直接填入账号信息
    this.fillAccountInfo(account)

    // 隐藏下拉菜单
    this.hideAllDropdowns()
  }

  private fillAccountInfo(account: Account) {
    if (!this.currentDetection?.usernameField || !this.currentDetection?.passwordField) {
      console.warn('Login fields not found')
      return
    }

    try {
      // 填入用户名
      this.setInputValue(this.currentDetection.usernameField, account.username)

      // 填入密码
      this.setInputValue(this.currentDetection.passwordField, account.password)

      // 触发输入事件
      this.triggerInputEvents(this.currentDetection.usernameField)
      this.triggerInputEvents(this.currentDetection.passwordField)

      console.log('Account info filled successfully')

      // 通知 background script 更新最后使用时间
      chrome.runtime.sendMessage({
        action: 'updateLastUsed',
        data: { accountId: account.id }
      })
    } catch (error) {
      console.error('Error filling account info:', error)
    }
  }

  private setInputValue(input: HTMLInputElement, value: string) {
    // 使用多种方式设置值以确保兼容性
    input.value = value
    input.setAttribute('value', value)

    // 对于 React 等框架，需要触发原生事件
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value)
    }
  }

  private triggerInputEvents(input: HTMLInputElement) {
    // 触发多种事件以确保框架能够检测到变化
    const events = ['input', 'change', 'keyup', 'keydown']

    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true })
      input.dispatchEvent(event)
    })
  }

  private insertBesideField(field: HTMLInputElement, container: HTMLElement) {
    const parent = field.parentElement
    if (!parent) {
      return
    }
    
    // 尝试不同的插入策略
    if (field.nextSibling) {
      parent.insertBefore(container, field.nextSibling)
    } else {
      parent.appendChild(container)
    }
  }

  private hideAllDropdowns() {
    const dropdowns = document.querySelectorAll('.account-helper-dropdown')
    dropdowns.forEach(dropdown => {
      (dropdown as HTMLElement).style.display = 'none'
    })
  }

  private isAlreadyInjected(field: HTMLInputElement): boolean {
    const parent = field.parentElement
    if (!parent) {
      return false
    }
    
    return parent.querySelector('.account-helper-container') !== null
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // 清理注入的元素
  cleanup() {
    this.injectedElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element)
      }
    })
    this.injectedElements.clear()
  }
}
