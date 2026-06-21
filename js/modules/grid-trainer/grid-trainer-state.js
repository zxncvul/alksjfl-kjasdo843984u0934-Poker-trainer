'use strict';

(function (RT) {
  const PHASES = Object.freeze({
    CONFIGURING: 'configuring',
    SHOWING: 'showing',
    ANSWERING: 'answering',
    CORRECT: 'correct',
    ERROR: 'error',
    FINISHED: 'round-finished'
  });

  const TRANSPORT = Object.freeze({
    STOPPED: 'stopped',
    PLAYING: 'playing',
    PAUSED: 'paused'
  });

  function create() {
    const state = {
      phase: PHASES.CONFIGURING,
      mode: 'script',
      transport: TRANSPORT.STOPPED,
      feedback: 'Grid libre: selecciona celdas o activa un patrón.',
      target: '–',
      round: 0,
      showLabels: true,
      activePresetId: null,
      presetFilter: 'all',
      presetGridSize: null,
      presetDuration: null,
      presetPattern: null,
      presetSpecialEffects: [],

      script: {
        locked: new Set(),
        highlight: null,
        wrong: new Set(),
        lockMode: false,
        randomMode: false,
        invertLock: false,
        challenge: false,
        zen: false,
        allLocked: false,
        speedIndex: 0,
        pattern: null,
        zigAmp: 1,
        zigDir: 'ltr',
        zigOrient: 'vertical'
      },

      memory: {
        seqMode: false,
        pendingSeqMode: undefined,
        speed: 5,
        orderFwd: false,
        orderBwd: false,
        colors: ['green'],
        count: 1,
        area: '6',
        centerRow: 6,
        centerCol: 6,
        manualPool: new Set(),
        eyeOn: false,
        active: false,
        inQuiz: false,
        roundSeq: [],
        currentTarget: null,
        labels: new Map()
      }
    };

    const listeners = new Set();
    const notify = () => listeners.forEach(listener => listener(state));

    return {
      state,
      phases: PHASES,
      transport: TRANSPORT,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      patch(values) {
        Object.assign(state, values);
        notify();
      },
      mutate(mutator) {
        mutator(state);
        notify();
      },
      notify
    };
  }

  RT.GridTrainerState = { create, PHASES, TRANSPORT };
})(window.RT);
