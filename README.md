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
- `ExpoFeedbackService` isolates speech, haptics, and sound playback.
- `ExpoProgressRepository` isolates local persistence.
- `GameCanvas` renders snapshots and does not own rules.

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

`npm start` now explicitly targets Expo Go and clears Metro's cache. Scan the QR code with the iPhone Camera app, then open it in Expo Go. The phone and development computer must be able to reach each other on the network.

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

The repository no longer contains a fake EAS project ID. Link it once before the first cloud build:

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
- **EAS says the project ID is invalid:** run `npx eas-cli@latest init`. The old placeholder ID was intentionally removed.
- **The IPA installs but will not launch:** enable Settings > Privacy & Security > Developer Mode and confirm the device was registered before the build was created.
- **The app cannot be installed on this device:** register the device and create a new development or preview build.
- **Metro connects to an old bundle or fails after dependency changes:** run `npm run start:go:clear`, or rebuild the native client after `npm run ios:prebuild`.
- **Motion does not work in a simulator:** use a physical phone or the touch-control fallback.

## Validation

```bash
npm run verify:ios
npm run typecheck
npm test
npm run export:android
npm run export:ios
```

The standard CI workflow validates Expo SDK 54 dependency compatibility, the resolved Expo app configuration, strict TypeScript, deterministic game tests, and Android and iOS production Metro exports.

The separate `iOS Native Build` workflow runs on macOS, generates the iOS native project, installs CocoaPods, and compiles the complete Xcode workspace for an iOS Simulator without code signing. This catches native module and CocoaPods failures that a JavaScript export cannot detect.

### Android emulator render smoke test

The `Render Smoke` workflow performs a black-box native validation:

1. Generates the Android native project with Expo prebuild.
2. Builds a standalone x86_64 release APK.
3. Boots an API 35 Pixel 7 emulator with software GPU rendering.
4. Installs and launches the release application without Metro.
5. Uses Maestro to navigate the menu, calibration, touch steering, gameplay, and shield activation.
6. Captures redundant gameplay screenshots.
7. Rejects blank, portrait, low-contrast, low-detail, or visually static output.
8. Scans Android and React Native logs for fatal runtime errors.
9. Uploads screenshots, analysis, Maestro results, logs, frame statistics, and the release APK.

## MVP limitations

- Visual content is a Skia-rendered 2.5D vertical slice, not true 3D.
- Text-to-speech is used for prompts until recorded voice assets are produced.
- RevenueCat and the paid world gate are intentionally left out until gameplay is validated with children.
- Final motion feel, thermal behavior, audio volume, and frame rate still require physical iPhone, iPad, and Android testing.
