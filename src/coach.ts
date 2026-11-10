import { AuditionRequestPayload, Env, LlmDrillResponse, RhythmDrill, SessionState } from "./types";

export async function handleAudition(
  payload: AuditionRequestPayload,
  env: Env
): Promise<Response> {
  const doId = env.AUDITION_SESSIONS.idFromName(payload.sessionId || "default");
  const stub = env.AUDITION_SESSIONS.get(doId);

  if (payload.reset) {
    const resetRes = await stub.fetch("http://do/reset", { method: "POST" });
    const freshState = (await resetRes.json()) as SessionState;
    return Response.json({
      critique: "Session reset! Ready at the metronome whenever you are.",
      state: freshState
    });
  }

  const stateRes = await stub.fetch("http://do/state");
  const session = (await stateRes.json()) as SessionState;

  // 1. Check if user changed mode via UI toggle OR via spoken voice command
  if (payload.mode === "supportive" || payload.mode === "whiplash") {
    session.mode = payload.mode;
  }
  if (payload.spokenText) {
    const lower = payload.spokenText.toLowerCase();
    if (lower.includes("whiplash") || lower.includes("roast mode")) {
      session.mode = "whiplash";
    } else if (lower.includes("supportive") || lower.includes("coach mode")) {
      session.mode = "supportive";
    }
  }

  // 2. Analyze millisecond timing telemetry from microphone
  let timingReport = "User did not play a rhythm drill this turn (voice chat only).";
  if (Array.isArray(payload.offsetsMs) && payload.offsetsMs.length > 0) {
    const offsets = payload.offsetsMs;
    const avg = Math.round(offsets.reduce((a, b) => a + b, 0) / offsets.length);
    const absAvg = Math.round(
      offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length
    );

    session.avgOffsetMs = avg;
    session.tendency =
      absAvg <= 28
        ? "locked in the pocket"
        : avg < 0
        ? "rushing (ahead of the beat)"
        : "dragging (behind the beat)";

    // Update Supportive Groove Score & Whiplash Blood Pressure
    const grooveDelta = absAvg <= 30 ? +8 : -Math.min(18, Math.round(absAvg / 6));
    session.grooveScore = Math.max(10, Math.min(100, session.grooveScore + grooveDelta));

    const bpDelta = absAvg <= 30 ? -10 : Math.min(30, Math.round(absAvg / 4));
    session.bloodPressure = Math.max(90, Math.min(200, session.bloodPressure + bpDelta));

    timingReport = `User clapped/vocalized ${offsets.length} beats. Millisecond offsets from target beats (negative = early/rushing, positive = late/dragging): [${offsets.join("ms, ")}ms]. Mean signed offset: ${avg}ms (${session.tendency}). Mean absolute error: ${absAvg}ms.`;
  }

  // 3. Build mode-aware system prompt for Llama 3.3
  const personaPrompt =
    session.mode === "whiplash"
      ? `Coaching Mode: OPT-IN WHIPLASH ROAST MODE. You are Maestro Terrence Fletcher. Be theatrical, dramatic, and funny ("Were you rushing or were you dragging?!"). Quote their exact millisecond errors dramatically. Current Maestro Blood Pressure: ${session.bloodPressure}/200.`
      : `Coaching Mode: SUPPORTIVE CONSERVATORY COACH (Default). You are a warm, encouraging, insightful jazz rhythm teacher. Give constructive, specific praise or advice based on their exact millisecond offsets, help them feel the subdivision, and pace the tempo smoothly. Current Groove Score: ${session.grooveScore}%.`;

  const systemPrompt = `${personaPrompt}
Current Session State:
- Round: ${session.round}
- Student Tendency: ${session.tendency}
- Previous Drill: "${session.currentDrill.name}" at ${session.currentDrill.bpm} BPM

Respond ONLY with a valid JSON object matching this exact schema:
{
  "critique": "2 to 3 spoken sentences reacting to their exact millisecond timing and/or spoken request.",
  "nextDrill": {
    "name": "Descriptive drill title",
    "bpm": 100,
    "beats": [0, 1, 2, 3],
    "notesHz": [261.63, 329.63, 392.0, 523.25]
  }
}
Rules for nextDrill:
- bpm must be an integer between 75 and 145.
- beats must be 4 or 5 ascending beat numbers between 0 and 3.5 (e.g., [0, 1, 2, 3] or [0, 1, 1.5, 2, 3]).
- notesHz must have the exact same array length as beats (frequencies between 220 and 660).`;

  const userPrompt = `Timing Telemetry: ${timingReport}\nStudent Spoken Input: "${payload.spokenText || "(none)"}"`;

  const aiResult = (await env.AI.run(
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    {
      messages: [
        { role: "system", content: systemPrompt },
        ...session.history,
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.75
    }
  )) as { response?: string | LlmDrillResponse };

  // The LLM is REQUIRED: any failure to produce a parseable response is an
  // error surfaced to the client (HTTP 502), never a canned fallback.
  let parsed: LlmDrillResponse;
  try {
    parsed =
      typeof aiResult.response === "object" && aiResult.response !== null
        ? aiResult.response
        : JSON.parse(String(aiResult.response));
  } catch (err) {
    throw new AuditionError(
      `LLM returned unparseable response: ${(err as Error).message}. Raw: ${String(aiResult.response).slice(0, 400)}`
    );
  }

  // Validate nextDrill arrays
  const validNextDrill: RhythmDrill =
    parsed.nextDrill &&
    typeof parsed.nextDrill.bpm === "number" &&
    Array.isArray(parsed.nextDrill.beats) &&
    Array.isArray(parsed.nextDrill.notesHz) &&
    parsed.nextDrill.beats.length === parsed.nextDrill.notesHz.length
      ? parsed.nextDrill
      : session.currentDrill;

  // 4. Save updated state in Durable Object
  const updatedRes = await stub.fetch("http://do/update", {
    method: "POST",
    body: JSON.stringify({
      round: session.round + 1,
      mode: session.mode,
      grooveScore: session.grooveScore,
      bloodPressure: session.bloodPressure,
      tendency: session.tendency,
      avgOffsetMs: session.avgOffsetMs,
      currentDrill: validNextDrill,
      history: [
        ...session.history,
        { role: "user", content: userPrompt },
        { role: "assistant", content: JSON.stringify(parsed) }
      ]
    } satisfies Partial<SessionState>)
  });

  const updatedState = (await updatedRes.json()) as SessionState;

  return Response.json({
    critique: parsed.critique,
    state: updatedState
  });
}

export class AuditionError extends Error {}
