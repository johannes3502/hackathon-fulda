import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("workspace manifests are valid JSON and frontend dependencies match the lockfile", () => {
  const read = (path: string) =>
    JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  read("../../package.json");
  read("../../mobile/package.json");
  const frontend = read("../package.json");
  const locked = read("../../package-lock.json").packages.frontend;
  expect(frontend.dependencies).toEqual(locked.dependencies);
  expect(frontend.devDependencies).toEqual(locked.devDependencies);
});
