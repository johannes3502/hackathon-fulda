"""Event schema shared by all analysis pipelines (AGENTS.md, "Event-Schema").

Every pipeline reports `t_ms` relative to the recording start, so results of
independent pipelines (audio signal, transcript, pose, ...) can be merged
onto one timeline. `session_id` and `id` are assigned on persistence, which
is not implemented yet.
"""

from typing import Any, Literal

from pydantic import BaseModel

EventType = Literal[
    "posture", "gesture", "gaze", "filler", "pause", "pace", "volume", "pitch", "fact", "question"
]
Severity = Literal["info", "hint", "warning"]
Source = Literal["browser", "asr", "speech", "factcheck", "agent"]


class Event(BaseModel):
    t_ms: int
    duration_ms: int
    type: EventType
    severity: Severity
    source: Source
    payload: dict[str, Any]


def merge_timeline(*event_lists: list[Event]) -> list[Event]:
    """Combine events of several pipelines in time order."""
    return sorted((e for events in event_lists for e in events), key=lambda e: (e.t_ms, e.source, e.type))
