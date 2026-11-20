# FinalPreview_fp 从 Vue Web 到 uni-app 的跨平台迁移技术总结（整合版）

> 项目：FinalPreview_fp 期末复习题库系统  
> 原工程：仓库根目录（src/ + server/）  
> 迁移工程：mobile/（uni-app Vue 3 / App-Vue）  
> 用途：课程实验汇报、迁移成果复盘  
> 整理日期：2026-11-02

## 文档说明

本文件整合了原目录中的两份迁移总结，删除重复章节，并对统计口径、平台状态和技术结论进行了统一。

整合时采用以下口径：

1. 以当前项目目录和源码统计为准：原项目 13 个页面、26 个 Vue 公共组件、14 条路由；迁移后 13 个 uni-app 页面、36 个 Vue 组件。
2. 原项目的登录和注册是两条路由，但迁移后共用一个 pages/auth/index 页面，通过 query 参数区分模式。
3. Android 模拟器运行情况引用项目已有验收记录；按照项目 AGENTS.md 的约定，本次整合没有重新执行构建、测试或模拟器运行。
4. H5 有构建脚本，但尚无逐页实机验收结论；微信小程序尚未完成适配、构建和运行验证。
5. 后端不是完全零改动：Express + SQLite 架构及主要 API 保留，同时增加了移动端交卷幂等和考试快照字段。

---

# 1. 项目背景与迁移目标

## 1.1 原项目是什么

FinalPreview_fp 是一个期末复习题库系统。迁移前，它是一个运行在浏览器中的 Vue Web 单页应用。

| 技术层 | 原项目技术 | 主要职责 |
|---|---|---|
| 前端框架 | Vue 3 | 页面组件与业务逻辑 |
| 构建工具 | Vite 5 + @vitejs/plugin-vue | Web 开发服务器和生产构建 |
| 页面路由 | Vue Router 4 | 浏览器 URL、页面切换和路由守卫 |
| 状态管理 | Pinia 3 | 用户、题库、答题、历史、错题、收藏、笔记等状态 |
| 网络请求 | fetch | 调用后端 HTTP API |
| 本地存储 | localStorage | Token、主题及部分本机状态 |
| 富文本 | Tiptap Vue 3 | 笔记编辑 |
| 内容转换 | Marked / Turndown | Markdown 与 HTML 转换 |
| 后端 | Express 4 | 提供业务 API |
| 数据库 | node:sqlite / SQLite | 服务端业务数据持久化 |

原项目的主要业务页面包括：首页、登录注册、题库、答题、结果、历史记录、错题本、收藏、学习资源、设置、个人资料、笔记和答题笔记。

## 1.2 为什么要迁移

原 Web 项目依赖浏览器环境，无法直接作为 Android 原生 App 工程运行，也不能直接把 Vue Web 项目当成微信小程序项目发布。

本次迁移的目标是：

- 将原 Vue Web 前端迁移到 uni-app。
- 以 Android App（App-Vue）作为首要运行目标。
- 保留 H5 构建能力。
- 为微信小程序预留配置，但不将未完成的平台描述为已发布。
- 尽量复用现有业务规则、状态管理和后端服务。

## 1.3 本次迁移的原则

**保留业务，适配平台；不为迁移而推倒重写。**

- 尽量复用原有 Vue 页面逻辑、Pinia Store 和业务工具。
- 将浏览器特有的页面、路由、存储、网络和文件 API 收敛到平台适配层。
- 对无法直接在 App-Vue 逻辑层运行的 DOM 能力，使用 renderjs 等方案处理。
- 保留 Express + SQLite 后端，只做移动端所需的增量兼容。

---

# 2. 迁移前后的整体技术架构

## 2.1 迁移前：Vue Web

~~~mermaid
flowchart TD
    A["浏览器"] --> B["Vue 3 + Vite SPA"]
    B --> C["Vue Router 4"]
    B --> D["Pinia 8 个 Store"]
    D --> E["fetch + localStorage"]
    E --> F["Vite Proxy /api"]
    F --> G["Express 4 :3000"]
    G --> H["SQLite"]
~~~

原项目通过相对路径请求 /api，开发阶段由 Vite Proxy 转发到本机 Express 服务。

## 2.2 迁移后：uni-app App-Vue

