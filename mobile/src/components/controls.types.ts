import type { SFSymbol } from "sf-symbols-typescript";
export type ActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  recording?: boolean;
  destructive?: boolean;
  icon?: SFSymbol;
};
export type SymbolProps = { name: SFSymbol; size?: number; muted?: boolean };
