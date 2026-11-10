import { Env, SessionState } from "./types";

const DEFAULT_STATE: SessionState = {
  round: 1,
  mode: "supportive", // Opt-in roast is disabled by default
  grooveScore: 75,
  bloodPressure: 110,
  tendency: "warming up",
  avgOffsetMs: 0,
  currentDrill: {
    name: "Warm-Up Quarter Note Pocket",
    bpm: 95,
    beats: [0, 1, 2, 3],
    notesHz: [261.63, 329.63, 392.0, 523.25] // C4, E4, G4, C5
  },
  history: []
};

export class AuditionSession implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/reset" && request.method === "POST") {
      await this.state.storage.deleteAll();
      await this.state.storage.put("session", structuredClone(DEFAULT_STATE));
      return Response.json(DEFAULT_STATE);
    }

    const current: SessionState =
      (await this.state.storage.get<SessionState>("session")) ??
      structuredClone(DEFAULT_STATE);

    if (url.pathname === "/state" && request.method === "GET") {
      return Response.json(current);
    }

    if (url.pathname === "/update" && request.method === "POST") {
      const patch = (await request.json()) as Partial<SessionState>;
      const merged: SessionState = {
        ...current,
        ...patch
      };

      // Keep the last 8 conversation turns bounded
      if (merged.history.length > 8) {
        merged.history = merged.history.slice(-8);
      }

      await this.state.storage.put("session", merged);
      return Response.json(merged);
    }

    return new Response("Not Found", { status: 404 });
  }
}
