import { Platform } from "react-native";
import { router, Stack } from "expo-router";
import Library from "../components/library";
export default function Home() {
  return (
    <>
      <Library />
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel="New recording"
            onPress={() => router.push("/studio")}
          />
        </Stack.Toolbar>
      )}
    </>
  );
}
