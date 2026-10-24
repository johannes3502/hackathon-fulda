import { useEffect, useRef, useState } from "react";
import { useIsFocused } from "expo-router/react-navigation";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { api, endpoint } from "./api";
import { sourceCollection } from "./source-collection";
import {
  checkFile,
  listSources,
  uploadSource,
  deleteSource,
  searchSources,
  isPending,
  type Source,
  type SourceHit,
  type SourceRequest,
} from "../../frontend/src/features/sources/api";

export function useSources(address: string) {
  const focused = useIsFocused();
  const [collection, setCollection] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [hits, setHits] = useState<SourceHit[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scope = useRef<{
    base: string;
    collection: string;
    signal: AbortSignal;
  } | null>(null);
  const working = useRef(false);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    scope.current = null;
    if (!focused || !address.trim()) return;
    const request: SourceRequest = (base, path, init) =>
      api(base, path, controller.signal, init);
    async function load(initial = false) {
      try {
        const base = endpoint(address);
        const id = await sourceCollection(base);
        if (controller.signal.aborted) return;
        scope.current = { base, collection: id, signal: controller.signal };
        setCollection(id);
        if (initial) {
          setSources([]);
          setHits(null);
        }
        const items = await listSources(base, id, request);
        if (controller.signal.aborted) return;
        setSources(items);
        if (items.some(isPending)) timer = setTimeout(() => void load(), 1500);
      } catch (e) {
        if (!controller.signal.aborted) setError(String(e));
      }
    }
    void load(true);
    return () => {
      controller.abort();
      clearTimeout(timer);
      scope.current = null;
    };
  }, [address, focused, revision]);

  async function run(
    action: (
      current: NonNullable<typeof scope.current>,
      request: SourceRequest,
    ) => Promise<void>,
  ) {
    const current = scope.current;
    if (!current || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const request: SourceRequest = (base, path, init) =>
      api(base, path, current.signal, init);
    try {
      await action(current, request);
    } catch (e) {
      if (!current.signal.aborted) setError(String(e));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return {
    collection: focused && address.trim() ? collection : "",
    sources,
    hits,
    error,
    busy,
    refresh: () => refresh((v) => v + 1),
    connect: (id: string) =>
      run(async (current) => {
        await sourceCollection(current.base, id);
        if (!current.signal.aborted) refresh((v) => v + 1);
      }),
    upload: () =>
      run(async (current, request) => {
        const picked = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (picked.canceled || current.signal.aborted) return;
        try {
          for (const asset of picked.assets) {
            const file = new File(asset.uri);
            try {
              const problem = checkFile({ name: asset.name, size: file.size });
              if (problem) throw new Error(`${asset.name}: ${problem}`);
              await uploadSource(
                current.base,
                current.collection,
                file,
                request,
                asset.name,
              );
              if (current.signal.aborted) return;
            } finally {
              if (file.uri.startsWith(Paths.cache.uri) && file.exists)
                file.delete();
            }
          }
        } finally {
          if (!current.signal.aborted) refresh((v) => v + 1);
        }
      }),
    remove: (id: string) =>
      run(async (current, request) => {
        await deleteSource(current.base, id, request);
        if (!current.signal.aborted) {
          setHits(null);
          refresh((v) => v + 1);
        }
      }),
    search: (query: string) =>
      run(async (current, request) => {
        if (!query.trim() || query.length > 2000)
          throw new Error("Enter a question of up to 2,000 characters.");
        const result = await searchSources(
          current.base,
          current.collection,
          query.trim(),
          5,
          request,
        );
        if (!current.signal.aborted) setHits(result);
      }),
  };
}
