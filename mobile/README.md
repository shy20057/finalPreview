# mobile/

uni-app Vue 3（App-Vue）工程，目标平台 Android。请用 HBuilderX 单独导入本目录；Vue 与 uni-app 编译器由 HBuilderX 提供。

本工程的说明文档集中在 [`docs/mobile/`](../docs/mobile/)：

- 运行步骤与验收清单 → [docs/mobile/README.md](../docs/mobile/README.md)
- 迁移改动说明 → [docs/mobile/MIGRATION.md](../docs/mobile/MIGRATION.md)
- 迁移约定 → [docs/mobile/PORTING.md](../docs/mobile/PORTING.md)
- 验证记录 → [docs/mobile/VERIFICATION.md](../docs/mobile/VERIFICATION.md)

常用命令（在本目录执行）：

```bash
npm install        # 安装依赖（不要自行安装 vue，交给 HBuilderX 编译器）
npm run build:app  # 构建 App 资源包 → unpackage/dist/build/app
npm run test:logic # 逻辑用例（执行前需按 AGENTS.md 取得用户批准）
```

微信小程序真机调试：在 HBuilderX 中重新运行到微信开发者工具，导入目录应为
`mobile/unpackage/dist/dev/mp-weixin`。请勿直接修改该目录下生成的配置。

`manifest.json` 的微信 `packOptions.ignore` 排除本地字体、未使用的咖啡馆原图
和向日葵大图。微信端已禁用本地字体样式，继续使用系统回退字体；题目插图保留。
微信编译前，Vite 使用 HBuilderX 编译器自带的 Jimp，将向日葵原图生成到
`static/mp-weixin/sunflowers.jpg`（最长边 960px，最多 256KB），浅色主题引用此副本。
App/H5 继续使用原图和原字体。该副本自动生成，不提交到 Git。

出现 `80051 / source size exceed max limit 4MB` 后，应重新通过 HBuilderX 编译，
再在微信开发者工具中查看代码依赖分析和真机调试包大小；只在工具中重新点编译，
不会重新生成 uni-app 的资源和配置。构建、启动和测试仍需按 `AGENTS.md` 取得批准。

若重新构建后界面仍显示旧尺寸，应核对生成的 WXSS 与模拟器节点的实际样式。
本项目曾出现产物已更新、运行中节点仍沿用旧样式的情况：在微信开发者工具中
清除当前项目的“编译缓存”，关闭并重新打开该项目后恢复。此操作只需清除编译
缓存，账号和本地存储应保留。登录和注册输入框采用 52px 外框、28px 单行输入区
垂直居中布局；修改后应检查空白提示、聚焦、输入及注册状态的实际显示。
