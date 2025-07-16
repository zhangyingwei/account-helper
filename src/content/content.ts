import type { Account, LoginDetectionResult, ChromeMessage } from '@/shared/types'
import { LoginDetector } from './detector'
import { FormInjector } from './injector'

class ContentScript {
  private detector: LoginDetector
  private injector: FormInjector
  private isInitialized = false

  constructor() {
    this.detector = new LoginDetector()
    this.injector = new FormInjector()
    this.init()
  }

  private init() {
    if (this.isInitialized) return
    
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(message, sendResponse)
      return true // 保持消息通道开放
    })

    // 页面加载完成后检测登录表单
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.detectAndInject())
    } else {
      this.detectAndInject()
    }

    // 监听 DOM 变化（用于 SPA 应用）
    this.observePageChanges()

    // 监听键盘快捷键
    this.setupKeyboardShortcuts()

    this.isInitialized = true
  }

  private async detectAndInject() {
    try {
      const detection = this.detector.detectLoginPage()
      
      if (detection.isLoginPage) {
        console.log('Login page detected')
        await this.injector.injectHelperButtons(detection)
      }
    } catch (error) {
      console.error('Error in detectAndInject:', error)
    }
  }

  private handleMessage(message: ChromeMessage, sendResponse: (response?: any) => void) {
    switch (message.action) {
      case 'fillAccount':
        if (message.account) {
          this.fillAccountInfo(message.account)
          sendResponse({ success: true })
        }
        break
      
      case 'detectLogin':
        const detection = this.detector.detectLoginPage()
        sendResponse({ detection })
        break
      
      default:
        sendResponse({ error: 'Unknown action' })
    }
  }

  private async fillAccountInfo(account: Account) {
    try {
      const detection = this.detector.detectLoginPage()

      if (detection.usernameField && detection.passwordField) {
        // 填入用户名
        this.setInputValue(detection.usernameField, account.username)

        // 填入密码
        this.setInputValue(detection.passwordField, account.password)

        // 触发输入事件
        this.triggerInputEvents(detection.usernameField)
        this.triggerInputEvents(detection.passwordField)

        console.log('Account info filled successfully')

        // 检查是否需要自动提交
        await this.checkAutoSubmit(detection)
      } else {
        console.warn('Login fields not found')
      }
    } catch (error) {
      console.error('Error filling account info:', error)
    }
  }

  private async checkAutoSubmit(detection: LoginDetectionResult) {
    try {
      // 获取设置
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getSettings' }, resolve)
      })

      const settings = response?.settings
      if (settings?.autoSubmit && detection.form) {
        // 延迟提交，给用户一点时间看到填入的内容
        setTimeout(() => {
          this.submitForm(detection.form!)
        }, 1000)
      }
    } catch (error) {
      console.error('Error checking auto submit:', error)
    }
  }

  private submitForm(form: HTMLFormElement) {
    try {
      // 查找提交按钮
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement

      if (submitButton) {
        // 点击提交按钮
        submitButton.click()
      } else {
        // 直接提交表单
        form.submit()
      }

      console.log('Form submitted automatically')
    } catch (error) {
      console.error('Error submitting form:', error)
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

  private observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 检查是否有新的表单元素添加
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.tagName === 'FORM' || 
                  element.querySelector('form') ||
                  element.querySelector('input[type="password"]')) {
                shouldRecheck = true
              }
            }
          })
        }
      })
      
      if (shouldRecheck) {
        // 延迟检测，避免频繁触发
        setTimeout(() => this.detectAndInject(), 500)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Shift + A 触发账号选择
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        this.triggerAccountSelection()
      }
    })
  }

  private triggerAccountSelection() {
    try {
      const detection = this.detector.detectLoginPage()

      if (detection.isLoginPage && detection.usernameField) {
        // 查找已注入的账号选择按钮
        const container = detection.usernameField.parentElement?.querySelector('.account-helper-container')
        const triggerButton = container?.querySelector('.account-helper-trigger') as HTMLElement

        if (triggerButton) {
          triggerButton.click()
        } else {
          console.log('Account helper button not found')
        }
      }
    } catch (error) {
      console.error('Error triggering account selection:', error)
    }
  }
}

// 初始化 content script
new ContentScript()
