# Local pose assets

`pose_landmarker_lite.task`: official Google MediaPipe Pose Landmarker Lite,
float16, version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

`hand_landmarker.task`: official Google MediaPipe Hand Landmarker, float16,
version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

It runs only in the local pose-lab pocket heuristic. Its landmarks are not
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

Both models use the same settings as `hassan-poselog`: `IMAGE`, confidence 0.5,
pose Lite, up to two hands. The worker starts on the GPU delegate when a
hardware WebGL2 context is available. It falls back to CPU if WebGL2 is
missing, the renderer is software, or GPU creation, warm-up, or inference
fails. The dev status view reports the active delegate and WebGL renderer.
