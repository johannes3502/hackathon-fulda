# Pitch Coach

## Register
product

## Platform
web

## Purpose and users
Presenters rehearse a pitch, answer a demanding judge, inspect transcript evidence, and retry one weak section. The initial experience is a deterministic frontend demo for the hackathon team and jury, with no backend or device permission required.

## Principles
- Practice is the primary task; no account, marketing funnel, or history dashboard.
- Make the next useful action obvious and keep controls reachable on a laptop or phone.
- Label simulated analysis everywhere, including alongside a real camera preview.
- Evidence precedes feedback. Missing observations are not negative scores.
- Support keyboard use, visible focus, readable contrast, and reduced motion.

Source: Pitch_Coach_Frontend_Plan.md, implemented 2026-10-24.

## Camera workspace scope, 2026-10-24

User-requested extension: record raw camera input, stream it through a replaceable backend contract, show live feedback, review statistics and actual video, then revisit every feedback section. Default local demo uses real silent video with explicitly scripted markers. Backend mode sends encoded video and displays validated observations. Recordings are temporary browser-memory objects with a download action; no persistent history or detector is implied. The original no-permission sample journey remains available.