~~~mermaid
flowchart TD
    A["HBuilderX / uni-app 编译工具链"] --> B["uni-app Vue 3"]
    B --> C["pages.json 页面注册"]
    B --> D["Pinia 8 个 Store"]
    B --> E["uni.request + uni Storage"]
    B --> F["renderjs 视图层适配"]
    B --> G["Android 原生文件能力"]
    E --> H["API_BASE / 服务地址配置"]
    H --> I["Express 4"]
    I --> J["SQLite"]
    F --> K["App-Vue WebView 视图层"]
~~~

## 2.3 架构变化的核心

| 方面 | 迁移前 | 迁移后 |
|---|---|---|
| 运行环境 | 浏览器 | uni-app App-Vue 运行环境 |
| 页面管理 | Vue Router | pages.json + 自定义路由适配层 |
| 页面渲染 | HTML DOM | uni-app 组件；必要时由 renderjs 在视图层处理 DOM |
| 网络请求 | fetch + Vite Proxy | uni.request + 可配置 API_BASE |
| 本地存储 | localStorage | uni.getStorageSync / uni.setStorageSync |
| 文件操作 | File / Blob / URL | Android SAF、plus.io，H5 单独处理 |
| 后端 | Express + SQLite | 保留原架构，增加少量兼容字段 |

---

# 3. 五个维度的技术调整

## 3.1 UI 组件体系与页面渲染机制

### 3.1.1 HTML 标签适配

uni-app 不是把浏览器 DOM 原封不动搬到每个平台。页面模板需要使用 uni-app 支持的组件体系。

| 原 Web 标签/组件 | 迁移后的实现 | 用途与说明 |
|---|---|---|
| div | view | 页面容器、布局区域 |
| span | text | 行内文本 |
| img | image | 图片展示 |
| router-link | RouteLink | 自定义导航组件 |
| button | button 或 view @click | 表单按钮保留原生组件；普通点击区域按需使用 view |
| p、h1-h6、ul、li | view + web-p/web-h1 等语义类 | 保留原有字号、行高和排版规则 |
| select / option | picker | 使用 uni-app 选择器 |
| br | view.web-br | 用块级占位元素实现换行 |

项目模板统计中，原页面约有 607 个 div、287 个 span、189 个内联 SVG；迁移后对应使用 view、text 和 AppIcon 等实现。

### 3.1.2 真实页面改造

以首页 Hero 区为例：

迁移前使用 h1、span、p、button 和内联 SVG；迁移后使用 view、text、web-h1、web-p、web-br 和 AppIcon。

题库页的学科 Tab 也是从 button 改成 view + @click，保留原有 class 和交互逻辑。

这不是单纯替换标签，还需要处理 uni-app 组件的默认行为：

- uni button 自带边框、圆角和默认样式，因此通过 web-button 统一复位。
- 图片资源从 /assets/ 调整为 /static/assets/。
- picker 用于替换原生 select。
- 原网页的语义排版通过 web-p、web-h1 等类名保留。

### 3.1.3 公共页面外壳调整

原 Web 的 src/App.vue 同时负责顶栏、抽屉、浮岛菜单和 router-view。

uni-app 的 App.vue 主要负责应用生命周期，不再承担原网页根组件的页面模板职责。因此：

- 原来的页面外壳迁移到 mobile/components/AppShell.vue。
- AppShell 负责顶部导航、背景、抽屉、浮岛菜单和公共交互。
- 具体业务页面通过 slot 放入 AppShell。
- mobile/App.vue 负责应用级生命周期。

### 3.1.4 SVG 与 renderjs

App-Vue 的逻辑层没有浏览器 DOM，也不能直接按普通网页方式渲染模板内联 SVG。

原项目约 189 个内联 SVG 图标通过 scripts/svg-codemod.mjs 批量转换为 AppIcon。图标数据放在 mobile/utils/icons.js，AppIcon 在视图层还原 SVG，以保留 currentColor 主题颜色。

本次增加 6 个 renderjs 组件：

| 组件 | 迁移用途 |
|---|---|
| HtmlContent.vue | 替代 v-html，渲染动态 HTML，并清洗危险标签和事件属性 |
| RichNoteEditor.vue | 在视图层创建 Tiptap Editor |
| ScoreRing.vue | 绘制动态成绩环 |
| StarField.vue | 绘制 canvas 星空背景 |
| ViewTransition.vue | 实现页面过渡动画 |
| UiBridge.vue | 逻辑层与视图层通信 |

