"""Versioned metric catalogue. Thresholds are prototype heuristics, not norms."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MetricDefinition:
    metric_id: str
    label_de: str
    label_en: str
    description_de: str
    description_en: str
    unit: str
    value_type: str
    suggested_direction: str
    is_primary: bool
    source: str
    min_duration_ms: int = 60_000
    min_pose_coverage: float | None = None
    min_pose_valid_ratio: float | None = None
    min_audio_active_ratio: float | None = None
    min_word_count: int | None = None
    min_claim_count: int | None = None
    device_sensitive: bool = False
    version: int = 1
    heuristic: bool = True
    noise_floor: float = 0.0
    min_effect: float = 0.0


def _metric(metric_id, label_de, label_en, description_de, description_en, unit, value_type,
            direction, primary, source, **limits):
    return MetricDefinition(metric_id, label_de, label_en, description_de, description_en, unit,
                            value_type, direction, primary, source, **limits)


PRIMARY = [
    _metric("speech.pace_wpm", "Sprechtempo", "Speaking pace",
            "Wörter pro Minute ohne lange Pausen. Kein universell guter Zielwert.",
            "Words per minute excluding long pauses. There is no universally good target.",
            "WPM", "rate", "neutral", True, "asr",
            min_word_count=50, min_effect=5.0),
    _metric("speech.pause_share", "Pausenanteil", "Pause share",
            "Anteil der Aufnahme, in dem eine Pause markiert war. Stille kann gewollt sein.",
            "Share of the recording marked as a pause. Silence can be intentional.",
            "ratio", "ratio", "decrease", True, "speech",
            min_audio_active_ratio=0.2, min_effect=0.05),
    _metric("speech.filler_rate_per_100_words", "Füllwörter pro 100 Wörter",
            "Fillers per 100 words",
            "Vom ASR erkannte Füllwörter. Die deutsche Erkennung ist ungeprüft.",
            "Fillers detected by ASR. German detection quality is unverified.",
            "per100w", "rate", "decrease", True, "asr",
            min_word_count=50, min_effect=1.0),
    _metric("pose.posture_share", "Haltungsanteil", "Posture event share",
            "Zeitanteil mit markierten Haltungsereignissen. Eine Heuristik, keine Haltungsnote.",
            "Share of time with marked posture events. A heuristic, not a posture grade.",
            "ratio", "ratio", "decrease", True, "pose",
            min_pose_coverage=0.6, min_pose_valid_ratio=0.8, min_effect=0.05),
    _metric("pose.head_away_share", "Kopf abgewandt", "Head-away share",
            "Zeitanteil mit Kopforientierungs-Proxy abgewandt. Kein Blickkontakt.",
            "Share of time with the head-orientation proxy away. Not eye contact.",
            "ratio", "ratio", "decrease", True, "pose",
            min_pose_coverage=0.6, min_pose_valid_ratio=0.8, min_effect=0.05),
    _metric("pose.gesture_rate_per_min", "Gesten pro Minute", "Gestures per minute",
            "Anzahl markierter Gesten pro auswertbarer Minute. Häufigkeit ist nicht Qualität.",
            "Marked gestures per evaluable minute. Frequency is not quality.",
            "perMin", "perMin", "neutral", True, "pose",
            min_pose_coverage=0.6, min_pose_valid_ratio=0.8, min_effect=1.0),
    _metric("content.contradiction_rate", "Widerspruchsquote", "Contradiction rate",
            "Anteil geprüfter Aussagen, denen eine Quelle widerspricht. 'Nicht gefunden' zählt nicht als Widerspruch.",
            "Share of checked claims contradicted by a source. 'Not found' is not a contradiction.",
            "ratio", "ratio", "decrease", True, "factcheck",
            min_word_count=50, min_claim_count=3, min_effect=0.05),
]

EXPLORATORY = [
    _metric("speech.pitch_range_st", "Tonhöhenstreuung", "Pitch range",
            "p10-bis-p90-Streuung der Tonhöhe in Halbtönen. Keine Emotionsaussage.",
            "p10-to-p90 pitch spread in semitones. No emotion inference.",
            "st", "level", "neutral", False, "speech",
            min_audio_active_ratio=0.2),
    _metric("speech.speaking_ratio", "Sprechzeitanteil", "Speaking-time share",
            "Anteil aktiver Sprache an der Aufnahme. Stille kann bewusstes Mittel sein.",
            "Share of active speech in the recording. Silence can be intentional.",
            "ratio", "ratio", "neutral", False, "speech",
            min_audio_active_ratio=0.2),
    _metric("speech.volume_event_share", "Lautstärkeabweichung", "Volume-event share",
            "Zeitanteil markierter Lautstärkeabweichungen. Nur gleiche Geräte vergleichen.",
            "Share of time with marked volume deviations. Compare only on the same device.",
            "ratio", "ratio", "neutral", False, "speech",
            min_audio_active_ratio=0.2, device_sensitive=True, min_effect=0.05),
    _metric("speech.repetition_rate_per_100_words", "Wiederholungen pro 100 Wörter",
            "Repetitions per 100 words",
            "Wiederholte Wörter, getrennt von Füllwörtern. ASR-Qualität ist ungeprüft.",
            "Repeated words, separate from fillers. ASR quality is unverified.",
            "per100w", "rate", "decrease", False, "asr",
            min_word_count=50),
    _metric("pose.trunk_lean_peak_deg", "Maximale Rumpfabweichung", "Peak trunk lean",
            "Größte markierte Rumpfabweichung. Schwellenwertzensiert, kein p95.",
            "Largest marked trunk deviation. Threshold-censored, not a p95.",
            "deg", "angle", "decrease", False, "pose",
            min_pose_coverage=0.6, min_pose_valid_ratio=0.8, min_effect=5.0),
    _metric("pose.arms_crossed_share", "Arme verschränkt", "Arms-crossed share",
            "Zeitanteil mit verschränkten Armen. Keine Aussage über Abwehr oder Emotion.",
            "Share of time with crossed arms. No inference about defensiveness or emotion.",
            "ratio", "ratio", "decrease", False, "pose",
            min_pose_coverage=0.6, min_pose_valid_ratio=0.8, min_effect=0.05),
    _metric("content.supported_rate", "Belegte Aussagenquote", "Supported-claim rate",
            "Anteil geprüfter Aussagen mit einem geprüften Quellenzitat.",
            "Share of checked claims with a verified source quote.",
            "ratio", "ratio", "increase", False, "factcheck",
            min_word_count=50, min_claim_count=3, min_effect=0.05),
    _metric("content.not_found_rate", "Nicht gefundene Aussagenquote",
            "Not-found-claim rate",
            "Anteil geprüfter Aussagen ohne Fundstelle. 'Nicht gefunden' ist nicht 'falsch'.",
            "Share of checked claims without a source. 'Not found' does not mean false.",
            "ratio", "ratio", "neutral", False, "factcheck",
            min_word_count=50, min_claim_count=3, min_effect=0.05),
]

ALL = PRIMARY + EXPLORATORY
BY_ID = {item.metric_id: item for item in ALL}
PRIMARY_IDS = tuple(item.metric_id for item in PRIMARY)
EXPLORATORY_IDS = tuple(item.metric_id for item in EXPLORATORY)

METRIC_VERSION = 1
COMPUTATION_VERSION = "metrics-1"
ALGORITHM_VERSION = "progress-stats-1"
QUALITY_VERSION = "quality-1"
