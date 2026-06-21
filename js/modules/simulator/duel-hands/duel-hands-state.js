'use strict';

(function (RT) {
  const STATS_KEY = 'rangeTrainer.simulator.duelHands.stats';

  const defaults = {
    handsPlayed: 0,
    correct: 0,
    wrong: 0,
    currentStreak: 0,
    bestStreak: 0,
    errorsByHandType: {},
    errorsByPosition: {}
  };

  function defaultFilters() {
    const filters = { hero: {}, villain: {}, both: {} };
    const types = RT.SimulatorDuelHandsEngine.FILTER_TYPES || [];
    Object.keys(filters).forEach((group) => {
      types.forEach((type) => {
        filters[group][type] = {
          enabled: group === 'both',
          weight: group === 'both' ? equalWeight(types.length) : 0
        };
      });
    });
    return filters;
  }

  function equalWeight(count) {
    return count ? Math.round((100 / count) * 10) / 10 : 0;
  }

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  function loadStats() {
    const ls = storage();
    if (!ls) return cloneDefaults();
    try {
      const raw = JSON.parse(ls.getItem(STATS_KEY) || '{}');
      return Object.assign(cloneDefaults(), raw, {
        errorsByHandType: raw && typeof raw.errorsByHandType === 'object' ? raw.errorsByHandType : {},
        errorsByPosition: raw && typeof raw.errorsByPosition === 'object' ? raw.errorsByPosition : {}
      });
    } catch (_) {
      return cloneDefaults();
    }
  }

  function saveStats(stats) {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(STATS_KEY, JSON.stringify(stats)); } catch (_) {}
  }

  const state = {
    config: {
      heroPosition: 'random',
      villainPosition: 'random',
      filterMode: 'both',
      cardColorMode: 'bicolor',
      presetId: null,
      presetEdited: false,
      filters: defaultFilters()
    },
    phase: 'idle',
    round: null,
    selected: null,
    revealSide: null,
    feedback: '',
    reviewRemaining: 0,
    reviewPaused: false,
    generationNotice: '',
    exportNotice: '',
    stats: loadStats()
  };

  function resetRound() {
    state.phase = 'idle';
    state.round = null;
    state.selected = null;
    state.revealSide = null;
    state.feedback = '';
    state.reviewRemaining = 0;
    state.reviewPaused = false;
    state.generationNotice = '';
    state.exportNotice = '';
  }

  function clearVisual() {
    state.revealSide = null;
    state.feedback = '';
  }

  function recordResult(choice, round) {
    const correct = choice === round.winner;
    state.stats.handsPlayed += 1;
    if (correct) {
      state.stats.correct += 1;
      state.stats.currentStreak += 1;
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
    } else {
      state.stats.wrong += 1;
      state.stats.currentStreak = 0;
      const winningHand = round.winner === 'villain' ? round.villainBest : round.heroBest;
      const type = round.winner === 'split' ? 'Split' : (winningHand && winningHand.type) || 'Desconocida';
      state.stats.errorsByHandType[type] = (state.stats.errorsByHandType[type] || 0) + 1;
      const position = round.winner === 'villain' ? round.villainPosition : round.heroPosition;
      state.stats.errorsByPosition[position] = (state.stats.errorsByPosition[position] || 0) + 1;
    }
    saveStats(state.stats);
    return correct;
  }

  function resetStats() {
    state.stats = cloneDefaults();
    saveStats(state.stats);
  }

  RT.SimulatorDuelHandsState = {
    STATS_KEY,
    state,
    resetRound,
    clearVisual,
    recordResult,
    resetStats,
    saveStats
  };
})(window.RT);