彩纸特效则改为 uni.$emit 事件通知，再由 ConfettiLayer 组件渲染。

### 3.1.5 移动端布局、安全区和单位

- 13 个页面都配置 navigationStyle: custom，以保留原网页自绘导航栏。
- 通过 env(safe-area-inset-bottom) 处理底部安全区域。
- 主题由原来的 html data-theme 改为页面根节点 class，并同步 uni.setBackgroundColor。
- 本项目没有全面改用 rpx，而是为了保持原网页尺寸，设置 transformPx: false，并固定 page 根字号为 16px。
- 原有 CSS 变量、Flex/Grid、动画和设计令牌尽量保留，再针对 App-Vue 的差异修正。

**关键结论：** 页面视觉和业务组件尽量复用，但 HTML 标签、SVG、动态 HTML、页面外壳和移动端安全区域必须适配。

## 3.2 页面路由与导航体系

### 3.2.1 原 Vue Router

原项目 src/router/index.js 使用 Vue Router 4：

- createRouter 创建路由。
- createWebHashHistory 使用 Hash 模式。
- 14 条路由入口。
- router-view 显示当前页面。
- router-link 提供导航。
- router.beforeEach 处理登录访问控制。

### 3.2.2 迁移后的页面注册

uni-app 使用 mobile/pages.json 注册页面。迁移后共 13 个页面文件。

原来的 /login 与 /register 共用 AuthView.vue，迁移后合并到 pages/auth/index.vue，通过 query 参数 mode=register 区分注册模式。

| 原 Vue Router | uni-app 页面 |
|---|---|
| / | pages/index/index |
| /login、/register | pages/auth/index |
| /banks | pages/banks/index |
| /quiz/:bankId | pages/quiz/index?bankId=... |
| /result/:recordId | pages/result/index?recordId=... |
| /history | pages/history/index |
| /wrongbook | pages/wrongbook/index |
| /favorites | pages/favorites/index |
| /resources | pages/resources/index |
| /settings | pages/settings/index |
| /profile | pages/profile/index |
| /notes | pages/notes/index |
| /quiz-notes | pages/quiz-notes/index |

### 3.2.3 自定义路由适配层

迁移后新增 mobile/utils/router.js（约 249 行），将原来常用的 Vue Router API 映射到 uni-app 页面导航：

| 原 API | 迁移后 |
|---|---|
| router.push | uni.navigateTo |
| router.replace | uni.redirectTo |
| router.back | uni.navigateBack |
| 根页面跳转 | uni.reLaunch |
| useRoute | 从当前页面栈和 options/query 还原 route 对象 |
| router-link | RouteLink.vue |

这样原业务组件可以继续使用接近原来的 useRoute、useRouter 和 router.push 调用方式，降低逐页面重写的工作量。

### 3.2.4 登录守卫与生命周期

原 router.beforeEach 改为 guardAuth，由 main.js 的页面 onShow 钩子调用。

同时增加 composables/usePageReady.js，统一处理：

- onLoad 首次加载。
- onShow 页面回到前台后的刷新。
- 加载前同步路由参数。
- 访问页面前检查登录状态。
- 加载失败时提示错误。

Android 页面切换后可能留在页面栈中，不一定立即卸载。因此路由适配层为页面保存独立路由快照，避免后台答题页被其他页面的参数变化影响。

Android 返回键通过 onBackPress 处理：先关闭抽屉、命令面板等浮层；没有浮层时再交给 uni-app 页面栈返回。

**关键结论：** 原 Vue Router 被移除，页面由 pages.json 管理；自定义 router.js 尽量保留原 API 形状，减少业务代码改动。

## 3.3 浏览器 API 与 uni-app 平台 API 适配

### 3.3.1 常用 API 对照

