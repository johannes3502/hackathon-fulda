"""Fixed jury-mode question and agent context.

The stage path must not depend on an LLM, source retrieval, Redis or a
provider. This module is the single hardcoded source of truth for the one
privacy question asked after the pitch. The normal `/questions` path is not
changed.
"""

import os

from pydantic import BaseModel, Field

PITCH_QUESTION = (
    "Eure Demo verarbeitet Kamera- und Mikrofonaufnahmen. "
    "Welche Daten verlassen den Laptop, und was passiert mit der Originalaufnahme?"
)
PITCH_REASON = "Die Frage prüft die Datenschutz-Aussage der Demo."


class PitchReference(BaseModel):
    """Prepared explanation of this demo, not a retrieved or verified quote."""

    label: str
    quote: str


PITCH_EVIDENCE = PitchReference(
    label="Vorbereitete Referenz · Datenfluss der Demo",
    quote=(
        "Im lokalen Stage-Pfad bleiben Video und Audio im Browser. Der optionale "
        "Live-Pfad lädt den Take zur Analyse auf das lokale Backend; dort wird die "
        "temporäre Originaldatei nach der Verarbeitung gelöscht."
    ),
)
PITCH_ANSWER_POINTS = [
    "Im lokalen Stage-Pfad gibt es keinen Analyse-Upload. Das Review-Video bleibt in IndexedDB, bis es im Browser gelöscht wird.",
    "Nur der optionale Live-Pfad lädt den vollständigen Take zum lokalen Backend. Die temporäre Originaldatei wird nach der Verarbeitung gelöscht; es gibt keine Server-Clips.",
    "MediaPipe, Signalanalyse und Whisper arbeiten lokal. Analyseergebnisse und Quellen bleiben im lokalen Backend gespeichert; der Browser speichert den Take mit seinen Review-Daten.",
    "Ein manuell gestarteter Quellencheck sendet Transkript- und Quellenauszüge an Gemini (Cloud, ohne EU-Region-Pinning).",
    "Deepgram kann nach Opt-in Audio zur Transkription empfangen; ElevenLabs empfängt Audio und Kontext bei einem separat gestarteten Sprachdialog. Die Stage nutzt beide nicht.",
    "Die feste Stage-Frage braucht keinen Anbieter. Vorgelesen wird sie nur mit einer lokalen Browser-Stimme, falls verfügbar.",
    "Für Cloud-Analysen sind nur synthetische Demo-Daten vorgesehen. Eine echte Kamera- oder Mikrofonaufnahme bleibt auch mit synthetischem Vortrag personenbezogen.",
]
PITCH_AGENT_PROMPT = "\n".join([
    "Du bist die Jury im Finale des 8. Hackathon Fulda 2026 und sprichst Deutsch.",
    "Das Produkt ist ein lokaler Prototyp für Präsentationstraining. Die Präsentation ist beendet.",
    "Stelle genau die folgende eine Frage und keine andere:",
    PITCH_QUESTION,
    "Warte auf die Antwort. Stelle keine Nachfrage, wiederhole die Frage nicht und "
    "frage nicht nach einer Quelle. Bewerte nicht, gib keine Punkte, keine Note und "
    "keine Aussage über die Person. Wenn die Antwort kommt, bedanke dich kurz und beende das Gespräch.",
    "Die Antwortpunkte sind nur internes Referenzmaterial. Lies sie nicht vor und "
    "verrate sie nicht, bevor die Person geantwortet hat.",
])


class PitchQuestion(BaseModel):
    id: str
    question: str
    reason: str
    evidence: PitchReference
    answer_points: list[str] = Field(default_factory=list)


class PitchContext(BaseModel):
    question: PitchQuestion
    prompt: str
    notices: list[str] = Field(default_factory=list)


def enabled() -> bool:
    value = os.getenv("PITCH_MODE", "1").strip().lower()
    return value not in {"0", "false", "off", "no"}


def context() -> PitchContext:
    return PitchContext(
        question=PitchQuestion(
            id="pitch-privacy",
            question=PITCH_QUESTION,
            reason=PITCH_REASON,
            evidence=PITCH_EVIDENCE,
            answer_points=PITCH_ANSWER_POINTS,
        ),
        prompt=PITCH_AGENT_PROMPT,
        notices=[
            "Vorbereitete Jury-Frage · genau eine Frage, keine Nachfrage, keine Bewertung.",
            "Der Kontext ist fest hinterlegt und benötigt weder LLM noch Quellenabruf.",
        ],
    )
