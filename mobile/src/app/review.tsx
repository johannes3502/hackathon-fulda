import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Action, Columns, Copy, Page, Panel, time } from "../ui";
import { shareFile, useSessions, type Take } from "../session";
import { analyzeTake, analyzeTranscript } from "../api";
export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { takes } = useSessions();
  const take = takes.find((t) => t.id === id);
  return take ? (
    <TakeReview take={take} />
  ) : (
    <Page>
      <Copy title>This take is no longer available.</Copy>
      <Action label="Back to home" onPress={() => router.replace("/")} />
    </Page>
  );
}
function TakeReview({ take }: { take: Take }) {
  const { save, remove } = useSessions();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const clipEnd = useRef<number | null>(null);
  const player = useVideoPlayer(take.uri, (p) => {
    p.timeUpdateEventInterval = 0.1;
  });
  useEffect(() => {
    const sub = player.addListener("timeUpdate", (e) => {
      if (clipEnd.current !== null && e.currentTime >= clipEnd.current) {
        player.pause();
        clipEnd.current = null;
      }
    });
    return () => {
      sub.remove();
      controller.current?.abort();
    };
  }, [player]);
  async function share(uri: string) {
    try {
      await shareFile(uri);
    } catch (e) {
      setError(String(e));
    }
  }
  async function analyze(words = false) {
    if (controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError("");
    try {
      let result;
      if (words) {
        setStatus("Choose word timestamps…");
        const file = await DocumentPicker.getDocumentAsync({
          type: ["application/json", "text/plain"],
          copyToCacheDirectory: true,
        });
        if (file.canceled) return;
        const source = new File(file.assets[0].uri);
        if (source.size > 5 * 1024 * 1024)
          throw new Error("Choose a JSON file smaller than 5 MB.");
        setStatus("Analyzing word timestamps…");
        result = await analyzeTranscript(
          take.endpoint,
          await source.text(),
          take.durationMs,
          active.signal,
        );
      } else
        result = await analyzeTake(
          take.endpoint,
          take.uri,
          take.durationMs,
          active.signal,
          setStatus,
        );
      const prefix = words ? "words-" : "speech-";
      save({
        ...take,
        feedback: [
          ...take.feedback.filter((f) => !f.id.startsWith(prefix)),
          ...result.feedback,
        ].sort((a, b) => a.startMs - b.startMs),
        metrics: [
          ...take.metrics.filter((m) => !m.id.startsWith(prefix)),
          ...result.metrics,
        ],
      });
      setStatus("Analysis complete.");
    } catch (e) {
      setError(
        active.signal.aborted
          ? "Analysis request cancelled. An already queued backend job may still finish."
          : e instanceof Error
            ? e.message
            : "Analysis failed.",
      );
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }
  return (
    <Page>
      <Copy title>{take.title}</Copy>
      <Copy muted>
        {time(take.durationMs)} · Local recording · {take.poseCount} pose
        samples
      </Copy>
      {take.notice && <Copy accessibilityRole="alert">{take.notice}</Copy>}
      <Columns
        main={
          <>
            <VideoView
              player={player}
              style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
              nativeControls
              fullscreenOptions={{ enable: true }}
            />
            <Panel>
              <Copy title>Timestamp review</Copy>
              {take.feedback.length === 0 ? (
                <Copy muted>
                  No analysis events yet. Your original recording is available
                  above.
                </Copy>
              ) : (
                take.feedback.map((f) => (
                  <Panel key={f.id}>
                    <Action
                      secondary
                      label={`${time(f.startMs)} · ${f.title}`}
                      onPress={() => {
                        player.pause();
                        player.currentTime = Math.max(0, f.startMs / 1000 - 2);
                        clipEnd.current = Math.min(
                          take.durationMs / 1000,
                          f.endMs / 1000 + 2,
                        );
                        player.play();
                      }}
                    />
                    <Copy>{f.detail}</Copy>
                    <Copy muted>{f.action}</Copy>
                  </Panel>
                ))
              )}
            </Panel>
          </>
        }
        side={
          <>
            <Panel>
              <Copy title>Keep or share</Copy>
              <Copy muted>
                These files are temporary. Share them before closing the app;
                the session list is kept only while the app is open.
              </Copy>
              <Action
                secondary
                label="Share recording"
                onPress={() => void share(take.uri)}
              />
              {take.poseUri && (
                <Action
                  secondary
                  label="Share pose JSONL"
                  onPress={() => void share(take.poseUri!)}
                />
              )}
              <Copy muted>
                Native pose times start at the recording request. Camera startup
                can introduce an offset; exact video alignment is not yet
                verified.
              </Copy>
            </Panel>
            {take.mode === "backend" && (
              <Panel>
                <Copy title>Backend analysis</Copy>
                <Copy muted>
                  Uploading sends the full recording to {take.endpoint}. Audio
                  signal analysis does not request automatic transcription.
                </Copy>
                <Action
                  label="Upload & analyze audio"
                  disabled={busy}
                  onPress={() => void analyze()}
                />
                <Action
                  secondary
                  label="Import word timestamps (JSON)"
                  disabled={busy}
                  onPress={() => void analyze(true)}
                />
                {busy && (
                  <Action
                    secondary
                    label="Cancel request"
                    onPress={() => controller.current?.abort()}
                  />
                )}
                <Copy accessibilityLiveRegion="polite">{status}</Copy>
              </Panel>
            )}
            {take.metrics.length > 0 && (
              <Panel>
                <Copy title>Measured audio & words</Copy>
                {take.metrics.map((m) => (
                  <Copy key={m.id}>
                    {m.label}: {m.value ?? "Unavailable"} {m.unit}
                  </Copy>
                ))}
              </Panel>
            )}
            {error && <Copy accessibilityRole="alert">{error}</Copy>}
            <Action
              secondary
              label="Sample questions (scripted)"
              onPress={() => router.push("/demo")}
            />
            <Action
              destructive
              label="Delete this local take"
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Delete local recording?",
                  "This removes the video and pose log from this device.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        try {
                          remove(take.id);
                          router.replace("/");
                        } catch (e) {
                          setError(`Could not delete all files: ${String(e)}`);
                        }
                      },
                    },
                  ],
                )
              }
            />
          </>
        }
      />
    </Page>
  );
}
