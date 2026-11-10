# rhythm coach

A basic rhythm coach (LLM) that helps (debatable) you develop timing
by telling you whether you are rushing or dragging, and by how much
(offset in ms). You can either sing the target phrase back, clap, or
even snap your fingers (depending your mic quality).

There is an opt-in "roast" mode, where the LLM will get progressively
angrier as you make mistakes. Inspired by the movie Whiplash.

This is a *prototype* only, mostly for fun, and demonstration
purposes.

# Resources

- https://search.opentofu.org/provider/cloudflare/cloudflare/latest/docs/resources/workers_script
- Gemini Argon

# Prompts Used
## Prompt 1

Using Typescript, generate an interactive rhythm, and timing "coach"
that plays a target synth phrase (in Bar 1), and times a user's
vocal/clap input playback (Bar 2) using standard browser APIs only.

Requirements:

- Use Durable Objects to persist user's settings, progress
  i.e. history.
- App should just be a single page on `/`.
- The coach is an LLM. Use `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  on Cloudflare Workers AI with `response_format: { type:
  "json_object" }`.
- Prompt the coach, with the exact ms + spoken input + Durable Object
  history, returning the critique, and the next drill phrase.
- User should be able to see the avg. signed offset, and mean absolute
  error in Ms.
- User should be able to switching modes between `"supportive"`
  (default constructive conservatory mentor) and `"whiplash"` (opt-in
  Terrence Fletcher roast mode) via either the UI toggle parameter or
  spoken voice commands.
- Read out loud the coach's critique.
- Negative user offset (relative to target) is "rushing", and positive
  offset is "dragging".
- Structure the app for portability. We might wish to use a local LLM,
  and local storage instead of Cf-native options in the future.

## Prompt 2

Lets make it fully-operational on localhost. Store this under `local/`
and mock the CF LLM routing to a local LLM endpoint, and mock the CF
Durable Object storage as a simple map. 

# Build & Deploy Commands (Inside Nix Shell)

```bash
# 1. Enter the Nix environment
nix-shell

# 2. Install TypeScript Worker type definitions & bundle to dist/worker.js
npm install
npm run build

# 3. Deploy with OpenTofu
export TF_VAR_cloudflare_account_id="your_account_id"
export TF_VAR_cloudflare_api_token="your_api_token"
export TF_VAR_workers_dev_subdomain="your_subdomain"
tofu init
tofu apply
# URL: https://rhythm-coach.<your-subdomain>.workers.dev
```

# Configuration (environment variables)

|Var           |Required                       |Default      |Notes                                                                                   |
|--------------|-------------------------------|-------------|----------------------------------------------------------------------------------------|
|`LLM_BASE_URL`|Yes (for functioning responses)|—            |e.g. `http://gpu-box.lan:8080/v1` (llama.cpp OpenAI-compatible endpoint; remote host OK)|
|`LLM_MODEL`   |No                             |`local-model`|llama.cpp ignores the model name                                                        |
|`LLM_API_KEY` |No                             |—            |Sent as `Bearer` if set (llama.cpp is usually unauthenticated; useful behind a proxy)   |
|`PORT`        |No                             |`8787`       |Local server port                                                                       |

# Bring your own LLM

Run it entirely locally by pointing to your custom OpenAI compatible
API eg. with OpenRouter, or llama.cpp etc.

```bash
# Terminal 1: llama.cpp server (any host)
llama-server -m <model.gguf> --port 8080

# Terminal 2: app
nix-shell
LLM_BASE_URL=http://<llama-host>:8080/v1 npm run local
# open http://localhost:8787
```

