import { expect, it, vi } from "vitest";
import { VoiceMicrophone } from "./microphone";

it("keeps the existing interruptible behavior by default", () => {
  const mic = new VoiceMicrophone();
  const session = { setMicMuted: vi.fn() };
  mic.attach(session);
  mic.setMode("speaking");
  expect(session.setMicMuted).toHaveBeenLastCalledWith(false);
});

it("mutes agent playback and reopens the microphone for each answer", () => {
  const mic = new VoiceMicrophone(true);
  const session = { setMicMuted: vi.fn() };
  mic.attach(session);
  mic.setMode("speaking");
  mic.setMode("listening");
  mic.setMode("speaking");
  mic.setMode("listening");
  expect(session.setMicMuted.mock.calls).toEqual([
    [false],
    [true],
    [false],
    [true],
    [false],
  ]);
});

it("never reopens a manually muted microphone when playback ends or protection changes", () => {
  const mic = new VoiceMicrophone(true);
  const session = { setMicMuted: vi.fn() };
  mic.attach(session);
  mic.setMuted(true);
  session.setMicMuted.mockClear();
  mic.setMode("speaking");
  mic.setMode("listening");
  mic.setProtectAgentSpeech(false);
  expect(session.setMicMuted.mock.calls).toEqual([[true], [true], [true]]);
  mic.setMuted(false);
  expect(session.setMicMuted).toHaveBeenLastCalledWith(false);
});

it("unmuting manually during playback keeps protection until the agent finishes", () => {
  const mic = new VoiceMicrophone(true);
  const session = { setMicMuted: vi.fn() };
  mic.attach(session);
  mic.setMode("speaking");
  mic.setMuted(true);
  mic.setMuted(false);
  expect(session.setMicMuted).toHaveBeenLastCalledWith(true);
  mic.setMode("listening");
  expect(session.setMicMuted).toHaveBeenLastCalledWith(false);
});

it("allows interruptions immediately when protection is turned off", () => {
  const mic = new VoiceMicrophone(true);
  const session = { setMicMuted: vi.fn() };
  mic.attach(session);
  mic.setMode("speaking");
  mic.setProtectAgentSpeech(false);
  expect(session.setMicMuted).toHaveBeenLastCalledWith(false);
  mic.setProtectAgentSpeech(true);
  expect(session.setMicMuted).toHaveBeenLastCalledWith(true);
});

it("applies a mode received before session attachment and drops ended sessions", () => {
  const mic = new VoiceMicrophone(true);
  const oldSession = { setMicMuted: vi.fn() };
  mic.setMode("speaking");
  mic.attach(oldSession);
  expect(oldSession.setMicMuted).toHaveBeenLastCalledWith(true);
  mic.setMuted(true);
  mic.setProtectAgentSpeech(false);
  mic.detach();
  oldSession.setMicMuted.mockClear();
  mic.setMode("speaking");
  const nextSession = { setMicMuted: vi.fn() };
  mic.attach(nextSession);
  expect(oldSession.setMicMuted).not.toHaveBeenCalled();
  expect(nextSession.setMicMuted).toHaveBeenLastCalledWith(false);
  mic.setProtectAgentSpeech(true);
  expect(nextSession.setMicMuted).toHaveBeenLastCalledWith(true);
});
