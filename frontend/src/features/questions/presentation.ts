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
