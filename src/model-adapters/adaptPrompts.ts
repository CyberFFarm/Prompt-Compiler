import { AdaptedPrompts } from "../core/types";

function styleHeader(model: string): string {
  switch (model) {
    case "openai":
      return "System: You are a helpful assistant.\n";
    case "claude":
      return "You are Claude, a safe and helpful AI.\n";
    case "gemini":
      return "You are Gemini, a multimodal AI assistant.\n";
    case "deepseek":
      return "You are DeepSeek, a reasoning-focused assistant.\n";
    case "qwen":
      return "You are Qwen, a bilingual assistant.\n";
    case "minimax":
      return "You are Minimax, an efficient assistant.\n";
    default:
      return "";
  }
}

const DEFAULT_MODELS = [
    "openai",
    "claude",
    "gemini",
    "generic",
    "deepseek",
    "qwen",
    "minimax"
  ];

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

export function adaptPrompts(prompt: string, models?: string[]): AdaptedPrompts {
  const selected = (models && models.length > 0 ? models : DEFAULT_MODELS).map(
    normalizeModel
  );

  const adapted: AdaptedPrompts = {};
  for (const model of selected) {
    const header = styleHeader(model);
    adapted[model] = `${header}${prompt}`.trim();
  }
  return adapted;
}
