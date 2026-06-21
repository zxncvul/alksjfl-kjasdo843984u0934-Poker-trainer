'use strict';

(function (RT) {
  const State = RT.SimulatorDuelHandsState;
  const Engine = RT.SimulatorDuelHandsEngine;
  const state = State.state;
  const REVIEW_MS = 5000;
  const SHOWDOWN_PRESETS = [
    {
      id: 'showdown-01',
      level: 1,
      title: 'Basico',
      shortTitle: 'Basico',
      colorMode: 'four',
      goal: 'Distinguir carta alta y pareja sin ruido extra.',
      matrix: presetMatrix({ 'Pareja': 'both', 'Carta alta': 'both' })
    },
    {
      id: 'showdown-02',
      level: 2,
      title: 'Parejas',
      shortTitle: 'Parejas',
      colorMode: 'four',
      goal: 'Carta alta, pareja, doble pareja y trio.',
      matrix: presetMatrix({ 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both' })
    },
    {
      id: 'showdown-03',
      level: 3,
      title: 'Escalera entra',
      shortTitle: 'Escalera',
      colorMode: 'four',
      goal: 'Anadir escaleras sin meter colores todavia.',
      matrix: presetMatrix({
        'Escalera': 'both', 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both'
      })
    },
    {
      id: 'showdown-04',
      level: 4,
      title: 'Color entra',
      shortTitle: 'Color',
      colorMode: 'four',
      goal: 'Anadir lectura de colores.',
      matrix: presetMatrix({
        'Color': 'both', 'Escalera': 'both', 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both'
      })
    },
    {
      id: 'showdown-05',
      level: 5,
      title: 'Full entra',
      shortTitle: 'Full',
      colorMode: 'bicolor',
      goal: 'Full house y mas carga visual con bicolor.',
      matrix: presetMatrix({
        'Full house': 'both', 'Color': 'both', 'Escalera': 'both', 'Trio': 'both',
        'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both'
      })
    },
    {
      id: 'showdown-06',
      level: 6,
      title: 'Monstruos',
      shortTitle: 'Monstruos',
      colorMode: 'bicolor',
      goal: 'Manos fuertes y comparaciones duras.',
      matrix: presetMatrix({
        'Escalera de color': 'both', 'Poker': 'both', 'Full house': 'both', 'Color': 'both', 'Escalera': 'both'
      })
    },
    {
      id: 'showdown-07',
      level: 7,
      title: 'Rango completo',
      shortTitle: 'Completo',
      colorMode: 'bicolor',
      goal: 'Todas las jugadas normales, sin split.',
      matrix: presetMatrix({
        'Escalera de color': 'both', 'Poker': 'both', 'Full house': 'both', 'Color': 'both',
        'Escalera': 'both', 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both'
      })
    },
    {
      id: 'showdown-08',
      level: 8,
      title: 'Splits',
      shortTitle: 'Splits',
      colorMode: 'mono',
      goal: 'Anadir splits y quitar la ayuda visual de color.',
      matrix: presetMatrix({
        'Escalera de color': 'both', 'Poker': 'both', 'Full house': 'both', 'Color': 'both',
        'Escalera': 'both', 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both', 'Split': 'both'
      })
    },
    {
      id: 'showdown-09',
      level: 9,
      title: 'Atencion rota',
      shortTitle: 'Atencion',
      colorMode: 'random',
      goal: 'Colores aleatorios no ligados al palo.',
      matrix: presetMatrix({
        'Poker': 'both', 'Full house': 'both', 'Color': 'both', 'Escalera': 'both',
        'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both', 'Split': 'both'
      })
    },
    {
      id: 'showdown-10',
      level: 10,
      title: 'Infierno limpio',
      shortTitle: 'Infierno',
      colorMode: 'random',
      goal: 'Todo activo con maxima carga visual.',
      matrix: presetMatrix({
        'Escalera de color': 'both', 'Poker': 'both', 'Full house': 'both', 'Color': 'both',
        'Escalera': 'both', 'Trio': 'both', 'Doble pareja': 'both', 'Pareja': 'both', 'Carta alta': 'both', 'Split': 'both'
      })
    }
  ];
  let reviewTimeout = null;
  let reviewInterval = null;
  let reviewDeadline = 0;

  function presetMatrix(selection) {
    const matrix = {};
    Engine.FILTER_TYPES.forEach((type) => {
      matrix[type] = selection[type] || 'none';
    });
    return matrix;
  }

  function emit(change) {
    RT.emit('sim:changed', change);
  }

  function clearReviewTimers() {
    if (reviewTimeout) window.clearTimeout(reviewTimeout);
    if (reviewInterval) window.clearInterval(reviewInterval);
    reviewTimeout = null;
    reviewInterval = null;
    reviewDeadline = 0;
    state.reviewRemaining = 0;
    state.reviewPaused = false;
  }

  function refreshReviewRemaining() {
    if (!reviewDeadline || state.reviewPaused) return;
    state.reviewRemaining = Math.max(0, reviewDeadline - Date.now());
    emit();
  }

  function armReview(ms) {
    if (reviewTimeout) window.clearTimeout(reviewTimeout);
    if (reviewInterval) window.clearInterval(reviewInterval);
    reviewDeadline = Date.now() + Math.max(0, ms);
    state.reviewRemaining = Math.max(0, ms);
    state.reviewPaused = false;
    reviewInterval = window.setInterval(refreshReviewRemaining, 500);
    reviewTimeout = window.setTimeout(() => {
      clearReviewTimers();
      nextRound(true);
    }, Math.max(0, ms));
  }

  function ensureRound() {
    if (!state.round) nextRound(false);
  }

  function nextRound(shouldEmit = true) {
    clearReviewTimers();
    state.round = Engine.generate(state.config);
    state.round.configSnapshot = cloneConfig(state.config);
    state.round.cardColorMode = state.config.cardColorMode || 'bicolor';
    state.round.presetId = state.config.presetId || null;
    state.round.presetEdited = !!state.config.presetEdited;
    assignVisualColors(state.round);
    state.phase = 'question';
    state.selected = null;
    state.revealSide = null;
    state.feedback = '';
    state.generationNotice = state.round.filterNotice || '';
    state.exportNotice = '';
    if (shouldEmit) emit();
  }

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config || {}));
  }

  function answer(choice) {
    ensureRound();
    if (state.phase !== 'question') return;
    state.selected = choice;
    const ok = State.recordResult(choice, state.round);
    if (ok) {
      nextRound(true);
      return;
    }
    state.phase = 'feedback';
    const winnerLabel = winnerLabelText(state.round.winner);
    state.feedback = `Incorrecto. Gana ${winnerLabel}.`;
    state.revealSide = 'winner';
    armReview(REVIEW_MS);
    emit();
  }

  function pauseReview() {
    if (state.phase !== 'feedback' || state.reviewPaused) return;
    state.reviewRemaining = Math.max(0, reviewDeadline - Date.now());
    state.reviewPaused = true;
    if (reviewTimeout) window.clearTimeout(reviewTimeout);
    if (reviewInterval) window.clearInterval(reviewInterval);
    reviewTimeout = null;
    reviewInterval = null;
    reviewDeadline = 0;
    emit();
  }

  function resumeReview() {
    if (state.phase !== 'feedback' || !state.reviewPaused) return;
    armReview(state.reviewRemaining || REVIEW_MS);
    emit();
  }

  function skipReview() {
    if (state.phase !== 'feedback') return;
    clearReviewTimers();
    nextRound(true);
  }

  function reveal(side) {
    ensureRound();
    state.revealSide = state.revealSide === side ? null : side;
    emit();
  }

  function setPosition(side, value) {
    const key = side === 'hero' ? 'heroPosition' : 'villainPosition';
    const otherKey = side === 'hero' ? 'villainPosition' : 'heroPosition';
    state.config[key] = value;
    if (value !== 'random' && state.config[otherKey] === value) {
      state.config[otherKey] = 'random';
    }
    // Solo cambian los dos selectores: no hace falta reconstruir mesa, galería
    // ni matriz para reflejar esta configuración del próximo duelo.
    emit({ type: 'duel:position-config' });
  }

  function setFilterMode(mode) {
    if (!['random', 'hero', 'villain', 'both'].includes(mode)) return;
    state.config.filterMode = mode;
    emit();
  }

  function setFilterEnabled(group, type, enabled) {
    const entry = filterEntry(group, type);
    if (!entry) return;
    entry.enabled = !!enabled;
    normalizeGroup(group);
    markPresetEdited();
    emit();
  }

  function setFilterWeight(group, type, weight) {
    const entry = filterEntry(group, type);
    if (!entry) return;
    entry.enabled = true;
    entry.weight = Math.max(0, Math.min(100, Number(weight) || 0));
    normalizeGroup(group, type);
    markPresetEdited();
    emit();
  }

  function setMatrixSelection(type, target) {
    if (!Engine.FILTER_TYPES.includes(type) || !['hero', 'villain', 'both', 'none'].includes(target)) return;
    const previous = ['hero', 'villain', 'both'].map((group) => {
      const entry = filterEntry(group, type);
      return { group, enabled: !!entry.enabled, weight: Number(entry.weight) || 0 };
    });
    ['hero', 'villain', 'both'].forEach((group) => {
      const entry = filterEntry(group, type);
      entry.enabled = target !== 'none' && group === target;
      entry.weight = target !== 'none' && group === target ? Math.max(1, Number(entry.weight) || 0) : 0;
    });
    if (Engine.HAND_TYPES.includes(type) && (!hasAllowedHands('hero') || !hasAllowedHands('villain'))) {
      previous.forEach((item) => {
        const entry = filterEntry(item.group, type);
        entry.enabled = item.enabled;
        entry.weight = item.weight;
      });
      state.exportNotice = 'La matriz necesita al menos una jugada posible para Hero y Villain.';
      emit();
      return;
    }
    normalizeMatrixWeights();
    markPresetEdited();
    emit();
  }

  function setMatrixWeight(type, weight) {
    if (!Engine.FILTER_TYPES.includes(type)) return;
    let target = matrixSelection(type);
    if (!target) {
      target = 'both';
      filterEntry(target, type).enabled = true;
    }
    const entry = filterEntry(target, type);
    entry.weight = Math.max(0, Math.min(100, Number(weight) || 0));
    normalizeMatrixWeights(type);
    markPresetEdited();
    emit();
  }

  function matrixSelection(type) {
    if (state.config.filters.both[type] && state.config.filters.both[type].enabled) return 'both';
    if (state.config.filters.hero[type] && state.config.filters.hero[type].enabled) return 'hero';
    if (state.config.filters.villain[type] && state.config.filters.villain[type].enabled) return 'villain';
    return null;
  }

  function matrixWeight(type) {
    const group = matrixSelection(type);
    return group ? Number(state.config.filters[group][type].weight) || 0 : 0;
  }

  function hasAllowedHands(side) {
    return Engine.HAND_TYPES.some((type) => {
      const selected = matrixSelection(type);
      return side === 'hero'
        ? (selected === 'hero' || selected === 'both')
        : (selected === 'villain' || selected === 'both');
    });
  }

  function normalizeMatrixWeights(fixedType) {
    let active = Engine.FILTER_TYPES.filter(type => matrixSelection(type));
    if (!active.length) {
      Engine.FILTER_TYPES.forEach((type) => {
        ['hero', 'villain', 'both'].forEach((group) => {
          const entry = filterEntry(group, type);
          entry.enabled = false;
          entry.weight = 0;
        });
      });
      return;
    }

    ['hero', 'villain', 'both'].forEach((group) => {
      const activeForGroup = Engine.FILTER_TYPES.filter(type => {
        const entry = filterEntry(group, type);
        return entry && entry.enabled;
      });
      const share = activeForGroup.length ? roundWeight(100 / activeForGroup.length) : 0;
      activeForGroup.forEach((type, index) => {
        filterEntry(group, type).weight = index === activeForGroup.length - 1
          ? roundWeight(100 - share * (activeForGroup.length - 1))
          : share;
      });
    });

    Engine.FILTER_TYPES.forEach((type) => {
      const selected = matrixSelection(type);
      ['hero', 'villain', 'both'].forEach((group) => {
        const entry = filterEntry(group, type);
        if (group !== selected) {
          entry.enabled = false;
          entry.weight = 0;
        }
      });
    });
  }

  function matrixWeightSum() {
    return Engine.FILTER_TYPES.reduce((sum, type) => sum + matrixWeight(type), 0);
  }

  function sideDistribution(side) {
    const allowed = Engine.HAND_TYPES.filter((type) => {
      const selected = matrixSelection(type);
      return side === 'hero'
        ? (selected === 'hero' || selected === 'both')
        : (selected === 'villain' || selected === 'both');
    });
    const share = allowed.length ? roundWeight(100 / allowed.length) : 0;
    return Engine.HAND_TYPES.map((type, index) => {
      const activeIndex = allowed.indexOf(type);
      const isLastActive = activeIndex === allowed.length - 1;
      return {
        type,
        enabled: activeIndex !== -1,
        weight: activeIndex === -1 ? 0 : (isLastActive
          ? roundWeight(100 - share * (allowed.length - 1))
          : share)
      };
    });
  }

  function splitDistribution() {
    return {
      enabled: !!matrixSelection('Split'),
      label: matrixSelection('Split') ? 'permitido' : '0%'
    };
  }

  function setCardColorMode(mode) {
    if (!['mono', 'four', 'bicolor', 'random'].includes(mode)) return;
    state.config.cardColorMode = mode;
    markPresetEdited();
    emit();
  }

  function applyPreset(id) {
    const preset = SHOWDOWN_PRESETS.find(item => item.id === id);
    if (!preset) return;
    Engine.FILTER_TYPES.forEach((type) => {
      const target = preset.matrix[type] || 'none';
      ['hero', 'villain', 'both'].forEach((group) => {
        const entry = filterEntry(group, type);
        entry.enabled = target !== 'none' && group === target;
        entry.weight = entry.enabled ? Math.max(1, Number(entry.weight) || 1) : 0;
      });
    });
    state.config.cardColorMode = preset.colorMode;
    state.config.filterMode = 'both';
    state.config.presetId = preset.id;
    state.config.presetEdited = false;
    state.exportNotice = '';
    normalizeMatrixWeights();
    emit();
  }

  function markPresetEdited() {
    if (!state.config.presetId) return;
    const preset = SHOWDOWN_PRESETS.find(item => item.id === state.config.presetId);
    state.config.presetEdited = !preset || !configMatchesPreset(preset, state.config);
  }

  function configMatchesPreset(preset, config = state.config) {
    if (!preset || (config.cardColorMode || 'bicolor') !== preset.colorMode) return false;
    return Engine.FILTER_TYPES.every((type) => (preset.matrix[type] || 'none') === (matrixSelectionFromConfig(config, type) || 'none'));
  }

  function matrixSelectionFromConfig(config, type) {
    const filters = config && config.filters;
    if (!filters) return null;
    if (filters.both && filters.both[type] && filters.both[type].enabled) return 'both';
    if (filters.hero && filters.hero[type] && filters.hero[type].enabled) return 'hero';
    if (filters.villain && filters.villain[type] && filters.villain[type].enabled) return 'villain';
    return null;
  }

  function presetStatus(id) {
    const preset = SHOWDOWN_PRESETS.find(item => item.id === id);
    if (!preset) return '';
    if (state.config.presetId === id) return configMatchesPreset(preset) ? 'active' : 'edited';
    if (!state.config.presetId && configMatchesPreset(preset)) return 'active';
    return '';
  }

  function filterEntry(group, type) {
    if (!state.config.filters[group]) return null;
    if (!state.config.filters[group][type]) {
      state.config.filters[group][type] = { enabled: false, weight: 25 };
    }
    return state.config.filters[group][type];
  }

  function normalizeGroup(group, fixedType) {
    const bucket = state.config.filters[group];
    if (!bucket) return;
    const types = Engine.FILTER_TYPES;
    let active = types.filter(type => bucket[type] && bucket[type].enabled);
    if (!active.length) {
      active = types.slice();
      active.forEach((type) => {
        bucket[type] = bucket[type] || {};
        bucket[type].enabled = true;
      });
      fixedType = null;
    }

    if (fixedType && active.includes(fixedType)) {
      const fixed = Math.max(0, Math.min(100, Number(bucket[fixedType].weight) || 0));
      bucket[fixedType].weight = roundWeight(fixed);
      const rest = active.filter(type => type !== fixedType);
      const share = rest.length ? roundWeight((100 - fixed) / rest.length) : 0;
      rest.forEach((type, index) => {
        bucket[type].weight = index === rest.length - 1
          ? roundWeight(100 - fixed - share * (rest.length - 1))
          : share;
      });
      if (!rest.length) bucket[fixedType].weight = 100;
      zeroInactive(bucket, active);
      return;
    }

    const share = roundWeight(100 / active.length);
    active.forEach((type, index) => {
      bucket[type].weight = index === active.length - 1
        ? roundWeight(100 - share * (active.length - 1))
        : share;
    });
    zeroInactive(bucket, active);
  }

  function roundWeight(value) {
    return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
  }

  function zeroInactive(bucket, active) {
    Engine.FILTER_TYPES.forEach((type) => {
      if (!active.includes(type) && bucket[type]) bucket[type].weight = 0;
    });
  }

  function winnerLabelText(winner) {
    if (winner === 'hero') return 'Hero';
    if (winner === 'villain') return 'Villain';
    return 'Split';
  }

  function resetStats() {
    State.resetStats();
    emit();
  }

  function stop() {
    clearReviewTimers();
    State.resetRound();
    emit();
  }

  function usedCodesForReveal() {
    const round = state.round;
    if (!round || !state.revealSide) return new Set();
    const codes = [];
    if (state.revealSide === 'hero') codes.push(...round.heroBest.usedCodes);
    else if (state.revealSide === 'villain') codes.push(...round.villainBest.usedCodes);
    else if (state.revealSide === 'winner') {
      if (round.winner === 'hero') codes.push(...round.heroBest.usedCodes);
      else if (round.winner === 'villain') codes.push(...round.villainBest.usedCodes);
      else codes.push(...round.heroBest.usedCodes, ...round.villainBest.usedCodes);
    }
    return new Set(codes);
  }

  function assignVisualColors(round) {
    if (!round) return;
    if (state.config.cardColorMode !== 'random') {
      round.visualColors = {};
      return;
    }
    const palette = ['red', 'white', 'green', 'blue'];
    round.visualColors = {};
    round.hero.concat(round.villain, round.board).forEach((card) => {
      round.visualColors[card.code] = palette[Math.floor(Math.random() * palette.length)];
    });
  }

  function cardColor(card) {
    const mode = state.round && state.round.cardColorMode
      ? state.round.cardColorMode
      : (state.config.cardColorMode || 'bicolor');
    if (!card) return 'blue';
    if (mode === 'random' && state.round && state.round.visualColors) {
      return state.round.visualColors[card.code] || 'blue';
    }
    if (mode === 'mono') return 'blue';
    if (mode === 'four') {
      if (card.suit === 'h') return 'red';
      if (card.suit === 'd') return 'green';
      if (card.suit === 'c') return 'white';
      return 'blue';
    }
    return (card.suit === 'h' || card.suit === 'd') ? 'red' : 'blue';
  }

  function precision() {
    const total = state.stats.handsPlayed;
    return total ? Math.round(state.stats.correct / total * 100) : 0;
  }

  function revealExplanation() {
    const round = state.round;
    if (!round) return '';
    if (round.winner === 'split') {
      return `Split: Hero y Villain comparten valor. Hero: ${round.heroBest.label}; Villain: ${round.villainBest.label}.`;
    }
    const side = round.winner === 'hero' ? 'Hero' : 'Villain';
    const best = round.winner === 'hero' ? round.heroBest : round.villainBest;
    const cards = best.cards.map(Engine.cardLabel).join(' ');
    return `${side} gana con ${best.label}. Cartas usadas: ${cards}.`;
  }

  function tableRoles(round = state.round) {
    if (!round) return { dealer: 'BTN', sb: 'SB', bb: 'BB' };
    return { dealer: 'BTN', sb: 'SB', bb: 'BB' };
  }

  function activeFilterSummary() {
    return filterSummaryForConfig(state.config);
  }

  function filterSummaryForConfig(config) {
    const lines = [];
    Engine.FILTER_TYPES.forEach((type) => {
      const group = matrixSelectionFromConfig(config, type);
      lines.push(`${type}: ${selectionLabel(group)}`);
    });
    return lines;
  }

  function selectionLabel(group) {
    if (group === 'hero') return 'H';
    if (group === 'villain') return 'V';
    if (group === 'both') return 'All';
    return 'X';
  }

  function exportText() {
    const round = state.round;
    if (!round) return '';
    const roles = tableRoles(round);
    const snapshot = round.configSnapshot || state.config;
    const heroUsed = round.heroBest.cards.map(Engine.cardLabel).join(' ');
    const villainUsed = round.villainBest.cards.map(Engine.cardLabel).join(' ');
    const heroValues = round.heroBest.values.map(value => Engine.RANKS[value] || '?').join(' ');
    const villainValues = round.villainBest.values.map(value => Engine.RANKS[value] || '?').join(' ');
    return [
      'DUELO DE JUGADAS',
      `Timestamp: ${new Date().toISOString()}`,
      `Estado: ${state.phase}`,
      `Modo activo: ${snapshot.filterMode || state.config.filterMode}`,
      `Preset mano: ${round.presetId || 'personalizado'}${round.presetEdited ? ' editado' : ''}`,
      `Preset pendiente: ${state.config.presetId || 'personalizado'}${state.config.presetEdited ? ' editado' : ''}`,
      `Color cartas mano: ${round.cardColorMode || snapshot.cardColorMode || 'bicolor'}`,
      `Color cartas pendiente: ${state.config.cardColorMode || 'bicolor'}`,
      `Densidad de jugadas de la mano:`,
      ...filterSummaryForConfig(snapshot).map(line => `- ${line}`),
      `Hero posicion: ${round.heroPosition}`,
      `Villain posicion: ${round.villainPosition}`,
      `Dealer: ${roles.dealer}`,
      `SB: ${roles.sb}`,
      `BB: ${roles.bb}`,
      `Hero cartas: ${round.hero.map(Engine.cardLabel).join(' ')}`,
      `Villain cartas: ${round.villain.map(Engine.cardLabel).join(' ')}`,
      `Board: ${round.board.map(Engine.cardLabel).join(' ')}`,
      `Ganador: ${winnerLabelText(round.winner)}`,
      `Split: ${round.winner === 'split' ? 'si' : 'no'}`,
      `Jugada Hero: ${round.heroBest.label}`,
      `Tipo Hero: ${round.heroBest.type}`,
      `Cartas usadas Hero: ${heroUsed}`,
      `Desempate Hero: ${heroValues}`,
      `Jugada Villain: ${round.villainBest.label}`,
      `Tipo Villain: ${round.villainBest.type}`,
      `Cartas usadas Villain: ${villainUsed}`,
      `Desempate Villain: ${villainValues}`,
      `Respuesta usuario: ${state.selected || 'pendiente'}`,
      `Explicacion: ${revealExplanation()}`
    ].join('\n');
  }

  function exportRound() {
    ensureRound();
    if (!state.round) {
      state.exportNotice = 'No hay duelo generado para exportar.';
      emit();
      return;
    }
    const text = exportText();
    state.exportNotice = 'Export copiado.';
    if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
      window.navigator.clipboard.writeText(text).catch(() => {
        state.exportNotice = 'Export generado, pero el portapapeles no esta disponible.';
        emit();
      });
    } else {
      state.exportNotice = 'Export generado, pero el portapapeles no esta disponible.';
    }
    emit();
  }

  RT.SimulatorDuelHands = {
    state,
    ensureRound,
    nextRound,
    answer,
    pauseReview,
    resumeReview,
    skipReview,
    reveal,
    setPosition,
    setFilterMode,
    setFilterEnabled,
    setFilterWeight,
    setMatrixSelection,
    setMatrixWeight,
    applyPreset,
    presets: () => SHOWDOWN_PRESETS.slice(),
    presetStatus,
    configMatchesPreset,
    matrixSelection,
    matrixWeight,
    matrixWeightSum,
    sideDistribution,
    splitDistribution,
    setCardColorMode,
    normalizeGroup,
    normalizeMatrixWeights,
    tableRoles,
    exportText,
    exportRound,
    resetStats,
    stop,
    usedCodesForReveal,
    cardColor,
    winnerLabelText,
    precision,
    revealExplanation,
    engine: Engine
  };
})(window.RT);
