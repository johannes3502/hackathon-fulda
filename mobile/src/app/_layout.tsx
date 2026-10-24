import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Sessions } from "../session";
import { useColors } from "../ui";
export default function Layout() {
  const c = useColors();
  const dark = useColorScheme() === "dark";
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <Sessions>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: c.bg },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: "Rehearsals", headerLargeTitle: true }}
          />
          <Stack.Screen name="setup" options={{ title: "Practice Setup" }} />
          <Stack.Screen name="sources" options={{ title: "Sources" }} />
          <Stack.Screen name="studio" options={{ title: "New Recording" }} />
          <Stack.Screen name="review" options={{ title: "Review" }} />
          <Stack.Screen name="demo" options={{ title: "Sample Rehearsal" }} />
          <Stack.Screen
            name="settings"
            options={{
              title: "Recording Options",
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.75, 1],
            }}
          />
        </Stack>
      </Sessions>
    </ThemeProvider>
  );
}
