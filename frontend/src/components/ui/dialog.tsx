"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Dialog({
  trigger,
  title,
  children,
  description = "A safe space to practice. All feedback in this prototype is simulated.",
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <DialogPrimitive.Title className="section-title">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="muted">
            {description}
          </DialogPrimitive.Description>
          <div className="dialog-body">{children}</div>
          <DialogPrimitive.Close className="dialog-close" aria-label="Close">
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
