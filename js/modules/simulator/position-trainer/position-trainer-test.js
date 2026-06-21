'use strict';

const storage = {};
let nextTimerId = 1;
const activeIntervals = new Set();
const activeTimeouts = new Set();
global.window = {
  RT: {},
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  },
  setInterval() {
    const id = nextTimerId++;
    activeIntervals.add(id);
    return id;
  },
  clearInterval(id) { activeIntervals.delete(id); },
  setTimeout() {
    const id = nextTimerId++;
    activeTimeouts.add(id);
    return id;
  },
  clearTimeout(id) { activeTimeouts.delete(id); }
};
global.RT = global.window.RT;
global.window.RT.emit = function () {};

require('./position-trainer-engine.js');
require('./position-trainer-state.js');
require('./position-trainer-adapter.js');

const Engine = global.window.RT.SimulatorPositionEngine;
const State = global.window.RT.SimulatorPositionState;
const Position = global.window.RT.SimulatorPosition;

const EXPECTED_A = {
  2: ['BTN/SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'],
  10: ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB']
};

const EXPECTED_B = {
  2: ['BTN/SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  6: ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  10: ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
};

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function assert(condition, message, data) {
  if (!condition) {
    const error = new Error(message);
    error.data = data;
    throw error;
  }
}

function ordered(active) {
  return active.slice().sort((a, b) => a - b);
}

function expectedTable(namingSet, players) {
  return (namingSet === 'A' ? EXPECTED_A : EXPECTED_B)[players];
}

function validateRoles(round) {
  const active = ordered(round.activeSeats);
  assert(active.includes(round.roles.btn), 'BTN fuera de mesa activa', round);
  assert(active.includes(round.roles.sb), 'SB fuera de mesa activa', round);
  assert(active.includes(round.roles.bb), 'BB fuera de mesa activa', round);

  if (active.length === 2) {
    assert(round.roles.btn === round.roles.sb, 'HU debe usar BTN como SB', round);
    assert(round.roles.bb !== round.roles.sb, 'HU BB no puede ser BTN/SB', round);
    return;
  }

  assert(round.roles.btn !== round.roles.sb, 'BTN y SB duplicados', round);
  assert(round.roles.sb !== round.roles.bb, 'SB y BB duplicados', round);
  assert(round.roles.btn !== round.roles.bb, 'BTN y BB duplicados', round);
  const btnIdx = active.indexOf(round.roles.btn);
  assert(round.roles.sb === active[(btnIdx + 1) % active.length], 'SB no sigue a BTN', round);
  assert(round.roles.bb === active[(btnIdx + 2) % active.length], 'BB no sigue a SB', round);
}

function validatePositionTables() {
  let cases = 0;
  ['A', 'B'].forEach((namingSet) => {
    for (let players = 2; players <= 10; players++) {
      const active = Engine.activeSeats(players);
      assert(active.length === players, 'activeSeats no coincide con players', { namingSet, players, active });
      assert(new Set(active).size === active.length, 'activeSeats duplicados', { namingSet, players, active });

      active.forEach((btnSeat) => {
        cases += 1;
        const labels = Engine.computeLabels(active, btnSeat, namingSet);
        const pre = Engine.preflopOrder(active, btnSeat);
        const preLabels = pre.map(seat => labels[seat]);
        const expected = expectedTable(namingSet, players);
        const roles = Engine.roles(active, btnSeat);

        assert(JSON.stringify(preLabels) === JSON.stringify(expected),
          'Etiquetas no coinciden con el orden preflop oficial',
          { namingSet, players, active, btnSeat, pre, preLabels, expected });
        assert(labels[roles.bb] === 'BB', 'BB mal etiquetada', { namingSet, players, active, btnSeat, roles, labels });

        if (players === 2) {
          assert(labels[roles.btn] === 'BTN/SB', 'HU BTN/SB mal etiquetado', { namingSet, players, active, btnSeat, roles, labels });
        } else {
          assert(labels[roles.btn] === 'BTN', 'BTN mal etiquetado', { namingSet, players, active, btnSeat, roles, labels });
          assert(labels[roles.sb] === 'SB', 'SB mal etiquetado', { namingSet, players, active, btnSeat, roles, labels });
        }

        if (players >= 4) {
          const coSeat = pre[expected.indexOf('CO')];
          const ring = ordered(active);
          const btnIdx = ring.indexOf(roles.btn);
          const previousToBtn = ring[(btnIdx - 1 + ring.length) % ring.length];
          assert(coSeat === previousToBtn, 'CO no queda justo antes de BTN', {
            namingSet, players, active, btnSeat, roles, labels, coSeat, previousToBtn
          });
        }
      });
    }
  });
  return cases;
}

function validateIpMath(round) {
  if (round.mode !== 'seatIp' && round.mode !== 'ipToSeat') return;
  const post = Engine.postflopOrder(round.activeSeats, round.btnSeat);
  const expectedIp = post.indexOf(round.orSeat) > post.indexOf(round.otherSeat)
    ? round.orSeat
    : round.otherSeat;
  const expectedOop = expectedIp === round.orSeat ? round.otherSeat : round.orSeat;
  assert(round.ipSeat === expectedIp, 'IP no coincide con orden postflop', { round, post, expectedIp });
  assert(round.oopSeat === expectedOop, 'OOP no coincide con orden postflop', { round, post, expectedOop });
}

function validateRound(round) {
  const error = Engine.validateRound(round);
  assert(!error, `Ronda invalida: ${error}`, round);
  assert(new Set(round.activeSeats).size === round.activeSeats.length, 'Asientos activos duplicados', round);
  assert(round.activeSeats.length >= 2 && round.activeSeats.length <= 10, 'Numero de jugadores fuera de rango', round);
  validateRoles(round);
  validateIpMath(round);

  if (round.mode === 'posToSeat') {
    assert(round.answerType === 'seat', 'posToSeat debe responder asiento', round);
    assert(round.targetLabel && round.labels[round.correctSeat] === round.targetLabel,
      'posToSeat no apunta al asiento correcto', round);
  }

  if (round.mode === 'seatToPos') {
    assert(round.answerType === 'position', 'seatToPos debe responder posicion', round);
    assert(round.labels[round.targetSeat] === round.correctLabel,
      'seatToPos no apunta a la posicion correcta', round);
  }

  if (round.mode === 'actionOrder') {
    const order = round.orderStreet === 'postflop'
      ? Engine.postflopOrder(round.activeSeats, round.btnSeat)
      : Engine.preflopOrder(round.activeSeats, round.btnSeat);
    assert(round.answerType === 'seat', 'actionOrder debe responder asiento', round);
    assert(['preflop', 'postflop'].includes(round.orderStreet), 'Calle de orden invalida', round);
    assert(Number.isInteger(round.orderIndex) && round.orderIndex >= 0 && round.orderIndex < order.length,
      'Indice de orden fuera de rango', { round, order });
    assert(round.correctSeat === order[round.orderIndex],
      'actionOrder no respeta la secuencia real de accion', { round, order });
    if (round.orderStreet === 'postflop') {
      assert(round.flop.length === 3, 'Postflop debe generar tres cartas de flop', round);
      assert(new Set(round.flop.map(card => card.code)).size === 3, 'Flop con cartas duplicadas', round);
    } else {
      assert(!round.flop.length, 'Preflop no debe generar flop visible', round);
    }
  }

  if (round.mode === 'seatIp' || round.mode === 'ipToSeat') {
    const live = round.activeSeats.filter(seat => round.actions[seat] && round.actions[seat] !== 'FOLD');
    assert(live.length === 2, 'IP/OOP debe generar exactamente dos jugadores vivos', { round, live });
    assert(live.includes(round.orSeat) && live.includes(round.otherSeat),
      'Los jugadores vivos deben ser OR y rival', { round, live });
    assert(['CALL', '3BET'].includes(round.otherAction), 'Accion del rival invalida', round);
    assert(round.orSeat !== round.otherSeat, 'OR y rival IP/OOP duplicados', round);
    assert(round.activeSeats.includes(round.orSeat), 'OR fuera de mesa', round);
    assert(round.activeSeats.includes(round.otherSeat), 'Rival IP/OOP fuera de mesa', round);
    assert(round.ipSeat !== round.oopSeat, 'IP/OOP duplicados', round);
    assert(round.activeSeats.includes(round.ipSeat), 'IP fuera de mesa', round);
    assert(round.activeSeats.includes(round.oopSeat), 'OOP fuera de mesa', round);

    if (round.mode === 'seatIp') {
      const expected = round.targetSeat === round.ipSeat ? 'IP' : 'OOP';
      assert(round.correctChoice === expected, 'seatIp calcula mal IP/OOP', round);
    } else {
      const expectedSeat = round.correctChoice === 'IP' ? round.ipSeat : round.oopSeat;
      assert(round.correctSeat === expectedSeat, 'ipToSeat calcula mal asiento IP/OOP', round);
    }
  }
}

function validateControls(round) {
  const seatEnabled = round.activeSeats.filter(seat => Engine.seatCanAnswer(round, seat));
  const labelOrder = Engine.canonicalOrder(round.namingSet);
  Engine.activeLabels(round.activeSeats, round.btnSeat, round.namingSet).forEach((label) => {
    if (!labelOrder.includes(label)) labelOrder.push(label);
  });
  const positionEnabled = labelOrder.filter(label => Engine.positionCanAnswer(round, label));
  const ipEnabled = Engine.ipCanAnswer(round);

  if (round.mode === 'posToSeat') {
    assert(seatEnabled.length === round.activeSeats.length, 'posToSeat debe habilitar todos los asientos activos', {
      round, seatEnabled
    });
    assert(!positionEnabled.length, 'posToSeat no debe habilitar botones de posicion', { round, positionEnabled });
    assert(!ipEnabled, 'posToSeat no debe habilitar IP/OOP', round);
  }

  if (round.mode === 'actionOrder') {
    assert(seatEnabled.length === round.activeSeats.length,
      `${round.mode} debe habilitar todos los asientos activos`, { round, seatEnabled });
    assert(!positionEnabled.length, `${round.mode} no debe habilitar posiciones`, { round, positionEnabled });
    assert(!ipEnabled, `${round.mode} no debe habilitar IP/OOP`, round);
  }

  if (round.mode === 'seatToPos') {
    const activeLabels = Engine.activeLabels(round.activeSeats, round.btnSeat, round.namingSet);
    assert(!seatEnabled.length, 'seatToPos no debe habilitar asientos como respuesta', { round, seatEnabled });
    assert(JSON.stringify(positionEnabled.slice().sort()) === JSON.stringify(activeLabels.slice().sort()),
      'seatToPos debe habilitar solo posiciones activas', { round, positionEnabled, activeLabels });
    assert(!ipEnabled, 'seatToPos no debe habilitar IP/OOP', round);
  }

  if (round.mode === 'seatIp') {
    assert(!seatEnabled.length, 'seatIp no debe habilitar asientos como respuesta', { round, seatEnabled });
    assert(!positionEnabled.length, 'seatIp no debe habilitar posiciones', { round, positionEnabled });
    assert(ipEnabled, 'seatIp debe habilitar IP/OOP', round);
  }

  if (round.mode === 'ipToSeat') {
    const live = Engine.liveSeats(round).slice().sort((a, b) => a - b);
    assert(JSON.stringify(seatEnabled.slice().sort((a, b) => a - b)) === JSON.stringify(live),
      'ipToSeat debe habilitar solo los dos jugadores vivos', { round, seatEnabled, live });
    assert(!positionEnabled.length, 'ipToSeat no debe habilitar posiciones', { round, positionEnabled });
    assert(!ipEnabled, 'ipToSeat no debe habilitar botones IP/OOP', round);
  }
}

function wrongSeat(round) {
  return round.activeSeats.find(seat => Engine.seatCanAnswer(round, seat) && seat !== round.correctSeat);
}

function wrongPosition(round) {
  return Engine.activeLabels(round.activeSeats, round.btnSeat, round.namingSet)
    .find(label => label !== round.correctLabel);
}

function validateMixedMode(rng) {
  const seen = new Set();
  for (let index = 0; index < 300; index++) {
    const round = Engine.generateRound({
      players: 2 + Math.floor(rng() * 9),
      namingSet: rng() < 0.5 ? 'A' : 'B',
      mode: Engine.MIXED_MODE
    }, rng);
    assert(round.sourceMode === Engine.MIXED_MODE, 'El origen mixto no queda registrado', round);
    assert(Engine.PRACTICE_MODES.includes(round.mode), 'Mixto genero un modo invalido', round);
    validateRound(round);
    validateControls(round);
    seen.add(round.mode);
  }
  assert(seen.size === Engine.PRACTICE_MODES.length, 'Mixto no recorrio todos los modos', {
    seen: Array.from(seen), expected: Engine.PRACTICE_MODES
  });
}

function validateRandomPlayers(rng) {
  const seen = new Set();
  for (let index = 0; index < 600; index++) {
    const round = Engine.generateRound({
      randomPlayers: true,
      players: 6,
      namingSet: rng() < 0.5 ? 'A' : 'B',
      mode: Engine.PRACTICE_MODES[Math.floor(rng() * Engine.PRACTICE_MODES.length)]
    }, rng);
    validateRound(round);
    validateControls(round);
    seen.add(round.players);
  }
  assert(seen.size === 9, 'Jugadores aleatorios no cubre el rango 2-10', { seen: Array.from(seen) });
}

function validateActionOrderStreets(rng) {
  const streets = new Set();
  for (let index = 0; index < 500; index++) {
    const round = Engine.generateRound({
      players: 2 + Math.floor(rng() * 9),
      namingSet: rng() < 0.5 ? 'A' : 'B',
      mode: 'actionOrder'
    }, rng);
    validateRound(round);
    validateControls(round);
    streets.add(round.orderStreet);
  }
  assert(streets.has('preflop') && streets.has('postflop'),
    'Orden de accion no alterna ambas calles', { streets: Array.from(streets) });
}

function validateRandomPlayersControl() {
  State.state.config.players = 6;
  State.state.config.randomPlayers = false;
  Position.setRandomPlayers(true);
  assert(State.state.config.randomPlayers === true, 'El control de jugadores aleatorios no se activa');
  assert(State.state.round && State.state.round.players >= 2 && State.state.round.players <= 10,
    'El control aleatorio no genera una mesa valida', State.state);
  Position.setRandomPlayers(false);
  assert(State.state.config.randomPlayers === false, 'El control de jugadores aleatorios no se desactiva');
  assert(State.state.round && State.state.round.players === 6,
    'Al desactivar debe recuperar el numero fijo configurado', State.state);
}

function validateTimerControl() {
  State.state.config.timerSec = 14;
  State.state.config.timerEnabled = true;
  Position.nextRound(false);
  assert(State.state.phase === 'question' && State.state.timerRunning,
    'El timer activo debe iniciar una ronda temporizada', State.state);
  assert(State.state.remaining === 14, 'El timer activo debe iniciar con su duracion', State.state);
  assert(activeIntervals.size === 1, 'El timer activo debe crear un unico intervalo', { activeIntervals });

  const current = State.state.round;
  Position.setTimerEnabled(false);
  assert(State.state.round === current && State.state.phase === 'question',
    'Apagar el timer no debe sustituir la ronda actual', State.state);
  assert(State.state.timerRunning === false && State.state.remaining === 0,
    'Apagar el timer debe cancelar el contador y limpiar el tiempo visible', State.state);
  assert(activeIntervals.size === 0, 'Apagar el timer debe liberar su intervalo', { activeIntervals });

  Position.stepTimer(4);
  assert(State.state.config.timerSec === 18 && State.state.remaining === 0,
    'Cambiar la duracion con timer apagado no debe reactivar el contador', State.state);

  Position.setTimerEnabled(true);
  assert(State.state.round === current && State.state.phase === 'question',
    'Encender el timer no debe sustituir la ronda actual', State.state);
  assert(State.state.timerRunning && State.state.remaining === 18,
    'Encender el timer debe iniciar la duracion configurada', State.state);
  assert(activeIntervals.size === 1, 'Reactivar el timer debe crear un unico intervalo', { activeIntervals });

  Position.stop();
  assert(!State.state.timerRunning && State.state.phase === 'idle',
    'Stop debe liberar el timer activo', State.state);
  assert(activeIntervals.size === 0 && activeTimeouts.size === 0,
    'Stop debe liberar los temporizadores pendientes', { activeIntervals, activeTimeouts });
}

function validateAdapterFlow(round, config) {
  Object.assign(State.state.config, config);
  State.state.round = round;
  State.state.phase = 'question';
  State.state.selected = null;
  State.state.feedback = '';
  State.state.remaining = State.state.config.timerSec;

  if (round.answerType === 'seat') {
    const bad = wrongSeat(round);
    assert(Number.isInteger(bad), 'No existe asiento incorrecto para probar', round);
    Position.answerSeat(bad);
    assert(State.state.phase === 'feedback', 'Respuesta de asiento incorrecta debe dejar feedback', {
      round, phase: State.state.phase
    });
    assert(State.state.selected === String(bad), 'Seleccion incorrecta de asiento no queda registrada', {
      round, selected: State.state.selected, bad
    });
    Position.pauseReview();
    assert(State.state.reviewPaused === true, 'Pausa debe congelar la revision de asiento', {
      round, state: State.state
    });
    Position.resumeReview();
    assert(State.state.reviewPaused === false, 'Continuar debe rearmar la revision de asiento', {
      round, state: State.state
    });
    Position.repeatRound();
    assert(State.state.round === round && State.state.phase === 'question' && State.state.selected == null,
      'Repetir debe conservar la ronda y limpiar seleccion', { round, state: State.state });
    Position.answerSeat(round.correctSeat);
    assert(State.state.phase === 'question' && State.state.round !== round,
      'Respuesta de asiento correcta debe avanzar a nueva ronda', { round, state: State.state });
  }

  if (round.answerType === 'position') {
    const bad = wrongPosition(round);
    assert(bad, 'No existe posicion incorrecta para probar', round);
    Position.answerPosition(bad);
    assert(State.state.phase === 'feedback', 'Respuesta de posicion incorrecta debe dejar feedback', {
      round, phase: State.state.phase
    });
    Position.skipReview();
    assert(State.state.phase === 'question' && State.state.round !== round,
      'Siguiente desde revision de posicion debe saltar a nueva ronda', { round, state: State.state });
    State.state.round = round;
    State.state.phase = 'question';
    State.state.selected = null;
    State.state.feedback = '';
    State.state.remaining = State.state.config.timerSec;
    Position.answerPosition(bad);
    Position.repeatRound();
    assert(State.state.round === round && State.state.phase === 'question',
      'Repetir posicion debe conservar la ronda', { round, state: State.state });
    Position.answerPosition(round.correctLabel);
    assert(State.state.phase === 'question' && State.state.round !== round,
      'Respuesta de posicion correcta debe avanzar a nueva ronda', { round, state: State.state });
  }

  if (round.answerType === 'ip') {
    const bad = round.correctChoice === 'IP' ? 'OOP' : 'IP';
    Position.answerIp(bad);
    assert(State.state.phase === 'feedback', 'Respuesta IP/OOP incorrecta debe dejar feedback', {
      round, phase: State.state.phase
    });
    Position.repeatRound();
    assert(State.state.round === round && State.state.phase === 'question',
      'Repetir IP/OOP debe conservar la ronda', { round, state: State.state });
    Position.answerIp(round.correctChoice);
    assert(State.state.phase === 'question' && State.state.round !== round,
      'Respuesta IP/OOP correcta debe avanzar a nueva ronda', { round, state: State.state });
  }
}

function run(iterations = 5000) {
  const rng = createRng(0x51a7e);
  const modes = Engine.MODES;
  const namingSets = ['A', 'B'];

  const tableCases = validatePositionTables();
  validateMixedMode(rng);
  validateRandomPlayers(rng);
  validateActionOrderStreets(rng);
  validateRandomPlayersControl();
  validateTimerControl();

  for (let i = 0; i < iterations; i++) {
    const config = {
      players: 2 + Math.floor(rng() * 9),
      randomPlayers: rng() < 0.5,
      namingSet: namingSets[Math.floor(rng() * namingSets.length)],
      mode: modes[Math.floor(rng() * modes.length)]
    };
    const round = Engine.generateRound(config, rng);
    try {
      validateRound(round);
      validateControls(round);
      assert(round.sourceMode === config.mode, 'El modo fuente no coincide con la configuracion', { config, round });
      validateAdapterFlow(round, config);
    } catch (error) {
      console.error(JSON.stringify({ iteration: i + 1, config, round, message: error.message }, null, 2));
      process.exit(1);
    }
  }

  Position.stop();
  assert(activeIntervals.size === 0 && activeTimeouts.size === 0,
    'La bateria no debe dejar temporizadores huerfanos', { activeIntervals, activeTimeouts });

  console.log(JSON.stringify({ ok: true, tableCases, iterations }, null, 2));
}

run(Number(process.argv[2]) || 5000);
