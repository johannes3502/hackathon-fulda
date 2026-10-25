import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

// Resolves anchors and interpolation without requiring a running Docker engine.
const { services } = JSON.parse(
  execFileSync(
    "docker",
    ["compose", "--env-file", ".env.example", "config", "--format", "json"],
    { encoding: "utf8" },
  ),
);

for (const failedPath of [
  null,
  "/",
  "/demo",
  "/gestures",
  "/sources",
  "/progress",
  "/admin",
  "/live",
  "/live/healthcheck/review",
  "/review-preview",
  "/api/health/ready",
]) {
  test(`frontend healthcheck ${failedPath ? `rejects a failure on ${failedPath}` : "accepts healthy routes"}`, () => {
    const [, command, flag, script] = services.frontend.healthcheck.test;
    assert.equal(command, "node");
    assert.equal(flag, "-e");
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `
      globalThis.fetch = async url => ({ ok: new URL(url).pathname !== ${JSON.stringify(failedPath)} });
      ${script}
    `,
      ],
      { encoding: "utf8", timeout: 5000 },
    );
    assert.equal(result.status, failedPath ? 1 : 0, result.stderr);
  });
}

test("each image has one builder, preventing concurrent exports to the same tag", () => {
  const built = new Set();
  for (const service of Object.values(services)) {
    if (!service.build || !service.image) continue;
    assert.ok(
      !built.has(service.image),
      `Multiple builders for ${service.image}`,
    );
    built.add(service.image);
  }
});

test("worker uses the built API image and waits for its local dependencies", () => {
  assert.equal(services.worker.image, services.backend.image);
  assert.ok(services.backend.build);
  assert.equal(services.worker.pull_policy, "never");
  assert.equal(services.worker.depends_on.backend.condition, "service_healthy");
});

test("pitch controls reach the production build and backend", () => {
  const { services: configured } = JSON.parse(
    execFileSync(
      "docker",
      ["compose", "--env-file", ".env.example", "config", "--format", "json"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PITCH_MODE: "0",
          NEXT_PUBLIC_STAGE_MODE: "0",
          NEXT_PUBLIC_STAGE_ANALYSIS: "live",
        },
      },
    ),
  );
  assert.equal(configured.backend.environment.PITCH_MODE, "0");
  assert.equal(configured.frontend.build.args.NEXT_PUBLIC_STAGE_MODE, "0");
  assert.equal(
    configured.frontend.build.args.NEXT_PUBLIC_STAGE_ANALYSIS,
    "live",
  );
  assert.equal(
    configured.frontend.build.args.API_INTERNAL_URL,
    "http://backend:8000",
  );
  assert.ok(
    !configured.frontend.volumes?.length,
    "Production source must come from the built image",
  );
});

test("beat shares the API image and waits for backend and Redis", () => {
  assert.equal(services.beat.image, services.backend.image);
  assert.equal(services.beat.pull_policy, "never");
  assert.equal(services.beat.depends_on.backend.condition, "service_healthy");
  assert.equal(services.beat.depends_on.redis.condition, "service_healthy");
});

test("shared configuration has empty provider credentials", () => {
  const example = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  for (const [, name, value] of example.matchAll(/^(\w+_API_KEY)=(.*)$/gm)) {
    assert.ok(value.trim() === "", `${name} must be empty in .env.example`);
  }
});

test("an explicitly empty LLM endpoint or model disables both API and worker configuration", () => {
  for (const disabled of ["LLM_BASE_URL", "LLM_MODEL"]) {
    const { services: configured } = JSON.parse(
      execFileSync(
        "docker",
        ["compose", "--env-file", ".env.example", "config", "--format", "json"],
        { encoding: "utf8", env: { ...process.env, [disabled]: "" } },
      ),
    );
    for (const name of ["backend", "worker"]) {
      assert.equal(configured[name].environment[disabled], "");
    }
  }
});
