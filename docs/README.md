# 文档索引

本目录集中存放项目文档。工程本体见仓库根目录 [README.md](../README.md) 与 [CLAUDE.md](../CLAUDE.md)。

## 移动端（uni-app / Android）

| 文档 | 内容 | 适合谁 |
| --- | --- | --- |
| [mobile/README.md](mobile/README.md) | 环境、后端地址、模拟器运行步骤、验收清单、文件导航 | 第一次把项目跑起来的人 |
| [mobile/MIGRATION.md](mobile/MIGRATION.md) | 从源项目到 uni-app 改动了什么，围绕页面路由 / 平台 API / UI 渲染 / 第三方依赖 / 网络部署五方面 | 写实验报告、做迁移总结的人 |
| [mobile/PORTING.md](mobile/PORTING.md) | 迁移约定：标签映射、样式规则、逻辑层与视图层边界、文件与依赖处理 | 继续改这份代码的人 |
| [mobile/VERIFICATION.md](mobile/VERIFICATION.md) | 已验证项、实机发现并修正的问题、尚未验收项 | 复核质量、接手验收的人 |
| [mobile/EXPERIMENT.md](mobile/EXPERIMENT.md) | 实验报告模板（姓名 / 学号 / 环境 / 证据 / 发行记录） | 交作业的人 |
| [mobile/fidelity-plan.md](mobile/fidelity-plan.md) | 迁移实施过程记录（按时间追加） | 追溯实施轨迹的人 |

阅读顺序建议：先 [mobile/README.md](mobile/README.md) 把项目跑起来，再看 [mobile/MIGRATION.md](mobile/MIGRATION.md) 理解改动，最后用 [mobile/VERIFICATION.md](mobile/VERIFICATION.md) 判断哪些结论还有效。
