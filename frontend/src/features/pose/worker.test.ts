import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_POSE_OPTIONS, type PoseOptions } from "./options";

const script = readFileSync(
  new URL("../../../public/pose/worker.js", import.meta.url),
  "utf8",
);
type TaskOptions = {
  baseOptions: { delegate: string; modelAssetPath: string };
  runningMode: string;
};
type Frame = { width: number; height: number; close: ReturnType<typeof vi.fn> };
const frame = (): Frame => ({ width: 640, height: 360, close: vi.fn() });

function worker({
  software = false,
  noWebGl = false,
  missingPose = false,
  fails = () => false,
}: {
  software?: boolean;
  noWebGl?: boolean;
  missingPose?: boolean;
  fails?: (kind: string, delegate: string, phase: string) => boolean;
} = {}) {
  const tasks: {
    kind: string;
    options: TaskOptions;
    task: {
      close: ReturnType<typeof vi.fn>;
      detect: ReturnType<typeof vi.fn>;
      detectForVideo: ReturnType<typeof vi.fn>;
    };
  }[] = [];
  const create = (kind: string) =>
    vi.fn(async (_files, options: TaskOptions) => {
      const delegate = options.baseOptions.delegate;
      if (fails(kind, delegate, "create"))
        throw new Error("synthetic creation failure");
      const run = (image: Frame) => {
        if (fails(kind, delegate, image.width === 64 ? "warmup" : "frame"))
          throw new Error("synthetic inference failure");
        return {
          landmarks:
            kind === "pose" && missingPose ? [] : [[{ x: 0.5, y: 0.5, z: 0 }]],
        };
      };
      const task = {
        close: vi.fn(),
        detect: vi.fn(run),
        detectForVideo: vi.fn((image: Frame, timestamp: number) => {
          expect(timestamp).toBeGreaterThanOrEqual(0);
          return run(image);
        }),
      };
      tasks.push({ kind, options, task });
      return task;
    });
  const createPose = create("pose"),
    createHand = create("hand");
  let now = 0;
  const context = {
    importScripts: vi.fn(),
    postMessage: vi.fn(),
    performance: { now: () => now++ },
    OffscreenCanvas: class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext(type: string) {
        if (type === "2d") return { fillStyle: "", fillRect: vi.fn() };
        if (noWebGl) return null;
        return {
          getExtension: (name: string) =>
            name === "WEBGL_debug_renderer_info"
              ? { UNMASKED_VENDOR_WEBGL: 1, UNMASKED_RENDERER_WEBGL: 2 }
              : { loseContext: vi.fn() },
          getParameter: () => (software ? "SwiftShader" : "Test hardware GPU"),
        };
      }
      transferToImageBitmap() {
        return { width: this.width, height: this.height, close: vi.fn() };
      }
    },
    Vision: {
      FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
      PoseLandmarker: { createFromOptions: createPose },
      HandLandmarker: { createFromOptions: createHand },
    },
    onmessage: undefined as
      ((event: { data: Record<string, unknown> }) => Promise<void>) | undefined,
  };
  vm.runInNewContext(script, context);
  return {
    tasks,
    createHand,
    messages: context.postMessage,
    send: (data: Record<string, unknown>) => context.onmessage!({ data }),
  };
}

