# FinalPrep 移动端（方案 A）

本目录是独立的 **uni-app Vue 3 / App-Vue** 工程。按原网页逐页迁移，首要运行目标为 **Android**；原网页 `src/` 与 Express / SQLite 后端继续保留。普通页面使用 uni-app 页面与组件，Tiptap 编辑器、星空画布及动态 SVG 使用 `renderjs` 在视图层运行。

**当前状态：13 个正式页面源码已迁移；原网页与移动端生产资源构建通过，27 项逻辑测试通过；Android 模拟器已运行，登录、四种题型交卷及笔记自动保存已核验。像素级一致性尚未全部验收，不能以构建通过替代。** 详细环境、证据及未覆盖项目见 [VERIFICATION.md](VERIFICATION.md)。

## 1. 环境与导入

- HBuilderX App 开发版，启用 uni-app Vue 3 编译器与 App 运行插件。
- Node.js 支持 `node:sqlite`（建议 22.13 或更新的兼容版本），供原后端使用。
- HBuilderX 单独导入此 `mobile/` 目录；根目录的 `npm run dev` 启动的是原网页。
- `mobile/package.json` 已声明 Pinia、marked、Turndown 和 Tiptap 依赖。独立运行前在本目录安装依赖。Vue 和 uni-app 编译器由 HBuilderX 提供。
- 在 `manifest.json` 可视化界面获取自己的 DCloud AppID；当前与本机 HBuilderX 已有的 `__UNI__E2F0D4F` 保持一致。不要把 DCloud AppID 与 Android 包名混用。

获准进行环境准备和验证后，可执行：

```powershell
Set-Location E:\a-ProjectNew\my_codingrepo\FinalPreview_fp\mobile
npm install
# HBuilderX 位于其他路径时，先设置 $env:HBUILDERX_HOME
npm run build:app
# 输出为 unpackage/dist/build/app，这是 App 资源包，并非签名 APK。
```

本机已使用 HBuilderX 5.34 和下列工具运行测试：

```text
E:\a-developNew\HBuilderX\HBuilderX.exe
E:\a-developNew\android-sdk\platform-tools\adb.exe
E:\a-developNew\android-sdk\emulator\emulator.exe
E:\a-developNew\HBuilderX\plugins\launcher-tools\tools\adbs\adb.exe
```

## 2. 后端与连接地址

沿用 `server/` 的账号和数据，不把 SQLite 数据库打包进 APK。启动现有后端前，先备份 `server/data/`；工作区已有的 `mobileCompatibility.js` 会在启动时补充兼容字段。

获准后，在单独终端启动：

```powershell
Set-Location E:\a-ProjectNew\my_codingrepo\FinalPreview_fp\server
npm install
npm start
```

依赖已安装时可跳过安装。默认端口为 `3000`。

| 客户端 | 后端地址 |
| --- | --- |
| Android Studio 官方模拟器 | `http://10.0.2.2:3000`（App 默认值） |
| 电脑上的 H5 浏览器 | `http://localhost:3000`（H5 默认值） |
| Android 真机 | `http://电脑局域网IP:3000` |
| 线上服务 | 实际 HTTPS 地址 |

登录前需要修改地址时，**长按“欢迎回来”或“创建账号”标题**；登录后可到“设置 → 连接设置”修改。地址不需要 `/api`，保存时会规范末尾斜线和 `/api`。切换服务会退出当前账号。本机主题、错题标记、笔记草稿和待确认提交按后端及账号隔离。

