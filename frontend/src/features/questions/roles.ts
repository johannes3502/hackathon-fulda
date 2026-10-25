import type { components } from "../../../../api/schema";
import { PRESENTATION_MODES, type PresentationMode } from "./presentation";

export type VoiceRole = NonNullable<
  components["schemas"]["AgentRequest"]["voice_role"]
>;

export const VOICE_ROLES: Record<VoiceRole, { label: string; detail: string }> =
  {
    student: {
      label: "Student",
      detail: "Curious questions about terms, reasons and concrete examples.",
    },
    professor: {
      label: "University professor",
      detail: "Precise questions about reasoning, evidence and limitations.",
    },
    teacher: {
      label: "School teacher",
      detail: "Supportive questions that check understanding and explanations.",
    },
  };

export function voiceRoleLabel(role: VoiceRole | null, mode: PresentationMode) {
  return role ? VOICE_ROLES[role].label : PRESENTATION_MODES[mode].listener;
}
