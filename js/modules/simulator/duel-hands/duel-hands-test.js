'use strict';

/*
 * Auditoria ejecutable del Duelo de Jugadas.
 * Uso: node js/modules/simulator/duel-hands/duel-hands-test.js
 *
 * No depende de librerias externas: carga los modulos reales en un entorno
 * minimo de navegador y valida 10.000 duelos consecutivos completos.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../../../..');
const STRESS_ITERATIONS = 10000;
const clipboard = { text: '' };
const storage = new Map();

function makeRuntime() {
  const RT = {
    _events: Object.create(null),
    emit(name) {
      (this._events[name] || []).forEach((fn) => fn());
    },
    on(name, fn) {
      this._events[name] = this._events[name] || [];
      this._events[name].push(fn);
      return () => {
        this._events[name] = (this._events[name] || []).filter((item) => item !== fn);
      };
    }
  };

  global.window = {
    RT,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    navigator: {
      clipboard: {
        writeText(text) {
          clipboard.text = text;
          return Promise.resolve();
        }
      }
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  return RT;
}

function loadScript(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInThisContext(code, { filename: fullPath });
}

function loadModules() {
  makeRuntime();
  [
    'js/modules/simulator/duel-hands/duel-hands-engine.js',
    'js/modules/simulator/duel-hands/duel-hands-state.js',
    'js/modules/simulator/duel-hands/duel-hands-adapter.js',
    'js/modules/simulator/duel-hands/duel-hands-ui.js'
  ].forEach(loadScript);
  return window.RT.SimulatorDuelHands;
}

function fail(message, context) {
  const error = new Error(message);
  error.context = context;
  throw error;
}

function assert(condition, message, context) {
  if (!condition) fail(message, context);
}

function setEquals(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function card(code) {
  return { rank: code[0], suit: code[1], code };
}

function cards(codes) {
  return codes.map(card);
}

function codes(list) {
  return list.map((item) => item.code);
}

function assertNoDuplicates(round) {
  const all = codes(round.hero).concat(codes(round.villain), codes(round.board));
  assert(new Set(all).size === all.length, 'Cartas duplicadas en duelo', { all, round });
}

function assertRoundShape(round) {
  assert(round, 'No hay ronda activa');
  assert(round.hero.length === 2, 'Hero no tiene 2 cartas', round.hero);
  assert(round.villain.length === 2, 'Villain no tiene 2 cartas', round.villain);
  assert(round.board.length === 5, 'Board no tiene 5 cartas', round.board);
  assert(round.heroPosition !== round.villainPosition, 'Hero y Villain comparten posicion', {
    hero: round.heroPosition,
    villain: round.villainPosition
  });
  assertNoDuplicates(round);
}

function assertWeights(config) {
  const selected = window.RT.SimulatorDuelHands.engine.FILTER_TYPES.map((type) => {
    const groups = ['hero', 'villain', 'both'].filter((group) =>
      config.filters[group][type] && config.filters[group][type].enabled);
    return { type, groups };
  });
  selected.forEach((row) => {
    assert(row.groups.length <= 1, 'Fila de matriz con seleccion invalida', row);
  });
  ['hero', 'villain', 'both'].forEach((group) => {
    const active = window.RT.SimulatorDuelHands.engine.FILTER_TYPES
      .filter(type => config.filters[group][type] && config.filters[group][type].enabled);
    const sum = active.reduce((total, type) => total + Number(config.filters[group][type].weight || 0), 0);
    assert(!active.length || Math.abs(sum - 100) < 0.11, 'Pesos de grupo no suman 100', {
      group,
      sum,
      active,
      selected
    });
  });
}

function assertRoles(Duel, round) {
  const roles = Duel.tableRoles(round);
  assert(roles.dealer === 'BTN', 'Dealer incorrecto', roles);
  assert(roles.sb === 'SB', 'SB incorrecta', roles);
  assert(roles.bb === 'BB', 'BB incorrecta', roles);
}

function expectedRevealCodes(round, side) {
  if (side === 'hero') return new Set(round.heroBest.usedCodes);
  if (side === 'villain') return new Set(round.villainBest.usedCodes);
  if (round.winner === 'hero') return new Set(round.heroBest.usedCodes);
  if (round.winner === 'villain') return new Set(round.villainBest.usedCodes);
  return new Set(round.heroBest.usedCodes.concat(round.villainBest.usedCodes));
}

function assertReveal(Duel, side) {
  Duel.state.revealSide = null;
  const round = Duel.state.round;
  Duel.reveal(side);
  const actual = Duel.usedCodesForReveal();
  const expected = expectedRevealCodes(round, side);
  assert(setEquals(actual, expected), `Reveal ${side} no coincide con cartas usadas reales`, {
    expected: Array.from(expected).sort(),
    actual: Array.from(actual).sort(),
    round
  });
}

function assertExport(Duel, round, text, selected) {
  const Engine = Duel.engine;
  assert(text.includes('DUELO DE JUGADAS'), 'Export sin cabecera', text);
  assert(text.includes(`Modo activo: ${Duel.state.config.filterMode}`), 'Export sin modo activo', text);
  assert(text.includes(`Hero posicion: ${round.heroPosition}`), 'Export no coincide con posicion Hero', text);
  assert(text.includes(`Villain posicion: ${round.villainPosition}`), 'Export no coincide con posicion Villain', text);
  ['Dealer: BTN', 'SB: SB', 'BB: BB'].forEach((token) => assert(text.includes(token), `Export sin ${token}`, text));
  round.hero.concat(round.villain, round.board).forEach((item) => {
    assert(text.includes(Engine.cardLabel(item)), `Export no contiene carta ${item.code}`, text);
  });
  assert(text.includes(`Ganador: ${Duel.winnerLabelText(round.winner)}`), 'Export no coincide con ganador', text);
  assert(text.includes(`Jugada Hero: ${round.heroBest.label}`), 'Export no coincide con jugada Hero', text);
  assert(text.includes(`Jugada Villain: ${round.villainBest.label}`), 'Export no coincide con jugada Villain', text);
  round.heroBest.cards.forEach((item) => assert(text.includes(Engine.cardLabel(item)), `Export sin carta usada Hero ${item.code}`, text));
  round.villainBest.cards.forEach((item) => assert(text.includes(Engine.cardLabel(item)), `Export sin carta usada Villain ${item.code}`, text));
  assert(text.includes(`Respuesta usuario: ${selected || 'pendiente'}`), 'Export no coincide con respuesta', text);
}

function selectionLabel(selection) {
  if (selection === 'hero') return 'H';
  if (selection === 'villain') return 'V';
  if (selection === 'both') return 'All';
  return 'X';
}

function snapshotMatrix(Duel) {
  const snapshot = {};
  Duel.engine.FILTER_TYPES.forEach((type) => {
    snapshot[type] = Duel.matrixSelection(type) || 'none';
  });
  return snapshot;
}

function snapshotRound(round) {
  if (!round) return null;
  return {
    id: round.id,
    heroPosition: round.heroPosition,
    villainPosition: round.villainPosition,
    hero: codes(round.hero),
    villain: codes(round.villain),
    board: codes(round.board),
    heroType: round.heroBest.type,
    villainType: round.villainBest.type,
    cardColorMode: round.cardColorMode || '',
    visualColors: round.visualColors ? Object.assign({}, round.visualColors) : {},
    winner: round.winner
  };
}

function assertRoundUnchanged(before, after, context) {
  assert(JSON.stringify(before) === JSON.stringify(snapshotRound(after)),
    'Cambio de configuracion altero la mano actual antes de Next', { before, after: snapshotRound(after), context });
}

function handAllowedForSide(selection, side) {
  if (side === 'hero') return selection === 'hero' || selection === 'both';
  return selection === 'villain' || selection === 'both';
}

function assertMatrixRules(Duel, round, matrix, context) {
  const heroSelection = matrix[round.heroBest.type];
  const villainSelection = matrix[round.villainBest.type];
  assert(handAllowedForSide(heroSelection, 'hero'), 'Hero recibio una jugada no permitida por matriz', {
    type: round.heroBest.type,
    selection: heroSelection,
    matrix,
    round: snapshotRound(round),
    context
  });
  assert(handAllowedForSide(villainSelection, 'villain'), 'Villain recibio una jugada no permitida por matriz', {
    type: round.villainBest.type,
    selection: villainSelection,
    matrix,
    round: snapshotRound(round),
    context
  });
  assert(heroSelection !== 'none', 'Hero recibio una jugada marcada como X', {
    type: round.heroBest.type,
    matrix,
    round: snapshotRound(round),
    context
  });
  assert(villainSelection !== 'none', 'Villain recibio una jugada marcada como X', {
    type: round.villainBest.type,
    matrix,
    round: snapshotRound(round),
    context
  });
  assert(round.winner !== 'split' || matrix.Split !== 'none', 'Split aparecio con Split marcado como X', {
    matrix,
    round: snapshotRound(round),
    context
  });
}

function assertExportMatrix(Duel, text, matrix) {
  Duel.engine.FILTER_TYPES.forEach((type) => {
    const expected = `- ${type}: ${selectionLabel(matrix[type])}`;
    assert(text.includes(expected), 'Export no refleja la matriz activa', { expected, text });
  });
}

function assertWinner(Duel, round) {
  const cmp = Duel.engine.compareHands(
    Duel.engine.evaluate(round.hero.concat(round.board)),
    Duel.engine.evaluate(round.villain.concat(round.board))
  );
  const winner = cmp > 0 ? 'hero' : (cmp < 0 ? 'villain' : 'split');
  assert(winner === round.winner, 'Ganador inconsistente con evaluador', { winner, roundWinner: round.winner, round });
}

function assertBestHandsFresh(Duel, round) {
  const heroBest = Duel.engine.evaluate(round.hero.concat(round.board));
  const villainBest = Duel.engine.evaluate(round.villain.concat(round.board));
  assert(heroBest.type === round.heroBest.type && heroBest.label === round.heroBest.label,
    'Ranking Hero almacenado no coincide con cartas reales', { expected: heroBest, actual: round.heroBest, round: snapshotRound(round) });
  assert(villainBest.type === round.villainBest.type && villainBest.label === round.villainBest.label,
    'Ranking Villain almacenado no coincide con cartas reales', { expected: villainBest, actual: round.villainBest, round: snapshotRound(round) });
}

function assertRankCases(Engine) {
  const cases = [
    ['carta alta', ['As', 'Kd', 'Qh', 'Jc', '9s', '3d', '2c'], 'Carta alta'],
    ['pareja', ['As', 'Ad', 'Qh', 'Jc', '9s', '3d', '2c'], 'Pareja'],
    ['doble pareja', ['As', 'Ad', 'Qh', 'Qc', '9s', '3d', '2c'], 'Doble pareja'],
    ['trio', ['As', 'Ad', 'Ah', 'Qc', '9s', '3d', '2c'], 'Trio'],
    ['escalera', ['6s', '7d', '8h', '9c', 'Ts', '3d', '2c'], 'Escalera'],
    ['escalera baja', ['As', '2d', '3h', '4c', '5s', 'Kd', 'Qc'], 'Escalera'],
    ['color', ['As', 'Qs', '9s', '6s', '2s', 'Kd', 'Qc'], 'Color'],
    ['full', ['As', 'Ad', 'Ah', 'Qc', 'Qd', '3d', '2c'], 'Full house'],
    ['poker', ['As', 'Ad', 'Ah', 'Ac', 'Qd', '3d', '2c'], 'Poker'],
    ['escalera de color', ['6s', '7s', '8s', '9s', 'Ts', '3d', '2c'], 'Escalera de color']
  ];
  cases.forEach(([name, list, type]) => {
    const best = Engine.evaluate(cards(list));
    assert(best.type === type, `Ranking incorrecto: ${name}`, { expected: type, actual: best });
  });

  const kickerHero = Engine.evaluate(cards(['Ac', '2d', 'Qc', 'Js', '9h', '7d', '4c']));
  const kickerVillain = Engine.evaluate(cards(['Kc', '2h', 'Qc', 'Js', '9h', '7d', '4c']));
  assert(Engine.compareHands(kickerHero, kickerVillain) > 0, 'Kicker de pareja no decide bien', { kickerHero, kickerVillain });

  const splitHero = Engine.evaluate(cards(['2c', '3d', 'As', 'Kd', 'Qh', 'Jc', 'Ts']));
  const splitVillain = Engine.evaluate(cards(['4c', '5d', 'As', 'Kd', 'Qh', 'Jc', 'Ts']));
  assert(Engine.compareHands(splitHero, splitVillain) === 0, 'Split por board no detectado', { splitHero, splitVillain });
}

function forceSingleFilter(Duel, group, type, mode) {
  Duel.setFilterMode(mode);
  Duel.engine.FILTER_TYPES.forEach((item) => Duel.setMatrixSelection(item, 'both'));
  if (Duel.engine.HAND_TYPES.includes(type) && group === 'hero') {
    Duel.engine.HAND_TYPES.forEach((item) => Duel.setMatrixSelection(item, item === type ? 'hero' : 'villain'));
  } else if (Duel.engine.HAND_TYPES.includes(type) && group === 'villain') {
    Duel.engine.HAND_TYPES.forEach((item) => Duel.setMatrixSelection(item, item === type ? 'villain' : 'hero'));
  } else {
    Duel.setMatrixSelection(type, group === 'both' ? 'both' : group);
  }
  assertWeights(Duel.state.config);
  Duel.nextRound(false);
}

function mutateFilters(Duel, index) {
  Duel.setFilterMode(index % 7 === 0 ? 'random' : 'both');
  const targets = ['hero', 'villain', 'both'];
  const group = targets[index % targets.length];
  const type = Duel.engine.FILTER_TYPES[index % Duel.engine.FILTER_TYPES.length];
  Duel.setMatrixSelection(type, group);
  if (index % 11 === 0) Duel.setMatrixSelection('Carta alta', 'none');
  assertWeights(Duel.state.config);
}

function mutatePositions(Duel, index) {
  const options = ['random'].concat(Duel.engine.POSITIONS);
  Duel.setPosition('hero', options[index % options.length]);
  Duel.setPosition('villain', options[(index + 3) % options.length]);
}

function assertMatrixTransitions(Duel) {
  const type = 'Pareja';
  Duel.setMatrixSelection(type, 'both');
  assert(Duel.matrixSelection(type) === 'both', 'All no selecciona both', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'hero');
  assert(Duel.matrixSelection(type) === 'hero', 'All -> H no deja solo Hero', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'villain');
  assert(Duel.matrixSelection(type) === 'villain', 'H -> V no deja solo Villain', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'villain');
  assert(Duel.matrixSelection(type) === 'villain', 'V repetido no debe cambiar a otro modo', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'hero');
  assert(Duel.matrixSelection(type) === 'hero', 'V -> H no deja solo Hero', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'both');
  assert(Duel.matrixSelection(type) === 'both', 'Seleccion All no limpia H/V', Duel.matrixSelection(type));
  Duel.setMatrixSelection(type, 'none');
  assert(Duel.matrixSelection(type) === null, 'X no excluye la fila', Duel.matrixSelection(type));
  assertWeights(Duel.state.config);
}

function fakeNode(tag, className, text) {
  return {
    tag,
    className: className || '',
    textContent: text || '',
    dataset: {},
    children: [],
    disabled: false,
    title: '',
    type: '',
    classList: {
      add() {},
      remove() {}
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    addEventListener() {}
  };
}

function fakeHelpers() {
  return {
    el: fakeNode,
    hint: (text) => fakeNode('p', 'hint', text),
    button: (label) => fakeNode('button', 'btn', label),
    group: (label, children) => {
      const node = fakeNode('div', 'panel-group', label);
      (children || []).forEach(child => node.appendChild(child));
      return node;
    },
    selectGroup: (label) => fakeNode('div', 'field-group', label)
  };
}

function collectByClass(node, className, out = []) {
  if (String(node.className || '').split(/\s+/).includes(className)) out.push(node);
  (node.children || []).forEach(child => collectByClass(child, className, out));
  return out;
}

function firstTextByClass(node, className) {
  if (String(node.className || '').split(/\s+/).includes(className)) return node.textContent;
  for (const child of (node.children || [])) {
    const found = firstTextByClass(child, className);
    if (found) return found;
  }
  return '';
}

function assertMatrixRenderExclusivity(Duel) {
  const type = 'Pareja';
  Duel.setMatrixSelection(type, 'none');
  const panel = fakeNode('div', 'panel');
  window.RT.SimulatorDuelHandsUI.renderPanel(panel, fakeHelpers(), null);
  const row = collectByClass(panel, 'sim-duel-matrix-row')
    .find(item => item.children[0] && item.children[0].textContent === type);
  assert(row, 'No se renderizo la fila de matriz para Pareja', panel);
  const buttons = row.children.slice(1);
  const active = buttons.map((button, index) => ({
    index,
    className: button.className,
    active: String(button.className || '').includes('is-active')
  })).filter(item => item.active);
  assert(active.length === 1 && active[0].index === 3,
    'Render de X debe desactivar visualmente H/V/All', { active, row });
}

function assertSeatRotation(Duel) {
  const Engine = Duel.engine;
  const deck = Engine.createDeck();
  Engine.POSITIONS.forEach((heroPosition, heroIndex) => {
    const round = {
      id: `seat-${heroPosition}`,
      heroPosition,
      villainPosition: Engine.POSITIONS[(heroIndex + 1) % Engine.POSITIONS.length],
      hero: deck.slice(0, 2),
      villain: deck.slice(2, 4),
      board: deck.slice(4, 9),
      heroBest: Engine.evaluate(deck.slice(0, 2).concat(deck.slice(4, 9))),
      villainBest: Engine.evaluate(deck.slice(2, 4).concat(deck.slice(4, 9))),
      winner: 'hero'
    };
    Duel.state.round = round;
    Duel.state.phase = 'question';
    Duel.state.revealSide = null;
    const stage = fakeNode('div', 'stage');
    window.RT.SimulatorDuelHandsUI.renderStage(stage, fakeHelpers());
    const seats = collectByClass(stage, 'sim-seat');
    const actual = new Array(Engine.POSITIONS.length);
    seats.forEach((seat) => {
      const match = String(seat.className || '').match(/sim-seat-slot-(\d+)/);
      if (match) actual[Number(match[1])] = firstTextByClass(seat, 'sim-seat-pos');
    });
    const expected = new Array(Engine.POSITIONS.length);
    Engine.POSITIONS.forEach((position, index) => {
      const offset = (index - heroIndex + Engine.POSITIONS.length) % Engine.POSITIONS.length;
      expected[(4 + offset) % Engine.POSITIONS.length] = position;
    });
    assert(actual[4] === heroPosition, 'Hero no queda fijado en el asiento inferior', { heroPosition, actual });
    assert(JSON.stringify(actual) === JSON.stringify(expected),
      'Rotacion visual de posiciones incoherente', { heroPosition, expected, actual });
  });
}

function assertPresetSystem(Duel) {
  const presets = Duel.presets();
  assert(presets.length === 10, 'Showdown debe exponer 10 presets de dificultad', presets);
  const root = fakeNode('div', 'range-gallery');
  window.RT.SimulatorDuelHandsUI.renderGallery(root, fakeHelpers());
  assert(collectByClass(root, 'sim-duel-preset-card').length === 10,
    'La galeria Showdown no renderizo 10 tarjetas', root);

  presets.forEach((preset) => {
    Duel.setCardColorMode('bicolor');
    Duel.engine.FILTER_TYPES.forEach((type) => Duel.setMatrixSelection(type, 'both'));
    Duel.nextRound(false);
    const before = snapshotRound(Duel.state.round);
    Duel.applyPreset(preset.id);
    assertRoundUnchanged(before, Duel.state.round, { preset: preset.id });
    assert(Duel.presetStatus(preset.id) === 'active', 'Preset aplicado no queda activo exacto', {
      preset: preset.id,
      status: Duel.presetStatus(preset.id)
    });
    assert(Duel.state.config.filterMode === 'both', 'Preset no activo la matriz de Showdown', {
      preset: preset.id,
      filterMode: Duel.state.config.filterMode
    });
    assert(Duel.state.config.cardColorMode === preset.colorMode, 'Preset no cargo el modo de color pendiente', {
      preset: preset.id,
      expected: preset.colorMode,
      actual: Duel.state.config.cardColorMode
    });
    Duel.engine.FILTER_TYPES.forEach((type) => {
      assert((Duel.matrixSelection(type) || 'none') === (preset.matrix[type] || 'none'),
        'Preset no cargo matriz pendiente', { preset: preset.id, type, expected: preset.matrix[type], actual: Duel.matrixSelection(type) || 'none' });
    });
    Duel.setMatrixSelection('Pareja', (preset.matrix.Pareja === 'both') ? 'hero' : 'both');
    assert(Duel.presetStatus(preset.id) === 'edited', 'Edicion manual no marca preset como editado', {
      preset: preset.id,
      status: Duel.presetStatus(preset.id)
    });
    Duel.applyPreset(preset.id);
    Duel.nextRound(false);
    assert(Duel.state.round.cardColorMode === preset.colorMode, 'Siguiente duelo no uso color del preset', {
      preset: preset.id,
      expected: preset.colorMode,
      actual: Duel.state.round.cardColorMode
    });
  });
}

async function runDuelCycle(Duel, index) {
  mutatePositions(Duel, index);
  mutateFilters(Duel, index);
  const colorModes = ['mono', 'four', 'bicolor', 'random'];
  Duel.setCardColorMode(colorModes[index % colorModes.length]);
  Duel.nextRound(false);

  const round = Duel.state.round;
  assertRoundShape(round);
  assertRoles(Duel, round);
  assertWeights(Duel.state.config);
  assertWinner(Duel, round);
  round.hero.concat(round.villain, round.board).forEach((item) => {
    const color = Duel.cardColor(item);
    assert(['red', 'white', 'green', 'blue'].includes(color),
      'Modo de color devolvio clase invalida', { mode: Duel.state.config.cardColorMode, card: item, color });
  });
  assert(Duel.state.revealSide === null, 'Next no limpio revealSide', Duel.state);
  assert(Duel.state.selected === null, 'Next no limpio selected', Duel.state);
  assert(Duel.state.phase === 'question', 'Next no dejo fase question', Duel.state.phase);

  const pendingExport = Duel.exportText();
  assertExport(Duel, round, pendingExport, null);
  Duel.exportRound();
  await Promise.resolve();
  assert(clipboard.text.includes('DUELO DE JUGADAS'), 'Export no llego al portapapeles', clipboard.text);

  assertReveal(Duel, 'hero');
  assertReveal(Duel, 'villain');
  assertReveal(Duel, 'winner');

  const oldId = round.id;
  Duel.answer(round.winner);
  assert(Duel.state.round.id !== oldId, 'Acierto no genero una ronda nueva automaticamente',
    { oldId, newId: Duel.state.round.id });
  assert(Duel.state.revealSide === null && Duel.state.selected === null && Duel.state.phase === 'question',
    'Acierto no limpio estado visual', Duel.state);

  const missRound = Duel.state.round;
  const wrong = ['hero', 'split', 'villain'].find(item => item !== missRound.winner);
  Duel.answer(wrong);
  assert(Duel.state.phase === 'feedback', 'Fallo no paso a revision', Duel.state.phase);
  assert(Duel.state.selected === wrong, 'Respuesta erronea seleccionada incorrecta', Duel.state.selected);
  assert(Duel.state.feedback.includes('Incorrecto'), 'Feedback de fallo no mostrado', Duel.state.feedback);
  assert(Duel.state.revealSide === 'winner', 'Fallo no activo reveal de ganador', Duel.state.revealSide);
  assert(Duel.state.reviewRemaining > 0, 'Fallo no activo temporizador de revision', Duel.state.reviewRemaining);
  const failedExport = Duel.exportText();
  assertExport(Duel, missRound, failedExport, wrong);
  Duel.pauseReview();
  assert(Duel.state.reviewPaused === true, 'Pausa de revision no aplicada', Duel.state);
  Duel.resumeReview();
  assert(Duel.state.reviewPaused === false, 'Continuar revision no aplicado', Duel.state);
  const reviewId = Duel.state.round.id;
  Duel.skipReview();
  assert(Duel.state.round.id !== reviewId, 'Siguiente de revision no genero ronda nueva',
    { reviewId, newId: Duel.state.round.id });
  assert(Duel.state.revealSide === null && Duel.state.selected === null && Duel.state.phase === 'question',
    'Revision no limpio estado visual al saltar', Duel.state);
}

function randomMatrixConfig(Duel) {
  const choices = ['hero', 'villain', 'both', 'none'];
  const commonTypes = ['Carta alta', 'Pareja', 'Doble pareja', 'Trio'];
  for (let attempt = 0; attempt < 200; attempt++) {
    const matrix = {};
    Duel.engine.HAND_TYPES.forEach((type) => {
      const roll = Math.random();
      matrix[type] = roll < 0.12 ? 'none' : (roll < 0.35 ? 'hero' : (roll < 0.58 ? 'villain' : 'both'));
    });
    matrix.Split = Math.random() < 0.18 ? 'none' : choices[Math.floor(Math.random() * 3)];
    const heroCount = Duel.engine.HAND_TYPES.filter(type => handAllowedForSide(matrix[type], 'hero')).length;
    const villainCount = Duel.engine.HAND_TYPES.filter(type => handAllowedForSide(matrix[type], 'villain')).length;
    const heroCommon = commonTypes.some(type => handAllowedForSide(matrix[type], 'hero'));
    const villainCommon = commonTypes.some(type => handAllowedForSide(matrix[type], 'villain'));
    if (heroCount >= 5 && villainCount >= 5 && heroCommon && villainCommon) return matrix;
  }
  return Object.fromEntries(Duel.engine.FILTER_TYPES.map(type => [type, 'both']));
}

function applyMatrix(Duel, matrix) {
  Duel.engine.FILTER_TYPES.forEach((type) => {
    Duel.setMatrixSelection(type, 'both');
  });
  Duel.engine.FILTER_TYPES.forEach((type) => {
    Duel.setMatrixSelection(type, matrix[type] || 'both');
  });
}

function applyRandomConfigWithoutNext(Duel, index) {
  const before = snapshotRound(Duel.state.round);
  const colorModes = ['mono', 'four', 'bicolor', 'random'];
  const positions = ['random'].concat(Duel.engine.POSITIONS);
  const matrix = randomMatrixConfig(Duel);
  Duel.setFilterMode('random');
  Duel.setCardColorMode(colorModes[index % colorModes.length]);
  Duel.setPosition('hero', positions[(index * 5) % positions.length]);
  Duel.setPosition('villain', positions[(index * 7 + 2) % positions.length]);
  applyMatrix(Duel, matrix);
  assertWeights(Duel.state.config);
  if (before) assertRoundUnchanged(before, Duel.state.round, { index, matrix });
  return snapshotMatrix(Duel);
}

function assertStressRound(Duel, matrix, index) {
  const round = Duel.state.round;
  assertRoundShape(round);
  assertNoDuplicates(round);
  assertRoles(Duel, round);
  assertWeights(Duel.state.config);
  assert(!round.filterFallback, 'El generador cayo en fallback con una matriz valida', {
    index,
    matrix,
    notice: round.filterNotice,
    round: snapshotRound(round)
  });
  assertBestHandsFresh(Duel, round);
  assertWinner(Duel, round);
  assertMatrixRules(Duel, round, matrix, { index });
  const exportText = Duel.exportText();
  assertExport(Duel, round, exportText, null);
  assertExportMatrix(Duel, exportText, matrix);
  assertReveal(Duel, 'hero');
  assertReveal(Duel, 'villain');
  assertReveal(Duel, 'winner');
  assert(Duel.state.round.id === round.id, 'Reveal/Jugada cambio la ronda actual', { index, before: round.id, after: Duel.state.round.id });
}

async function runStress(Duel) {
  Duel.setFilterMode('both');
  Duel.nextRound(false);
  let streak = 0;
  for (let index = 1; index <= STRESS_ITERATIONS; index++) {
    const matrix = applyRandomConfigWithoutNext(Duel, index);
    Duel.nextRound(false);
    assertStressRound(Duel, matrix, index);
    streak += 1;
  }
  return streak;
}

async function run() {
  const Duel = loadModules();
  const Engine = Duel.engine;
  assertRankCases(Engine);
  assertMatrixTransitions(Duel);
  assertMatrixRenderExclusivity(Duel);
  assertSeatRotation(Duel);
  assertPresetSystem(Duel);

  forceSingleFilter(Duel, 'hero', 'Pareja', 'hero');
  assert(Duel.state.round.heroBest.type === 'Pareja' || Duel.state.round.filterFallback,
    'Filtro Hero Pareja no se cumple ni cae en fallback', Duel.state.round);

  forceSingleFilter(Duel, 'villain', 'Color', 'villain');
  assert(Duel.state.round.villainBest.type === 'Color' || Duel.state.round.filterFallback,
    'Filtro Villain Color no se cumple ni cae en fallback', Duel.state.round);

  let smokeStreak = 0;
  let smokeAttempts = 0;
  while (smokeStreak < 25) {
    smokeAttempts += 1;
    await runDuelCycle(Duel, smokeAttempts);
    smokeStreak += 1;
  }

  const stressStreak = await runStress(Duel);

  return {
    smokeStreak,
    smokeAttempts,
    stressStreak,
    stressIterations: STRESS_ITERATIONS,
    handsPlayed: Duel.state.stats.handsPlayed,
    clipboardSample: clipboard.text.split('\n').slice(0, 10).join('\n')
  };
}

run()
  .then((result) => {
    console.log(JSON.stringify({ ok: true, result }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      message: error.message,
      context: error.context || null,
      stack: error.stack
    }, null, 2));
    process.exitCode = 1;
  });
