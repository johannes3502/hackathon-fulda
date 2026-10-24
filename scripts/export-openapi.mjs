import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const venvPython = fileURLToPath(new URL(
  process.platform === "win32"
    ? "backend/.venv/Scripts/python.exe"
    : "backend/.venv/bin/python",
  root,
));
const python = process.env.PYTHON || (existsSync(venvPython) ? venvPython : "python3");
const result = spawnSync(
  python,
  ["-m", "scripts.export_openapi", ...process.argv.slice(2)],
  { cwd: fileURLToPath(new URL("backend/", root)), stdio: "inherit" },
);
if (result.error) {
  console.error(`Cannot start ${python}: ${result.error.message}`);
  console.error("Install the backend dependencies; set PYTHON to select an interpreter.");
}
process.exit(result.status ?? 1);
