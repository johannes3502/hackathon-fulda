import { router } from "expo-router";
import { Action, Copy, Page, Panel, time } from "../ui";
import { useSessions } from "../session";
export default function Home() {
  const { takes } = useSessions();
  return (
    <Page>
      <Copy title>Practice. Rewatch. Try again.</Copy>
      <Copy muted>
        Record a presentation, capture pose landmarks on your device, and
        revisit specific moments.
      </Copy>
      <Action
        label="Record a presentation"
        onPress={() => router.push("/studio")}
      />
      <Action
        secondary
        label="Try the sample rehearsal"
        onPress={() => router.push("/demo")}
      />
      <Panel>
        <Copy title>Start with the sample</Copy>
        <Copy>
          Explore a transcript, evidence and follow-up questions without a
          camera or backend. All sample feedback is scripted.
        </Copy>
      </Panel>
      <Copy title>Your takes in this session</Copy>
      {takes.length ? (
        takes.map((t) => (
          <Panel key={t.id}>
            <Copy title>{t.title}</Copy>
            <Copy muted>
              {time(t.durationMs)} · {t.poseCount} pose samples ·{" "}
              {t.feedback.length} feedback moments
            </Copy>
            <Action
              secondary
              label={`Review ${t.title}`}
              onPress={() =>
                router.push({ pathname: "/review", params: { id: t.id } })
              }
            />
          </Panel>
        ))
      ) : (
        <Copy muted>
          No takes yet. Recordings stay in the app cache; share them before
          closing the app. Nothing is uploaded unless you choose backend
          analysis.
        </Copy>
      )}
    </Page>
  );
}
