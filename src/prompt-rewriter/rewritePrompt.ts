import { PromptVariants } from "../core/types";

export function rewritePrompt(prompt: string): PromptVariants {
  return {
    structured: `${prompt}\n\nOutput format: JSON with keys: title, outline, sections.`,
    creative: `${prompt}\n\nMake it vivid and add a surprising analogy.`,
    technical: `${prompt}\n\nUse precise terminology and bullet points.`
  };
}
