# Raspberry Pi Deployment Guide — MagiQuest Charlock

Step-by-step instructions to get the dual-screen Charlock game running on a
Raspberry Pi with two displays and an IR wand sensor.

---

## 1. Hardware checklist

- **Raspberry Pi 4** (4 GB or 8 GB recommended — video decoding is GPU-accelerated, but two browser windows still need RAM).
- **Two HDMI displays.** The Pi 4 has two micro-HDMI ports (HDMI0 and HDMI1).
  - Display A → video screen (the dragon)
  - Display B → touchscreen UI
- **Touchscreen** wired to display B (USB or HDMI touch input).
- **IR receiver module** (e.g. TSOP38238 / VS1838B, or a generic IR sensor breakout).
  - VCC → 3.3 V (pin 1)
  - GND → GND (pin 6)
  - OUT → **GPIO 17** (pin 11)
- **MagiQuest wand** (or any compatible 38 kHz IR remote — the code only cares that the sensor pulses LOW when triggered).
- **Power supply:** official 5 V / 3 A USB-C.
- **microSD card:** 16 GB+ (Class 10 / A1 minimum).

---

## 2. Flash Raspberry Pi OS

1. Download **Raspberry Pi Imager**: <https://www.raspberrypi.com/software/>
2. Choose **Raspberry Pi OS (64-bit) — with desktop** (Bookworm or newer).
3. In Imager's settings (gear icon) preconfigure:
   - hostname: `magiquest`
   - username: `pi`
   - password: (something you'll remember)
   - enable SSH
   - your Wi-Fi SSID + password
   - locale / timezone
4. Flash, insert the SD card into the Pi, and boot.

---

## 3. First boot — system prep

SSH in (or open a terminal on the Pi):

```bash
ssh pi@magiquest.local
```

Update the system and install required packages:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y \
    python3-pip python3-venv \
    chromium-browser \
    git curl \
    unclutter
sudo reboot
```

> `unclutter` hides the mouse cursor. `chromium-browser` is the kiosk we use for both screens.

---

## 4. Configure dual displays

Plug both monitors into HDMI0 and HDMI1 **before booting**. After login:

```bash
xrandr
```

You'll see something like:

```
HDMI-1 connected primary 1024x600+0+0 ...
HDMI-2 connected 1024x600+1024+0 ...
```

Note the names (`HDMI-1`, `HDMI-2`) and resolutions — you'll use them below.

### Set a stable side-by-side or stacked layout

Edit `/etc/xdg/lxsession/LXDE-pi/autostart` (or create `~/.config/autostart/xrandr.desktop`) so the layout is applied at every login. Easiest: add the layout to a small script.

```bash
cat > ~/setup-displays.sh <<'EOF'
#!/bin/bash
# Adjust HDMI-1 / HDMI-2 names + positions to match your panels.
xrandr --output HDMI-1 --mode 1024x600 --pos 0,0 --primary
xrandr --output HDMI-2 --mode 1024x600 --pos 0,600
EOF
chmod +x ~/setup-displays.sh
```

Run it once to test: `~/setup-displays.sh`

> **Other layouts:**
> - Side-by-side 1920×1080: `--pos 0,0` and `--pos 1920,0`. Then set `WIN_W=1920 WIN_H=1080` and `DISPLAY_UI_POS=1920,0` in `launch_game.sh`.
> - Portrait touchscreen: add `--rotate right` (or `left`) to the relevant `xrandr` line.

### Disable screen blanking

```bash
sudo raspi-config
```

Go to **Display Options → Screen Blanking → No**, and **Advanced Options → GL Driver → GL (Fake KMS)** if it isn't already.

---

## 5. Copy the game to the Pi

From your Mac:

```bash
cd /Users/chad/Projects/MQ
rsync -avz --exclude '.venv' --exclude 'Game Example' \
      --exclude '__pycache__' --exclude '.git' \
      ./ pi@magiquest.local:/home/pi/Desktop/MQ_Python/
```

> If you'd rather use git, push this folder to a repo and `git clone` it on the Pi into `/home/pi/Desktop/MQ_Python`.

On the Pi, verify:

```bash
ls /home/pi/Desktop/MQ_Python
# server.py  launch_game.sh  static/  charlock_videos/  images/  ...
```

---

## 6. Install Python dependencies

On the Pi:

```bash
cd /home/pi/Desktop/MQ_Python
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

This installs `flask`, `flask-socketio`, and `gpiozero` (plus `RPi.GPIO`).

> If `gpiozero` complains about the GPIO backend, install lgpio:
> ```bash
> sudo apt install -y python3-lgpio
> ```

Update `launch_game.sh` so it uses the venv's Python. Open the file and change the line:

```bash
python3 server.py >> "$LOG_FILE" 2>&1 &
```

to:

```bash
/home/pi/Desktop/MQ_Python/.venv/bin/python server.py >> "$LOG_FILE" 2>&1 &
```

Make it executable:

```bash
chmod +x /home/pi/Desktop/MQ_Python/launch_game.sh
```

---

## 7. Wire the IR sensor

| Sensor pin | Pi GPIO header pin | Function |
|------------|--------------------|----------|
| VCC        | Pin 1 (3.3 V)      | power    |
| GND        | Pin 6 (GND)        | ground   |
| OUT / DATA | Pin 11 (GPIO 17)   | signal   |

Test the sensor before launching the game:

```bash
source /home/pi/Desktop/MQ_Python/.venv/bin/activate
python3 -c "from gpiozero import Button; b=Button(17, pull_up=True); print('press wand'); b.wait_for_press(); print('OK — got a press')"
```

Aim the wand at the sensor and click — you should see `OK — got a press`. If not:
- Check wiring (especially that OUT goes to GPIO 17, not 5 V).
- Try `pull_up=False` if your sensor idles LOW.
- Override the pin: edit `/etc/systemd/system/magiquest-charlock.service` and add `Environment=CHARLOCK_IR_PIN=27` (or whatever pin you use).

---

## 8. Manual test launch

Make sure you're logged into the desktop session (HDMI keyboard or VNC) so X11 is running, then:

```bash
DISPLAY=:0 /home/pi/Desktop/MQ_Python/launch_game.sh
```

You should see:
- The video screen open in fullscreen on display A, showing the idle dragon clip.
- The UI open in fullscreen on display B, showing the mana bars + spell runes.

Tap the **MQ** button on the touchscreen to start the encounter. Aim and trigger the wand to cast.

Logs stream to `/home/pi/Desktop/MQ_Python/game.log`:

```bash
tail -f /home/pi/Desktop/MQ_Python/game.log
```

To stop the manual test: `Ctrl+C` in the SSH session, then close the Chromium windows.

---

## 9. Auto-start on boot (systemd)

The repo includes [magiquest-charlock.service](magiquest-charlock.service). Install it:

```bash
sudo cp /home/pi/Desktop/MQ_Python/magiquest-charlock.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable magiquest-charlock.service
sudo systemctl start  magiquest-charlock.service
```

Useful commands:

| Action | Command |
|--------|---------|
| Status | `sudo systemctl status magiquest-charlock.service` |
| Stop   | `sudo systemctl stop magiquest-charlock.service` |
| Start  | `sudo systemctl start magiquest-charlock.service` |
| Restart| `sudo systemctl restart magiquest-charlock.service` |
| Disable autostart | `sudo systemctl disable magiquest-charlock.service` |
| Live logs | `sudo journalctl -u magiquest-charlock.service -f` |
| Game logs | `tail -f /home/pi/Desktop/MQ_Python/game.log` |

> The service runs as user `pi` and assumes `DISPLAY=:0` and `XDG_RUNTIME_DIR=/run/user/1000`. If your username isn't `pi` (or UID isn't 1000), edit those lines in the service file.

