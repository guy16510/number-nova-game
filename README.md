# Number Nova

A landscape, motion-controlled educational space game for ages 4-7, built with **Expo SDK 54**, React Native, TypeScript, and React Native Skia.

> Tilt to fly. Solve to blast. Save the galaxy.

## Gameplay

- Calibrate the phone in landscape, then tilt to steer the ship. Touch steering remains available when motion sensors are unavailable.
- Aim at numbered alien ships and press FIRE to launch real projectiles. Auto-fire is not required.
- Dodge asteroid tunnels, plasma mines, enemy shots, and moving alien formations.
- Fight number drones, zigzag aliens, bombers, shield ships, and a three-stage mothership boss.
- Collect triple-shot, comet-missile, rainbow-beam, shield, and star-magnet power-ups.
- Complete rescue runs, number gates, asteroid defense, memory missions, rapid-blast challenges, and star trails.
- Earn local badges, laser colors, engine trails, ship paint, and companion rewards.
- Progress is local-only. There are no accounts, ads, chat, or child-facing purchases.

## Progressive math

The first mission starts at `1 + 1`. Difficulty then builds gradually through:

- Small-number addition
- Number recognition and counting
- Larger addition problems
- Greater-than comparison
- Subtraction
- Memory and rapid-recognition challenges
- Answers that grow toward 20 as mastery improves

Math difficulty and action difficulty adapt independently. Accuracy, answer speed, collisions, and missed shots influence future challenge complexity, target movement, hazards, lock radius, and enemy fire rate. A child who needs easier math can still receive exciting combat at a manageable pace.

## Architecture

The game rules are pure TypeScript and do not import React Native, Expo, or Skia.

```text
React Native screens, HUD, and Skia renderer
                    |
                    v
           GameScreen controller
                    |
                    v
            Pure GameEngine
        /        |        |        \
Challenge   WaveDirector  Combat   Collision
Factory                   System    System
                    |
                    v
       AdaptiveDifficultyDirector

Infrastructure adapters:
Motion input, audio and haptics, local progress
```

SOLID boundaries:

- `GameEngine` coordinates the session but depends on domain interfaces rather than presentation or Expo APIs.
- `ChallengeFactory` owns the progressive educational curriculum.
- `WaveDirector` owns encounter pacing, enemy formations, hazards, power-ups, and boss stages.
- `CombatSystem` owns projectile movement and target hits.
- `CollisionSystem` owns ship, pickup, hazard, and projectile collision rules.
- `AdaptiveDifficultyDirector` adjusts math and action difficulty from observed performance.
- `ExpoMotionInput` implements the motion-input port.
- `ExpoFeedbackService` isolates speech, music state, haptics, and sound playback.
- `ExpoProgressRepository` isolates local persistence and unlocked rewards.
- `GameCanvas` renders immutable snapshots and owns no game rules.

## Install and validate

Requirements:

- Node.js 20.19 or newer
- Expo Go for the fastest physical iPhone test
- macOS and Xcode for a local native iOS build
- An Apple Developer account for EAS device builds

```bash
npm install
npm run doctor
npm run validate
```

## Run on an iPhone with Expo Go

This is the default and fastest path. It does not require an EAS project, Apple signing, or a custom development client.

```bash
npm start
```

`npm start` explicitly targets Expo Go and clears Metro's cache. Scan the QR code with the iPhone Camera app, then open it in Expo Go. The phone and development computer must be able to reach each other on the network.

Use this equivalent command when a cache reset is not needed:

```bash
npm run start:go
```

Do not use `npm run start:dev-client` with Expo Go. That command only works after a Number Nova development build has been installed on the phone.

## Run a local native build on a connected iPhone

Connect the iPhone to a Mac, trust the Mac, enable Developer Mode on the iPhone, and run:

```bash
npm run ios:device
```

This invokes `expo run:ios --device`, generates the native iOS project when needed, uses Xcode signing, installs the app, and starts Metro.

When native dependencies or app plugins change, rebuild from a clean generated project:

```bash
npm run ios:prebuild
npm run ios:device
```

## Create an EAS development build for a physical iPhone

The repository does not contain a fake EAS project ID. Link it once before the first cloud build:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Register the physical iPhone before building. The generated ad hoc provisioning profile only includes devices registered at build time.

```bash
npm run ios:eas:register-device
npm run ios:eas:development
```

After the development build is installed, start Metro with:

```bash
npm run start:dev-client
```

A newly registered device requires a new build or a re-signed build. Developer Mode must be enabled on iOS 16 or newer.

For a standalone internal build that runs without Metro:

```bash
npm run ios:eas:preview
```

## Common iPhone failure modes

- **QR opens a missing development build message:** use `npm start` for Expo Go, or install an EAS development build before using `npm run start:dev-client`.
- **EAS says the project ID is invalid:** run `npx eas-cli@latest init`.
- **The IPA installs but will not launch:** enable Settings > Privacy & Security > Developer Mode and confirm the device was registered before the build was created.
- **The app cannot be installed on this device:** register the device and create a new development or preview build.
- **Metro connects to an old bundle or fails after dependency changes:** run `npm run start:go:clear`, or rebuild the native client after `npm run ios:prebuild`.
- **Motion does not work in a simulator:** use a physical phone or the touch-control fallback.

## Validation

```bash
npm run verify:ios
npm run typecheck
npm test
npm run simulate
npm run export:android
npm run export:ios
```

The deterministic simulation suite includes randomized invariant stress runs and solver-driven complete missions through every boss stage. The standard CI workflow validates Expo SDK 54 dependency compatibility, the resolved Expo app configuration, strict TypeScript, deterministic tests, and Android and iOS production Metro exports.

The separate `iOS Native Build` workflow runs on macOS, generates the iOS native project, installs CocoaPods, and compiles the complete Xcode workspace for an iOS Simulator without code signing. This catches native module and CocoaPods failures that a JavaScript export cannot detect.

### Android emulator render smoke test

The `Render Smoke` workflow performs a black-box native validation:

1. Runs the complete deterministic validation suite.
2. Generates the Android native project with Expo prebuild.
3. Builds a standalone x86_64 release APK.
4. Boots an API 35 Pixel 7 emulator with software GPU rendering.
5. Installs and launches the release application without Metro.
6. Uses Maestro to navigate the menu, calibration, touch steering, firing, gameplay, shield activation, pause, resume, and exit.
7. Captures redundant gameplay screenshots.
8. Rejects blank, portrait, low-contrast, low-detail, or visually static output.
9. Scans Android and React Native logs for fatal runtime errors.
10. Uploads screenshots, analysis, Maestro results, logs, frame statistics, and the release APK.

## Current limitations

- Visual content is a Skia-rendered 2.5D game, not a full 3D engine.
- Text-to-speech is used for prompts until recorded voice assets are produced.
- RevenueCat and paid world gates remain intentionally excluded until gameplay is validated with children.
- Final motion feel, thermal behavior, audio balance, and sustained frame rate still require physical iPhone, iPad, and Android playtesting.
