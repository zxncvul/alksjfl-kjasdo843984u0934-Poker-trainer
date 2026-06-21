'use strict';

(function (RT) {
  const Pot = RT.SimulatorPotOdds;
  const STREET_OPTIONS = [
    { id: 'flop', label: 'Solo Flop' },
    { id: 'turn', label: 'Solo Turn' },
    { id: 'mixed', label: 'Flop + Turn aleatorio' }
  ];
  const KIND_OPTIONS = [
    { id: 'mixed', label: 'Mixto' },
    { id: 'oesd', label: 'OESD' },
    { id: 'gutshot', label: 'Gutshot' },
    { id: 'flush', label: 'Flush draw' },
    { id: 'combo', label: 'Combo draw' },
    { id: 'made-hand', label: 'Mano hecha' }
  ];
  const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  function cardColor(code) {
    if (!code) return 'white';
    return code[1] === '♥' || code[1] === '♦' ? 'red' : 'blue';
  }
  function tableCard(H, code, board) {
    const node = H.el('span', `${board ? 'sim-board-card' : 'sim-card'} sim-duel-card sim-card-color-${cardColor(code)}`);
    node.textContent = code || '--';
    return node;
  }
  function blindMarker(H, type) {
    const marker = H.el('span', `sim-seat-marker is-blind is-${type.toLowerCase()}`);
    const amount = type === 'SB' ? 1 : 2;
    for (let index = 0; index < amount; index++) marker.appendChild(H.el('span', 'sim-blind-chip'));
    return marker;
  }
  function chipStack(H, value, className, label) {
    const stack = H.el('div', `sim-pot-chip-stack ${className || ''}`.trim());
    const chips = H.el('span', 'sim-pot-chip-pile');
    for (let index = 0; index < 3; index++) chips.appendChild(H.el('i', 'sim-pot-chip'));
    stack.appendChild(chips);
    stack.appendChild(H.el('span', 'sim-pot-chip-value', `${label || ''}${value}`));
    return stack;
  }
  function seatAssignments(round) {
    const slots = new Array(POSITIONS.length);
    const heroIndex = POSITIONS.indexOf(round.heroPosition);
    POSITIONS.forEach((position, index) => {
      slots[(4 + index - (heroIndex < 0 ? 0 : heroIndex) + POSITIONS.length) % POSITIONS.length] = position;
    });
    return slots;
  }
  function renderSeat(H, position, index, round) {
    const isHero = position === round.heroPosition;
    const isVillain = position === round.villainPosition;
    const heroHidden = isHero && Pot.state.aids.hiddenZones.has('hero');
    const seat = H.el('div', `sim-seat sim-seat-slot-${index}` +
      (isHero ? ' is-hero' : '') + (isVillain ? ' is-active is-aggressor' : '') +
      (!isHero && !isVillain ? ' is-folded' : ''));
    const head = H.el('div', 'sim-seat-head');
    head.appendChild(H.el('span', 'sim-seat-pos', position));
    if (isHero) head.appendChild(H.el('span', 'sim-seat-hero', 'Hero'));
    if (isVillain) head.appendChild(H.el('span', 'sim-seat-hero sim-seat-villain', 'Villain'));
    seat.appendChild(head);
    seat.appendChild(H.el('div', 'sim-seat-stack', '100 bb'));
    const cards = H.el('div', 'sim-hole-cards seat-cards sim-hand-sm');
    if (isHero && !heroHidden) round.hero.forEach(code => cards.appendChild(tableCard(H, code, false)));
    else {
      cards.appendChild(H.el('span', 'sim-card-back'));
      cards.appendChild(H.el('span', 'sim-card-back'));
    }
    seat.appendChild(cards);
    seat.appendChild(H.el('div', 'sim-seat-action', isVillain ? `Apuesta ${round.callAmount}` : isHero ? 'Tu decisión' : 'Espera'));
    if (isVillain) seat.appendChild(chipStack(H, round.callAmount, `sim-pot-seat-wager is-slot-${index}`, ''));
    if (position === 'BTN') seat.appendChild(H.el('span', 'sim-seat-marker is-dealer', 'D'));
    if (position === 'SB') seat.appendChild(blindMarker(H, 'SB'));
    if (position === 'BB') seat.appendChild(blindMarker(H, 'BB'));
    return seat;
  }
  function stat(H, label, value) {
    return H.statLine(label, value == null ? '--' : String(value));
  }
  function ratio(value) {
    return value == null ? 'N/A' : `${value.toFixed(1)}%`;
  }
  function accuracy(stats) {
    return stats.played ? `${Math.round(stats.correct / stats.played * 100)}%` : '0%';
  }
  function calculationSummary(s, round) {
    const hidden = s.config.hiddenFields;
    const math = round.analysis.math;
    const parts = [`Outs: ${round.analysis.outs.useful.length}`];
    if (!hidden.has('ratio')) parts.push(`Ratio ${math.ratio.toFixed(2)}:1`);
    if (!hidden.has('needed')) parts.push(`Necesaria ${ratio(math.needed)}`);
    if (!hidden.has('turn') && math.turn != null) parts.push(`Turn ${ratio(math.turn)}`);
    if (!hidden.has('river') && math.river != null) parts.push(`River ${ratio(math.river)}`);
    return parts.join(' · ');
  }
  function filteredPositions(excluded) {
    return POSITIONS.map(id => ({ id, label: id, disabled: id === excluded }));
  }
  function compactChecks(H, title, items, selected, onToggle) {
    const group = H.el('div', 'sim-pot-compact-checks');
    group.appendChild(H.el('div', 'panel-group-title', title));
    const values = H.el('div', 'sim-pot-check-list');
    items.forEach(([id, label]) => {
      const field = H.el('label', 'sim-pot-check');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = selected.has(id);
      input.addEventListener('change', () => onToggle(id));
      field.appendChild(input);
      field.appendChild(H.el('span', '', label));
      values.appendChild(field);
    });
    group.appendChild(values);
    return group;
  }

  function renderPanel(panel, H, tabs) {
    const s = Pot.state;
    if (tabs) panel.appendChild(tabs);
    const intro = H.el('section', 'workspace-card');
    intro.appendChild(H.el('h2', 'sim-config-title', 'Pot Odds Spots'));
    intro.appendChild(H.hint('Decide CALL o FOLD en flop o turn. El Lab abre el mismo spot para analizarlo sin cambiar la mesa.'));
    panel.appendChild(intro);

    const config = H.el('section', 'workspace-card sim-pot-options');
    config.appendChild(H.el('div', 'panel-group-title', 'SesiÃ³n'));
    config.appendChild(H.selectGroup('Ronda', STREET_OPTIONS, s.config.street,
      value => Pot.setConfig('street', value)));
    config.appendChild(H.selectGroup('Proyecto', KIND_OPTIONS, s.config.kind,
      value => Pot.setConfig('kind', value)));
    config.appendChild(H.selectGroup('Manos', [
      { id: 10, label: '10 manos' }, { id: 25, label: '25 manos' },
      { id: 50, label: '50 manos' }, { id: 0, label: 'Sin límite' }
    ], s.config.count, value => Pot.setConfig('count', Number(value))));
    const positions = H.el('div', 'sim-duel-select-row');
    positions.appendChild(H.selectGroup('Hero', filteredPositions(s.config.villainPosition),
      s.config.heroPosition, value => Pot.setConfig('heroPosition', value)));
    positions.appendChild(H.selectGroup('Villain', filteredPositions(s.config.heroPosition),
      s.config.villainPosition, value => Pot.setConfig('villainPosition', value)));
    config.appendChild(positions);
    config.appendChild(H.group('Sesión', [
      H.button(s.phase === 'finished' ? 'Reiniciar' : 'Comenzar', {
        variant: 'btn-primary', onClick: Pot.startSession
      }),
      H.button('Reset', { variant: 'btn-ghost', onClick: Pot.resetStats, title: 'Restablece las estadísticas de Pot Odds' })
    ], 'sim-pot-session-actions'));

    config.appendChild(H.el('div', 'panel-group-title', 'Spot'));
    config.appendChild(H.selectGroup('Tipo de board', [
      { id: 'random', label: 'Aleatorio' }, { id: 'rainbow', label: 'Rainbow' },
      { id: 'paired', label: 'Pair' }, { id: 'mono', label: 'Mono' }
    ], s.config.suitMode, value => Pot.setConfig('suitMode', value)));
    const lockValue = s.config.boardLocked && s.config.scenarioLocked ? 'both'
      : s.config.boardLocked ? 'board' : s.config.scenarioLocked ? 'scenario' : 'none';
    config.appendChild(H.selectGroup('Bloqueos', [
      { id: 'none', label: 'Ninguno' }, { id: 'board', label: 'Board' },
      { id: 'scenario', label: 'Escenario' }, { id: 'both', label: 'Board y escenario' }
    ], lockValue, value => {
      Pot.setConfig('boardLocked', value === 'board' || value === 'both');
      Pot.setConfig('scenarioLocked', value === 'scenario' || value === 'both');
    }));

    config.appendChild(H.collapsible('sim-pot-advanced', 'Avanzado', body => {
      body.appendChild(H.el('div', 'panel-group-title', 'Tiempo y memoria'));
      body.appendChild(H.selectGroup('Tiempo', [
        { id: 0, label: 'Sin lÃ­mite' }, { id: 5, label: '5s' }, { id: 10, label: '10s' },
        { id: 15, label: '15s' }, { id: 30, label: '30s' }
      ], s.config.countdown, value => Pot.setConfig('countdown', Number(value))));
      body.appendChild(H.selectGroup('Memoria', [
        { id: 0, label: 'Off' }, { id: 1, label: '1s' }, { id: 2, label: '2s' },
        { id: 5, label: '5s' }, { id: 10, label: '10s' }
      ], s.config.memoryDuration, value => Pot.setConfig('memoryDuration', Number(value))));
      body.appendChild(compactChecks(H, 'Zonas', [
        ['hero', 'Hero'], ['flop', 'Flop'], ['turn', 'Turn'], ['river', 'River']
      ], s.config.memoryZones, value => Pot.toggleConfigSet('memoryZones', value)));
      body.appendChild(H.selectGroup('RandomizaciÃ³n', [
        { id: 0, label: 'Off' }, { id: 1, label: 'Rnd 1' }, { id: 2, label: 'Rnd 2' }, { id: 3, label: 'Rnd 3' }
      ], s.config.memoryRandomCount, value => Pot.setConfig('memoryRandomCount', Number(value))));
      body.appendChild(H.el('div', 'panel-group-title', 'Ayudas visibles'));
      body.appendChild(compactChecks(H, 'Ocultar cálculo', [
        ['ratio', 'Ratio'], ['needed', 'Necesaria'], ['turn', 'Turn'], ['river', 'River'], ['result', 'Resultado']
      ], s.config.hiddenFields, value => Pot.toggleConfigSet('hiddenFields', value)));
    }, { badge: 'Opciones' }));
    config.appendChild(H.group('Acciones', [
      H.button('Random Spot', { variant: 'btn-ghost', onClick: Pot.next }),
      H.button('Reveal', { active: s.aids.reveal, disabled: !s.round, onClick: Pot.toggleReveal }),
      H.button('Export', { variant: 'btn-ghost', disabled: !s.round, onClick: Pot.exportRound })
    ], 'sim-pot-quick-actions'));
    panel.appendChild(config);
  }

  function renderStage(stage, H) {
    const s = Pot.state;
    stage.innerHTML = '';
    if (s.lab.view === 'lab') {
      renderInternalLab(stage, H, s);
      return;
    }
    const root = H.el('div', `sim-pot-odds-stage phase-${s.phase}`);
    if (!s.round) {
      const waiting = H.el('section', 'sim-pot-odds-waiting');
      waiting.appendChild(H.el('div', 'sim-table-kicker', 'SIMULATOR · POT ODDS'));
      waiting.appendChild(H.el('h2', '', 'Decisiones CALL / FOLD'));
      waiting.appendChild(H.el('p', '', 'Genera un spot de flop o turn. Después podrás abrir exactamente esa situación en el Pot Odds Lab.'));
      waiting.appendChild(H.button('Generar spot', { variant: 'btn-primary', onClick: Pot.startSession }));
      root.appendChild(waiting);
      stage.appendChild(root);
      return;
    }
    renderNativeStage(root, H, s);
    stage.appendChild(root);
    return;

    const round = s.round;
    const math = round.analysis.math;
    const table = H.el('section', 'sim-pot-odds-table');
    const top = H.el('div', 'sim-pot-odds-table-top');
    top.appendChild(H.el('span', 'sim-table-kicker', `POT ODDS · ${round.street.toUpperCase()}`));
    top.appendChild(H.el('span', 'sim-pot-odds-project', round.project));
    table.appendChild(top);

    const villain = H.el('div', 'sim-pot-seat sim-pot-villain');
    villain.appendChild(H.el('span', 'sim-pot-seat-label', `Villain · ${round.villainPosition}`));
    villain.appendChild(H.el('span', 'sim-pot-seat-action', `Apuesta ${math.bet}`));
    table.appendChild(villain);

    const board = H.el('div', 'sim-pot-board');
    round.board.forEach(code => board.appendChild(card(H, code)));
    table.appendChild(board);

    const pot = H.el('div', 'sim-pot-pot');
    pot.appendChild(H.el('span', 'sim-pot-pot-label', 'Bote'));
    pot.appendChild(H.el('strong', '', String(math.pot)));
    pot.appendChild(H.el('span', '', `Call ${round.callAmount}`));
    table.appendChild(pot);

    const hero = H.el('div', 'sim-pot-seat sim-pot-hero');
    hero.appendChild(H.el('span', 'sim-pot-seat-label', `Hero · ${round.heroPosition}`));
    const heroCards = H.el('div', 'sim-pot-hero-cards');
    round.hero.forEach(code => heroCards.appendChild(card(H, code)));
    hero.appendChild(heroCards);
    table.appendChild(hero);
    root.appendChild(table);

    const decision = H.el('section', 'sim-pot-decision');
    if (s.phase === 'question' && !decisionAvailable) {
      decision.appendChild(H.el('div', 'sim-decision-prompt',
        'Mano hecha: no se puntua CALL/FOLD con equity de outs.'));
    } else if (s.phase === 'question') {
      decision.appendChild(H.el('div', 'sim-decision-prompt', '¿Pagas la apuesta?'));
    } else {
      const correct = s.answer === round.expectedDecision;
      decision.appendChild(H.el('div', `sim-pot-verdict ${correct ? 'is-correct' : 'is-error'}`,
        correct ? 'Correcto' : `La decisión era ${round.expectedDecision}`));
      decision.appendChild(H.el('p', 'sim-pot-reason',
        `Outs: ${round.analysis.outs.useful.length} · Equity por outs ${ratio(math.equity)} · Necesaria ${ratio(math.needed)}`));
    }
    const actions = H.el('div', 'sim-decisions');
    actions.appendChild(H.button('CALL', {
      variant: s.answer === 'CALL' ? 'btn-primary' : 'btn-decision',
      disabled: s.phase !== 'question' || !decisionAvailable, onClick: () => Pot.answer('CALL')
    }));
    actions.appendChild(H.button('FOLD', {
      variant: s.answer === 'FOLD' ? 'btn-primary' : 'btn-decision',
      disabled: s.phase !== 'question' || !decisionAvailable, onClick: () => Pot.answer('FOLD')
    }));
    actions.appendChild(H.button('Abrir Lab', {
      variant: 'btn-ghost', onClick: Pot.openLab,
      title: 'Abre este mismo spot en Pot Odds Lab sin modificar la mesa'
    }));
    actions.appendChild(H.button(s.phase === 'finished' ? 'Reiniciar' : 'Next', {
      variant: 'btn-primary', disabled: s.phase === 'question' && decisionAvailable,
      onClick: s.phase === 'finished' ? Pot.startSession : Pot.next
    }));
    decision.appendChild(actions);
    if (s.exportNotice) decision.appendChild(H.el('span', 'sim-pot-export-notice', s.exportNotice));
    root.appendChild(decision);
    stage.appendChild(root);
  }

  function renderNativeStage(root, H, s) {
    const round = s.round;
    const math = round.analysis.math;
    const decisionAvailable = round.expectedDecision !== 'N/A';
    const wrap = H.el('div', 'sim-play sim-duel-play sim-pot-odds-play');
    const dash = H.el('div', 'sim-dash');
    const main = H.el('div', 'sim-main sim-duel-main');
    const table = H.el('div', 'sim-table sim-duel-table is-fixed sim-pot-odds-table');
    const felt = H.el('div', 'sim-felt');
    const center = H.el('div', 'sim-center sim-duel-center');
    center.appendChild(H.el('div', 'sim-table-spot', `POT ODDS · ${round.street.toUpperCase()} · ${round.heroPosition} vs ${round.villainPosition}`));
    const boardHead = H.el('div', 'sim-duel-board-head');
    boardHead.appendChild(H.el('span', 'sim-pot-label', round.type));
    center.appendChild(boardHead);
    const board = H.el('div', 'sim-board sim-duel-board');
    round.board.forEach((code, index) => {
      const zone = index < 3 ? 'flop' : index === 3 ? 'turn' : 'river';
      board.appendChild(tableCard(H, s.aids.hiddenZones.has(zone) ? null : code, true));
    });
    center.appendChild(board);
    center.appendChild(H.el('div', 'sim-seat-action is-decide', '¿Pagas la apuesta?'));
    felt.appendChild(center);
    felt.appendChild(chipStack(H, math.pot, 'sim-pot-center-wager', 'POT '));
    const exportButton = H.el('button', 'sim-duel-export', 'Export');
    exportButton.type = 'button';
    exportButton.addEventListener('click', Pot.exportRound);
    felt.appendChild(exportButton);
    seatAssignments(round).forEach((position, index) => felt.appendChild(renderSeat(H, position, index, round)));
    table.appendChild(felt);
    main.appendChild(table);
    const openLab = H.button('Abrir Lab', {
      variant: 'btn-ghost', onClick: Pot.openLab,
      title: 'Abre este mismo spot en Pot Odds Lab sin modificar la mesa'
    });
    openLab.classList.add('sim-pot-open-lab');

    const decision = H.el('section', 'sim-zone sim-duel-zone sim-pot-decision');
    if (s.phase === 'question' && !s.aids.reveal) {
      decision.appendChild(H.el('div', 'sim-decision-prompt', '¿Pagas la apuesta?'));
    } else {
      const correct = s.answer === round.expectedDecision;
      const feedback = H.el('div', `sim-duel-feedback ${s.aids.reveal || correct ? 'is-ok' : 'is-error'}`);
      const verdict = s.aids.reveal ? `Reveal: ${round.expectedDecision}`
        : correct ? 'Correcto' : `La decisión era ${round.expectedDecision}`;
      feedback.appendChild(H.el('strong', '', s.config.hiddenFields.has('result') ? 'Resultado oculto' : verdict));
      feedback.appendChild(H.el('span', '', calculationSummary(s, round)));
      decision.appendChild(feedback);
    }
    const actions = H.el('div', 'sim-decisions');
    actions.appendChild(H.button('CALL', {
      variant: s.answer === 'CALL' ? 'btn-primary' : 'btn-decision',
      disabled: s.phase !== 'question', onClick: () => Pot.answer('CALL')
    }));
    actions.appendChild(H.button('FOLD', {
      variant: s.answer === 'FOLD' ? 'btn-primary' : 'btn-decision',
      disabled: s.phase !== 'question', onClick: () => Pot.answer('FOLD')
    }));
    actions.appendChild(H.button(s.phase === 'finished' ? 'Reiniciar' : 'Next', {
      variant: 'btn-primary', disabled: s.phase === 'question', onClick: s.phase === 'finished' ? Pot.startSession : Pot.next
    }));
    decision.appendChild(actions);
    if (s.exportNotice) decision.appendChild(H.el('span', 'sim-pot-export-notice', s.exportNotice));
    main.appendChild(decision);
    dash.appendChild(main);
    wrap.appendChild(dash);
    wrap.appendChild(openLab);
    root.appendChild(wrap);
  }

  function renderInternalLab(stage, H, s) {
    renderDedicatedLab(stage, H, s);
    return;

    const lab = s.lab;
    const spot = lab.spot;
    const labState = Pot.labState;
    const analysis = Pot.labAnalysis();
    const math = analysis.math;
    const root = H.el('div', 'sim-pot-odds-stage sim-pot-internal-lab');
    const card = H.el('section', 'sim-pot-lab-card');
    const head = H.el('div', 'sim-pot-lab-head');
    head.appendChild(H.el('div', 'sim-table-kicker', `POT ODDS LAB · ${spot.street.toUpperCase()}`));
    head.appendChild(H.button('Volver a mesa', { variant: 'btn-primary', onClick: Pot.closeLab }));
    card.appendChild(head);
    card.appendChild(H.el('p', 'sim-pot-lab-copy', 'Análisis interno del spot actual. Los cambios o revelaciones de esta vista no modifican la mesa.'));
    const cards = H.el('div', 'sim-pot-lab-cards');
    const addRow = (label, codes) => {
      const row = H.el('div', 'sim-pot-lab-card-row');
      row.appendChild(H.el('span', 'sim-pot-label', label));
      const values = H.el('div', 'sim-board');
      codes.forEach(code => values.appendChild(tableCard(H, code, true)));
      row.appendChild(values);
      cards.appendChild(row);
    };
    addRow(`Hero · ${spot.heroPosition}`, spot.hero);
    if (spot.villain.length) addRow(`Villain · ${spot.villainPosition}`, spot.villain);
    addRow('Board', spot.board.concat(lab.revealDetail ? [lab.revealDetail.card] : []));
    card.appendChild(cards);
    const metrics = H.el('div', 'sim-pot-lab-metrics');
    [
      ['Bote', math.pot], ['Apuesta / Call', math.bet], ['Equity necesaria', ratio(math.needed)],
      ['Outs útiles', analysis.outs.useful.length], ['Equity por outs', ratio(math.equity)],
      ['Decisión mesa', spot.expectedDecision]
    ].forEach(([label, value]) => metrics.appendChild(stat(H, label, value)));
    card.appendChild(metrics);
    if (lab.revealOuts) card.appendChild(H.el('p', 'sim-pot-lab-detail', `Outs: ${analysis.outs.useful.join(' ') || 'Sin outs limpias'}`));
    if (lab.revealHand) card.appendChild(H.el('p', 'sim-pot-lab-detail', `Jugada actual: ${analysis.current ? analysis.current.handName : '--'}`));
    if (lab.revealDetail) card.appendChild(H.el('p', 'sim-pot-lab-detail', lab.revealDetail.explanation));
    const actions = H.el('div', 'sim-decisions');
    actions.appendChild(H.button('OUTS', { active: lab.revealOuts, onClick: Pot.toggleLabOuts }));
    actions.appendChild(H.button('JUGADA', { active: lab.revealHand, onClick: Pot.toggleLabHand }));
    actions.appendChild(H.button(lab.revealDetail ? 'Ocultar Reveal' : 'Reveal', { onClick: Pot.toggleLabReveal }));
    actions.appendChild(H.button('Export', { variant: 'btn-ghost', onClick: Pot.exportRound }));
    card.appendChild(actions);
    const deck = H.el('div', 'sim-pot-lab-deck');
    const used = new Set(analysis.outs.deadCards);
    ['♠','♥','♦','♣'].forEach(suit => ['A','K','Q','J','T','9','8','7','6','5','4','3','2'].forEach(rank => {
      const code = rank + suit;
      const button = H.button(code, { disabled: used.has(code), onClick: () => Pot.labPlaceCard(code) });
      button.classList.add('sim-pot-lab-deck-card');
      deck.appendChild(button);
    }));
    card.appendChild(deck);
    root.appendChild(card);
    stage.appendChild(root);
  }

  function renderDedicatedLab(stage, H, s) {
    const spot = s.lab.spot;
    const labState = Pot.labState;
    const lab = labState.lab;
    const session = labState.session;
    const analysis = Pot.labAnalysis();
    const math = analysis.math;
    const madeHand = analysis.mode === 'MADE_HAND_MODE';
    const active = lab.activeSlot || {};
    const useful = analysis.outs.useful || [];
    const handCards = new Set(session.revealHand && analysis.current ? analysis.current.highlightStrong : []);
    const outHintsDisabled = madeHand || analysis.mode === 'RIVER_FINAL_MODE' || !useful.length;
    const root = H.el('div', 'sim-pot-internal-lab');
    const shell = H.el('section', 'sim-pot-lab-shell');

    const toolbar = H.el('header', 'sim-pot-lab-toolbar');
    const identity = H.el('div', 'sim-pot-lab-identity');
    identity.appendChild(H.el('span', 'sim-pot-lab-mark', 'PO'));
    identity.appendChild(H.el('strong', '', `POT ODDS LAB - ${spot.street.toUpperCase()}`));
    toolbar.appendChild(identity);
    const actions = H.el('div', 'sim-pot-lab-actions');
    actions.appendChild(H.button('Export', { variant: 'btn-ghost', onClick: Pot.exportRound }));
    actions.appendChild(H.button('Limpiar', { variant: 'btn-ghost', onClick: Pot.labClear }));
    actions.appendChild(H.button('OUTS', { active: session.revealOuts, disabled: outHintsDisabled, onClick: Pot.toggleLabOuts }));
    actions.appendChild(H.button('JUGADA', { active: session.revealHand, onClick: Pot.toggleLabHand }));
    actions.appendChild(H.button('Reveal', { active: session.reveal, onClick: Pot.toggleLabReveal }));
    actions.appendChild(H.button('Volver a mesa', { variant: 'btn-primary', onClick: Pot.closeLab }));
    toolbar.appendChild(actions);
    if (s.exportNotice) toolbar.appendChild(H.el('span', 'sim-pot-lab-export-notice', s.exportNotice));
    shell.appendChild(toolbar);

    const main = H.el('div', 'sim-pot-lab-main');
    const cardsPanel = H.el('section', 'sim-pot-lab-cards-panel');
    cardsPanel.appendChild(H.el('h2', 'sim-pot-lab-section-title', 'Cartas del spot'));
    const createSlot = (section, index, code) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'sim-pot-lab-slot' +
        (active.section === section && active.index === index ? ' is-active' : '') +
        (handCards.has(code) ? ' is-hand' : '');
      slot.addEventListener('click', () => Pot.labSelectSlot(section, index));
      slot.appendChild(tableCard(H, code, true));
      return slot;
    };
    const addGroup = (host, label, section, cards) => {
      const group = H.el('div', `sim-pot-lab-card-group is-${section}`);
      group.appendChild(H.el('span', 'sim-pot-lab-card-label', label));
      const values = H.el('div', 'sim-pot-lab-slot-row');
      cards.forEach((code, index) => values.appendChild(createSlot(section, index, code)));
      group.appendChild(values);
      host.appendChild(group);
    };
    const board = H.el('div', 'sim-pot-lab-board');
    addGroup(board, 'Flop', 'flop', lab.flop);
    addGroup(board, 'Turn', 'turn', lab.turn);
    addGroup(board, 'River', 'river', lab.river);
    cardsPanel.appendChild(board);
    const players = H.el('div', 'sim-pot-lab-players');
    addGroup(players, `Hero - ${spot.heroPosition}`, 'hero', lab.hero);
    addGroup(players, `Villain - ${spot.villainPosition}`, 'villain', lab.villain);
    cardsPanel.appendChild(players);
    main.appendChild(cardsPanel);

    const scenario = H.el('aside', 'sim-pot-lab-scenario');
    scenario.appendChild(H.el('h2', 'sim-pot-lab-section-title', 'Escenario'));
    const editable = (label, key, value) => {
      const field = H.el('label', 'sim-pot-lab-input');
      field.appendChild(H.el('span', '', label));
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.value = value == null ? '' : String(value);
      input.addEventListener('change', () => Pot.labSetScenario(key, input.value));
      input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
      field.appendChild(input);
      return field;
    };
    scenario.appendChild(editable('Bote', 'pot', math.pot));
    scenario.appendChild(editable('Apuesta / Call', 'bet', math.bet));
    const computed = H.el('div', 'sim-pot-lab-computed');
    [['Bote final', math.finalPot], ['Equity necesaria', ratio(math.needed)], ['Equity por outs', madeHand ? 'N/A' : ratio(math.equity)]]
      .forEach(([label, value]) => {
        const row = H.el('div', 'sim-pot-lab-computed-row');
        row.appendChild(H.el('span', '', label));
        row.appendChild(H.el('strong', '', value));
        computed.appendChild(row);
      });
    scenario.appendChild(computed);
    main.appendChild(scenario);
    shell.appendChild(main);

    const analysisGrid = H.el('section', 'sim-pot-lab-analysis-grid');
    const addAnalysisCard = (title, rows) => {
      const card = H.el('article', 'sim-pot-lab-analysis-card');
      card.appendChild(H.el('h3', '', title));
      rows.forEach(([label, value]) => {
        const row = H.el('div', 'sim-pot-lab-analysis-row');
        row.appendChild(H.el('span', '', label));
        row.appendChild(H.el('strong', '', value));
        card.appendChild(row);
      });
      analysisGrid.appendChild(card);
    };
    addAnalysisCard('Pot Odds', [
      ['Bote inicial', String(math.pot)],
      ['Apuesta rival / Call', String(math.bet)],
      ['Bote final si pago', `${math.pot} + ${math.bet} + ${math.bet} = ${math.finalPot}`],
      ['Equity necesaria', `${math.bet} / ${math.finalPot} = ${ratio(math.needed)}`]
    ]);
    addAnalysisCard(madeHand ? 'Mano actual' : 'Proyecto actual', madeHand
      ? [
          ['Tipo', 'Mano hecha'],
          ['Mano', analysis.current ? analysis.current.handName : '--'],
          ['Cartas', lab.hero.concat(lab.flop, lab.turn, lab.river).filter(Boolean).join(' ') || '--']
        ]
      : [
          ['Tipo', 'Proyecto'],
          ['Proyecto', analysis.project || '--'],
          ['Mano actual', analysis.current ? analysis.current.handName : '--']
        ]);
    addAnalysisCard('Outs y mejoras', madeHand
      ? [
          ['Decision por outs', 'N/A'],
          ['Mejoras posibles', String((analysis.outs.clean || []).length)],
          ['Motivo', 'No se evalua como proyecto puro']
        ]
      : [
          ['Outs utiles', String(useful.length)],
          ['Limpias / Marginales / Brutas', `${analysis.outs.clean.length} / ${analysis.outs.marginal.length} / ${analysis.outs.raw.length}`],
          [lab.flop.filter(Boolean).length === 3 ? 'Flop a river' : 'River',
            lab.flop.filter(Boolean).length === 3 ? `${useful.length} outs x 4 ~= ${ratio(math.river)}` : `${useful.length} outs x 2 ~= ${ratio(math.river)}`],
          ['Siguiente carta', math.turn == null ? 'N/A' : `${useful.length} outs x 2 ~= ${ratio(math.turn)}`]
        ]);
    addAnalysisCard('Resultado', madeHand
      ? [['Estado', 'Mano hecha'], ['Decision por outs', 'N/A'], ['Lectura', 'No se decide como proyecto']]
      : [['Equity por outs', ratio(math.equity)], ['Equity necesaria', ratio(math.needed)], ['Decision sugerida', math.action || (math.equity >= math.needed ? 'CALL' : 'FOLD')]]);
    shell.appendChild(analysisGrid);
    if (session.revealDetail && session.revealDetail.explanation) {
      shell.appendChild(H.el('p', 'sim-pot-lab-reveal-detail', session.revealDetail.explanation));
    }

    const deckPanel = H.el('section', 'sim-pot-lab-deck-panel');
    const deckHead = H.el('div', 'sim-pot-lab-deck-head');
    deckHead.appendChild(H.el('h2', 'sim-pot-lab-section-title', 'Mazo vivo'));
    const deckControls = H.el('div', 'sim-pot-lab-deck-controls');
    deckControls.appendChild(H.button('Positivas', { active: session.activeSelection === 'positive', disabled: madeHand, onClick: () => Pot.labSetSelectionMode('positive') }));
    deckControls.appendChild(H.button('Negativas', { active: session.activeSelection === 'negative', disabled: madeHand, onClick: () => Pot.labSetSelectionMode('negative') }));
    deckControls.appendChild(H.button('%', { active: labState.config.displayMode === 'percent', onClick: () => Pot.labSetDisplayMode('percent') }));
    deckControls.appendChild(H.button('Ratio', { active: labState.config.displayMode === 'ratio', onClick: () => Pot.labSetDisplayMode('ratio') }));
    deckHead.appendChild(deckControls);
    deckPanel.appendChild(deckHead);
    const deck = H.el('div', 'sim-pot-lab-deck');
    const used = new Set(analysis.outs.deadCards || []);
    const highlighted = new Set(madeHand ? (analysis.outs.clean || []) : useful);
    [String.fromCharCode(9824), String.fromCharCode(9829), String.fromCharCode(9830), String.fromCharCode(9827)]
      .forEach(suit => ['A','K','Q','J','T','9','8','7','6','5','4','3','2'].forEach(rank => {
        const code = rank + suit;
        const button = H.button(code, {
          disabled: used.has(code),
          onClick: () => session.reveal ? Pot.labExplainCard(code) : Pot.labPlaceCard(code)
        });
        button.classList.add('sim-pot-lab-deck-card');
        button.classList.toggle('is-used', used.has(code));
        button.classList.toggle('is-out', session.revealOuts && highlighted.has(code));
        button.classList.toggle('is-red', cardColor(code) === 'red');
        deck.appendChild(button);
      }));
    deckPanel.appendChild(deck);
    shell.appendChild(deckPanel);
    root.appendChild(shell);
    stage.appendChild(root);
  }

  function renderInsights(aside, H) {
    const s = Pot.state;
    const round = s.round;
    const assistant = H.el('section', 'assistant-panel is-pot-odds');
    assistant.appendChild(H.el('div', 'assistant-eyebrow', 'Asistente · Pot Odds'));
    assistant.appendChild(H.el('h2', 'assistant-title', round ? 'Compara precio y equity' : 'Prepara un spot'));
    assistant.appendChild(H.el('p', 'assistant-text', s.feedback));
    aside.appendChild(assistant);

    if (round) {
      const math = round.analysis.math;
      aside.appendChild(H.dashPanel('Spot actual', body => {
        body.appendChild(stat(H, 'Street', round.street));
        body.appendChild(stat(H, 'Proyecto', round.type));
        body.appendChild(stat(H, 'Bote / Call', `${math.pot} / ${round.callAmount}`));
        if (!s.config.hiddenFields.has('needed')) body.appendChild(stat(H, 'Equity necesaria', ratio(math.needed)));
        if (!s.config.hiddenFields.has('river')) body.appendChild(stat(H, 'Equity por outs', ratio(math.equity)));
      }));
    }
    aside.appendChild(H.dashPanel('Estadísticas Pot Odds', body => {
      body.appendChild(stat(H, 'Manos', s.stats.played));
      body.appendChild(stat(H, 'Aciertos', s.stats.correct));
      body.appendChild(stat(H, 'Errores', s.stats.failed));
      body.appendChild(stat(H, 'Precisión', accuracy(s.stats)));
      body.appendChild(stat(H, 'Racha', `${s.stats.currentStreak} · mejor ${s.stats.bestStreak}`));
    }));
    const streetErrors = Object.entries(s.stats.errorsByStreet);
    const typeErrors = Object.entries(s.stats.errorsByType);
    aside.appendChild(H.dashPanel('Errores', body => {
      if (!streetErrors.length && !typeErrors.length) body.appendChild(stat(H, 'Registro', 'Sin errores'));
      streetErrors.forEach(([street, count]) => body.appendChild(stat(H, `Street ${street}`, count)));
      typeErrors.forEach(([type, count]) => body.appendChild(stat(H, type, count)));
    }));
  }

  function renderGallery(root, H) {
    root.innerHTML = '';
    root.className = 'range-gallery sim-pot-odds-gallery';
    const heading = H.el('div', 'range-gallery-head');
    const copy = H.el('div', 'range-gallery-heading');
    copy.appendChild(H.el('span', 'range-gallery-kicker', 'Ejercicios Pot Odds'));
    copy.appendChild(H.el('span', 'range-gallery-count', '8 presets'));
    heading.appendChild(copy);
    root.appendChild(heading);
    const track = H.el('div', 'range-gallery-track');
    Pot.presets().forEach(preset => {
      const active = Pot.state.config.street === preset.street && Pot.state.config.kind === preset.kind;
      const item = H.el('button', `range-card${active ? ' is-active' : ''}`);
      item.type = 'button';
      item.appendChild(H.el('strong', 'range-card-title', preset.label));
      item.appendChild(H.el('span', 'pot-mode-description', preset.description));
      item.addEventListener('click', () => Pot.applyPreset(preset));
      track.appendChild(item);
    });
    root.appendChild(track);
  }

  function actionBarItems(H) {
    const s = Pot.state;
    if (s.lab.view === 'lab') return [
      H.button('Mesa', { variant: 'btn-primary', onClick: Pot.closeLab }),
      H.button('OUTS', { active: s.lab.revealOuts, onClick: Pot.toggleLabOuts }),
      H.button('JUGADA', { active: s.lab.revealHand, onClick: Pot.toggleLabHand })
    ];
    if (!s.round) return [H.button('Generar', { variant: 'btn-primary', onClick: Pot.startSession })];
    const decisionAvailable = s.round.expectedDecision !== 'N/A';
    return [
      H.button('CALL', { disabled: s.phase !== 'question' || !decisionAvailable, onClick: () => Pot.answer('CALL') }),
      H.button('FOLD', { disabled: s.phase !== 'question' || !decisionAvailable, onClick: () => Pot.answer('FOLD') }),
      H.button('Lab', { onClick: Pot.openLab }),
      H.button(s.phase === 'finished' ? 'Reiniciar' : 'Next', {
        variant: 'btn-primary', disabled: s.phase === 'question' && decisionAvailable,
        onClick: s.phase === 'finished' ? Pot.startSession : Pot.next
      })
    ];
  }
  function handleKey(key) {
    const lowered = String(key || '').toLowerCase();
    if (Pot.state.lab.view === 'lab') {
      if (lowered === 'l' || key === 'Escape') { Pot.closeLab(); return true; }
      if (lowered === 'o') { Pot.toggleLabOuts(); return true; }
      if (lowered === 'j') { Pot.toggleLabHand(); return true; }
      return false;
    }
    if (lowered === 'c') { Pot.answer('CALL'); return true; }
    if (lowered === 'f') { Pot.answer('FOLD'); return true; }
    if (lowered === 'l') { Pot.openLab(); return true; }
    if (lowered === 'n' || key === 'Enter') {
      if (Pot.state.phase === 'finished') Pot.startSession();
      else if (Pot.state.phase !== 'question') Pot.next();
      return true;
    }
    return false;
  }
  RT.SimulatorPotOddsUI = { renderPanel, renderStage, renderInsights, renderGallery, actionBarItems, handleKey };
})(window.RT);
