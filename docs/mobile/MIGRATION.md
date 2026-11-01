# 从源项目到 uni-app：改动说明

本文回答一个问题：**把 `src/` 下的 Vue 3 网页工程搬到 uni-app 并跑在 Android 上，到底改了什么、为什么必须改。**

- **源项目**：仓库根目录的 Vue 3 + Vite 网页工程（`src/`、`public/`），配套 Express + SQLite 后端（`server/`）。
- **当前状态**：`mobile/` 下的 uni-app Vue 3 / App-Vue 工程，13 个页面已逐页迁移，Android 模拟器编译运行通过。
- **不变的**：后端 `server/`（同一个账号、同一份数据）、8 个 Pinia store 的业务规则、判分逻辑、设计令牌、题型的 DOM 结构与排版。
- **变的**：全部集中在"平台差异"上。

真正导致大量修改的，是下面五个方面。每一节都给出「原实现 → 当前实现 → 落在哪些文件」。

---

## 1. 页面路由不同

### 原实现

`src/router/index.js` 用 vue-router 的 hash 模式自己管路由：

```js
const router = createRouter({ history: createWebHashHistory(), routes })
router.beforeEach(async (to) => { /* 未登录跳 login，带 redirect */ })
```

页面靠 `<router-view/>` 渲染，链接靠 `<router-link to="/quiz/3">`，跳转靠 `router.push('/quiz/' + id)`，参数从 `route.params.bankId` / `route.query` 读。`/login` 和 `/register` 是两条路由，但指向同一个 `AuthView.vue`。

### 当前实现

uni-app 自己拥有导航，`pages.json` 是唯一路由表，页面栈由平台维护：

| 原（vue-router） | 当前（uni-app） |
| --- | --- |
| `createRouter` + `createWebHashHistory` | `pages.json` 登记 13 个页面 + `uni.navigateTo` / `redirectTo` / `reLaunch` / `navigateBack` |
| `<router-view/>` | 每个 `pages/*/index.vue` 是独立页面实例 |
| `<router-link to="...">` | `<RouteLink to="...">`（`components/RouteLink.vue`） |
| `router.push('/quiz/3')` | 同样写 `router.push('/quiz/3')`，适配层转成 `uni.navigateTo('/pages/quiz/index?bankId=3')` |
| `router.replace(...)` | `uni.redirectTo` |
| `route.params.bankId` | `route.params.bankId`（适配层保持同样的取值形状） |
| `route.query.x` | `route.query.x` |
| `router.beforeEach` 守卫 | `main.js` 的 `app.mixin({ onShow })` + `utils/router.js` 的 `guardAuth()` |
| `location.hash = '#/login'` | `uni.reLaunch({ url })` |
| `/login`、`/register` 两条路由 | 共用一个 `pages/auth/index`，用 `?mode=register` 区分视图 |

关键文件：

- `mobile/utils/router.js` —— **适配层**。导出 `ROUTES` 表、`useRoute()`、`useRouter()`、`toUrl()`、`syncRoute()`、`guardAuth()`，API 形状刻意与 vue-router 对齐，迁移过来的组件可以逐行对照原文件读。
- `mobile/main.js` —— `installRouteHooks({ onLoad, onShow })` 把 uni 的页面生命周期接给适配层；全局 mixin 在每次 `onShow` 时同步路由并跑鉴权守卫。
- `mobile/composables/usePageReady.js` —— 统一的「页面数据加载」入口：`onLoad` 时先 `syncRoute` → `guardAuth` → 拉数据；`onHide` → `onShow` 时刷新列表（答题页用 `{ refresh: false }` 退出，保留已答状态）。

### 两个容易踩的坑

1. **页面不会卸载**。Android 上页面留在返回栈里，原生 `<router-view>` 的"切走即销毁"假设不成立。当前做法是每个页面持有自己的路由快照（`useRoute()` 内部用 `shallowRef` 隔离），避免后台的答题页被别的页面的 `bankId` 重置。
2. **参数从 query 取**。uni-app 没有路径参数，`/quiz/:bankId` 变成 `/pages/quiz/index?bankId=3`，适配层再把它还原成 `route.params.bankId`。

