# Raspberry Pi Deployment — MagiQuest Charlock

The fastest path from a fresh Raspberry Pi to a running game.

---

## 1. Hardware

- **Raspberry Pi 4** (4 GB+ recommended)
- **Two HDMI displays** plugged into HDMI0 and HDMI1
  - Display A → dragon video
  - Display B → touchscreen UI
- **IR receiver** (TSOP38238 / VS1838B or similar):
  - VCC → pin 1 (3.3 V)
  - GND → pin 6 (GND)
  - OUT → pin 11 (GPIO 17)
- **MagiQuest wand** (or any 38 kHz IR remote)
- **5 V / 3 A USB-C PSU**, **16 GB+ microSD**

---

## 2. Flash Raspberry Pi OS

1. Install **Raspberry Pi Imager**: <https://www.raspberrypi.com/software/>
2. Choose **Raspberry Pi OS (64-bit, with desktop)**.
3. Use Imager's gear icon to preconfigure:
   - hostname: `magiquest`
   - user: `pi` (or any name — the installer adapts)
   - enable SSH
   - your Wi-Fi credentials
4. Flash, boot the Pi, and wait for the desktop to come up.

---

## 3. Enable desktop auto-login

```bash
sudo raspi-config
```

→ **System Options → Boot / Auto Login → Desktop Autologin**

This is required because the game starts inside the X11 graphical session.

---

## 4. Install the game (one command)

SSH into the Pi (or open a terminal on it) and run:

```bash
curl -fsSL https://raw.githubusercontent.com/trinichad/MQ/main/install_pi.sh | bash
```

That's it. The installer will:

1. Install all required apt packages (`chromium-browser`, `python3-venv`, `python3-lgpio`, `unclutter`, `git`).
2. Clone the repo to `~/MQ`.
3. Create a Python venv and install `flask`, `flask-socketio`, `gpiozero`.
4. Patch `launch_game.sh` to use the venv's Python.
5. Render and install the systemd service for your username.
6. Enable autostart on boot.

You'll see `✓ Install complete` when done.

---

## 5. First run

Reboot to test the autostart end-to-end:

```bash
sudo reboot
```

Or start it now without rebooting:

```bash
sudo systemctl start magiquest-charlock.service
```

You should see:
- The dragon idle clip fullscreen on display A.
- The touch UI (mana bars + spell runes + MQ button) fullscreen on display B.

Tap **MQ** to start an encounter. Aim the wand at the IR sensor and trigger to cast.

---

## 6. Display layout

The launcher assumes **two 1024×600 panels stacked vertically** by default:

```
DISPLAY_VIDEO_POS=0,0      # video screen
DISPLAY_UI_POS=0,600       # UI screen
WIN_W=1024
WIN_H=600
```

If your monitors are different, run `xrandr` to see your layout, then edit those values at the top of `~/MQ/launch_game.sh`.

**Common layouts:**

| Setup | DISPLAY_VIDEO_POS | DISPLAY_UI_POS | WIN_W × WIN_H |
|-------|-------------------|----------------|----------------|
| 1024×600 stacked (default) | `0,0` | `0,600` | `1024 × 600` |
| 1920×1080 side-by-side | `0,0` | `1920,0` | `1920 × 1080` |
| 1280×720 + 800×480 portrait touch | `0,0` | `1280,0` | (set per-window in script) |

