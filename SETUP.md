# MagiQuest Charlock — Setup

A dual-screen, browser-based recreation of the **Charlock** encounter for
Raspberry Pi. One display shows the dragon video, the other is the touch UI.
An IR sensor on a GPIO pin acts as the wand cast trigger.

## Architecture

```
                 ┌──────────────────────┐
   IR sensor ──► │   server.py (Flask   │ ◄── HTTP/WS ──► /ui    (touch screen)
   (GPIO 17)     │   + Socket.IO)       │ ◄── HTTP/WS ──► /video (video screen)
                 └──────────────────────┘
```

- `/ui`    runs the game state machine (ported from `Game Example/Charlock.html`).
- `/video` is a thin client that just plays whatever video the UI requests.
- The Python server relays Socket.IO events between the two and forwards
  IR sensor presses as `ir_trigger` events.

## Files

| File | Purpose |
|------|---------|
| `server.py` | Flask + Socket.IO server, serves pages, reads IR from GPIO. |
| `static/ui.html` + `static/js/game.js` | Touch UI + state machine. |
| `static/video.html` | Fullscreen video player. |
| `static/css/style.css` | UI styling. |
| `static/snd/*.mp3` | Game sound effects. |
| `static/js/socket.io.min.js` | Socket.IO client (bundled, no internet needed). |
| `charlock_videos/` | Dragon video clips. |
| `images/` | Mana bars, runes, MQ button, etc. |
| `launch_game.sh` | Boot launcher: starts server + 2 Chromium kiosk windows. |
| `magiquest-charlock.service` | systemd unit for autostart. |
| `requirements.txt` | Python deps. |

## Desktop development (macOS / Linux)

```bash
cd /path/to/MQ
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server.py
```

Then open in **two browser windows**:
- http://localhost:5000/video
- http://localhost:5000/ui

Click anywhere on each page once (browsers require a user gesture before
they’ll autoplay video with audio).

**Keyboard shortcuts on the UI page** (handy for testing without an IR wand):
- `M` — press the MQ button (start encounter)
- `1` Protect, `2` Freeze, `3` Reveal, `4` Ice Arrow
- `Space` / `Enter` — cast the selected spell (same as IR trigger)
- `F` (on video page) — toggle fullscreen, `M` — mute toggle

## Raspberry Pi install

1. Copy this whole folder to `/home/pi/Desktop/MQ_Python/`.
2. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install -y python3-pip chromium-browser
   pip3 install -r /home/pi/Desktop/MQ_Python/requirements.txt
   ```
3. Make the launcher executable:
   ```bash
   chmod +x /home/pi/Desktop/MQ_Python/launch_game.sh
   ```
4. Test it manually:
   ```bash
   /home/pi/Desktop/MQ_Python/launch_game.sh
   ```
5. Install the systemd service for autostart on boot:
   ```bash
   sudo cp /home/pi/Desktop/MQ_Python/magiquest-charlock.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now magiquest-charlock.service
   ```

### Display layout

The launcher places windows at fixed positions. Defaults assume two 1024×600
panels stacked vertically (matching the original Pi rig):

```
DISPLAY_VIDEO_POS=0,0
DISPLAY_UI_POS=0,600
WIN_W=1024
WIN_H=600
```

For two monitors side by side at 1920×1080, edit `launch_game.sh` or set:

```bash
DISPLAY_UI_POS=1920,0  WIN_W=1920  WIN_H=1080  ./launch_game.sh
```

You can also tweak via `xrandr` first if your distro doesn't auto-arrange
the displays.

### IR wand wiring

Wire the IR sensor’s OUT pin to **GPIO 17** (BCM numbering) with the sensor
held HIGH and pulled LOW (or pressed) when triggered — `gpiozero.Button`
with `pull_up=True` handles this. Override the pin with the
`CHARLOCK_IR_PIN` env var in the systemd unit if needed.

## Troubleshooting

- **Logs:** `tail -f /home/pi/Desktop/MQ_Python/game.log`
- **Service status:** `sudo systemctl status magiquest-charlock.service`
- **Stop game:** `sudo systemctl stop magiquest-charlock.service`
- **Video doesn’t autoplay with sound:** click once on the video window, or
  ensure Chromium is launched with `--autoplay-policy=no-user-gesture-required`
  (the launcher already does this).
- **IR not firing:** check pin number, run `gpio readall`, or test with
  `python3 -c "from gpiozero import Button; b=Button(17,pull_up=True); b.wait_for_press(); print('ok')"`.
- **Can’t see UI on second monitor:** verify `xrandr` shows both displays
  and tweak `DISPLAY_UI_POS` accordingly.
