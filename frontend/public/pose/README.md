# Local pose assets

`pose_landmarker_lite.task`: official Google MediaPipe Pose Landmarker Lite,
float16, version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

`pose_landmarker_heavy.task`: official Google MediaPipe Pose Landmarker Heavy,
float16, version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task

SHA-256: `64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b`

`hand_landmarker.task`: official Google MediaPipe Hand Landmarker, float16,
version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

It runs locally for finger tracking, independently of the pose lab. Its landmarks are not
logged and are not sent to a backend or third-party service.

Model documentation and model card links:
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker

`runtime/` is generated from the pinned `@mediapipe/tasks-vision` npm package by
`scripts/prepare-pose.mjs`, before dev/build. MediaPipe runtime: Apache-2.0;
upstream source/license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
The generated bundle retains upstream headers. Deploy these static files with the
frontend; clients load them from the app's own origin.

`worker.js` runs the detector and releases transferred image frames. It does not
send camera content or landmarks to a backend or third-party service.

Pose defaults to Lite and `VIDEO`. The **Analysis features** controls select
Lite/Heavy and `IMAGE`/`VIDEO` independently. Both model assets are local;
there is no automatic model downgrade. VIDEO uses `detectForVideo` with
monotonically increasing frame timestamps; IMAGE uses `detect`. Warm-up
uses the selected mode. Model confidence settings are 0.5, not accuracy claims.

The worker prefers hardware WebGL2/GPU, with CPU fallback on unsupported or
software WebGL, creation/warm-up failure, and runtime inference failure.
Diagnostics report the actual delegate, model, mode, renderer and fallback.
**Track fingers** is on by default and runs Hand Landmarker at most 5 Hz,
even when no torso is detected. It uses the same running mode, up to two hands
and its own CPU fallback. Hand failures leave pose running. Disabling the flag
skips the hand model entirely; **Pose lab** remains a separate diagnostic tool.
