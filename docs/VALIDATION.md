# MVP validation matrix

## Automated domain and bundle validation

- Expo SDK 54 dependency compatibility
- TypeScript strict type checking
- Deterministic number, addition, and collection challenge generation
- Wrong-answer rejection
- Mission-to-boss progression
- Three-hit boss completion
- Limited shield and magnet charges
- Motion calibration, normalization, dead zone, and clamping
- Screen-relative portrait, landscape-left, landscape-right, and upside-down tilt mapping
- Android production Metro export
- iOS production Metro export

## Automated native render validation

The `Render Smoke` workflow uses a standalone Android release build rather than Expo Go or a live Metro server.

- Expo Android prebuild
- x86_64 release APK build
- API 35 Pixel 7 emulator boot
- Release APK installation and cold launch
- Menu visibility assertion
- Calibration-screen visibility assertion
- Touch-control gameplay launch
- Stable gameplay HUD assertions for shield and magnet controls
- Simulated steering swipe
- Shield activation
- Five 2400 x 1080 screenshots
- Landscape and minimum-resolution checks
- Brightness, contrast, color-complexity, edge-detail, and nonblank checks
- Game-specific blue, cyan, warm, and yellow rendering checks across the sequence
- Frame-difference checks to prove navigation and gameplay states changed
- Fatal Android and React Native log scan
- Maestro JUnit result
- Uploaded screenshots, render analysis, logcat, UI hierarchy, graphics statistics, and release APK

The workflow runs for relevant source changes, matching pull requests, manual dispatches, and a weekly scheduled check.

## Simulated behavior

- Gyro-independent gameplay through touch steering
- Deterministic game sessions through seeded randomness
- Motion behavior through pure `MotionFilter` tests
- Orientation behavior through screen-relative gravity mapping tests
- Menu-to-game navigation through Maestro
- Steering input through a repeatable emulator swipe
- Power-up activation through a repeatable emulator tap

## Diagnostic only

The software-rendered Android emulator reports frame statistics, but these values are not used as a release performance gate. Emulator GPU timing does not represent physical-device rendering performance.

## Physical device required

- Final child-friendly sensitivity and smoothing values
- Actual DeviceMotion latency
- Gyroscope and accelerometer behavior while the phone is held by a child
- iPhone and iPad thermal and frame-rate profiling
- Representative Android GPU performance
- Voice volume, haptic feel, and safe grip ergonomics
- Supervised usability testing with children ages 4-7
