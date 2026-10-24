import { router } from "expo-router";
import { Action, Copy, Page, Section, time } from "../ui";
import { useSessions } from "../session";
export default function Library() {
  const { takes } = useSessions();
  return (
    <Page>
      <Section title="Prepare">
        <Action
          secondary
          label="Practice Setup"
          onPress={() => router.push("/setup")}
        />
        <Action
          secondary
          label="Source Library"
          onPress={() => router.push("/sources")}
        />
      </Section>
      <Action label="New recording" onPress={() => router.push("/studio")} />
      <Section
        title="Your recordings"
        footer="Recordings are temporary. Share before closing the app."
      >
        {takes.length ? (
          takes.map((t) => (
            <Action
              key={t.id}
              secondary
              label={`${t.title} · ${time(t.durationMs)}`}
              onPress={() =>
                router.push({ pathname: "/review", params: { id: t.id } })
              }
            />
          ))
        ) : (
          <Copy muted>
            Capture a rehearsal, then revisit the moments that matter.
          </Copy>
        )}
      </Section>
      <Section
        title="Explore"
        footer="A scripted example. No camera or upload needed."
      >
        <Action
          secondary
          label="Sample rehearsal"
          onPress={() => router.push("/demo")}
        />
      </Section>
    </Page>
  );
}