---

## 2. 浏览器 API 和手机 API 不同

原工程整条链路都建立在浏览器全局对象上，uni-app 的逻辑层**没有** `window` / `document`。所有调用点必须换掉。

| 用途 | 原（浏览器） | 当前（uni-app） | 落地位置 |
| --- | --- | --- | --- |
| 本地存储 | `localStorage.getItem('quiz-token')` | `uni.getStorageSync` / `uni.setStorageSync` / `uni.removeStorageSync` | `utils/api.js` |
| 网络请求 | `fetch('/api/banks')` | `uni.request`（回调式，包成 Promise） | `utils/api.js` 的 `request()` |
| 页面跳转 | `router.push()` / `location.hash` | `uni.navigateTo` / `redirectTo` / `reLaunch` | `utils/router.js` |
| 页面返回 | `router.back()` | `uni.navigateBack` | `utils/router.js` |
| 文件选择 | `<input type="file">` + `FileReader` | `uni.chooseFile`（Android App-Vue 不支持）→ 系统文档选择器 | `utils/nativeFiles.js` |
| 消息提示 | `alert()` / `confirm()` | `uni.showModal` / `uni.showToast` | `utils/dialog.js` |
| 剪贴板 | `navigator.clipboard` | `uni.setClipboardData` | `utils/dialog.js` |
| 全局事件 | `window.dispatchEvent(new Event('quiz-auth-expired'))` | `uni.$emit('quiz-auth-expired')` / `uni.$on` | `utils/api.js` |
| DOM 插入 | `document.body.appendChild` | `uni.$emit('confetti-burst')` → `components/ConfettiLayer.vue` 渲染 | `utils/confetti.js` |

### 适配层的思路

不去逐个改调用点，而是**把浏览器 API 收敛到几个模块里**：

- `utils/api.js` —— 唯一的后端出口。`getToken` / `setToken` / `request()` 内部全部走 `uni.*`，上层 store 感知不到平台差异。
- `utils/storage.js` —— 保留原 `src/utils/storage.js` 的导出签名，内部转发到 `api.js`。
- `utils/nativeFiles.js` —— 统一封装文件读写；`utils/fs.js` 只是它的再导出，供 `ImportModal`、`RichNoteEditor`、`WrongTopBar`、`pages/resources` 等 7 处调用点使用。
- `utils/dialog.js` —— `promptText` / `showError` / `confirmAction` 的统一封装。
- `utils/router.js` —— 见上一节。

这样做的收益：**8 个 store 基本逐行照抄**，改动集中在 store 之下的那几层。

### 存储还要按账号隔离

原网页用 `localStorage` 的固定 key。换到 `uni.setStorageSync` 后，多账号切换会串数据，因此加了 `utils/accountScope.js`：

```js
accountStorageKey('wrongbook_mastered_overrides', userId)  // → 'wrongbook_mastered_overrides:7'
```

错题掌握标记、笔记草稿、待确认提交等本机状态都按「服务地址 + 账号」分区存储。

---

## 3. UI 渲染机制不同

### 3.1 状态栏、刘海、安全区、手势条

- `pages.json` 里 **13 个页面全部是 `"navigationStyle": "custom"`** —— 不使用原生导航栏，顶栏全部自绘，这样才有机会和原网页的顶栏像素对齐。
- 原生导航栏占掉的高度没有了，页面需要自己贴到状态栏下方。
- 底部手势条用 `env(safe-area-inset-bottom)` 处理：
  - `components/wrongbook/WrongDetailDrawer.vue:481`
  - `pages/quiz/index.vue:1270`

### 3.2 屏幕尺寸与 `rpx` 的取舍

uni-app 提供 `rpx`（750 基准自适应单位）。**本项目一个 `rpx` 都没用**，全部保留原网页的 `px` / `rem` 数值：

```
grep -r "rpx" mobile/styles mobile/components mobile/pages  →  0 处
```

理由：目标是"和原页面一模一样"。`rpx` 会按屏幕宽度重新缩放，同一份 CSS 在 394px 和 360px 宽的手机上会得到不同的物理尺寸，与原网页像素一致的目标冲突。改用固定像素 + 固定根字号：

