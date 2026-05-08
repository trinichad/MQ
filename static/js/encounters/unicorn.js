/* Unicorn (Glittertail) — click-to-cast with random idle and 4 branches. */
(function () {
  'use strict';
  const ID = 'unicorn';
  const V = (n) => '/clips/unicorn/Unicorn' + n + '.webm';
  const VID = {
    intro:  V('001'),
    idleA:  V('002'), idleB: V('003'), idleC: V('004'),
    fail1:  V('005'), fail2: V('006'), fail3: V('007'), fail4: V('008'),
    hit:    V('009'),
    stun1:  V('010'), stun2: V('011'), stun3: V('012'), stun4: V('013'),
    victory: '/clips/unicorn/Unicorn014_original.webm',
    defeat:  V('015'),
  };

  function pickIdle() {
    const arr = [VID.idleA, VID.idleB, VID.idleC];
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
    if (st.phase === 0) { eng.changeSource(VID.defeat); eng.setMQDisabled(false); st.phase = 1; return; }
    if (st.phase === 1) { eng.changeSource(pickIdle()); return; }
    if (st.phase === 2) {
      if (cast) { eng.changeSource(VID.fail1); st.phase = 3; }
      else      { eng.changeSource(pickIdle()); }
      return;
    }
    if (st.phase >= 3 && st.phase <= 6) {
      if (cast) { eng.changeSource(VID.hit); st.phase = 7; return; }
      const next = st.phase + 1;
      const failVid = [VID.fail1, VID.fail2, VID.fail3, VID.fail4][st.phase - 3];
      if (next > 6) { eng.play(eng.sndReset); eng.changeSource(failVid); st.phase = 0; }
      else          { eng.changeSource(failVid); st.phase = next; }
      return;
    }
    if (st.phase >= 7 && st.phase <= 10) {
      if (cast) { eng.play(eng.sndReset); eng.changeSource(VID.victory); st.phase = 0; return; }
      const stunVid = [VID.stun1, VID.stun2, VID.stun3, VID.stun4][st.phase - 7];
      const next = st.phase + 1;
      if (next > 10) { eng.play(eng.sndReset); eng.changeSource(stunVid); st.phase = 0; }
      else           { eng.changeSource(stunVid); st.phase = next; }
      return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Unicorn (Glittertail)', image: '/images/A04.jpg' },
    init, onMQ, onCast, onVideoEnded,
  };
})();
