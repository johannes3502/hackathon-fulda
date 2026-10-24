"use client";
import * as TabsPrimitive from "@radix-ui/react-tabs";
export const Tabs = TabsPrimitive.Root;
export function TabsList(
  props: React.ComponentProps<typeof TabsPrimitive.List>,
) {
  return <TabsPrimitive.List className="tabs-list" {...props} />;
}
export function TabsTrigger(
  props: React.ComponentProps<typeof TabsPrimitive.Trigger>,
) {
  return <TabsPrimitive.Trigger className="tabs-trigger" {...props} />;
}
export function TabsContent(
  props: React.ComponentProps<typeof TabsPrimitive.Content>,
) {
  return <TabsPrimitive.Content className="tabs-content" {...props} />;
}
