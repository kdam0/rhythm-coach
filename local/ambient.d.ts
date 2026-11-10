// Ambient globals that mirror the subset of @cloudflare/workers-types used by
// src/, so the local Node prototype typechecks and runs without the Workers
// runtime. Only included via tsconfig.local.json.

declare type BaseAiTextGenerationModels = string;

declare interface Ai {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

declare interface DurableObject {}

declare interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  deleteAll(): Promise<void>;
}

declare interface DurableObjectState {
  storage: DurableObjectStorage;
}

declare interface DurableObjectId {
  name?: string;
}

declare interface DurableObjectStub {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}
