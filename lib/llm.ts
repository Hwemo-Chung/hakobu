import type { LlmMode } from "@/lib/types";

export type ModelRole = "nano" | "super" | "ultra";

export interface LlmResult {
  model: string;
  step: string;
  mode: LlmMode;
  latencyMs: number;
  text: string;
  note?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface NebiusResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";

const MODEL_DEFAULTS: Record<ModelRole, string> = {
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b"
};

const MODEL_ENV: Record<ModelRole, string> = {
  nano: "MODEL_NANO",
  super: "MODEL_SUPER",
  ultra: "MODEL_ULTRA"
};

export function modelFor(role: ModelRole): string {
  const fromEnv = process.env[MODEL_ENV[role]]?.trim();
  return fromEnv || MODEL_DEFAULTS[role];
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY?.trim());
}

function chatEndpoint(): string {
  const raw = process.env.NEBIUS_BASE_URL?.trim() || DEFAULT_BASE_URL;
  if (raw.endsWith("/chat/completions")) return raw;
  return `${raw.replace(/\/+$/, "")}/chat/completions`;
}

export interface CallLlmOptions {
  step: string;
  role: ModelRole;
  system: string;
  user: string;
  mockText: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Calls Nebius Token Factory's OpenAI-compatible endpoint.
 * Without a key (or after a failed call) it returns the supplied deterministic
 * mock text with mode: "mock", so callers can label the fallback visibly.
 */
export async function callLlm(options: CallLlmOptions): Promise<LlmResult> {
  const model = modelFor(options.role);
  const apiKey = process.env.NEBIUS_API_KEY?.trim();
  const started = Date.now();

  if (!apiKey) {
    return {
      model,
      step: options.step,
      mode: "mock",
      latencyMs: Date.now() - started,
      text: options.mockText,
      note: "NEBIUS_API_KEY is not set; deterministic mock response."
    };
  }

  try {
    const response = await fetch(chatEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user }
        ],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1400
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000)
    });

    const payload = (await response.json().catch(() => ({}))) as NebiusResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || `HTTP ${response.status}`);
    }

    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Empty completion");
    }

    return {
      model,
      step: options.step,
      mode: "live",
      latencyMs: Date.now() - started,
      text,
      usage: {
        promptTokens: Math.max(0, Number(payload.usage?.prompt_tokens) || 0),
        completionTokens: Math.max(0, Number(payload.usage?.completion_tokens) || 0)
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      model,
      step: options.step,
      mode: "mock",
      latencyMs: Date.now() - started,
      text: options.mockText,
      note: `Nebius request failed (${message}); deterministic mock response used.`
    };
  }
}

export function parseJsonObject(text: string): unknown | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}
