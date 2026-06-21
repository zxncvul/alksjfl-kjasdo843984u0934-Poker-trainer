'use strict';

(function (RT) {
  const PHASES = Object.freeze({
    CONFIGURING: 'configuring',
    READY: 'ready',
    QUESTION: 'question',
    CORRECT: 'correct',
    ERROR: 'error',
    REVIEW: 'review',
    FINISHED: 'finished',
    TIMEOUT: 'timeout'
  });

  function create() {
    const state = {
      phase: PHASES.CONFIGURING,
      category: 'numa',
      activePresetId: null,
      presetFilter: 'all',
      feedback: 'Elige un preset o configura una sesión.',
      config: {
        sessionSize: 20,
        chrono: true,
        countdown: 0,
        numa: {
          operations: new Set(['+', '-']),
          numbers: new Set([1, 2, 3, 4, 5]),
          start: 1,
          end: 10,
          chain: 2,
          pokerLevels: new Set(),
          modes: new Set(['Random']),
          fuguesSpeed: '1H'
        },
        potOdds: {
          outs: new Set([1, 2, 3, 4, 5]),
          domains: new Set(['raw_percent']),
          streets: new Set(['flop_turn']),
          conversion: false
        },
        equity: {
          practical: true,
          theory: false,
          practicalTypes: new Set(['relacion']),
          ranges: new Set(['2-10']),
          bets: new Set(['1/4', '1/3', '1/2']),
          theoryFormats: new Set(['percent']),
          theoryTypes: new Set(['eq'])
        },
        spr: {
          practical: true,
          stacks: new Set(['15-35']),
          pots: new Set(['2-10']),
          flashcards: new Set()
        }
      },
      session: {
        status: 'idle',
        snapshot: null,
        statsContext: null,
        queue: [],
        retryQueue: [],
        original: [],
        current: null,
        input: '',
        answerLocked: false,
        history: [],
        played: 0,
        correct: 0,
        failed: 0,
        startedAt: 0,
        questionStartedAt: 0,
        elapsedMs: 0,
        remainingMs: 0,
        lastTimeMs: 0,
        totalCorrectTimeMs: 0
      }
    };
    const listeners = new Set();
    const notify = () => listeners.forEach(listener => listener(state));
    return {
      state,
      phases: PHASES,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      notify
    };
  }

  RT.MathTrainerState = { create, PHASES };
})(window.RT);
