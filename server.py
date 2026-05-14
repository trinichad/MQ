"""
MagiQuest Charlock - dual-display web game server.

Serves two pages:
    /ui     -> touch UI (mana bars, spell buttons, MQ). Hosts the game state
              machine. Sends "change_video" + "mana" updates over WebSocket.
    /video  -> fullscreen <video> player. Plays whatever the UI tells it to,
              and reports back "video_ended" so the state machine advances.

Also reads an IR sensor wired to a GPIO pin and broadcasts an "ir_trigger"
event to all connected clients, so the UI can lock in the active spell.
"""

import os
import sys
import logging
from flask import Flask, send_from_directory, render_template, abort, jsonify
from flask_socketio import SocketIO, emit

# File extensions we consider playable video clips for preload manifests.
VIDEO_EXTS = ('.mp4', '.webm', '.mov', '.m4v', '.ogv')

# How long the browser is allowed to cache video clips. Long cache is what
# lets the "preload everything" trick work on subsequent plays.
CLIP_CACHE_SECONDS = 60 * 60 * 24 * 7   # one week

# --- paths -----------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, 'charlock_videos')
IMAGES_DIR = os.path.join(BASE_DIR, 'images')
SOUNDS_DIR = os.path.join(BASE_DIR, 'static', 'snd')

# Per-encounter video folders. Keys are URL slugs used at /videos/<slug>/<file>.
# Folders that don't exist yet are simply skipped at request time.
ENCOUNTER_DIRS = {
    'charlock':       os.path.join(BASE_DIR, 'charlock_videos'),
    'dark_one':       os.path.join(BASE_DIR, 'dark_one_videos'),
    'goblin':         os.path.join(BASE_DIR, 'goblin_videos'),
    'heroic_dragon':  os.path.join(BASE_DIR, 'heroic_dragon_videos'),
    'pixie':          os.path.join(BASE_DIR, 'pixie_videos'),
    'silver_dragon':  os.path.join(BASE_DIR, 'silver_dragon_videos'),
    'unicorn':        os.path.join(BASE_DIR, 'unicorn_videos'),
    'ursa':           os.path.join(BASE_DIR, 'ursa_videos'),
    'winterra':       os.path.join(BASE_DIR, 'winterra_videos'),
    'xavier':         os.path.join(BASE_DIR, 'xavier_videos'),
}

# --- logging ---------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    stream=sys.stdout,
)
log = logging.getLogger('charlock')

# --- flask app -------------------------------------------------------------

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static',
)
app.config['SECRET_KEY'] = 'magiquest-charlock'
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')


@app.route('/')
def index():
    return (
        '<h1>MagiQuest Charlock</h1>'
        '<ul>'
        '<li><a href="/ui">/ui</a> - touch screen UI</li>'
        '<li><a href="/video">/video</a> - fullscreen video</li>'
        '</ul>'
    )


@app.route('/ui')
def ui_page():
    return send_from_directory(app.static_folder, 'ui.html')


@app.route('/video')
def video_page():
    return send_from_directory(app.static_folder, 'video.html')


@app.route('/videos/<path:filename>')
def videos(filename):
    """Backwards-compat: /videos/Foo.mp4 -> charlock_videos/Foo.mp4 ."""
    if not os.path.isdir(VIDEOS_DIR):
        abort(404)
    resp = send_from_directory(VIDEOS_DIR, filename, conditional=True)
    resp.headers['Cache-Control'] = 'public, max-age=%d' % CLIP_CACHE_SECONDS
    return resp


@app.route('/clips/<slug>/<path:filename>')
def encounter_clip(slug, filename):
    """Per-encounter video folder, e.g. /clips/dark_one/DarkOne0001.webm ."""
    folder = ENCOUNTER_DIRS.get(slug)
    if not folder or not os.path.isdir(folder):
        abort(404)
    resp = send_from_directory(folder, filename, conditional=True)
    resp.headers['Cache-Control'] = 'public, max-age=%d' % CLIP_CACHE_SECONDS
    return resp


