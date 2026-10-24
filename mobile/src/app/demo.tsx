import { useEffect, useState } from "react";
import { randomUUID } from "expo-crypto";
import { Action, Columns, Copy, Page, Panel, time } from "../ui";
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
  const report = state?.completedReports.at(-1);
  return (
    <Page>
      <Panel>
        <Copy title>Synthetic sample rehearsal</Copy>
        <Copy>
          This deterministic example reuses the web demo. Transcription,
          questions and feedback here are scripted, not an analysis of your
          recording.
        </Copy>
      </Panel>
      {error && <Copy accessibilityRole="alert">{error}</Copy>}
      {!state ? (
        <Copy>Loading sample…</Copy>
      ) : (
        <Columns
          main={
            <>
              <Copy title>{state.config.title}</Copy>
              <Copy muted>
                {state.phase.replaceAll("_", " ")} ·{" "}
                {time(state.presentationMs)}
              </Copy>
              {state.activeCue && (
                <Panel>
                  <Copy>{state.activeCue.message}</Copy>
                </Panel>
              )}
              <Panel>
                <Copy title>Transcript</Copy>
                {state.transcript.length === 0 ? (
                  <Copy muted>Start the sample to follow its transcript.</Copy>
                ) : (
                  state.transcript.map((s) => (
                    <Copy key={s.id}>
                      {time(s.startMs)} · {s.speaker}: {s.text}
                    </Copy>
                  ))
                )}
              </Panel>
              {report && (
                <Panel>
                  <Copy title>Sample feedback</Copy>
                  {report.strengths.map((s) => (
                    <Copy key={s}>{s}</Copy>
                  ))}
                  {report.findings.map((f) => (
                    <Panel key={f.id}>
                      <Action
                        secondary
                        label={`${time(f.evidence.startMs)} · ${f.title}`}
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
                      <Copy>{f.observation}</Copy>
                      <Copy muted>{f.nextAction}</Copy>
                    </Panel>
                  ))}
                  {evidence && <Copy>Transcript evidence: {evidence}</Copy>}
                </Panel>
              )}
            </>
          }
          side={
            <>
              <Panel>
                <Copy title>Sample controls</Copy>
                {state.phase === "preflight" ? (
                  <Action
                    label="Start sample"
                    disabled={busy}
                    onPress={() => void send({ type: "start" })}
                  />
                ) : (
                  <>
                    <Action
                      label="Next sample moment"
                      disabled={busy || state.phase === "review"}
                      onPress={() => void send("next")}
                    />
                    <Action
                      secondary
                      label="Show sample questions"
                      disabled={busy || state.phase === "review"}
                      onPress={() => void send("qa")}
                    />
                    <Action
                      secondary
                      label="Show sample report"
                      disabled={busy || state.phase === "review"}
                      onPress={() => void send("review")}
                    />
                    <Action
                      secondary
                      label="Restart sample"
                      disabled={busy}
                      onPress={() => {
                        setEvidence("");
                        void send("reset");
                      }}
                    />
                  </>
                )}
              </Panel>
              {state.question && state.phase !== "review" && (
                <Panel>
                  <Copy title>Question simulator</Copy>
                  <Copy>{state.question.text}</Copy>
                  {state.phase === "judge_question" && (
                    <Action
                      label="Choose a sample answer"
                      disabled={busy}
                      onPress={() =>
                        void send({
                          type: "start_answer",
                          turnId: state.question!.turnId,
                        })
                      }
                    />
                  )}{" "}
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
                </Panel>
              )}
            </>
          }
        />
      )}
    </Page>
  );
}
