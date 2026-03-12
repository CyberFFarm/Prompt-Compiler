#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ override: true });
import { Command } from "commander";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { runPipeline } from "../core/pipeline";
import { parseIntent } from "../intent-parser/parseIntent";
import { IntentOverrides, TaskType } from "../core/types";
import { loadConfig } from "../core/config";
import { diffPrompt } from "../prompt-diff/diffPrompt";
import { addEntry, getEntry, listEntries } from "../prompt-library/library";
import { addFeedback, evolvePrompt, listFeedback } from "../prompt-feedback/feedback";
import { runOpenAI } from "../model-adapters/openai";

const program = new Command();

const DEFAULT_MODELS = [
  "openai",
  "claude",
  "gemini",
  "generic",
  "deepseek",
  "qwen",
  "minimax"
];

const TASK_TYPES: TaskType[] = [
  "write_article",
  "write_blog_post",
  "summarize",
  "brainstorm",
  "generate",
  "analyze",
  "other"
];

const OUTPUT_FORMATS = [
  "json",
  "pretty",
  "intent",
  "prompt",
  "analysis",
  "variants",
  "adapted"
];

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

interface CliOptions {
  config?: string;
  text?: string;
  model?: string;
  output?: string;
  task?: string;
  preset?: string;
  tone?: string;
  length?: string;
  format?: string;
  audience?: string;
  language?: string;
  constraints?: string;
  save?: string;
}

function renderOutput(
  outputFormat: string,
  payload: {
    intent: unknown;
    compiledPrompt: string;
    analysis: unknown;
    variants: unknown;
    adapted: unknown;
  }
): string {
  if (outputFormat === "prompt") {
    return payload.compiledPrompt;
  }
  if (outputFormat === "intent") {
    return JSON.stringify(payload.intent, null, 2);
  }
  if (outputFormat === "analysis") {
    return JSON.stringify(payload.analysis, null, 2);
  }
  if (outputFormat === "variants") {
    return JSON.stringify(payload.variants, null, 2);
  }
  if (outputFormat === "adapted") {
    return JSON.stringify(payload.adapted, null, 2);
  }
  if (outputFormat === "pretty") {
    return [
      "=== intent ===",
      JSON.stringify(payload.intent, null, 2),
      "",
      "=== compiled ===",
      payload.compiledPrompt,
      "",
      "=== analysis ===",
      JSON.stringify(payload.analysis, null, 2),
      "",
      "=== variants ===",
      JSON.stringify(payload.variants, null, 2),
      "",
      "=== adapted ===",
      JSON.stringify(payload.adapted, null, 2)
    ].join("\n");
  }

  return JSON.stringify(
    {
      intent: payload.intent,
      compiled: payload.compiledPrompt,
      analysis: payload.analysis,
      variants: payload.variants,
      adapted: payload.adapted
    },
    null,
    2
  );
}

function saveOutput(filePath: string, content: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, "utf-8");
  return resolved;
}

function parseModelList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeOutputFormat(value?: string): string {
  if (!value) return "json";
  const normalized = value.trim().toLowerCase();
  if (OUTPUT_FORMATS.includes(normalized)) {
    return normalized;
  }
  return "json";
}

function normalizeTask(value?: string): TaskType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase() as TaskType;
  if (TASK_TYPES.includes(normalized)) {
    return normalized;
  }
  return undefined;
}

function normalizePreset(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return PRESETS[normalized] ? normalized : undefined;
}

function applyPreset(overrides: IntentOverrides, preset?: string): IntentOverrides {
  if (!preset) return overrides;
  const presetOverrides = PRESETS[preset] || {};
  return { ...presetOverrides, ...overrides };
}

function promptWithDefault(value: string | undefined): string {
  return value ? ` [${value}]` : "";
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

function createPrompter() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  const close = () => rl.close();

  return { ask, close };
}