### Auto-login to desktop

The service starts at `graphical.target`, so the Pi must auto-login to the desktop:

```bash
sudo raspi-config
```

→ **System Options → Boot / Auto Login → Desktop Autologin**.

---

## 10. Hide the mouse cursor (polish)

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/unclutter.desktop <<'EOF'
[Desktop Entry]
Type=Application
Exec=unclutter -idle 0.1 -root
EOF
```

---

## 11. Troubleshooting

**Both Chromium windows open on the same screen.**
Set explicit positions in `launch_game.sh` (`DISPLAY_VIDEO_POS`, `DISPLAY_UI_POS`) that match the coords from `xrandr`. If your displays are at `(0,0)` and `(1920,0)`, those are your positions.

**Video screen is black / silent.**
Click once on the video window the first time. The launcher passes `--autoplay-policy=no-user-gesture-required`, but some Chromium builds still require it for audio. Also check `tail -f game.log` for 404s on `/videos/...`.

**Touch input not working on UI screen.**
Run `xinput list` to find the touchscreen, then map it to the correct output:
```bash
xinput map-to-output "Your Touchscreen Name" HDMI-2
```
Add that to `~/setup-displays.sh` so it persists.

**IR wand doesn't fire spells.**
- Re-run the `gpiozero` test from step 7.
- Watch the server log: every wand press should print `IR trigger`. If it doesn't, the sensor isn't reaching the GPIO.
- If it does print but the UI doesn't react, open the UI page DevTools (`Ctrl+Shift+I`) and confirm the `ir_trigger` Socket.IO event arrives.

**Service won't start (`status=217/USER` or similar).**
Your username isn't `pi`. Edit `/etc/systemd/system/magiquest-charlock.service` and replace `User=pi` / `Group=pi` / paths with your actual username.

**Performance is choppy.**
- Ensure GPU memory split is at least 256 MB: `sudo raspi-config` → **Advanced Options → Memory Split → 256**.
- Confirm hardware video decoding: in Chromium go to `chrome://gpu` — *Video Decode* should say "Hardware accelerated".
- The MP4s are H.264, which the Pi decodes in hardware.

**Port 5000 already in use.**
Set `CHARLOCK_PORT=5050` in the service file: add `Environment=CHARLOCK_PORT=5050` and update `launch_game.sh`'s `PORT` accordingly.

---

## 12. Updating the game later

From your Mac, after edits:

```bash
rsync -avz --exclude '.venv' --exclude 'Game Example' \
      --exclude '__pycache__' --exclude '.git' \
      /Users/chad/Projects/MQ/ pi@magiquest.local:/home/pi/Desktop/MQ_Python/

ssh pi@magiquest.local "sudo systemctl restart magiquest-charlock.service"
```

That's it — the Pi will reboot the game with your changes.

---

## Quick reference

| File | Purpose |
|------|---------|
| `server.py` | Flask + Socket.IO server, IR listener |
| `static/ui.html`, `static/js/game.js` | Touch UI + state machine |
| `static/video.html` | Fullscreen video screen |
| `launch_game.sh` | Boots server + 2 Chromium kiosk windows |
| `magiquest-charlock.service` | systemd autostart unit |
| `charlock_videos/` | Dragon MP4 clips |
| `images/` | Mana bars, runes, MQ button |
| `game.log` | Combined runtime log |
