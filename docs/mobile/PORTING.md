# 源码迁移约定（方案 A）

按用户选择保留 uni-app Vue 3 / App-Vue 页面结构，Android 为本轮目标。以相同手机内容视口、主题、数据和字体下的原网页为基准，不重新设计界面。

本文是**约定**（继续改代码时必须遵守的规则）。改动全貌与理由见 [MIGRATION.md](MIGRATION.md)，环境与运行步骤见 [README.md](README.md)，实测结论见 [VERIFICATION.md](VERIFICATION.md)。

## 对应关系

- `src/views/XxxView.vue` → `mobile/pages/<name>/index.vue`，页面映射见 README。
- `src/App.vue` → 每个正式页面共用的 `components/AppShell.vue`；认证页独立全屏。
- 原组件及 Store 保留对应文件与职责，DOM / 路由 / 存储 API 通过适配层替换。
- `public/assets/` → `static/assets/`，资源路径跟随移动端打包规则调整。

## 样式与模板

- 保留原数值、颜色、断点、动画参数和布局层级。
- 块级 HTML 标签转换为 `view`，行内文本为 `text`；标题等保留 `web-h1` 等语义类，并同步原标签选择器，不能将所有标签机械变成同一种元素。
- 新迁移按钮使用 uni-app `button`，通过默认样式重置保留原视觉，同时保留实际禁用和表单提交能力。已有自绘按钮必须在处理函数中检查禁用条件。
- 静态 SVG 使用 `AppIcon`。通过 renderjs 注入原始 SVG，单色继承颜色，彩色图标保留原色；收藏状态使用填充变体。动态分数图形在视图层绘制。Vue DOM 过渡替换为视图层 ViewTransition，避免逻辑层访问 classList / requestAnimationFrame。
- 网页链接使用 `RouteLink` 和移动端路由适配；外部地址按平台能力打开。

## 逻辑层与视图层

App-Vue 的普通逻辑层不直接访问 DOM；**不代表 Android 视图层没有 DOM**。Tiptap、原星空画布、动态 SVG 和 HTML 内容渲染由组件的 `renderjs` 块负责。视图层通过序列化消息与普通逻辑层通信，网络和本地存储仍由普通逻辑层处理。

- `utils/noteMarkdownView.js` 仅供富文本视图层使用，保留原 marked / Turndown 规则。
- `components/notes/RichNoteEditor.vue` 使用普通选项式脚本接收视图层消息；不在 renderjs 使用 script setup。
- 旧笔记在打开时不自动保存。保存目标固定为编辑器创建时的笔记和账号，失败草稿按服务地址及账号隔离。
- 所有普通页面的数据初始化使用 `onPageReady`，在鉴权与路由初始化后加载；答题页另行保留恢复状态。
- Android 页面会留在返回栈，路由对象及键盘 / 遮罩事件按所属页面隔离。

## Android 文件与依赖

- `uni.chooseFile` 不支持本工程的 Android App-Vue；文档选择和导出走 `utils/nativeFiles.js` 中的系统文档选择器。
- 原生本地文件及图片通过 `plus.io` 读取；H5 浏览器 API 放在对应条件编译块中。
- 运行依赖已声明在 `mobile/package.json`，独立运行前安装；不要继续使用旧版“无依赖”的说明。

## 验证及协作

遵守根目录 AGENTS.md：未经用户明确批准，不使用 superpowers；不执行测试、构建、启动验证或模拟器运行。源码迁移与静态审阅不等于编译通过或像素一致。运行、配置、测试与未验证项目见 README。