- `manifest.json` 里 `"transformPx": false` —— 关掉 HBuilderX 默认的 px→rpx 转换。
- `styles/app.css` 里 `page { font-size: 16px; }` —— 固定根字号，抵消 HBuilderX 默认的 rem 缩放（这是本轮实机发现并修掉的问题之一）。

### 3.3 DOM 渲染限制与 renderjs

App-Vue 的**逻辑层没有 DOM**。这不影响 Flex、颜色、边框、字体、渐变、阴影这些照搬，但直接卡掉三类东西：

| 原网页做法 | 逻辑层能做吗 | 当前做法 |
| --- | --- | --- |
| 内联 `<svg>` 动态图标 | ❌ | `components/HtmlContent.vue` 用 renderjs 在**视图层**注入原始 SVG |
| `<canvas>` 星空背景 | ❌ | `components/StarField.vue` 的 renderjs 在视图层绘制 |
| 动态分数环形图 | ❌ | `components/ScoreRing.vue` 的 renderjs 在视图层绘制 |
| 富文本 HTML 内容 | ❌ | `components/HtmlContent.vue` 的 renderjs 渲染 |
| Vue `<Transition>` 过渡 | ❌ 逻辑层不能访问 `classList` / `requestAnimationFrame` | `components/ViewTransition.vue` 在视图层做进出场动画 |
| 逻辑层 ↔ 视图层通信 | — | 序列化消息（`props` 改动经由 `triggerEvent` 通知） |

**关键认知**：逻辑层没有 DOM ≠ Android 视图层没有 DOM。App-Vue 的视图层跑在 WebView 里，DOM 是有的——只是逻辑层碰不到它。renderjs 就是官方给的「在视图层执行 JS」的通道。

用到 renderjs 的组件共 6 个：`HtmlContent`、`RichNoteEditor`、`ScoreRing`、`StarField`、`UiBridge`、`ViewTransition`。

### 3.4 标签与选择器

- 块级 HTML 标签 → `view`，行内文本 → `text`，表单 → `input` / `textarea` / `picker`。
- 保留原来的语义类名（`web-h1` 等），并同步改写原标签选择器，不把所有元素机械地变成同一种。
- `styles/web-elements.css` 补齐了 `view` / `text` 相对原生标签的默认样式差异（`box-sizing`、`line-height`、`display` 等），让原 CSS 能原样生效。
- 输入框额外处理：`styles/app.css` 里 `.input .uni-input-input` 等选择器接管字体与颜色，避免 uni 输入组件的默认字体与原设计不符。

### 3.5 主题变量挂载点

| 原（`src/style.css`） | 当前（`mobile/styles/app.css`） |
| --- | --- |
| `:root { --accent-primary: ... }` | `page { --accent-primary: ... }`（uni 里 `page` 就是页面根） |
| `[data-theme="light"]` | `.theme-light`（App 没有 `<html>` dataset） |
| `[data-theme="dark-blue"]` | `.theme-dark-blue` |
| `body::before`（环境背景图） | `.ambient-bg` 真实元素，由 `components/AppShell.vue` 渲染 |

### 3.6 触摸、滚动、软键盘、Android 返回键

- 滚动容器由 `scroll-view` 承担，配合 `uni.pageScrollTo` 做定位。
- 软键盘弹起会压缩可视区域，答题页与笔记页的输入区需要自行处理。
- Android 物理返回键：由 uni 的页面栈接管（`navigateBack`）；返回栈只有一页时需要兜底到首页，`utils/router.js` 的 `back()` 已处理（`fail` 时 `uni.reLaunch` 到首页）。
- 事件模型从 `window` 事件改成 `uni.$on` / `uni.$emit`。

### 3.7 旧 WebView 兼容

目标模拟器是 Android 11 / WebView Chrome 83，实机发现并修掉的问题记录在 `VERIFICATION.md`，其中影响 UI 的有：

