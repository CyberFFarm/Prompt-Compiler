export type TaskType =
  | "write_article"
  | "write_blog_post"
  | "summarize"
  | "brainstorm"
  | "generate"
  | "analyze"
  | "other";

export interface IntentOverrides {
  task?: TaskType;
  topic?: string;
  audience?: string;
  tone?: string;
  length?: string;
  constraints?: string[];
  format?: string;
  language?: string;
}

export interface IntentInput {
  text: string;
  overrides?: IntentOverrides;
  models?: string[];
}

export interface StructuredIntent {
  task: TaskType;
  topic: string;
  audience?: string;
  tone?: string;
  length?: string;
  constraints?: string[];
  format?: string;
  language?: string;
}

export interface CompiledPrompt {
  prompt: string;
  meta: {
    role?: string;
    structure?: string[];
    constraints?: string[];
  };
}

export interface AdaptedPrompts {
  [model: string]: string;
}

export interface PromptAnalysis {
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface PromptVariants {
  structured: string;
  creative: string;
  technical: string;
}
