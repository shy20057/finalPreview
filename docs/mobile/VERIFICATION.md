# 移动端迁移验证记录

日期：2026-11-01。按用户本轮继续执行的授权进行构建与 Android 验证；后续任务仍遵守根目录 AGENTS.md，执行测试前先征求批准。本轮未使用 superpowers。

本文记录**实测结论**。改动全貌与理由见 [MIGRATION.md](MIGRATION.md)，环境与运行步骤见 [README.md](README.md)，迁移约定见 [PORTING.md](PORTING.md)。

## 环境

- Windows，Node.js 22.22.3，HBuilderX / Vue 3 编译器 5.34。
- Android SDK：`E:\a-developNew\android-sdk`。
- AVD：`fp_x86`，设备 `emulator-5554`，Android 11 / API 30 / x86，WebView Chrome 83，DPR 2.75，内容视口约 394 × 803 CSS px。
- HBuilderX 标准运行基座 `io.dcloud.HBuilder`，不是项目正式签名 APK。
- 后端使用 `.verification/quiz.db` 隔离数据库和专用测试账号，未使用真实账号数据。临时凭据、数据库、截图和驱动脚本位于被 Git 忽略的 `.verification/`。
- 原网页比较对象为本项目在 `127.0.0.1:5176` 的页面，保持相同账号、主题及手机视口。没有使用原本占用 5173 的其他项目。

## 已验证

| 项目 | 结果与范围 |
| --- | --- |
| 依赖 | 安装成功，新增 package-lock.json 固定本轮依赖 |
| 原网页生产构建 | `node node_modules/vite/bin/vite.js build` 成功 |
| App 生产资源构建 | 在 mobile 执行 `node scripts/build.mjs app`，输出 `DONE Build complete.` |
| 逻辑测试 | 5 个文件、27 项通过：评分、路由、提交快照、答题恢复和错题存储 |
| 安卓启动 | 编译成功、基座安装 / 同步 / 启动成功，登录后加载题库数据 |
| 页面加载 | 首页、登录、题库、答题、结果、历史、错题、收藏、资源、设置、个人中心、笔记及练习笔记已打开；列表页检查包含空状态 |
| 答题流程 | 测试题库含单选、多选、填空、简答；逐题提交、解析 / 参考答案、切题、交卷完成，结果页与后台均为 4 题正确、100 分 |
| 历史和个人中心 | 显示本次记录、100 分、4 道题统计 |
| 笔记 | 新建笔记、Tiptap 加载、输入、自动保存；后台与重新打开的内容一致 |
| Android 导出 | 打开系统保存文档对话框，写入 Downloads，读取导出文件内容与原笔记一致；发现扩展名被追加 .txt 后已修正 MIME 类型 |

逻辑测试复现命令（新任务执行前仍需批准）：

```powershell
Set-Location E:\a-ProjectNew\my_codingrepo\FinalPreview_fp\mobile
node --test tests/logic.test.mjs tests/submission.test.mjs tests/router.test.mjs tests/quiz-store.test.mjs tests/wrongbook-store.test.mjs
```

## 实机检查发现并修正的问题

- uni-app 未配置独立 Vite 插件时错误读取根目录网页配置；新增 mobile/vite.config.js 与 HBuilderX 构建入口。
- 普通逻辑层加载 marked 的浏览器正则导致启动失败；Markdown 转换移至 renderjs。
- renderjs 的 `$el` 为注释节点；编辑器、画布、内容和图形改用唯一宿主 ID 定位。
- DOM 版 Vue Transition 在逻辑层访问 classList / requestAnimationFrame；改由 ViewTransition 的视图层处理进入动画。
- 旧 WebView 的 SVG mask 显示为色块；改为视图层渲染原 SVG，保留原色及 currentColor。
- HBuilderX 默认 rem 缩放、首页换行及旧 WebView 不支持 flex gap；固定原版根字号、恢复换行并补足间距。计算兼容间距时暂停 CSS 过渡，避免 margin 累积。
- Tiptap 使用新 Array.findLast / Array.at / Object.hasOwn；为旧 WebView 补充非枚举兼容实现，笔记自动保存已复核。
- 评分与恢复：多选选项顺序、未完整填空的错题计数、简答默认分值、按账号隔离错题存储及恢复已修正。

## 尚不能视为完成的验收

- **不能宣称全部页面像素级一致。** 已修复明显图标、换行和间距差异，首页仍有浏览器字号度量、按钮行高和背景等细节需要逐页截图核对；明暗主题、其他手机宽度、弹窗、动画退出和所有数据状态尚未全部验收。
- 页面加载通过不代表该页每个操作均测试通过。注册、真实 AI 服务、附件图片、拖动、断网重试、登录过期、账号切换及真机返回 / 软键盘 / 旋转等完整矩阵尚未覆盖。
- 文件导入和更正 MIME 后的文件名仍需最终复核；已导出的原测试文件内容正确。
- 尚未生成、签名或安装正式 APK；manifest.json 已统一为本机 HBuilderX 界面中已有的 __UNI__E2F0D4F，避免编辑缓冲区与磁盘标识不同。正式发布需要项目所属 AppID、包名及签名配置。
- 调试热更新发生过重复同步与旧脚本缓存，完整重启 / 直接启动基座后可恢复。此类调试连接问题与正式 APK 行为应分别验证。

配置与复现操作见 [README.md](README.md)。

## 交接范围

用户于本轮明确限定：仅继续恢复安卓项目稳定启动，其余视觉与专项验收由用户接手。后续不自行追加测试。标准 HBuilderX 基座须配合 HBuilderX 使用；不要用直接复制生产资源替代项目运行或正式 APK 安装。

## 启动恢复的明确原因与修复

直接使用 root ADB 复制生产资源，使基座 www 目录中的文件带上 root:root 属主及 storage_file:s0 标签；日志明确出现读取 manifest.json 与 app-config-service.js 的 EACCES。2026-11-01 已将该同步目录恢复为基座 UID/GID 10167:1078，并恢复与其父目录一致的 media_rw_data_file SELinux 标签，项目页面已重新显示。该操作只针对本轮 emulator-5554 上 io.dcloud.HBuilder 的应用资源目录，不改项目业务数据。后续使用正常 HBuilderX 同步，不再手动覆盖基座资源。重置基座期间的测试会话已清除，后端隔离测试数据库与 Downloads 导出样本保留。
