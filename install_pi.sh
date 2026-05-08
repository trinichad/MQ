#!/bin/bash
#
# MagiQuest Charlock — one-shot Raspberry Pi installer.
#
# Run this on the Pi after cloning the repo:
#
#     curl -fsSL https://raw.githubusercontent.com/trinichad/MQ/main/install_pi.sh | bash
#
#   ...or, if you've already cloned:
#
#     cd ~/MQ && ./install_pi.sh
#
# What it does:
#   1. Installs system packages (chromium, python venv, lgpio, unclutter)
#   2. Clones (or updates) the game into ~/MQ
#   3. Creates a Python venv and installs requirements
#   4. Patches launch_game.sh to use the venv's python and the right paths
#   5. Installs the systemd service so the game auto-starts on boot
#
# Safe to re-run.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/trinichad/MQ.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/MQ}"
SERVICE_NAME="magiquest-charlock.service"
RUN_USER="$(id -un)"
RUN_GROUP="$(id -gn)"
RUN_UID="$(id -u)"

say() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()  { printf '   \033[1;32m✓\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------------------
say "Installing system packages"
sudo apt-get update -y

# Pick whichever Chromium package this distro actually installs.
#   - Trixie and newer:     chromium
#   - Bullseye / Bookworm:  chromium-browser
# We use `apt-cache policy` because on Trixie `apt-cache show chromium-browser`
# still returns a stub record even though the package can't be installed.
CHROMIUM_PKG=""
for pkg in chromium chromium-browser; do
    cand="$(apt-cache policy "$pkg" 2>/dev/null | awk '/Candidate:/ {print $2}')"
    if [ -n "$cand" ] && [ "$cand" != "(none)" ]; then
        CHROMIUM_PKG="$pkg"
        break
    fi
done
if [ -z "$CHROMIUM_PKG" ]; then
    echo "ERROR: no installable chromium package found (tried chromium, chromium-browser)" >&2
    exit 1
fi
echo "   using chromium package: $CHROMIUM_PKG"

sudo apt-get install -y \
    git curl \
    python3 python3-venv python3-pip \
    python3-lgpio \
    "$CHROMIUM_PKG" \
    unclutter \
    x11-xserver-utils
ok "apt packages installed"

# ---------------------------------------------------------------------------
say "Fetching the game into $INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
    git -C "$INSTALL_DIR" pull --ff-only
    ok "updated existing clone"
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    ok "cloned $REPO_URL"
fi
cd "$INSTALL_DIR"

# ---------------------------------------------------------------------------
say "Creating Python virtual env"
# Use --system-site-packages so the venv can see the apt-installed
# python3-lgpio (gpiozero's preferred pin-factory backend on Pi 5 /
# Trixie kernels). Recreate the venv if it exists without that flag.
NEED_RECREATE=0
if [ -d ".venv" ]; then
    if ! grep -q '^include-system-site-packages = true' .venv/pyvenv.cfg 2>/dev/null; then
        NEED_RECREATE=1
    fi
fi
if [ "$NEED_RECREATE" = "1" ]; then
    say "Recreating venv with --system-site-packages (so lgpio is visible)"
    rm -rf .venv
fi
if [ ! -d ".venv" ]; then
    python3 -m venv --system-site-packages .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip wheel >/dev/null
pip install -r requirements.txt
deactivate
ok "venv ready at $INSTALL_DIR/.venv"

# ---------------------------------------------------------------------------
say "Patching launch_game.sh for this user/path"
LAUNCH="$INSTALL_DIR/launch_game.sh"
# Use the venv's python instead of system python3
sed -i "s|^python3 server.py|$INSTALL_DIR/.venv/bin/python server.py|" "$LAUNCH"
chmod +x "$LAUNCH"
ok "launcher updated"

# ---------------------------------------------------------------------------
say "Installing systemd service ($SERVICE_NAME)"
SERVICE_SRC="$INSTALL_DIR/$SERVICE_NAME"
SERVICE_DEST="/etc/systemd/system/$SERVICE_NAME"

# Render the unit file with the actual user / paths
sudo tee "$SERVICE_DEST" >/dev/null <<EOF
[Unit]
Description=MagiQuest Charlock dual-screen game
After=graphical.target network-online.target
Wants=graphical.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
Environment=DISPLAY=:0
Environment=XDG_RUNTIME_DIR=/run/user/$RUN_UID
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/launch_game.sh
Restart=on-failure
RestartSec=5
StandardOutput=append:$INSTALL_DIR/game.log
StandardError=append:$INSTALL_DIR/game.log

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
ok "service installed and enabled (will start on next boot)"

# ---------------------------------------------------------------------------
cat <<EOF

\033[1;32m✓ Install complete\033[0m

Next steps:
  • Plug in both HDMI displays. Run:  xrandr
    Note the names (e.g. HDMI-1 / HDMI-2) and adjust positions in
    $INSTALL_DIR/launch_game.sh if your layout isn't 1024x600 stacked.
  • Wire the IR sensor to GPIO 17 (pin 11), 3.3 V (pin 1), GND (pin 6).
  • Make sure the Pi auto-logs into the desktop:
        sudo raspi-config  →  System Options → Boot/Auto Login → Desktop Autologin
  • Reboot to see it start automatically:
        sudo reboot
  • Or start it now:
        sudo systemctl start $SERVICE_NAME
  • Watch the logs:
        tail -f $INSTALL_DIR/game.log

EOF
