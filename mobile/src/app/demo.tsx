import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { NativePractice } from "../practice";
import { useSessions } from "../session";
import { currentObservation } from "../../../frontend/src/features/coach/reducer";
import { randomUUID } from "expo-crypto";
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
import { MockCoachGateway } from "../../../frontend/src/features/coach/mock/MockCoachGateway";
import { defaults } from "../../../frontend/src/features/coach/mock/fixtures/scenario";
import type {
  CoachCommand,
  DemoCommand,
  SessionState,
} from "../../../frontend/src/features/coach/contracts";
export default function Demo() {
  const { custom } = useLocalSearchParams<{ custom?: string }>();
  const { practice } = useSessions();
  const [config] = useState(() =>
    custom === "1"
      ? practice
      : { ...defaults, criteria: [...defaults.criteria] },
  );
  const [state, setState] = useState<SessionState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [category, setCategory] = useState("all");
  const owner = useRef<NativePractice | null>(null);
  useEffect(() => {
    let active = true;
    const session = new NativePractice(
      new MockCoachGateway(undefined, randomUUID),
      (state) => {
        if (active) setState(state);
      },
    );
    owner.current = session;
    void session.start(config).catch((e) => {
      if (active) setError(String(e));
    });
    return () => {
      active = false;
      session.dispose();
      owner.current = null;
    };
  }, [config]);
  async function send(command: CoachCommand | DemoCommand, speed?: number) {
    if (!owner.current || busy) return;
    setBusy(true);
    setError("");
    try {
      await owner.current.send(command, speed);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function retry(id: string) {
    if (!owner.current || busy) return;
    setBusy(true);
    setError("");
    setEvidence("");
    setCategory("all");
    try {
      await owner.current.retry(id);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const colors = useColors();
  const report = state?.completedReports.find(
    (report) => report.ref.attemptId === state.ref.attemptId,
  );
  const restart = () => {
    setEvidence("");
    void send("reset");
  };
  return (
    <>
      <Page>
        <View style={{ gap: 6 }}>
          <Copy style={{ fontWeight: "600" }}>Scripted Sample</Copy>
          <Copy caption muted>
            Explore transcript, feedback, and questions. This is not an analysis
            of your recording.
          </Copy>
        </View>
        {!!error && (
          <Copy accessibilityRole="alert" style={{ color: colors.error }}>
            {error}
          </Copy>
        )}
        {!state ? (
          <Copy>Loading sample…</Copy>
        ) : (
          <Columns
            sideFirst
            main={
              <>
                <View style={{ gap: 6 }}>
                  <Copy title>{state.config.title}</Copy>
                  <Copy caption muted>
                    {state.phase.replaceAll("_", " ")} ·{" "}
                    {time(state.presentationMs)}
                  </Copy>
                </View>
                {state.activeCue && state.config.mode === "coach" && (
                  <Section title="Live hint">
                    <Copy>{state.activeCue.message}</Copy>
                  </Section>
                )}
                <Section title="Transcript">
                  {state.transcript.length === 0 ? (
                    <Copy muted>
                      Start the sample to follow its transcript.
                    </Copy>
                  ) : (
                    state.transcript.map((s, index) => (
                      <View key={s.id} style={{ gap: 8 }}>
                        {index > 0 && <Divider />}
                        <Copy
                          caption
                          muted
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {time(s.startMs)} · {s.speaker}
                        </Copy>
                        <Copy>{s.text}</Copy>
                      </View>
                    ))
                  )}
                </Section>
                {state.retryTarget && (
                  <Section title="Focused retry">
                    <Copy>{state.retryTarget.finding.nextAction}</Copy>
                    <Copy caption muted>
                      30-second sample answer retry
                    </Copy>
                  </Section>
                )}
                {report && (
                  <>
                    <Copy caption muted>
                      {report.completion === "partial"
                        ? "Partial report — only completed sample evidence is included."
                        : "Complete sample report"}
                    </Copy>
                    {report.comparison && (
                      <Section
                        title="Focused retry comparison"
                        footer="Comparison of selected sample text, not measured improvement in your ability."
                      >
                        <Copy>{report.comparison.criterion}</Copy>
                        <Copy caption muted>
                          Before
                        </Copy>
                        <Copy>{report.comparison.before}</Copy>
                        <Copy caption muted>
                          After
                        </Copy>
                        <Copy>{report.comparison.after}</Copy>
                        <Copy>
                          {report.comparison.result.replaceAll("_", " ")}
                        </Copy>
                      </Section>
                    )}
                    <Section title="What worked">
                      {report.strengths.map((s) => (
                        <Copy key={s}>{s}</Copy>
                      ))}
                    </Section>
                    <Section
                      title="Places to revisit"
                      footer="Feedback and source excerpts in this sample are scripted."
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {["all", "delivery", "content", "qa"].map((name) => (
                          <Action
                            key={name}
                            secondary={category !== name}
                            label={name === "qa" ? "Q&A" : name}
                            onPress={() => setCategory(name)}
                          />
                        ))}
                      </View>
                      {!report.findings.some(
                        (f) => category === "all" || f.category === category,
                      ) && <Copy muted>No findings in this category.</Copy>}
                      {report.findings
                        .filter(
                          (f) => category === "all" || f.category === category,
                        )
                        .map((f, index) => (
                          <View key={f.id} style={{ gap: 10 }}>
                            {index > 0 && <Divider />}
                            <Copy style={{ fontWeight: "600" }}>{f.title}</Copy>
                            <Copy>{f.observation}</Copy>
                            {f.retryable && (
                              <Action
                                secondary
                                label="Practice This Moment"
                                icon="arrow.counterclockwise"
                                disabled={busy}
                                onPress={() => void retry(f.id)}
                              />
                            )}
                            <Copy caption muted>
                              {f.nextAction}
                            </Copy>
                            <Action
                              secondary
                              icon="text.quote"
                              label={`View Excerpt · ${time(f.evidence.startMs)}`}
                              onPress={() =>
                                setEvidence(
                                  f.evidence.quote ??
                                    report.transcript
                                      .filter((t) =>
                                        f.evidence.segmentIds.includes(t.id),
                                      )
                                      .map((t) => t.text)
                                      .join(" "),
                                )
                              }
                            />
                          </View>
                        ))}
                    </Section>
                    {!!evidence && (
                      <Section title="Transcript excerpt">
                        <Copy>{evidence}</Copy>
                      </Section>
                    )}
                  </>
                )}
              </>
            }
            side={
              <>
                <Section
                  title="Sample playback"
                  footer="Advance through this prepared rehearsal at your own pace."
                >
                  {state.phase === "preflight" ? (
                    <Action
                      label="Start Sample"
                      icon="play.fill"
                      disabled={busy}
                      onPress={() => void send({ type: "start" })}
                    />
                  ) : state.phase === "review" ? (
                    <Action
                      label="Play Again"
                      icon="arrow.counterclockwise"
                      disabled={busy}
                      onPress={restart}
                    />
                  ) : (
                    <Action
                      label="Next Moment"
                      icon="forward.end.fill"
                      disabled={busy}
                      onPress={() => void send("next")}
                    />
                  )}
                  {!["preflight", "review"].includes(state.phase) && (
                    <>
                      <Action
                        secondary
                        label={state.isPaused ? "Resume" : "Pause"}
                        icon={state.isPaused ? "play" : "pause"}
                        disabled={busy}
                        onPress={() =>
                          void send({
                            type: state.isPaused ? "resume" : "pause",
                          })
                        }
                      />
                      {state.phase === "presenting" && (
                        <Action
                          secondary
                          label="End Pitch"
                          disabled={busy || state.isPaused}
                          onPress={() => void send({ type: "finish_pitch" })}
                        />
                      )}
                      {["judge_question", "answering"].includes(
                        state.phase,
                      ) && (
                        <Action
                          secondary
                          label="Finish Questions"
                          disabled={busy || state.isPaused}
                          onPress={() => void send({ type: "finish_qa" })}
                        />
                      )}
                    </>
                  )}
                  {state.connection === "interrupted" && (
                    <Action
                      label="Recover Sample Connection"
                      onPress={() => void send("recover")}
                      disabled={busy}
                    />
                  )}
                  {state.isPaused && (
                    <Copy caption muted>
                      Sample paused
                    </Copy>
                  )}
                  {Platform.OS !== "ios" && state.phase !== "preflight" && (
                    <>
                      <Action
                        secondary
                        label="Sample Questions"
                        disabled={busy || state.phase === "review"}
                        onPress={() => void send("qa")}
                      />
                      <Action
                        secondary
                        label="Sample Report"
                        disabled={busy || state.phase === "review"}
                        onPress={() => void send("review")}
                      />
                      <Action
                        secondary
                        label="Restart Sample"
                        disabled={busy}
                        onPress={restart}
                      />
                    </>
                  )}
                </Section>
                <Section title="Session context">
                  <Copy>{state.config.context}</Copy>
                  <Copy caption muted>
                    {state.config.audience} · {state.config.mode} ·{" "}
                    {state.config.targetDurationMs / 60000} minutes
                  </Copy>
                  <Copy caption muted>
                    {state.config.criteria.join(" · ") || "General rehearsal"}
                  </Copy>
                </Section>
                {state.config.mode === "coach" && (
                  <Section
                    title="Sample observations"
                    footer="Scripted scenario values. Not measurements from your camera or microphone."
                  >
                    {(
                      [
                        "paceWpm",
                        "fillerCount",
                        "posture",
                        "gestures",
                        "vocalVariation",
                      ] as const
                    ).map((key) => {
                      const observation = currentObservation(state, key);
                      const labels = {
                        paceWpm: "Speaking pace",
                        fillerCount: "Filler words",
                        posture: "Posture",
                        gestures: "Gestures",
                        vocalVariation: "Vocal variation",
                      };
                      return (
                        <View key={key} style={{ gap: 4 }}>
                          <Copy>
                            {labels[key]}:{" "}
                            {observation.value === null
                              ? "Not enough data"
                              : String(observation.value).replaceAll("_", " ")}
                            {key === "paceWpm" && observation.value !== null
                              ? " wpm"
                              : ""}
                          </Copy>
                          {observation.reason && (
                            <Copy caption muted>
                              {observation.reason}
                            </Copy>
                          )}
                        </View>
                      );
                    })}
                    <Copy caption muted>
                      Covered:{" "}
                      {state.coverage.join(" · ") || "No sample points yet"}
                    </Copy>
                  </Section>
                )}
                {state.completedReports.filter(
                  (r) => r.ref.attemptId !== state.ref.attemptId,
                ).length > 0 && (
                  <Section title="Earlier sample reports">
                    {state.completedReports
                      .filter((r) => r.ref.attemptId !== state.ref.attemptId)
                      .map((r) => (
                        <View key={r.ref.attemptId} style={{ gap: 8 }}>
                          <Copy>
                            {r.ref.attemptId} · {r.completion} ·{" "}
                            {time(r.durationMs)}
                          </Copy>
                          {r.findings.map((f) => (
                            <Copy caption muted key={f.id}>
                              {f.title}: {f.evidence.quote}
                            </Copy>
                          ))}
                        </View>
                      ))}
                  </Section>
                )}
                {state.question && state.phase !== "review" && (
                  <Section
                    title="Practice question"
                    footer="Choose a prepared answer to explore the sample response."
                  >
                    <Copy>{state.question.text}</Copy>
                    {state.question.evidence.quote && (
                      <Copy caption muted>
                        From the transcript: “{state.question.evidence.quote}”
                      </Copy>
                    )}
                    {state.phase === "judge_question" && (
                      <Action
                        label="Choose an Answer"
                        disabled={busy}
                        onPress={() =>
                          void send({
                            type: "start_answer",
                            turnId: state.question!.turnId,
                          })
                        }
                      />
                    )}
                    {state.phase === "answering" &&
                      state.answerChoices.map((a) => (
                        <Action
                          key={a.id}
                          secondary
                          label={a.text}
                          disabled={busy}
                          onPress={() =>
                            void send({
                              type: "submit_answer",
                              turnId: state.question!.turnId,
                              text: a.text,
                            })
                          }
                        />
                      ))}
                  </Section>
                )}
              </>
            }
          />
        )}
      </Page>
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            icon="ellipsis"
            accessibilityLabel="Sample options"
          >
            <Stack.Toolbar.MenuAction
              icon="text.bubble"
              disabled={
                !state ||
                busy ||
                state.phase === "preflight" ||
                state.phase === "review"
              }
              onPress={() => void send("qa")}
            >
              Sample Questions
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="doc.text"
              disabled={
                !state ||
                busy ||
                state.phase === "preflight" ||
                state.phase === "review"
              }
              onPress={() => void send("review")}
            >
              Sample Report
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              disabled={!state || busy}
              onPress={() => void send("speed", 4)}
            >
              Play at 4×
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              disabled={!state || busy}
              onPress={() => void send("speed", 1)}
            >
              Play at Normal Speed
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              disabled={!state || busy}
              onPress={() => void send("interrupt")}
            >
              Simulate Interruption
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              disabled={!state || busy}
              onPress={() => void send("fail")}
            >
              Simulate Failed Request
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="arrow.counterclockwise"
              disabled={!state || busy}
              onPress={restart}
            >
              Restart Sample
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
    </>
  );
}
