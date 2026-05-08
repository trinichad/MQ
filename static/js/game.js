/* Charlock state machine — ported from Game Example/Charlock.html.
 *
 * UI page is the source of truth. It tells the video page what to play
 * (over WebSocket), and the video page tells UI when it ended.
 */

(function () {
  'use strict';

  // ---------- video filenames (mp4 versions in /charlock_videos) ----------

  const V = {
    idle:        '/videos/Dragon0001.mp4',
    enter:       '/videos/Dragon0002.mp4',
    castResp1:   '/videos/Dragon0003.mp4',
    again1:      '/videos/Dragon0004.mp4',
    freeze1:     '/videos/Dragon0011.mp4',
    iceArrow1:   '/videos/Dragon0012.mp4',
    castResp2:   '/videos/Dragon0012A.mp4',
    again2:      '/videos/Dragon0013.mp4',
    freeze2:     '/videos/Dragon0014.mp4',
    iceArrow2:   '/videos/Dragon0015.mp4',
    castResp3:   '/videos/Dragon0015A.mp4',
    again3:      '/videos/Dragon0016.mp4',
    freeze3:     '/videos/Dragon0017.mp4',
    victory:     '/videos/Dragon0020.mp4',
    defeat:      '/videos/Dragon0010A.mp4',
  };

  // ---------- state ------------------------------------------------------

  let phase       = 0;
  let manaL       = 0;
  let manaR       = 0;
  let activeSpell = '';
  let castSpell   = '';
  let hasCast     = false;

  // ---------- DOM --------------------------------------------------------

  const leftMana  = document.getElementById('left-mana');
  const rightMana = document.getElementById('right-mana');
  const mqBtn     = document.getElementById('mqbutton');
  const castBtn   = document.getElementById('cast-btn');
  const statusEl  = document.getElementById('status');
  const sndDown   = document.getElementById('snd-manadown');
  const sndReset  = document.getElementById('snd-manareset');
  const sndEnter  = document.getElementById('snd-entrance');

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
    console.log('[ui]', msg);
  }

  function play(snd) {
    if (!snd) return;
    try { snd.currentTime = 0; snd.play().catch(()=>{}); } catch(_) {}
  }

  // ---------- networking -------------------------------------------------

  const socket = io();

  socket.on('connect',    () => setStatus('UI — connected'));
  socket.on('disconnect', () => setStatus('UI — disconnected'));

  // The video page reports when a clip finished playing.
  socket.on('video_ended', (data) => {
    console.log('[ui] video_ended', data, 'phase=', phase);
    advance();
  });

  // The IR sensor (via server) tells us to lock in the active spell.
  socket.on('ir_trigger', () => {
    handleCast();
  });

  function changeSource(url) {
    socket.emit('change_video', { src: url });
  }

  // ---------- mana -------------------------------------------------------

  function manaSet(side, level) {
    if (level < 0) level = 0;
    if (side === 'l') leftMana.src  = '/images/mana_l' + level + '.png';
    else              rightMana.src = '/images/mana_r' + level + '.png';
  }

  // ---------- spell selection -------------------------------------------

  function spellButton(spell) {
    if (!hasCast) return;
    activeSpell = spell;
    document.querySelectorAll('.rune').forEach((el) => {
      el.classList.toggle('active', el.dataset.spell === spell);
    });
    setStatus('selected: ' + spell);
  }

  function handleCast() {
    if (activeSpell !== '') {
      castSpell = activeSpell;
      setStatus('cast locked: ' + castSpell);
    }
  }

  function resetSpells() {
    activeSpell = '';
    castSpell   = '';
    document.querySelectorAll('.rune').forEach((el) => el.classList.remove('active'));
    if (mqBtn) mqBtn.src = (phase === 0) ? '/images/mq.png' : '/images/mqd.png';
  }

  // ---------- MQ button -------------------------------------------------

  function mqButton() {
    if (phase !== 0) return;
    hasCast = true;
    manaL = 16;
    manaR = 16;
    manaSet('l', manaL);
    manaSet('r', manaR);
    play(sndDown);
    phase = 1;
    changeSource(V.enter);
    resetSpells();
  }

  // ---------- core state machine (mirrors Charlock.html) ----------------

  function advance() {
    if (phase === 0) {
      // idle clip ended — loop idle and reset mana display
      resetSpells();
      changeSource(V.idle);
      manaL = 0; manaR = 0;
      manaSet('l', manaL); manaSet('r', manaR);
      return;
    }

    if (phase === 1) {
      const cost = (castSpell === 'protect') ? 2 : 8;
      manaL -= cost; manaSet('l', manaL);
      if (manaL <= 0) { play(sndReset); changeSource(V.defeat); phase = 0; }
      else            { play(sndDown); hasCast = true; changeSource(V.castResp1); phase = 2; }
      resetSpells(); return;
    }

    if (phase === 2) {
      if (castSpell === 'freeze') { hasCast = true; changeSource(V.freeze1); phase = 3; }
      else                        { hasCast = false; changeSource(V.again1); phase = 1; }
      resetSpells(); return;
    }

    if (phase === 3) {
      if (castSpell === 'iceArrow') {
        manaR -= 6; manaSet('r', manaR); play(sndDown);
        changeSource(V.iceArrow1); phase = 4;
      } else {
        hasCast = false; changeSource(V.again1); phase = 1;
      }
      resetSpells(); return;
    }

    if (phase === 4) {
      const cost = (castSpell === 'protect') ? 2 : 8;
      manaL -= cost; manaSet('l', manaL);
      if (manaL <= 0) { play(sndReset); changeSource(V.defeat); phase = 0; }
      else            { play(sndDown); hasCast = true; changeSource(V.castResp2); phase = 5; }
      resetSpells(); return;
    }

    if (phase === 5) {
      if (castSpell === 'freeze') { changeSource(V.freeze2); phase = 6; }
      else                        { hasCast = false; changeSource(V.again2); phase = 4; }
      resetSpells(); return;
    }

    if (phase === 6) {
      if (castSpell === 'iceArrow') {
        manaR -= 6; manaSet('r', manaR); play(sndDown);
        changeSource(V.iceArrow2); phase = 7;
      } else {
        hasCast = false; changeSource(V.again2); phase = 4;
      }
      resetSpells(); return;
    }

    if (phase === 7) {
      const cost = (castSpell === 'protect') ? 4 : 8;
      manaL -= cost; manaSet('l', manaL);
      if (manaL <= 0) { play(sndReset); changeSource(V.defeat); phase = 0; }
      else            { play(sndDown); hasCast = true; changeSource(V.castResp3); phase = 8; }
      resetSpells(); return;
    }

    if (phase === 8) {
      if (castSpell === 'freeze') { changeSource(V.freeze3); phase = 9; }
      else                        { hasCast = false; changeSource(V.again3); phase = 7; }
      resetSpells(); return;
    }

    if (phase === 9) {
      if (castSpell === 'iceArrow') {
        manaR -= 4; manaSet('r', manaR); play(sndReset);
        changeSource(V.victory); phase = 0;
      } else {
        hasCast = false; changeSource(V.again3); phase = 7;
      }
      resetSpells(); return;
    }
  }

  // ---------- input wiring ----------------------------------------------

  document.querySelectorAll('.rune').forEach((el) => {
    const spell = el.dataset.spell;
    el.addEventListener('click', () => spellButton(spell));
  });

  if (mqBtn) mqBtn.addEventListener('click', mqButton);
  if (castBtn) castBtn.addEventListener('click', handleCast);

  // Keyboard shortcuts (handy on desktop / when wand isn't connected)
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case '1': spellButton('protect');  break;
      case '2': spellButton('freeze');   break;
      case '3': spellButton('reveal');   break;
      case '4': spellButton('iceArrow'); break;
      case ' ':
      case 'Enter':
        handleCast(); break;
      case 'm':
      case 'M':
        mqButton(); break;
    }
  });

  // Kick off entrance sound + idle clip on first user interaction
  // (browsers block autoplay-with-audio until a gesture).
  function bootstrap() {
    play(sndEnter);
    changeSource(V.idle);
    document.removeEventListener('click', bootstrap);
    document.removeEventListener('touchstart', bootstrap);
    document.removeEventListener('keydown', bootstrap);
  }
  document.addEventListener('click', bootstrap, { once: false });
  document.addEventListener('touchstart', bootstrap, { once: false });
  document.addEventListener('keydown', bootstrap, { once: false });

  // Once the socket connects, push an initial idle source so the video
  // screen has something even if no one has tapped yet.
  socket.on('connect', () => changeSource(V.idle));

  setStatus('UI — ready');
})();
