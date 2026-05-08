from kivy.config import Config

Config.set('kivy', 'video', 'gstplayer')

# 🔥 Dual screen setup (stacked vertically: 600 + 600 = 1200)
Config.set('graphics', 'fullscreen', '0')
Config.set('graphics', 'borderless', '1')
Config.set('graphics', 'position', 'custom')
Config.set('graphics', 'left', '0')
Config.set('graphics', 'top', '0')
Config.set('graphics', 'width', '1024')
Config.set('graphics', 'height', '1200')
Config.set('graphics', 'resizable', '0')

import os
import platform
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.button import Button
from kivy.uix.video import Video
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.image import Image
from kivy.clock import Clock
from kivy.core.audio import SoundLoader

try:
    from gpiozero import Button as GPIOButton
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False


# Auto-detect environment and set paths
def get_base_path():
    """Auto-detect if running on PI or desktop and return appropriate base path."""
    home_dir = os.path.expanduser('~')

    # Check for Pi-specific hardware
    if os.path.exists('/boot/config.txt'):
        # This is a Raspberry Pi - use current user's home
        base_path = f'{home_dir}/Desktop/MQ_Python/'
        if os.path.exists(base_path):
            return base_path

    # Desktop development environment
    if os.path.exists(f'{home_dir}/Desktop/MQ_python/'):
        return f'{home_dir}/Desktop/MQ_python/'

    # Fallback to script directory
    base_path = os.path.dirname(os.path.abspath(__file__)) + '/'
    if os.path.exists(base_path):
        return base_path

    print(f"Warning: MQ_Python folder not found. Using script directory: {base_path}")
    return base_path

BASE_PATH = get_base_path()
VIDEO_BASE_PATH = f'{BASE_PATH}charlock_videos/'
IMAGES_PATH = f'{BASE_PATH}images/'

print(f"Auto-detected paths:")
print(f"  BASE_PATH: {BASE_PATH}")
print(f"  VIDEOS: {VIDEO_BASE_PATH}")
print(f"  IMAGES: {IMAGES_PATH}")


