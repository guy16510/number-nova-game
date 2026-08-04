#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.guy16510.numbernova"
ARTIFACT_DIR="artifacts"
RENDER_DIR="${ARTIFACT_DIR}/render"
LOG_DIR="${ARTIFACT_DIR}/logs"
APK_PATH="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"

mkdir -p "${RENDER_DIR}" "${LOG_DIR}"
rm -f "${RENDER_DIR}"/*.png

if [[ ! -f "${APK_PATH}" ]]; then
  echo "Release APK not found at ${APK_PATH}" >&2
  find android/app/build/outputs -maxdepth 5 -type f -name '*.apk' -print || true
  exit 1
fi

adb wait-for-device
adb shell input keyevent 82 || true
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
adb logcat -c

adb install -r "${APK_PATH}"
adb shell pm clear "${APP_ID}" >/dev/null || true

export PATH="${HOME}/.maestro/bin:${PATH}"
maestro --version
maestro test e2e/render-smoke.yaml \
  --format junit \
  --output "${ARTIFACT_DIR}/maestro-results.xml" \
  --test-output-dir "${ARTIFACT_DIR}/maestro-output"

adb shell pidof "${APP_ID}" > "${LOG_DIR}/app-pid.txt"
adb shell dumpsys gfxinfo "${APP_ID}" framestats > "${LOG_DIR}/gfxinfo-framestats.txt" || true
adb shell dumpsys SurfaceFlinger --latency > "${LOG_DIR}/surfaceflinger-latency.txt" || true
adb logcat -d -v threadtime > "${LOG_DIR}/logcat.txt"
adb shell uiautomator dump /sdcard/window.xml >/dev/null || true
adb pull /sdcard/window.xml "${LOG_DIR}/window.xml" >/dev/null || true

mapfile -t screenshots < <(find "${RENDER_DIR}" -maxdepth 1 -type f -name '*.png' | sort)
if [[ ${#screenshots[@]} -lt 4 ]]; then
  echo "Expected at least four screenshots, found ${#screenshots[@]}" >&2
  find "${ARTIFACT_DIR}" -maxdepth 4 -type f -print
  exit 1
fi

python3 scripts/validate-render.py "${screenshots[@]}" --report "${ARTIFACT_DIR}/render-analysis.json"

if grep -E "FATAL EXCEPTION|AndroidRuntime.*FATAL|ReactNativeJS.*(TypeError|Invariant Violation|Unhandled|Error:)" "${LOG_DIR}/logcat.txt"; then
  echo "Fatal Android or React Native error found in logcat" >&2
  exit 1
fi

echo "Render smoke validation passed with ${#screenshots[@]} screenshots."
