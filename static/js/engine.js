/* MagiQuest engine — shared infrastructure for all encounters.
 *
 * Each encounter is a self-contained module under window.Encounters[id]
 * (see /static/js/encounters/*.js). The engine takes care of:
 *   - websocket plumbing (change_video <-> video_ended <-> ir_trigger)
 *   - mana bar updates and audio playback
 *   - rebuilding the rune row for the current encounter
 *   - swapping between menu and game screens
 */
(function () {
  'use strict';

  // ---------------- DOM ----------------

  const menuScreen  = document.getElementById('menu-screen');
  const gameScreen  = document.getElementById('game-screen');
  const leftMana    = document.getElementById('left-mana');
  const rightMana   = document.getElementById('right-mana');
  const mqBtn       = document.getElementById('mqbutton');
  const castBtn     = document.getElementById('cast-btn');
  const spellRow    = document.querySelector('.spell-row');
  const statusEl    = document.getElementById('status');
  const sndDown     = document.getElementById('snd-manadown');
  const sndReset    = document.getElementById('snd-manareset');
  const sndEnter    = document.getElementById('snd-entrance');

  // ---------------- shared mutable state ----------------

  const state = {
    activeEncounter: null,   // encounter id string
    phase: 0,
    manaL: 0, manaR: 0,
    activeSpell: '',
    castSpell: '',
    hasCast: false,
    extra: {},               // free-for-all per-encounter scratch
  };

  // ---------------- networking ----------------

  const socket = io();
  socket.on('connect',    () => setStatus('connected'));
  socket.on('disconnect', () => setStatus('disconnected'));
  socket.on('video_ended', (data) => dispatch('onVideoEnded', data && data.src));
  socket.on('ir_trigger',  ()      => dispatch('onCast'));

  function changeSource(url) {
    socket.emit('change_video', { src: url });
  }

  // ---------------- helpers ----------------

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = '[' + (state.activeEncounter || '-') + '] ' + msg;
    console.log('[engine]', msg);
  }
  function play(snd) {
    if (!snd) return;
    try { snd.currentTime = 0; snd.play().catch(()=>{}); } catch(_) {}
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function setManaL(v) {
    state.manaL = clamp(v, 0, 16);
    if (leftMana) leftMana.src = '/images/mana_l' + state.manaL + '.png';
  }
  function setManaR(v) {
    state.manaR = clamp(v, 0, 16);
    if (rightMana) rightMana.src = '/images/mana_r' + state.manaR + '.png';
  }
  function setMQDisabled(disabled) {
    if (mqBtn) mqBtn.src = disabled ? '/images/mqd.png' : '/images/mq.png';
  }

  // Replace the spell row with a custom set of buttons.
  // spellList: [{key, image, label?}, ...]    OR   null/[] to hide spells.
  // Pass {castButton: true|false} in opts to also hide CAST. Default = show.
  function setSpells(spellList, opts) {
    opts = opts || {};
    const showCast = opts.castButton !== false;
    spellRow.innerHTML = '';
    (spellList || []).forEach((s) => {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.className   = 'rune';
      img.src         = s.image;
      img.alt         = s.label || s.key;
      img.dataset.spell = s.key;
      img.addEventListener('click', () => onSpellClick(s.key));
      fig.appendChild(img);
      spellRow.appendChild(fig);
    });
    if (showCast) {
      const fig = document.createElement('figure');
      fig.className = 'cast-figure';
      const btn = document.createElement('button');
      btn.id = 'cast-btn';
      btn.className = 'cast-btn';
      btn.textContent = 'CAST';
      btn.addEventListener('click', dispatch.bind(null, 'onCast', null));
      fig.appendChild(btn);
      spellRow.appendChild(fig);
    }
  }
  function highlightSpell(key) {
    spellRow.querySelectorAll('.rune').forEach((el) => {
      el.classList.toggle('active', el.dataset.spell === key);
    });
  }
  function clearSpellHighlight() {
    spellRow.querySelectorAll('.rune').forEach((el) => el.classList.remove('active'));
    state.activeSpell = '';
    state.castSpell   = '';
  }

  function onSpellClick(key) {
    state.activeSpell = key;
    highlightSpell(key);
    setStatus('selected: ' + key);
    dispatch('onSpell', key);
  }

  // ---------------- dispatch to active encounter ----------------

  function dispatch(method, arg) {
    const enc = state.activeEncounter && window.Encounters[state.activeEncounter];
    if (!enc) return;
    const fn = enc[method];
    if (typeof fn !== 'function') return;
    try { fn(arg, ENGINE, state); }
    catch (err) { console.error('[engine] dispatch', method, err); }
  }

  // ---------------- screen swapping ----------------

  function showMenu() {
    state.activeEncounter = null;
    menuScreen.style.display = '';
    gameScreen.style.display = 'none';
    // park the video page on the MagiQuest logo screen
    changeSource('__menu__');
  }

  function showGame(encounterId) {
    const enc = window.Encounters[encounterId];
    if (!enc) { console.error('unknown encounter', encounterId); return; }
    state.activeEncounter = encounterId;
    state.phase = 0; state.manaL = 0; state.manaR = 0;
    state.activeSpell = ''; state.castSpell = ''; state.hasCast = false;
    state.extra = {};
    menuScreen.style.display = 'none';
    gameScreen.style.display = '';
    setManaL(0); setManaR(0); setMQDisabled(false);
    play(sndEnter);
    dispatch('init');
  }

  // ---------------- input wiring ----------------

  if (mqBtn)   mqBtn.addEventListener('click',   () => dispatch('onMQ'));
  // CAST button is rebuilt dynamically inside setSpells(); engine re-attaches it.
  // For initial layout (cast button already in DOM) wire it once:
  if (castBtn) castBtn.addEventListener('click', () => dispatch('onCast'));

  document.addEventListener('keydown', (e) => {
    if (!state.activeEncounter) return;   // ignore on menu
    switch (e.key) {
      case '1': case '2': case '3': case '4': case '5': {
        const idx = parseInt(e.key, 10) - 1;
        const runes = spellRow.querySelectorAll('.rune');
        if (runes[idx]) runes[idx].click();
        break;
      }
      case ' ':
      case 'Enter':  dispatch('onCast'); break;
      case 'm': case 'M': dispatch('onMQ'); break;
      case 'Escape': showMenu(); break;
    }
  });

  // ---------------- public API ----------------

  const ENGINE = {
    state,
    socket,
    changeSource,
    setStatus,
    setManaL, setManaR, setMQDisabled,
    setSpells, highlightSpell, clearSpellHighlight,
    play, sndDown, sndReset, sndEnter,
    showMenu, showGame,
  };
  window.Engine = ENGINE;
  window.Encounters = window.Encounters || {};
})();