| 功能 | 原 Web API | 迁移后 API / 实现 |
|---|---|---|
| 本地存储 | localStorage | uni.getStorageSync / uni.setStorageSync |
| HTTP 请求 | fetch | uni.request，封装为 Promise |
| 页面跳转 | router.push / location.hash | uni.navigateTo / uni.reLaunch |
| 页面返回 | history / router.back | uni.navigateBack |
| 全局事件 | window.dispatchEvent / addEventListener | uni.$emit / uni.$on |
| 确认框 | confirm | uni.showModal |
| 提示框 | alert | uni.showModal / uni.showToast |
| 输入对话框 | prompt | uni.showModal editable |
| 剪贴板 | navigator.clipboard | uni.setClipboardData |
| 文件选择 | input type=file / FileReader | Android SAF + plus.io |
| 文件保存 | Blob + URL.createObjectURL + a.download | ACTION_CREATE_DOCUMENT / plus.io |
| 动态 HTML | v-html | HtmlContent + renderjs |
| DOM 特效 | document.createElement | uni 事件总线 + 组件渲染 |
| 拖拽 | mouse 事件 + getBoundingClientRect | 触摸事件 + uni.createSelectorQuery |

### 3.3.2 Token 与请求处理

原 Web 项目从 localStorage 读取 quiz-token，并通过 fetch 请求后端。

迁移后：

1. Token 改由 uni 存储 API 读写。
2. uni.request 统一添加 Authorization: Bearer Token。
3. 将回调式请求封装成 Promise，业务 Store 仍可用 async/await。
4. 401 时清理 Token，并通过 uni.$emit 通知登录状态失效。
5. 登录/注册接口的 401 单独处理，避免把用户名或密码错误误判成全局登录过期。
6. 如果请求发出后账号或后端地址被切换，则丢弃旧响应，避免旧数据写入新账号状态。

### 3.3.3 本地数据按账号和服务地址分区

原生 App 的本地存储是设备级的，多账号切换可能出现错题标记、主题或草稿串号。

因此新增 accountScope.js，将存储 key 设计为：

~~~text
prefix : apiBase : userId
~~~

错题掌握标记、主题、命令面板最近访问、浮岛菜单位置、笔记草稿和待确认提交等数据按服务地址和账号隔离。

另新增 pendingSubmission.js 保存未完成交卷的本地快照，降低 App 被系统回收导致答题进度丢失的风险。

### 3.3.4 文件读写与 Markdown

网页端使用 File、Blob、FileReader 和浏览器下载链接。

Android App-Vue 中，uni.chooseFile 不支持，因此改用 Android Storage Access Framework：

- ACTION_OPEN_DOCUMENT：系统文件选择。
- ACTION_CREATE_DOCUMENT：系统保存文件。
- plus.android：调用 Android 原生 Intent。
- plus.io：读写 App 文件。

移动端导出笔记由返回 Blob 改为返回文本内容，再由 nativeFiles.js 写入本地文件。

Marked 和 Turndown 保留，但把依赖 DOM 的 Markdown/HTML 转换逻辑移动到 renderjs 视图层，避免在 App-Vue 逻辑层直接执行浏览器 DOM 解析。

### 3.3.5 旧版 WebView 与字体

项目目标模拟器记录为 Android 11 / WebView 83，遇到过：

- 旧 WebView 不支持 Flex gap：通过 viewLayout.js 检测并转换为 margin。
- 缺少 Array.prototype.findLast、Array.prototype.at、Object.hasOwn：通过 viewPolyfills.js 补齐。
- SVG mask 显示异常：改用视图层注入原始 SVG。
- Google Fonts CDN 不稳定或不可达：将 10 个 woff2 字体放入 static/fonts，并通过 fonts.css 自托管。

**关键结论：** 不是所有浏览器 API 都能在 App-Vue 逻辑层直接使用。通过统一适配层、原生文件接口和 renderjs，保留了主要功能。

## 3.4 第三方依赖与技术栈调整

### 3.4.1 依赖对比

| 原技术/依赖 | 迁移后处理 | 原因 |
|---|---|---|
| Vue 3 | 保留 Vue 3；mobile/package.json 不显式声明，由 HBuilderX 编译工具链提供运行时 | 使用 uni-app Vue 3 编译环境 |
| Vite 5 + @vitejs/plugin-vue | 改为 DCloud @dcloudio/vite-plugin-uni，由 HBuilderX 工具链加载 | 需要 uni-app 编译流程 |
| Pinia 3 | 完整保留 | 8 个 Store 的业务状态逻辑可复用 |
| Vue Router 4 | 移除，改为 pages.json + 自研 router.js | uni-app 自己管理页面栈 |
| Dexie 4 | 从移动端移除，db.js 不迁移 | 原项目 db.js 无实际引用，主要数据已经保存在后端 SQLite |
| @tiptap/vue-3 | 移除，改用 @tiptap/core + renderjs | useEditor 依赖 DOM，App-Vue 逻辑层无 DOM |
| Tiptap 扩展包 | 大部分保留 | 粗体、图片、高亮、链接等编辑能力继续复用 |
| Marked | 保留，移动到 noteMarkdownView.js | 需要在视图层执行 Markdown 解析 |
| Turndown | 保留，移动到 noteMarkdownView.js | 需要在视图层执行 HTML 转 Markdown |
| Express.js | 保留 | 前端迁移不需要重写服务端 |
| SQLite | 保留 | 继续由服务端管理业务数据 |

