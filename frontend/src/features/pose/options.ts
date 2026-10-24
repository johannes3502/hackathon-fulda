export type PoseOptions = {
  runningMode: "IMAGE" | "VIDEO";
  model: "lite" | "heavy";
  devMode: boolean;
  handTracking: boolean;
};

export const DEFAULT_POSE_OPTIONS: Readonly<PoseOptions> = Object.freeze({
  runningMode: "VIDEO",
  model: "lite",
  devMode: false,
  handTracking: true,
});

export type PoseRuntime = {
  model: PoseOptions["model"];
  runningMode: PoseOptions["runningMode"];
  delegate: "GPU" | "CPU";
};
