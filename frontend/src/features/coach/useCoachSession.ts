"use client";
import { useContext } from "react";
import { SessionContext } from "./SessionProvider";
export function useCoachSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useCoachSession must be inside SessionProvider");
  return value;
}