Android 模拟器中的 `localhost` 指向模拟器自身；`10.0.2.2` 是官方模拟器访问宿主机回环接口的专用地址：[Android 网络说明](https://developer.android.com/studio/run/emulator-networking-address)。第三方模拟器的地址规则需按其官方说明配置。

## 3. Android 模拟器配置与运行

以下为复现步骤；新的测试任务仍须按根目录 AGENTS.md 先取得批准。

1. 在 Android Studio 的 SDK Manager 确认安装 Android SDK Platform-Tools、Android Emulator 和系统镜像。
2. 在 Device Manager 创建手机 AVD，选择与当前 HBuilderX 运行基座 ABI 兼容的镜像并启动。本轮使用已有 `fp_x86`（Android 11 / API 30 / x86），设备 ID 为 `emulator-5554`。HBuilderX 提供运行基座，模拟器由 Android SDK 单独提供。
3. 在 HBuilderX 的运行设置中选择 ADB。可使用上述 SDK 的 `platform-tools/adb.exe`，并让模拟器与 HBuilderX 使用一致的 ADB，避免连接冲突。
4. 若需要检查设备，在 PowerShell 执行以下命令，期望看到状态为 `device` 的 `emulator-xxxx`：

   ```powershell
   & 'E:\a-developNew\android-sdk\platform-tools\adb.exe' devices
   ```

5. 打开 `mobile` 项目，选择“运行 → 运行到手机或模拟器 → Android App 基座”（具体菜单名称以安装版本为准），选择模拟器。
6. 如提示安装插件、基座或填写 AppID，按 HBuilderX 界面完成。若出现 ABI 不匹配，调整模拟器镜像或使用匹配的基座。
7. 启动原后端。App 默认连接 `http://10.0.2.2:3000`，使用原账号登录。
8. 如果网络失败，先核对后端运行状态、端口、地址及实际基座的 HTTP 网络策略。本机联调的 HTTP 配置不等同于正式发行配置。

官方参考：[创建 AVD](https://developer.android.com/studio/run/managing-avds)、[HBuilderX 运行到 Android](https://uniapp.dcloud.io/tutorial/run/run-app.html)、[设备连接排查](https://uniapp.dcloud.io/tutorial/run/run-app-faq.html)。

## 4. 迁移范围

`pages.json` 登记 13 个页面：

| 原网页 | 移动端 |
| --- | --- |
| HomeView | `pages/index/index.vue` |
| AuthView（登录、注册） | `pages/auth/index.vue` |
| BankListView | `pages/banks/index.vue` |
| QuizView | `pages/quiz/index.vue` |
| ResultView | `pages/result/index.vue` |
| HistoryView | `pages/history/index.vue` |
| WrongBookView | `pages/wrongbook/index.vue` |
| FavoriteView | `pages/favorites/index.vue` |
| ResourcesView | `pages/resources/index.vue` |
| SettingsView | `pages/settings/index.vue` |
| ProfileView | `pages/profile/index.vue` |
| NotesView | `pages/notes/index.vue` |
| QuizNotesView | `pages/quiz-notes/index.vue` |

已迁移顶栏、导航抽屉、命令面板、浮岛菜单、日期选择器、笔记目录、四种题型、确认弹窗、错题组件、AI 面板与结果图形。保留原版明暗主题、响应式断点、背景图片和本地字体。

- 页面数据加载先等待路由与鉴权，列表返回时刷新；后台页面保留独立路由快照。
- 答题恢复保留答案、题序与逐题提交状态；交卷冻结快照并使用原后端支持的提交标识去重，失败可重试，本机保留待确认结果。
- 笔记使用 Tiptap 富文本，保留标题、列表、颜色、高亮、下划线、波浪下划线、链接及图片。打开笔记不自动写回；编辑后延迟保存，失败保留账号隔离的本机草稿。
- Android 文件导入与导出使用系统文档选择 / 保存对话框。图片使用 `uni.chooseImage` 和 `plus.io` 读取。
- 学习资源按原后端地址在 Android 外部浏览器打开。AI 沿用原配置与非流式请求。
- 设置页厂商配置可长按设为默认，目录节点通过菜单重命名，长按节点后拖动调整层级和顺序。

## 5. UI 验收方式

默认与**相同手机内容视口下的原网页响应式布局**比较，而非将电脑宽屏截图压缩到手机。

1. 先固定一组账号数据、CSS 内容视口、设备缩放、字体缩放、主题与滚动位置。
2. 分别截取原网页和 Android App 内容区，系统状态栏与系统导航栏单独记录。
3. 等待本地字体、图片和数据加载完成；静态页面固定动画状态，星空和随机特效另行核对参数及表现。
4. 对照标题、换行、字体字重、卡片尺寸、间距、阴影、图标、输入框、弹窗、抽屉及滚动区域。
5. 对照两种主题和至少两组手机宽度；较宽尺寸同时检查原版桌面导航及浮岛菜单。
6. 逐项记录差异、修正后复查；本轮截图与现存差异见 VERIFICATION.md。

## 6. 功能验收清单

- 登录、注册、错误密码、过期登录、退出、切换后端及账号隔离。
- 题库筛选、重命名、导入、删除。
- 单选、多选、填空、简答；上一题、下一题、提交锁定、暂停恢复。
- 交卷、断网重试、防重复提交、历史和结果。
- 错题筛选、日期、掌握标记、收藏和详情抽屉。
- 笔记目录、新建、重命名、拖动、富文本、图片、保存、草稿恢复、导入与导出。
- 逐题笔记、AI 配置、解析与聊天滚动。
- 资源上传、打开、隐藏、恢复及删除。
- Android 返回键、软键盘、屏幕旋转、页面返回、滚动与底部安全区域。

`mobile/tests/` 已整理为 5 个文件、27 项逻辑用例，本轮执行通过。上面清单包含尚未覆盖的场景，具体范围见 VERIFICATION.md。

## 7. APK 与其他平台

模拟器验证通过后，再配置自己的 AppID、包名、图标和签名证书，通过 HBuilderX 的发行入口生成 Android APK，并安装验证。当前没有构建 APK、触发云打包、上传或发布。正式签名和发布配置尚未完成。

本轮选择的是 Android 原样迁移。App / H5 的 `renderjs` 方案不等于微信小程序兼容；微信等其他平台的富文本与图形需另行适配，不能沿用旧 README 的跨端完成结论。

## 8. 文件导航

```text
mobile/
├── App.vue / main.js          应用入口、全局组件及生命周期
├── pages.json / manifest.json
├── pages/                    13 个正式页面（svgtest 为已有调试文件）
├── components/               页面外壳、题目、导航、富文本与图形
├── composables/usePageReady.js
├── stores/                   8 个 Pinia Store
├── utils/                    API、路由、账号隔离、文件与内容适配
├── styles/                   原设计系统、字体与标签默认样式
├── static/assets/images/     原网页图片
├── static/fonts/             本地字体
├── static/resources/         原学习资源
└── tests/                    27 项逻辑用例（新任务执行仍需批准）
```

技术依据：[renderjs](https://uniapp.dcloud.net.cn/tutorial/renderjs.html)、[文件选择平台差异](https://uniapp.dcloud.io/api/media/file)、[HTML5+ 文件 API](https://www.html5plus.org/specification/IO.html)。