describe("actual pose worker dispatch and fallback", () => {
  it.each(["IMAGE", "VIDEO"] as const)(
    "runs %s with each selectable model and hands explicitly disabled",
    async (runningMode) => {
      for (const model of ["lite", "heavy"] as const) {
        const w = worker();
        await w.send({
          type: "init",
          options: { runningMode, model, handTracking: false },
        });
        const image = frame();
        await w.send({ type: "frame", frame: image, timestamp: 1234 });
        const pose = w.tasks[0];
        expect(pose.options).toMatchObject({
          runningMode,
          baseOptions: {
            delegate: "GPU",
            modelAssetPath: `/pose/pose_landmarker_${model}.task`,
          },
        });
        expect(
          pose.task[runningMode === "VIDEO" ? "detectForVideo" : "detect"],
        ).toHaveBeenCalledTimes(2);
        expect(
          pose.task[runningMode === "VIDEO" ? "detect" : "detectForVideo"],
        ).not.toHaveBeenCalled();
        if (runningMode === "VIDEO")
          expect(pose.task.detectForVideo).toHaveBeenLastCalledWith(
            image,
            1234,
          );
        expect(w.createHand).not.toHaveBeenCalled();
        expect(image.close).toHaveBeenCalledOnce();
        expect(w.messages).toHaveBeenLastCalledWith(
          expect.objectContaining({
            type: "sample",
            timestamp: 1234,
            hands: null,
            inferenceMs: expect.any(Number),
          }),
        );
      }
    },
  );
  it("defaults to VIDEO and Lite", async () => {
    const w = worker();
    await w.send({ type: "init" });
    expect(w.tasks[0].options.runningMode).toBe(
      DEFAULT_POSE_OPTIONS.runningMode,
    );
    expect(w.tasks[0].options.baseOptions.modelAssetPath).toBe(
      "/pose/pose_landmarker_lite.task",
    );
    expect(w.createHand).toHaveBeenCalledOnce();
  });
  it.each([{ software: true }, { noWebGl: true }])(
    "uses CPU directly for unavailable hardware WebGL: %j",
    async (scenario) => {
      const w = worker(scenario);
      await w.send({ type: "init", options: { handTracking: false } });
      expect(w.tasks.map((t) => t.options.baseOptions.delegate)).toEqual([
        "CPU",
      ]);
      expect(w.messages).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: "ready",
          backend: expect.objectContaining({
            pose: "CPU",
            fallback: expect.any(String),
          }),
        }),
      );
    },
  );
  it.each(["create", "warmup"])(
    "falls back when GPU %s fails, preserving Heavy/VIDEO",
    async (phase) => {
      const w = worker({
        fails: (_, delegate, current) =>
          delegate === "GPU" && current === phase,
      });
      await w.send({
        type: "init",
        options: { model: "heavy", runningMode: "VIDEO", handTracking: false },
      });
      expect(w.tasks.at(-1)?.options).toMatchObject({
        runningMode: "VIDEO",
        baseOptions: {
          delegate: "CPU",
          modelAssetPath: "/pose/pose_landmarker_heavy.task",
        },
      });
      if (phase === "warmup")
        expect(w.tasks[0].task.close).toHaveBeenCalledOnce();
      expect(w.messages).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "ready" }),
      );
    },
  );
  it("recovers a runtime GPU failure once and resumes on CPU without a model switch", async () => {
    const w = worker({
      fails: (_, delegate, phase) => delegate === "GPU" && phase === "frame",
    });
    await w.send({
      type: "init",
      options: { model: "heavy", handTracking: false },
    });
    await w.send({ type: "frame", frame: frame(), timestamp: 1000 });
    expect(w.messages).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "sample", points: [] }),
    );
    await w.send({ type: "frame", frame: frame(), timestamp: 1100 });
    expect(w.tasks.map((t) => t.options.baseOptions.delegate)).toEqual([
      "GPU",
      "CPU",
    ]);
    expect(w.tasks[0].task.close).toHaveBeenCalledOnce();
    expect(w.tasks[1].options.baseOptions.modelAssetPath).toBe(
      "/pose/pose_landmarker_heavy.task",
    );
    expect(w.messages).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "sample",
        points: [{ x: 0.5, y: 0.5, z: 0 }],
      }),
    );
  });
  it("reports failed CPU fallback and releases the frame", async () => {
    const w = worker({
      fails: (_, delegate, phase) => phase === "frame" || delegate === "CPU",
    });
    await w.send({ type: "init", options: { handTracking: false } });
    const image = frame();
    await w.send({ type: "frame", frame: image, timestamp: 1000 });
    expect(w.messages).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "error" }),
    );
    expect(image.close).toHaveBeenCalledOnce();
  });
  it("keeps pose running when enabled hands fail outside dev mode", async () => {
    const w = worker({
      fails: (kind, _, phase) => kind === "hand" && phase === "frame",
    });
    await w.send({
      type: "init",
      options: {
        devMode: false,
        handTracking: true,
      } satisfies Partial<PoseOptions>,
    });
    await w.send({ type: "frame", frame: frame(), timestamp: 1000 });
    expect(
      w.tasks
        .filter((t) => t.kind === "hand")
        .map((t) => t.options.baseOptions.delegate),
    ).toEqual(["GPU", "CPU"]);
    expect(w.messages).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "backend",
        backend: expect.objectContaining({
          pose: "GPU",
          hand: null,
          handError: expect.any(String),
        }),
      }),
    );
    expect(w.messages).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "sample",
        hands: null,
        points: [{ x: 0.5, y: 0.5, z: 0 }],
      }),
    );
    for (const t of w.tasks.filter((t) => t.kind === "hand"))
      expect(t.task.close).toHaveBeenCalledOnce();
  });
  it("drops duplicate/backwards frames and keeps VIDEO timestamps monotonic", async () => {
    const w = worker();
    await w.send({ type: "init" });
    for (const timestamp of [1000, 1000, 999, 1100]) {
      const image = frame();
      await w.send({ type: "frame", timestamp, frame: image });
      expect(image.close).toHaveBeenCalledOnce();
    }
    expect(w.tasks[0].task.detectForVideo.mock.calls.map((c) => c[1])).toEqual([
      0, 1000, 1100,
    ]);
    expect(
      w.messages.mock.calls.filter(([m]) => m.type === "dropped"),
    ).toHaveLength(2);
  });
  it("tracks fingers without a visible torso, at a bounded rate, independently of the lab", async () => {
    const w = worker({ missingPose: true });
    await w.send({ type: "init" });
    for (const timestamp of [1000, 1100, 1200])
      await w.send({ type: "frame", frame: frame(), timestamp });
    expect(w.messages).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "sample",
        points: [],
        hands: expect.any(Array),
      }),
    );
    expect(
      w.tasks.find((t) => t.kind === "hand")!.task.detectForVideo,
    ).toHaveBeenCalledTimes(3);
    const off = worker();
    await off.send({
      type: "init",
      options: { devMode: true, handTracking: false },
    });
    expect(off.createHand).not.toHaveBeenCalled();
  });
});
