# Local pose assets

`pose_landmarker_lite.task`: official Google MediaPipe Pose Landmarker Lite,
float16, version 1. Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

Model documentation and model card links:
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker

`hand_landmarker.task`: official Google MediaPipe Hand Landmarker, float16,
version 1 (21 landmarks per hand, up to two hands). Downloaded unchanged from:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

Model documentation: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker

`runtime/` is generated from the pinned `@mediapipe/tasks-vision` npm package by
`scripts/prepare-pose.mjs`, before dev/build. MediaPipe runtime: Apache-2.0;
upstream source/license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
The generated bundle retains upstream headers. Deploy these static files with the
frontend; clients load them from the app's own origin.

`worker.js` runs the detector and releases transferred image frames. It does not
send camera content or landmarks to a backend or third-party service.