program
  .name("intent")
  .description("Compile natural language intent into optimized prompts")
  .option("--config <path>", "config file path")
  .option("--text <text>", "intent text")
  .option("--model <models>", "comma-separated model list")
  .option("--output <output>", "output: json|pretty|intent|prompt|analysis|variants|adapted")
  .option("--task <task>", "task override, e.g. write_article")
  .option("--preset <preset>", "preset: blog|article|analysis")
  .option("--tone <tone>", "desired tone")
  .option("--length <length>", "length constraint, e.g. 1200 words")
  .option("--format <format>", "output format, e.g. json/markdown/bullets")
  .option("--audience <audience>", "target audience")
  .option("--language <language>", "output language, e.g. en/zh")
  .option("--constraints <list>", "comma-separated constraints")
  .option("--save <file>", "save output to file")
  .action(async (options: CliOptions) => {
    const prompter = createPrompter();
    const config = loadConfig(options.config);
    const defaultModels = config.defaults?.models ?? DEFAULT_MODELS;
    const defaultOutput = normalizeOutputFormat(config.defaults?.output);
    const defaultPreset = normalizePreset(config.defaults?.preset);
    const defaultOverrides = config.defaults?.overrides ?? {};

    let text = options.text as string | undefined;
    let models = parseModelList(options.model as string | undefined);
    let outputFormat = normalizeOutputFormat(options.output as string | undefined) || defaultOutput;
    let task = normalizeTask(options.task as string | undefined) || defaultOverrides.task;
    let preset = normalizePreset(options.preset as string | undefined) || defaultPreset;
    let topicOverride = undefined as string | undefined;
    let tone = (options.tone as string | undefined) || defaultOverrides.tone;
    let length = (options.length as string | undefined) || defaultOverrides.length;
    let format = (options.format as string | undefined) || defaultOverrides.format;
    let audience = (options.audience as string | undefined) || defaultOverrides.audience;
    let language = (options.language as string | undefined) || defaultOverrides.language;
    let constraints = parseList(options.constraints as string | undefined);
    if (constraints.length === 0 && defaultOverrides.constraints) {
      constraints = defaultOverrides.constraints;
    }

    if (!text) {
      while (!text || text.trim().length === 0) {
        text = await prompter.ask("Intent text: ");
      }
      preset = normalizePreset(
        (await prompter.ask("Preset (blog|article|analysis, optional): ")).trim()
      ) || preset;
      const modelInput = await prompter.ask(
        `Models (comma-separated, default: ${defaultModels.join(", ")}): `
      );
      models = parseModelList(modelInput);
      outputFormat = normalizeOutputFormat(
        (await prompter.ask(
          "Output (json|pretty|intent|prompt|analysis|variants|adapted) [pretty]: "
        )) || "pretty"
      ) || defaultOutput;

      const baseOverrides = applyPreset(
        {
          task,
          tone,
          length,
          format,
          audience,
          language,
          constraints: constraints.length > 0 ? constraints : undefined
        },
        preset
      );

      const preview = parseIntent(text, baseOverrides);
      console.log("\n=== intent preview ===");
      console.log(JSON.stringify(preview, null, 2));

      const taskInput = await prompter.ask(
        `Task override${promptWithDefault(preview.task)}: `
      );
      task = normalizeTask(taskInput) || preview.task;

      const topicInput = await prompter.ask(
        `Topic${promptWithDefault(preview.topic)}: `
      );
      topicOverride =
        topicInput.trim().length > 0 ? topicInput.trim() : preview.topic;

      const toneInput = await prompter.ask(
        `Tone${promptWithDefault(preview.tone)}: `
      );
      tone = toneInput.trim().length > 0 ? toneInput.trim() : preview.tone;

      const lengthInput = await prompter.ask(
        `Length${promptWithDefault(preview.length)}: `
      );
      length = lengthInput.trim().length > 0 ? lengthInput.trim() : preview.length;

      const formatInput = await prompter.ask(
        `Format${promptWithDefault(preview.format)}: `
      );
      format = formatInput.trim().length > 0 ? formatInput.trim() : preview.format;

      const audienceInput = await prompter.ask(
        `Audience${promptWithDefault(preview.audience)}: `
      );
      audience =
        audienceInput.trim().length > 0 ? audienceInput.trim() : preview.audience;

      const languageInput = await prompter.ask(
        `Language${promptWithDefault(preview.language)}: `
      );
      language =
        languageInput.trim().length > 0 ? languageInput.trim() : preview.language;

      const constraintsInput = await prompter.ask(
        `Constraints (comma-separated)${
          preview.constraints && preview.constraints.length > 0
            ? ` [${preview.constraints.join(", ")}]`
            : ""
        }: `
      );
      constraints =
        constraintsInput.trim().length > 0
          ? parseList(constraintsInput)
          : preview.constraints || [];
    }

    prompter.close();

    const selectedModels = models.length > 0 ? models : defaultModels;

    const overrides = compactOverrides(
      applyPreset(
      {
        task,
        topic: topicOverride || defaultOverrides.topic,
        tone,
        length,
        format,
        audience,
        language,
        constraints: constraints.length > 0 ? constraints : undefined
      },
      preset
      )
    );

    const result = runPipeline({
      text: text || "",
      models: selectedModels,
      overrides
    });

    const rendered = renderOutput(outputFormat, {
      intent: result.intent,
      compiledPrompt: result.compiled.prompt,
      analysis: result.analysis,
      variants: result.variants,
      adapted: result.adapted
    });

    if (options.save) {
      const savedPath = saveOutput(options.save, rendered);
      console.log(`Saved output to: ${savedPath}`);
    }

    console.log(rendered);
  });

