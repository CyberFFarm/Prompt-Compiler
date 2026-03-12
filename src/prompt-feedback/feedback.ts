import fs from "fs";
import path from "path";
import { loadConfig } from "../core/config";

export interface FeedbackEntry {
  id: string;
  promptId: string;
  score?: number;
  notes?: string;
  createdAt: string;
}

function getFeedbackPath(): string {
  const config = loadConfig();
  const configured = config.storage?.feedbackPath;
  if (configured) return configured;
  return path.join(process.cwd(), "data", "prompt-feedback.json");
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupCorruptFile(filePath: string): string | undefined {
  try {
    const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
    fs.renameSync(filePath, backupPath);
    return backupPath;
  } catch {
    return undefined;
  }
}

function isFeedbackEntry(value: unknown): value is FeedbackEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FeedbackEntry>;
  return (
    typeof item.id === "string" &&
    typeof item.promptId === "string" &&
    typeof item.createdAt === "string"
  );
}

function readFeedback(filePath: string): FeedbackEntry[] {
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const backupPath = backupCorruptFile(filePath);
      if (backupPath) {
        console.warn(`Feedback storage is not an array. Backed up to: ${backupPath}`);
      }
      return [];
    }

    return parsed.filter(isFeedbackEntry);
  } catch {
    const backupPath = backupCorruptFile(filePath);
    if (backupPath) {
      console.warn(`Feedback storage is corrupted. Backed up to: ${backupPath}`);
    }
    return [];
  }
}

function writeFeedback(filePath: string, entries: FeedbackEntry[]) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addFeedback(input: Omit<FeedbackEntry, "id" | "createdAt">): FeedbackEntry {
  const filePath = getFeedbackPath();
  const entries = readFeedback(filePath);
  const entry: FeedbackEntry = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...input
  };
  entries.unshift(entry);
  writeFeedback(filePath, entries);
  return entry;
}

export function listFeedback(promptId: string): FeedbackEntry[] {
  const filePath = getFeedbackPath();
  const entries = readFeedback(filePath);
  return entries.filter((entry) => entry.promptId === promptId);
}

export function evolvePrompt(prompt: string, feedbacks: FeedbackEntry[]): string {
  const notes = feedbacks
    .map((entry) => entry.notes)
    .filter(Boolean)
    .map((note) => `- ${note}`)
    .join("\n");

  if (!notes) return prompt;

  return `${prompt}\n\nAddress feedback:\n${notes}`;
}
