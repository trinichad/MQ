/* Charlock — Dragon Adventure. mp4 versions live in charlock_videos/. */
(function () {
  'use strict';
  const ID = 'charlock';
  const V = (n) => '/clips/charlock/Dragon' + n + '.mp4';
  const VID = {
    idle:      V('0001'),
    enter:     V('0002'),
    castResp1: V('0003'),
    again1:    V('0004'),
    freeze1:   V('0011'),
    iceArrow1: V('0012'),
    castResp2: V('0012A'),
    again2:    V('0013'),
    freeze2:   V('0014'),
    iceArrow2: V('0015'),
    castResp3: V('0015A'),
    again3:    V('0016'),
    freeze3:   V('0017'),
    victory:   V('0020'),
    defeat:    V('0010A'),
  };
  const SPELLS = [
    { key: 'protect',  image: '/images/Protection_Rune.webp' },
    { key: 'freeze',   image: '/images/Freeze_Rune.webp' },
    { key: 'reveal',   image: '/images/R071.gif' },
    { key: 'iceArrow', image: '/images/Ice_Arrow_Rune.webp' },
  ];

  function init(_arg, eng, st) {
    eng.setSpells(SPELLS);
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0;
    eng.changeSource(VID.idle);
    eng.setStatus('idle — press MQ to begin');
  }

  function onMQ(_arg, eng, st) {
    if (st.phase !== 0) return;
    st.hasCast = true;
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndDown);
    st.phase = 1;
    eng.changeSource(VID.enter);
    eng.clearSpellHighlight();
    eng.setMQDisabled(true);
  }

  function onSpell(_key, _eng, _st) { /* selection handled by engine */ }

  function onCast(_arg, _eng, st) {
    if (st.activeSpell !== '') {
      st.castSpell = st.activeSpell;
    }
  }

  function onVideoEnded(_src, eng, st) {
    if (st.phase === 0) {
      eng.clearSpellHighlight();
      eng.changeSource(VID.idle);
      eng.setManaL(0); eng.setManaR(0);
      eng.setMQDisabled(false);
      return;
    }

    const cast = st.castSpell;
    const reset = () => { st.activeSpell = ''; st.castSpell = ''; eng.clearSpellHighlight(); };

    if (st.phase === 1) {
      const cost = (cast === 'protect') ? 2 : 8;
      eng.setManaL(st.manaL - cost);
      if (st.manaL <= 0) { eng.play(eng.sndReset); eng.changeSource(VID.defeat); st.phase = 0; }
      else               { eng.play(eng.sndDown); st.hasCast = true; eng.changeSource(VID.castResp1); st.phase = 2; }
      return reset();
    }
    if (st.phase === 2) {
      if (cast === 'freeze') { st.hasCast = true; eng.changeSource(VID.freeze1); st.phase = 3; }
      else                   { st.hasCast = false; eng.changeSource(VID.again1); st.phase = 1; }
      return reset();
    }
    if (st.phase === 3) {
      if (cast === 'iceArrow') {
        eng.setManaR(st.manaR - 6); eng.play(eng.sndDown);
        eng.changeSource(VID.iceArrow1); st.phase = 4;
      } else {
        st.hasCast = false; eng.changeSource(VID.again1); st.phase = 1;
      }
      return reset();
    }
    if (st.phase === 4) {
      const cost = (cast === 'protect') ? 2 : 8;
      eng.setManaL(st.manaL - cost);
      if (st.manaL <= 0) { eng.play(eng.sndReset); eng.changeSource(VID.defeat); st.phase = 0; }
      else               { eng.play(eng.sndDown); st.hasCast = true; eng.changeSource(VID.castResp2); st.phase = 5; }
      return reset();
    }
    if (st.phase === 5) {
      if (cast === 'freeze') { eng.changeSource(VID.freeze2); st.phase = 6; }
      else                   { st.hasCast = false; eng.changeSource(VID.again2); st.phase = 4; }
      return reset();
    }
    if (st.phase === 6) {
      if (cast === 'iceArrow') {
        eng.setManaR(st.manaR - 6); eng.play(eng.sndDown);
        eng.changeSource(VID.iceArrow2); st.phase = 7;
      } else {
        st.hasCast = false; eng.changeSource(VID.again2); st.phase = 4;
      }
      return reset();
    }
    if (st.phase === 7) {
      const cost = (cast === 'protect') ? 4 : 8;
      eng.setManaL(st.manaL - cost);
      if (st.manaL <= 0) { eng.play(eng.sndReset); eng.changeSource(VID.defeat); st.phase = 0; }
      else               { eng.play(eng.sndDown); st.hasCast = true; eng.changeSource(VID.castResp3); st.phase = 8; }
      return reset();
    }
    if (st.phase === 8) {
      if (cast === 'freeze') { eng.changeSource(VID.freeze3); st.phase = 9; }
      else                   { st.hasCast = false; eng.changeSource(VID.again3); st.phase = 7; }
      return reset();
    }
    if (st.phase === 9) {
      if (cast === 'iceArrow') {
        eng.setManaR(st.manaR - 4); eng.play(eng.sndReset);
        eng.changeSource(VID.victory); st.phase = 0;
      } else {
        st.hasCast = false; eng.changeSource(VID.again3); st.phase = 7;
      }
      return reset();
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Dragon Adventure (Charlock)', image: '/images/Dragon_Adventure.jpg' },
    init, onMQ, onSpell, onCast, onVideoEnded,
  };
})();
