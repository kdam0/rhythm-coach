export type CoachMode = "supportive" | "whiplash";

export interface RhythmDrill {
  name: string;
  bpm: number;
  beats: number[];
  notesHz: number[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SessionState {
  round: number;
  mode: CoachMode;
  grooveScore: number;   // 0 - 100% (Primary metric in Supportive Mode)
  bloodPressure: number; // 90 - 200 BPM (Primary metric in opt-in Whiplash Mode)
  tendency: string;
  avgOffsetMs: number;
  currentDrill: RhythmDrill;
  history: ChatMessage[];
}

export interface AuditionRequestPayload {
  sessionId?: string;
  offsetsMs?: number[];
  spokenText?: string;
  mode?: CoachMode;
  reset?: boolean;
}

export interface LlmDrillResponse {
  critique: string;
  nextDrill: RhythmDrill;
}

export interface Env {
  AI: Ai;
  AUDITION_SESSIONS: DurableObjectNamespace;
}
