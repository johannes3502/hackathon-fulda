import { Config } from "@remotion/cli/config";

// PNG-Zwischenframes: keine JPEG-Artefakte in dunklen Gradient-Flächen
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setConcurrency(8);
Config.setChromiumOpenGlRenderer("angle");
