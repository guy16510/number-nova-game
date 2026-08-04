#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.guy16510.numbernova"
ARTIFACT_DIR="artifacts"
RENDER_DIR="${ARTIFACT_DIR}/render"
LOG_DIR="${ARTIFACT_DIR}/logs"
MAESTRO_OUTPUT_DIR="${ARTIFACT_DIR}/maestro-output"
APK_PATH="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"

mkdir -p "${RENDER_DIR}" "${LOG_DIR}" "${MAESTRO_OUTPUT_DIR}"
rm -f "${RENDER_DIR}"/*.png
rm -rf "${MAESTRO_OUTPUT_DIR:?}"/*

sync_screenshots() {
  find "${MAESTRO_OUTPUT_DIR}" \
    -type f \
    -path '*/takeScreenshot/artifacts/render/*.png' \
    -print0 2>/dev/null |
    while IFS= read -r -d '' screenshot; do
      cp "${screenshot}" "${RENDER_DIR}/$(basename "${screenshot}")"
    done
}

collect_diagnostics() {
  set +e
  sync_screenshots
  adb shell pidof "${APP_ID}" > "${LOG_DIR}/app-pid.txt"
  adb shell dumpsys gfxinfo "${APP_ID}" framestats > "${LOG_DIR}/gfxinfo-framestats.txt"
  adb shell dumpsys SurfaceFlinger --latency > "${LOG_DIR}/surfaceflinger-latency.txt"
  adb logcat -d -v threadtime > "${LOG_DIR}/logcat.txt"
  adb shell uiautomator dump /sdcard/window.xml >/dev/null
  adb pull /sdcard/window.xml "${LOG_DIR}/window.xml" >/dev/null
  set -e
}

run_maestro_flow() {
  local name="$1"
  local flow="$2"
  maestro test "${flow}" \
    --format junit \
    --output "${ARTIFACT_DIR}/maestro-${name}-results.xml" \
    --test-output-dir "${MAESTRO_OUTPUT_DIR}/${name}"
  sync_screenshots
}

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
trap collect_diagnostics EXIT

export PATH="${HOME}/.maestro/bin:${PATH}"
export MAESTRO_CLI_NO_ANALYTICS=1
maestro --version
run_maestro_flow "render" "e2e/render-smoke.yaml"
run_maestro_flow "navigation" "e2e/navigation-smoke.yaml"

mapfile -t screenshots < <(find "${RENDER_DIR}" -maxdepth 1 -type f -name '*.png' | sort)
if [[ ${#screenshots[@]} -lt 9 ]]; then
  echo "Expected at least nine screenshots across render and navigation flows, found ${#screenshots[@]}" >&2
  find "${ARTIFACT_DIR}" -maxdepth 8 -type f -print
  exit 1
fi

python3 scripts/validate-render.py "${screenshots[@]}" --report "${ARTIFACT_DIR}/render-analysis.json"
collect_diagnostics

if grep -E "FATAL EXCEPTION|AndroidRuntime.*FATAL|ReactNativeJS.*(TypeError|Invariant Violation|Unhandled|Error:)" "${LOG_DIR}/logcat.txt"; then
  echo "Fatal Android or React Native error found in logcat" >&2
  exit 1
fi

trap - EXIT
echo "Render smoke validation passed with ${#screenshots[@]} screenshots across two Maestro flows."
