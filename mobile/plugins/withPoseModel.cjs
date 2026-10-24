const {
  withXcodeProject,
  withDangerousMod,
  IOSConfig,
} = require("expo/config-plugins");
const { copyFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const name = "pose_landmarker_lite.task";
const source = path.resolve(__dirname, "../../frontend/public/pose", name);
module.exports = (config) => {
  config = withXcodeProject(config, (cfg) => {
    copyFileSync(source, path.join(cfg.modRequest.platformProjectRoot, name));
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: name,
      groupName: cfg.modRequest.projectName,
      project: cfg.modResults,
      isBuildFile: true,
    });
    return cfg;
  });
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const folder = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/assets",
      );
      mkdirSync(folder, { recursive: true });
      copyFileSync(source, path.join(folder, name));
      return cfg;
    },
  ]);
};
