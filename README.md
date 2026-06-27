# 📚 期末复习题库系统

一个基于 Vue 3 + Express.js 的在线练习与考试系统，支持单选、多选、填空等多种题型，提供练习模式和考试模式，帮助学生高效复习。

![首页](screenshots/home.png)

## ✨ 功能特性

### 🎯 核心功能

| 功能 | 说明 |
|------|------|
| **题库管理** | 内置+自定义题库导入，Markdown 格式题库文件 |
| **练习模式** | 随机出题、实时判分、错题收录 |
| **考试模式** | 固定顺序、锁定答案、模拟真实考试 |
| **错题本** | 自动收集错题、针对性复习 |
| **历史记录** | 完整答题记录、统计分析 |
| **笔记系统** | 层级笔记夹、Markdown 编辑器 |

### 📝 支持题型

- **单选题** - 单项选择，ABCD 选项
- **多选题** - 多项选择，可能有多个正确答案
- **填空题** - 填写空白处答案
- **简答题** - 开放性问答

## 🖼️ 功能截图

### 首页
![首页](screenshots/home.png)

### 题库管理
![题库管理](screenshots/banks.png)
- 按科目分类展示题库
- 显示题目数量和类型分布
- 支持导入/删除题库

### 答题界面
![答题界面](screenshots/quiz.png)
- 清晰的题目展示
- 答题进度指示
- 实时答案选择

### 答题结果
![答题结果](screenshots/result.png)
- 分数统计与正确率
- 正确答案对比
- 错题自动收录

### 历史记录
![历史记录](screenshots/history.png)
- 所有答题历史
- 按题库分类统计
- 正确率趋势分析

### 错题本
![错题本](screenshots/wrongbook.png)
- 智能错题收集
- 针对训练
- 掌握度追踪

### 笔记系统
![笔记系统](screenshots/notes.png)
- 层级文件夹结构
- Markdown 富文本编辑
- 笔记与题目关联

### 设置页面
![设置页面](screenshots/settings.png)
- 主题切换（亮色/暗色）
- 个性化配置

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                        前端                              │
│  Vue 3 + Pinia + Vue Router + Vite                     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                        后端                              │
│  Express.js + SQLite (Node.js 内置)                    │
└─────────────────────────────────────────────────────────┘
```

### 前端技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 | 渐进式 JavaScript 框架 |
| Pinia | 状态管理（题库、答题、历史、笔记） |
| Vue Router | 单页应用路由（Hash 模式） |
| Vite | 快速构建工具 |

### 后端技术栈

| 技术 | 用途 |
|------|------|
| Express.js | Web 框架 |
| SQLite | 轻量级数据库 |
| node:sqlite | Node.js 内置 SQLite 支持 |

### 项目结构

```
FinalPrep/
├── public/                    # 静态资源
│   ├── banks/                 # 内置题库文件
│   ├── assets/images/         # 图片资源
│   └── resources/             # 学习资料
├── server/                    # 后端服务
│   ├── data/                  # SQLite 数据库
│   └── server.js              # Express 服务入口
├── src/                       # 前端源代码
│   ├── components/            # Vue 组件
│   │   ├── notes/             # 笔记相关组件
│   │   └── wrongbook/         # 错题本组件
│   ├── stores/                # Pinia 状态管理
│   │   ├── quiz.js            # 答题状态
│   │   ├── bank.js            # 题库管理
│   │   ├── history.js         # 历史记录
│   │   ├── note.js            # 笔记管理
│   │   └── wrongBook.js       # 错题本
│   ├── views/                 # 页面视图
│   ├── utils/                 # 工具函数
│   │   ├── parser.js          # 题库解析
│   │   ├── validator.js       # 数据验证
│   │   └── api.js             # API 请求
│   └── router/                # 路由配置
├── screenshots/               # 截图文件
└── vite.config.js             # Vite 配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm >= 8

### 安装运行

```bash
# 克隆项目
git clone https://github.com/shy20057/finalPreview.git
cd finalPreview

# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..

# 启动前端开发服务器
npm run dev          # 访问 http://localhost:5173

# 另起终端启动后端服务
cd server && node server.js  # API 服务 http://localhost:3000
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📖 题库格式

题库采用 Markdown 格式存储，JSON 代码块包含题目数据：

````markdown
# 我的题库

```json
{
  "bank": {
    "id": "my-bank",
    "name": "我的题库",
    "description": "题库描述"
  },
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "这是单选题的题目内容",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" },
        { "label": "C", "text": "选项C" },
        { "label": "D", "text": "选项D" }
      ],
      "answer": "A",
      "score": 2
    },
    {
      "id": 2,
      "type": "multi",
      "question": "这是多选题的题目内容",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" },
        { "label": "C", "text": "选项C" },
        { "label": "D", "text": "选项D" }
      ],
      "answer": ["A", "C"],
      "score": 2
    },
    {
      "id": 3,
      "type": "fill",
      "question": "填空题：世界上最高的山峰是(__①__)",
      "blanks": 1,
      "answer": ["珠穆朗玛峰"],
      "score": 2
    }
  ]
}
```
````

## 🎨 设计特点

- **护眼配色** - 采用翡翠绿（#059669）为主色调，温和不伤眼
- **暗色模式** - 支持深色主题，减少视觉疲劳
- **流畅动画** - 使用 cubic-bezier 缓动曲线，丝滑体验
- **骨架屏** - 加载时显示骨架动画，体验更佳
- **响应式布局** - 适配桌面和移动设备

## 📝 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/banks | 获取题库列表 |
| POST | /api/banks | 导入新题库 |
| GET | /api/history | 获取历史记录 |
| POST | /api/history | 保存答题记录 |
| DELETE | /api/history/:id | 删除历史记录 |
| GET | /api/notes | 获取笔记列表 |
| POST | /api/notes | 创建笔记/文件夹 |
| PUT | /api/notes/:id | 更新笔记 |
| DELETE | /api/notes/:id | 删除笔记 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License