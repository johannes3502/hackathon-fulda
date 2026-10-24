import { Platform } from "react-native";
import { router, Stack } from "expo-router";
import CaptureOptions from "../components/capture-options";
import { Action } from "../ui";
export default function Settings() {
  return (
    <>
      <CaptureOptions />
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => router.back()}>
            Done
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : (
        <Action label="Done" onPress={() => router.back()} />
      )}
    </>
  );
}
