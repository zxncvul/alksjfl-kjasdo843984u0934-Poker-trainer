'use strict';

(function (RT) {
  const SEAT_COUNT = 10;
  const PRACTICE_MODES = [
    'posToSeat',
    'seatToPos',
    'seatIp',
    'ipToSeat',
    'actionOrder'
  ];
  const MIXED_MODE = 'mixed';
  const MODES = PRACTICE_MODES.concat(MIXED_MODE);
  const MODE_LABELS = {
    posToSeat: 'Posicion -> Asiento',
    seatToPos: 'Asiento -> Posicion',
    seatIp: 'Asiento -> IP/OOP',
    ipToSeat: 'IP/OOP -> Asiento',
    actionOrder: 'Orden de accion',
    mixed: 'Mixto'
  };
  const ORDER_A = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'];
  const ORDER_B = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const CARD_SUITS = ['s', 'h', 'd', 'c'];
  const POSITION_TABLE_A = {
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
  const POSITION_TABLE_B = {
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

  function clampPlayers(players) {
    return Math.max(2, Math.min(10, Number(players) || 6));
  }

  function activeSeats(players) {
    const n = clampPlayers(players);
    return Array.from({ length: n }, (_, index) => index);
  }

  function positionTable(players, namingSet = 'B') {
    const table = namingSet === 'A' ? POSITION_TABLE_A : POSITION_TABLE_B;
    return (table[clampPlayers(players)] || table[6]).slice();
  }

  function randInt(a, b, rng = Math.random) {
    return Math.floor(rng() * (b - a + 1)) + a;
  }

  function choose(items, rng = Math.random) {
    return items[randInt(0, items.length - 1, rng)];
  }

  function randomFlop(rng = Math.random) {
    const deck = [];
    CARD_RANKS.forEach((rank) => CARD_SUITS.forEach((suit) => {
      deck.push({ rank, suit, code: rank + suit });
    }));
    for (let index = deck.length - 1; index > 0; index--) {
      const swap = randInt(0, index, rng);
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }
    return deck.slice(0, 3);
  }

  function rotateFrom(items, first) {
    const idx = items.indexOf(first);
    if (idx < 0) return items.slice();
    return items.slice(idx).concat(items.slice(0, idx));
  }

  function roles(active, btnSeat) {
    const seats = active.slice().sort((a, b) => a - b);
    const btn = seats.includes(btnSeat) ? btnSeat : seats[0];
    if (seats.length === 2) {
      return { btn, sb: btn, bb: seats.find(seat => seat !== btn) };
    }
    const btnIdx = seats.indexOf(btn);
    return {
      btn,
      sb: seats[(btnIdx + 1) % seats.length],
      bb: seats[(btnIdx + 2) % seats.length]
    };
  }

  function computeLabels(active, btnSeat, namingSet = 'B') {
    const labels = Array(SEAT_COUNT).fill('');
    const seats = active.slice().sort((a, b) => a - b);
    if (!seats.length) return labels;
    const r = roles(seats, btnSeat);
    const table = positionTable(seats.length, namingSet);
    const pre = preflopOrder(seats, r.btn);
    pre.forEach((seat, index) => {
      labels[seat] = table[index] || '';
    });
    return labels;
  }

  function canonicalOrder(namingSet = 'B') {
    return namingSet === 'A' ? ORDER_A.slice() : ORDER_B.slice();
  }

  function activeLabels(active, btnSeat, namingSet = 'B') {
    return computeLabels(active, btnSeat, namingSet).filter(Boolean);
  }

  function preflopOrder(active, btnSeat) {
    const seats = active.slice().sort((a, b) => a - b);
    if (seats.length <= 1) return seats;
    const r = roles(seats, btnSeat);
    if (seats.length === 2) return [r.sb, r.bb];
    const bbIdx = seats.indexOf(r.bb);
    return rotateFrom(seats, seats[(bbIdx + 1) % seats.length]);
  }

  function postflopOrder(active, btnSeat) {
    const seats = active.slice().sort((a, b) => a - b);
    if (seats.length <= 1) return seats;
    const r = roles(seats, btnSeat);
    if (seats.length === 2) return [r.bb, r.btn];
    const btnIdx = seats.indexOf(r.btn);
    return rotateFrom(seats, seats[(btnIdx + 1) % seats.length]);
  }

  function generateActions(active, btnSeat, rng = Math.random) {
    const actions = Array(SEAT_COUNT).fill('');
    const order = preflopOrder(active, btnSeat);
    if (order.length < 2) return { actions, orSeat: null, otherSeat: null, otherAction: '' };
    const candidates = order.length > 3 ? order.slice(0, -2) : order.slice(0, 1);
    const orSeat = choose(candidates, rng);
    const after = order.slice(order.indexOf(orSeat) + 1);
    const otherSeat = choose(after.length ? after : order.filter(seat => seat !== orSeat), rng);
    const otherAction = rng() < 0.34 ? '3BET' : 'CALL';
    actions[orSeat] = 'OR';
    actions[otherSeat] = otherAction;
    active.forEach((seat) => {
      if (!actions[seat]) actions[seat] = 'FOLD';
    });
    return { actions, orSeat, otherSeat, otherAction };
  }

  function liveSeats(round) {
    if (!round || (round.mode !== 'seatIp' && round.mode !== 'ipToSeat')) return [];
    return [round.orSeat, round.otherSeat].filter(seat => Number.isInteger(seat));
  }

  function seatCanAnswer(round, seat) {
    if (!round || round.answerType !== 'seat') return false;
    if (!round.activeSeats.includes(seat)) return false;
    if (round.mode === 'ipToSeat') return liveSeats(round).includes(seat);
    return ['posToSeat', 'actionOrder'].includes(round.mode);
  }

  function positionCanAnswer(round, label) {
    if (!round || round.answerType !== 'position') return false;
    return activeLabels(round.activeSeats, round.btnSeat, round.namingSet).includes(label);
  }

  function ipCanAnswer(round) {
    return !!round && round.answerType === 'ip';
  }

  function ipStatus(active, btnSeat, aSeat, bSeat) {
    const order = postflopOrder(active, btnSeat);
    const ia = order.indexOf(aSeat);
    const ib = order.indexOf(bSeat);
    if (ia < 0 || ib < 0 || ia === ib) return null;
    return { ipSeat: ia > ib ? aSeat : bSeat, oopSeat: ia > ib ? bSeat : aSeat };
  }

  function modeCopy(mode) {
    return {
      posToSeat: 'Lee la posicion preguntada y pulsa el asiento correcto.',
      seatToPos: 'Se marca un asiento. Elige que posicion ocupa.',
      seatIp: 'Se marca un asiento dentro de una accion preflop. Decide IP u OOP.',
      ipToSeat: 'Busca que jugador queda IP u OOP despues de la accion preflop.',
      actionOrder: 'Pregunta por una posicion aleatoria de la secuencia preflop o postflop.'
    }[mode] || '';
  }

  function generateRound(config = {}, rng = Math.random) {
    const players = config.randomPlayers === true
      ? randInt(2, SEAT_COUNT, rng)
      : clampPlayers(config.players);
    const namingSet = config.namingSet === 'A' ? 'A' : 'B';
    const requestedMode = MODES.includes(config.mode) ? config.mode : 'posToSeat';
    const mode = requestedMode === MIXED_MODE ? choose(PRACTICE_MODES, rng) : requestedMode;
    const active = activeSeats(players);
    const btnSeat = active.includes(config.btnSeat) && config.keepButton
      ? config.btnSeat
      : choose(active, rng);
    const labels = computeLabels(active, btnSeat, namingSet);
    const r = roles(active, btnSeat);
    const labelSet = Array.from(new Set(labels.filter(Boolean)));
    const round = {
      mode,
      sourceMode: requestedMode,
      players,
      namingSet,
      activeSeats: active,
      btnSeat,
      roles: r,
      labels,
      actions: Array(SEAT_COUNT).fill(''),
      prompt: '',
      detail: modeCopy(mode),
      targetSeat: null,
      targetLabel: '',
      answerType: 'seat',
      correctSeat: null,
      correctLabel: '',
      correctChoice: '',
      ipSeat: null,
      oopSeat: null,
      orSeat: null,
      otherSeat: null,
      otherAction: '',
      orderStreet: '',
      orderIndex: null,
      flop: []
    };

    if (mode === 'posToSeat') {
      const targetLabel = choose(labelSet, rng);
      round.targetLabel = targetLabel;
      round.correctSeat = labels.indexOf(targetLabel);
      round.prompt = `Donde esta ${targetLabel}?`;
      round.answerType = 'seat';
      return round;
    }

    if (mode === 'seatToPos') {
      const targetSeat = choose(active, rng);
      round.targetSeat = targetSeat;
      round.correctLabel = labels[targetSeat];
      round.prompt = `Que posicion ocupa el asiento marcado?`;
      round.answerType = 'position';
      return round;
    }

    if (mode === 'actionOrder') {
      round.orderStreet = rng() < 0.5 ? 'preflop' : 'postflop';
      const order = round.orderStreet === 'preflop'
        ? preflopOrder(active, btnSeat)
        : postflopOrder(active, btnSeat);
      round.orderIndex = randInt(0, order.length - 1, rng);
      round.correctSeat = order[round.orderIndex];
      round.flop = round.orderStreet === 'postflop' ? randomFlop(rng) : [];
      round.prompt = `${round.orderIndex + 1}. en hablar`;
      round.answerType = 'seat';
      return round;
    }

    const actionInfo = generateActions(active, btnSeat, rng);
    Object.assign(round, actionInfo);
    const ip = ipStatus(active, btnSeat, actionInfo.orSeat, actionInfo.otherSeat);
    round.ipSeat = ip ? ip.ipSeat : null;
    round.oopSeat = ip ? ip.oopSeat : null;

    if (mode === 'seatIp') {
      const targetSeat = choose([actionInfo.orSeat, actionInfo.otherSeat], rng);
      round.targetSeat = targetSeat;
      round.correctChoice = targetSeat === round.ipSeat ? 'IP' : 'OOP';
      round.prompt = `${labels[targetSeat] || 'Asiento'} esta IP u OOP?`;
      round.answerType = 'ip';
      return round;
    }

    const ask = rng() < 0.5 ? 'IP' : 'OOP';
    round.correctChoice = ask;
    round.correctSeat = ask === 'IP' ? round.ipSeat : round.oopSeat;
    round.prompt = `Quien esta ${ask}?`;
    round.answerType = 'seat';
    return round;
  }

  function validateRound(round) {
    if (!round || !PRACTICE_MODES.includes(round.mode)) return 'Modo invalido';
    if (round.sourceMode && !MODES.includes(round.sourceMode)) return 'Modo fuente invalido';
    const active = round.activeSeats || [];
    if (active.length < 2 || active.length > 10) return 'Numero de jugadores invalido';
    if (new Set(active).size !== active.length) return 'Asientos activos duplicados';
    if (!active.includes(round.roles.btn) || !active.includes(round.roles.sb) || !active.includes(round.roles.bb)) {
      return 'BTN/SB/BB fuera de asientos activos';
    }
    if (round.mode === 'seatIp' || round.mode === 'ipToSeat') {
      if (!active.includes(round.orSeat) || !active.includes(round.otherSeat) || round.orSeat === round.otherSeat) {
        return 'Accion IP/OOP invalida';
      }
      if (!active.includes(round.ipSeat) || !active.includes(round.oopSeat) || round.ipSeat === round.oopSeat) {
        return 'IP/OOP invalido';
      }
    }
    if (round.mode === 'actionOrder') {
      const order = round.orderStreet === 'postflop'
        ? postflopOrder(active, round.btnSeat)
        : preflopOrder(active, round.btnSeat);
      if (!['preflop', 'postflop'].includes(round.orderStreet)) return 'Calle de orden invalida';
      if (!Number.isInteger(round.orderIndex) || round.orderIndex < 0 || round.orderIndex >= order.length) {
        return 'Indice de orden invalido';
      }
      if (round.correctSeat !== order[round.orderIndex]) return 'Respuesta de orden invalida';
      if (round.orderStreet === 'postflop') {
        if (!Array.isArray(round.flop) || round.flop.length !== 3) return 'Flop invalido';
        const codes = round.flop.map(card => card && card.code);
        if (codes.some(code => !code) || new Set(codes).size !== 3) return 'Flop duplicado';
      }
    }
    if (round.answerType === 'seat' && !active.includes(round.correctSeat)) return 'Respuesta de asiento inexistente';
    if (round.answerType === 'position' && !round.correctLabel) return 'Respuesta de posicion inexistente';
    if (round.answerType === 'ip' && !['IP', 'OOP'].includes(round.correctChoice)) return 'Respuesta IP/OOP inexistente';
    return '';
  }

  RT.SimulatorPositionEngine = {
    SEAT_COUNT,
    MODES,
    PRACTICE_MODES,
    MIXED_MODE,
    MODE_LABELS,
    canonicalOrder,
    positionTable,
    activeSeats,
    roles,
    computeLabels,
    activeLabels,
    randomFlop,
    preflopOrder,
    postflopOrder,
    generateActions,
    ipStatus,
    liveSeats,
    seatCanAnswer,
    positionCanAnswer,
    ipCanAnswer,
    generateRound,
    validateRound
  };
})(window.RT);
