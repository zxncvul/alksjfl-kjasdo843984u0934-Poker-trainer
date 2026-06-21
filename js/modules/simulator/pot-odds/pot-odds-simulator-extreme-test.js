'use strict';

/* Auditoría determinista de estado/lógica. No usa DOM ni librerías externas:
 * está diseñada para ejecutar tandas grandes rápidamente sin clicks reales. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../../../..');
const storage = new Map();
const ITERATIONS = 10000;
const startedAt = Date.now();

function assert(condition, message, context) {
  if (!condition) {
    const detail = context ? `\n${JSON.stringify(context, null, 2)}` : '';
    throw new Error(message + detail);
  }
}
function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file });
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function choose(items, index) { return items[index % items.length]; }
function fakeNode(tag, className = '', text = '') {
  return {
    tag, className, textContent: text, children: [], dataset: {}, disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {}, setAttribute() {},
    queryText() { return [this.textContent].concat(this.children.map(child => child.queryText ? child.queryText() : child.textContent || '')).join(' '); }
  };
}

global.window = {
  RT: { emit() {}, on() {} },
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }
};
global.localStorage = window.localStorage;
global.document = { createElement(tag) { return fakeNode(tag); } };
load('js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-state.js');
load('js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-engine.js');
load('js/modules/simulator/pot-odds/pot-odds-simulator-adapter.js');
load('js/modules/simulator/pot-odds/pot-odds-simulator-ui.js');

const pot = window.RT.SimulatorPotOdds;
const suits = ['♠', '♥', '♦', '♣'];
const counters = {
  generation: 0, configurations: 0, calculations: 0, exports: 0,
  reveals: 0, labs: 0, nextCycles: 0, boardModes: 0, timers: 0, uiRenders: 0
};
const fakeH = {
  el: fakeNode,
  hint: text => fakeNode('p', '', text),
  button: label => fakeNode('button', 'btn', label),
  selectGroup: label => fakeNode('div', 'panel-group', label),
  group: (label, items) => {
    const node = fakeNode('div', 'panel-group', label);
    items.forEach(item => node.appendChild(item));
    return node;
  },
  collapsible: (id, label, build) => {
    const node = fakeNode('div', 'collapsible', label);
    const body = fakeNode('div', 'collapsible-body');
    build(body);
    node.appendChild(body);
    return node;
  },
  statLine: (label, value) => fakeNode('div', 'stat-line', `${label} ${value}`),
  dashPanel: (label, build) => {
    const node = fakeNode('section', 'dash-panel', label);
    build(node);
    return node;
  }
};

function configureSet(key, values) {
  const wanted = new Set(values);
  const allowed = key === 'memoryZones'
    ? ['hero', 'flop', 'turn', 'river']
    : ['ratio', 'needed', 'turn', 'river', 'result'];
  allowed.forEach(value => {
    if (pot.state.config[key].has(value) !== wanted.has(value)) pot.toggleConfigSet(key, value);
  });
}
function validateRound(round, config) {
  assert(round && round.hero.length === 2, 'Hero inválido', { round, config });
  assert(round.villain.length === 0 || round.villain.length === 2, 'Villain inválido', { round, config });
  assert(round.board.length === (round.street === 'turn' ? 4 : 3), 'Street/board incoherente', { round, config });
  assert(round.board.length < 5, 'Se generó una decisión en river', { round, config });
  const cards = round.hero.concat(round.villain, round.board);
  assert(new Set(cards).size === cards.length, 'Cartas duplicadas', { round, config });
  const math = round.analysis.math;
  assert(math.finalPot === math.pot + math.bet * 2, 'Bote final incorrecto', { math, round });
  assert(Math.abs(math.needed - math.bet / math.finalPot * 100) < 1e-9, 'Equity necesaria incorrecta', { math, round });
  if (round.analysis.mode === 'MADE_HAND_MODE') {
    assert(round.expectedDecision === 'N/A', 'Mano hecha evaluada como proyecto', { round });
    assert(round.analysis.outs.useful.length === 0, 'Mano hecha conserva outs útiles', { round });
  } else {
    assert(['CALL', 'FOLD'].includes(round.expectedDecision), 'Decisión inválida', { round });
    assert(round.expectedDecision === math.action, 'CALL/FOLD no coincide con Pot Odds', { math, round });
    const factor = round.street === 'flop' ? 4 : 2;
    assert(Math.abs(math.equity - round.analysis.outs.useful.length * factor) < 1e-9,
      'Equity por outs no coincide con street', { math, round });
  }
  counters.generation++;
  counters.calculations++;
}
function validateExport(text, round, lab) {
  assert(typeof text === 'string' && text.length > 40, 'Export vacío');
  if (lab) {
    assert(text.includes('SIMULATOR POT ODDS LAB'), 'Export Lab sin cabecera');
    assert(text.includes(`Bote: ${round.analysis.math.pot}`), 'Export Lab no coincide con bote');
  } else {
    assert(text.includes('SIMULATOR POT ODDS'), 'Export sin cabecera');
    assert(text.includes(`Street: ${round.street}`), 'Export sin street correcto');
    assert(text.includes(`Hero (${round.heroPosition}): ${round.hero.join(' ')}`), 'Export sin Hero correcto');
    assert(text.includes(`Board: ${round.board.join(' ')}`), 'Export sin board correcto');
    assert(text.includes(`Bote: ${round.analysis.math.pot}`), 'Export sin bote correcto');
    assert(text.includes(`Call amount: ${round.callAmount}`), 'Export sin call amount');
    assert(text.includes('Tipo de board:'), 'Export sin configuración activa');
  }
  counters.exports++;
}
function validateBoardMode(mode, round) {
  if (mode === 'random') return;
  const boardSuits = round.board.slice(0, 3).map(card => card[1]);
  const unique = new Set(boardSuits).size;
  if (mode === 'rainbow') assert(unique === 3, 'Rainbow no respeta tres palos', { round });
  if (mode === 'paired') assert(unique === 2, 'Pair no respeta dos palos', { round });
  if (mode === 'mono') assert(unique === 1, 'Mono no respeta un palo', { round });
  counters.boardModes++;
}

(async () => {
  pot.setConfig('count', 0);
  pot.resetStats();

  // Render representativo del panel de controles: sin navegador real, pero
  // con el mismo árbol y los mismos callbacks de la interfaz.
  for (let index = 0; index < 250; index++) {
    pot.setConfig('countdown', choose([0, 5, 10, 15, 30], index));
    const panel = fakeNode('aside');
    window.RT.SimulatorPotOddsUI.renderPanel(panel, fakeH, null);
    assert(panel.queryText().includes('Tipo de board') && panel.queryText().includes('Acciones'),
      'El panel Pot Odds no renderiza sus secciones compactas');
    counters.uiRenders++;
  }

  // 10.000 comprobaciones exactas de los cuatro modos de board con proyecto mixto.
  ['random', 'rainbow', 'paired', 'mono'].forEach(mode => {
    pot.setConfig('street', 'flop');
    pot.setConfig('kind', 'mixed');
    pot.setConfig('suitMode', mode);
    pot.setConfig('boardLocked', false);
    for (let index = 0; index < 2500; index++) {
      assert(pot.next(false), 'No se generó spot de board');
      validateRound(pot.state.round, pot.state.config);
      validateBoardMode(mode, pot.state.round);
    }
  });

  const streets = ['flop', 'turn', 'mixed'];
  const kinds = ['mixed', 'oesd', 'gutshot', 'flush', 'combo', 'made-hand'];
  const times = [0, 5, 10, 15, 30];
  const memories = [0, 1, 2, 5, 10];
  const randomCounts = [0, 1, 2, 3];
  const modes = ['random', 'rainbow', 'paired', 'mono'];
  const zoneSets = [[], ['hero'], ['flop'], ['turn'], ['river'], ['hero', 'flop'], ['flop', 'turn', 'river']];
  const hiddenSets = [[], ['ratio'], ['needed'], ['turn', 'river'], ['result'], ['ratio', 'needed', 'turn', 'river', 'result']];

  // 10.000 combinaciones: config, generación, export, Reveal, Lab y Next.
  for (let index = 0; index < ITERATIONS; index++) {
    const boardLocked = index % 4 === 1 || index % 4 === 3;
    const scenarioLocked = index % 4 === 2 || index % 4 === 3;
    pot.setConfig('street', choose(streets, index));
    pot.setConfig('kind', choose(kinds, index));
    pot.setConfig('countdown', choose(times, index));
    pot.setConfig('memoryDuration', choose(memories, index));
    pot.setConfig('memoryRandomCount', choose(randomCounts, index));
    pot.setConfig('suitMode', choose(modes, index));
    pot.setConfig('boardLocked', boardLocked);
    pot.setConfig('scenarioLocked', scenarioLocked);
    configureSet('memoryZones', choose(zoneSets, index));
    configureSet('hiddenFields', choose(hiddenSets, index));
    counters.configurations++;

    assert(pot.next(false), 'Random Spot no generó ronda');
    const round = pot.state.round;
    validateRound(round, pot.state.config);
    if (!boardLocked && round.analysis.mode !== 'MADE_HAND_MODE') validateBoardMode(pot.state.config.suitMode, round);
    validateExport(pot.exportRound(), round, false);

    const revealState = pot.toggleReveal();
    assert(revealState && pot.state.aids.reveal, 'Reveal de mesa no se activa');
    assert(pot.toggleReveal() === false && !pot.state.aids.reveal, 'Reveal de mesa no se limpia');
    counters.reveals++;

    const snapshot = {
      hero: round.hero.join('|'), board: round.board.join('|'),
      pot: round.scenario.pot, bet: round.scenario.bet
    };
    assert(pot.openLab(), 'Abrir Lab falló');
    const labAnalysis = pot.labAnalysis();
    assert(labAnalysis.hero.join('|') === snapshot.hero && labAnalysis.board.join('|') === snapshot.board,
      'Lab no recibió el spot congelado', { snapshot, labAnalysis });
    pot.toggleLabOuts();
    pot.toggleLabHand();
    pot.toggleLabReveal();
    validateExport(pot.exportRound(), round, true);
    assert(pot.closeLab(), 'Volver a mesa falló');
    assert(pot.state.round === round && round.hero.join('|') === snapshot.hero && round.board.join('|') === snapshot.board,
      'El Lab modificó el spot de mesa');
    counters.labs++;

    if (round.expectedDecision !== 'N/A') {
      const response = index % 2 ? round.expectedDecision : (round.expectedDecision === 'CALL' ? 'FOLD' : 'CALL');
      pot.answer(response);
      assert(['correct', 'error'].includes(pot.state.phase), 'CALL/FOLD no cerró la ronda');
    }
    assert(pot.next(false), 'Next no limpia/genera nuevo spot');
    assert(pot.state.answer === null && !pot.state.aids.reveal && pot.state.aids.hiddenZones.size === 0,
      'Next dejó estado visual anterior');
    counters.nextCycles++;
  }

  // Controles temporales: activación, limpieza al cambiar spot/Lab y expiración real de 5 s.
  pot.setConfig('street', 'flop');
  pot.setConfig('kind', 'mixed');
  pot.setConfig('boardLocked', false);
  pot.setConfig('scenarioLocked', false);
  pot.setConfig('countdown', 5);
  pot.setConfig('memoryDuration', 1);
  pot.setConfig('memoryRandomCount', 0);
  configureSet('memoryZones', ['hero', 'flop']);
  assert(pot.next(false), 'No inicia la prueba de temporizador');
  assert(pot.state.aids.remainingMs > 0, 'Tiempo no inicia');
  await wait(1100);
  assert(pot.state.aids.hiddenZones.has('hero') && pot.state.aids.hiddenZones.has('flop'), 'Memoria no oculta solo las zonas seleccionadas');
  assert(pot.openLab(), 'Lab no abre durante prueba de timer');
  assert(pot.state.aids.remainingMs === 0 && pot.state.aids.hiddenZones.size === 0, 'Abrir Lab no limpia timer/memoria');
  pot.closeLab();
  assert(pot.next(false), 'No reinicia timer en nuevo spot');
  await wait(5100);
  assert(pot.state.phase === 'error' && pot.state.feedback === 'Tiempo agotado.', 'El timeout de 5s no cierra la ronda');
  pot.stop(false);
  assert(pot.state.aids.remainingMs === 0 && pot.state.round === null, 'stop deja temporizadores o ronda viva');
  counters.timers = 5;

  const result = {
    ok: true,
    iterations: ITERATIONS,
    counters,
    stats: pot.state.stats,
    elapsedMs: Date.now() - startedAt
  };
  console.log(JSON.stringify(result));
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
