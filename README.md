# Number Nova

A landscape, motion-controlled educational space game for ages 4-7, built with **Expo SDK 54**, React Native, TypeScript, and React Native Skia.

> Tilt to fly. Solve to blast. Save the galaxy.

## MVP gameplay

- Calibrate the phone in landscape, then tilt to steer the ship.
- Lock onto the correct numbered asteroid and the ship fires automatically.
- Complete number recognition, addition, and star-collection missions.
- Avoid hazards, use shield and magnet power-ups, then defeat a three-hit boss.
- Motion input falls back to drag steering when sensors are unavailable.
- Progress is local-only. There are no accounts, ads, chat, or child-facing purchases.

## Architecture

The game rules are pure TypeScript and do not import React Native, Expo, or Skia.

```text
React Native screens and HUD
          |
          v
GameScreen session controller
          |
          v
Pure GameEngine and ChallengeFactory
          |
   +------+------+------+
   |             |      |
Motion adapter  Feedback  Local progress
          |
          v
React Native Skia renderer
```

SOLID boundaries:

- `GameEngine` owns deterministic simulation and game rules.
- `ChallengeFactory` creates educational content.
- `ExpoMotionInput` implements the motion-input port.
- `MotionFilter` is pure and independently tested.
- `ExpoFeedbackService` isolates speech and haptics.
- `ExpoProgressRepository` isolates local persistence.
- `GameCanvas` renders snapshots and does not own rules.

## Run locally

Requirements:

- Node.js 20.19 or newer
- Xcode or Android Studio for native development builds
- Expo CLI through `npx`

```bash
npm install
npm run validate
npm run start:go
```

The MVP can run in Expo Go because its current native libraries are included there. For production-like sensor and splash validation, use a development build:

```bash
npx eas-cli@latest build --profile development --platform ios
npm start
```

Use **Calibrate & Launch** on a physical phone. Simulators do not provide representative DeviceMotion data, so use the touch fallback there.

## Validation

```bash
npm run typecheck
npm test
npm run export:android
```

GitHub Actions validates Expo SDK 54 dependency compatibility, strict TypeScript, 13 deterministic game and motion tests, and an Android production Metro export on every push and pull request.

The automated suite covers challenge generation, answer selection, mission progression, collection behavior, limited power-up charges, boss completion, motion calibration, input normalization, and screen-relative landscape tilt mapping.

## EAS setup

The repository contains a placeholder project ID. Before EAS builds:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Then commit the generated `extra.eas.projectId` value in `app.json`.

## MVP limitations

- Visual content is a Skia-rendered 2.5D vertical slice, not true 3D.
- Text-to-speech is used for prompts until recorded voice assets are produced.
- RevenueCat and the paid world gate are intentionally left out until the gameplay is validated with children.
- The current vertical slice uses resolution-independent Skia artwork. Production sprite atlases can replace it without changing game rules.

## Next production work

1. Replace procedural ship, asteroid, hazard, and boss art with isolated production atlases.
2. Record consistent voice prompts and add music and sound effects.
3. Test motion tuning with children ages 4-7 on multiple physical devices.
4. Add a parent-gated one-time full-game purchase after retention is validated.
5. Profile release builds and move high-volume sprites into Skia Atlas buffers if needed.
