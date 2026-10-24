import { PlatformColor } from "react-native";
import { Host } from "@expo/ui";
import { Button, Image } from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  buttonStyle,
  controlSize,
  disabled,
  foregroundStyle,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { ActionProps, SymbolProps } from "./controls.types";
export function Action({
  label,
  onPress,
  disabled: inactive,
  secondary,
  recording,
  destructive,
  icon,
}: ActionProps) {
  return (
    <Host matchContents={{ vertical: true }}>
      <Button
        label={label}
        systemImage={icon}
        onPress={onPress}
        role={destructive ? "destructive" : "default"}
        modifiers={[
          buttonStyle(
            secondary || destructive ? "borderless" : "borderedProminent",
          ),
          controlSize("large"),
          frame({ minHeight: 44 }),
          disabled(!!inactive),
          tint(
            PlatformColor(
              destructive || recording ? "systemRed" : "systemBlue",
            ),
          ),
        ]}
      />
    </Host>
  );
}
export function Symbol({ name, size = 24, muted }: SymbolProps) {
  return (
    <Host matchContents style={{ width: size, height: size }}>
      <Image
        systemName={name}
        size={size}
        modifiers={[
          foregroundStyle(PlatformColor(muted ? "systemGray" : "systemBlue")),
          accessibilityHidden(true),
        ]}
      />
    </Host>
  );
}
