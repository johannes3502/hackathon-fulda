import { Host } from "@expo/ui";
import {
  Form,
  Section,
  Text,
  TextField,
  Picker,
  Toggle,
  Button,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  tag,
  buttonStyle,
  disabled,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useSessions } from "../session";
import type { SessionConfig } from "../../../frontend/src/features/coach/contracts";
export default function Setup() {
  const { practice: config, setPractice } = useSessions();
  const title = useNativeState(config.title);
  const context = useNativeState(config.context);
  const patch = (value: Partial<SessionConfig>) =>
    setPractice({ ...config, ...value });
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section
          title="Your rehearsal"
          footer={
            <Text>
              Custom settings use the same scripted Viva scenario as the web
              app. No recording or generated analysis.
            </Text>
          }
        >
          <TextField
            text={title}
            maxLength={100}
            placeholder="Title"
            modifiers={[accessibilityLabel("Practice title")]}
            onTextChange={(title) => patch({ title })}
          />
          <TextField
            text={context}
            axis="vertical"
            maxLength={2000}
            placeholder="What is the big idea?"
            modifiers={[accessibilityLabel("Practice context")]}
            onTextChange={(context) => patch({ context })}
          />
        </Section>
        <Section title="Session">
          <Picker
            label="Audience"
            selection={config.audience}
            onSelectionChange={(audience: SessionConfig["audience"]) =>
              patch({ audience })
            }
          >
            <Text modifiers={[tag("hackathon")]}>Hackathon jury</Text>
            <Text modifiers={[tag("investor")]}>Investor</Text>
            <Text modifiers={[tag("examiner")]}>University examiner</Text>
          </Picker>
          <Picker
            label="Duration"
            selection={config.targetDurationMs}
            onSelectionChange={(targetDurationMs: number) =>
              patch({ targetDurationMs })
            }
          >
            {[1, 3, 5].map((n) => (
              <Text key={n} modifiers={[tag(n * 60000)]}>
                {n} minutes
              </Text>
            ))}
          </Picker>
          <Picker
            label="Mode"
            selection={config.mode}
            onSelectionChange={(mode: SessionConfig["mode"]) => patch({ mode })}
          >
            <Text modifiers={[tag("coach")]}>Coach</Text>
            <Text modifiers={[tag("simulation")]}>Simulation</Text>
          </Picker>
        </Section>
        <Section
          title="Focus areas"
          footer={
            <Text>Simulation mode keeps live coaching quiet until review.</Text>
          }
        >
          {["Clarity", "Supporting evidence", "Delivery"].map((label) => (
            <Toggle
              key={label}
              label={label}
              isOn={config.criteria.includes(label)}
              onIsOnChange={(on) =>
                patch({
                  criteria: on
                    ? [...config.criteria, label]
                    : config.criteria.filter((v) => v !== label),
                })
              }
            />
          ))}
        </Section>
        <Section>
          <Button
            label="Start Scripted Practice"
            systemImage="play.fill"
            modifiers={[
              buttonStyle("borderedProminent"),
              disabled(!config.title.trim() || !config.context.trim()),
            ]}
            onPress={() =>
              router.push({ pathname: "/demo", params: { custom: "1" } })
            }
          />
          <Button
            label="Record with Camera"
            systemImage="video"
            onPress={() => router.push("/studio")}
          />
          <Button
            label="Manage Sources"
            systemImage="doc.text"
            onPress={() => router.push("/sources")}
          />
        </Section>
      </Form>
    </Host>
  );
}
