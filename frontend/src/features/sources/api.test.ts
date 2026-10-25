import { afterEach, expect, it, vi } from "vitest";
import {
  checkFile,
  collectionId,
  deleteSource,
  locationLabel,
  retrievalHint,
  searchSources,
  uploadSource,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

it("keeps one collection per browser, also without storage", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const first = collectionId();
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(collectionId()).toBe(first);
  values.set("pitchcoach.sourceCollection", "not-a-uuid");
  expect(collectionId()).not.toBe("not-a-uuid");
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(collectionId()).toBe(collectionId());
});

it("rejects unsupported, empty and oversized files before upload", () => {
  expect(checkFile(new File(["x"], "deck.PPTX"))).toBeNull();
  expect(checkFile(new File(["x"], "image.png"))).toMatch(/PDF, PPTX/);
  expect(checkFile(new File([], "notes.txt"))).toMatch(/empty/);
  const big = new File(["x"], "paper.pdf");
  Object.defineProperty(big, "size", { value: 26 * 1024 * 1024 });
  expect(checkFile(big)).toMatch(/25 MB/);
});

it("labels page, slide, table and merged paragraph locations", () => {
  expect(locationLabel({ kind: "slide", start: 2, end: 2 })).toBe("Slide 2");
  expect(locationLabel({ kind: "paragraph", start: 1, end: 4 })).toBe(
    "Paragraphs 1–4",
  );
  expect(locationLabel({ kind: "table", start: 1, end: 1 })).toBe("Table 1");
});

it("shows retrieval similarity and weak matches without claiming a probability", () => {
  expect(retrievalHint({ similarity: 0.42, matched_by: ["vector"], weak: false })).toBe(
    "similarity 0.42 (signal)",
  );
  expect(retrievalHint({ similarity: 0.2, matched_by: ["vector"], weak: true })).toBe(
    "similarity 0.20 (signal) · weak match, check passage",
  );
  expect(retrievalHint({ similarity: null, matched_by: ["keyword"], weak: false })).toBe(
    "",
  );
});

it("uploads multipart, searches as JSON and surfaces backend errors", async () => {
  const source = { id: "s1", status: "queued" };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ source, status_url: "/sources/s1" }, { status: 202 }),
    )
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(
      Response.json({ detail: "Unknown source" }, { status: 404 }),
    );
  vi.stubGlobal("fetch", fetcher);
  const file = new File(["synthetic"], "deck.pptx");
  expect(await uploadSource("http://api", "c1", file)).toEqual(source);
  const body = fetcher.mock.calls[0][1].body as FormData;
  expect(body.get("collection_id")).toBe("c1");
  expect((body.get("file") as File).name).toBe("deck.pptx");

  await searchSources("http://api", "c1", "Wie viele Nutzer?", 3);
  expect(fetcher.mock.calls[1][0]).toBe("http://api/sources/search");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    collection_id: "c1",
    query: "Wie viele Nutzer?",
    k: 3,
  });
  await expect(deleteSource("http://api", "s1")).rejects.toThrow(
    "HTTP 404): Unknown source",
  );
});
it("opens a valid collection from mobile without replacing it with a new browser ID", async () => {
  const { setCollectionId } = await import("./api");
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key),
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  setCollectionId(` ${id} `);
  expect(collectionId()).toBe(id);
  expect(() => setCollectionId("bad")).toThrow("valid collection");
  expect(collectionId()).toBe(id);
});
