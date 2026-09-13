# 期末复习题库系统

基于 Vue 3、Express 和 SQLite 的本地题库练习系统，支持题库导入、练习记录、错题本、收藏、笔记和进度恢复。

## 技术栈

- 前端：Vue 3、Pinia、Vue Router、Vite
- 后端：Express、Node.js 原生 SQLite `node:sqlite`
- 数据库：SQLite，默认文件为 `server/data/quiz.db`
- 样式：原生 CSS，自定义主题变量

## 目录结构

```text
FinalPreview_fp/
  server/
    server.js          # Express 后端入口
    data/quiz.db       # SQLite 数据库文件
    package.json       # 后端依赖和启动脚本
  src/                 # Vue 前端源码
  public/              # 静态资源和内置资源
  index.html
  package.json         # 前端依赖和 Vite 脚本
  vite.config.js       # Vite 配置，开发环境代理 /api 到 3000
```

## 环境要求

- Node.js 22 或更高版本

说明：后端使用 `node:sqlite`，这是 Node.js 较新版本提供的原生 SQLite 模块。若启动时报 `Cannot find module 'node:sqlite'`，请升级 Node.js。

## 本地开发启动

首次运行先安装依赖：

```bash
npm install
cd server
npm install
```

启动后端服务，默认端口为 `3000`：

```bash
cd server
npm start
```

另开一个终端启动前端开发服务，默认端口为 `5173`：

```bash
npm run dev
```

访问：

```text
http://localhost:5173
```

开发环境下，前端请求 `/api` 会通过 `vite.config.js` 代理到：

```text
http://localhost:3000
```

## 生产部署

生产环境可以由 Express 同时提供 API 和前端静态页面。

1. 安装前端依赖：

```bash
npm install
```

2. 安装后端依赖：

```bash
cd server
npm install
cd ..
```

3. 构建前端：

```bash
npm run build
```

4. 将前端构建产物复制到后端静态目录：

Windows PowerShell：

```powershell
Remove-Item -Recurse -Force .\server\dist -ErrorAction SilentlyContinue
Copy-Item -Recurse .\dist .\server\dist
```

Linux/macOS：

```bash
rm -rf server/dist
cp -r dist server/dist
```

5. 启动后端：

```bash
cd server
npm start
```

默认访问地址：

```text
http://localhost:3000
```

如需指定端口，可设置 `PORT` 环境变量。

Windows PowerShell：

```powershell
$env:PORT=8080
npm start
```

Linux/macOS：

```bash
PORT=8080 npm start
```

## 数据库位置与备份

数据库默认保存在：

```text
server/data/quiz.db
```

备份时复制该文件即可。恢复时请先停止后端服务，再替换 `quiz.db`，最后重新启动后端。

## 常用命令

```bash
# 前端开发
npm run dev

# 前端构建
npm run build

# 后端启动
cd server
npm start
```

## 题库 Markdown 格式

题库 Markdown 文件中需要包含一个 `json` 代码块，格式示例：

````markdown
# 数据库 - 数据库设计

题库简介。

```json
{
  "name": "数据库-数据库设计",
  "subject": "数据库",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "在数据库设计中，将E-R图转换为关系数据模型是下述哪个阶段完成的工作",
      "options": [
        { "label": "A", "text": "需求分析阶段" },
        { "label": "B", "text": "概念设计阶段" },
        { "label": "C", "text": "逻辑设计阶段" },
        { "label": "D", "text": "物理设计阶段" }
      ],
      "answer": "C",
      "score": 10
    }
  ]
}
```
````

支持的题型：

- `single`：单选题，`answer` 为 `"A"` 形式
- `multi`：多选题，`answer` 为 `["A", "C"]` 形式
- `fill`：填空题，需要 `blanks` 和答案数组
- `essay`：简答题，`answer` 为参考答案文本
