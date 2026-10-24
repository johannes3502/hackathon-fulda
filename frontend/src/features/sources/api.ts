import type { components } from "../../../../api/schema";

export type Source = components["schemas"]["Source"];
export type SourceHit = components["schemas"]["SourceHit"];
type Location = components["schemas"]["Location"];

export const ACCEPT = ".pdf,.pptx,.docx,.txt,.md";
export const MAX_BYTES = 25 * 1024 * 1024;
const STORAGE_KEY = "pitchcoach.sourceCollection";
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
let fallbackCollection: string | undefined;

/** One collection per browser groups the sources of the next presentations. */
export function collectionId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && UUID.test(stored)) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Private mode or blocked storage: keep the ID for this page view only.
    return (fallbackCollection ??= crypto.randomUUID());
  }
}

export function isPending(source: Source) {
  return source.status === "queued" || source.status === "processing";
}

export function checkFile(file: File) {
  const suffix = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPT.split(",").includes(suffix))
    return "Use PDF, PPTX, DOCX, TXT or MD files.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_BYTES) return "Files may be at most 25 MB.";
  return null;
}

const LABELS: Record<Location["kind"], [string, string]> = {
  page: ["Page", "Pages"],
  slide: ["Slide", "Slides"],
  paragraph: ["Paragraph", "Paragraphs"],
  line: ["Line", "Lines"],
};

export function locationLabel({ kind, start, end }: Location) {
  const [singular, plural] = LABELS[kind];
  return start === end ? `${singular} ${start}` : `${plural} ${start}–${end}`;
}

async function call<T>(
  endpoint: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    signal: AbortSignal.timeout(60000),
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = `: ${body.detail}`;
    } catch {}
    throw new Error(
      `Backend ${path} failed (HTTP ${response.status})${detail}`,
    );
  }
  return (response.status === 204 ? undefined : response.json()) as T;
}

export function listSources(endpoint: string, collection: string) {
  return call<Source[]>(
    endpoint,
    `/sources?collection_id=${encodeURIComponent(collection)}`,
  );
}

export async function uploadSource(
  endpoint: string,
  collection: string,
  file: File,
) {
  const body = new FormData();
  body.append("collection_id", collection);
  body.append("file", file, file.name);
  const accepted = await call<{ source: Source }>(endpoint, "/sources", {
    method: "POST",
    body,
  });
  return accepted.source;
}

export function deleteSource(endpoint: string, id: string) {
  return call<void>(endpoint, `/sources/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function searchSources(
  endpoint: string,
  collection: string,
  query: string,
  k = 5,
) {
  return call<SourceHit[]>(endpoint, "/sources/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection_id: collection, query, k }),
  });
}