### 3.4.2 没有引入的依赖

- 没有新增 UI 组件库，页面仍以手写 Vue 组件和 CSS 为主。
- 没有新增图标库，原内联 SVG 转为 AppIcon + base64 图标数据。
- 没有新增图表库，成绩环由手写 SVG 实现。
- 没有新增 Axios，原生 fetch / uni.request 分别承担两端请求。

### 3.4.3 Tiptap 的特殊调整

原项目使用 @tiptap/vue-3 的 useEditor；迁移后显式引入 @tiptap/core，在 RichNoteEditor.vue 的 renderjs 中创建 Editor。

逻辑层负责笔记标题、所属题库、账号和保存目标；视图层负责编辑器 DOM、Markdown 与 HTML 转换。Tiptap 的扩展包大部分保留。

注意：当前 mobile/package-lock.json 中 @tiptap/core 解析版本为 3.32.2，而部分扩展仍为 3.27.1，存在版本不一致风险。正式发布前应统一 core 与扩展版本。

### 3.4.4 状态管理复用程度

迁移后仍然使用 8 个 Pinia Store。根据两份迁移报告的逐行对比记录，Store 总计约 1,485 行，差异约 160 行（约 11%）；bank 和 favorite 两个 Store 逐行未改，其余差异主要集中在存储 API、登录事件、提交幂等和答题恢复等平台适配。

这说明迁移的重点是平台边界调整，而不是重写业务状态管理。

**关键结论：** Pinia、Marked、Turndown 和大部分 Tiptap 扩展被保留；Vue Router、Dexie、Tiptap Vue 集成层被移除或调整；构建链切换为 uni-app 专用插件。

## 3.5 网络请求与前后端通信架构

### 3.5.1 原 Web 请求

原项目 API_BASE 为空字符串，请求使用相对路径 /api/...。

开发时由 Vite Proxy 转发到 http://localhost:3000；生产环境依赖同域反向代理。

### 3.5.2 迁移后的 API_BASE

移动端没有浏览器同源代理的默认前提，需要请求完整后端地址。

| 运行端 | 后端地址 |
|---|---|
| H5 开发 | http://localhost:3000 |
| Android 官方模拟器 | http://10.0.2.2:3000 |
| Android 真机 | http://电脑局域网IP:3000 或正式服务器地址 |
| 正式线上 | HTTPS 域名 |

mobile/utils/api.js 新增 getApiBase / setApiBase；mobile/utils/serverAddress.js 提供地址校验和运行时配置。登录页可通过长按标题进入后端地址设置，登录后也可从连接设置进入。

Android 模拟器中的 localhost 指向模拟器本身，不是 Windows 开发电脑，因此不能直接使用 localhost 访问电脑上的 Express 服务。

### 3.5.3 后端是否重写

后端仍是 Express 4 + node:sqlite，主要 API 路由继续保留，数据库仍为 server/data/quiz.db。前端迁移没有把 SQLite 打包进 APK，也没有把 Express 改写成其他后端。

但后端有一项移动端增量兼容：

- 新增 server/mobileCompatibility.js。
- history 增加 submissionId、questionSnapshot 字段。
- quiz_sessions 增加 submitted_ids、submission_id 字段。
- 使用唯一索引保证同一用户同一 submissionId 不重复写入。
- 前端在网络中断后重试交卷时，后端可以识别同一次提交，避免历史记录重复。
- questionSnapshot 用于保存交卷时的题目快照，避免题库后续变化影响历史结果。

**关键结论：** 后端总体架构和主要 API 保留，但为了适应移动端网络中断、重试和考试恢复，增加了幂等交卷与题目快照字段。

### 3.5.4 微信小程序网络约束

