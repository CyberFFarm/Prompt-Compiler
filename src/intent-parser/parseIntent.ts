import { StructuredIntent, TaskType, IntentOverrides } from "../core/types";

const TASK_KEYWORDS: Array<{ keyword: string; task: TaskType }> = [
  { keyword: "article", task: "write_article" },
  { keyword: "blog", task: "write_blog_post" },
  { keyword: "summarize", task: "summarize" },
  { keyword: "summary", task: "summarize" },
  { keyword: "brainstorm", task: "brainstorm" },
  { keyword: "analyze", task: "analyze" }
];

function detectTask(text: string): TaskType {
  const lower = text.toLowerCase();
  for (const entry of TASK_KEYWORDS) {
    if (lower.includes(entry.keyword)) {
      return entry.task;
    }
  }
  return "other";
}

function detectTone(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("analytical")) return "analytical";
  if (lower.includes("friendly")) return "friendly";
  if (lower.includes("formal")) return "formal";
  if (lower.includes("technical")) return "technical";
  if (lower.includes("creative")) return "creative";
  return undefined;
}

function detectLength(text: string): string | undefined {
  const match = text.match(/(\d{3,5})\s*words?/i);
  if (match) return `${match[1]} words`;
  return undefined;
}

function detectAudience(text: string): string | undefined {
  const match = text.match(/(?:for|target(?:\s+audience)?):?\s+([^.,;]+)/i);
  if (match) return match[1].trim();
  return undefined;
}

function detectFormat(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("bullet")) return "bullet points";
  if (lower.includes("table")) return "table";
  if (lower.includes("json")) return "json";
  if (lower.includes("markdown")) return "markdown";
  if (lower.includes("outline")) return "outline";
  return undefined;
}

function detectLanguage(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("chinese")) return "zh";
  if (lower.includes("english")) return "en";
  if (lower.includes("japanese")) return "ja";
  if (lower.includes("spanish")) return "es";
  return undefined;
}

function detectTopic(text: string): string {
  const cleaned = text.replace(/^(write|create|generate|summarize)\s+/i, "");
  return cleaned.replace(/\s+about\s+/i, " ").trim();
}

export function parseIntent(text: string, overrides?: IntentOverrides): StructuredIntent {
  const detected = {
    task: detectTask(text),
    topic: detectTopic(text),
    audience: detectAudience(text) ?? "general",
    tone: detectTone(text),
    length: detectLength(text),
    constraints: [],
    format: detectFormat(text),
    language: detectLanguage(text) ?? "en"
  };

  return {
    ...detected,
    ...overrides
  };
}