If displays come up in the wrong order, force a layout at login:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/setup-displays.desktop <<'EOF'
[Desktop Entry]
Type=Application
Exec=sh -c "xrandr --output HDMI-1 --mode 1024x600 --pos 0,0 --primary && xrandr --output HDMI-2 --mode 1024x600 --pos 0,600"
EOF
```

(adjust `HDMI-1`/`HDMI-2` to whatever `xrandr` reports).

---

## 7. Touchscreen mapping

If the touchscreen is connected to display B but taps register on display A:

```bash
xinput list                           # find your touchscreen's name
xinput map-to-output "<that name>" HDMI-2
```

Persist by adding the same line to `~/.config/autostart/setup-displays.desktop`.

---

## 8. IR wand verification

Before chasing UI bugs, confirm the sensor sees the wand:

```bash
~/MQ/.venv/bin/python -c "from gpiozero import Button; b=Button(17, pull_up=True); print('press wand'); b.wait_for_press(); print('OK')"
```

You should see `OK` when you trigger the wand. If not:
- Re-check wiring (OUT → GPIO 17, not 5 V).
- Try `pull_up=False` if your sensor idles LOW.
- Override the pin: edit `/etc/systemd/system/magiquest-charlock.service` and add `Environment=CHARLOCK_IR_PIN=27` under `[Service]`, then `sudo systemctl daemon-reload && sudo systemctl restart magiquest-charlock.service`.

---

## 9. Service management

| Task | Command |
|------|---------|
| Status | `sudo systemctl status magiquest-charlock.service` |
| Stop | `sudo systemctl stop magiquest-charlock.service` |
| Start | `sudo systemctl start magiquest-charlock.service` |
| Restart | `sudo systemctl restart magiquest-charlock.service` |
| Disable autostart | `sudo systemctl disable magiquest-charlock.service` |
| Live game logs | `tail -f ~/MQ/game.log` |
| Live systemd logs | `sudo journalctl -u magiquest-charlock.service -f` |

---

## 10. Updating the game

Just re-run the installer — it pulls latest, reinstalls deps, and refreshes the service:

```bash
~/MQ/install_pi.sh
sudo systemctl restart magiquest-charlock.service
```

Or manually:

```bash
cd ~/MQ
git pull
.venv/bin/pip install -r requirements.txt
sudo systemctl restart magiquest-charlock.service
```

---

## 11. Optional polish

**Hide the mouse cursor:**

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/unclutter.desktop <<'EOF'
[Desktop Entry]
Type=Application
Exec=unclutter -idle 0.1 -root
EOF
```

**Disable screen blanking:** `sudo raspi-config` → **Display Options → Screen Blanking → No**.

**Bigger GPU memory split** (smoother dual video):
`sudo raspi-config` → **Advanced Options → Memory Split → 256**.

---

## 12. Troubleshooting

**Both Chromium windows open on the same display.**
Edit positions in `~/MQ/launch_game.sh` to match what `xrandr` reports.

**Video is silent.**
Click once on the video window. If still silent, check `chrome://gpu` shows "Hardware accelerated" for video decode.

**Service won't start, status shows `217/USER`.**
Re-run `~/MQ/install_pi.sh` — it regenerates the unit file with the correct username/UID.

**`gpiozero.exc.BadPinFactory` or no IR events.**
The installer adds `python3-lgpio`; if you skipped that step, run `sudo apt install -y python3-lgpio` and restart the service.

**Port 5000 already in use.**
Add `Environment=CHARLOCK_PORT=5050` to the service file under `[Service]`, edit `PORT=5050` near the top of `launch_game.sh`, and restart.

**I want to start over.**

```bash
sudo systemctl disable --now magiquest-charlock.service
sudo rm /etc/systemd/system/magiquest-charlock.service
rm -rf ~/MQ
```

Then re-run the one-line installer.

---

## Quick reference

| File | Purpose |
|------|---------|
| `install_pi.sh` | One-shot installer (run on the Pi) |
| `server.py` | Flask + Socket.IO server, IR listener |
| `static/ui.html`, `static/js/game.js` | Touch UI + state machine |
| `static/video.html` | Fullscreen video screen |
| `launch_game.sh` | Boots server + 2 Chromium kiosk windows |
| `magiquest-charlock.service` | Template systemd unit (installer renders the real one) |
| `charlock_videos/` | Dragon MP4 clips |
| `images/` | Mana bars, runes, MQ button |
| `game.log` | Combined runtime log |
