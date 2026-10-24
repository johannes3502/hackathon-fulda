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
            headerTintColor: c.tint,
            contentStyle: { backgroundColor: c.bg },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="index" options={{ title: "Pitch Coach" }} />
          <Stack.Screen name="studio" options={{ title: "Record a take" }} />
          <Stack.Screen name="review" options={{ title: "Review your take" }} />
          <Stack.Screen name="demo" options={{ title: "Sample rehearsal" }} />
        </Stack>
      </Sessions>
    </ThemeProvider>
  );
}
