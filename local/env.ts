import { AuditionSession } from "../src/session";
import { ChatMessage, Env } from "../src/types";

// ---------------------------------------------------------------------------
// Durable Object shim: Map-backed DurableObjectState around the real
// AuditionSession class from src/session.ts (reused verbatim).
// ---------------------------------------------------------------------------

class MapStorage implements DurableObjectStorage {
  private map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.map.set(key, structuredClone(value));
  }

  async deleteAll(): Promise<void> {
    this.map.clear();
  }
}

export class LocalDurableObjectNamespace implements DurableObjectNamespace {
  private sessions = new Map<string, DurableObjectStub>();

  idFromName(name: string): DurableObjectId {
    return { name };
  }

  get(id: DurableObjectId): DurableObjectStub {
    const key = id.name || "default";
    let stub = this.sessions.get(key);
    if (!stub) {
      const session = new AuditionSession(
        { storage: new MapStorage() } as DurableObjectState,
        {} as Env
      );
      stub = {
        fetch: (input: Request | string, init?: RequestInit) =>
          session.fetch(new Request(input, init))
      };
      this.sessions.set(key, stub);
    }
    return stub;
  }
}

// ---------------------------------------------------------------------------
// AI shim: REQUIRED OpenAI-compatible backend (llama.cpp server).
// No heuristic fallback: failures throw and surface as HTTP 502.
// ---------------------------------------------------------------------------

export interface LocalAiConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export function readLlmConfigFromEnv(): LocalAiConfig {
  const baseUrl = process.env.LLM_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "LLM_BASE_URL is not configured. Point it at an OpenAI-compatible endpoint, e.g. LLM_BASE_URL=http://localhost:8080/v1 for llama.cpp."
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    model: process.env.LLM_MODEL || "local-model",
    apiKey: process.env.LLM_API_KEY
  };
}

export class LlamaCppAI implements Ai {
  constructor(private config: LocalAiConfig) {}

  async run(_model: string, input: Record<string, unknown>): Promise<unknown> {
    if (!this.config.baseUrl) {
      throw new Error(
        "LLM_BASE_URL is not configured. Start llama.cpp and set LLM_BASE_URL, e.g. http://localhost:8080/v1."
      );
    }
    const messages = (input.messages as ChatMessage[]) ?? [];
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: input.temperature ?? 0.75,
      response_format: input.response_format ?? { type: "json_object" },
      stream: false
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    let res: Response;
    try {
      res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
    } catch (err) {
      throw new Error(
        `LLM endpoint unreachable at ${this.config.baseUrl}/chat/completions: ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `LLM endpoint returned HTTP ${res.status}: ${text.slice(0, 400)}`
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(
        `LLM endpoint returned no message content: ${JSON.stringify(data).slice(0, 400)}`
      );
    }
    return { response: content };
  }
}
