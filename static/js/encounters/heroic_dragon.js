/* Heroic Dragon — 18-phase strict sequence using clips from
 * /clips/charlock/, /clips/winterra/, /clips/heroic_dragon/.
 *
 * Each phase requires a specific spell. Wrong spell -> reset to phase 0
 * (or 'shar dead' on critical phases) with the matching failure clip.
 */
(function () {
  'use strict';
  const ID = 'heroic_dragon';

  const C  = (n) => '/clips/charlock/Dragon' + n + '.mp4';
  const W  = (n) => '/clips/winterra/ID'    + n + '.webm';
  const H  = (n) => '/clips/heroic_dragon/' + n;

  const VID = {
    idle:        C('0001'),
    sharDead:    C('0010A'),
    p1ok:        C('0003'),
    p1fail:      C('0010A'),
    p2ok:        C('0011'),
    p2fail:      C('0004'),
    p3ok:        H('AdvHeroicDragonD12ID3.webm'),
    p3fail:      C('0004'),
    p4ok:        W('5'),    p4fail: W('4A'),
    p5ok:        W('6'),    p5fail: W('4B'),
    p6ok:        W('7'),    p6fail: W('4C'),
    p7ok:        H('AdvHeroicDragonID8D12A.webm'),  p7fail: W('4D'),
    p8ok:        H('AdvHeroicDragonD14ID8.webm'),    p8fail: C('0013'),
    p9ok:        W('9'),    p9fail:  W('4E'),
    p10ok:       W('10'),   p10fail: W('4F'),
    p11ok:       H('AdvHeroicDragonID11D14.webm'),   p11fail: W('4G'),
    p12ok:       H('AdvHeroicDragonD15AID12D15.webm'), p12fail: W('4H'),
    p13ok:       H('AdvHeroicDragonD15AID12.webm'),  p13fail: C('0010A'),
    p14ok:       H('Doctored Heroic Dragon Clip.webm'), p14fail: W('4I'),
    p15ok:       H('AdvHeroicDragonD17ID12.webm'),   p15fail: C('0016'),
    p16ok:       H('AdvHeroicDragonID13D17.webm'),   p16fail: W('4I'),
    p17ok:       H('AdvHeroicDragonWin.webm'),       p17fail: C('0016'),
  };

  const SPELLS = [
    { key: 'protect',  image: '/images/Protection_Rune.webp' },
    { key: 'freeze',   image: '/images/Freeze_Rune.webp' },
    { key: 'reveal',   image: '/images/R071.gif' },
    { key: 'iceArrow', image: '/images/Ice_Arrow_Rune.webp' },
  ];

  // Required spell per phase (1..17). Wrong spell with a specific cost is mana hit.
  const SEQ = {
    1:  { spell: 'protect',  ok: VID.p1ok,  fail: VID.p1fail,  failPhase: 0,  costR: 0 },
    2:  { spell: 'freeze',   ok: VID.p2ok,  fail: VID.p2fail,  failPhase: 0,  costR: 0 },
    3:  { spell: 'iceArrow', ok: VID.p3ok,  fail: VID.p3fail,  failPhase: 0,  costR: 2 },
    4:  { spell: 'reveal',   ok: VID.p4ok,  fail: VID.p4fail,  failPhase: 0,  costR: 0 },
    5:  { spell: 'freeze',   ok: VID.p5ok,  fail: VID.p5fail,  failPhase: 0,  costR: 0 },
    6:  { spell: 'iceArrow', ok: VID.p6ok,  fail: VID.p6fail,  failPhase: 0,  costR: 2 },
    7:  { spell: 'protect',  ok: VID.p7ok,  fail: VID.p7fail,  failPhase: 0,  costR: 0 },
    8:  { spell: 'freeze',   ok: VID.p8ok,  fail: VID.p8fail,  failPhase: 0,  costR: 0 },
    9:  { spell: 'reveal',   ok: VID.p9ok,  fail: VID.p9fail,  failPhase: 0,  costR: 0 },
    10: { spell: 'freeze',   ok: VID.p10ok, fail: VID.p10fail, failPhase: 0,  costR: 0 },
    11: { spell: 'iceArrow', ok: VID.p11ok, fail: VID.p11fail, failPhase: 0,  costR: 4 },
    12: { spell: 'iceArrow', ok: VID.p12ok, fail: VID.p12fail, failPhase: 0,  costR: 4 },
    13: { spell: 'protect',  ok: VID.p13ok, fail: VID.p13fail, failPhase: 0,  costR: 0 },
    14: { spell: 'reveal',   ok: VID.p14ok, fail: VID.p14fail, failPhase: 0,  costR: 0 },
    15: { spell: 'freeze',   ok: VID.p15ok, fail: VID.p15fail, failPhase: 0,  costR: 0 },
    16: { spell: 'reveal',   ok: VID.p16ok, fail: VID.p16fail, failPhase: 0,  costR: 0 },
    17: { spell: 'iceArrow', ok: VID.p17ok, fail: VID.p17fail, failPhase: 0,  costR: 4, victory: true },
  };

  function init(_a, eng, st) {
    eng.setSpells(SPELLS);
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0;
    eng.changeSource(VID.idle);
    eng.play(eng.sndEnter);
    eng.setStatus('press MQ to begin');
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndEnter);
    st.phase = 1;
    eng.clearSpellHighlight();
    // The first phase reuses the idle clip as its "intro"; immediately go to
    // phase 1 and let the first SEQ entry play on advance after the idle ends.
    eng.changeSource(VID.idle);
  }

  function onSpell() {}
  function onCast(_a, _eng, st) {
    if (st.activeSpell) st.castSpell = st.activeSpell;
  }

  function onVideoEnded(_src, eng, st) {
    if (st.phase === 0) {
      eng.changeSource(VID.idle);
      eng.setMQDisabled(false);
      return;
    }
    const def = SEQ[st.phase];
    if (!def) return;
    const ok = (st.castSpell === def.spell);
    if (ok) {
      if (def.costR) eng.setManaR(st.manaR - def.costR);
      if (def.costR) eng.play(eng.sndDown);
      if (def.victory) { eng.play(eng.sndReset); eng.changeSource(def.ok); st.phase = 0; }
      else             { eng.changeSource(def.ok); st.phase = st.phase + 1; }
    } else {
      eng.play(eng.sndReset);
      eng.changeSource(def.fail);
      st.phase = def.failPhase || 0;
      eng.setManaL(0);
    }
    st.activeSpell = ''; st.castSpell = '';
    eng.clearSpellHighlight();
  }

  window.Encounters[ID] = {
    meta: { name: 'Heroic Dragon', image: '/images/qsHeroicDragon.png' },
    init, onMQ, onSpell, onCast, onVideoEnded,
  };
})();
