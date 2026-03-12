import { loadConfig } from "../core/config";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export interface OpenAIResult {
  output: string;
  model: string;
}

function buildDispatcher(): ProxyAgent | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;
  return new ProxyAgent(proxyUrl);
}

export async function runOpenAI(prompt: string): Promise<OpenAIResult> {
  const config = loadConfig();
  const provider = config.providers?.openai;
  const apiKeyEnv = provider?.apiKeyEnv || "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing API key. Set ${apiKeyEnv} in your environment.`);
  }

  const baseUrl = provider?.baseUrl || "https://api.openai.com/v1";
  const model = provider?.model || "gpt-4o-mini";

  const dispatcher = buildDispatcher();
  try {
    const response = await undiciFetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      dispatcher,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const output = data.choices?.[0]?.message?.content?.trim() || "";

    return { output, model };
  } finally {
    if (dispatcher) {
      await dispatcher.close();
    }
  }
}
