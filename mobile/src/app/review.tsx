import { useEffect, useRef, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  Action,
  Columns,
  Copy,
  Page,
  Section,
  Divider,
  time,
  useColors,
} from "../ui";
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
  const colors = useColors();
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
  function deleteTake() {
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
    );
  }
  return (
    <>
      <Page>
        <View style={{ gap: 6 }}>
          <Copy title>{take.title}</Copy>
          <Copy caption muted>
            {time(take.durationMs)} · On this device · {take.poseCount} pose
            samples
          </Copy>
        </View>
        {take.notice && <Copy accessibilityRole="alert">{take.notice}</Copy>}
        <Columns
          main={
            <>
              <VideoView
                player={player}
                style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 20 }}
                nativeControls
                fullscreenOptions={{ enable: true }}
              />
              <Section
                title="Moments"
                footer="Tap a timestamp to play the surrounding part of your recording."
              >
                {take.feedback.length === 0 ? (
                  <Copy muted>
                    No moments yet. Analyze your recording to find places to
                    revisit.
                  </Copy>
                ) : (
                  take.feedback.map((f, index) => (
                    <View key={f.id} style={{ gap: 10 }}>
                      {index > 0 && <Divider />}
                      <Copy style={{ fontWeight: "600" }}>{f.title}</Copy>
                      <Copy>{f.detail}</Copy>
                      <Copy caption muted>
                        {f.action}
                      </Copy>
                      <Action
                        secondary
                        icon="play.fill"
                        label={time(f.startMs)}
                        onPress={() => {
                          player.pause();
                          player.currentTime = Math.max(
                            0,
                            f.startMs / 1000 - 2,
                          );
                          clipEnd.current = Math.min(
                            take.durationMs / 1000,
                            f.endMs / 1000 + 2,
                          );
                          player.play();
                        }}
                      />
                    </View>
                  ))
                )}
              </Section>
            </>
          }
          side={
            <>
              {take.mode === "backend" && (
                <Section
                  title="Analysis"
                  footer={`The full video and audio will be uploaded to ${take.endpoint}. Automatic transcription is off.`}
                >
                  <Action
                    label="Upload & Analyze"
                    icon="waveform"
                    disabled={busy}
                    onPress={() => void analyze()}
                  />
                  <Action
                    secondary
                    label="Import Word Timestamps"
                    icon="doc.badge.plus"
                    disabled={busy}
                    onPress={() => void analyze(true)}
                  />
                  {busy && (
                    <Action
                      secondary
                      label="Cancel Request"
                      onPress={() => controller.current?.abort()}
                    />
                  )}
                  {!!status && (
                    <Copy caption muted accessibilityLiveRegion="polite">
                      {status}
                    </Copy>
                  )}
                </Section>
              )}
              {take.metrics.length > 0 && (
                <Section
                  title="Audio & words"
                  footer="Measured values, without a performance score."
                >
                  {take.metrics.map((m, index) => (
                    <View key={m.id} style={{ gap: 12 }}>
                      {index > 0 && <Divider />}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Copy>{m.label}</Copy>
                        <Copy muted style={{ fontVariant: ["tabular-nums"] }}>
                          {m.value ?? "Unavailable"} {m.unit}
                        </Copy>
                      </View>
                    </View>
                  ))}
                </Section>
              )}
              {!!error && (
                <Copy accessibilityRole="alert" style={{ color: colors.error }}>
                  {error}
                </Copy>
              )}
              <Section
                title="Keep your recording"
                footer="The recording list lasts only while the app is open. Share your files before closing it."
              >
                <Action
                  secondary
                  label="Share Recording"
                  icon="square.and.arrow.up"
                  onPress={() => void share(take.uri)}
                />
                {take.poseUri && (
                  <Action
                    secondary
                    label="Share Pose Data"
                    icon="figure.stand"
                    onPress={() => void share(take.poseUri!)}
                  />
                )}
              </Section>
              {take.poseCount > 0 && (
                <Copy caption muted>
                  Pose timing starts at the recording request. Camera startup
                  may introduce an offset; exact alignment is not yet verified.
                </Copy>
              )}
              <Action
                secondary
                label="Explore Sample Questions"
                icon="text.bubble"
                onPress={() => router.push("/demo")}
              />
              {Platform.OS !== "ios" && (
                <Action
                  destructive
                  label="Delete Recording"
                  disabled={busy}
                  onPress={deleteTake}
                />
              )}
            </>
          }
        />
      </Page>
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            icon="ellipsis"
            accessibilityLabel="Recording actions"
          >
            <Stack.Toolbar.MenuAction
              icon="square.and.arrow.up"
              onPress={() => void share(take.uri)}
            >
              Share Recording
            </Stack.Toolbar.MenuAction>
            {take.poseUri && (
              <Stack.Toolbar.MenuAction
                icon="figure.stand"
                onPress={() => void share(take.poseUri!)}
              >
                Share Pose Data
              </Stack.Toolbar.MenuAction>
            )}
            <Stack.Toolbar.MenuAction
              icon="trash"
              destructive
              disabled={busy}
              onPress={deleteTake}
            >
              Delete Recording
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
    </>
  );
}
