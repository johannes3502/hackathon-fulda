import { Host, Button } from "@expo/ui";
import type { ActionProps, SymbolProps } from "./controls.types";
export function Action({
  label,
  onPress,
  disabled,
  secondary,
  destructive,
  recording,
}: ActionProps) {
  return (
    <Host
      matchContents={{ vertical: true }}
      seedColor={destructive || recording ? "#ba1a1a" : undefined}
    >
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant={secondary || destructive ? "text" : "filled"}
      />
    </Host>
  );
}
export function Symbol(_props: SymbolProps) {
  return null;
}
