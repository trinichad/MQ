/* Pixie (Serena) — click-to-cast, randomized idle, 8 phases. */
(function () {
  'use strict';
  const ID = 'pixie';
  const V = (n) => '/clips/pixie/Pixie' + n + '.webm';
  const VID = {
    idleA: V('0003'), idleB: V('0004'), idleC: V('0005'),
    miss1: V('0006'), miss2: V('0007'), miss3: V('0008'),
    hit:   V('0009'),
    stun1: V('0010'), stun2: V('0011'),
    final1:V('0012'), final2:V('0013'),
    defeat:V('0014'),
    victory: '/clips/pixie/Pixie0015_Medallian.webm',
    end:   V('0016'),
  };

  function pickIdle() {
    const arr = [VID.idleA, VID.idleB, VID.idleC];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function init(_a, eng, st) {
    eng.setSpells([]);
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 1; st.hasCast = false;
    eng.changeSource(pickIdle());
    eng.setStatus('press MQ to begin');
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 1) return;
    eng.setMQDisabled(true);
    st.phase = 2; st.hasCast = false;
    eng.changeSource(VID.idleB);
  }

  function onCast(_a, _eng, st) { st.hasCast = true; }

  function onVideoEnded(_src, eng, st) {
    const cast = st.hasCast; st.hasCast = false;
    if (st.phase === 0) { eng.changeSource(VID.end); eng.setMQDisabled(false); st.phase = 1; return; }
    if (st.phase === 1) { eng.changeSource(pickIdle()); return; }
    if (st.phase === 2) {
      if (cast) { eng.changeSource(VID.hit);   st.phase = 5; }
      else      { eng.changeSource(VID.miss1); st.phase = 3; }
      return;
    }
    if (st.phase === 3) {
      if (cast) { eng.changeSource(VID.hit);   st.phase = 5; }
      else      { eng.changeSource(VID.miss2); st.phase = 4; }
      return;
    }
    if (st.phase === 4) {
      if (cast) { eng.changeSource(VID.hit);   st.phase = 5; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.miss3); st.phase = 0; }
      return;
    }
    if (st.phase === 5) {
      if (cast) { eng.changeSource(VID.stun2); st.phase = 6; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.stun1); st.phase = 0; }
      return;
    }
    if (st.phase === 6) {
      if (cast) { eng.changeSource(VID.final2); st.phase = 7; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.final1); st.phase = 0; }
      return;
    }
    if (st.phase === 7) {
      if (cast) { eng.play(eng.sndReset); eng.changeSource(VID.victory); st.phase = 0; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.defeat);  st.phase = 0; }
      return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Pixie (Serena)', image: '/images/Pixie_Adventure.jpg' },
    init, onMQ, onCast, onVideoEnded,
  };
})();