program
  .command("diff")
  .description("Compare two prompts and output a diff")
  .argument("<original>", "original prompt")
  .argument("<updated>", "updated prompt")
  .option("--format <format>", "unified|json", "unified")
  .action((original: string, updated: string, options: { format?: string }) => {
    const result = diffPrompt(original, updated);
    const format = (options.format || "unified").toLowerCase();
    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(result.unified);
  });

const library = program.command("library").description("Manage prompt library");

library
  .command("add")
  .description("Add a prompt to the library")
  .argument("<prompt>", "prompt content")
  .option("--title <title>", "title")
  .option("--tags <tags>", "comma-separated tags")
  .option("--intent <intent>", "intent text")
  .action(
    (
      prompt: string,
      options: { title?: string; tags?: string; intent?: string }
    ) => {
      const entry = addEntry({
        prompt,
        title: options.title,
        tags: parseList(options.tags),
        intent: options.intent
      });
      console.log(JSON.stringify(entry, null, 2));
    }
  );

library
  .command("list")
  .description("List prompts in the library")
  .option("--limit <limit>", "max items")
  .option("--tag <tag>", "filter by tag")
  .option("--search <term>", "search term")
  .action((options: { limit?: string; tag?: string; search?: string }) => {
    const entries = listEntries({
      limit: options.limit ? Number(options.limit) : undefined,
      tag: options.tag,
      search: options.search
    });
    console.log(JSON.stringify(entries, null, 2));
  });

library
  .command("get")
  .description("Get a prompt by id")
  .argument("<id>", "prompt id")
  .action((id: string) => {
    const entry = getEntry(id);
    if (!entry) {
      console.error("Prompt not found");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(entry, null, 2));
  });

const feedback = program.command("feedback").description("Manage prompt feedback");

feedback
  .command("add")
  .description("Add feedback for a prompt")
  .option("--id <id>", "prompt id")
  .option("--score <score>", "score 0-10")
  .option("--notes <notes>", "feedback notes")
  .action((options: { id?: string; score?: string; notes?: string }) => {
    if (!options.id) {
      console.error("--id is required");
      process.exitCode = 1;
      return;
    }
    const score = options.score ? Number(options.score) : undefined;
    const entry = addFeedback({
      promptId: options.id,
      score,
      notes: options.notes
    });
    console.log(JSON.stringify(entry, null, 2));
  });

feedback
  .command("list")
  .description("List feedback for a prompt")
  .option("--id <id>", "prompt id")
  .action((options: { id?: string }) => {
    if (!options.id) {
      console.error("--id is required");
      process.exitCode = 1;
      return;
    }
    const entries = listFeedback(options.id);
    console.log(JSON.stringify(entries, null, 2));
  });

program
  .command("evolve")
  .description("Evolve a prompt using stored feedback")
  .option("--id <id>", "prompt id")
  .option("--prompt <prompt>", "prompt text override")
  .action((options: { id?: string; prompt?: string }) => {
    let basePrompt = options.prompt;
    if (!basePrompt && options.id) {
      const entry = getEntry(options.id);
      basePrompt = entry?.prompt;
    }
    if (!basePrompt) {
      console.error("Provide --prompt or --id with a saved prompt");
      process.exitCode = 1;
      return;
    }
    const feedbacks = options.id ? listFeedback(options.id) : [];
    const evolved = evolvePrompt(basePrompt, feedbacks);
    console.log(evolved);
  });

program
  .command("run")
  .description("Run compiled prompt against OpenAI")
  .argument("<text>", "intent text")
  .option("--tone <tone>", "desired tone")
  .option("--length <length>", "length constraint")
  .option("--format <format>", "output format")
  .option("--audience <audience>", "target audience")
  .option("--language <language>", "output language")
  .option("--constraints <list>", "comma-separated constraints")
  .option("--save <file>", "save model output to file")
  .action(async (text: string, options: CliOptions) => {
    const constraints = parseList(options.constraints as string | undefined);
    const result = runPipeline({
      text,
      overrides: compactOverrides({
        tone: options.tone,
        length: options.length,
        format: options.format,
        audience: options.audience,
        language: options.language,
        constraints: constraints.length > 0 ? constraints : undefined
      })
    });

    const response = await runOpenAI(result.compiled.prompt);
    if (options.save) {
      const savedPath = saveOutput(options.save, response.output);
      console.log(`Saved output to: ${savedPath}`);
    }
    console.log(response.output);
  });

program.parse(process.argv);
