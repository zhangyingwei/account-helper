# Vue Chrome 插件开发需求文档 - 登录助手

## 项目概述

创建一个基于 Vue 框架的 Chrome 浏览器扩展插件，用于辅助系统测试时的多账号登录操作。插件能够自动识别登录页面，并提供快速填入预设账号密码的功能。

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **开发语言**: JavaScript/TypeScript
- **样式**: CSS/SCSS
- **包管理**: npm/yarn

## 功能需求

### 核心功能

#### 1. 登录页面自动识别
- [ ] 自动检测当前页面是否为登录页面
- [ ] 识别常见的登录表单元素（用户名、密码输入框）
- [ ] 支持多种登录页面布局和命名规范

#### 2. 输入框识别与定位
- [ ] 自动识别用户名输入框（支持 input[type="text"], input[type="email"], input[name="username"] 等）
- [ ] 自动识别密码输入框（支持 input[type="password"] 等）
- [ ] 处理动态加载的表单元素

#### 3. 账号密码管理
- [ ] 账号密码的增删改查功能
- [ ] 支持多组账号密码存储
- [ ] 账号分组管理（如：测试环境、开发环境）
- [ ] 数据加密存储

#### 4. 快速填入功能
- [ ] 在识别到的输入框旁边添加选择按钮
- [ ] 点击按钮显示账号列表下拉菜单
- [ ] 选择账号后自动填入用户名和密码
- [ ] 支持一键填入并提交表单

#### 5. 用户界面
- [ ] 简洁直观的账号管理界面
- [ ] 账号列表的搜索和筛选功能
- [ ] 导入/导出账号数据功能

### 插件组件

- [x] **Content Script**: 注入到网页中，识别登录表单并添加辅助按钮
- [x] **Popup 弹窗**: 账号密码管理界面
- [x] **Background Script**: 数据存储和页面通信
- [x] **Options 页面**: 插件设置和高级配置

## 技术要求

### Vue 相关
- 使用 Vue 3 Composition API
- 支持 Single File Components (SFC)
- 响应式数据管理
- 组件化开发（账号列表、表单组件等）

### Chrome 扩展 API
- Manifest V3 规范
- Content Scripts 权限
- 存储 API（chrome.storage.sync）
- 标签页 API（chrome.tabs）
- 活动标签页权限（activeTab）

### 页面识别技术
- DOM 元素选择器匹配
- 表单字段智能识别
- 页面 URL 模式匹配
- 动态内容监听（MutationObserver）

### 数据安全
- 本地数据加密存储
- 敏感信息保护
- 权限最小化原则

### 开发环境
- 热重载开发环境
- 代码格式化和检查（ESLint + Prettier）
- 构建和打包流程

## 详细功能规格

### 1. 登录页面识别算法
```
识别条件（满足任一即可）：
- 页面包含密码输入框 + 用户名相关输入框
- 页面 URL 包含关键词：login, signin, auth
- 页面标题包含：登录, 登陆, Login, Sign in
- 表单 action 包含登录相关路径
```

### 2. 输入框识别规则
```
用户名输入框：
- input[type="text"][name*="user"]
- input[type="text"][name*="account"]
- input[type="email"]
- input[id*="user"], input[id*="account"]
- input[placeholder*="用户名"], input[placeholder*="账号"]

密码输入框：
- input[type="password"]
- input[name*="pass"], input[name*="pwd"]
- input[id*="pass"], input[id*="pwd"]
```

### 3. 用户交互流程
1. 用户访问登录页面
2. 插件自动识别并在输入框旁添加选择按钮
3. 用户点击按钮，显示已保存的账号列表
4. 用户选择目标账号
5. 插件自动填入用户名和密码
6. 可选：自动提交表单

### 4. 数据结构设计
```javascript
// 账号数据结构
{
  id: string,
  name: string,        // 账号显示名称
  username: string,    // 用户名
  password: string,    // 密码（加密存储）
  group: string,       // 分组
  domain: string,      // 适用域名
  createTime: number,
  lastUsed: number
}
```

## 项目结构

```
chrome-extension-vue/
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── content.css
├── src/
│   ├── popup/
│   │   ├── Popup.vue
│   │   ├── components/
│   │   │   ├── AccountList.vue
│   │   │   ├── AccountForm.vue
│   │   │   └── AccountItem.vue
│   │   └── main.js
│   ├── content/
│   │   ├── content.js
│   │   ├── detector.js
│   │   └── injector.js
│   ├── background/
│   │   └── background.js
│   ├── options/
│   │   ├── Options.vue
│   │   └── main.js
│   └── shared/
│       ├── storage.js
│       ├── crypto.js
│       └── constants.js
├── dist/
└── package.json
```

## 开发计划

### 阶段一：项目搭建（1-2天）
- [x] 初始化 Vue + Vite 项目
- [x] 配置 Chrome 扩展开发环境
- [x] 设置基础项目结构
- [ ] 配置 Manifest V3

### 阶段二：核心功能开发（5-7天）
- [ ] 实现登录页面识别算法
- [ ] 开发输入框定位功能
- [ ] 创建 Content Script 注入逻辑
- [ ] 实现账号密码存储功能
- [ ] 开发快速填入功能

### 阶段三：用户界面开发（3-4天）
- [ ] 设计并实现 Popup 界面
- [ ] 开发账号管理功能
- [ ] 创建 Options 设置页面
- [ ] 实现导入导出功能

### 阶段四：测试和优化（2-3天）
- [ ] 功能测试（多种登录页面）
- [ ] 性能优化
- [ ] 兼容性测试
- [ ] 安全性测试

### 阶段五：发布准备（1天）
- [ ] 代码审查
- [ ] 文档完善
- [ ] 打包发布

## 技术挑战与解决方案

### 1. 页面识别准确性
**挑战**: 不同网站的登录页面结构差异很大
**解决方案**: 
- 多重识别策略组合
- 可配置的识别规则
- 用户手动标记功能

### 2. 动态页面支持
**挑战**: SPA 应用的动态加载内容
**解决方案**:
- 使用 MutationObserver 监听 DOM 变化
- 定时检测机制
- 路由变化监听

### 3. 数据安全
**挑战**: 敏感信息的安全存储
**解决方案**:
- 使用 Web Crypto API 加密
- 本地存储，不上传云端
- 主密码保护机制

## 测试用例

### 功能测试
1. **页面识别测试**
   - 测试常见登录页面（GitHub, Gmail, 企业系统等）
   - 测试误识别情况
   - 测试动态加载页面

2. **填入功能测试**
   - 测试不同类型的输入框
   - 测试特殊字符密码
   - 测试表单验证

3. **数据管理测试**
   - 测试账号的增删改查
   - 测试数据导入导出
   - 测试数据加密解密

### 兼容性测试
- Chrome 最新版本
- 常见登录页面兼容性
- 不同屏幕分辨率

## 安全要求

1. **数据隐私保护**
   - 所有账号密码本地加密存储
   - 不向任何服务器发送用户数据
   - 支持数据完全删除

2. **权限最小化原则**
   - 仅请求必要的 Chrome API 权限
   - 仅在登录页面激活功能
   - 明确的权限说明

3. **安全审计要求**
   - 代码开源透明
   - 定期安全审查
   - 漏洞修复机制

## 交付物

- [ ] 完整的 Chrome 扩展源代码
- [ ] 构建和部署脚本
- [ ] 用户使用文档
- [ ] 开发者文档
- [ ] 测试报告
- [ ] 安全评估报告

---

**文档版本**: v2.0  
**创建日期**: 2024年  
**最后更新**: 2024年  
**负责人**: 开发团队