@app.route('/manifest')
def manifest():
    """Return the list of every clip URL the video player might be asked to
    play. The video page uses this to warm the browser's HTTP cache on
    startup so subsequent ``change_video`` switches are instant.
    """
    clips = []
    for slug, folder in ENCOUNTER_DIRS.items():
        if not os.path.isdir(folder):
            continue
        try:
            names = sorted(os.listdir(folder))
        except OSError:
            continue
        for name in names:
            if name.startswith('.'):
                continue
            if not name.lower().endswith(VIDEO_EXTS):
                continue
            full = os.path.join(folder, name)
            if not os.path.isfile(full):
                continue
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            clips.append({
                'slug':  slug,
                'name':  name,
                'url':   '/clips/%s/%s' % (slug, name),
                'bytes': size,
            })
    return jsonify({'clips': clips, 'count': len(clips)})


@app.route('/images/<path:filename>')
def images(filename):
    if not os.path.isdir(IMAGES_DIR):
        abort(404)
    return send_from_directory(IMAGES_DIR, filename, conditional=True)


# --- websocket relay -------------------------------------------------------
#
# The UI page is the source of truth for game state. The video page is a
# thin client that just plays what UI tells it. We simply relay these two
# events between rooms.

@socketio.on('connect')
def on_connect():
    log.info('client connected: %s', _sid())


@socketio.on('disconnect')
def on_disconnect():
    log.info('client disconnected: %s', _sid())


@socketio.on('change_video')
def on_change_video(data):
    """UI -> server -> video screen: load and play this video."""
    log.info('change_video -> %s', data)
    emit('change_video', data, broadcast=True, include_self=False)


@socketio.on('video_ended')
def on_video_ended(data):
    """Video screen -> server -> UI: current clip finished."""
    log.info('video_ended <- %s', data)
    emit('video_ended', data, broadcast=True, include_self=False)


@socketio.on('ping_ui')
def on_ping_ui(data):
    """Optional: UI broadcasts state changes for diagnostics."""
    log.info('ui state: %s', data)


def _sid():
    try:
        from flask import request
        return request.sid
    except Exception:
        return '?'


# --- IR sensor -------------------------------------------------------------

IR_PIN = int(os.environ.get('CHARLOCK_IR_PIN', '17'))


def setup_ir():
    """Wire the IR sensor to broadcast an 'ir_trigger' event to all clients."""
    try:
        from gpiozero import Button as GPIOButton
    except (ImportError, RuntimeError) as exc:
        log.warning('gpiozero not available, IR disabled (%s)', exc)
        return

    try:
        wand = GPIOButton(IR_PIN, pull_up=True)
    except Exception as exc:
        log.warning('IR setup failed on pin %s: %s', IR_PIN, exc)
        return

    def fire():
        log.info('IR trigger')
        socketio.emit('ir_trigger', {})

    wand.when_pressed = fire
    # keep a reference so it isn't garbage collected
    app.config['_wand'] = wand
    log.info('IR listener active on GPIO %s', IR_PIN)


# --- entrypoint ------------------------------------------------------------

if __name__ == '__main__':
    log.info('BASE_DIR  = %s', BASE_DIR)
    log.info('VIDEOS    = %s (exists=%s)', VIDEOS_DIR, os.path.isdir(VIDEOS_DIR))
    log.info('IMAGES    = %s (exists=%s)', IMAGES_DIR, os.path.isdir(IMAGES_DIR))
    setup_ir()
    host = os.environ.get('CHARLOCK_HOST', '0.0.0.0')
    port = int(os.environ.get('CHARLOCK_PORT', '5000'))
    log.info('serving on http://%s:%s', host, port)
    socketio.run(app, host=host, port=port, debug=False, allow_unsafe_werkzeug=True)
