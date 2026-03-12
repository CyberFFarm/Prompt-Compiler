import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { runPipeline } from "../core/pipeline";
import { IntentOverrides, TaskType } from "../core/types";
import { loadConfig } from "../core/config";

const app = express();
const config = loadConfig();
const port = process.env.PORT ? Number(process.env.PORT) : config.web?.port || 5173;

const DEFAULT_MODELS = [
  "openai",
  "claude",
  "gemini",
  "generic",
  "deepseek",
  "qwen",
  "minimax"
];
const DEFAULT_CONFIG_MODELS = config.defaults?.models || DEFAULT_MODELS;
const DEFAULT_PRESET = config.defaults?.preset || "";
const DEFAULT_OVERRIDES = config.defaults?.overrides || {};

const PRESETS: Record<string, IntentOverrides> = {
  blog: {
    task: "write_blog_post",
    tone: "friendly",
    format: "markdown"
  },
  article: {
    task: "write_article",
    tone: "analytical",
    format: "markdown"
  },
  analysis: {
    task: "analyze",
    tone: "technical",
    format: "markdown"
  }
};

app.use(express.urlencoded({ extended: true }));

function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseModelsValue(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter((item) => item.length > 0);
  }
  return parseList(value);
}

function normalizePreset(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return PRESETS[normalized] ? normalized : undefined;
}

function normalizeTask(value?: string): TaskType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase() as TaskType;
  return normalized;
}

function applyPreset(overrides: IntentOverrides, preset?: string): IntentOverrides {
  if (!preset) return overrides;
  const presetOverrides = PRESETS[preset] || {};
  return { ...presetOverrides, ...overrides };
}

function compactOverrides(overrides: IntentOverrides): IntentOverrides {
  const entries = Object.entries(overrides).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
  return Object.fromEntries(entries) as IntentOverrides;
}

type PipelineResult = ReturnType<typeof runPipeline>;