当前 manifest.json 预置 mp-weixin 配置，但 AppID 为空。

小程序正式请求需要 HTTPS 和微信公众平台配置的 request 合法域名；本地 IP、localhost 和带端口的开发地址不能直接作为正式合法域名。

---

# 4. 项目目录结构调整

## 4.1 原 Web 工程

~~~text
FinalPreview_fp/
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/
│   ├── views/          # 13 个业务页面
│   ├── components/     # 26 个 Vue 组件
│   ├── stores/         # 8 个 Pinia Store
│   ├── utils/          # API、存储、解析、校验等
│   └── style.css
├── public/
├── server/             # Express + SQLite
├── tests/
├── package.json
└── vite.config.js
~~~

## 4.2 迁移后的 uni-app 工程

~~~text
mobile/
├── App.vue
├── main.js
├── pages.json
├── manifest.json
├── uni.scss
├── index.html
├── vite.config.js
├── pages/              # 13 个 uni-app 页面
├── components/         # 36 个组件
├── composables/        # 页面生命周期组合逻辑
├── stores/             # 8 个 Pinia Store
├── utils/              # 22 个工具模块
├── styles/             # app.css / fonts.css / web-elements.css
├── static/             # 图片、字体、图标
├── scripts/            # 构建脚本、SVG codemod
└── tests/              # 测试目录状态需核实
~~~

## 4.3 新旧目录映射

