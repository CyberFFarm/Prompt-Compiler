# Intent Compiler

Intent Compiler converts natural language intent into high-quality prompts for LLM workflows.
It can run fully local (rule-based parse + compile), or call model adapters configured by user needs.

Chinese README: [README.zh.md](README.zh.md)

## Project Overview

Intent Compiler is designed as a reusable prompt engineering layer for CLI tools, automation scripts, and web playgrounds.
Instead of manually writing prompt templates per task, you provide intent text plus optional constraints, and it returns:

- structured intent
- compiled prompt
- quality analysis
- prompt variants
- per-model adapted prompts

## Core Features

- Intent parsing: natural language to structured fields
- Prompt compilation: structured intent to prompt text
- Prompt analyzer: quality scoring and issue hints
- Prompt rewriter: structured, creative, and technical variants
- Model adapters: OpenAI, Claude, Gemini, Generic, DeepSeek, Qwen, Minimax (configured by user needs)
- Prompt diff: compare prompt changes
- Prompt library: save/list/get reusable prompts
- Prompt feedback + evolve: collect feedback and generate refined prompts
- CLI + Web playground: both interactive and script-friendly usage

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| CLI | commander |
| Web Demo | Express |
| HTTP Client | undici |
| Env Loading | dotenv |

## Requirements

- Node.js 18+ (20+ recommended)

## Quick Start

Install globally:

```bash
npm install -g intent-compiler
intent
```

Or run with npx (no install):

```bash
npx intent-compiler
```

Local development run:

```bash
npm install
npm run dev -- --text "Write an article about AI startup risks" --tone analytical --length "1200 words" --output pretty
```

## Configuration

You can configure defaults via `intent.config.json` in project root, or use [config/intent.config.json](config/intent.config.json).
You can also set `INTENT_CONFIG` to point to a custom path.

Example:

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

## Environment Variables

Create env file:

```bash
cp .env.example .env
```

Configure only the provider keys you need:

- `OPENAI_API_KEY`

Optional provider variables:

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `MINIMAX_API_KEY`

## CLI Usage

Interactive mode (default):

```bash
intent
```

Non-interactive mode:

```bash
intent --text "write a blog post about AI startups" --tone analytical --length "1200 words" --format markdown --model openai,claude --output pretty
```

Common options:

- `--text <text>` intent text
- `--model <models>` comma-separated models
- `--output <output>` `json|pretty|intent|prompt|analysis|variants|adapted`
- `--task <task>` task override, e.g. `write_article`
- `--preset <preset>` `blog|article|analysis`
- `--tone <tone>` desired tone
- `--length <length>` length constraint, e.g. `1200 words`
- `--format <format>` output format, e.g. `markdown|json|bullets`
- `--audience <audience>` target audience
- `--language <language>` output language, e.g. `en|zh`
- `--constraints <list>` comma-separated constraints
- `--save <file>` save current command output to file

Example with save:

```bash
intent --text "Write an article about AI startup risks" --tone analytical --output prompt --save prompts/startup-risks.prompt.md
```

## CLI Commands

Diff prompts:

```bash
intent diff "old prompt" "new prompt"
```

Prompt library:

```bash
intent library add "Your prompt" --title "Startup Risks" --tags startup,ai
intent library list --limit 5
intent library get <id>
```

Feedback and evolve:

```bash
intent feedback add --id <id> --score 7 --notes "Add more constraints"
intent feedback list --id <id>
intent evolve --id <id>
```

Run compiled prompt against your configured adapter:

```bash
intent run "Summarize this report for executives" --tone concise --save outputs/exec-summary.md
```

## Web Playground

Start web demo:

```bash
npm run dev:web
```

Open http://localhost:5173

Server code: [src/web/server.ts](src/web/server.ts)

## Project Structure

```text
src/
  cli/                # CLI entry and subcommands
  core/               # types, config loader, pipeline
  intent-parser/      # intent extraction
  prompt-compiler/    # compile structured intent to prompt
  prompt-analyzer/    # quality analyzer
  prompt-rewriter/    # prompt variant generation
  model-adapters/     # model-specific prompt adapters
  prompt-diff/        # prompt diff engine
  prompt-library/     # prompt storage and query
  prompt-feedback/    # feedback storage + evolve logic
  web/                # Express playground
config/
examples/
```

## Development

Build:

```bash
npm run build
```

Run compiled build:

```bash
npm run start -- --text "draft a launch announcement"
```

Lint/format:

```bash
npm run lint
npm run format
```

## Troubleshooting

- If `intent run` fails with network timeout, verify proxy env (`HTTP_PROXY` / `HTTPS_PROXY`) and connectivity.
- If OpenAI returns 401/403, check `OPENAI_API_KEY` and model permission.
- If no config is applied, verify `INTENT_CONFIG` path or local `intent.config.json` placement.

## Contributing

Contributions are welcome.

1. Fork repository
2. Create feature branch
3. Commit with clear message
4. Open Pull Request

## Roadmap

- Richer feedback-driven prompt evolution
- Richer extension interfaces
- Richer discipline knowledge and model imports

## License

MIT
