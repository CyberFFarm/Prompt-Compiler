import fs from "fs";
import path from "path";
import { loadConfig } from "../core/config";

export interface LibraryEntry {
  id: string;
  title?: string;
  tags?: string[];
  intent?: string;
  prompt: string;
  createdAt: string;
}

export interface LibraryQuery {
  limit?: number;
  tag?: string;
  search?: string;
}

function getLibraryPath(): string {
  const config = loadConfig();
  const configured = config.storage?.libraryPath;
  if (configured) return configured;
  return path.join(process.cwd(), "data", "prompt-library.json");
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

function isLibraryEntry(value: unknown): value is LibraryEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LibraryEntry>;
  return (
    typeof item.id === "string" &&
    typeof item.prompt === "string" &&
    typeof item.createdAt === "string"
  );
}

function readLibrary(filePath: string): LibraryEntry[] {
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const backupPath = backupCorruptFile(filePath);
      if (backupPath) {
        console.warn(`Library storage is not an array. Backed up to: ${backupPath}`);
      }
      return [];
    }

    return parsed.filter(isLibraryEntry);
  } catch {
    const backupPath = backupCorruptFile(filePath);
    if (backupPath) {
      console.warn(`Library storage is corrupted. Backed up to: ${backupPath}`);
    }
    return [];
  }
}

function writeLibrary(filePath: string, entries: LibraryEntry[]) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addEntry(input: Omit<LibraryEntry, "id" | "createdAt">): LibraryEntry {
  const filePath = getLibraryPath();
  const entries = readLibrary(filePath);
  const entry: LibraryEntry = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...input
  };
  entries.unshift(entry);
  writeLibrary(filePath, entries);
  return entry;
}

export function listEntries(query: LibraryQuery = {}): LibraryEntry[] {
  const filePath = getLibraryPath();
  let entries = readLibrary(filePath);

  if (query.tag) {
    entries = entries.filter((entry) => entry.tags?.includes(query.tag as string));
  }
  if (query.search) {
    const term = query.search.toLowerCase();
    entries = entries.filter((entry) => {
      const haystack = [entry.title, entry.intent, entry.prompt]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }
  if (query.limit && query.limit > 0) {
    entries = entries.slice(0, query.limit);
  }

  return entries;
}

export function getEntry(id: string): LibraryEntry | undefined {
  const filePath = getLibraryPath();
  const entries = readLibrary(filePath);
  return entries.find((entry) => entry.id === id);
}