class GameState:
    """Manages game phase, mana, spells, and state transitions."""

    def __init__(self, video_base_path):
        self.phase = 0
        self.mana_l = 0
        self.mana_r = 0
        self.has_cast = False
        self.active_spell = ''
        self.cast_spell = ''

        # Video mapping: phase -> filename
        self.video_map = {
            0: 'Dragon0001.mp4',    # idle
            1: 'Dragon0002.mp4',    # phase 1
            2: 'Dragon0003.mp4',    # phase 2
            3: 'Dragon0011.mp4',    # phase 3
            4: 'Dragon0004.mp4',    # phase 4
            5: 'Dragon0012.mp4',    # phase 5
            6: 'Dragon0013.mp4',    # phase 6
            7: 'Dragon0014.mp4',    # phase 7
            8: 'Dragon0015.mp4',    # phase 8
            9: 'Dragon0016.mp4',    # phase 9
            10: 'Dragon0010A.mp4',  # defeat
            11: 'Dragon0003.mp4',   # cast response 1
            12: 'Dragon0012A.mp4',  # cast response 2
            13: 'Dragon0015A.mp4',  # cast response 3
            14: 'Dragon0020.mp4',   # victory
        }

        self.video_base_path = video_base_path

    def get_video_path(self, phase):
        """Get full path for a phase's video."""
        filename = self.video_map.get(phase, 'Dragon0001.mp4')
        return f"{self.video_base_path}{filename}"

    def set_active_spell(self, spell):
        """Player selects a spell."""
        if self.has_cast:
            self.active_spell = spell

    def handle_video_end(self, callback):
        """State machine: called when video ends."""
        if self.phase == 0:
            self.reset_encounter()
            callback(self.get_video_path(0))

        elif self.phase == 1:
            if self.cast_spell == 'protect':
                self.mana_l -= 2
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 2
                    callback(self.get_video_path(11))
            else:
                self.mana_l -= 8
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 2
                    callback(self.get_video_path(11))
            self.reset_buttons_state()

        elif self.phase == 2:
            if self.cast_spell == 'freeze':
                self.has_cast = True
                self.phase = 3
                callback(self.get_video_path(3))
            else:
                self.has_cast = False
                self.phase = 1
                callback(self.get_video_path(4))
            self.reset_buttons_state()

        elif self.phase == 3:
            if self.cast_spell == 'ice_arrow':
                self.mana_r -= 6
                self.has_cast = True
                self.phase = 4
                callback(self.get_video_path(5))
            else:
                self.has_cast = False
                self.phase = 1
                callback(self.get_video_path(4))
            self.reset_buttons_state()

        elif self.phase == 4:
            if self.cast_spell == 'protect':
                self.mana_l -= 2
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 5
                    callback(self.get_video_path(12))
            else:
                self.mana_l -= 8
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 5
                    callback(self.get_video_path(12))
            self.reset_buttons_state()

        elif self.phase == 5:
            if self.cast_spell == 'freeze':
                self.phase = 6
                callback(self.get_video_path(6))
            else:
                self.has_cast = False
                self.phase = 4
                callback(self.get_video_path(7))
            self.reset_buttons_state()

        elif self.phase == 6:
            if self.cast_spell == 'ice_arrow':
                self.mana_r -= 6
                self.has_cast = True
                self.phase = 7
                callback(self.get_video_path(8))
            else:
                self.has_cast = False
                self.phase = 4
                callback(self.get_video_path(7))
            self.reset_buttons_state()

        elif self.phase == 7:
            if self.cast_spell == 'protect':
                self.mana_l -= 4
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 8
                    callback(self.get_video_path(13))
            else:
                self.mana_l -= 8
                if self.mana_l <= 0:
                    self.phase = 0
                    callback(self.get_video_path(10))
                    return
                else:
                    self.has_cast = True
                    self.phase = 8
                    callback(self.get_video_path(13))
            self.reset_buttons_state()

        elif self.phase == 8:
            if self.cast_spell == 'freeze':
                self.phase = 9
                callback(self.get_video_path(9))
            else:
                self.has_cast = False
                self.phase = 7
                callback(self.get_video_path(7))
            self.reset_buttons_state()

        elif self.phase == 9:
            if self.cast_spell == 'ice_arrow':
                self.mana_r -= 4
                self.phase = 0
                callback(self.get_video_path(14))  # Victory!
            else:
                self.has_cast = False
                self.phase = 7
                callback(self.get_video_path(7))
            self.reset_buttons_state()

    def start_encounter(self, callback):
        """MQ button: start the game."""
        self.has_cast = True
        self.mana_l = 16
        self.mana_r = 16
        self.phase = 1
        callback(self.get_video_path(1))
        self.reset_buttons_state()

    def cast_spell_on_trigger(self):
        """IR trigger: lock in the active spell selection."""
        if self.active_spell:
            self.cast_spell = self.active_spell

    def reset_buttons_state(self):
        """Clear spell selections."""
        self.active_spell = ''
        self.cast_spell = ''

    def reset_encounter(self):
        """Reset to idle state."""
        self.phase = 0
        self.mana_l = 0
        self.mana_r = 0
        self.has_cast = False
        self.reset_buttons_state()


