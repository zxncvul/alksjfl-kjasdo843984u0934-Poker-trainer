'use strict';

(function (RT) {
  const CFG_KEY = 'rangeTrainer.simulator.positionTrainer.config';
  const STATS_KEY = 'rangeTrainer.simulator.positionTrainer.stats';

  const defaultConfig = {
    players: 6,
    randomPlayers: false,
    timerSec: 10,
    timerEnabled: true,
    namingSet: 'B',
    mode: 'posToSeat'
  };

  const defaultStats = {
    rounds: 0,
    correct: 0,
    wrong: 0,
    currentStreak: 0,
    bestStreak: 0,
    errorsByMode: {}
  };

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadConfig() {
    const ls = storage();
    if (!ls) return clone(defaultConfig);
    try {
      const raw = JSON.parse(ls.getItem(CFG_KEY) || '{}');
      const cfg = Object.assign(clone(defaultConfig), raw || {});
      cfg.players = Math.max(2, Math.min(10, Number(cfg.players) || 6));
      cfg.randomPlayers = cfg.randomPlayers === true;
      cfg.timerSec = Math.max(3, Math.min(60, Number(cfg.timerSec) || 10));
      // Las configuraciones guardadas antes de este control mantienen el timer activo.
      cfg.timerEnabled = cfg.timerEnabled !== false;
      cfg.namingSet = cfg.namingSet === 'A' ? 'A' : 'B';
      if (!RT.SimulatorPositionEngine.MODES.includes(cfg.mode)) cfg.mode = 'posToSeat';
      return cfg;
    } catch (_) {
      return clone(defaultConfig);
    }
  }

  function loadStats() {
    const ls = storage();
    if (!ls) return clone(defaultStats);
    try {
      const raw = JSON.parse(ls.getItem(STATS_KEY) || '{}');
      return Object.assign(clone(defaultStats), raw || {}, {
        errorsByMode: raw && typeof raw.errorsByMode === 'object' ? raw.errorsByMode : {}
      });
    } catch (_) {
      return clone(defaultStats);
    }
  }

  function saveConfig(config) {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(CFG_KEY, JSON.stringify(config)); } catch (_) {}
  }

  function saveStats(stats) {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(STATS_KEY, JSON.stringify(stats)); } catch (_) {}
  }

  const state = {
    config: loadConfig(),
    phase: 'idle',
    round: null,
    selected: null,
    feedback: '',
    remaining: 0,
    timerRunning: false,
    reviewRemaining: 0,
    reviewPaused: false,
    lastError: '',
    stats: loadStats()
  };

  function persistConfig() {
    saveConfig(state.config);
  }

  function resetRound() {
    state.phase = 'idle';
    state.round = null;
    state.selected = null;
    state.feedback = '';
    state.remaining = 0;
    state.timerRunning = false;
    state.reviewRemaining = 0;
    state.reviewPaused = false;
    state.lastError = '';
  }

  function recordResult(ok, round, reason) {
    state.stats.rounds += 1;
    if (ok) {
      state.stats.correct += 1;
      state.stats.currentStreak += 1;
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
    } else {
      state.stats.wrong += 1;
      state.stats.currentStreak = 0;
      const mode = round && round.mode ? round.mode : state.config.mode;
      state.stats.errorsByMode[mode] = (state.stats.errorsByMode[mode] || 0) + 1;
    }
    saveStats(state.stats);
    state.feedback = reason || (ok ? 'Correcto' : 'Incorrecto');
  }

  function resetStats() {
    state.stats = clone(defaultStats);
    saveStats(state.stats);
  }

  RT.SimulatorPositionState = {
    CFG_KEY,
    STATS_KEY,
    state,
    persistConfig,
    resetRound,
    recordResult,
    resetStats,
    saveStats
  };
})(window.RT);
