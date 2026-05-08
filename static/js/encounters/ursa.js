/* Ursa Major (bear) — click-to-cast, similar shape to Unicorn. */
(function () {
  'use strict';
  const ID = 'ursa';
  const V = (n) => '/clips/ursa/bear' + n + '.webm';
  const VID = {
    intro:  V('0001'),
    idleA:  V('0002'), idleB: V('0003'),
    hitTrans: V('0004'),
    fail1A: V('0005A'), fail1B: V('0005B'),
    stun1: V('0006'),
    fail2: V('0007'), stun2: V('0008'),
    fail3: V('0009'), stun3: V('0010'),
    fail4: V('0011'), stun4: V('0012'),
    defeatLoop: V('0013'),
    victory: V('0014'),
    defeat:  V('0015'),
    end:     V('0016'),
  };

  function pickIdle() {
    const arr = [VID.idleA, VID.idleB];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function init(_a, eng, st) {
    eng.setSpells([]);
    eng.setMQDisabled(false);
    st.phase = 1; st.hasCast = false;
    eng.changeSource(pickIdle());
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 1) return;
    eng.setMQDisabled(true);
    st.phase = 2; st.hasCast = false;
    eng.changeSource(VID.intro);
  }

  function onCast(_a, _eng, st) { st.hasCast = true; }

  function onVideoEnded(_src, eng, st) {
    const cast = st.hasCast; st.hasCast = false;
    if (st.phase === 0) { eng.changeSource(VID.end); eng.setMQDisabled(false); st.phase = 1; return; }
    if (st.phase === 1) { eng.changeSource(pickIdle()); return; }
    if (st.phase === 2) {
      if (cast) { eng.changeSource(VID.hitTrans); st.phase = 3; }
      else      { eng.changeSource(pickIdle()); }
      return;
    }
    if (st.phase === 3) {
      if (cast) { eng.changeSource(VID.stun1); st.phase = 6; }
      else      { eng.changeSource(VID.fail1A); st.phase = 4; }
      return;
    }
    if (st.phase === 4) {
      if (cast) { eng.changeSource(VID.stun1); st.phase = 6; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.defeatLoop); st.phase = 0; }
      return;
    }
    if (st.phase === 6) {
      if (cast) { eng.changeSource(VID.stun2); st.phase = 7; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.fail2); st.phase = 0; }
      return;
    }
    if (st.phase === 7) {
      if (cast) { eng.changeSource(VID.stun3); st.phase = 8; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.fail3); st.phase = 0; }
      return;
    }
    if (st.phase === 8) {
      if (cast) { eng.changeSource(VID.stun4); st.phase = 9; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.fail4); st.phase = 0; }
      return;
    }
    if (st.phase === 9) {
      if (cast) { eng.play(eng.sndReset); eng.changeSource(VID.victory); st.phase = 0; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.defeat);  st.phase = 0; }
      return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Ursa Major', image: '/images/qsUrsaMajor.jpg' },
    init, onMQ, onCast, onVideoEnded,
  };
})();
