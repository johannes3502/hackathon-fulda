"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PresentationModeSelect } from "./PresentationModeSelect";
import {
  PRESENTATION_MODES,
  type PresentationMode,
} from "@/features/questions/presentation";
import {
  ACCEPT,
  checkFile,
  collectionId,
  isPending,
  listSources,
  uploadSource,
  type Source,
} from "@/features/sources/api";

export function PresentationSetup({
  mode,
  onMode,
  endpoint,
  disabled,
  onPrepare,
  prepared,
}: {
  mode: PresentationMode;
  onMode: (mode: PresentationMode) => void;
  endpoint: string;
  disabled: boolean;
  onPrepare: () => void;
  prepared: boolean;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [revision, setRevision] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = sources.some(isPending);
  useEffect(() => {
    let active = true;
    const load = () =>
      listSources(endpoint, collectionId())
        .then((items) => {
          if (active) setSources(items);
        })
        .catch(() => {
          if (active)
            setError(
              "Materials are unavailable. Check your backend and retry.",
            );
        });
    void load();
    const timer = pending ? setInterval(() => void load(), 1500) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [endpoint, pending, revision]);

  async function upload(files: FileList | null) {
    if (!files || disabled || uploading) return;
    setUploading(true);
    setError("");
    const collection = collectionId();
    for (const file of Array.from(files)) {
      const problem = checkFile(file);
      if (problem) {
        setError(`${file.name}: ${problem}`);
        continue;
      }
      try {
        const source = await uploadSource(endpoint, collection, file);
        setSources((items) => [
          ...items.filter((item) => item.id !== source.id),
          source,
        ]);
      } catch {
        setError(
          `${file.name} could not be uploaded. Retry when your backend is available.`,
        );
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <details className="presentation-setup panel">
      <summary>
        Presentation &amp; material{" "}
        <span className="muted">· {PRESENTATION_MODES[mode].label}</span>
      </summary>
      <fieldset disabled={disabled} className="presentation-setup-fields">
        <PresentationModeSelect mode={mode} onMode={onMode} />
        <div className="presentation-materials">
          <div className="panel-title-row">
            <strong>Your presentation material</strong>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} /> {uploading ? "Uploading…" : "Add material"}
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload presentation material"
            accept={ACCEPT}
            multiple
            onChange={(event) => void upload(event.target.files)}
          />
          <p className="field-hint">
            Upload slides or notes for questions about your content. PDF, PPTX,
            DOCX or text · up to 25 MB each. Files go to your backend.
          </p>
          {sources.length > 0 && (
            <ul
              className="preparation-files"
              aria-label="Presentation material"
            >
              {sources.map((source) => (
                <li key={source.id}>
                  <FileText size={15} />
                  <span>{source.filename}</span>
                  <small>
                    {source.status === "ready"
                      ? "Ready"
                      : source.status === "failed"
                        ? "Failed — upload again"
                        : "Processing…"}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <div className="preparation-actions">
            {!prepared && (
              <Button size="sm" onClick={onPrepare}>
                Enable questions after recording
              </Button>
            )}
            {prepared && (
              <span className="field-hint">
                Transcription is on for your question round.
              </span>
            )}
            <Link className="text-button" href="/sources">
              Manage material
            </Link>
          </div>
        </div>
      </fieldset>
      {error && (
        <p role="status" className="field-hint">
          {error}{" "}
          <button
            className="text-button"
            disabled={disabled}
            onClick={() => {
              setError("");
              setRevision((n) => n + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
    </details>
  );
}
