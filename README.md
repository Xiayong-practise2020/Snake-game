# 青蛇 · Snake

基于产品设计和技术方案的单人贪吃蛇 MVP，使用 TypeScript、Vite 和 Canvas 2D。

## Windows 一键启动

双击项目目录中的 **开始游戏.cmd**，会自动启动后台服务，并在默认浏览器中打开游戏。点击页面的“开始游戏”即可游玩。重复双击会复用服务，不会重复启动；启动器只使用本机地址 `http://127.0.0.1:17863/`。

当前电脑可直接使用已有的便携 Node.js 和生产构建。其他电脑需要 Node.js 22.12+ 或相同位置的便携运行时；若没有生产构建，启动器会自动安装缺失的依赖并构建（首次需要联网）。修改游戏源码后运行 `npm run build` 更新一键启动使用的页面。

后台服务在电脑重启后结束。如果 17863 端口被其他程序占用，启动器会显示错误提示。

需要 Node.js 22.12+（推荐 Node.js 22 LTS）和 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。方向键 / WASD 移动，空格暂停或继续；点击开始后才移动。25×25 棋盘，每 250 ms 移动一格。

食物带有脉冲缩放和金红粒子环绕，吃到时播放爆散动画；暂停会冻结动画，重开会清空粒子。

音效默认开启，使用 Web Audio API 合成，无需外部音频文件。吃食物播放上升叮咚音、碰撞播放低沉爆炸音、实际转向播放轻微嘀声；操作区的音效按钮可随时静音或取消静音。首次点击或按键后启用音频。

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

规则与输入、计时器、粒子和音效由单元测试覆盖；浏览器测试在 Chromium、Firefox 和 WebKit 验证流程。确定性测试接口仅在 Vite `--mode test` 下启用，正常生产构建不包含该接口。首版没有难度选择、触控、排行榜或最高分保存。
