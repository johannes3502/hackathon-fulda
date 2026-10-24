import { Switch, View } from "react-native";
import { Action, Copy, Field, Page, Section } from "../ui";
import { useSessions } from "../session";
export default function CaptureOptions() {
  const { options, setOptions, practice, setPractice } = useSessions();
  return (
    <Page>
      <Section title="Recording">
        <Copy caption muted>
          Duration
        </Copy>
        {[1, 3, 5].map((n) => (
          <Action
            key={n}
            secondary={practice.targetDurationMs !== n * 60000}
            label={`${n} minutes`}
            onPress={() =>
              setPractice({ ...practice, targetDurationMs: n * 60000 })
            }
          />
        ))}
        <Field
          label="Recording name"
          value={options.title}
          maxLength={100}
          onChangeText={(title) => setOptions({ title })}
        />
      </Section>
      <Section
        title="On-device tracking"
        footer="Pose stays on this device. Angles are uncalibrated estimates."
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Copy>Pose tracking</Copy>
          <Switch
            accessibilityLabel="Pose tracking"
            value={options.poseEnabled}
            onValueChange={(poseEnabled) => setOptions({ poseEnabled })}
          />
        </View>
      </Section>
      <Section
        title="Analysis"
        footer="Video and audio upload only when you choose Analyze in review. Automatic transcription is off. Uploads remain on the server until processing finishes; results remain on the server."
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Copy>Server analysis</Copy>
          <Switch
            accessibilityLabel="Server analysis"
            value={options.backend}
            onValueChange={(backend) => setOptions({ backend })}
          />
        </View>
        {options.backend && (
          <Field
            label="Analysis server address"
            value={options.url}
            onChangeText={(url) => setOptions({ url })}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
      </Section>
    </Page>
  );
}
