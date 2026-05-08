/* Silver Dragon Portal — Simon-says / pattern matching, 4 sequences. */
(function () {
  'use strict';
  const ID = 'silver_dragon';
  const B = '/clips/silver_dragon/';
  const VID = {
    idle:   B + 'SilverDragonPortalIntro_TS.webm',
    intro:  B + 'SilverDragonDuelIntro_REV_2010-04-14_TS.webm',
    crystals: { 1: B + '1Crystal.webm', 2: B + '2Crystal.webm', 3: B + '3Crystal.webm', 4: B + '4Crystal.webm', 5: B + '5Crystal.webm' },
    a1: B + 'SilverDragonSequence1Attack_REV_2010-04-14_TS.webm',
    s1: B + 'SilverDragonSequence1Success_REV_2010-04-14_TS.webm',
    f1: B + 'SilverDragonSequence1Fail_REV_2010-04-14_TS.webm',
    a2: B + 'SilverDragonSequence2Attack_REV_2010-04-14_TS.webm',
    s2: B + 'SilverDragonSequence2Success_REV_2010-04-14_TS.webm',
    f2: B + 'SilverDragonSequence2Fail_REV_2010-04-14_TS.webm',
    a3: B + 'SilverDragonSequence3Attack_REV_2010-04-14_TS.webm',
    s3: B + 'SilverDragonSequence3Success_REV_2010-04-14_TS.webm',
    f3: B + 'SilverDragonSequence3Fail_REV_2010-04-14_TS.webm',
    a4: B + 'SilverDragonSequence4Attack_REV_2010-04-14_TS.webm',
    s4: B + 'SilverDragonSequence4Success_REV_2010-04-14_TS.webm',
    f4: B + 'SilverDragonSequence4Fail_REV_2010-04-14_TS.webm',
  };
  const SEQ_LENGTHS = [3, 5, 7, 7];
  const ATTACK_VID  = [VID.a1, VID.a2, VID.a3, VID.a4];
  const SUCCESS_VID = [VID.s1, VID.s2, VID.s3, VID.s4];
  const FAIL_VID    = [VID.f1, VID.f2, VID.f3, VID.f4];

  const BUTTONS = [
    { key: '1', image: '/images/tsCrystalRedLit.png',    label: 'Red' },
    { key: '2', image: '/images/tsCrystalBlueLit.png',   label: 'Blue' },
    { key: '3', image: '/images/tsCrystalWhiteLit.png',  label: 'White' },
    { key: '4', image: '/images/tsCrystalYellowLit.png', label: 'Yellow' },
    { key: '5', image: '/images/tsCrystalPurpleLit.png', label: 'Purple' },
    { key: 'medal', image: '/images/tsMedalLit.png', label: 'Submit' },
  ];

  function genSeq(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(String(1 + Math.floor(Math.random() * 5)));
    return out;
  }

  function init(_a, eng, st) {
    eng.setSpells(BUTTONS, { castButton: false });
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0;
    st.extra = { round: 0, sysSeq: [], playerSeq: [], showIdx: 0, mode: 'idle' };
    eng.changeSource(VID.idle);
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndDown);
    st.extra.round = 0;
    st.extra.mode  = 'intro';
    st.phase = 1;
    eng.changeSource(VID.intro);
  }

  // Player taps a crystal or the medal button.
  function onSpell(key, eng, st) {
    if (st.extra.mode !== 'input') return;
    if (key === 'medal') {
      // verify
      const target = st.extra.sysSeq;
      const player = st.extra.playerSeq;
      const ok = target.length === player.length && target.every((v, i) => v === player[i]);
      const round = st.extra.round;
      st.extra.mode = 'verify';
      if (ok) {
        eng.setManaR(st.manaR - 4); eng.play(eng.sndDown);
        eng.changeSource(SUCCESS_VID[round]);
      } else {
        eng.setManaL(0); eng.play(eng.sndReset);
        eng.changeSource(FAIL_VID[round]);
      }
      return;
    }
    st.extra.playerSeq.push(key);
    eng.setStatus('input: ' + st.extra.playerSeq.join(' '));
  }

  function onCast() {}

  function startSequenceShow(eng, st) {
    const round = st.extra.round;
    st.extra.sysSeq    = genSeq(SEQ_LENGTHS[round]);
    st.extra.playerSeq = [];
    st.extra.showIdx   = 0;
    st.extra.mode      = 'show';
    eng.setStatus('memorize the pattern…');
    showNextCrystal(eng, st);
  }

  function showNextCrystal(eng, st) {
    const idx = st.extra.showIdx;
    if (idx >= st.extra.sysSeq.length) {
      // done showing -> attack prompt + accept input
      st.extra.mode = 'attack';
      eng.changeSource(ATTACK_VID[st.extra.round]);
      return;
    }
    const c = st.extra.sysSeq[idx];
    eng.changeSource(VID.crystals[c]);
    st.extra.showIdx = idx + 1;
  }

  function onVideoEnded(_src, eng, st) {
    if (st.phase === 0) { eng.changeSource(VID.idle); eng.setMQDisabled(false); return; }
    const x = st.extra;
    if (x.mode === 'intro')  { startSequenceShow(eng, st); return; }
    if (x.mode === 'show')   { showNextCrystal(eng, st);   return; }
    if (x.mode === 'attack') {
      x.mode = 'input';
      eng.setStatus('repeat the pattern, then tap the medallion');
      // freeze on last attack frame by replaying it muted? simplest: leave
      // last frame visible by re-emitting attack vid (pause via short clip)
      return;
    }
    if (x.mode === 'verify') {
      // success or fail clip ended
      if (st.manaL <= 0) { st.phase = 0; eng.setMQDisabled(false); eng.changeSource(VID.idle); return; }
      x.round++;
      if (x.round >= SEQ_LENGTHS.length) {
        // final victory
        st.phase = 0; eng.setMQDisabled(false); eng.changeSource(VID.idle); return;
      }
      startSequenceShow(eng, st); return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Silver Dragon Portal', image: '/images/qsSilverDragon.png' },
    init, onMQ, onSpell, onCast, onVideoEnded,
  };
})();
