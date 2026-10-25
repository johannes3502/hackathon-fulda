"""Fixed jury-mode question and agent context.

The stage path must not depend on an LLM, source retrieval, Redis or a
provider. This module is the single hardcoded source of truth for the one
privacy question asked after the pitch. The normal `/questions` path is not
changed.
"""

import os

from pydantic import BaseModel, Field

from app.factcheck.models import Evidence

PITCH_QUESTION = (
    "Eure Demo verarbeitet Kamera- und Mikrofonaufnahmen. "
    "Welche Daten verlassen den Laptop, und was passiert mit der Originalaufnahme?"
)
PITCH_REASON = "Die Frage prüft die Datenschutz-Aussage der Demo."
PITCH_EVIDENCE = Evidence(
    kind="upload",
    label="418 Pitch · Datenschutz",
    quote=(
        "Die Aufnahme bleibt im Browser. Für die Analyse geht der Take an den "
        "lokalen Backend-Server; die Originaldatei wird nach der Verarbeitung gelöscht."
    ),
    passage=(
        "Die Aufnahme bleibt im Browser. Für die Analyse geht der Take an den "
        "lokalen Backend-Server; die Originaldatei wird nach der Verarbeitung gelöscht. "
        "Transkript und Analyseergebnisse bleiben in Postgres. Deepgram und "
        "ElevenLabs sind optionale Cloud-Anbieter und standardmäßig aus."
    ),
    quote_verified="exact",
)
PITCH_ANSWER_POINTS = [
    "Das Review-Video bleibt lokal im Browser und wird nicht als Server-Clip gespeichert.",
    "Der Take geht für die Analyse an den lokalen Backend-Server; die Originaldatei wird nach der Verarbeitung gelöscht.",
    "Transkript, Events und geprüfte Quellen bleiben in Postgres bzw. im lokalen Objektspeicher.",
    "Deepgram und ElevenLabs sind optionale Cloud-Anbieter und standardmäßig aus; ohne Schlüssel bleibt Whisper lokal.",
    "Für die Jury werden nur synthetische Demo-Daten verwendet, keine echten Personenaufnahmen an Cloud-APIs.",
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
    evidence: Evidence
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