- 旧 WebView 的 SVG mask 显示为色块 → 改为视图层渲染原 SVG（保留原色与 `currentColor`）。
- 旧 WebView 不支持 `flex gap` → 补足间距。
- Tiptap 用的 `Array.findLast` / `Array.at` / `Object.hasOwn` 在旧 WebView 不存在 → `utils/viewPolyfills.js` 在缺失时补上这三个方法的实现。

### 3.8 字体加载方式变了

网页端在 `index.html` 里引 Google Fonts CDN：

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&..." rel="stylesheet">
```

APK 必须离线可用，且该域名在国内不可达，所以移动端把字体**自托管**：

- `static/fonts/` —— 10 个 woff2（Inter / Noto Serif SC / ZCOOL XiaoWei / Ma Shan Zheng），从 fontsource 的 npm 包里取出的最终产物（中间下载目录已清理）。
- `styles/fonts.css` —— 对应的 `@font-face`，路径写作 `/static/fonts/...`（uni-app 的静态资源规则）。
- 字体族名与字重和网页端保持一致，所以版式不受影响。

### 3.9 背景图路径

`src/style.css` 里是 `url('/assets/images/starry-night.jpg')`，uni-app 的静态资源要放在 `static/` 下并从 `/static/` 取：

- `styles/app.css` → `url('/static/assets/images/starry-night.jpg')`
- `components/HtmlContent.vue` 把 HTML 内容里的 `/assets/` 前缀改写成 `/static/assets/`。

---

## 4. 第三方依赖兼容性不同

| 依赖 | 原项目 | 当前 | 结论 |
| --- | --- | --- | --- |
| `vue` | `^3.4.21`（自装） | 装在 `mobile/node_modules` 的是 **3.5.39**（pinia / tiptap 的 peer 自动带入），但 **HBuilderX 构建用的是它自带的编译器 3.4.21** | 两条链路互不干扰：`npm run build:app` 走 `scripts/build.mjs` → HBuilderX 的 `uniapp-cli-vite`，不读 `mobile/node_modules/vue`；只有 `node --test` 直接 import 本地 vue |
| `pinia` | `3.0.4` | `3.0.4`（`mobile/package.json` 声明） | 直接可用，8 个 store 几乎照抄 |
| `vue-router` | `^4.6.4` | **移除** | 自研 `utils/router.js` 适配层代替 |
| `dexie` | `^4.4.4` | **移除** | 数据早已在后端 SQLite；`src/utils/db.js` 在网页端其实已无人引用（死代码），移动端未移植 |
| `@tiptap/vue-3` | `useEditor()` | **移除** | 见下方专述 |
| `@tiptap/core` + `pm` + `starter-kit` + 5 个扩展 | 部分 | `^3.27.1`（`mobile/package.json` 声明） | 富文本换了个跑法，但扩展集保持一致 |
| `marked` / `turndown` | `src/utils/noteMarkdown.js` | 拆成两半：逻辑层 `utils/noteMarkdown.js`（常量、图片处理）+ **视图层** `utils/noteMarkdownView.js`（marked / turndown） | marked 的浏览器正则放在逻辑层会导致启动失败，必须移进 renderjs |
| 原生 tabBar | — | **未使用** | 13 个页面全是 `navigationStyle: custom`，导航靠自绘顶栏 + 抽屉 + 命令面板，与原网页一致 |

### Tiptap 是最棘手的一个

`@tiptap/vue-3` 的 `useEditor()` 直接操作 DOM：`document.createElement`、`window.getSelection`、`contenteditable`、`MutationObserver`。App-Vue 的**逻辑层**根本没有这些东西，直接搬过来会直接崩。

当前做法（`components/notes/RichNoteEditor.vue`）：

- 富文本编辑器整体放进 **renderjs 块**，在视图层 `new Editor({...})`，直接用原 DOM API。
- 视图层用 `marked` / `turndown` 做 Markdown ↔ HTML 双向转换（`utils/noteMarkdownView.js`）。
- 逻辑层只负责业务：标题、所属题库、账号、保存目标、失败草稿；通过序列化消息与视图层通信。
- 自定义波浪下划线扩展 `components/notes/extensions/wavyUnderline.js` 随扩展一起搬过来。
- 打开笔记**不自动写回**；编辑后延迟保存，保存目标固定为「编辑器创建时的笔记 + 账号」；失败草稿按服务地址与账号隔离。

**跨端后果（必须说清楚）**：renderjs 是 App / H5 能力，**微信小程序不支持**。所以这套富文本方案不能直接照搬到小程序，小程序的富文本需要另做（例如 `rich-text` 组件 + 自定义节点）。同理，H5 的 `renderjs` 也只在 H5 有 DOM 时成立。

### 依赖版本的一个坑

`@vue/compiler-core` 依赖 `entities` 的 `./decode` 子路径导出。早期一次安装把 `entities` 解析到了一个不导出该子路径的版本，于是逻辑用例在 `import pinia` 时直接报：

```
ERR_PACKAGE_PATH_NOT_EXPORTED: './decode' is not defined by "exports" in
  mobile/node_modules/@vue/compiler-core/node_modules/entities/package.json
