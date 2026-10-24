"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  FileText,
  LoaderCircle,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiEndpoint } from "@/features/live/analysis";
import {
  ACCEPT,
  checkFile,
  collectionId,
  setCollectionId,
  deleteSource,
  isPending,
  listSources,
  locationLabel,
  searchSources,
  uploadSource,
  type Source,
  type SourceHit,
} from "@/features/sources/api";

const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function SourceStatus({ source }: { source: Source }) {
  if (source.status === "ready")
    return (
      <span className="source-status ready">
        Ready · {source.chunk_count}{" "}
        {source.chunk_count === 1 ? "passage" : "passages"}
      </span>
    );
  if (source.status === "failed")
    return (
      <span className="source-status failed">
        Failed{source.error ? ` · ${source.error}` : ""}
      </span>
    );
  return (
    <span className="source-status">
      <LoaderCircle size={13} className="spin" />
      {source.status === "queued" ? "Waiting" : "Reading and indexing"}
    </span>
  );
}

type Config = { api: string; collection: string } | { error: string };
let cachedConfig: Config | undefined;
function clientConfig(): Config {
  if (!cachedConfig) {
    try {
      cachedConfig = {
        api: apiEndpoint(
          process.env.NEXT_PUBLIC_API_URL ?? "/api",
          window.location.protocol === "https:",
        ),
        collection: collectionId(),
      };
    } catch (reason) {
      cachedConfig = {
        error: reason instanceof Error ? reason.message : String(reason),
      };
    }
  }
  return cachedConfig;
}
const subscribe = () => () => {};

export function SourceLibrary() {
  const [selectedCollection, setSelectedCollection] = useState<string>();
  const [collectionDraft, setCollectionDraft] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SourceHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Null on the server and during hydration; browser-only values afterwards.
  const config = useSyncExternalStore(subscribe, clientConfig, () => null);
  const api = config && "api" in config ? config.api : null;
  const collection =
    selectedCollection ??
    (config && "api" in config ? config.collection : null);
  const pending = sources.some(isPending);
  useEffect(() => {
    if (!api || !collection) return;
    let active = true;
    const load = () =>
      listSources(api, collection).then(
        (items) => {
          if (active) setSources(items);
        },
        (reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not load sources.",
            );
        },
      );
    void load();
    const timer = pending ? setInterval(() => void load(), 1500) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, collection, pending]);

  async function upload(files: FileList | File[]) {
    if (!api || !collection) return;
    setError(null);
    for (const file of Array.from(files)) {
      const problem = checkFile(file);
      if (problem) {
        setError(`${file.name}: ${problem}`);
        continue;
      }
      setUploading((count) => count + 1);
      try {
        const source = await uploadSource(api, collection, file);
        setSources((current) => [...current, source]);
      } catch (reason) {
        setError(
          `${file.name}: ${reason instanceof Error ? reason.message : "Upload failed."}`,
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  async function remove(source: Source) {
    if (!api) return;
    setError(null);
    try {
      await deleteSource(api, source.id);
      setSources((current) => current.filter((item) => item.id !== source.id));
      setHits(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not remove source.",
      );
    }
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!api || !collection || !query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setHits(await searchSources(api, collection, query.trim()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  const ready = sources.filter((source) => source.status === "ready").length;
  return (
    <AppShell experience="live">
      <div className="workspace sources-workspace">
        <div className="workspace-back">
          <Link href="/">
            <ArrowLeft size={15} /> Back to overview
          </Link>
        </div>
        <div className="workspace-heading">
          <div>
            <h1>Your sources</h1>
            <p>
              Add slides, papers or notes to check claims and prepare questions
              after recording.
            </p>
          </div>
          <Button asChild>
            <Link href="/live">Continue to recording</Link>
          </Button>
        </div>
        {config && "error" in config && (
          <p className="status-error" role="alert">
            {config.error}
          </p>
        )}
        {error && (
          <p className="status-error" role="alert">
            {error}
          </p>
        )}
        <div className="sources-grid">
          <section
            className="panel sources-panel"
            aria-label="Uploaded sources"
          >
            <div className="panel-title-row">
              <h2>Source library</h2>
              <span className="badge">{sources.length} files</span>
            </div>
            <label
              className={dragging ? "source-drop dragging" : "source-drop"}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(event.dataTransfer.files);
              }}
            >
              <Upload size={22} />
              <strong>
                {uploading ? "Uploading…" : "Drop files or choose from device"}
              </strong>
              <span className="muted small">
                PDF, PPTX, DOCX, TXT or MD · up to 25 MB each · use synthetic
                content. Scanned PDFs without a text layer are not read.
              </span>
              <input
                ref={input}
                type="file"
                multiple
                accept={ACCEPT}
                className="visually-hidden"
                disabled={!api || !collection}
                onChange={(event) => {
                  if (event.target.files) void upload(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            {sources.length === 0 ? (
              <p className="muted source-empty">
                No sources yet. Add a document to get started.
              </p>
            ) : (
              <ul className="source-list">
                {sources.map((source) => (
                  <li key={source.id}>
                    <FileText size={18} className="muted" />
                    <div>
                      <strong>{source.filename}</strong>
                      <span className="muted small">
                        {size(source.size_bytes)}
                      </span>
                      <SourceStatus source={source} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${source.filename}`}
                      onClick={() => void remove(source)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel sources-panel" aria-label="Test retrieval">
            <h2>Search your sources</h2>
            <p className="muted small">
              Ask a question or paste a claim from your talk. These passages are
              used by fact-checking and the question round.
            </p>
            <form className="source-search" onSubmit={(e) => void search(e)}>
              <Input
                aria-label="Question or claim"
                placeholder="e.g. How many students use the app?"
                maxLength={2000}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button
                type="submit"
                disabled={!ready || !query.trim() || searching}
              >
                <Search size={16} /> Search
              </Button>
            </form>
            {!ready && (
              <p className="field-hint">
                Search becomes available once a source is ready.
              </p>
            )}
            {hits && hits.length === 0 && (
              <p className="muted source-empty">No matching passages.</p>
            )}
            {hits && hits.length > 0 && (
              <ol className="source-hits">
                {hits.map((hit) => (
                  <li key={hit.chunk_id}>
                    <div className="source-hit-meta">
                      <strong>{hit.filename}</strong>
                      <span>{locationLabel(hit.location)}</span>
                      <span className="badge">
                        {hit.matched_by
                          .map((by) =>
                            by === "vector" ? "meaning" : "keyword",
                          )
                          .join(" + ")}
                      </span>
                    </div>
                    <p>{hit.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        {collection && (
          <details className="context-disclosure">
            <summary>Use this collection on another device</summary>
            <p>
              Enter this ID and the same server address in the native app. The
              ID groups documents; it is not a login or access-control secret.
            </p>
            <Input
              aria-label="Current collection ID"
              readOnly
              value={collection}
            />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  const id = setCollectionId(collectionDraft);
                  if (id === collection) return;
                  if (config && "api" in config)
                    cachedConfig = { ...config, collection: id };
                  setSources([]);
                  setHits(null);
                  setError(null);
                  setSelectedCollection(id);
                } catch (reason) {
                  setError(String(reason));
                }
              }}
            >
              <Input
                aria-label="Collection ID from another device"
                placeholder="Collection ID"
                value={collectionDraft}
                onChange={(event) => setCollectionDraft(event.target.value)}
              />
              <Button
                type="submit"
                disabled={!!uploading || searching || !collectionDraft.trim()}
              >
                Open collection
              </Button>
            </form>
          </details>
        )}
      </div>
    </AppShell>
  );
}
