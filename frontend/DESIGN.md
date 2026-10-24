# Pitch Coach design

The presenter is rehearsing at a laptop in a brightly lit hackathon hall, with limited time and attention. A light workspace provides readable controls; a dark stage separates the practice area from feedback.

Restrained palette: neutral page, white surfaces, dark slate text and stage, blue primary action. The explicit plan palette takes precedence over generated color suggestions. One system sans family, 16px body, tabular timers, 12–16px panels, 44px main controls. Semantic warning/error colors only signal those states.

## Mobbin references inspected, 2026-10-24
- [Riverside studio](https://mobbin.com/screens/57ce5e02-c5ef-4349-8a2f-9dce51cc8315): large stage beside a compact secondary column, controls below the stage.
- [VEED recording](https://mobbin.com/screens/dde42152-7be1-49c9-8311-6390504a2ef5): prominent timer and persistent session actions.
- [Typeform report](https://mobbin.com/screens/71dbe2c0-580a-4814-a068-2e13cb4a5559): quiet report typography and generous separation between findings.

These inform structure, not copied assets. On mobile, stack stage and feedback; use disclosures for secondary information. Motion only communicates changing state and respects reduced motion.

The added camera workspace carries the Riverside/VEED stage-and-feedback layout into actual recording. Review separates the full video from category frequencies and the next practice action; the feedback browser puts category filtering alongside a native video player. Mobile puts playback before the section list. Keep script labels adjacent to feedback and distinguish observation counts from performance scores.

Design-hook review: the generic-font warning is contextually intentional, not a defect for this product workspace. The product-register guidance allows a familiar system sans stack. Keeping Arial/Helvetica fallbacks avoids remote font loading and retains the plan’s single-font approach; no hook suppression was added.
