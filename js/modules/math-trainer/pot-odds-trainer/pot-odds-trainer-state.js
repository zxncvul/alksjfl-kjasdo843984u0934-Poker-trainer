'use strict';

(function (RT) {
  const STORAGE_PREFIX = 'rangeTrainer.mathTrainer.potOddsTrainer.';
  const STATS_KEY = STORAGE_PREFIX + 'stats';

  function emptyStats() {
    return {
      played: 0,
      correct: 0,
      failed: 0,
      currentStreak: 0,
      bestStreak: 0,
      errorsByMode: {}
    };
  }

  function count(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function loadStats() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyStats();
      const stats = emptyStats();
      stats.correct = count(raw.correct);
      stats.failed = count(raw.failed);
      stats.played = stats.correct + stats.failed;
      stats.currentStreak = Math.min(count(raw.currentStreak), stats.correct);
      stats.bestStreak = Math.max(stats.currentStreak, count(raw.bestStreak));
      if (raw.errorsByMode && typeof raw.errorsByMode === 'object' &&
          !Array.isArray(raw.errorsByMode)) {
        Object.entries(raw.errorsByMode).forEach(([key, value]) => {
          const normalized = count(value);
          if (normalized) stats.errorsByMode[String(key)] = normalized;
        });
      }
      return stats;
    } catch (error) {
      try { localStorage.removeItem(STATS_KEY); } catch (_) {}
      console.warn('[Pot Odds Trainer] Estadisticas corruptas; se restablecen.');
      return emptyStats();
    }
  }

  function create() {
    const state = {
      phase: 'ready',
      feedback: 'Configura el ejercicio o inicia una ronda.',
      config: {
        mode: 'outs-basic',
        street: 'flop',
        countdown: 0,
        memoryDuration: 0,
        memoryZones: new Set(),
        memoryRandomCount: 0,
        suitMode: 'rainbow',
        boardLocked: false,
        scenarioLocked: false,
        displayMode: 'percent',
        hiddenFields: new Set()
      },
      lab: {
        activeSlot: { section: 'hero', index: 0 },
        hero: [null, null],
        villain: [null, null],
        flop: [null, null, null],
        turn: [null],
        river: [null],
        scenario: { pot: 25, bet: 8 },
        exportStatus: ''
      },
      session: {
        spot: null,
        selectedPositive: new Set(),
        selectedNegative: new Set(),
        activeSelection: 'positive',
        inputs: { needed: '', turn: '', river: '' },
        reveal: false,
        revealOuts: false,
        revealHand: false,
        revealDetail: null,
        action: null,
        roundRecorded: false,
        rounds: 0,
        correct: 0,
        failed: 0,
        remainingMs: 0,
        hiddenZones: new Set()
      },
      stats: loadStats()
    };
    const listeners = new Set();
    return {
      state,
      storagePrefix: STORAGE_PREFIX,
      statsKey: STATS_KEY,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      notify() {
        listeners.forEach(listener => listener(state));
      },
      saveStats() {
        try {
          localStorage.setItem(STATS_KEY, JSON.stringify(state.stats));
        } catch (error) {
          console.warn('[Pot Odds Trainer] No se pudieron guardar estadisticas.');
        }
      }
    };
  }

  RT.PotOddsTrainerState = { create, STORAGE_PREFIX, STATS_KEY };
})(window.RT);
