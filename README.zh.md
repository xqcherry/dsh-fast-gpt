# Fast GPT

[English](README.md) · 中文

一个 DeepSeek Harness Web 插件：在输入框工具栏添加 OpenAI 标志按钮，点击后在独立弹窗中打开 [ChatGPT](https://chatgpt.com/)。

## 功能

- 位于输入框工具栏、模型选择器左侧，不额外占用一行。
- 打开一个居中的 1080×840 弹窗；浏览器允许时，再次点击会聚焦已打开的窗口。
- 弹窗被拦截时，在按钮上方显示提示。
- 跟随 DSH 明暗主题，内置中文和英文文案。

## 环境要求

- 带 Conversation UI 的 DSH Web（已在 `0.2.2-rc.1` 测试）
- Node.js >= 20 与 pnpm（仅构建需要）

## 从源码安装

```bash
git clone https://github.com/xqcherry/dsh-fast-gpt.git
cd fast-gpt
pnpm install
pnpm build
dsh plugin --profile web add link:$PWD
```

也可以在 DSH Plugin Manager 中从本地目录安装。

## 使用

打开任意会话，输入框工具栏、模型选择器左侧会出现 OpenAI 标志。点击即可在独立窗口中打开 ChatGPT。

## 配置

编辑 [`src/client.ts`](src/client.ts) 顶部常量：

- `CHATGPT_URL` — 默认 `https://chatgpt.com/`
- `POPUP_WIDTH` / `POPUP_HEIGHT` — 默认 `1080` / `840`，会按屏幕收窄
- `WINDOW_NAME` — 用于窗口复用的名称

修改后重新构建并重新加载插件。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm build
```

`lib/` 由 TypeScript 生成，不纳入版本控制。

## 注意

- 需要允许 DSH 站点的弹窗，否则点击时会显示拦截提示。
- chatgpt.com 返回 `Cross-Origin-Opener-Policy: same-origin-allow-popups`；浏览器可能隔离弹窗，此时再次点击会新开窗口，而不是聚焦旧窗口。
- 本插件与 OpenAI 无关联。

## 商标

图标来自 [Simple Icons v13](https://github.com/simple-icons/simple-icons)（CC0 1.0）。“OpenAI”“ChatGPT”及 OpenAI 标志是 OpenAI 的商标。MIT 许可证只覆盖源代码，不覆盖该标志。

## 许可证

[MIT](LICENSE) © xqcherry
