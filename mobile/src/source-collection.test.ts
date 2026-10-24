import { sourceCollection } from "./source-collection";
import { beforeEach, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-crypto", () => ({
  randomUUID: () => "12345678-1234-1234-1234-123456789012",
}));
vi.mock("expo-file-system", () => ({
  Paths: { document: "docs" },
  File: class {
    get exists() {
      return storage.has("file");
    }
    async text() {
      return storage.get("file")!;
    }
    write(text: string) {
      storage.set("file", text);
    }
  },
}));
beforeEach(() => storage.clear());
it("persists collection identity per backend and opens the web collection", async () => {
  const base = "https://api.test";
  const initial = await sourceCollection(base);
  const webId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  await sourceCollection(base, webId);
  expect(await sourceCollection(base)).toBe(webId);
  expect(await sourceCollection("https://other.test")).toBe(initial);
  await expect(sourceCollection(base, "invalid")).rejects.toThrow(
    "collection ID",
  );
  expect(await sourceCollection(base)).toBe(webId);
});
it("does not silently abandon documents when stored identity is corrupted", async () => {
  storage.set("file", "[]");
  await expect(sourceCollection("https://api.test")).rejects.toThrow(
    "could not be read",
  );
  expect(storage.get("file")).toBe("[]");
});
