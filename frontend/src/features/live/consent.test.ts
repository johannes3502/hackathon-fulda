import { expect, it } from "vitest";
import { consentTarget, LOCAL_SERVER_LABEL } from "./consent";

it.each([
  "/api",
  "api/",
  "http://localhost:8000",
  "https://localhost/api",
  "http://127.0.0.1:8000/api",
  "http://[::1]:8000",
])("labels a relative or local endpoint as the local server: %s", (value) => {
  expect(consentTarget(value)).toBe(LOCAL_SERVER_LABEL);
});

it("keeps a remote endpoint visible", () => {
  expect(consentTarget("https://coach.example:8443/api/")).toBe(
    "https://coach.example:8443/api",
  );
});
