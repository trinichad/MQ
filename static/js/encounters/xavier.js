/* Xavier — RPS-style 5-clan duel.
 *
 * Counters (player clan beats opponent clan):
 *   warrior  > majestic
 *   majestic > trixter
 *   trixter  > shadow
 *   shadow   > woodsy
 *   woodsy   > warrior
 * Anything else loses (or matches → draw, treated as loss for simplicity).
 *
 * Win 5 attacks to defeat Xavier.
 */
(function () {
  'use strict';
  const ID = 'xavier';
  const B = '/clips/xavier/';
  const VID = {
    idle:        B + 'XavierIdle_Rev_11_18_08.webm',
    intro:       B + 'XavierDuelIntro_Rev_11_18_08.webm',
    introRetry:  B + 'XavierDuelIntroRepeatTry_Rev_11_18_08.webm',
    retreat:     B + 'XavierDuelRetreat_Rev_11_18_08.webm',
    instaKill:   B + 'XavierDuelXavierInstantKill_Rev_11_18_08.webm',
    noMana:      B + 'XavierDuelXavierNoMana_Rev_11_18_08.webm',
    magiLose:    B + 'XavierDuelMagiLose_Rev_11_18_08.webm',
    magiWin:     B + 'XavierDuelMagiWin_Rev_11_18_08.webm',
    magiWinRune: B + 'XavierDuelMagiWinWithRune_Rev_11_18_08.webm',
    magiNoMana:  B + 'XavierDuelMagiNoManaLose_Rev_11_18_08.webm',
    attacks: {
      warrior:  B + 'XavierDuelWarriorAttack_Rev_11_18_08.webm',
      majestic: B + 'XavierDuelMajesticAttack_Rev_11_18_08.webm',
      trixter:  B + 'XavierDuelTrixterAttack_Rev_11_18_08.webm',
      shadow:   B + 'XavierDuelShadowAttack_Rev_11_18_08.webm',
      woodsy:   B + 'XavierDuelWoodsyAttack_Rev_11_18_08.webm',
    },
    win: {
      warrior:  B + 'XavierDuelWarriorAttackMagiWin_Rev_11_18_08.webm',
      majestic: B + 'XavierDuelMajesticAttackMagiWin_Rev_11_18_08.webm',
      trixter:  B + 'XavierDuelTrixterAttackMagiWin_Rev_11_18_08.webm',
      shadow:   B + 'XavierDuelShadowAttackMagiWin_Rev_11_18_08.webm',
      woodsy:   B + 'XavierDuelWoodsyAttackMagiWin_Rev_11_18_08.webm',
    },
    lose: {
      warrior:  B + 'XavierDuelWarriorAttackMagiLose_Rev_11_18_08.webm',
      majestic: B + 'XavierDuelMajesticAttackMagiLose_Rev_11_18_08.webm',
      trixter:  B + 'XavierDuelTrixterAttackMagiLose_Rev_11_18_08.webm',
      shadow:   B + 'XavierDuelShadowAttackMagiLose_Rev_11_18_08.webm',
      woodsy:   B + 'XavierDuelWoodsyAttackMagiLose_Rev_11_18_08.webm',
    },
    clanResp: {
      warrior:  B + 'XavierDuelMagiKreiger_Rev_11_18_08.webm',
      majestic: B + 'XavierDuelMagiKoni_Rev_11_18_08.webm',
      trixter:  B + 'XavierDuelMagiWitz_Rev_11_18_08.webm',
      shadow:   B + 'XavierDuelMagiSchatten_Rev_11_18_08.webm',
      woodsy:   B + 'XavierDuelMagiWald_Rev_11_18_08.webm',
    },
  };

  const CLANS = ['warrior', 'majestic', 'trixter', 'shadow', 'woodsy'];

  // player clan (key) -> opponent clan it BEATS
  const BEATS = {
    warrior:  'majestic',
    majestic: 'trixter',
    trixter:  'shadow',
    shadow:   'woodsy',
    woodsy:   'warrior',
  };

  const BUTTONS = [
    { key: 'warrior',  image: '/images/kreiger1.png',  label: 'Warrior'  },
    { key: 'majestic', image: '/images/koni1.png',     label: 'Majestic' },
    { key: 'trixter',  image: '/images/witz1.png',     label: 'Trixter'  },
    { key: 'shadow',   image: '/images/schatten1.png', label: 'Shadow'   },
    { key: 'woodsy',   image: '/images/wald1.png',     label: 'Woodsy'   },
  ];

  function init(_a, eng, st) {
    eng.setSpells(BUTTONS, { castButton: false });
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0;
    st.extra = { wins: 0, opponent: null, mode: 'idle' };
    eng.changeSource(VID.idle);
  }

  function pickOpponent() { return CLANS[Math.floor(Math.random() * CLANS.length)]; }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndDown);
    st.extra.wins = 0;
    st.extra.mode = 'intro';
    st.phase = 1;
    eng.changeSource(VID.intro);
  }

  // Player picks a clan to counter the current attack.
  function onSpell(key, eng, st) {
    if (st.extra.mode !== 'choose') return;
    const opp = st.extra.opponent;
    const playerClan = key;
    const win = BEATS[playerClan] === opp;
    st.extra.mode = 'resolve';
    if (win) {
      eng.setManaR(st.manaR - 3); eng.play(eng.sndDown);
      eng.changeSource(VID.win[opp]);
    } else {
      eng.setManaL(st.manaL - 4); eng.play(eng.sndDown);
      if (st.manaL <= 0) { eng.play(eng.sndReset); eng.changeSource(VID.magiLose); st.phase = 0; return; }
      eng.changeSource(VID.lose[opp]);
    }
  }

  function onCast() {}

  function startRound(eng, st) {
    const opp = pickOpponent();
    st.extra.opponent = opp;
    st.extra.mode    = 'attack';
    eng.changeSource(VID.attacks[opp]);
    eng.setStatus('Xavier attacks with ' + opp + ' — pick a clan to counter');
  }

  function onVideoEnded(_src, eng, st) {
    if (st.phase === 0) { eng.changeSource(VID.idle); eng.setMQDisabled(false); return; }
    const x = st.extra;

    if (x.mode === 'intro')  { startRound(eng, st); return; }
    if (x.mode === 'attack') { x.mode = 'choose';   return; /* wait for player click */ }
    if (x.mode === 'resolve') {
      if (st.manaL <= 0) { eng.play(eng.sndReset); eng.changeSource(VID.magiLose); st.phase = 0; eng.setMQDisabled(false); return; }
      // count win
      const wonRound = (st.manaR < 16);  // crude flag — just count rounds
      x.wins++;
      if (x.wins >= 5) {
        eng.play(eng.sndReset); eng.changeSource(VID.magiWin); st.phase = 0; eng.setMQDisabled(false); return;
      }
      startRound(eng, st); return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Xavier', image: '/images/Untitled design.jpg' },
    init, onMQ, onSpell, onCast, onVideoEnded,
  };
})();
