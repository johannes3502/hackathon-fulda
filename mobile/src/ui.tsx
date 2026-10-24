import {
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
  type TextProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";
export function useColors() {
  const dark = useColorScheme() === "dark";
  return {
    bg:
      Platform.OS === "ios"
        ? PlatformColor("systemGroupedBackground")
        : dark
          ? "#101318"
          : "#f2f4f8",
    panel:
      Platform.OS === "ios"
        ? PlatformColor("secondarySystemGroupedBackground")
        : dark
          ? "#1b2028"
          : "#fff",
    text:
      Platform.OS === "ios"
        ? PlatformColor("label")
        : dark
          ? "#f3f4f7"
          : "#182132",
    muted:
      Platform.OS === "ios"
        ? PlatformColor("secondaryLabel")
        : dark
          ? "#b8c1cf"
          : "#536176",
    line:
      Platform.OS === "ios"
        ? PlatformColor("separator")
        : dark
          ? "#3b4656"
          : "#c6ceda",
    tint: dark ? "#9bbdff" : "#2555d9",
    error: dark ? "#ffb4ac" : "#a3261f",
  };
}
export function Copy({
  children,
  muted,
  title,
  ...props
}: TextProps & { muted?: boolean; title?: boolean }) {
  const c = useColors();
  return (
    <Text
      selectable
      {...props}
      style={[
        {
          color: muted ? c.muted : c.text,
          fontSize: title ? 22 : 17,
          lineHeight: title ? 29 : 25,
          fontWeight: title ? "600" : "400",
        },
        props.style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Action({
  label,
  onPress,
  disabled,
  secondary = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  destructive?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 13,
        borderRadius: 12,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? c.panel : destructive ? c.error : c.tint,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        borderColor: c.line,
        borderWidth: secondary ? 1 : 0,
      })}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: secondary
            ? c.text
            : destructive
              ? "white"
              : c.tint === "#9bbdff"
                ? "#10244b"
                : "white",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Panel({ children }: PropsWithChildren) {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderRadius: 16,
        borderCurve: "continuous",
        padding: 18,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 7 }}>
      <Copy>{label}</Copy>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          {
            fontSize: 17,
            minHeight: 48,
            color: c.text,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 10,
            padding: 12,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Page({ children }: PropsWithChildren) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: Math.max(insets.bottom, 20) + 20,
        gap: 20,
        alignSelf: "center",
        width: "100%",
        maxWidth: 1200,
      }}
    >
      {children}
    </ScrollView>
  );
}
export function Columns({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  const { width, fontScale } = useWindowDimensions();
  const wide = width / fontScale >= 800;
  const style: ViewStyle = { flex: 1, minWidth: 0, gap: 20 };
  return (
    <View style={{ flexDirection: wide ? "row" : "column", gap: 20 }}>
      <View style={[style, wide && { flex: 1.5 }]}>{main}</View>
      <View style={style}>{side}</View>
    </View>
  );
}
export const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${Math.floor(ms / 1000) % 60 < 10 ? "0" : ""}${Math.floor(ms / 1000) % 60}`;
