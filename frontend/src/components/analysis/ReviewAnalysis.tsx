"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { STAT_LABELS } from "@/components/stats/stats";
import { PerformanceGraph } from "./PerformanceGraph";
import { ReviewScores } from "@/components/live/ReviewScores";
import { reviewScores } from "@/features/live/review-scores";
import {
  boundedTime,
  timestamp,
  type Criterion,
  type ReviewData,
  type ReviewMoment,
} from "./review-data";
import "./review-analysis.css";
import "../live/review-accessibility.css";

const kindLabels = {
  positive: "Gelungen",
  attention: "Hier weiterüben",
  note: "Anmerkung",
};
const videoErrorMessage =
  "Das Video konnte nicht geladen werden. Du kannst die Anmerkungen weiterhin ansehen.";

export function ReviewAnalysis({
  data,
  backHref = "/",
  backLabel = "Zur Startseite",
  capture = false,
}: {
  data: ReviewData;
  backHref?: string;
  backLabel?: string;
  capture?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const segment = useRef<{ start: number; end: number } | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    data.moments[0]?.id,
  );
  const [criterion, setCriterion] = useState<Criterion | null>(null);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const moments = [...data.moments].sort((a, b) => a.tMs - b.tMs);
  const visible = moments.filter(
    (item) => criterion === null || item.criterion === criterion,
  );
  const selected = moments.find((item) => item.id === selectedId);
  const selectedIndex = visible.findIndex((item) => item.id === selectedId);
  const scores = reviewScores(moments, data.durationMs, data.claims);

  useEffect(() => {
    // Preloaded media can finish or fail before hydration attaches its handlers.
    const frame = requestAnimationFrame(() => {
      if (video.current?.error) setError(videoErrorMessage);
      else if (video.current && video.current.readyState >= 1)
        setMediaReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [data.videoUrl]);

  function seek(tMs: number) {
    const player = video.current;
    segment.current = null;
    const target = boundedTime(tMs, data.durationMs);
    if (!player || player.readyState < 1) {
      pendingSeek.current = target;
      return;
    }
    const maximum = Number.isFinite(player.duration)
      ? player.duration * 1000
      : data.durationMs;
    player.currentTime = boundedTime(target, maximum) / 1000;
    setPositionMs(player.currentTime * 1000);
  }

  function select(moment: ReviewMoment) {
    setSelectedId(moment.id);
    seek(moment.tMs);
  }

  function playSection() {
    if (!selected || !video.current) return;
    const start = Math.max(0, selected.tMs - 2000);
    const end = Math.min(
      data.durationMs,
      selected.tMs + selected.durationMs + 2000,
    );
    seek(start);
    segment.current = { start: start / 1000, end: end / 1000 };
    setError(null);
    void video.current
      .play()
      .catch(() =>
        setError("Bitte starte das Video über die Wiedergabesteuerung."),
      );
  }

  return (
    <AppShell experience={data.demo ? "sample" : "live"} journey={!capture}>
      <div className="review418-page" lang="de">
        <header className="review418-header">
          <Link href={backHref} className="review418-back">
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
          <span className="review418-mode">
            {data.demo ? "Synthetische Demo" : "Deine Aufnahme"}
          </span>
        </header>
        <div className="review418-workspace">
          <div className="review418-intro">
            <div>
              <h1>Deine Analyse</h1>
              <p>
                {data.title} <span>·</span> {timestamp(data.durationMs)} Minuten
              </p>
            </div>
            <div className="review418-summary">
              <span className="review418-summary-number">{moments.length}</span>
              <span>
                Momente
                <small>auf der Zeitachse</small>
              </span>
            </div>
          </div>
          <ReviewScores
            scores={scores}
            selected={criterion}
            demo={data.demo}
            recordingTitle={data.demo ? undefined : data.title}
            onSelect={(key) => setCriterion(criterion === key ? null : key)}
          />
          <div className="review418-context">
            <span>
              {data.notice ??
                (data.demo
                  ? "Demo: Video und Anmerkungen sind synthetisch. Die Zeitachse zeigt die Beispiel-Momente."
                  : "Scores beziehen sich auf bewertete Evidenz. Zeitmarken führen zu den vorhandenen Events.")}
            </span>
            <button
              type="button"
              onClick={() => setCriterion(null)}
              aria-pressed={criterion === null}
            >
              Alle Kriterien
            </button>
          </div>
          <div className="review418-layout">
            <div className="review418-main">
              <section
                className="review418-video-panel"
                aria-label="Präsentation ansehen"
              >
                <div className="review418-video-top">
                  <span>
                    <i />
                    {data.demo
                      ? "Beispiel-Präsentation · ohne Ton"
                      : "Deine Präsentation"}
                  </span>
                  <span>
                    {timestamp(positionMs)} / {timestamp(data.durationMs)}
                  </span>
                </div>
                <video
                  ref={video}
                  src={data.videoUrl}
                  poster={data.poster}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Präsentationsvideo"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onLoadedMetadata={() => {
                    setMediaReady(true);
                    if (pendingSeek.current !== null) {
                      const target = pendingSeek.current;
                      pendingSeek.current = null;
                      seek(target);
                    }
                  }}
                  onSeeked={(event) =>
                    setPositionMs(event.currentTarget.currentTime * 1000)
                  }
                  onTimeUpdate={(event) => {
                    const player = event.currentTarget;
                    setPositionMs(player.currentTime * 1000);
                    const range = segment.current;
                    if (range && player.currentTime >= range.end) {
                      if (loop) player.currentTime = range.start;
                      else {
                        player.pause();
                        segment.current = null;
                      }
                    }
                  }}
                  onEnded={(event) => {
                    setPlaying(false);
                    if (loop && segment.current) {
                      event.currentTarget.currentTime = segment.current.start;
                      void event.currentTarget
                        .play()
                        .catch(() =>
                          setError("Bitte starte die Wiedergabe erneut."),
                        );
                    }
                  }}
                  onError={() => {
                    setMediaReady(false);
                    setError(videoErrorMessage);
                  }}
                />
                {error && (
                  <p className="review418-error" role="status">
                    {error}
                  </p>
                )}
              </section>
              <PerformanceGraph
                durationMs={data.durationMs}
                moments={visible}
                positionMs={positionMs}
                selectedId={selectedId}
                onSeek={seek}
                onSelect={select}
                playing={playing}
                playbackDisabled={!mediaReady}
                onTogglePlayback={() => {
                  const player = video.current;
                  if (!player) return;
                  if (!player.paused) player.pause();
                  else {
                    setError(null);
                    void player
                      .play()
                      .catch(() =>
                        setError(
                          "Bitte starte das Video über die Wiedergabesteuerung.",
                        ),
                      );
                  }
                }}
              />
              <div className="review418-under-chart">
                <span>Ein Klick auf den Verlauf springt zur Videostelle.</span>
                <span>
                  {visible.length} {visible.length === 1 ? "Moment" : "Momente"}
                  {criterion
                    ? ` · ${STAT_LABELS[criterion]}`
                    : " · alle Kriterien"}
                </span>
              </div>
            </div>
            <aside
              className="review418-sidebar"
              aria-label="Anmerkungen und besondere Momente"
            >
              <section
                className={`review418-annotation ${selected?.kind ?? "note"}`}
                aria-label="Ausgewählte Anmerkung"
              >
                {selected ? (
                  <>
                    <div className="review418-annotation-top">
                      <span>{kindLabels[selected.kind]}</span>
                      <button
                        type="button"
                        className="review418-timestamp-button"
                        onClick={() => seek(selected.tMs)}
                      >
                        {timestamp(selected.tMs)}
                        <ArrowRight size={13} />
                      </button>
                    </div>
                    <span className="review418-annotation-criterion">
                      {selected.criterion
                        ? STAT_LABELS[selected.criterion]
                        : "Beobachtung"}
                    </span>
                    <h2>{selected.title}</h2>
                    <p>{selected.detail}</p>
                    {selected.quote && (
                      <blockquote>„{selected.quote}“</blockquote>
                    )}
                    {selected.source && (
                      <div className="review418-source">
                        <strong>
                          {selected.source.href ? (
                            <a
                              href={selected.source.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {selected.source.title} ↗
                            </a>
                          ) : (
                            selected.source.title
                          )}
                        </strong>
                        <p>„{selected.source.quote}“</p>
                      </div>
                    )}
                    <div className="review418-tip">
                      <span>Nächster Versuch</span>
                      <p>{selected.action}</p>
                    </div>
                    <button
                      type="button"
                      className="review418-play-section"
                      disabled={!mediaReady}
                      onClick={playSection}
                    >
                      <Play size={14} fill="currentColor" />
                      Stelle ansehen<span>± 2 s Kontext</span>
                    </button>
                    <label className="review418-loop">
                      <input
                        type="checkbox"
                        checked={loop}
                        onChange={(event) => setLoop(event.target.checked)}
                      />
                      <RotateCcw size={12} />
                      Ausschnitt wiederholen
                    </label>
                  </>
                ) : (
                  <>
                    <h2>Dein nächster Blick.</h2>
                    <p>
                      {moments.length
                        ? "Wähle einen Moment aus, um die Anmerkung zu lesen und die Stelle anzusehen."
                        : "Es liegen noch keine Anmerkungen vor. Du kannst deine Aufnahme trotzdem ansehen."}
                    </p>
                  </>
                )}
              </section>
              <section
                className="review418-moments"
                aria-label="Besondere Momente"
              >
                <div className="review418-moments-heading">
                  <h2>
                    Momente <span>{visible.length}</span>
                  </h2>
                  <div>
                    <button
                      type="button"
                      aria-label="Vorheriger Moment"
                      disabled={selectedIndex <= 0}
                      onClick={() => select(visible[selectedIndex - 1])}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Nächster Moment"
                      disabled={
                        !visible.length || selectedIndex >= visible.length - 1
                      }
                      onClick={() => select(visible[selectedIndex + 1])}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="review418-moment-list">
                  {visible.map((moment) => (
                    <button
                      type="button"
                      key={moment.id}
                      className={`review418-moment ${moment.kind} ${selectedId === moment.id ? "selected" : ""}`}
                      aria-pressed={selectedId === moment.id}
                      onClick={() => select(moment)}
                    >
                      <span className="review418-kind-icon" aria-hidden="true">
                        {moment.kind === "positive"
                          ? "✓"
                          : moment.kind === "attention"
                            ? "!"
                            : "i"}
                      </span>
                      <span>
                        <strong>{moment.title}</strong>
                        <small>
                          {moment.criterion
                            ? STAT_LABELS[moment.criterion]
                            : "Beobachtung"}{" "}
                          · {kindLabels[moment.kind]}
                        </small>
                      </span>
                      <time>{timestamp(moment.tMs)}</time>
                    </button>
                  ))}
                  {!visible.length && (
                    <p className="review418-empty">
                      Keine Momente für dieses Kriterium.
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
