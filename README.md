# 内容监控平台

一个专业的社交媒体内容数据追踪工具，支持 YouTube、TikTok、Instagram、Twitter 等平台的内容监控和数据分析。

## 🚀 功能特性

### 核心功能
- **多平台支持**：YouTube、TikTok、Instagram、Twitter
- **项目管理**：创建和管理多个监控项目
- **内容监控**：添加内容链接，自动获取数据统计（规划中）
- **批量导入**：支持 Excel 文件批量导入内容（规划中）
- **数据可视化**：统计卡片、表格视图、卡片视图（规划中）
- **实时更新**：自动刷新数据（YouTube 10分钟，TikTok 60分钟，Instagram 120分钟，Twitter 30分钟）

### 技术特性
- **现代化架构**：React + TypeScript + Express
- **响应式设计**：支持桌面和移动端
- **本地存储**：使用浏览器本地存储保存项目数据
- **内部工具**：无需登录注册，直接使用
- **简化部署**：适合内部团队快速部署使用

## 🛠️ 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TailwindCSS** - 样式框架
- **Zustand** - 状态管理
- **React Router** - 路由管理
- **Lucide React** - 图标库
- **Sonner** - 通知组件

### 后端
- **Node.js** - 运行时环境
- **Express** - Web 框架
- **TypeScript** - 类型安全
- **Supabase** - 后端即服务
- **Multer** - 文件上传
- **XLSX** - Excel 文件处理

### 数据库
- **PostgreSQL** - 主数据库（通过 Supabase）
- **Row Level Security** - 数据安全

## 📦 安装和运行

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 1. 克隆项目
\`\`\`bash
git clone <repository-url>
cd 内容数据
\`\`\`

### 2. 安装依赖
\`\`\`bash
npm install
# 或
pnpm install
\`\`\`

### 3. 启动应用

#### 开发模式（同时启动前后端）
\`\`\`bash
npm run dev
\`\`\`

#### 分别启动
\`\`\`bash
# 启动后端服务器
npm run server:dev

# 启动前端开发服务器
npm run client:dev
\`\`\`

### 4. 访问应用
- 前端：http://localhost:5173
- 后端API：http://localhost:3001（可选，用于后续API集成）

## 📁 项目结构

\`\`\`
├── api/                    # 后端代码
│   ├── lib/               # 工具库
│   │   ├── supabase.ts    # Supabase 客户端配置
│   │   └── utils.ts       # 工具函数
│   ├── routes/            # API 路由
│   │   ├── auth.ts        # 认证路由
│   │   ├── projects.ts    # 项目管理路由
│   │   └── contents.ts    # 内容监控路由
│   ├── app.ts             # Express 应用配置
│   └── server.ts          # 服务器启动文件
├── src/                   # 前端代码
│   ├── components/        # 可复用组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具库
│   │   └── supabase.ts    # Supabase 客户端配置
│   ├── pages/             # 页面组件
│   │   ├── Login.tsx      # 登录/注册页面
│   │   └── ProjectList.tsx # 项目列表页面
│   ├── store/             # 状态管理
│   │   ├── authStore.ts   # 认证状态
│   │   └── projectStore.ts # 项目状态
│   ├── utils/             # 工具函数
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 应用入口
├── supabase/              # 数据库相关
│   └── migrations/        # 数据库迁移文件
├── .trae/                 # 项目文档
│   └── documents/         # 产品和技术文档
└── public/                # 静态资源
\`\`\`

## 🔧 API 接口

### 认证接口
- \`POST /api/auth/register\` - 用户注册
- \`POST /api/auth/login\` - 用户登录
- \`POST /api/auth/logout\` - 用户登出
- \`GET /api/auth/user\` - 获取当前用户信息

### 项目管理接口
- \`GET /api/projects\` - 获取项目列表
- \`POST /api/projects\` - 创建项目
- \`GET /api/projects/:id\` - 获取项目详情
- \`PUT /api/projects/:id\` - 更新项目
- \`DELETE /api/projects/:id\` - 删除项目

### 内容监控接口
- \`GET /api/contents/:projectId\` - 获取项目内容列表
- \`POST /api/contents/:projectId\` - 添加内容
- \`POST /api/contents/:projectId/batch\` - 批量导入内容
- \`PUT /api/contents/:contentId\` - 更新内容
- \`DELETE /api/contents/:contentId\` - 删除内容

## 📊 数据库设计

### 核心表结构
- \`user_profiles\` - 用户扩展信息
- \`projects\` - 项目信息
- \`contents\` - 监控内容
- \`content_data\` - 内容统计数据

### 安全特性
- Row Level Security (RLS) 策略
- 用户数据隔离
- API 权限控制

## 🎨 UI 设计

### 设计风格
- **现代化**：简洁的卡片式设计
- **专业感**：深蓝色主题配色
- **响应式**：适配桌面和移动端
- **用户友好**：清晰的信息层次和交互反馈

### 参考设计
界面设计参考了 NoxInfluencer 的现代化风格，注重数据可视化和用户体验。

## 🚧 开发计划

### 已完成功能
- ✅ 项目管理功能（创建、查看、编辑、删除）
- ✅ 本地数据存储
- ✅ 响应式UI设计
- ✅ 简化的内部工具界面

### 规划中功能
- 🔄 项目详情页面（内容监控界面）
- 🔄 内容链接添加和管理
- 🔄 表格/卡片视图切换
- 🔄 高级筛选和搜索
- 🔄 批量导入Excel功能
- 🔄 数据导出功能
- 🔄 实时数据更新
- 🔄 第三方API集成

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交更改 (\`git commit -m 'Add some AmazingFeature'\`)
4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目 Issues：[GitHub Issues](https://github.com/your-repo/issues)
- 邮箱：your-email@example.com

---

**数据刷新频率说明**
- YouTube：10分钟
- TikTok：60分钟  
- Instagram：120分钟