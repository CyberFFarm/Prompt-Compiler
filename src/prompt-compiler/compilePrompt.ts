import { StructuredIntent, CompiledPrompt } from "../core/types";

function buildRole(intent: StructuredIntent): string {
  switch (intent.task) {
    case "write_article":
      return "You are an experienced editor.";
    case "write_blog_post":
      return "You are a seasoned blogger.";
    case "summarize":
      return "You are a concise summarization assistant.";
    case "brainstorm":
      return "You are a creative strategist.";
    case "analyze":
      return "You are an analytical researcher.";
    default:
      return "You are a helpful assistant.";
  }
}

function buildStructure(intent: StructuredIntent): string[] {
  if (intent.task === "write_article") {
    return ["introduction", "key points", "mitigation strategies", "conclusion"];
  }
  if (intent.task === "write_blog_post") {
    return ["hook", "main points", "takeaways"];
  }
  if (intent.task === "summarize") {
    return ["overview", "key points", "conclusion"];
  }
  if (intent.task === "brainstorm") {
    return ["idea list", "prioritized list", "next steps"];
  }
  return ["output"];
}

export function compilePrompt(intent: StructuredIntent): CompiledPrompt {
  const role = buildRole(intent);
  const structure = buildStructure(intent);
  const lengthLine = intent.length ? `Length: ${intent.length}.` : "";
  const toneLine = intent.tone ? `Tone: ${intent.tone}.` : "";
  const audienceLine = intent.audience ? `Audience: ${intent.audience}.` : "";
  const formatLine = intent.format ? `Output format: ${intent.format}.` : "";
  const constraintsLine =
    intent.constraints && intent.constraints.length > 0
      ? `Constraints: ${intent.constraints.join("; ")}.`
      : "";

  const prompt = [
    role,
    `Task: ${intent.task.replace(/_/g, " ")}.`,
    `Topic: ${intent.topic}.`,
    lengthLine,
    toneLine,
    audienceLine,
    formatLine,
    constraintsLine,
    `Structure: ${structure.join(", ")}.`,
    "Include real-world examples and practical advice where possible."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    prompt,
    meta: {
      role,
      structure,
      constraints: intent.constraints
    }
  };
}
