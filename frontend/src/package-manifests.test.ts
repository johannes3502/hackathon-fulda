import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("workspace manifests are valid JSON and frontend dependencies match the lockfile", () => {
  const read = (path: string) =>
    JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const root = read("../../package.json");
  expect(root.workspaces).toEqual(["frontend"]);
  for (const workspace of root.workspaces)
    read(`../../${workspace}/package.json`);
  const frontend = read("../package.json");
  const packages = read("../../package-lock.json").packages;
  expect(
    Object.keys(packages).some(
      (path) => path === "mobile" || path.startsWith("mobile/"),
    ),
  ).toBe(false);
  const locked = packages.frontend;
  expect(frontend.dependencies).toEqual(locked.dependencies);
  expect(frontend.devDependencies).toEqual(locked.devDependencies);
});

test("the frontend Docker build does not depend on deleted workspace files", () => {
  const dockerfile = readFileSync(
    new URL("../Dockerfile", import.meta.url),
    "utf8",
  );
  for (const line of dockerfile
    .split("\n")
    .filter((line) => line.startsWith("COPY "))) {
    const sources = line
      .split(/\s+/)
      .slice(1, -1)
      .filter((part) => !part.startsWith("--"));
    for (const source of sources)
      expect(
        existsSync(new URL(`../../${source}`, import.meta.url)),
        source,
      ).toBe(true);
  }
});
