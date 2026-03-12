import { PromptAnalysis } from "../core/types";

export function analyzePrompt(prompt: string): PromptAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!/You are/gi.test(prompt)) {
    issues.push("No role definition");
    suggestions.push("Add a role or system persona");
  }
  if (!/Structure:/gi.test(prompt)) {
    issues.push("Missing output structure");
    suggestions.push("Add sections or steps");
  }
  if (!/Length:/gi.test(prompt)) {
    issues.push("No length constraint");
    suggestions.push("Specify length or output limit");
  }

  const score = Math.max(0, 10 - issues.length * 2.5);
  return { score, issues, suggestions };
}
