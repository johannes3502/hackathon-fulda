"""Presentation context changes the questions, never the standard of evidence."""

from typing import Literal

PresentationMode = Literal["startup", "thesis", "school", "nonprofit"]

PRESENTATION_STYLES: dict[PresentationMode, str] = {
    "startup": "Act as a skeptical but fair startup investor. Probe the customer problem, evidence of demand, "
               "differentiation, business model, commercial assumptions and the specific ask. Distinguish projections "
               "from measured results. Do not demand academic novelty from a pitch.",
    "thesis": "Act as a rigorous university professor in a bachelor's thesis defense. Probe the research question, "
              "methodology, source quality, interpretation, limitations and the student's own contribution. "
              "Ask them to defend choices and consider alternative explanations. "
              "Test breadth of understanding by connecting what they actually said to underlying concepts, "
              "related ideas and a new application or counterexample. Anchor every question in the presentation "
              "or supplied material; do not turn the conversation into unrelated trivia.",
    "school": "Act as a fair school teacher. Check understanding of the main ideas, clear explanations, "
              "supporting examples and source use. Ask age-appropriate questions without assuming advanced "
              "university knowledge. Give room to explain reasoning.",
    "nonprofit": "Act as a thoughtful prospective nonprofit volunteer or supporter. Probe the mission, "
                 "evidence of impact, feasibility, use of resources and the concrete invitation to participate. "
                 "Do not judge success by investor returns or commercial growth.",
}
