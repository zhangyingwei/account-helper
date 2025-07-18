# Account Helper 安装和使用指南

## 安装步骤

### 1. 加载扩展到 Chrome

1. 打开 Chrome 浏览器
2. 在地址栏输入 `chrome://extensions/` 并回车
3. 在右上角开启"开发者模式"
4. 点击"加载已解压的扩展程序"按钮
5. 选择项目的 `dist` 文件夹
6. 扩展安装成功后，会在工具栏显示扩展图标

### 2. 首次使用

1. **点击扩展图标**，打开 Account Helper 弹窗
2. **添加测试账号**：
   - 点击"添加账号"按钮
   - 填写账号信息：
     - 名称：测试账号1
     - 用户名：test@example.com
     - 密码：Test123!@#
     - 分组：测试环境（可选）
     - 域名：留空（适用所有网站）
   - 点击"保存"

### 3. 测试功能

1. **打开测试页面**：
   - 在浏览器中打开项目根目录的 `test-login.html` 文件
   - 或访问任何包含登录表单的网站

2. **验证自动识别**：
   - 页面加载后，应该在用户名输入框旁看到 👤 按钮
   - 如果没有显示，尝试刷新页面

3. **测试自动填入**：
   - 点击 👤 按钮
   - 选择之前添加的账号
   - 验证用户名和密码是否正确填入

## 功能说明

### 基础功能
- ✅ 自动识别登录页面
- ✅ 在输入框旁显示账号选择按钮
- ✅ 一键填入用户名和密码
- ✅ 账号管理（增删改查）
- ✅ 分组管理
- ✅ 搜索功能

### 高级功能
- ✅ 数据加密保护（可选）
- ✅ 自动提交表单（可选）
- ✅ 键盘快捷键：`Ctrl/Cmd + Shift + A`
- ✅ 导入/导出账号数据

### 设置选项

在扩展弹窗中点击 ⚙️ 按钮，或右键扩展图标选择"选项"：

1. **插件设置**：
   - 自动检测登录页面
   - 填入后自动提交表单

2. **安全设置**：
   - 启用数据加密
   - 设置主密码

## 故障排除

### 常见问题

**Q: 扩展图标显示但点击没有反应？**
A: 检查浏览器控制台是否有错误，尝试重新加载扩展

**Q: 登录页面没有显示账号选择按钮？**
A: 
- 确认页面包含密码输入框
- 尝试刷新页面
- 检查扩展是否正常运行

**Q: 填入的账号信息不正确？**
A: 检查账号信息是否正确保存，可以在扩展弹窗中编辑账号

**Q: 在某些网站不工作？**
A: 某些网站可能有特殊的安全策略，可以尝试：
- 手动复制粘贴账号信息
- 检查网站是否阻止了扩展脚本

### 调试方法

1. **检查扩展状态**：
   - 访问 `chrome://extensions/`
   - 确认 Account Helper 已启用
   - 查看是否有错误信息

2. **查看控制台日志**：
   - 按 F12 打开开发者工具
   - 查看 Console 标签页的错误信息

3. **重新加载扩展**：
   - 在扩展管理页面点击刷新按钮
   - 或者移除后重新加载

## 安全说明

- 所有账号数据存储在本地，不会上传到任何服务器
- 支持主密码加密保护
- 建议定期备份账号数据
- 不要在公共电脑上使用

## 支持的网站

理论上支持所有包含标准登录表单的网站，包括但不限于：
- GitHub
- Gmail
- 各种管理后台
- 测试环境登录页面

## 更新日志

### v1.0.0 (当前版本)
- 基础登录页面识别功能
- 账号管理和快速填入
- 数据加密保护
- Vue 3 + TypeScript 架构
