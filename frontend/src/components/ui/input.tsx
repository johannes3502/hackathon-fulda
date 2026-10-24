import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("input", className)}
      {...props}
    />
  );
}
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("input textarea", className)}
      {...props}
    />
  );
}
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn("input", className)}
      {...props}
    />
  );
}
