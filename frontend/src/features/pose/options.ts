export type PoseOptions = {
  runningMode: "IMAGE" | "VIDEO";
  model: "lite" | "heavy";
  devMode: boolean;
};

export const DEFAULT_POSE_OPTIONS: Readonly<PoseOptions> = Object.freeze({
  runningMode: "VIDEO",
  model: "lite",
  devMode: false,
});

export type PoseRuntime = {
  model: PoseOptions["model"];
  runningMode: PoseOptions["runningMode"];
  delegate: "GPU" | "CPU";
};
