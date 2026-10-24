"use client";

import { useEffect, useRef, useState } from "react";

/** Keep the existing camera element mounted, including in browsers without native fullscreen. */
export function useStageFullscreen() {
  const stageRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const exit = async () => {
    if (document.fullscreenElement === stageRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        // Keep the exit button available if the browser refused to leave.
        return;
      }
    }
    setFullscreen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!fullscreen || !stage) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The viewport fallback needs the same keyboard boundary as native fullscreen.
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement = stage;
    while (current.parentElement) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.setAttribute("inert", "");
        }
      }
      current = current.parentElement;
      if (current === document.body) break;
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        setFullscreen(false);
        toggleRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        stage.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), [tabindex='0']",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      for (const { element, inert } of siblings)
        element.toggleAttribute("inert", inert);
      document.removeEventListener("keydown", keydown);
    };
  }, [fullscreen]);

  const toggle = async () => {
    if (fullscreen) return exit();
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (stage.requestFullscreen && document.fullscreenEnabled) {
        await stage.requestFullscreen();
        return;
      }
    } catch {
      // iOS and embedded browsers may only support a viewport-filling view.
    }
    setFullscreen(true);
  };

  return { stageRef, toggleRef, fullscreen, toggle };
}
