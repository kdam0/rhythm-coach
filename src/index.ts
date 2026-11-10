import { AuditionSession } from "./session";
import { handleAudition, AuditionError } from "./coach";
import { AuditionRequestPayload, Env } from "./types";
import { UI_HTML } from "./ui";

export { AuditionSession };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(UI_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (url.pathname === "/api/audition" && request.method === "POST") {
      const body = (await request.json()) as AuditionRequestPayload;
      try {
        return await handleAudition(body, env);
      } catch (err) {
        const message =
          err instanceof AuditionError
            ? err.message
            : `Audition failed: ${(err as Error).message}`;
        return Response.json({ error: message }, { status: 502 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
