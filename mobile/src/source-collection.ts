import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { UUID } from "../../frontend/src/features/sources/api";

const storage = () => new File(Paths.document, "source-collections.json");
export async function sourceCollection(base: string, replacement?: string) {
  const file = storage();
  const saved: unknown = file.exists ? JSON.parse(await file.text()) : {};
  if (!saved || typeof saved !== "object" || Array.isArray(saved))
    throw new Error(
      "Saved source collections could not be read. Your server documents are unchanged.",
    );
  const collections = saved as Record<string, unknown>;
  const id = replacement?.trim() ?? collections[base] ?? randomUUID();
  if (typeof id !== "string" || !UUID.test(id))
    throw new Error("Enter a valid collection ID from the web Sources page.");
  if (collections[base] !== id) {
    file.write(JSON.stringify({ ...collections, [base]: id }));
  }
  return id;
}