```

现在的 `mobile/package-lock.json` 把 `entities` 固定在 7.0.1（导出 `./decode`），问题消失。**教训：移动端的依赖必须走 lockfile，不要手改 `package.json` 里的版本再 `npm install`。**

另外注意网页端与移动端的 vue 版本天然不同（网页端装的是 3.5.39，HBuilderX 编译器是 3.4.21）。因为两边不共用运行时，所以**不要把网页端的 `node_modules` 复制到 `mobile/`**。

---

## 5. 网络请求和后端部署不同

### 原来的开发配置

`vite.config.js`：

```js
proxy: { '/api': { target: 'http://localhost:3000' } }
```

这只在 `npm run dev` 时有效。`npm run build` 出来的静态产物里 `/api` 是相对路径，靠同域反代兜底。

### 搬到 Android 之后

- 模拟器里的 `localhost` 指向**模拟器自己**，不是你的电脑 → 后端连不上。
- 官方模拟器访问宿主机回环地址要用 `10.0.2.2`。
- 真机要填电脑的**局域网 IP**。
- 微信小程序要求 HTTPS + 合法域名备案，本地 IP 一律不可用。

### 当前实现

`utils/api.js` 把后端地址变成一个可配置项：

```js
export function getApiBase() {
  const custom = uni.getStorageSync('quiz-api-base')
  if (custom) return custom
  // #ifdef H5
  return 'http://localhost:3000'
  // #endif
  // #ifndef H5
  return 'http://10.0.2.2:3000'
  // #endif
}
```

配套：

| 客户端 | 后端地址 |
| --- | --- |
| Android Studio 官方模拟器 | `http://10.0.2.2:3000`（App 默认值） |
| 电脑上的 H5 浏览器 | `http://localhost:3000`（H5 默认值） |
| Android 真机 | `http://电脑局域网IP:3000` |
| 线上服务 | 实际 HTTPS 地址 |

- `utils/serverAddress.js` —— 运行时改地址。登录前**长按"欢迎回来"/"创建账号"标题**打开输入框；登录后到「设置 → 连接设置」。地址会自动规范末尾斜线和 `/api`。切换服务会退出当前账号。
- `utils/api.js` 的 401 分支 —— 清 token、`uni.$emit('quiz-auth-expired')`、由页面跳登录；登录/注册接口的 401 单独报错为"用户名或密码错误"。
- 请求发出后如果「服务地址」或「token」在飞行途中被改动，本次响应直接作废并提示"账号或服务地址已切换，请重新操作"，避免旧响应写进新账号的数据。
- `manifest.json` 的 `app-plus.distribute.android.usesCleartextTraffic: true` —— **仅为本地联调开的明文 HTTP 开关**，正式发行不能带。
- 后端仍是同一个 `server/`（Express + SQLite），账号、题库、笔记、历史完全共享，不把数据库打进 APK。

---

## 改动清单

### 原样搬过去的（业务规则零改动）

