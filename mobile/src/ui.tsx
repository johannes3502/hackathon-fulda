import {
  Platform,
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
import { Color } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PropsWithChildren, ReactNode } from "react";
export { Action, Symbol } from "./components/controls";
export function useColors() {
  const dark = useColorScheme() === "dark";
  return {
    bg:
      Platform.OS === "ios"
        ? Color.ios.systemGroupedBackground
        : dark
          ? "#101318"
          : "#f2f4f8",
    panel:
      Platform.OS === "ios"
        ? Color.ios.secondarySystemGroupedBackground
        : dark
          ? "#1b2028"
          : "#fff",
    text:
      Platform.OS === "ios" ? Color.ios.label : dark ? "#f3f4f7" : "#182132",
    muted:
      Platform.OS === "ios"
        ? Color.ios.secondaryLabel
        : dark
          ? "#b8c1cf"
          : "#536176",
    line:
      Platform.OS === "ios"
        ? Color.ios.separator
        : dark
          ? "#3b4656"
          : "#c6ceda",
    tint:
      Platform.OS === "ios"
        ? Color.ios.systemBlue
        : dark
          ? "#9bbdff"
          : "#2555d9",
    error:
      Platform.OS === "ios"
        ? Color.ios.systemRed
        : dark
          ? "#ffb4ac"
          : "#a3261f",
  };
}
export function Copy({
  children,
  muted,
  title,
  caption,
  ...props
}: TextProps & { muted?: boolean; title?: boolean; caption?: boolean }) {
  const c = useColors();
  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? c.muted : c.text,
          fontSize: caption ? 13 : title ? 20 : 17,
          lineHeight: caption ? 18 : title ? 25 : 23,
          fontWeight: title ? "600" : "400",
        },
        props.style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Panel({ children }: PropsWithChildren) {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderRadius: 20,
        borderCurve: "continuous",
        padding: 18,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}
export function Section({
  title,
  footer,
  children,
}: PropsWithChildren<{ title: string; footer?: string }>) {
  return (
    <View style={{ gap: 8 }}>
      <Copy caption muted style={{ paddingHorizontal: 16 }}>
        {title}
      </Copy>
      <Panel>{children}</Panel>
      {footer && (
        <Copy caption muted style={{ paddingHorizontal: 16 }}>
          {footer}
        </Copy>
      )}
    </View>
  );
}
export function Divider() {
  const c = useColors();
  return <View style={{ height: 0.5, backgroundColor: c.line }} />;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Copy caption muted>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          {
            fontSize: 17,
            minHeight: 48,
            color: c.text,
            borderBottomWidth: 0.5,
            borderColor: c.line,
            paddingVertical: 10,
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
      keyboardDismissMode="interactive"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
        gap: 24,
        alignSelf: "center",
        width: "100%",
        maxWidth: 1100,
      }}
    >
      {children}
    </ScrollView>
  );
}
export function Columns({
  main,
  side,
  sideFirst = false,
}: {
  main: ReactNode;
  side: ReactNode;
  sideFirst?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const wide = width / fontScale >= 800;
  const style: ViewStyle = { flex: 1, minWidth: 0, gap: 24 };
  return (
    <View
      style={{
        flexDirection: wide ? "row" : sideFirst ? "column-reverse" : "column",
        gap: 24,
      }}
    >
      <View style={[style, wide && { flex: 1.5 }]}>{main}</View>
      <View style={style}>{side}</View>
    </View>
  );
}
export const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
