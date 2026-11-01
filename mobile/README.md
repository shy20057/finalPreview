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
