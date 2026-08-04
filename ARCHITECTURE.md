# Number Nova architecture

## Design constraints

- Landscape-only, iOS-first, Expo SDK 54.
- Motion steering is the primary input, touch is a mandatory fallback.
- A fixed-rule game engine remains independent from native frameworks.
- The educational task is performed inside flight, not on a separate quiz screen.
- The first release must work offline and avoid collecting child data.

## Runtime flow

1. `GameScreen` starts `ExpoMotionInput` from a user gesture.
2. Motion is calibrated, filtered, normalized, and written to an input ref.
3. A request-animation-frame loop advances `GameEngine` with bounded delta time.
4. `GameEngine` publishes an immutable `GameSnapshot`.
5. `GameCanvas` projects world `x/y/z` into a 2.5D screen position and draws the snapshot.
6. `GameHud` displays objective, health, score, and power-ups.
7. `ExpoFeedbackService` speaks new objectives and emits haptic feedback.
8. `ExpoProgressRepository` persists only aggregate local progress.

## Core extension points

- New learning modes extend `ChallengeDefinition` generation.
- New input implementations can replace `ExpoMotionInput` without changing the engine.
- Production art can replace procedural renderers without changing simulation.
- RevenueCat can implement an entitlement port after product validation.

## Performance posture

The current vertical slice publishes snapshots through React for clarity and fast MVP delivery. Before content scale-up:

- Profile a release build on older supported iPhones.
- Keep entity counts bounded and pooled in the engine.
- Move debris and particles to Skia Atlas buffers.
- Move frame-critical transforms to Reanimated shared values if profiling proves necessary.
- Keep React updates limited to session snapshots and major UI transitions.
