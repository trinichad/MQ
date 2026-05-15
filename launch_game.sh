#!/bin/bash
#
# MagiQuest Charlock launcher.
#
# Starts:
#   1. The Flask + Socket.IO game server (server.py)
#   2. Two Chromium kiosk windows: one on each display
#        - /video on the primary display
#        - /ui    on the secondary (touch) display
#
# Adjust DISPLAY_VIDEO_POS / DISPLAY_UI_POS for your monitor layout.
# Default assumes 1024x600 stacked vertically (matching the original Pi setup):
#     video screen at (0, 0)
#     UI / touch  at (0, 600)
# For side-by-side 1920x1080 monitors, set DISPLAY_UI_POS=1920,0.

set -u

GAME_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$GAME_DIR"

LOG_FILE="$GAME_DIR/game.log"

export DISPLAY="${DISPLAY:-:0}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

DISPLAY_VIDEO_POS="${DISPLAY_VIDEO_POS:-0,0}"
DISPLAY_UI_POS="${DISPLAY_UI_POS:-0,600}"
WIN_W="${WIN_W:-1024}"
WIN_H="${WIN_H:-600}"

PORT="${CHARLOCK_PORT:-5000}"

echo "------ launch_game.sh $(date) ------" >> "$LOG_FILE"

python3 server.py >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "server pid=$SERVER_PID" >> "$LOG_FILE"

for i in $(seq 1 30); do
    if curl -sSf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

CHROMIUM="$(command -v chromium-browser || command -v chromium || command -v google-chrome || true)"
if [ -z "$CHROMIUM" ]; then
    echo "no chromium binary found — install chromium-browser" >> "$LOG_FILE"
    wait "$SERVER_PID"
    exit 1
fi

COMMON_FLAGS=(
    --kiosk
    --noerrdialogs
    --disable-infobars
    --disable-session-crashed-bubble
    --disable-features=TranslateUI
    --autoplay-policy=no-user-gesture-required
    --no-first-run
    --start-fullscreen
    --check-for-update-interval=31536000
)

# Flags applied only to the /video kiosk window. Disabling the hardware
# video overlay plane forces Chromium to composite video through the
# normal page layer, which eliminates the brief white flash that
# otherwise appears when <video src> is swapped (the overlay plane is
# torn down and recreated). On a Pi 4/5 with short clips the CPU cost
# is negligible.
VIDEO_FLAGS=(
    --disable-features=UseChromeOSDirectVideoDecoder,AcceleratedVideoDecodeLinuxGL,AcceleratedVideoDecodeLinuxZeroCopyGL
    --disable-accelerated-video-decode
)

"$CHROMIUM" "${COMMON_FLAGS[@]}" "${VIDEO_FLAGS[@]}" \
    --user-data-dir=/tmp/charlock-video \
    --window-position="$DISPLAY_VIDEO_POS" \
    --window-size="$WIN_W,$WIN_H" \
    "http://127.0.0.1:${PORT}/video" >> "$LOG_FILE" 2>&1 &
VIDEO_PID=$!

sleep 1

"$CHROMIUM" "${COMMON_FLAGS[@]}" \
    --user-data-dir=/tmp/charlock-ui \
    --window-position="$DISPLAY_UI_POS" \
    --window-size="$WIN_W,$WIN_H" \
    "http://127.0.0.1:${PORT}/ui" >> "$LOG_FILE" 2>&1 &
UI_PID=$!

echo "video pid=$VIDEO_PID  ui pid=$UI_PID" >> "$LOG_FILE"

trap 'kill $VIDEO_PID $UI_PID 2>/dev/null; exit' INT TERM
wait "$SERVER_PID"
kill "$VIDEO_PID" "$UI_PID" 2>/dev/null || true
