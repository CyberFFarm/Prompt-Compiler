# Intent Compiler

Intent Compiler 用于将自然语言意图转换为高质量提示词（Prompt），服务于各类 LLM 工作流。
它既可完全本地运行（规则解析 + 模板编译），也可按用户需求接入模型适配器。

English README: [README.md](README.md)

## 项目概述

Intent Compiler 被设计为可复用的 Prompt 工程层，适用于 CLI 工具、自动化脚本与 Web Playground。
你无需为每类任务手工维护大量模板，只需提供意图文本与可选约束，即可获得：

- 结构化意图
- 编译后的 Prompt
- 质量分析
- Prompt 变体
- 多模型适配结果

## 核心功能

- 意图解析：自然语言转结构化字段
- Prompt 编译：结构化意图转提示词
- Prompt 分析：质量评分与问题提示
- Prompt 重写：structured / creative / technical 三类变体
- 模型适配：OpenAI、Claude、Gemini、Generic、DeepSeek、Qwen、Minimax（按用户需求配置）
- Prompt diff：对比 Prompt 改动
- Prompt 库：保存 / 列表 / 获取可复用 Prompt
- 反馈与演进：采集反馈并生成改进版本
- CLI + Web Playground：同时支持交互使用与脚本集成

## 技术栈

| 组件 | 技术 |
|---|---|
| 语言 | TypeScript |
| 运行时 | Node.js |
| CLI | commander |
| Web 演示 | Express |
| HTTP 客户端 | undici |
| 环境变量加载 | dotenv |

## 环境要求

- Node.js 18+（推荐 20+）

## 快速开始

全局安装：

```bash
npm install -g intent-compiler
intent
```

或使用 npx（免安装）：

```bash
npx intent-compiler
```

本地开发运行：

```bash
npm install
npm run dev -- --text "Write an article about AI startup risks" --tone analytical --length "1200 words" --output pretty
```

## 配置说明

你可以在项目根目录使用 `intent.config.json`，也可以使用 [config/intent.config.json](config/intent.config.json)。
同时支持通过 `INTENT_CONFIG` 指向自定义配置路径。

示例：

```json
{
  "defaults": {
    "models": ["openai", "claude"],
    "output": "pretty",
    "preset": "article",
    "overrides": {
      "tone": "analytical",
      "length": "1200 words",
      "format": "markdown",
      "language": "en"
    }
  },
  "providers": {
    "openai": {
      "apiKeyEnv": "OPENAI_API_KEY",
      "model": ""
    }
  },
  "storage": {
    "libraryPath": "./data/prompt-library.json",
    "feedbackPath": "./data/prompt-feedback.json"
  },
  "web": { "port": 5173 }
}
```

## 环境变量

创建环境变量文件：

```bash
copy .env.example .env
```

按需配置你要使用的 Provider：

- `OPENAI_API_KEY`

可选 Provider 变量：

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `MINIMAX_API_KEY`

## CLI 使用

交互模式（默认）：

```bash
intent
```

非交互模式：

```bash
intent --text "write a blog post about AI startups" --tone analytical --length "1200 words" --format markdown --model openai,claude --output pretty
```

常用参数：

- `--text <text>` 意图文本
- `--model <models>` 模型列表（逗号分隔）
- `--output <output>` `json|pretty|intent|prompt|analysis|variants|adapted`
- `--task <task>` 任务覆盖，如 `write_article`
- `--preset <preset>` `blog|article|analysis`
- `--tone <tone>` 语气
- `--length <length>` 长度限制，如 `1200 words`
- `--format <format>` 输出格式，如 `markdown|json|bullets`
- `--audience <audience>` 目标受众
- `--language <language>` 输出语言，如 `en|zh`
- `--constraints <list>` 约束列表（逗号分隔）
- `--save <file>` 将当前命令输出保存到文件

保存输出示例：

```bash
intent --text "Write an article about AI startup risks" --tone analytical --output prompt --save prompts/startup-risks.prompt.md
```

## CLI 子命令

对比 Prompt：

```bash
intent diff "old prompt" "new prompt"
```

Prompt 库：

```bash
intent library add "Your prompt" --title "Startup Risks" --tags startup,ai
intent library list --limit 5
intent library get <id>
```

反馈与演进：

```bash
intent feedback add --id <id> --score 7 --notes "Add more constraints"
intent feedback list --id <id>
intent evolve --id <id>
```

调用你已配置的适配器运行编译后的 Prompt：

```bash
intent run "Summarize this report for executives" --tone concise --save outputs/exec-summary.md
```

## Web Playground

启动 Web 演示：

```bash
npm run dev:web
```

打开 http://localhost:5173

服务端代码： [src/web/server.ts](src/web/server.ts)

## 项目结构

```text
src/
  cli/                # CLI 入口与子命令
  core/               # 类型、配置加载、主流程
  intent-parser/      # 意图解析
  prompt-compiler/    # 结构化意图编译为 Prompt
  prompt-analyzer/    # Prompt 质量分析
  prompt-rewriter/    # Prompt 变体生成
  model-adapters/     # 各模型适配器
  prompt-diff/        # Prompt Diff 引擎
  prompt-library/     # Prompt 存储与查询
  prompt-feedback/    # 反馈存储与演进逻辑
  web/                # Express Playground
config/
examples/
```

## 开发

构建：

```bash
npm run build
```

运行构建产物：

```bash
npm run start -- --text "draft a launch announcement"
```

代码检查 / 格式化：

```bash
npm run lint
npm run format
```

## 故障排查

- 若 `intent run` 网络超时，请检查代理环境变量（`HTTP_PROXY` / `HTTPS_PROXY`）和网络连通性。
- 若 OpenAI 返回 401/403，请检查 `OPENAI_API_KEY` 与模型权限。
- 若配置未生效，请检查 `INTENT_CONFIG` 路径或本地 `intent.config.json` 位置。

## 贡献指南

欢迎贡献代码与建议。

1. Fork 仓库
2. 创建功能分支
3. 提交清晰的 commit
4. 发起 Pull Request

## Roadmap

- 更丰富的反馈驱动 Prompt 演进
- 更丰富的扩展接口
- 更丰富的学科知识及模型导入

## 许可证

MIT
