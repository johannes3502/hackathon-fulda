import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type {
  LiveFeedback,
  LiveMetric,
} from "../../frontend/src/features/live/contracts";
export type Take = {
  id: string;
  title: string;
  uri: string;
  durationMs: number;
  poseUri?: string;
  poseCount: number;
  feedback: LiveFeedback[];
  metrics: LiveMetric[];
  mode: "local" | "backend";
  endpoint: string;
  notice?: string;
};
export type CaptureOptions = {
  title: string;
  poseEnabled: boolean;
  backend: boolean;
  url: string;
};
type Store = {
  options: CaptureOptions;
  setOptions: (patch: Partial<CaptureOptions>) => void;
  takes: Take[];
  save: (take: Take) => void;
  remove: (id: string) => void;
};
const Context = createContext<Store | null>(null);
export function Sessions({ children }: PropsWithChildren) {
  const [takes, set] = useState<Take[]>([]);
  const [options, setOptions] = useState<CaptureOptions>({
    title: "My rehearsal",
    poseEnabled: true,
    backend: false,
    url: process.env.EXPO_PUBLIC_API_URL ?? "",
  });
  return (
    <Context.Provider
      value={{
        takes,
        options,
        setOptions: (patch) => setOptions((old) => ({ ...old, ...patch })),
        save: (take) =>
          set((old) => [take, ...old.filter((t) => t.id !== take.id)]),
        remove: (id) => {
          const take = takes.find((t) => t.id === id);
          for (const uri of [take?.uri, take?.poseUri])
            if (uri) {
              const f = new File(uri);
              if (f.exists) f.delete();
            }
          set((old) => old.filter((t) => t.id !== id));
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSessions() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
export function writePose(id: string, jsonl: string) {
  if (!jsonl) return undefined;
  const file = new File(Paths.cache, `pose-${id}.jsonl`);
  file.create({ overwrite: true });
  file.write(jsonl);
  return file.uri;
}
export async function shareFile(uri: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  await Sharing.shareAsync(uri);
}