class TestApp(App):
    def build(self):
        root = BoxLayout(orientation='vertical')

        # Use auto-detected paths
        self.game_state = GameState(VIDEO_BASE_PATH)
        self.images_path = IMAGES_PATH

        # 🎬 VIDEO AREA (top half)
        video_area = FloatLayout(size_hint=(1, 0.5))

        self.video = Video(
            source=self.game_state.get_video_path(0),
            size_hint=(1, 1),
            pos_hint={"x": 0, "y": 0},
            allow_stretch=True,
            keep_ratio=True
        )
        self.video.bind(on_eos=self.on_video_end)
        video_area.add_widget(self.video)

        # 🎮 UI (bottom half)
        ui_layout = BoxLayout(orientation='vertical', size_hint=(1, 0.5))

        # Mana bars
        mana_layout = BoxLayout(size_hint=(1, 0.2))

        self.mana_l_img = Image(source=f'{self.images_path}mana_l0.png', size_hint=(0.3, 1))

        mq_button = Button(text='MQ', size_hint=(0.4, 1))
        mq_button.bind(on_press=self.on_mq_button)

        self.mana_r_img = Image(source=f'{self.images_path}mana_r0.png', size_hint=(0.3, 1))

        mana_layout.add_widget(self.mana_l_img)
        mana_layout.add_widget(mq_button)
        mana_layout.add_widget(self.mana_r_img)

        ui_layout.add_widget(mana_layout)

        # Spell buttons
        spell_layout = GridLayout(cols=5, size_hint=(1, 0.8))

        self.btn_protect = Button(text='Protect')
        self.btn_protect.bind(on_press=lambda x: self.on_spell_button('protect'))

        self.btn_freeze = Button(text='Freeze')
        self.btn_freeze.bind(on_press=lambda x: self.on_spell_button('freeze'))

        self.btn_reveal = Button(text='Reveal')
        self.btn_reveal.bind(on_press=lambda x: self.on_spell_button('reveal'))

        self.btn_ice_arrow = Button(text='Ice Arrow')
        self.btn_ice_arrow.bind(on_press=lambda x: self.on_spell_button('ice_arrow'))

        self.btn_placeholder = Button(text='')

        spell_layout.add_widget(self.btn_protect)
        spell_layout.add_widget(self.btn_freeze)
        spell_layout.add_widget(self.btn_reveal)
        spell_layout.add_widget(self.btn_ice_arrow)
        spell_layout.add_widget(self.btn_placeholder)

        ui_layout.add_widget(spell_layout)

        # 🔥 Order matters for your screen layout
        root.add_widget(video_area)
        root.add_widget(ui_layout)

        Clock.schedule_once(self.finish_setup, 0.5)
        self.setup_ir()

        return root

    def finish_setup(self, dt):
        """Initialize video playback."""
        self.video.state = 'play'

    def on_spell_button(self, spell):
        """Player clicks spell button."""
        print(f"Selected: {spell}")
        self.game_state.set_active_spell(spell)
        self.update_button_highlights(spell)

    def on_mq_button(self, instance):
        """MQ button: start the encounter."""
        print("MQ Button pressed - Starting encounter!")
        self.game_state.start_encounter(self.change_video)
        self.update_mana_bars()
        self.reset_button_highlights()

    def update_button_highlights(self, active_spell):
        """Highlight the selected spell button."""
        self.reset_button_highlights()
        if active_spell == 'protect':
            self.btn_protect.background_color = (0, 1, 0, 1)
        elif active_spell == 'freeze':
            self.btn_freeze.background_color = (0, 1, 0, 1)
        elif active_spell == 'ice_arrow':
            self.btn_ice_arrow.background_color = (0, 1, 0, 1)
        elif active_spell == 'reveal':
            self.btn_reveal.background_color = (0, 1, 0, 1)

    def reset_button_highlights(self):
        """Reset all spell buttons to default color."""
        self.btn_protect.background_color = (1, 1, 1, 1)
        self.btn_freeze.background_color = (1, 1, 1, 1)
        self.btn_ice_arrow.background_color = (1, 1, 1, 1)
        self.btn_reveal.background_color = (1, 1, 1, 1)

    def update_mana_bars(self):
        """Update mana bar images based on current mana levels."""
        self.mana_l_img.source = f'{self.images_path}mana_l{max(0, self.game_state.mana_l)}.png'
        self.mana_r_img.source = f'{self.images_path}mana_r{max(0, self.game_state.mana_r)}.png'

    def change_video(self, video_path):
        """Change to new video and play it."""
        self.video.source = video_path
        self.video.state = 'play'

    def on_video_end(self, instance):
        """Called when video ends - process game logic."""
        print(f"Video ended. Phase: {self.game_state.phase}")
        self.game_state.handle_video_end(self.change_video)
        self.update_mana_bars()
        self.reset_button_highlights()

    def setup_ir(self):
        """Setup IR remote control."""
        if not GPIO_AVAILABLE:
            print("GPIO not available (not on PI or gpiozero not installed)")
            return

        print("IR listener running...")
        try:
            self.wand = GPIOButton(17, pull_up=True)
            self.wand.when_pressed = self.on_ir_trigger
        except Exception as e:
            print(f"IR setup failed: {e}")

    def on_ir_trigger(self):
        """IR button pressed - cast the selected spell."""
        print("IR trigger!")
        Clock.schedule_once(lambda dt: self.cast_selected(), 0)

    def cast_selected(self):
        """Execute the spell selection via IR trigger."""
        print(f"Spell locked in: {self.game_state.active_spell}")
        self.game_state.cast_spell_on_trigger()
        # Don't process state machine here - let the video end naturally trigger on_video_end()


if __name__ == '__main__':
    TestApp().run()
