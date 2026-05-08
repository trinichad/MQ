/* Goblin King — sequential attack rounds with two mana bars.
 *
 * Per the spec: MQ starts, plays GoblinKing0002, then 0003 (prep, manaL→12),
 * then a sequence of attack videos 0004-0010. When the player casts at the
 * right moment (i.e. during the attack video) we step to the next mana tier
 * and hit videos 0011-0014, then victory 0015.
 */
(function () {
  'use strict';
  const ID = 'goblin';
  const V = (n) => '/clips/goblin/GoblinKing' + n + '.webm';
  const VID = {
    idle:    V('0001'),
    intro:   V('0002'),
    prep:    V('0003'),
    a4:  V('0004'), a5:  V('0005'), a6:  V('0006'), a7:  V('0007'),
    a8:  V('0008'), a9:  V('0009'), a10: V('0010'),
    hit1: V('0011'), hit2: V('0012'), hit3: V('0013'), hit4: V('0014'),
    win:  V('0015'),
  };

  function init(_a, eng, st) {
    eng.setSpells([]);
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0; st.hasCast = false;
    st.extra = { count: 4 };
    eng.changeSource(VID.idle);
    eng.setStatus('press MQ, then CAST during attack videos');
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    eng.setManaL(16); eng.setManaR(16);
    eng.play(eng.sndDown);
    st.phase = 1;
    st.hasCast = false;
    eng.changeSource(VID.intro);
  }

  function onCast(_a, _eng, st) { st.hasCast = true; }

  function onVideoEnded(_src, eng, st) {
    const cast = st.hasCast; st.hasCast = false;
    const x = st.extra;

    if (st.phase === 0) { eng.changeSource(VID.idle); eng.setMQDisabled(false); return; }

    if (st.phase === 1) {                       // intro -> prep
      eng.setManaL(12); eng.play(eng.sndDown);
      eng.changeSource(VID.prep); st.phase = 2; return;
    }
    if (st.phase === 2) {                       // prep -> first attack
      x.count = 4;
      eng.changeSource(VID['a' + x.count]); st.phase = 3; return;
    }
    if (st.phase === 3) {                       // attack window
      if (!cast) {
        x.count++;
        if (x.count > 7) {                      // exhausted attack window -> defeat
          eng.play(eng.sndReset); eng.changeSource(VID.a8); st.phase = 0; return;
        }
        eng.changeSource(VID['a' + x.count]); return;
      }
      // hit landed: step through tiers
      if (st.manaR > 14) {
        eng.setManaR(14); eng.setManaL(Math.max(0, st.manaL - 4));
        eng.play(eng.sndDown); eng.changeSource(VID.hit1); return;
      }
      if (st.manaR > 10) {
        eng.setManaR(10); eng.setManaL(Math.max(0, st.manaL - 4));
        eng.play(eng.sndDown); eng.changeSource(VID.hit2); return;
      }
      if (st.manaR > 6) {
        eng.setManaR(6);  eng.setManaL(Math.max(0, st.manaL - 4));
        eng.play(eng.sndDown); eng.changeSource(VID.hit3); return;
      }
      if (st.manaR > 2) {
        eng.setManaR(2);  eng.setManaL(Math.max(0, st.manaL - 4));
        eng.play(eng.sndDown); eng.changeSource(VID.hit4); return;
      }
      // final blow
      eng.setManaR(0); eng.play(eng.sndReset);
      eng.changeSource(VID.win); st.phase = 0; return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Princess & Goblin King', image: '/images/Princess_&_Goblin_King_Adventure.jpg' },
    init, onMQ, onCast, onVideoEnded,
  };
})();
