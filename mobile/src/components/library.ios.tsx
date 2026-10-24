import { PlatformColor } from "react-native";
import { Host } from "@expo/ui";
import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  font,
  foregroundStyle,
  listRowBackground,
  listStyle,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useSessions } from "../session";
import { time } from "../ui";
export default function Library() {
  const { takes } = useSessions();
  return (
    <Host style={{ flex: 1 }}>
      <List modifiers={[listStyle("insetGrouped")]}>
        <Section title="Prepare">
          <Button
            label="Practice Setup"
            systemImage="slider.horizontal.3"
            onPress={() => router.push("/setup")}
          />
          <Button
            label="Source Library"
            systemImage="doc.text"
            onPress={() => router.push("/sources")}
          />
        </Section>
        <Section
          title="Your recordings"
          footer={
            <Text>
              Recordings are temporary. Share a take before closing the app.
            </Text>
          }
        >
          {takes.length ? (
            takes.map((t) => (
              <Button
                key={t.id}
                onPress={() =>
                  router.push({ pathname: "/review", params: { id: t.id } })
                }
                modifiers={[buttonStyle("plain")]}
              >
                <HStack spacing={14}>
                  <Image
                    systemName="waveform"
                    modifiers={[
                      foregroundStyle(PlatformColor("systemBlue")),
                      font({ textStyle: "title2" }),
                    ]}
                  />
                  <VStack alignment="leading" spacing={5}>
                    <Text modifiers={[font({ textStyle: "headline" })]}>
                      {t.title}
                    </Text>
                    <Text
                      modifiers={[
                        font({ textStyle: "subheadline" }),
                        foregroundStyle({
                          type: "hierarchical",
                          style: "secondary",
                        }),
                      ]}
                    >
                      {time(t.durationMs)} · {t.feedback.length} review{" "}
                      {t.feedback.length === 1 ? "moment" : "moments"}
                    </Text>
                  </VStack>
                  <Spacer />
                  <Image
                    systemName="chevron.right"
                    modifiers={[
                      font({ textStyle: "caption", weight: "semibold" }),
                      foregroundStyle({
                        type: "hierarchical",
                        style: "tertiary",
                      }),
                    ]}
                  />
                </HStack>
              </Button>
            ))
          ) : (
            <ContentUnavailableView
              title="No Recordings"
              systemImage="waveform"
              description="Capture a rehearsal, then revisit the moments that matter."
              modifiers={[
                padding({ vertical: 24 }),
                listRowBackground("clear"),
              ]}
            />
          )}
        </Section>
        <Section
          title="Explore"
          footer={<Text>A scripted example. No camera or upload needed.</Text>}
        >
          <Button
            onPress={() => router.push("/demo")}
            modifiers={[buttonStyle("plain")]}
          >
            <HStack spacing={14}>
              <Image
                systemName="play.rectangle.fill"
                modifiers={[
                  foregroundStyle(PlatformColor("systemBlue")),
                  font({ textStyle: "title2" }),
                ]}
              />
              <VStack alignment="leading" spacing={4}>
                <Text>Sample Rehearsal</Text>
                <Text
                  modifiers={[
                    font({ textStyle: "subheadline" }),
                    foregroundStyle({
                      type: "hierarchical",
                      style: "secondary",
                    }),
                  ]}
                >
                  Transcript, feedback and questions
                </Text>
              </VStack>
              <Spacer />
              <Image
                systemName="chevron.right"
                modifiers={[
                  font({ textStyle: "caption", weight: "semibold" }),
                  foregroundStyle({ type: "hierarchical", style: "tertiary" }),
                ]}
              />
            </HStack>
          </Button>
        </Section>
      </List>
    </Host>
  );
}
