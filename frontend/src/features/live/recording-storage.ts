import type { LiveRecording } from "./contracts";

type StoredRecording = Omit<LiveRecording, "videoUrl">;
let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("presentation-recordings", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("recordings", { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Recording storage is blocked by another tab."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
  }).catch((error) => {
    database = undefined;
    throw error;
  }));
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", mode);
    const request = operation(tx.objectStore("recordings"));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () =>
      reject(tx.error ?? new Error("Recording storage failed."));
    tx.onerror = () => reject(tx.error ?? request.error);
  });
}

export function loadRecordings(): Promise<StoredRecording[]> {
  return transaction("readonly", (store) => store.getAll());
}

export function storeRecording(recording: LiveRecording) {
  // Object URLs belong to one document; recreate them from the saved Blob on load.
  const stored: Partial<LiveRecording> = { ...recording };
  delete stored.videoUrl;
  return transaction("readwrite", (store) => store.put(stored));
}

export function deleteRecording(id: string) {
  return transaction("readwrite", (store) => store.delete(id));
}