| 原目录/文件 | 迁移后位置 | 调整 |
|---|---|---|
| src/views/ | mobile/pages/*/index.vue | 页面改为 uni-app 页面目录 |
| src/components/ | mobile/components/ | 保留原业务组件并增加适配组件 |
| src/App.vue | mobile/components/AppShell.vue | 将页面外壳抽取为公共组件 |
| src/main.js | mobile/main.js | createApp 改为 createSSRApp |
| src/router/index.js | mobile/pages.json + mobile/utils/router.js | 页面注册和路由适配拆分 |
| src/stores/ | mobile/stores/ | 8 个 Store 保留 |
| src/utils/api.js | mobile/utils/api.js | fetch 改为 uni.request |
| src/utils/storage.js | mobile/utils/storage.js | 继续作为业务数据访问门面 |
| src/utils/db.js | 不迁移 | 原 Dexie 数据库封装无实际引用 |
| src/style.css | mobile/styles/ | 拆为 app.css、fonts.css、web-elements.css |
| public/assets/ | mobile/static/assets/ | 静态资源路径调整 |
| Google Fonts CDN | mobile/static/fonts/ | 10 个字体文件自托管 |

## 4.4 为什么要这样组织

- pages：满足 uni-app 页面注册和页面栈管理要求。
- components：集中管理页面外壳、业务组件和跨端组件。
- stores：保留 Pinia 业务状态。
- utils：集中放置路由、API、文件、账号分区和平台适配。
- composables：封装页面生命周期。
- styles：将设计令牌、字体和 HTML 兼容样式拆开。
- static：统一管理应用内图片、字体和图标。

这样做可以让业务逻辑和平台差异分离，后续增加平台时优先调整适配层，而不是重写所有业务页面。

---

# 5. 迁移中遇到的关键问题与解决措施

| 实际问题 | 原因 | 解决措施 |
|---|---|---|
| SVG 图标不显示 | App-Vue 逻辑层不能直接渲染模板内联 SVG | SVG codemod + AppIcon + 视图层注入 |
| HTML 动态内容无法直接渲染 | 逻辑层没有 DOM | HtmlContent + renderjs，并清洗危险 HTML |
| 页面跳转不兼容 | Vue Router 页面栈与 uni-app 页面栈不同 | pages.json + router.js + RouteLink |
| Android 模拟器请求失败 | localhost 指向模拟器自身 | 使用 10.0.2.2，真机使用电脑局域网 IP |
| 旧 WebView Flex gap 失效 | Android 11 / WebView 83 不支持该特性 | viewLayout.js 检测并用 margin 补偿 |
| Tiptap 缺少 ES 方法 | 旧 WebView 缺少 findLast、at、Object.hasOwn | viewPolyfills.js 补齐 |
| 页面布局整体偏移 | HBuilderX 默认 px→rpx/rem 缩放 | transformPx=false，根字号固定 16px |
| 页面返回后答题状态被重置 | Android 页面留在页面栈，不会立即卸载 | 每页独立 route snapshot |
| 交卷重试产生重复记录 | 网络中断后重复提交 | submissionId 幂等键 + 数据库唯一索引 |
| 多账号数据串号 | uni 本地存储是设备全局 | accountScope 按 API 地址和用户 ID 分区 |
| App 文件选择失败 | uni.chooseFile 不支持 Android App-Vue | Android SAF + plus.android + plus.io |

## 5.1 预防性处理

- 账号或服务地址切换时，先登出并作废旧请求响应。
- 登录/注册接口的 401 与普通登录过期分开处理。
- 页面栈只有一页时，返回操作失败则回到首页。
- Android 返回键优先关闭抽屉、命令面板等浮层。
- HtmlContent 清洗 script、iframe、事件属性和 javascript: URL。
- App 被系统回收时，使用 pendingSubmission 保存待确认交卷快照。
- 字体改为本地自托管，减少 CDN 不可达问题。
- 使用 lockfile 固定依赖，避免版本漂移。

## 5.2 尚需继续验证的事项

| 平台/功能 | 当前状态 |
|---|---|
| Android 模拟器 | 项目既有验收记录称核心流程已跑通；本次未重新执行 |
| Android 真机 | 需继续验证局域网服务地址、返回键、软键盘、旋转等 |
| H5 | 构建脚本已准备，尚未逐页实机验收 |
| 微信小程序 | 尚未完成；renderjs 不支持，富文本、分数环、星空、过渡等需要重做或降级 |
| 小程序文件操作 | 没有 plus.io，需要改用小程序文件 API |
| 小程序网络 | 需要 HTTPS、备案域名和 request 合法域名 |
| 正式签名 APK | 尚未生成；App 资源包不等于签名 APK |
| Tiptap 版本 | core 与扩展版本需要统一 |
| mobile/tests | 当前工作区测试目录缺失，需确认是否误删并恢复或同步调整脚本 |
| 根目录 docs/ | docs/README.md、docs/mobile/ 下迁移与验收文档在 Git HEAD 中存在，但当前工作区处于已暂存删除状态；CLAUDE.md 与 mobile/README.md 中相关链接需要恢复或同步修正 |

---

# 6. 迁移成果与技术栈总览

## 6.1 迁移成果

| 项目 | 迁移前 | 迁移后 |
|---|---:|---:|
| 业务页面 | 13 个 Web 页面 | 13 个 uni-app 页面 |
| Vue 公共组件 | 26 个 | 36 个 |
| Pinia Store | 8 个 | 8 个 |
| 工具模块 | 13 个 | 22 个 |
| 路由入口 | 14 条 | 13 个页面文件 |
| 后端 | Express + SQLite | 保留，增加移动端兼容字段 |

迁移后新增了 AppShell、AppIcon、RouteLink、HtmlContent、ScoreRing、StarField、UiBridge、ViewTransition、ConfettiLayer 和 RichNoteEditor 等适配组件。

## 6.2 平台完成度

| 平台 | 当前情况 | 汇报口径 |
|---|---|---|
| Android App | 项目既有验收记录称 Android 11 / API 30 模拟器核心流程通过；本次检查未重新构建 | 可以展示现有 Android 运行截图，并说明来源于既有验收 |
| H5 | build:h5 脚本已配置，未逐页验收 | 有构建入口，不能说已完成全面验收 |
| 微信小程序 | manifest 预置配置，但 AppID 为空；renderjs 和 plus.io 需要替代方案 | 尚未完成，不宣称已发布 |
| 正式 APK | 需要 HBuilderX 配置 AppID、包名、图标、证书并云打包 | 当前不能把 App 资源包称为签名 APK |

## 6.3 技术栈最终对比

| 技术层 | 迁移前 | 迁移后 |
|---|---|---|
| 前端框架 | Vue 3 | Vue 3 + uni-app |
| IDE / 构建 | VS Code + Vite Web | HBuilderX + uni-app Vite 插件 |
| 页面路由 | Vue Router 4 | pages.json + router.js |
| 状态管理 | Pinia 3 | Pinia 3 |
| 网络请求 | fetch | uni.request |
| 本地存储 | localStorage | uni Storage |
| 富文本 | @tiptap/vue-3 | @tiptap/core + renderjs |
| Markdown | Marked + Turndown | 保留，移至视图层 |
| 文件操作 | File / Blob / URL | Android SAF + plus.io |
| 后端 | Express 4 | 保留并增量兼容 |
| 数据库 | SQLite | 保留 |

---

# 7. 面向老师的汇报讲稿

原来的 FinalPreview_fp 是一个基于 Vue 3 和 Vite 的网页应用，使用 Vue Router 管理页面，Pinia 管理状态，通过 fetch 和 localStorage 完成网络请求和本地数据存储。

这次迁移到 uni-app 后，我主要做了五方面调整：

第一，UI 组件和页面渲染方面，把原来的 HTML 页面结构调整为 uni-app 的 view、text、image 等组件，并把原来的全局页面外壳抽取成 AppShell。对于 SVG、动态 HTML、富文本和动画等依赖 DOM 的功能，则使用 AppIcon 和 renderjs 在视图层实现。

第二，路由方面，把 Vue Router 的路由配置迁移到 pages.json，并增加自定义 router.js 适配层，将 router.push、router.back 等调用映射到 uni.navigateTo、uni.navigateBack 等 API。登录守卫也从 beforeEach 改为 uni-app 页面生命周期中的访问控制。

第三，浏览器 API 方面，把 localStorage 改为 uni 存储 API，把 fetch 改为 uni.request，把浏览器事件改为 uni.$emit 和 uni.$on。文件导入导出则针对 Android 使用系统文件选择框和原生文件能力。

第四，第三方依赖方面，Pinia、Marked、Turndown 和大部分 Tiptap 扩展继续保留；Vue Router、Dexie 和 @tiptap/vue-3 被移除或调整；Tiptap 改为 @tiptap/core 加 renderjs。构建工具也从普通 Vue Vite 配置切换到 uni-app 专用 Vite 插件和 HBuilderX 编译工具链。

第五，网络通信方面，原来依赖 Vite 代理的相对路径请求改成可配置的后端绝对地址。Android 模拟器使用 10.0.2.2，真机使用电脑局域网 IP，正式环境使用 HTTPS。

项目目录也从普通 Web 的 src/views、src/components、src/router 结构，调整为 uni-app 的 pages、components、stores、utils、composables、styles 和 static 结构。

后端继续使用 Express 和 SQLite，只增加了交卷幂等和考试快照等移动端兼容字段，没有整体重写。

---

# 8. 结论

本次迁移的核心不是“把 Vue 换成另一套框架”，而是保留 Vue 3 和原有业务逻辑，将浏览器专属能力改造成 uni-app 的页面管理、平台 API 和原生能力。

最终形成的工程结构具备 Android App 的运行适配基础，并保留 H5 构建入口。微信小程序仍需针对 renderjs、文件系统和 HTTPS 合法域名进行专门改造，不能将其描述为已完成。

**一句话总结：保留业务规则，重构平台边界；前端从浏览器运行方式迁移到 uni-app 多端工程，后端仍由 Express + SQLite 提供统一数据服务。**

## 附录：关键源码位置

| 内容 | 文件 |
|---|---|
| 原 Web 入口 | src/main.js |
| 原 Web 路由 | src/router/index.js |
| 原 Web 应用外壳 | src/App.vue |
| 原 Web API | src/utils/api.js |
| 原 Web 存储 | src/utils/storage.js |
| 原 Web Dexie | src/utils/db.js |
| uni-app 入口 | mobile/main.js |
| uni-app 生命周期 | mobile/App.vue |
| 页面注册 | mobile/pages.json |
| 应用配置 | mobile/manifest.json |
| 路由适配 | mobile/utils/router.js |
| 页面生命周期 | mobile/composables/usePageReady.js |
| API 请求 | mobile/utils/api.js |
| 账号数据隔离 | mobile/utils/accountScope.js |
| 文件适配 | mobile/utils/nativeFiles.js |
| 后端地址 | mobile/utils/serverAddress.js |
| 公共页面外壳 | mobile/components/AppShell.vue |
| SVG 图标 | mobile/components/AppIcon.vue / mobile/utils/icons.js |
| 富文本 | mobile/components/notes/RichNoteEditor.vue |
| 构建配置 | mobile/vite.config.js / mobile/scripts/build.mjs |
| 后端兼容 | server/mobileCompatibility.js / server/server.js |
