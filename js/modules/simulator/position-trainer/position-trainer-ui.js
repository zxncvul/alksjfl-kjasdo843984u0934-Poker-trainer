'use strict';

(function (RT) {
  const Position = RT.SimulatorPosition;
  const Engine = RT.SimulatorPositionEngine;
  const MODE_CARDS = [
    ['posToSeat', 'Posicion -> Asiento', 'Localiza la posicion indicada y pulsa su asiento.'],
    ['seatToPos', 'Asiento -> Posicion', 'Lee el asiento marcado y elige su posicion.'],
    ['actionOrder', 'Orden de accion', 'Di quien habla 1, 2, 3... preflop o postflop.'],
    ['seatIp', 'Asiento -> IP/OOP', 'Con la accion visible, decide si actua IP u OOP.'],
    ['ipToSeat', 'IP/OOP -> Asiento', 'Encuentra el asiento que queda IP u OOP.'],
    ['mixed', 'Mixto', 'Cada ronda cambia de ejercicio automaticamente.']
  ];

  function renderPanel(panel, H, tabs) {
    const s = Position.state;
    if (tabs) panel.appendChild(tabs);

    const cfg = H.el('section', 'workspace-card');
    cfg.classList.add('position-config');
    cfg.appendChild(H.el('h2', 'sim-config-title', 'Position Trainer'));
    const controls = H.el('div', 'position-config-controls');
    controls.appendChild(stepper(H, 'Jugadores fijos', s.config.players,
      () => Position.stepPlayers(-1), () => Position.stepPlayers(1), s.config.randomPlayers));
    controls.appendChild(toggleControl(H, 'Por ronda', 'Aleatorio', s.config.randomPlayers,
      () => Position.setRandomPlayers(!s.config.randomPlayers)));
    controls.appendChild(timerControl(H, s));
    cfg.appendChild(controls);
    cfg.appendChild(H.selectGroup('Nomenclatura', [
      { id: 'B', label: 'B - LJ / HJ' },
      { id: 'A', label: 'A - MP / MP+1' }
    ], s.config.namingSet, value => Position.setNamingSet(value)));
    cfg.appendChild(H.group('Ronda', [
      H.button('Nueva ronda', { variant: 'btn-primary', onClick: () => Position.nextRound() }),
      H.button('Reset stats', { variant: 'btn-ghost', onClick: () => Position.resetStats() })
    ]));
    panel.appendChild(cfg);
  }

  function stepper(H, label, value, dec, inc, disabled = false) {
    const wrap = H.el('div', 'position-control-row position-stepper');
    wrap.appendChild(H.el('span', 'position-control-label', label));
    const inputs = H.el('div', 'position-control-inputs');
    inputs.appendChild(H.button('-', { disabled, onClick: disabled ? null : dec }));
    inputs.appendChild(H.el('strong', 'position-control-value', String(value)));
    inputs.appendChild(H.button('+', { disabled, onClick: disabled ? null : inc }));
    wrap.appendChild(inputs);
    return wrap;
  }

  function toggleControl(H, label, value, active, onClick) {
    const wrap = H.el('div', 'position-control-row');
    wrap.appendChild(H.el('span', 'position-control-label', label));
    const button = H.button(value, { active, onClick });
    button.classList.add('position-control-toggle');
    button.setAttribute('aria-pressed', String(active));
    wrap.appendChild(button);
    return wrap;
  }

  function timerControl(H, state) {
    const wrap = H.el('div', 'position-control-row position-timer-control');
    wrap.appendChild(H.el('span', 'position-control-label', 'Timer'));
    const inputs = H.el('div', 'position-control-inputs');
    const toggle = H.button(state.config.timerEnabled === false ? 'OFF' : 'ON', {
      active: state.config.timerEnabled !== false,
      onClick: () => Position.setTimerEnabled(state.config.timerEnabled === false)
    });
    toggle.classList.add('position-timer-toggle');
    toggle.setAttribute('aria-pressed', String(state.config.timerEnabled !== false));
    inputs.appendChild(toggle);
    inputs.appendChild(H.button('-', { onClick: () => Position.stepTimer(-1) }));
    inputs.appendChild(H.el('strong', 'position-control-value', `${state.config.timerSec}s`));
    inputs.appendChild(H.button('+', { onClick: () => Position.stepTimer(1) }));
    wrap.appendChild(inputs);
    return wrap;
  }

  function modeHelp(mode) {
    return {
      posToSeat: 'Pregunta una posicion y respondes pulsando el asiento correcto.',
      seatToPos: 'Marca un asiento y respondes con el boton de posicion.',
      seatIp: 'Marca un asiento dentro de una accion preflop y respondes IP u OOP.',
      ipToSeat: 'Pregunta IP u OOP y respondes pulsando el asiento correcto.',
      actionOrder: 'Indica quien habla en el puesto preguntado de la secuencia.',
      mixed: 'Alterna de forma aleatoria todos los ejercicios disponibles.'
    }[mode] || '';
  }

  function renderStage(stage, H) {
    Position.ensureRound();
    const s = Position.state;
    const round = s.round;
    stage.innerHTML = '';
    const wrap = H.el('div', 'sim-play position-trainer-play');
    const dash = H.el('div', 'sim-dash');
    const main = H.el('div', 'sim-main position-main');
    main.appendChild(renderTable(H, round));
    main.appendChild(renderAnswerZone(H, s));
    dash.appendChild(main);
    wrap.appendChild(dash);
    stage.appendChild(wrap);
  }

  function renderTable(H, round) {
    const table = H.el('div', 'sim-table position-table is-fixed' +
      (round.activeSeats.length > 6 ? ' is-tenmax' : '') +
      (round.activeSeats.length === 2 ? ' is-headsup' : ''));
    const felt = H.el('div', 'sim-felt position-felt');
    const center = H.el('div', 'sim-center position-center');
    center.appendChild(H.el('div', 'position-question', questionText(round)));
    center.appendChild(H.el('div', 'position-countdown', countdownText(Position.state)));
    center.appendChild(H.el('div', 'position-board-label', boardLabel(round)));
    center.appendChild(renderBoard(H, round));
    felt.appendChild(center);

    round.activeSeats.forEach((seat, index) => {
      const point = seatPoint(index, round.activeSeats.length);
      felt.appendChild(renderSeat(H, round, seat, index, point));
    });
    table.appendChild(felt);
    return table;
  }

  function seatPoint(index, total) {
    const layouts = sideLayouts(total);
    const points = []
      .concat(sidePoints(layouts.top, 'top'))
      .concat(sidePoints(layouts.right, 'right'))
      .concat(sidePoints(layouts.bottom, 'bottom'))
      .concat(sidePoints(layouts.left, 'left'));
    if (points[index]) return points[index];
    return { x: 50, y: 50, edge: 'center' };
  }

  function sideLayouts(total) {
    if (total === 2) return { top: 0, right: 1, bottom: 0, left: 1 };
    const counts = { top: 0, right: 0, bottom: 0, left: 0 };
    const max = { top: 3, right: 2, bottom: 3, left: 2 };
    const order = ['top', 'bottom', 'right', 'left'];
    while (counts.top + counts.right + counts.bottom + counts.left < total) {
      for (const side of order) {
        if (counts.top + counts.right + counts.bottom + counts.left >= total) break;
        if (counts[side] < max[side]) counts[side] += 1;
      }
    }
    return counts;
  }

  function sidePoints(count, side) {
    if (!count) return [];
    const values = spread(count, side === 'top' || side === 'bottom' ? 28 : 30,
      side === 'top' || side === 'bottom' ? 72 : 70);
    if (side === 'top') return values.map(x => ({ x, y: 1, edge: 'top' }));
    if (side === 'right') return values.map(y => ({ x: 98, y, edge: 'right' }));
    if (side === 'bottom') return values.slice().reverse().map(x => ({ x, y: 99, edge: 'bottom' }));
    return values.slice().reverse().map(y => ({ x: 2, y, edge: 'left' }));
  }

  function spread(count, min, max) {
    if (count === 1) return [(min + max) / 2];
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, index) => min + step * index);
  }

  function questionText(round) {
    if (!round) return '';
    if (round.mode === 'posToSeat') return `\u00BF${round.targetLabel}?`;
    if (round.mode === 'seatToPos') return '\u00BFPosicion?';
    if (round.mode === 'seatIp') return '\u00BFIP u OOP?';
    if (round.mode === 'ipToSeat') return `\u00BF${round.correctChoice}?`;
    if (round.mode === 'actionOrder') return `\u00BFQuien habla ${round.orderIndex + 1}\u00BA?`;
    return round.prompt || '';
  }

  function countdownText(state) {
    if (!state || state.phase !== 'question' || state.config.timerEnabled === false) return '';
    return `${Math.max(0, Math.ceil(Number(state.remaining) || 0))}s`;
  }

  function boardLabel(round) {
    return round && round.mode === 'actionOrder' && round.orderStreet === 'postflop'
      ? 'Flop'
      : 'Board';
  }

  function renderBoard(H, round) {
    const board = H.el('div', 'sim-board position-board');
    const flop = round && round.mode === 'actionOrder' && round.orderStreet === 'postflop'
      ? round.flop || []
      : [];
    board.setAttribute('aria-label', flop.length ? 'Flop visible de tres cartas' : 'Board oculto de tres cartas');
    if (flop.length) {
      flop.forEach(card => board.appendChild(renderFlopCard(H, card)));
      return board;
    }
    for (let index = 0; index < 3; index++) {
      board.appendChild(H.el('span', 'sim-board-card'));
    }
    return board;
  }

  function renderFlopCard(H, card) {
    const red = card.suit === 'h' || card.suit === 'd';
    const labels = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
    const el = H.el('span', 'sim-card sim-duel-card ' + (red ? 'is-red' : 'is-dark-suit'),
      `${card.rank}${labels[card.suit] || ''}`);
    el.title = card.code;
    return el;
  }

  function hiddenCards(H) {
    const cards = H.el('div', 'sim-hole-cards seat-cards position-seat-cards');
    cards.setAttribute('aria-label', 'Dos cartas ocultas');
    cards.appendChild(H.el('span', 'sim-card-back'));
    cards.appendChild(H.el('span', 'sim-card-back'));
    return cards;
  }

  function renderSeat(H, round, seatIndex, slotIndex, point) {
    const active = round.activeSeats.includes(seatIndex);
    const label = round.labels[seatIndex] || '';
    const isTarget = round.targetSeat === seatIndex;
    const isCorrect = Position.state.phase === 'feedback' && round.correctSeat === seatIndex;
    const isSelected = Position.state.selected === String(seatIndex);
    const canAnswer = Position.state.phase === 'question' && Engine.seatCanAnswer(round, seatIndex);
    const action = round.actions[seatIndex] || '';
    const seat = H.el('button', `sim-seat position-seat sim-seat-slot-${slotIndex} position-seat-edge-${point.edge}` +
      (active ? ' is-active' : ' is-inactive') +
      (canAnswer ? ' is-answerable' : ' is-visual-only') +
      (isTarget ? ' is-target' : '') +
      (isCorrect ? ' is-correct' : '') +
      (isSelected && !isCorrect ? ' is-error' : '') +
      (action === 'FOLD' ? ' is-folded' : ''));
    seat.type = 'button';
    seat.style.setProperty('--position-seat-left', `${point.x}%`);
    seat.style.setProperty('--position-seat-top', `${point.y}%`);
    seat.disabled = !canAnswer;
    seat.dataset.help = canAnswer
      ? 'Pulsa este asiento para responder.'
      : active
      ? `Asiento ${seatIndex + 1}${label ? ` - ${label}` : ''}.`
      : 'Asiento inactivo con el numero actual de jugadores.';
    if (canAnswer) seat.addEventListener('click', () => Position.answerSeat(seatIndex));

    const head = H.el('div', 'sim-seat-head');
    head.appendChild(H.el('span', 'sim-seat-pos', '--'));
    seat.appendChild(head);
    seat.appendChild(H.el('div', 'sim-seat-stack', '-- bb'));
    seat.appendChild(hiddenCards(H));
    seat.appendChild(H.el('div', 'position-seat-dot', active && isTarget ? '?' : ''));
    if (action && active && (round.mode === 'seatIp' || round.mode === 'ipToSeat')) {
      seat.appendChild(H.el('div', 'sim-seat-action ' + (action === 'OR' || action === '3BET' ? 'has-accent' : ''),
        action === 'FOLD' ? 'Fold' : action));
    } else {
      seat.appendChild(H.el('div', 'sim-seat-action', '--'));
    }
    if (seatIndex === round.roles.btn) seat.appendChild(H.el('span', 'sim-seat-marker is-dealer', 'D'));
    if (seatIndex === round.roles.sb) seat.appendChild(blindMarker(H, 'SB'));
    if (seatIndex === round.roles.bb) seat.appendChild(blindMarker(H, 'BB'));
    return seat;
  }

  function blindMarker(H, type) {
    const marker = H.el('span', `sim-seat-marker is-blind is-${type.toLowerCase()}`);
    marker.setAttribute('aria-label', type === 'SB' ? 'Ciega pequena' : 'Ciega grande');
    const count = type === 'SB' ? 1 : 2;
    for (let i = 0; i < count; i++) marker.appendChild(H.el('span', 'sim-blind-chip'));
    return marker;
  }

  function renderAnswerZone(H, s) {
    const zone = H.el('div', 'sim-zone position-zone');
    if (s.phase === 'question' && s.round.answerType === 'position') {
      zone.appendChild(renderPositionButtons(H, false));
    } else if (s.phase === 'question' && s.round.answerType === 'ip') {
      const row = H.el('div', 'position-answer-row');
      row.appendChild(H.button('IP', { variant: 'btn-decision', key: 'I', onClick: () => Position.answerIp('IP') }));
      row.appendChild(H.button('OOP', { variant: 'btn-decision', key: 'O', onClick: () => Position.answerIp('OOP') }));
      zone.appendChild(row);
    }

    if (s.phase === 'feedback') {
      const result = H.el('div', 'position-feedback is-error');
      result.appendChild(H.el('strong', '', s.feedback || 'Incorrecto.'));
      result.appendChild(H.el('span', '', feedbackHelp(s.round)));
      const controls = H.el('div', 'position-feedback-controls');
      const seconds = Math.max(0, Math.ceil((s.reviewRemaining || 0) / 1000));
      controls.appendChild(H.el('span', 'position-feedback-timer',
        s.reviewPaused ? 'Pausado' : `Siguiente en ${seconds}s`));
      controls.appendChild(H.button(s.reviewPaused ? 'Continuar' : 'Pausa', {
        variant: 'btn-ghost',
        onClick: () => s.reviewPaused ? Position.resumeReview() : Position.pauseReview()
      }));
      controls.appendChild(H.button('Repetir', { variant: 'btn-ghost', key: 'R', onClick: () => Position.repeatRound() }));
      controls.appendChild(H.button('Siguiente', { variant: 'btn-primary', key: 'N', onClick: () => Position.skipReview() }));
      result.appendChild(controls);
      zone.appendChild(result);
    }
    return zone;
  }

  function feedbackHelp(round) {
    if (!round) return 'Pulsa Siguiente para continuar.';
    if (round.answerType === 'seat') return `Asiento correcto: ${round.labels[round.correctSeat] || `asiento ${round.correctSeat + 1}`}.`;
    if (round.answerType === 'position') return `Posicion correcta: ${round.correctLabel}.`;
    if (round.answerType === 'ip') return `Respuesta correcta: ${round.correctChoice}.`;
    return 'Pulsa Siguiente para continuar.';
  }

  function renderPositionButtons(H, readonly) {
    Position.ensureRound();
    const round = Position.state.round;
    const active = new Set(Engine.activeLabels(round.activeSeats, round.btnSeat, round.namingSet));
    const wrap = H.el('div', 'position-pos-buttons');
    const order = Engine.canonicalOrder(Position.state.config.namingSet).filter(label => active.has(label));
    active.forEach((label) => {
      if (!order.includes(label)) order.push(label);
    });
    order.forEach((label) => {
      const canAnswer = !readonly && Position.state.phase === 'question' &&
        Engine.positionCanAnswer(round, label);
      const b = H.button(label, {
        active: Position.state.selected === label,
        disabled: !readonly && !canAnswer,
        onClick: canAnswer ? () => Position.answerPosition(label) : null,
        help: canAnswer ? `Responder ${label}.` : `${label} esta activa en esta mesa.`
      });
      b.classList.add('position-pos-btn');
      wrap.appendChild(b);
    });
    return wrap;
  }

  function renderInsights(aside, H) {
    const s = Position.state;
    aside.appendChild(H.dashPanel('Position Trainer', (body) => {
      if (s.round) {
        body.appendChild(H.statLine('Estado', s.phase));
        body.appendChild(H.statLine('Modo', modeLabel(s.round)));
        body.appendChild(H.statLine('Jugadores', s.round.players));
        body.appendChild(H.statLine('BTN/SB/BB', roleText(s.round)));
      }
    }));
    aside.appendChild(H.dashPanel('Posiciones activas', (body) => {
      body.appendChild(renderPositionButtons(H, true));
    }));
    aside.appendChild(H.dashPanel('Estadisticas', (body) => {
      body.appendChild(H.statLine('Rondas', s.stats.rounds));
      body.appendChild(H.statLine('Aciertos', s.stats.correct));
      body.appendChild(H.statLine('Errores', s.stats.wrong));
      body.appendChild(H.statLine('Precision', `${Position.precision()}%`));
      body.appendChild(H.statLine('Racha', s.stats.currentStreak));
      body.appendChild(H.statLine('Mejor', s.stats.bestStreak));
    }));
  }

  function roleText(round) {
    return `D ${round.labels[round.roles.btn] || 'BTN'} | SB ${round.labels[round.roles.sb] || 'SB'} | BB ${round.labels[round.roles.bb] || 'BB'}`;
  }

  function modeLabel(round) {
    const active = Engine.MODE_LABELS[round.mode] || round.mode;
    return round.sourceMode === Engine.MIXED_MODE ? `Mixto: ${active}` : active;
  }

  function renderGallery(root, H) {
    if (!root) return;
    root.innerHTML = '';
    root.hidden = false;
    root.classList.remove('sim-duel-preset-gallery');
    root.classList.add('position-gallery');
    const head = H.el('div', 'range-gallery-head');
    const heading = H.el('div', 'range-gallery-heading');
    heading.appendChild(H.el('span', 'range-gallery-kicker', 'Ejercicios Position Trainer'));
    heading.appendChild(H.el('span', 'range-gallery-count', `${MODE_CARDS.length} modos`));
    head.appendChild(heading);
    root.appendChild(head);
    const track = H.el('div', 'range-gallery-track');
    MODE_CARDS.forEach(([id, title, desc]) => {
      const card = H.el('button', 'range-card position-mode-card' + (Position.state.config.mode === id ? ' is-active' : ''));
      card.type = 'button';
      card.dataset.help = modeHelp(id);
      card.addEventListener('click', () => Position.setMode(id));
      card.appendChild(H.el('strong', 'range-card-title', title));
      card.appendChild(H.el('span', 'sim-duel-preset-description', desc));
      card.appendChild(H.el('span', 'sim-duel-preset-summary', gallerySummary(Position.state.config)));
      track.appendChild(card);
    });
    root.appendChild(track);
  }

  function gallerySummary(config) {
    const players = config.randomPlayers ? '2-10 jugadores' : `${config.players} jugadores`;
    const timer = config.timerEnabled === false ? 'Sin timer' : `${config.timerSec}s`;
    return `${players} - ${timer}`;
  }

  function actionBarItems(H) {
    const s = Position.state;
    const items = [];
    if (!s.round) return items;
    if (s.phase === 'question' && s.round.answerType === 'ip') {
      items.push(H.button('IP', { key: 'I', onClick: () => Position.answerIp('IP') }));
      items.push(H.button('OOP', { key: 'O', onClick: () => Position.answerIp('OOP') }));
    }
    if (s.phase === 'feedback') {
      items.push(H.button('Repetir', { key: 'R', onClick: () => Position.repeatRound() }));
      items.push(H.button('Siguiente', { variant: 'btn-primary', key: 'N', onClick: () => Position.nextRound() }));
    }
    return items;
  }

  function handleKey(key) {
    return Position.handleKey(key);
  }

  RT.SimulatorPositionUI = {
    renderPanel,
    renderStage,
    renderInsights,
    renderGallery,
    actionBarItems,
    handleKey
  };
})(window.RT);