| 原路径 | 当前路径 |
| --- | --- |
| `src/stores/*.js`（8 个） | `mobile/stores/*.js`（8 个，Pinia 逻辑一致） |
| `src/utils/parser.js` | `mobile/utils/parser.js`（内置题库同样硬编码在文件里） |
| `src/utils/validator.js` | `mobile/utils/validator.js` |
| `src/utils/ai.js` | `mobile/utils/ai.js` |
| `src/utils/clearAccountState.js` | `mobile/utils/clearAccountState.js` |
| `src/components/**`（25 个） | `mobile/components/**`（37 个，新增 12 个适配组件） |
| `src/views/*.vue`（13 个） | `mobile/pages/*/index.vue`（13 个） |
| `src/style.css` | `mobile/styles/app.css` + `web-elements.css` + `fonts.css` |
| `public/assets/images/` | `mobile/static/assets/images/` |

### 需要改的

| 领域 | 关键文件 | 改动 |
| --- | --- | --- |
| 路由 | `mobile/utils/router.js`、`mobile/main.js`、`mobile/composables/usePageReady.js` | vue-router → uni 导航；守卫改到 `onShow` mixin |
| 网络 | `mobile/utils/api.js` | fetch → uni.request；加 `getApiBase()` 与地址切换保护 |
| 存储 | `mobile/utils/accountScope.js`、各 store | localStorage → uni storage；按账号分区（`accountScope.js` 为移动端新增，网页端没有这一层） |
| 文件 | `mobile/utils/nativeFiles.js`（`fs.js` 再导出） | FileReader/input[file] → 系统文档选择器 + `plus.io` |
| 弹窗 | `mobile/utils/dialog.js` | alert/confirm → `uni.showModal` / `showToast` |
| 特效 | `mobile/utils/confetti.js` + `components/ConfettiLayer.vue` | DOM 插入 → 事件广播 + 组件渲染 |
| SVG / canvas / 富文本 | 6 个 renderjs 组件 | 逻辑层无 DOM → 视图层渲染 |
| 过渡动画 | `mobile/components/ViewTransition.vue` | Vue `<Transition>` → 视图层动画 |
| 图标 | `mobile/utils/icons.js` + `components/AppIcon.vue` | 内联 `<svg>` → 视图层注入；由根目录 `scripts/svg-codemod.mjs` 生成 |
| 外壳 | `mobile/components/AppShell.vue` | 原 `App.vue` 的 `<router-view>` + 顶栏 + 抽屉 → uni 页面外壳 |
| 主题 | `mobile/styles/app.css` | `:root` → `page`；`[data-theme]` → `.theme-*`；`body::before` → `.ambient-bg` |
| 工程 | `mobile/pages.json`、`manifest.json`、`vite.config.js`、`scripts/build.mjs` | uni-app 工程配置 |

### 明确没搬的

| 原东西 | 原因 |
| --- | --- |
| `src/utils/db.js`（Dexie） | 网页端已无人引用；数据在后端 SQLite |
| `src/utils/demoApi.js` / `demoSeed.js` | 网页端演示模式的后端替身与种子数据；移动端走真实后端，未移植 |
| `public/banks/*.md` + `banks.json` | 内置题库已硬编码进 `parser.js`，仓库里没有这两个目录 |
| 依赖 `vue-router` / `dexie` / `@tiptap/vue-3` | 见第 4 节 |

`src/utils/demoMode.js` **移植了**，但 HBuilderX 工程不加载 `.env`，`isDemoMode` 恒为 `false`，演示登录在移动端不可达（`pages/auth/index.vue` 仍按这个开关显示提示）。

---

## 验证状态

已完成：网页生产构建、移动端 App 资源构建、5 个文件 27 项逻辑用例、Android 11 / WebView 83 模拟器上的登录、四种题型交卷、结果页、笔记新建与自动保存、文件导出。

**尚未完成**：逐页像素级一致性验收（明暗主题 × 多种手机宽度 × 弹窗 × 动画退出）、注册流程、真实 AI 服务、附件图片、拖动、断网重试、真机返回键 / 软键盘 / 旋转、正式签名 APK、微信小程序端。

明细见 [VERIFICATION.md](VERIFICATION.md)，复现步骤见 [README.md](README.md)，迁移约定见 [PORTING.md](PORTING.md)。
