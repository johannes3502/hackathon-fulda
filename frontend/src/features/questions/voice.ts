/**
 * Voice conversation helpers: the browser reads questions aloud
 * (`speechSynthesis`, no network call by us) and records spoken answers,
 * which the backend transcribes and compares with the sources.
 */
import type { Persona, Question } from "./api";

/** The talk is transcribed in German, so questions and replies are German. */
export const SPEECH_LANG = "de-DE";

/** Browser voice rounds are capped independently of the backend round ledger. */
export const VOICE_ROUND_LIMIT_S = 600;
export const MAX_VOICE_USER_TURNS = 12;
export const MAX_FOLLOW_UPS_PER_MAIN = 2;

export function remainingSeconds(
  startedAt: number | null,
  now = Date.now(),
  limitSeconds = VOICE_ROUND_LIMIT_S,
): number {
  if (startedAt === null) return limitSeconds;
  return Math.max(0, limitSeconds - Math.floor((now - startedAt) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** Root question of a follow-up id such as `q1.f1` or `q1.f1.f2`. */
export function followUpParent(id: string): string {
  const marker = id.indexOf(".f");
  return marker < 0 ? id : id.slice(0, marker);
}

export function followUpsForMain(
  questions: Question[],
  mainId: string,
): number {
  const root = followUpParent(mainId);
  return questions.filter(
    (question) =>
      question.kind === "follow_up" && followUpParent(question.id) === root,
  ).length;
}

export function canAddFollowUp(
  questions: Question[],
  mainId: string,
): boolean {
  return followUpsForMain(questions, mainId) < MAX_FOLLOW_UPS_PER_MAIN;
}

/** Shared by both voice components so the timer and turn cap stop a session. */
export function voiceSessionExpired(
  startedAt: number | null,
  userTurns: number,
  now = Date.now(),
): boolean {
  return (
    remainingSeconds(startedAt, now) === 0 ||
    userTurns >= MAX_VOICE_USER_TURNS
  );
}

export function canStartVoiceRound(
  limitReached: boolean,
  available: boolean,
): boolean {
  return available && !limitReached;
}

/** End a provider session exactly once; safe for a missing session. */
export async function endSessionIfActive(
  session: { endSession: () => Promise<void> } | null,
): Promise<void> {
  await session?.endSession();
}

/** Pitch and rate only make the two roles audibly distinct; nothing is inferred from them. */
const VOICE: Record<Persona, { pitch: number; rate: number }> = {
  student: { pitch: 1.2, rate: 1.05 },
  tutor: { pitch: 0.9, rate: 0.95 },
};

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canRecordAnswers() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Read `text` aloud; resolves when done or immediately if the browser cannot speak. */
export function speak(
  text: string,
  persona: Persona,
  signal: AbortSignal,
): Promise<void> {
  if (!canSpeak() || !text.trim() || signal.aborted) return Promise.resolve();
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG;
  utterance.pitch = VOICE[persona].pitch;
  utterance.rate = VOICE[persona].rate;
  const voice = synth.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) utterance.voice = voice;
  return new Promise((resolve) => {
    const done = () => {
      signal.removeEventListener("abort", stop);
      resolve();
    };
    const stop = () => {
      synth.cancel();
      done();
    };
    utterance.onend = done;
    utterance.onerror = done;
    signal.addEventListener("abort", stop, { once: true });
    synth.cancel();
    synth.speak(utterance);
  });
}

function answerMimeType() {
  return (
    ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? ""
  );
}

/** Record from the microphone until `until` resolves; the mic is released afterwards. */
export async function recordAnswer(
  until: Promise<void>,
  signal: AbortSignal,
): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  try {
    signal.throwIfAborted();
    const mimeType = answerMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      void until.then(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      });
    }).finally(() => {
      if (recorder.state !== "inactive") recorder.stop();
    });
    await stopped;
    return new Blob(chunks, { type: recorder.mimeType || mimeType });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/** Next question to ask: follow-ups sit right after their question, so list order is conversation order. */
export function nextQuestion(
  questions: Question[],
  done: ReadonlySet<string>,
): Question | undefined {
  return questions.find((q) => !done.has(q.id));
}
