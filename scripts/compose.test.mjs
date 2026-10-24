import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Resolves anchors and interpolation without requiring a running Docker engine.
const { services } = JSON.parse(execFileSync("docker", [
  "compose", "--env-file", ".env.example", "config", "--format", "json",
], { encoding: "utf8" }));

test("each image has one builder, preventing concurrent exports to the same tag", () => {
  const built = new Set();
  for (const service of Object.values(services)) {
    if (!service.build || !service.image) continue;
    assert.ok(!built.has(service.image), `Multiple builders for ${service.image}`);
    built.add(service.image);
  }
});

test("worker uses the built API image and waits for its local dependencies", () => {
  assert.equal(services.worker.image, services.backend.image);
  assert.ok(services.backend.build);
  assert.equal(services.worker.pull_policy, "never");
  assert.equal(services.worker.depends_on.backend.condition, "service_healthy");
});

test("an explicitly empty LLM endpoint or model disables both API and worker configuration", () => {
  for (const disabled of ["LLM_BASE_URL", "LLM_MODEL"]) {
    const { services: configured } = JSON.parse(execFileSync("docker", [
      "compose", "--env-file", ".env.example", "config", "--format", "json",
    ], { encoding: "utf8", env: { ...process.env, [disabled]: "" } }));
    for (const name of ["backend", "worker"]) {
      assert.equal(configured[name].environment[disabled], "");
    }
  }
});
