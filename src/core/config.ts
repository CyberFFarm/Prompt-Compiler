import fs from "fs";
import path from "path";
import { IntentOverrides } from "./types";

export interface IntentConfig {
  defaults?: {
    models?: string[];
    output?: string;
    preset?: string;
    overrides?: IntentOverrides;
  };
  storage?: {
    libraryPath?: string;
    feedbackPath?: string;
  };
  providers?: Record<
    string,
    {
      apiKeyEnv?: string;
      baseUrl?: string;
      model?: string;
    }
  >;
  web?: {
    port?: number;
  };
}

function tryReadJson(filePath: string): IntentConfig | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as IntentConfig;
  } catch {
    return undefined;
  }
}

export function loadConfig(explicitPath?: string): IntentConfig {
  const cwd = process.cwd();
  const candidates = [
    explicitPath,
    process.env.INTENT_CONFIG,
    path.join(cwd, "intent.config.json"),
    path.join(cwd, "config", "intent.config.json")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const parsed = tryReadJson(candidate);
    if (parsed) return parsed;
  }

  return {};
}
