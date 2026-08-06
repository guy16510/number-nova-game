# Number Nova production release

## What is ready

- Deterministic App Store, adaptive icon, and landscape splash generation
- Stable iOS bundle identifier and Android package name
- Version and build-number configuration
- EAS development, preview, production, and submission profiles
- Local-only playtest telemetry exposed behind the parent gate
- No accounts, ads, third-party analytics, child names, precise location, or remote telemetry

## One-time account setup

1. Run `npx eas-cli@latest login`.
2. Run `npx eas-cli@latest init` to link the Expo project and write the real project ID.
3. Confirm the Apple Developer team and App Store Connect application.
4. Create the Google Play application using package `com.guy16510.numbernova`.
5. Complete store privacy questionnaires based on local-only storage and motion use.

## Build commands

- iOS TestFlight candidate: `npm run ios:eas:production`
- Android internal-track candidate: `npm run android:eas:production`
- Submit iOS: `npm run submit:ios`
- Submit Android draft: `npm run submit:android`

## Release gate

Do not promote beyond TestFlight or Play internal testing until physical-device sessions cover small and large iPhones, iPad, and a midrange Android device. Review completion rate, early exits, collision rate, mission duration, audio balance, thermal behavior, and sustained frame pacing.

## Privacy posture

Playtest data is limited to aggregate gameplay behavior and is stored only in the application sandbox. Resetting local data removes both learning progress and playtest sessions. Any future remote analytics proposal requires a separate privacy review and must not include advertising identifiers or unnecessary child data.