type FormValues = {
  text?: string;
  preset?: string;
  models?: string | string[];
  task?: string;
  audience?: string;
  tone?: string;
  length?: string;
  format?: string;
  language?: string;
  constraints?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderIntent(intent: PipelineResult["intent"]): string {
  const lines = [
    ["task", intent.task],
    ["topic", intent.topic],
    ["audience", intent.audience],
    ["tone", intent.tone],
    ["length", intent.length],
    ["format", intent.format],
    ["language", intent.language],
    [
      "constraints",
      intent.constraints && intent.constraints.length > 0
        ? intent.constraints.join(", ")
        : undefined
    ]
  ];

  return `<dl class="kv">
${lines
  .filter((entry) => entry[1])
  .map(
    (entry) =>
      `<div><dt>${escapeHtml(String(entry[0]))}</dt><dd>${escapeHtml(
        String(entry[1])
      )}</dd></div>`
  )
  .join("")}
</dl>`;
}

function renderAnalysis(analysis: PipelineResult["analysis"]): string {
  const issues = analysis.issues.length > 0 ? analysis.issues : ["No issues found"];
  const suggestions =
    analysis.suggestions.length > 0 ? analysis.suggestions : ["No suggestions"];
  return `
    <div class="score">Score: <strong>${analysis.score.toFixed(1)}</strong> / 10</div>
    <div class="two">
      <div>
        <h4>Issues</h4>
        <ul>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <h4>Suggestions</h4>
        <ul>${suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function renderVariants(variants: PipelineResult["variants"]): string {
  return `
    <div class="grid">
      <div class="panel">
        <h3>Structured</h3>
        <pre>${escapeHtml(variants.structured)}</pre>
      </div>
      <div class="panel">
        <h3>Creative</h3>
        <pre>${escapeHtml(variants.creative)}</pre>
      </div>
      <div class="panel">
        <h3>Technical</h3>
        <pre>${escapeHtml(variants.technical)}</pre>
      </div>
    </div>
  `;
}

function renderAdapted(adapted: PipelineResult["adapted"]): string {
  const items = Object.entries(adapted)
    .map(
      ([model, prompt]) => `
        <details class="panel">
          <summary>${escapeHtml(model)}</summary>
          <pre>${escapeHtml(prompt)}</pre>
        </details>
      `
    )
    .join("");

  return `<div class="stack">${items}</div>`;
}

function renderPage(result?: PipelineResult, form?: FormValues): string {
  const safe = (value?: string) => (value ? escapeHtml(value) : "");
  const selectedPreset = form?.preset || DEFAULT_PRESET;
  const defaultModelString = DEFAULT_CONFIG_MODELS.join(",");
  const defaultForm: FormValues = {
    preset: DEFAULT_PRESET,
    models: defaultModelString,
    task: DEFAULT_OVERRIDES.task,
    audience: DEFAULT_OVERRIDES.audience,
    tone: DEFAULT_OVERRIDES.tone,
    length: DEFAULT_OVERRIDES.length,
    format: DEFAULT_OVERRIDES.format,
    language: DEFAULT_OVERRIDES.language,
    constraints: DEFAULT_OVERRIDES.constraints
      ? DEFAULT_OVERRIDES.constraints.join(", ")
      : ""
  };
  const mergedForm = { ...defaultForm, ...form };
  const selectedModels = parseModelsValue(mergedForm.models || defaultModelString);
  const modelOptions = Array.from(new Set(DEFAULT_CONFIG_MODELS));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Intent Compiler Demo</title>
  <style>
    :root {
      --bg: #f6f2ea;
      --card: #ffffff;
      --ink: #1f1a14;
      --muted: #6d6258;
      --accent: #2e6f6f;
      --accent-2: #e0b36e;
      --border: #e6ddd2;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Trebuchet MS", "Verdana", sans-serif;
      margin: 0;
      color: var(--ink);
      background: radial-gradient(circle at top, #fff7ea, #f0e7da 60%, #e8dfd2);
      min-height: 100vh;
    }
    header {
      padding: 2.5rem 2rem 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .lang-toggle {
      align-self: center;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #fffdf9;
      color: var(--ink);
      font-weight: 600;
      cursor: pointer;
    }
    h1 {
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 2.6rem;
      margin: 0 0 0.5rem;
    }
    .subtitle { color: var(--muted); margin: 0; }
    main { display: grid; grid-template-columns: minmax(280px, 420px) 1fr; gap: 1.5rem; padding: 0 2rem 2.5rem; }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 12px 30px rgba(31, 26, 20, 0.08);
    }
    form { display: grid; gap: 0.85rem; }
    label { font-weight: 600; font-size: 0.9rem; color: var(--muted); }
    input, textarea, select {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #fffdf9;
      color: var(--ink);
    }
    textarea { min-height: 110px; resize: vertical; }
    select[multiple] { min-height: 120px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    button {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), #3a8b8b);
      color: white;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
    }
    button:hover { filter: brightness(1.05); }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .ghost {
      background: #f1e6d6;
      color: var(--ink);
      border: 1px solid var(--border);
    }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .stack { display: grid; gap: 0.75rem; }
    pre {
      background: #f7f1e7;
      border-radius: 12px;
      padding: 0.9rem;
      overflow: auto;
      border: 1px dashed #e1d3c3;
    }
    .section-title { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .section-title span {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-2);
    }
    .kv div { display: grid; grid-template-columns: 120px 1fr; padding: 0.25rem 0; }
    .kv dt { font-weight: 600; color: var(--muted); }
    .kv dd { margin: 0; }
    .score { font-size: 1.1rem; margin-bottom: 0.75rem; }
    .two { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
    details summary { cursor: pointer; font-weight: 600; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; }
      .two { grid-template-columns: 1fr; }
      header { padding: 2rem 1.5rem 1rem; }
      main { padding: 0 1.5rem 2rem; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 data-i18n="title">Intent Compiler Demo</h1>
      <p class="subtitle" data-i18n="subtitle">From intent to prompt, with structured outputs and model adapters.</p>
    </div>
    <button type="button" class="lang-toggle" id="lang-toggle">中文</button>
  </header>
  <main>
    <section class="panel">
      <div class="section-title"><span></span><h2 data-i18n="input">Input</h2></div>
      <form method="post" action="/compile">
        <label data-i18n="ideaText">Idea</label>
        <textarea name="text" placeholder="Write an article about AI startup risks" data-i18n-placeholder="intentPlaceholder">${safe(
          mergedForm.text
        )}</textarea>

        <div class="row">
          <div>
            <label data-i18n="preset">Preset</label>
            <select name="preset">
              <option value="" ${selectedPreset === "" ? "selected" : ""}>(none)</option>
              <option value="blog" ${selectedPreset === "blog" ? "selected" : ""}>blog</option>
              <option value="article" ${
                selectedPreset === "article" ? "selected" : ""
              }>article</option>
              <option value="analysis" ${
                selectedPreset === "analysis" ? "selected" : ""
              }>analysis</option>
            </select>
          </div>
          <div>
            <label data-i18n="models">Models</label>
            <select name="models" multiple>
              ${modelOptions
                .map((model) => {
                  const selected = selectedModels.includes(model) ? "selected" : "";
                  return `<option value="${escapeHtml(model)}" ${selected} data-i18n-option="model-${escapeHtml(
                    model
                  )}">${escapeHtml(model)}</option>`;
                })
                .join("")}
            </select>
          </div>
        </div>

        <div class="row">
          <div>
            <label data-i18n="task">Task</label>
            <select name="task">
              <option value="" ${mergedForm.task ? "" : "selected"} data-i18n-option="auto">(auto)</option>
              <option value="write_article" ${
                mergedForm.task === "write_article" ? "selected" : ""
              } data-i18n-option="task-write-article">write_article</option>
              <option value="write_blog_post" ${
                mergedForm.task === "write_blog_post" ? "selected" : ""
              } data-i18n-option="task-write-blog">write_blog_post</option>
              <option value="summarize" ${
                mergedForm.task === "summarize" ? "selected" : ""
              } data-i18n-option="task-summarize">summarize</option>
              <option value="brainstorm" ${
                mergedForm.task === "brainstorm" ? "selected" : ""
              } data-i18n-option="task-brainstorm">brainstorm</option>
              <option value="analyze" ${
                mergedForm.task === "analyze" ? "selected" : ""
              } data-i18n-option="task-analyze">analyze</option>
              <option value="generate" ${
                mergedForm.task === "generate" ? "selected" : ""
              } data-i18n-option="task-generate">generate</option>
              <option value="other" ${
                mergedForm.task === "other" ? "selected" : ""
              } data-i18n-option="task-other">other</option>
            </select>
          </div>
          <div>
            <label data-i18n="audience">Audience</label>
            <input name="audience" placeholder="startup founders" data-i18n-placeholder="audiencePlaceholder" value="${safe(
              mergedForm.audience
            )}" />
          </div>
        </div>

        <div class="row">
          <div>
            <label data-i18n="tone">Tone</label>
            <select name="tone">
              <option value="" ${mergedForm.tone ? "" : "selected"} data-i18n-option="auto">(auto)</option>
              <option value="analytical" ${
                mergedForm.tone === "analytical" ? "selected" : ""
              } data-i18n-option="tone-analytical">analytical</option>
              <option value="friendly" ${
                mergedForm.tone === "friendly" ? "selected" : ""
              } data-i18n-option="tone-friendly">friendly</option>
              <option value="formal" ${
                mergedForm.tone === "formal" ? "selected" : ""
              } data-i18n-option="tone-formal">formal</option>
              <option value="technical" ${
                mergedForm.tone === "technical" ? "selected" : ""
              } data-i18n-option="tone-technical">technical</option>
              <option value="creative" ${
                mergedForm.tone === "creative" ? "selected" : ""
              } data-i18n-option="tone-creative">creative</option>
            </select>
          </div>
          <div>
            <label data-i18n="length">Length</label>
            <select name="length">
              <option value="" ${mergedForm.length ? "" : "selected"} data-i18n-option="auto">(auto)</option>
              <option value="500 words" ${
                mergedForm.length === "500 words" ? "selected" : ""
              } data-i18n-option="length-500">500 words</option>
              <option value="800 words" ${
                mergedForm.length === "800 words" ? "selected" : ""
              } data-i18n-option="length-800">800 words</option>
              <option value="1200 words" ${
                mergedForm.length === "1200 words" ? "selected" : ""
              } data-i18n-option="length-1200">1200 words</option>
              <option value="2000 words" ${
                mergedForm.length === "2000 words" ? "selected" : ""
              } data-i18n-option="length-2000">2000 words</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div>
            <label data-i18n="format">Format</label>
            <select name="format">
              <option value="" ${mergedForm.format ? "" : "selected"} data-i18n-option="auto">(auto)</option>
              <option value="markdown" ${
                mergedForm.format === "markdown" ? "selected" : ""
              } data-i18n-option="format-markdown">markdown</option>
              <option value="json" ${
                mergedForm.format === "json" ? "selected" : ""
              } data-i18n-option="format-json">json</option>
              <option value="bullet points" ${
                mergedForm.format === "bullet points" ? "selected" : ""
              } data-i18n-option="format-bullets">bullet points</option>
              <option value="table" ${
                mergedForm.format === "table" ? "selected" : ""
              } data-i18n-option="format-table">table</option>
              <option value="outline" ${
                mergedForm.format === "outline" ? "selected" : ""
              } data-i18n-option="format-outline">outline</option>
            </select>
          </div>
          <div>
            <label data-i18n="language">Language</label>
            <select name="language">
              <option value="" ${mergedForm.language ? "" : "selected"} data-i18n-option="auto">(auto)</option>
              <option value="en" ${
                mergedForm.language === "en" ? "selected" : ""
              } data-i18n-option="lang-en">en</option>
              <option value="zh" ${
                mergedForm.language === "zh" ? "selected" : ""
              } data-i18n-option="lang-zh">zh</option>
              <option value="ja" ${
                mergedForm.language === "ja" ? "selected" : ""
              } data-i18n-option="lang-ja">ja</option>
              <option value="es" ${
                mergedForm.language === "es" ? "selected" : ""
              } data-i18n-option="lang-es">es</option>
            </select>
          </div>
        </div>

        <label data-i18n="constraints">Constraints (comma-separated)</label>
        <input name="constraints" placeholder="include examples, short paragraphs" data-i18n-placeholder="constraintsPlaceholder" value="${safe(
          mergedForm.constraints
        )}" />

        <div class="actions">
          <button type="submit" data-i18n="compile">Compile</button>
          <button type="button" class="ghost" id="share-link" data-i18n="share">Share link</button>
        </div>
      </form>
    </section>

    <section class="stack">
      <div class="panel">
        <div class="section-title"><span></span><h2 data-i18n="idea">Idea</h2></div>
        ${result ? renderIntent(result.intent) : "<p class=\"subtitle\">No output yet.</p>"}
      </div>

      <div class="panel">
        <div class="section-title"><span></span><h2 data-i18n="compiled">Compiled Prompt</h2></div>
        ${result ? `<pre id="compiled">${escapeHtml(result.compiled.prompt)}</pre>` : ""}
      </div>

      <div class="panel">
        <div class="section-title"><span></span><h2 data-i18n="analysis">Analysis</h2></div>
        ${result ? renderAnalysis(result.analysis) : ""}
      </div>

      ${result ? renderVariants(result.variants) : ""}

      <div class="panel">
        <div class="section-title"><span></span><h2 data-i18n="adapted">Adapted Prompts</h2></div>
        ${result ? renderAdapted(result.adapted) : ""}
      </div>
    </section>
  </main>
  <script>
    const i18n = {
      en: {
        title: "Intent Compiler Demo",
        subtitle: "From intent to prompt, with structured outputs and model adapters.",
        input: "Input",
        ideaText: "Idea",
        intentPlaceholder: "Write an article about AI startup risks",
        preset: "Preset",
        models: "Models",
        modelsPlaceholder: "openai,claude",
        task: "Task",
        audience: "Audience",
        audiencePlaceholder: "startup founders",
        tone: "Tone",
        length: "Length",
        format: "Format",
        language: "Language",
        constraints: "Constraints (comma-separated)",
        constraintsPlaceholder: "include examples, short paragraphs",
        compile: "Compile",
        share: "Share link",
        idea: "Idea",
        compiled: "Compiled Prompt",
        analysis: "Analysis",
        adapted: "Adapted Prompts",
        auto: "(auto)",
        "task-write-article": "Write article",
        "task-write-blog": "Write blog post",
        "task-summarize": "Summarize",
        "task-brainstorm": "Brainstorm",
        "task-analyze": "Analyze",
        "task-generate": "Generate",
        "task-other": "Other",
        "tone-analytical": "Analytical",
        "tone-friendly": "Friendly",
        "tone-formal": "Formal",
        "tone-technical": "Technical",
        "tone-creative": "Creative",
        "length-500": "500 words",
        "length-800": "800 words",
        "length-1200": "1200 words",
        "length-2000": "2000 words",
        "format-markdown": "Markdown",
        "format-json": "JSON",
        "format-bullets": "Bullet points",
        "format-table": "Table",
        "format-outline": "Outline",
        "lang-en": "English",
        "lang-zh": "Chinese",
        "lang-ja": "Japanese",
        "lang-es": "Spanish",
        "model-openai": "OpenAI",
        "model-claude": "Claude",
        "model-gemini": "Gemini",
        "model-generic": "Generic",
        "model-deepseek": "DeepSeek",
        "model-qwen": "Qwen",
        "model-minimax": "Minimax"
      },
      zh: {
        title: "Intent Compiler 演示",
        subtitle: "从意图到 prompt，结构化输出与模型适配。",
        input: "输入",
        ideaText: "想法 / Idea",
        intentPlaceholder: "写一篇关于 AI 创业风险的文章",
        preset: "预设",
        models: "模型",
        modelsPlaceholder: "openai,claude",
        task: "任务",
        audience: "受众",
        audiencePlaceholder: "创业者",
        tone: "语气",
        length: "长度",
        format: "格式",
        language: "语言",
        constraints: "约束（逗号分隔）",
        constraintsPlaceholder: "包含真实案例，段落简短",
        compile: "生成",
        share: "分享链接",
        idea: "想法",
        compiled: "编译后 Prompt",
        analysis: "分析",
        adapted: "适配结果",
        auto: "(自动)",
        "task-write-article": "写文章",
        "task-write-blog": "写博客",
        "task-summarize": "总结",
        "task-brainstorm": "头脑风暴",
        "task-analyze": "分析",
        "task-generate": "生成",
        "task-other": "其他",
        "tone-analytical": "理性",
        "tone-friendly": "友好",
        "tone-formal": "正式",
        "tone-technical": "技术",
        "tone-creative": "创意",
        "length-500": "500 字",
        "length-800": "800 字",
        "length-1200": "1200 字",
        "length-2000": "2000 字",
        "format-markdown": "Markdown",
        "format-json": "JSON",
        "format-bullets": "要点列表",
        "format-table": "表格",
        "format-outline": "大纲",
        "lang-en": "英文",
        "lang-zh": "中文",
        "lang-ja": "日文",
        "lang-es": "西班牙文",
        "model-openai": "OpenAI",
        "model-claude": "Claude",
        "model-gemini": "Gemini",
        "model-generic": "通用",
        "model-deepseek": "DeepSeek",
        "model-qwen": "Qwen",
        "model-minimax": "Minimax"
      }
    };

    const toggle = document.getElementById("lang-toggle");
    const stored = localStorage.getItem("ic-lang") || "en";
    let current = stored === "zh" ? "zh" : "en";

    function applyLanguage(lang) {
      current = lang;
      localStorage.setItem("ic-lang", lang);
      toggle.textContent = lang === "zh" ? "English" : "中文";
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key && i18n[lang][key]) {
          el.textContent = i18n[lang][key];
        }
      });
      document.querySelectorAll("[data-i18n-option]").forEach((el) => {
        const key = el.getAttribute("data-i18n-option");
        if (key && i18n[lang][key]) {
          el.textContent = i18n[lang][key];
        }
      });
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key && i18n[lang][key]) {
          el.setAttribute("placeholder", i18n[lang][key]);
        }
      });
    }

    toggle.addEventListener("click", () => {
      applyLanguage(current === "zh" ? "en" : "zh");
    });

    applyLanguage(current);

    const form = document.querySelector("form");
    const shareBtn = document.getElementById("share-link");

    function buildShareUrl() {
      const data = new FormData(form);
      const params = new URLSearchParams();
      const selectedModels = Array.from(
        form.querySelectorAll("select[name='models'] option:checked")
      ).map((option) => option.value);

      for (const [key, value] of data.entries()) {
        if (key === "models") continue;
        const stringValue = String(value).trim();
        if (stringValue.length > 0) {
          params.set(key, stringValue);
        }
      }
      if (selectedModels.length > 0) {
        params.set("models", selectedModels.join(","));
      }
      const url = new URL(window.location.href);
      url.search = params.toString();
      return url.toString();
    }

    shareBtn.addEventListener("click", async () => {
      const url = buildShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = current === "zh" ? "已复制" : "Copied";
        setTimeout(() => (shareBtn.textContent = i18n[current].share), 1200);
      } catch {
        window.prompt("Copy this link:", url);
      }
    });
  </script>
