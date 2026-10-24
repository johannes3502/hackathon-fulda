import { Switch, View } from "react-native";
import { router } from "expo-router";
import { Action, Copy, Field, Page, Section } from "../ui";
import { useSessions } from "../session";
export default function Setup() {
  const { practice: config, setPractice } = useSessions();
  return (
    <Page>
      <Copy muted>
        Custom settings use the same scripted Viva scenario as the web app. No
        recording or generated analysis.
      </Copy>
      <Section title="Your rehearsal">
        <Field
          label="Title"
          value={config.title}
          maxLength={100}
          onChangeText={(title) => setPractice({ ...config, title })}
        />
        <Field
          label="Context"
          value={config.context}
          maxLength={2000}
          multiline
          onChangeText={(context) => setPractice({ ...config, context })}
        />
      </Section>
      <Section title="Audience">
        {(["hackathon", "investor", "examiner"] as const).map((audience) => (
          <Action
            key={audience}
            secondary={config.audience !== audience}
            label={audience}
            onPress={() => setPractice({ ...config, audience })}
          />
        ))}
      </Section>
      <Section title="Duration">
        {[1, 3, 5].map((n) => (
          <Action
            key={n}
            secondary={config.targetDurationMs !== n * 60000}
            label={`${n} minutes`}
            onPress={() =>
              setPractice({ ...config, targetDurationMs: n * 60000 })
            }
          />
        ))}
      </Section>
      <Section title="Mode">
        {(["coach", "simulation"] as const).map((mode) => (
          <Action
            key={mode}
            secondary={config.mode !== mode}
            label={mode}
            onPress={() => setPractice({ ...config, mode })}
          />
        ))}
      </Section>
      <Section title="Focus areas">
        {["Clarity", "Supporting evidence", "Delivery"].map((label) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Copy>{label}</Copy>
            <Switch
              accessibilityLabel={label}
              value={config.criteria.includes(label)}
              onValueChange={(on) =>
                setPractice({
                  ...config,
                  criteria: on
                    ? [...config.criteria, label]
                    : config.criteria.filter((v) => v !== label),
                })
              }
            />
          </View>
        ))}
      </Section>
      <Action
        label="Start Scripted Practice"
        disabled={!config.title.trim() || !config.context.trim()}
        onPress={() =>
          router.push({ pathname: "/demo", params: { custom: "1" } })
        }
      />
      <Action
        secondary
        label="Record with Camera"
        onPress={() => router.push("/studio")}
      />
      <Action
        secondary
        label="Manage Sources"
        onPress={() => router.push("/sources")}
      />
    </Page>
  );
}
