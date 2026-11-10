import * as http from "node:http";
import worker from "../src/index";
import { Env } from "../src/types";
import { LlamaCppAI, LocalDurableObjectNamespace, readLlmConfigFromEnv } from "./env";

const PORT = Number(process.env.PORT || 8787);

let llmConfig: ReturnType<typeof readLlmConfigFromEnv> | null = null;
try {
  llmConfig = readLlmConfigFromEnv();
} catch (err) {
  console.warn(`⚠️  ${(err as Error).message}`);
  console.warn("⚠️  The server will start, but every /api/audition call will return HTTP 502");
  console.warn("⚠️  until an OpenAI-compatible endpoint is configured. Example (llama.cpp):");
  console.warn("     llama-server -m <model.gguf> --port 8080");
  console.warn("     LLM_BASE_URL=http://localhost:8080/v1 npm run local");
}

const env: Env = {
  AI: new LlamaCppAI(llmConfig ?? { baseUrl: "", model: "" }),
  AUDITION_SESSIONS: new LocalDurableObjectNamespace()
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  let request: Request;
  try {
    request = new Request(url, {
      method: req.method,
      headers: { "content-type": req.headers["content-type"] || "application/json" },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req)
    });
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Invalid request: ${(err as Error).message}` }));
    return;
  }

  try {
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, {
      "Content-Type": response.headers.get("Content-Type") || "application/json"
    });
    res.end(await response.text());
  } catch (err) {
    console.error("❌ Unhandled error:", (err as Error).message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Unhandled error: ${(err as Error).message}` }));
  }
});

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`🎵 PocketCoach AI (local) listening on http://localhost:${PORT}`);
  if (llmConfig) {
    console.log(`🧠 LLM backend: ${llmConfig.baseUrl} (model: ${llmConfig.model})`);
  }
});
