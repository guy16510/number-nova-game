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

dismiss_system_error_dialogs() {
  local dump_path="${LOG_DIR}/system-dialog.xml"
  local coordinates

  for _ in 1 2 3 4 5; do
    adb shell uiautomator dump /sdcard/system-dialog.xml >/dev/null 2>&1 || true
    adb pull /sdcard/system-dialog.xml "${dump_path}" >/dev/null 2>&1 || true
    coordinates=$(python3 - "${dump_path}" <<'PY'
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(sys.argv[1])
if not path.exists():
    raise SystemExit(0)
try:
    root = ET.parse(path).getroot()
except ET.ParseError:
    raise SystemExit(0)

for node in root.iter('node'):
    resource_id = node.attrib.get('resource-id', '')
    text = node.attrib.get('text', '')
    if resource_id == 'android:id/aerr_wait' or text == 'Wait':
        match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.attrib.get('bounds', ''))
        if match:
            left, top, right, bottom = map(int, match.groups())
            print(f'{(left + right) // 2} {(top + bottom) // 2}')
            break
PY
)
    if [[ -z "${coordinates}" ]]; then
      break
    fi
    adb shell input tap ${coordinates}
    sleep 1
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
  dismiss_system_error_dialogs
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
adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put secure anr_show_background 0 || true
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
adb shell am force-stop com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true
adb shell am force-stop com.android.launcher3 >/dev/null 2>&1 || true
adb logcat -c

adb install -r "${APK_PATH}"
adb shell pm clear "${APP_ID}" >/dev/null || true
adb shell cmd package compile -m speed -f "${APP_ID}" >/dev/null 2>&1 || true
trap collect_diagnostics EXIT

# Warm the standalone release once so native libraries and the Skia surface are loaded
# before Maestro begins timing UI assertions. The test flow still clears app state.
adb shell am start -W -n "${APP_ID}/.MainActivity" >/dev/null
sleep 3
dismiss_system_error_dialogs
adb shell am force-stop "${APP_ID}" >/dev/null 2>&1 || true
adb logcat -c

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