</body>
</html>`;
}

function getQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
}

function buildResult(form: FormValues): PipelineResult {
  const preset = normalizePreset(form.preset);
  const overrides = compactOverrides(
    applyPreset(
      {
        task: normalizeTask(form.task) || DEFAULT_OVERRIDES.task,
        topic: form.text || DEFAULT_OVERRIDES.topic,
        tone: form.tone || DEFAULT_OVERRIDES.tone,
        length: form.length || DEFAULT_OVERRIDES.length,
        format: form.format || DEFAULT_OVERRIDES.format,
        audience: form.audience || DEFAULT_OVERRIDES.audience,
        language: form.language || DEFAULT_OVERRIDES.language,
        constraints: (() => {
          const parsed = parseList(form.constraints);
          if (parsed.length > 0) return parsed;
          return DEFAULT_OVERRIDES.constraints;
        })()
      },
      preset
    )
  );

  const models = parseModelsValue(form.models);
  const selectedModels = models.length > 0 ? models : DEFAULT_CONFIG_MODELS;

  return runPipeline({
    text: form.text || "",
    models: selectedModels,
    overrides
  });
}

app.get("/", (req, res) => {
  const form: FormValues = {
    text: getQueryValue(req.query.text),
    preset: getQueryValue(req.query.preset),
    models: getQueryValue(req.query.models),
    task: getQueryValue(req.query.task),
    audience: getQueryValue(req.query.audience),
    tone: getQueryValue(req.query.tone),
    length: getQueryValue(req.query.length),
    format: getQueryValue(req.query.format),
    language: getQueryValue(req.query.language),
    constraints: getQueryValue(req.query.constraints)
  };

  const hasInput = Object.values(form).some((value) =>
    value ? String(value).trim().length > 0 : false
  );

  if (!hasInput) {
    res.send(renderPage());
    return;
  }

  const result = buildResult(form);
  res.send(renderPage(result, form));
});

app.post("/compile", (req, res) => {
  const form: FormValues = {
    text: req.body.text as string | undefined,
    preset: req.body.preset as string | undefined,
    models: req.body.models as string | string[] | undefined,
    task: req.body.task as string | undefined,
    audience: req.body.audience as string | undefined,
    tone: req.body.tone as string | undefined,
    length: req.body.length as string | undefined,
    format: req.body.format as string | undefined,
    language: req.body.language as string | undefined,
    constraints: req.body.constraints as string | undefined
  };

  const result = buildResult(form);
  res.send(renderPage(result, form));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Intent Compiler web demo running on http://localhost:${port}`);
});
