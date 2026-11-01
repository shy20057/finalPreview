# Vue 项目迁移 uni-app 多端应用实验记录

姓名：________　学号：________　班级：________　实验日期：________

> 本文件是实验报告模板。表中已填内容来自本仓库的实际构建与实机记录（证据见 [VERIFICATION.md](VERIFICATION.md)）；尚未真实执行的项目保持"待执行"，不要把模板当作已运行或已发布的证明。
> 迁移改动的完整说明见 [MIGRATION.md](MIGRATION.md)。

## 实验目的

参考 [uni-app HBuilderX 快速上手](https://uniapp.dcloud.net.cn/quickstart-hx.html)，使用 HBuilderX 将上次实验的 Vue 项目迁移至 uni-app，尝试 H5、微信小程序、Android 运行，并完成目标终端发行。

## 原项目与迁移方案

原项目为 Vue 3 + Vite + Node.js / SQLite 的期末复习题库系统。新增 `mobile/` uni-app Vue 3 工程，保留原网页及后端，共享账号、题库、笔记、收藏和历史。

| 迁移项目 | 原实现 | 新实现 |
| --- | --- | --- |
| 页面 | Vue Router（hash 模式） | `pages.json` + `uni.navigateTo` / `redirectTo` / `reLaunch` |
| 路由守卫 | `router.beforeEach` | `main.js` 的 `onShow` mixin + `utils/router.js` 的 `guardAuth()` |
| 请求 | `fetch` + Vite 代理 | `uni.request` + 后端绝对地址（模拟器 `10.0.2.2`） |
| 缓存 | `localStorage` | `uni.getStorageSync` / `setStorageSync`，并按服务地址与账号分区 |
| 布局 | 宽屏网页 | 13 个页面全部自绘顶栏（`navigationStyle: custom`），保留原 px / rem 数值 |
| 编辑器 | Tiptap（`@tiptap/vue-3`） | Tiptap 核心 + 扩展放进 `renderjs` 视图层，逻辑层只管保存 |
| 图标 / 星空 / 分数环 | 内联 SVG、canvas、DOM 过渡 | 6 个组件用 `renderjs` 在视图层渲染 |
| 文件导入导出 | `<input type="file">` + FileReader | 系统文档选择器 + `plus.io` |
| 运行发行 | Vite Web 产物 | HBuilderX 各端编译与发行 |

## 环境记录

| 项目 | 实际值 |
| --- | --- |
| Windows 版本 | 待填写（Windows 11） |
| HBuilderX 版本及安装目录 | 5.34，`E:\a-developNew\HBuilderX` |
| Node.js 版本 | 22.22.3 |
| 微信开发者工具版本 | 未安装，本轮未执行微信端 |
| Android 设备 / 模拟器与系统版本 | 模拟器 `fp_x86`，`emulator-5554`，Android 11 / API 30 / x86，WebView Chrome 83 |
| Android SDK | `E:\a-developNew\android-sdk` |
| 后端服务地址 | App 默认 `http://10.0.2.2:3000`；验证时用 `.verification/quiz.db` 隔离数据库与测试账号 |
| DCloud AppID / 微信 AppID | `__UNI__E2F0D4F`（本机 HBuilderX 已有）；微信 AppID 未申请（不记录密钥） |
| 应用版本 / 包名 | versionName `1.0.0`，versionCode `100`；正式包名与签名未配置 |

## 操作过程与证据

| 步骤 | 当前状态 | 操作后记录与截图位置 |
| --- | --- | --- |
| 下载并启动 HBuilderX | 已执行 | `E:\a-developNew\HBuilderX\HBuilderX.exe` |
| 导入 `mobile/`，识别为 Vue 3 uni-app | 已执行 | 导入目录 `mobile/`，`vueVersion: 3` |
| 安装移动端依赖 | 已执行 | `mobile/package.json` + `package-lock.json` |
| 启动原后端、配置服务地址并登录 | 已执行 | `server/` 端口 3000；App 用 `10.0.2.2`，长按标题可改地址 |
| App 资源构建 | 已执行 | `npm run build:app` → `unpackage/dist/build/app`（资源包，非签名 APK） |
| 逻辑用例 | 已执行 | `npm run test:logic` → 5 个文件 27 项通过 |
| Android 模拟器编译运行 | 已执行 | 编译、安装基座、同步、启动成功，登录后加载题库 |
| 四种题型交卷与结果 | 已执行 | 单选 / 多选 / 填空 / 简答；4 题正确、100 分，后台记录一致 |
| 笔记新建、编辑与自动保存 | 已执行 | 服务端与重新打开的内容一致 |
| Android 文件导出 | 已执行 | 系统保存对话框写入 Downloads，内容与原笔记一致 |
| H5 终端运行 | 待执行 | 入口脚本已就绪（`npm run build:h5`），尚未在浏览器中实跑 |
| 微信开发者工具编译运行 | 待执行 | 本轮未安装、未配置微信 AppID |
| Android 云打包并安装 APK | 待执行 | 未触发云打包，未生成签名 APK |
| 微信发行、上传 / 提交审核 / 发布 | 按账号条件实际执行 | 本轮未执行 |

建议截图：HBuilderX 工程目录及控制台、Android 首页 / 答题 / 结果、笔记编辑、文件导出对话框。若仅完成开发者工具预览，请如实写"预览"，不要写"已上线"。

## 发行记录

| 项目 | 实际值 |
| --- | --- |
| 发行终端 | 待填写（已验证终端为 Android 模拟器） |
| 应用版本 / 包名 | 待填写（versionName `1.0.0` / versionCode `100` 已就绪） |
| 打包时间及状态 | 待填写 |
| APK 实际路径与文件名 | 待填写 |
| 微信上传版本、审核与发布状态 | 待填写 |
| 安装 / 访问结果 | 待填写 |

## 遇到的问题与解决办法

1. 问题：逻辑层加载 marked 的浏览器正则导致 App 启动失败　原因：普通逻辑层无 DOM / 正则依赖浏览器实现　处理：Markdown 转换移入 `renderjs` 视图层（`utils/noteMarkdownView.js`）　结果：启动正常，笔记渲染与保存一致
2. 问题：逻辑层访问 `classList` / `requestAnimationFrame` 做过渡动画　原因：逻辑层无 DOM　处理：改由 `components/ViewTransition.vue` 在视图层做进出场动画　结果：页面切换正常
3. 问题：旧 WebView（Chrome 83）中 SVG mask 显示为色块　原因：该版本对 SVG mask 支持异常　处理：改为视图层渲染原始 SVG，保留原色与 `currentColor`　结果：图标显示正常
4. 问题：HBuilderX 默认 rem 缩放导致首页换行、间距变化　原因：默认根字号与原设计不一致　处理：`manifest.json` 设 `transformPx: false`，`page` 固定 `font-size: 16px`　结果：与原网页版式一致
5. 问题：模拟器访问 `http://localhost:3000` 连接失败　原因：模拟器内 `localhost` 指向自身　处理：改用 `10.0.2.2`，并支持运行时配置局域网 IP　结果：登录与接口正常
6. 问题：逻辑用例在 `import pinia` 时报 `ERR_PACKAGE_PATH_NOT_EXPORTED: './decode'`　原因：`@vue/compiler-core` 依赖 `entities` 的 `./decode` 子路径导出，安装时解析到了不导出该子路径的版本　处理：用 `package-lock.json` 把 `entities` 固定在 7.0.1　结果：27 项用例全部通过
7. 问题：导出文件扩展名被追加 `.txt`　原因：MIME 类型设置不当　处理：修正 MIME 类型　结果：导出文件名与内容正确
8. 问题：________　原因：________　处理：________　结果：________

可观察：真机 localhost 访问失败、USB 调试未授权、微信服务端口未开、AppID 未配置、HTTP / HTTPS 与域名限制、网页 DOM API 无法直接运行、富文本编辑器的跨端差异。

## 实验结论

实际完成的终端与功能：Android 模拟器（Android 11 / API 30 / x86）上的 App-Vue 编译与运行；登录、题库、单选 / 多选 / 填空 / 简答四种题型交卷、结果与历史、错题本、收藏、笔记新建与自动保存、文件导出；网页端与移动端生产构建通过，27 项逻辑用例通过。

尚未完成的操作及原因：微信小程序端未执行（本轮未安装开发者工具、未申请 AppID，且 renderjs 富文本方案不支持小程序，需另行适配）；H5 终端未在浏览器实跑；未生成、签名或安装正式 APK；逐页像素级一致性验收尚未完成，明暗主题、多种手机宽度、弹窗与动画退出仍需逐项截图核对。

对 Vue 到 uni-app 迁移的理解：业务逻辑（store、判分、题型结构）几乎可以原样搬，真正的工作量集中在五个平台差异上——页面路由、浏览器 API、UI 渲染机制、第三方依赖兼容性、网络与后端部署。做法不是逐处打补丁，而是把平台差异收敛成适配层（`utils/router.js`、`utils/api.js`、`utils/nativeFiles.js`、`utils/dialog.js`）与视图层组件（`renderjs`），让上层代码保持可读、可对照。完整说明见 [MIGRATION.md](MIGRATION.md)。
