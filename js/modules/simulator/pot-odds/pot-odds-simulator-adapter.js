'use strict';

/* Simulator Pot Odds: adapta la lógica compartida del Pot Odds Lab a una
 * decisión rápida CALL/FOLD. No contiene evaluador, cálculos de outs ni de
 * pot odds: todo eso procede de RT.PotOddsTrainerEngine. */
(function (RT) {
  const STORAGE_KEY = 'rt:sim:pot-odds:v1';
  const STREETS = ['flop', 'turn', 'mixed'];
  const KINDS = ['mixed', 'oesd', 'gutshot', 'flush', 'combo', 'made-hand'];
  const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  function emptyStats() {
    return {
      played: 0, correct: 0, failed: 0, currentStreak: 0, bestStreak: 0,
      errorsByStreet: {}, errorsByType: {}
    };
  }
  function validCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }
  function load() {
    const initial = {
      config: {
        street: 'mixed', kind: 'mixed', count: 10,
        heroPosition: 'BTN', villainPosition: 'BB',
        countdown: 0, memoryDuration: 0, memoryZones: new Set(),
        memoryRandomCount: 0, suitMode: 'random',
        boardLocked: false, scenarioLocked: false, hiddenFields: new Set()
      },
      stats: emptyStats()
    };
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return initial;
      if (STREETS.includes(raw.street)) initial.config.street = raw.street;
      if (KINDS.includes(raw.kind)) initial.config.kind = raw.kind;
      if ([0, 10, 25, 50].includes(raw.count)) initial.config.count = raw.count;
      if (POSITIONS.includes(raw.heroPosition)) initial.config.heroPosition = raw.heroPosition;
      if (POSITIONS.includes(raw.villainPosition) && raw.villainPosition !== initial.config.heroPosition) {
        initial.config.villainPosition = raw.villainPosition;
      }
      if ([0, 5, 10, 15, 30].includes(Number(raw.countdown))) initial.config.countdown = Number(raw.countdown);
      if ([0, 1, 2, 5, 10].includes(Number(raw.memoryDuration))) initial.config.memoryDuration = Number(raw.memoryDuration);
      if ([0, 1, 2, 3].includes(Number(raw.memoryRandomCount))) initial.config.memoryRandomCount = Number(raw.memoryRandomCount);
      if (['rainbow', 'paired', 'mono', 'random'].includes(raw.suitMode)) initial.config.suitMode = raw.suitMode;
      initial.config.boardLocked = !!raw.boardLocked;
      initial.config.scenarioLocked = !!raw.scenarioLocked;
      if (Array.isArray(raw.memoryZones)) {
        initial.config.memoryZones = new Set(raw.memoryZones.filter(zone => ['hero', 'flop', 'turn', 'river'].includes(zone)));
      }
      if (Array.isArray(raw.hiddenFields)) {
        initial.config.hiddenFields = new Set(raw.hiddenFields.filter(field => ['ratio', 'needed', 'turn', 'river', 'result'].includes(field)));
      }
      const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
      initial.stats.correct = validCount(stats.correct);
      initial.stats.failed = validCount(stats.failed);
      initial.stats.played = initial.stats.correct + initial.stats.failed;
      initial.stats.currentStreak = Math.min(validCount(stats.currentStreak), initial.stats.correct);
      initial.stats.bestStreak = Math.max(initial.stats.currentStreak, validCount(stats.bestStreak));
      ['errorsByStreet', 'errorsByType'].forEach(key => {
        const source = stats[key];
        if (!source || typeof source !== 'object' || Array.isArray(source)) return;
        Object.entries(source).forEach(([name, value]) => {
          const count = validCount(value);
          if (count) initial.stats[key][String(name)] = count;
        });
      });
    } catch (_) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (ignore) {}
    }
    return initial;
  }
  function create() {
    const loaded = load();
    // Instancia aislada del mismo Lab de Math Trainer: comparte el engine,
    // nunca su estado de sesión ni sus hosts de interfaz.
    const labStore = RT.PotOddsTrainerState.create();
    const labEngine = RT.PotOddsTrainerEngine.create(labStore);
    const state = {
      config: loaded.config,
      stats: loaded.stats,
      phase: 'ready',
      round: null,
      answer: null,
      feedback: 'Configura el spot o pulsa Nuevo spot.',
      sessionRounds: 0,
      aids: { remainingMs: 0, hiddenZones: new Set(), reveal: false },
      exportNotice: '',
      lab: { view: 'table', spot: null, revealOuts: false, revealHand: false, revealDetail: null }
    };
    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          street: state.config.street,
          kind: state.config.kind,
          count: state.config.count,
          heroPosition: state.config.heroPosition,
          villainPosition: state.config.villainPosition,
          countdown: state.config.countdown,
          memoryDuration: state.config.memoryDuration,
          memoryZones: Array.from(state.config.memoryZones),
          memoryRandomCount: state.config.memoryRandomCount,
          suitMode: state.config.suitMode,
          boardLocked: state.config.boardLocked,
          scenarioLocked: state.config.scenarioLocked,
          hiddenFields: Array.from(state.config.hiddenFields),
          stats: state.stats
        }));
      } catch (_) {}
    }
    function emit(change) { RT.emit('sim:changed', change); }
    let countdownTimer = null;
    let countdownInterval = null;
    let memoryTimers = [];
    function clearRoundTimers() {
      clearTimeout(countdownTimer);
      clearInterval(countdownInterval);
      memoryTimers.forEach(clearTimeout);
      countdownTimer = null;
      countdownInterval = null;
      memoryTimers = [];
      state.aids.remainingMs = 0;
    }
    function scheduleRoundTimers() {
      if (state.config.countdown > 0) {
        const end = Date.now() + state.config.countdown * 1000;
        state.aids.remainingMs = state.config.countdown * 1000;
        countdownInterval = setInterval(() => {
          state.aids.remainingMs = Math.max(0, end - Date.now());
          emit({ type: 'pot-odds:timer' });
        }, 250);
        countdownTimer = setTimeout(() => {
          clearInterval(countdownInterval);
          countdownInterval = null;
          state.aids.remainingMs = 0;
          if (state.phase === 'question' && state.round && state.round.expectedDecision !== 'N/A') {
            state.phase = 'error';
            state.feedback = 'Tiempo agotado.';
            record(false);
            clearRoundTimers();
            emit({ type: 'pot-odds:timeout' });
          }
        }, state.config.countdown * 1000);
      }
      if (state.config.memoryDuration > 0) {
        let zones = Array.from(state.config.memoryZones);
        if (state.config.memoryRandomCount > 0) {
          zones = zones.sort(() => Math.random() - .5).slice(0, state.config.memoryRandomCount);
        }
        zones.forEach(zone => memoryTimers.push(setTimeout(() => {
          state.aids.hiddenZones.add(zone);
          emit({ type: 'pot-odds:memory' });
        }, state.config.memoryDuration * 1000)));
      }
    }
    function applySuitMode(round) {
      const mode = state.config.suitMode;
      if (mode === 'random') return round;
      const suits = ['♠', '♥', '♦', '♣'];
      const baseSuit = suits[Math.floor(Math.random() * suits.length)];
      const otherSuits = suits.filter(suit => suit !== baseSuit);
      const boardSuits = mode === 'mono'
        ? [baseSuit, baseSuit, baseSuit, baseSuit]
        : mode === 'paired'
          ? [baseSuit, baseSuit, otherSuits[0], otherSuits[0]]
          : [baseSuit, otherSuits[0], otherSuits[1], baseSuit];
      const used = new Set();
      const makeCard = (rank, preferredSuit) => {
        const suit = [preferredSuit].concat(suits.filter(item => item !== preferredSuit))
          .find(item => !used.has(rank + item));
        const card = rank + suit;
        used.add(card);
        return card;
      };
      const board = round.board.map((card, index) => makeCard(card[0], boardSuits[index]));
      const hero = round.hero.map((card, index) => makeCard(card[0], otherSuits[(index + 1) % otherSuits.length]));
      return Object.assign({}, round, { hero, board });
    }
    function boardModeMatches(board, mode) {
      if (mode === 'random') return true;
      const uniqueSuits = new Set(board.slice(0, 3).map(card => card[1])).size;
      return mode === 'rainbow' ? uniqueSuits === 3 :
        mode === 'paired' ? uniqueSuits === 2 : uniqueSuits === 1;
    }
    function canApplySuitMode(round, mode) {
      if (mode === 'random' || mode === 'rainbow') return true;
      const ranks = round.board.slice(0, 3).map(card => card[0]);
      const largestGroup = Math.max(...ranks.map(rank => ranks.filter(item => item === rank).length));
      // Dos cartas del mismo rango no pueden compartir palo; un board mono
      // requiere tres rangos distintos y Pair no admite tres iguales.
      return mode === 'mono' ? largestGroup === 1 : largestGroup <= 2;
    }
    function generateConfiguredSpot(engine) {
      let fallback = null;
      for (let attempt = 0; attempt < 80; attempt++) {
        let candidate = engine.generateSimulatorSpot({
          street: state.config.street,
          kind: state.config.kind
        });
        if (!canApplySuitMode(candidate, state.config.suitMode)) continue;
        candidate = applySuitMode(candidate);
        candidate.analysis = engine.analyzeSpot(candidate.hero, candidate.board, candidate.scenario);
        const expectedMode = state.config.kind === 'made-hand' ? 'MADE_HAND_MODE' : 'DRAW_MODE';
        if (candidate.analysis.mode !== expectedMode) {
          fallback = fallback || candidate;
          continue;
        }
        if (boardModeMatches(candidate.board, state.config.suitMode)) return candidate;
        fallback = fallback || candidate;
      }
      // El fallback conserva un spot válido si un filtro muy restrictivo no
      // encuentra muestra; evita estados corruptos y nunca duplica cartas.
      return fallback || applySuitMode(engine.generateSimulatorSpot({
        street: state.config.street,
        kind: state.config.kind
      }));
    }
    function sharedEngine() {
      return RT.PotOddsTrainerEngine;
    }
    function next(shouldEmit = true) {
      if (state.config.count > 0 && state.sessionRounds >= state.config.count) {
        state.phase = 'finished';
        state.feedback = `Sesión completada: ${state.sessionRounds} de ${state.config.count} manos.`;
        if (shouldEmit) emit();
        return false;
      }
      const engine = sharedEngine();
      if (!engine || typeof engine.generateSimulatorSpot !== 'function') {
        state.feedback = 'El motor compartido de Pot Odds no está disponible.';
        if (shouldEmit) emit();
        return false;
      }
      clearRoundTimers();
      const previous = state.round;
      let generated = generateConfiguredSpot(engine);
      if (state.config.boardLocked && previous) {
        const requiredBoard = generated.street === 'turn' ? 4 : 3;
        const hero = previous.hero.slice();
        const board = previous.board.slice(0, requiredBoard);
        if (board.length < requiredBoard) {
          const available = engine.availableDeck(hero.concat(board));
          board.push(available[Math.floor(Math.random() * available.length)]);
        }
        generated.hero = hero;
        generated.board = board;
      }
      if (state.config.scenarioLocked && previous) {
        generated.scenario = Object.assign({}, previous.scenario);
      }
      generated.analysis = engine.analyzeSpot(generated.hero, generated.board, generated.scenario);
      const decision = engine.simulatorDecision(generated.analysis);
      generated.project = generated.analysis.project;
      generated.expectedDecision = decision.action;
      generated.decisionReason = decision.reason;
      state.round = Object.assign(generated, {
        heroPosition: state.config.heroPosition,
        villainPosition: state.config.villainPosition,
        callAmount: generated.scenario.bet
      });
      if (state.round.analysis.mode === 'MADE_HAND_MODE') {
        state.round.expectedDecision = 'N/A';
        state.round.decisionReason =
          'Mano hecha: este spot no se puntua como CALL/FOLD por pot odds de outs.';
      }
      state.phase = 'question';
      state.answer = null;
      state.exportNotice = '';
      state.lab = { view: 'table', spot: null, revealOuts: false, revealHand: false, revealDetail: null };
      state.aids.hiddenZones = new Set();
      state.aids.reveal = false;
      state.feedback = 'Decide si el precio para completar tu proyecto justifica pagar.';
      scheduleRoundTimers();
      if (shouldEmit) emit();
      return true;
    }
    function startSession(shouldEmit = true) {
      state.sessionRounds = 0;
      return next(shouldEmit);
    }
    function record(correct) {
      const round = state.round;
      if (!round) return;
      state.stats.played++;
      if (correct) {
        state.stats.correct++;
        state.stats.currentStreak++;
        state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
      } else {
        state.stats.failed++;
        state.stats.currentStreak = 0;
        state.stats.errorsByStreet[round.street] = (state.stats.errorsByStreet[round.street] || 0) + 1;
        state.stats.errorsByType[round.type] = (state.stats.errorsByType[round.type] || 0) + 1;
      }
      state.sessionRounds++;
      persist();
    }
    function answer(value) {
      if (state.phase !== 'question' || !state.round || !['CALL', 'FOLD'].includes(value)) return false;
      if (state.round.expectedDecision === 'N/A') {
        state.feedback = 'Mano hecha: no hay una decisión CALL/FOLD por outs que puntuar.';
        emit();
        return false;
      }
      state.answer = value;
      const correct = value === state.round.expectedDecision;
      state.phase = correct ? 'correct' : 'error';
      clearRoundTimers();
      const math = state.round.analysis.math;
      state.feedback = correct
        ? `Correcto: ${value}. ${state.round.decisionReason}`
        : `La decisión era ${state.round.expectedDecision}: ${state.round.decisionReason}`;
      record(correct);
      emit();
      return correct;
    }
    function setConfig(key, value) {
      if (key === 'street' && STREETS.includes(value)) state.config.street = value;
      else if (key === 'kind' && KINDS.includes(value)) state.config.kind = value;
      else if (key === 'count' && [0, 10, 25, 50].includes(Number(value))) state.config.count = Number(value);
      else if (key === 'heroPosition' && POSITIONS.includes(value)) {
        state.config.heroPosition = value;
        if (state.config.villainPosition === value) {
          state.config.villainPosition = value === 'BB' ? 'BTN' : 'BB';
        }
      } else if (key === 'villainPosition' && POSITIONS.includes(value) && value !== state.config.heroPosition) {
        state.config.villainPosition = value;
      } else if (key === 'countdown' && [0, 5, 10, 15, 30].includes(Number(value))) {
        state.config.countdown = Number(value);
      } else if (key === 'memoryDuration' && [0, 1, 2, 5, 10].includes(Number(value))) {
        state.config.memoryDuration = Number(value);
      } else if (key === 'memoryRandomCount' && [0, 1, 2, 3].includes(Number(value))) {
        state.config.memoryRandomCount = Number(value);
      } else if (key === 'suitMode' && ['rainbow', 'paired', 'mono', 'random'].includes(value)) {
        state.config.suitMode = value;
      } else if (key === 'boardLocked' || key === 'scenarioLocked') {
        state.config[key] = !!value;
      } else return;
      persist();
      emit({ type: 'pot-odds:config' });
    }
    function toggleConfigSet(key, value) {
      const allowed = {
        memoryZones: ['hero', 'flop', 'turn', 'river'],
        hiddenFields: ['ratio', 'needed', 'turn', 'river', 'result']
      };
      if (!allowed[key] || !allowed[key].includes(value)) return;
      const values = state.config[key];
      if (values.has(value)) values.delete(value);
      else values.add(value);
      persist();
      emit({ type: 'pot-odds:config' });
    }
    function toggleReveal() {
      if (!state.round || state.lab.view === 'lab') return false;
      state.aids.reveal = !state.aids.reveal;
      if (state.aids.reveal) clearRoundTimers();
      state.feedback = state.aids.reveal
        ? state.round.decisionReason
        : 'Reveal oculto. Decide si el precio para completar tu proyecto justifica pagar.';
      emit({ type: 'pot-odds:reveal' });
      return state.aids.reveal;
    }
    function applyPreset(preset) {
      if (!preset || typeof preset !== 'object') return;
      if (STREETS.includes(preset.street)) state.config.street = preset.street;
      if (KINDS.includes(preset.kind)) state.config.kind = preset.kind;
      persist();
      startSession();
    }
    function resetStats() {
      state.stats = emptyStats();
      persist();
      emit();
    }
    function exportText() {
      const round = state.round;
      if (!round) return 'SIMULATOR POT ODDS\nNo hay spot activo.';
      const analysis = round.analysis;
      const math = analysis.math;
      return [
        'SIMULATOR POT ODDS',
        `Timestamp: ${new Date().toISOString()}`,
        `Street: ${round.street}`,
        `Tipo de board: ${state.config.suitMode}`,
        `Bloqueos: ${state.config.boardLocked && state.config.scenarioLocked ? 'board y escenario' : state.config.boardLocked ? 'board' : state.config.scenarioLocked ? 'escenario' : 'ninguno'}`,
        `Tiempo: ${state.config.countdown ? `${state.config.countdown}s` : 'sin limite'}`,
        `Memoria: ${state.config.memoryDuration ? `${state.config.memoryDuration}s` : 'off'}`,
        `Zonas de memoria: ${Array.from(state.config.memoryZones).join(', ') || 'ninguna'}`,
        `Randomizacion: ${state.config.memoryRandomCount ? `Rnd ${state.config.memoryRandomCount}` : 'off'}`,
        `Calculos ocultos: ${Array.from(state.config.hiddenFields).join(', ') || 'ninguno'}`,
        `Hero (${round.heroPosition}): ${round.hero.join(' ')}`,
        `Villain (${round.villainPosition}): ${round.villain.join(' ') || '--'}`,
        `Board: ${round.board.join(' ')}`,
        `Proyecto: ${round.project}`,
        `Bote: ${math.pot}`,
        `Apuesta / Call: ${math.bet}`,
        `Call amount: ${round.callAmount}`,
        `Bote final: ${math.finalPot}`,
        `Equity necesaria: ${math.needed.toFixed(1)}%`,
        `Outs útiles: ${analysis.outs.useful.length}`,
        `Equity por outs: ${analysis.mode === 'MADE_HAND_MODE' || math.equity === null ? 'N/A' : `${math.equity.toFixed(1)}%`}`,
        `Decisión Pot Odds: ${round.expectedDecision === 'N/A' ? 'N/A (mano hecha)' : round.expectedDecision}`,
        `Respuesta: ${state.answer || 'pendiente'}`,
        `Resultado: ${state.phase === 'question' ? 'pendiente' : state.answer === round.expectedDecision ? 'correcto' : 'incorrecto'}`,
        `Explicación: ${state.feedback}`
      ].join('\n');
    }
    function exportLabText() {
      const analysis = labEngine.labAnalysis();
      const math = analysis.math;
      const madeHand = analysis.mode === 'MADE_HAND_MODE';
      const lab = labStore.state.lab;
      return [
        'SIMULATOR POT ODDS LAB',
        `Timestamp: ${new Date().toISOString()}`,
        `Hero: ${analysis.hero.join(' ') || '--'}`,
        `Villain: ${analysis.villain.join(' ') || '--'}`,
        `Board: ${analysis.board.join(' ') || '--'}`,
        `Bote: ${math.pot}`,
        `Apuesta / Call: ${math.bet}`,
        `Bote final: ${math.finalPot}`,
        `Equity necesaria: ${math.needed.toFixed(1)}%`,
        `Tipo: ${madeHand ? 'Mano hecha' : 'Proyecto'}`,
        `Mano / Proyecto: ${madeHand ? (analysis.current ? analysis.current.handName : '--') : analysis.project}`,
        `${madeHand ? 'Mejoras posibles' : 'Outs utiles'}: ${madeHand ? analysis.outs.clean.length : analysis.outs.useful.length}`,
        `Equity por outs: ${madeHand || math.equity === null ? 'N/A' : `${math.equity.toFixed(1)}%`}`,
        `Decision por outs: ${madeHand ? 'N/A - mano hecha' : math.action}`,
        `Modo de lectura: ${labStore.state.config.displayMode}`
      ].join('\n');
    }
    function exportRound() {
      const text = state.lab.view === 'lab' ? exportLabText() : exportText();
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          state.exportNotice = 'Copiado al portapapeles';
          emit();
        }).catch(() => {
          state.exportNotice = 'No se pudo copiar: texto preparado';
          emit();
        });
      } else {
        state.exportNotice = 'Texto preparado para copiar';
        emit();
      }
      return text;
    }
    function openLab() {
      const round = state.round;
      if (!round) return false;
      // El Lab congela la mesa: no puede vencer un temporizador ni quedar una
      // ocultación de memoria pendiente mientras se analiza el mismo spot.
      clearRoundTimers();
      state.aids.hiddenZones = new Set();
      const spot = {
        hero: round.hero.slice(), villain: round.villain.slice(), board: round.board.slice(),
        scenario: Object.assign({}, round.scenario), street: round.street,
        heroPosition: round.heroPosition, villainPosition: round.villainPosition,
        expectedDecision: round.expectedDecision, userAnswer: state.answer, resultState: state.phase
      };
      const lab = labStore.state.lab;
      lab.hero = spot.hero.slice();
      lab.villain = [spot.villain[0] || null, spot.villain[1] || null];
      lab.flop = spot.board.slice(0, 3);
      lab.turn = [spot.board[3] || null];
      lab.river = [null];
      lab.scenario = Object.assign({}, spot.scenario);
      lab.activeSlot = { section: 'hero', index: 0 };
      lab.exportStatus = '';
      labStore.state.session.spot = null;
      labStore.state.session.reveal = false;
      labStore.state.session.revealOuts = false;
      labStore.state.session.revealHand = false;
      labStore.state.session.revealDetail = null;
      spot.analysis = labEngine.labAnalysis();
      state.lab = { view: 'lab', spot, revealOuts: false, revealHand: false, revealDetail: null };
      state.exportNotice = '';
      state.feedback = 'Lab interno abierto. El spot de mesa queda congelado y no se modifica.';
      emit();
      return true;
    }
    function closeLab() {
      if (state.lab.view !== 'lab') return false;
      state.lab.view = 'table';
      state.feedback = state.round && state.answer ? state.feedback : 'Vuelta a la mesa. El spot original sigue intacto.';
      emit();
      return true;
    }
    function syncLabAids() {
      state.lab.revealOuts = labStore.state.session.revealOuts;
      state.lab.revealHand = labStore.state.session.revealHand;
      state.lab.revealDetail = labStore.state.session.revealDetail;
    }
    function toggleLabOuts() {
      if (state.lab.view !== 'lab') return;
      labEngine.toggleOutHints();
      syncLabAids();
      emit();
    }
    function toggleLabHand() {
      if (state.lab.view !== 'lab') return;
      labEngine.toggleHandHint();
      syncLabAids();
      emit();
    }
    function toggleLabReveal() {
      if (state.lab.view !== 'lab' || !state.lab.spot) return;
      labEngine.toggleReveal();
      syncLabAids();
      emit();
    }
    function labSelectSlot(section, index) { if (state.lab.view === 'lab') { labEngine.labSelectSlot(section, index); syncLabAids(); emit(); } }
    function labPlaceCard(card) { if (state.lab.view === 'lab') { labEngine.labPlaceCard(card); syncLabAids(); emit(); } }
    function labRandomSpot() { if (state.lab.view === 'lab') { labEngine.labRandomSpot(); syncLabAids(); emit(); } }
    function labClear() { if (state.lab.view === 'lab') { labEngine.labClear(); syncLabAids(); emit(); } }
    function labSetScenario(key, value) { if (state.lab.view === 'lab') { labEngine.labSetScenario(key, value); emit(); } }
    function labSetSelectionMode(mode) { if (state.lab.view === 'lab') { labEngine.setSelectionMode(mode); emit(); } }
    function labSetDisplayMode(mode) { if (state.lab.view === 'lab') { labEngine.setDisplayMode(mode); emit(); } }
    function labExplainCard(card) {
      if (state.lab.view !== 'lab' || !labStore.state.session.reveal) return false;
      const analysis = labEngine.labAnalysis();
      const expected = analysis.mode === 'MADE_HAND_MODE' ? analysis.outs.clean : analysis.outs.useful;
      const detail = { card, isCorrect: expected.includes(card), explanation: '' };
      if (detail.isCorrect && analysis.board.length < 5) {
        const previous = analysis.current ? analysis.current.hand : null;
        const next = RT.PotOddsTrainerEngine.analyzeBestHand(
          analysis.hero.concat(analysis.board, card), card, previous
        );
        detail.explanation = next.explanation;
      } else if (detail.isCorrect) {
        detail.explanation = `${card} es una mejora correcta.`;
      } else {
        detail.explanation = `${card} no es una out efectiva en este spot.`;
      }
      labStore.state.session.revealDetail = detail;
      state.lab.revealDetail = detail;
      state.feedback = detail.explanation;
      emit();
      return true;
    }
    function labAnalysis() { return labEngine.labAnalysis(); }
    function stop(shouldEmit = true) {
      clearRoundTimers();
      state.phase = 'ready';
      state.round = null;
      state.answer = null;
      state.exportNotice = '';
      state.lab = { view: 'table', spot: null, revealOuts: false, revealHand: false, revealDetail: null };
      state.aids.hiddenZones = new Set();
      state.aids.reveal = false;
      state.feedback = 'Configura el spot o pulsa Nuevo spot.';
      if (shouldEmit) emit();
    }
    return {
      state, labState: labStore.state, labStore, labEngine, next, startSession, answer, setConfig, toggleConfigSet, toggleReveal, applyPreset, resetStats, exportText,
      exportRound, openLab, closeLab, toggleLabOuts, toggleLabHand, toggleLabReveal,
      labSelectSlot, labPlaceCard, labRandomSpot, labClear, labSetScenario,
      labSetSelectionMode, labSetDisplayMode, labExplainCard, labAnalysis, stop,
      presets: () => [
        { id: 'basic-flop', label: 'Básico flop', street: 'flop', kind: 'mixed', description: 'Proyectos claros con dos cartas por venir.' },
        { id: 'basic-turn', label: 'Básico turn', street: 'turn', kind: 'mixed', description: 'Una carta por venir y regla x2.' },
        { id: 'oesd', label: 'OESD', street: 'mixed', kind: 'oesd', description: 'Escaleras abiertas.' },
        { id: 'gutshot', label: 'Gutshot', street: 'mixed', kind: 'gutshot', description: 'Escalera interna.' },
        { id: 'flush', label: 'Flush draw', street: 'mixed', kind: 'flush', description: 'Proyecto de color.' },
        { id: 'combo', label: 'Combo draw', street: 'mixed', kind: 'combo', description: 'Color y escalera.' },
        { id: 'made-hand', label: 'Mano hecha', street: 'mixed', kind: 'made-hand', description: 'No decidir solo por outs futuras.' },
        { id: 'mixed', label: 'Mixto', street: 'mixed', kind: 'mixed', description: 'Flop y turn aleatorios.' }
      ]
    };
  }
  RT.SimulatorPotOdds = create();
})(window.RT);
