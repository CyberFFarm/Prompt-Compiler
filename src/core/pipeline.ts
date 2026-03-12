import { parseIntent } from "../intent-parser/parseIntent";
import { compilePrompt } from "../prompt-compiler/compilePrompt";
import { adaptPrompts } from "../model-adapters/adaptPrompts";
import { analyzePrompt } from "../prompt-analyzer/analyzePrompt";
import { rewritePrompt } from "../prompt-rewriter/rewritePrompt";
import {
  IntentInput,
  StructuredIntent,
  CompiledPrompt,
  AdaptedPrompts,
  PromptAnalysis,
  PromptVariants
} from "./types";

export interface PipelineResult {
  intent: StructuredIntent;
  compiled: CompiledPrompt;
  adapted: AdaptedPrompts;
  analysis: PromptAnalysis;
  variants: PromptVariants;
}

export function runPipeline(input: IntentInput): PipelineResult {
  const intent = parseIntent(input.text, input.overrides);
  const compiled = compilePrompt(intent);
  const adapted = adaptPrompts(compiled.prompt, input.models);
  const analysis = analyzePrompt(compiled.prompt);
  const variants = rewritePrompt(compiled.prompt);

  return { intent, compiled, adapted, analysis, variants };
}
