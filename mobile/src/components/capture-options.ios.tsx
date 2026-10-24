import { Host } from "@expo/ui";
import {
  Form,
  Picker,
  Section,
  Text,
  TextField,
  Toggle,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  tag,
  autocorrectionDisabled,
  keyboardType,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { useSessions } from "../session";
export default function CaptureOptions() {
  const { options, setOptions, practice, setPractice } = useSessions();
  const title = useNativeState(options.title);
  const url = useNativeState(options.url);
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section title="Recording">
          <Picker
            label="Duration"
            selection={practice.targetDurationMs}
            onSelectionChange={(targetDurationMs: number) =>
              setPractice({ ...practice, targetDurationMs })
            }
          >
            {[1, 3, 5].map((n) => (
              <Text key={n} modifiers={[tag(n * 60000)]}>
                {n} minutes
              </Text>
            ))}
          </Picker>
          <TextField
            text={title}
            placeholder="Recording name"
            maxLength={100}
            onTextChange={(title) => setOptions({ title })}
            modifiers={[accessibilityLabel("Recording name")]}
          />
        </Section>
        <Section
          title="On-device tracking"
          footer={
            <Text>
              Pose landmarks stay on your device. Angles are uncalibrated
              estimates, not gaze measurements or performance scores.
            </Text>
          }
        >
          <Toggle
            label="Pose Tracking"
            systemImage="figure.stand"
            isOn={options.poseEnabled}
            onIsOnChange={(poseEnabled) => setOptions({ poseEnabled })}
          />
        </Section>
        <Section
          title="Analysis"
          footer={
            <Text>
              {options.backend
                ? "Your video and audio are uploaded only when you choose Analyze in review. Automatic transcription is off."
                : "Your recording stays on this device. You can replay and share it without uploading."}
            </Text>
          }
        >
          <Toggle
            label="Server Analysis"
            systemImage="waveform"
            isOn={options.backend}
            onIsOnChange={(backend) => setOptions({ backend })}
          />
          {options.backend && (
            <TextField
              text={url}
              placeholder="https://your-server.example"
              onTextChange={(url) => setOptions({ url })}
              modifiers={[
                accessibilityLabel("Analysis server address"),
                keyboardType("url"),
                textInputAutocapitalization("never"),
                autocorrectionDisabled(true),
              ]}
            />
          )}
        </Section>
        {options.backend && (
          <Section
            footer={
              <Text>
                Use a reachable HTTPS or local network address. “localhost” on a
                phone refers to the phone, not your computer.
              </Text>
            }
          >
            <Text>
              Uploads are retained by the server until processing finishes.
              Results remain on the server.
            </Text>
          </Section>
        )}
      </Form>
    </Host>
  );
}
