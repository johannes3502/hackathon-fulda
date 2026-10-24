"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Play, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { clipRange } from "@/features/live/protocol";
import { playbackAnnotation, reviewMoments } from "@/features/live/review";
import { time } from "@/lib/utils";
export function VideoPlayback({
  recording,
  selected,
  onSelect,
}: {
  recording: LiveRecording;
  selected: LiveFeedback | null;
  onSelect: (feedback: LiveFeedback) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rangeRef = useRef<{ start: number; end: number } | null>(null);
  const [position, setPosition] = useState(0);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const annotation = playbackAnnotation(recording.feedback, position, selected);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!selected) {
      rangeRef.current = null;
      return;
    }
    const range = clipRange(selected, recording.durationMs);
    rangeRef.current = range;
    const seek = () => {
      video.currentTime = Math.min(
        range.start,
        Number.isFinite(video.duration) ? video.duration : range.start,
      );
      void video
        .play()
        .catch(() => setError("Press Play to start this section."));
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [selected, recording.durationMs]);
  const playSection = () => {
    if (!selected || !videoRef.current) return;
    const range = clipRange(selected, recording.durationMs);
    rangeRef.current = range;
    videoRef.current.currentTime = range.start;
    void videoRef.current
      .play()
      .catch(() =>
        setError("The video could not play. Try the native playback controls."),
      );
  };
  return (
    <section
      className="panel playback-panel"
      aria-label="Recorded video playback"
    >
      <div className="review-video-stage">
        <video
          ref={videoRef}
          src={recording.videoUrl}
          controls
          playsInline
          preload="metadata"
          aria-label="Recorded pitch video"
          onError={() =>
            setError(
              "This browser could not decode the recording. Download it to play in another player.",
            )
          }
          onEnded={(event) => {
            // Encoded media can end before the capture clock reaches the selected range's end.
            const range = rangeRef.current;
            if (range && loop) {
              event.currentTarget.currentTime = range.start;
              void event.currentTarget
                .play()
                .catch(() =>
                  setError("Press Replay section to continue playback."),
                );
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setPosition(video.currentTime * 1000);
            const range = rangeRef.current;
            if (range && video.currentTime >= range.end) {
              if (loop) {
                video.currentTime = range.start;
                void video.play().catch(() => {});
              } else {
                video.pause();
                rangeRef.current = null;
              }
            }
          }}
        />
        {annotation && (
          <div
            className={`playback-annotation ${annotation.kind}`}
            data-testid="playback-annotation"
          >
            <MessageSquare size={18} aria-hidden="true" />
            <span>{annotation.title}</span>
          </div>
        )}
      </div>
      <div className="playback-body">
        <div className="panel-title-row">
          <h2>
            {selected ? "Selected feedback section" : "Your full recording"}
          </h2>
          <span className="timestamp">
            {time(position)} / {time(recording.durationMs)}
          </span>
        </div>
        <div className="video-timeline" aria-label="Feedback timeline">
          {reviewMoments(recording.feedback).map((item) => (
            <button
              key={item.id}
              className={`timeline-marker ${item.kind} ${selected?.id === item.id ? "selected" : ""}`}
              style={{
                left: `${Math.min(98, (item.startMs / Math.max(recording.durationMs, 1)) * 100)}%`,
                width: `${Math.max(1.5, Math.min(100, ((item.endMs - item.startMs) / Math.max(recording.durationMs, 1)) * 100))}%`,
              }}
              aria-label={`Replay ${item.category}: ${item.title} at ${time(item.startMs)}`}
              aria-pressed={selected?.id === item.id}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
        <p className="field-hint">
          {selected
            ? `Replaying ${time(clipRange(selected, recording.durationMs).start * 1000)}–${time(clipRange(selected, recording.durationMs).end * 1000)} with up to 2 seconds of context on each side.`
            : recording.feedback.length
              ? "Choose a marker to watch the moment behind the feedback."
              : "No feedback markers were received for this recording."}
        </p>
        <div className="playback-controls">
          {selected && (
            <Button variant="outline" size="sm" onClick={playSection}>
              <RotateCcw size={15} /> Replay section
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              rangeRef.current = null;
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                void videoRef.current
                  .play()
                  .catch(() => setError("Press Play in the video controls."));
              }
            }}
          >
            <Play size={14} /> Play full recording
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a
              href={recording.videoUrl}
              download={`pitch-${recording.id}.${recording.mimeType.includes("mp4") ? "mp4" : "webm"}`}
            >
              <Download size={14} /> Download video
            </a>
          </Button>
        </div>
        {selected && (
          <label className="loop-control">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />{" "}
            Loop this section
          </label>
        )}
        {error && (
          <p role="status" className="field-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
