/* Winterra — 12-phase strict spell sequence. */
(function () {
  'use strict';
  const ID = 'winterra';
  const W = (n) => '/clips/winterra/ID' + n + '.webm';
  const C = (n) => '/clips/charlock/Dragon' + n + '.mp4';
  const VID = {
    idle: C('0001'),
    intro: W('1'),
    p1ok: W('3'),  p1fail: W('2'),
    p2ok: W('5'),  p2fail: W('4A'),
    p3ok: W('6'),  p3fail: W('4B'),
    p4ok: W('7'),  p4fail: W('4C'),
    p5ok: W('8'),  p5fail: W('4D'),
    p6ok: W('9'),  p6fail: W('4E'),
    p7ok: W('10'), p7fail: W('4F'),
    p8ok: W('11'), p8fail: W('4G'),
    p9ok: W('12'), p9fail: W('4H'),
    p10ok:W('13'), p10fail:W('4I'),
    p11ok:W('14'), p11fail:W('4J'),
    p12ok:W('15'), p12fail:W('4K'),
  };
  const SPELLS = [
    { key: 'protect',  image: '/images/Protection_Rune.webp' },
    { key: 'freeze',   image: '/images/Freeze_Rune.webp' },
    { key: 'reveal',   image: '/images/R071.gif' },
    { key: 'iceArrow', image: '/images/Ice_Arrow_Rune.webp' },
  ];
  const SEQ = {
    1:  { spell: 'protect',  ok: VID.p1ok,  fail: VID.p1fail,  costL: 2 },
    2:  { spell: 'reveal',   ok: VID.p2ok,  fail: VID.p2fail },
    3:  { spell: 'freeze',   ok: VID.p3ok,  fail: VID.p3fail },
    4:  { spell: 'iceArrow', ok: VID.p4ok,  fail: VID.p4fail,  costR: 6 },
    5:  { spell: 'protect',  ok: VID.p5ok,  fail: VID.p5fail,  costL: 2 },
    6:  { spell: 'reveal',   ok: VID.p6ok,  fail: VID.p6fail },
    7:  { spell: 'freeze',   ok: VID.p7ok,  fail: VID.p7fail },
    8:  { spell: 'iceArrow', ok: VID.p8ok,  fail: VID.p8fail,  costR: 6 },
    9:  { spell: 'protect',  ok: VID.p9ok,  fail: VID.p9fail,  costL: 4 },
    10: { spell: 'reveal',   ok: VID.p10ok, fail: VID.p10fail },
    11: { spell: 'freeze',   ok: VID.p11ok, fail: VID.p11fail },
    12: { spell: 'iceArrow', ok: VID.p12ok, fail: VID.p12fail, costR: 4, victory: true },
  };

  function init(_a, eng, st) {
    eng.setSpells(SPELLS);
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0;
    eng.changeSource(VID.idle);
    eng.play(eng.sndEnter);
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndDown);
    st.phase = 1;
    eng.clearSpellHighlight();
    eng.changeSource(VID.intro);
  }

  function onSpell() {}
  function onCast(_a, _eng, st) {
    if (st.activeSpell) st.castSpell = st.activeSpell;
  }

  function onVideoEnded(_src, eng, st) {
    if (st.phase === 0) { eng.changeSource(VID.idle); eng.setMQDisabled(false); return; }
    const def = SEQ[st.phase];
    if (!def) return;
    const ok = (st.castSpell === def.spell);
    if (ok) {
      if (def.costL) { eng.setManaL(st.manaL - def.costL); eng.play(eng.sndDown); }
      if (def.costR) { eng.setManaR(st.manaR - def.costR); eng.play(eng.sndDown); }
      if (def.victory) { eng.play(eng.sndReset); eng.changeSource(def.ok); st.phase = 0; }
      else             { eng.changeSource(def.ok); st.phase++; }
    } else {
      eng.play(eng.sndReset);
      eng.changeSource(def.fail);
      eng.setManaL(0);
      st.phase = 0;
    }
    st.activeSpell = ''; st.castSpell = '';
    eng.clearSpellHighlight();
  }

  window.Encounters[ID] = {
    meta: { name: 'Winterra (Ice Dragon)', image: '/images/A08.jpg' },
    init, onMQ, onSpell, onCast, onVideoEnded,
  };
})();
