import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
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
  const [gateway] = useState(() => new MockCoachGateway(undefined, randomUUID));
  const [state, setState] = useState<SessionState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState("");
  useEffect(() => {
    let alive = true;
    let unsubscribe: undefined | (() => void);
    gateway
      .createSession({ ...defaults, criteria: [...defaults.criteria] })
      .then((session) => {
        if (!alive) return;
        setState(session);
        unsubscribe = gateway.subscribe(session.ref, () => {
          void gateway.getSession(session.ref.sessionId).then((next) => {
            if (alive) setState(next);
          });
        });
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [gateway]);
  async function send(command: CoachCommand | DemoCommand) {
    if (!state || busy) return;
    setBusy(true);
    setError("");
    try {
      if (typeof command === "string") await gateway.demo(state.ref, command);
      else await gateway.send(state.ref, command);
      setState(await gateway.getSession(state.ref.sessionId));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const colors = useColors();
  const report = state?.completedReports.at(-1);
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
                {state.activeCue && (
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
                {report && (
                  <>
                    <Section title="What worked">
                      {report.strengths.map((s) => (
                        <Copy key={s}>{s}</Copy>
                      ))}
                    </Section>
                    <Section
                      title="Places to revisit"
                      footer="Feedback and source excerpts in this sample are scripted."
                    >
                      {report.findings.map((f, index) => (
                        <View key={f.id} style={{ gap: 10 }}>
                          {index > 0 && <Divider />}
                          <Copy style={{ fontWeight: "600" }}>{f.title}</Copy>
                          <Copy>{f.observation}</Copy>
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
                {state.question && state.phase !== "review" && (
                  <Section
                    title="Practice question"
                    footer="Choose a prepared answer to explore the sample response."
                  >
                    <Copy>{state.question.text}</Copy>
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
