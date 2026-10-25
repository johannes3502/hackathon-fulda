import type { components } from "../../../../api/schema";

export type PresentationMode = NonNullable<
  components["schemas"]["QuestionRequest"]["presentation_mode"]
>;

export const PRESENTATION_MODES: Record<
  PresentationMode,
  { label: string; listener: string; focus: string }
> = {
  startup: {
    label: "Startup pitch",
    listener: "Investor",
    focus: "Customer problem, evidence, business model and your ask.",
  },
  thesis: {
    label: "Thesis defense",
    listener: "University professor",
    focus: "Research choices, methods, evidence and limitations.",
  },
  school: {
    label: "School presentation",
    listener: "Teacher",
    focus: "Clear explanations, understanding and examples.",
  },
  nonprofit: {
    label: "Nonprofit invitation",
    listener: "Potential supporter",
    focus: "Mission, credible impact and how people can help.",
  },
};

const STORAGE_KEY = "pitchcoach.presentationMode";
let current: PresentationMode | undefined;
const listeners = new Set<() => void>();

export function presentationModeSnapshot(): PresentationMode {
  if (current) return current;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.hasOwn(PRESENTATION_MODES, saved))
      return (current = saved as PresentationMode);
  } catch {}
  return (current = "startup");
}

export function subscribePresentationMode(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function storePresentationMode(mode: PresentationMode) {
  current = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  listeners.forEach((listener) => listener());
}
