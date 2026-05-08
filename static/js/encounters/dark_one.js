/* Dark One — click-to-cast (no spells, no mana). */
(function () {
  'use strict';
  const ID = 'dark_one';
  const V = (n) => '/clips/dark_one/DarkOne' + n + '.webm';
  const VID = {
    idle:  V('0001'),
    enter: V('0002'),
    hit1:  V('0003'),
    miss1: V('0004'),
    win1:  V('0005'),
    win2:  V('0007'),
    win3:  V('0008'),
  };

  function init(_a, eng, st) {
    eng.setSpells([]);  // CAST button only
    eng.setManaL(0); eng.setManaR(0);
    eng.setMQDisabled(false);
    st.phase = 0; st.hasCast = false;
    eng.changeSource(VID.idle);
    eng.setStatus('idle — press MQ to begin, then CAST in time with the dragon');
  }

  function onMQ(_a, eng, st) {
    if (st.phase !== 0) return;
    eng.setMQDisabled(true);
    st.phase = 1;
    st.hasCast = false;
    eng.changeSource(VID.enter);
  }

  function onCast(_a, _eng, st) { st.hasCast = true; }

  function onVideoEnded(_src, eng, st) {
    const cast = st.hasCast;
    st.hasCast = false;

    if (st.phase === 0) { eng.changeSource(VID.idle); eng.setMQDisabled(false); return; }

    if (st.phase === 1) {
      if (cast) { eng.changeSource(VID.win1); st.phase = 3; }
      else      { eng.changeSource(VID.miss1); st.phase = 2; }
      return;
    }
    if (st.phase === 2) {
      if (cast) { eng.changeSource(VID.win1); st.phase = 3; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.miss1); st.phase = 0; }
      return;
    }
    if (st.phase === 3) {
      if (cast) { eng.changeSource(VID.win2); st.phase = 4; }
      else      { eng.play(eng.sndReset); eng.changeSource(VID.miss1); st.phase = 0; }
      return;
    }
    if (st.phase === 4) {
      eng.play(eng.sndReset);
      eng.changeSource(VID.win3);
      st.phase = 0;
      return;
    }
  }

  window.Encounters[ID] = {
    meta: { name: 'Dark One', image: '/images/A04.jpg' },
    init, onMQ, onCast, onVideoEnded,
  };
})();
