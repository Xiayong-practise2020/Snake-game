# 青蛇 · Snake

基于产品设计和技术方案的单人贪吃蛇 MVP，使用 TypeScript、Vite 和 Canvas 2D。

需要 Node.js 22.12+（推荐 Node.js 22 LTS）和 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。方向键 / WASD 移动，空格暂停或继续；点击开始后才移动。20×20 棋盘，每 150 ms 移动一格。

```sh
npm run typecheck
npm run test
npx playwright install chromium firefox webkit
npm run test:e2e
npm run build
```

`dist/` 为静态网站构建产物。部署子目录时使用 `npm run build -- --base=/目标路径/`。

本次验证环境未预装 Node.js，项目 `.runtime/node-v22.20.0-win-x64/` 中提供了未纳入 Git 的便携运行时。当前电脑可以在 PowerShell 中执行：

```powershell
$env:PATH = "$PWD\.runtime\node-v22.20.0-win-x64;$env:PATH"
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.runtime\browsers"
npm.cmd run dev
```

验收结果见 [实现检查清单](docs/implementation-checklist.md)。

规则与输入、计时器由单元测试覆盖；浏览器测试在 Chromium、Firefox 和 WebKit 验证流程。确定性测试接口仅在 Vite `--mode test` 下启用，正常生产构建不包含该接口。首版没有音效、难度选择、触控、排行榜或最高分保存。
