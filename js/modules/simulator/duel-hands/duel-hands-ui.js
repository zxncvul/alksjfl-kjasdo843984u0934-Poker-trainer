'use strict';

(function (RT) {
  const Duel = RT.SimulatorDuelHands;
  const Engine = RT.SimulatorDuelHandsEngine;
  const POS_OPTIONS = [{ id: 'random', label: 'Aleatorio' }]
    .concat(Engine.POSITIONS.map(position => ({ id: position, label: position })));
  const COLOR_OPTIONS = [
    { id: 'mono', label: 'Monocolor' },
    { id: 'four', label: '4 colores' },
    { id: 'bicolor', label: 'Bicolor' },
    { id: 'random', label: 'Random atencion' }
  ];
  const TYPE_LABELS = {
    'Carta alta': 'Carta alta',
    'Pareja': 'Pareja',
    'Doble pareja': 'Doble pareja',
    'Trio': 'Trio',
    'Escalera': 'Escalera',
    'Color': 'Color',
    'Full house': 'Full house',
    'Poker': 'Poker',
    'Escalera de color': 'Escalera de color',
    'Split': 'Split'
  };
  const TYPE_SHORT_LABELS = {
    'Carta alta': 'C. Alta',
    'Pareja': '1 Par',
    'Doble pareja': '2 Pares',
    'Trio': 'Trio',
    'Escalera': 'Escala',
    'Color': 'Color',
    'Full house': 'Full',
    'Poker': 'Poker',
    'Escalera de color': 'Esc. Col.'
  };
  const TYPE_ORDER = [
    'Escalera de color',
    'Poker',
    'Full house',
    'Color',
    'Escalera',
    'Trio',
    'Doble pareja',
    'Pareja',
    'Carta alta',
    'Split'
  ];
  const COLOR_LABELS = {
    mono: 'Monocolor',
    four: '4 colores',
    bicolor: 'Bicolor',
    random: 'Random atencion'
  };

  function renderPanel(panel, H, tabs) {
    const s = Duel.state;
    if (tabs) panel.appendChild(tabs);
    const card = H.el('section', 'workspace-card');
    card.appendChild(H.el('h2', 'sim-config-title', 'Hero vs Villain'));
    card.appendChild(H.hint('Elige quien gana con el board completo. Los ojos muestran cartas usadas reales.'));
    card.dataset.help = 'Showdown genera un board completo y dos manos. Tu tarea es decidir si gana Hero, Villain o si hay split.';
    panel.appendChild(card);

    const cfg = H.el('section', 'workspace-card');
    cfg.appendChild(H.el('div', 'panel-group-title', 'Posiciones'));
    const positionRow = H.el('div', 'sim-duel-select-row');
    const heroSelect = H.selectGroup('Hero', selectableOptions(s.config.villainPosition), s.config.heroPosition,
      value => Duel.setPosition('hero', value));
    heroSelect.dataset.help = 'Cambia la posicion nominal de Hero para el siguiente duelo. La mano actual no se regenera.';
    const villainSelect = H.selectGroup('Villain', selectableOptions(s.config.heroPosition), s.config.villainPosition,
      value => Duel.setPosition('villain', value));
    villainSelect.dataset.help = 'Cambia la posicion nominal de Villain para el siguiente duelo. Hero y Villain nunca comparten posicion.';
    positionRow.appendChild(heroSelect);
    positionRow.appendChild(villainSelect);
    cfg.appendChild(positionRow);
    const colorGroup = H.selectGroup('Color cartas', COLOR_OPTIONS,
      s.config.cardColorMode || 'bicolor', value => Duel.setCardColorMode(value));
    colorGroup.dataset.help = 'Solo cambia la lectura visual de las cartas. No afecta palos reales, ranking, ganador ni cartas muertas.';
    cfg.appendChild(colorGroup);
    cfg.appendChild(H.group('Ronda', [
      H.button('Nuevo duelo', { variant: 'btn-primary', onClick: () => Duel.nextRound() }),
      H.button('Reset stats', { variant: 'btn-ghost', onClick: () => Duel.resetStats() })
    ]));
    panel.appendChild(cfg);

    const filters = H.el('section', 'workspace-card sim-duel-filter-card');
    filters.dataset.help = 'Configura que jugadas puede recibir cada lado desde el proximo duelo.';
    filters.appendChild(renderFilterMatrix(H));
    panel.appendChild(filters);
  }

  function selectableOptions(otherValue) {
    return POS_OPTIONS.map((option) => Object.assign({}, option, {
      disabled: option.id !== 'random' && otherValue !== 'random' && option.id === otherValue
    }));
  }

  function renderFilterMatrix(H) {
    const wrap = H.el('div', 'sim-duel-matrix');
    const header = H.el('div', 'sim-duel-matrix-head');
    ['', 'H', 'V', 'All', 'X'].forEach(label => header.appendChild(H.el('span', '', label)));
    wrap.appendChild(header);
    TYPE_ORDER.filter(type => Engine.FILTER_TYPES.includes(type)).forEach((type) => {
      const selected = Duel.matrixSelection(type);
      const row = H.el('div', 'sim-duel-matrix-row');
      row.appendChild(H.el('span', 'sim-duel-matrix-label', TYPE_LABELS[type] || type));
      ['hero', 'villain', 'both'].forEach((target) => {
        row.appendChild(matrixToggle(H, type, target, selected === target));
      });
      row.appendChild(matrixToggle(H, type, 'none', !Duel.matrixSelection(type)));
      wrap.appendChild(row);
    });
    return wrap;
  }

  function matrixToggle(H, type, target, active) {
    const label = target === 'hero' ? 'H' : (target === 'villain' ? 'V' : (target === 'both' ? 'All' : 'X'));
    const button = H.el('button', 'sim-duel-dot' + (active ? ' is-active' : '') + (target === 'none' ? ' is-exclude' : ''));
    button.type = 'button';
    button.setAttribute('aria-label', `${label} ${type}`);
    button.title = `${label} ${type}`;
    button.dataset.help = target === 'none'
      ? `Excluye ${type} para Hero y Villain desde el siguiente duelo.`
      : `${label}: permite ${type} ${target === 'hero' ? 'solo en Hero' : (target === 'villain' ? 'solo en Villain' : 'en cualquiera de los dos')}.`;
    button.addEventListener('click', () => Duel.setMatrixSelection(type, target));
    return button;
  }

  function renderStage(stage, H) {
    Duel.ensureRound();
    const s = Duel.state;
    const round = s.round;
    stage.innerHTML = '';
    const wrap = H.el('div', 'sim-play sim-duel-play');

    const dash = H.el('div', 'sim-dash');
    const main = H.el('div', 'sim-main sim-duel-main');
    main.appendChild(renderDuelTable(H, round, Duel.usedCodesForReveal()));
    main.appendChild(renderDecisionZone(H, s));
    dash.appendChild(main);
    wrap.appendChild(dash);
    stage.appendChild(wrap);
  }

  function renderDuelTable(H, round, usedCodes) {
    const table = H.el('div', 'sim-table sim-duel-table is-fixed');
    const felt = H.el('div', 'sim-felt');
    const center = H.el('div', 'sim-center sim-duel-center');
    center.appendChild(H.el('div', 'sim-table-spot', `${round.heroPosition} vs ${round.villainPosition}`));
    const boardHead = H.el('div', 'sim-duel-board-head');
    boardHead.appendChild(H.el('span', 'sim-pot-label', 'Board'));
    boardHead.appendChild(eyeButton(H, 'winner', 'Mostrar jugada ganadora'));
    center.appendChild(boardHead);
    const board = H.el('div', 'sim-board sim-duel-board');
    round.board.forEach(card => board.appendChild(renderCard(H, card, usedCodes)));
    center.appendChild(board);
    center.appendChild(H.el('div', 'sim-seat-action is-decide', round.winner === 'split' ? 'Split posible' : 'Elige ganador'));
    felt.appendChild(center);
    felt.appendChild(exportButton(H));

    const roles = Duel.tableRoles(round);
    seatAssignments(round).forEach((position, index) => {
      const cards = position === round.heroPosition ? round.hero
        : (position === round.villainPosition ? round.villain : null);
      const seat = renderSeat(H, {
        position,
        index,
        cards,
        usedCodes,
        isHero: position === round.heroPosition,
        isVillain: position === round.villainPosition,
        isFolded: position !== round.heroPosition && position !== round.villainPosition,
        isDealer: position === roles.dealer,
        isSb: position === roles.sb,
        isBb: position === roles.bb
      });
      felt.appendChild(seat);
    });
    table.appendChild(felt);
    return table;
  }

  function seatAssignments(round) {
    const fixedHeroSlot = 4;
    const seats = new Array(Engine.POSITIONS.length);
    const heroIndex = Engine.POSITIONS.indexOf(round.heroPosition);
    const anchorIndex = heroIndex >= 0 ? heroIndex : 0;
    Engine.POSITIONS.forEach((position, index) => {
      const offset = (index - anchorIndex + Engine.POSITIONS.length) % Engine.POSITIONS.length;
      seats[(fixedHeroSlot + offset) % Engine.POSITIONS.length] = position;
    });
    return seats;
  }

  function renderSeat(H, options) {
    const { position, index, cards, usedCodes, isHero, isVillain, isFolded, isDealer, isSb, isBb } = options;
    const seat = H.el('div', `sim-seat sim-seat-slot-${index}` +
      (isHero ? ' is-hero' : '') + (isVillain ? ' is-active' : '') + (isFolded ? ' is-folded' : ''));
    const head = H.el('div', 'sim-seat-head');
    head.appendChild(H.el('span', 'sim-seat-pos', position));
    if (isHero) head.appendChild(H.el('span', 'sim-seat-hero', 'Hero'));
    if (isVillain) head.appendChild(H.el('span', 'sim-seat-hero sim-seat-villain', 'Villain'));
    seat.appendChild(head);
    seat.appendChild(H.el('div', 'sim-seat-stack', '100 bb'));
    const hole = H.el('div', 'sim-hole-cards seat-cards sim-hand-sm');
    if (cards) cards.forEach(card => hole.appendChild(renderCard(H, card, usedCodes)));
    else {
      hole.appendChild(H.el('span', 'sim-card-back'));
      hole.appendChild(H.el('span', 'sim-card-back'));
    }
    seat.appendChild(hole);
    seat.appendChild(H.el('div', 'sim-seat-action', cards ? 'En duelo' : 'Espera'));
    if (isDealer) seat.appendChild(H.el('span', 'sim-seat-marker is-dealer', 'D'));
    if (isSb) seat.appendChild(blindMarker(H, 'SB'));
    if (isBb) seat.appendChild(blindMarker(H, 'BB'));
    if (isHero) seat.appendChild(eyeButton(H, 'hero', 'Mostrar jugada Hero'));
    if (isVillain) seat.appendChild(eyeButton(H, 'villain', 'Mostrar jugada Villain'));
    const revealName = revealedHandName(isHero, isVillain);
    if (revealName) seat.appendChild(H.el('div', 'sim-duel-hand-name', revealName));
    return seat;
  }

  function revealedHandName(isHero, isVillain) {
    const round = Duel.state.round;
    if (!round) return '';
    if (isHero && Duel.state.revealSide === 'hero') return round.heroBest.type;
    if (isVillain && Duel.state.revealSide === 'villain') return round.villainBest.type;
    return '';
  }

  function blindMarker(H, type) {
    const marker = H.el('span', `sim-seat-marker is-blind is-${type.toLowerCase()}`);
    marker.setAttribute('aria-label', type === 'SB' ? 'Ciega pequena' : 'Ciega grande');
    const chipCount = type === 'SB' ? 1 : 2;
    for (let i = 0; i < chipCount; i++) marker.appendChild(H.el('span', 'sim-blind-chip'));
    return marker;
  }

  function renderCard(H, card, usedCodes) {
    const color = Duel.cardColor(card);
    const el = H.el('span', 'sim-card sim-duel-card sim-card-color-' + color +
      (usedCodes && usedCodes.has(card.code) ? ' is-used' : ''));
    el.textContent = Engine.cardLabel(card);
    el.title = Engine.cardLongLabel(card);
    return el;
  }

  function eyeButton(H, side, title) {
    const button = H.el('button', 'sim-duel-eye' + (Duel.state.revealSide === side ? ' is-active' : ''));
    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.dataset.help = side === 'winner'
      ? 'Muestra las cartas usadas por la jugada ganadora. En split marca las mejores cartas de ambos.'
      : `Muestra las cinco cartas reales usadas por ${side === 'hero' ? 'Hero' : 'Villain'} y el nombre de su jugada.`;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>';
    button.addEventListener('click', () => Duel.reveal(side));
    return button;
  }

  function exportButton(H) {
    const button = H.el('button', 'sim-duel-export');
    button.type = 'button';
    button.textContent = 'Export';
    button.dataset.help = 'Copia la mano actual con posiciones, matriz, cartas, ganador, jugadas y cartas usadas reales.';
    button.addEventListener('click', () => Duel.exportRound());
    return button;
  }

  function renderDecisionZone(H, s) {
    const zone = H.el('div', 'sim-zone sim-duel-zone');
    const row = H.el('div', 'sim-decisions');
    [
      ['hero', 'Hero'],
      ['split', 'Split'],
      ['villain', 'Villain']
    ].forEach(([id, label], index) => {
      const b = H.button(label, {
        variant: id === s.selected ? 'btn-primary' : 'btn-decision',
        onClick: () => Duel.answer(id)
      });
      b.appendChild(H.el('span', 'sim-key-hint', String(index + 1)));
      if (s.phase === 'feedback') b.disabled = true;
      row.appendChild(b);
    });
    zone.appendChild(row);
    if (s.phase === 'feedback') {
      const result = H.el('div', 'sim-duel-feedback ' + (s.selected === s.round.winner ? 'is-ok' : 'is-error'));
      result.appendChild(H.el('strong', '', s.feedback));
      result.appendChild(H.el('span', '', Duel.revealExplanation()));
      result.appendChild(H.el('span', '', `Hero: ${s.round.heroBest.label} · Villain: ${s.round.villainBest.label}`));
      const controls = H.el('div', 'sim-duel-feedback-controls');
      const seconds = Math.max(0, Math.ceil((s.reviewRemaining || 0) / 1000));
      controls.appendChild(H.el('span', 'sim-duel-feedback-timer',
        s.reviewPaused ? 'Pausado' : `Siguiente en ${seconds}s`));
      controls.appendChild(H.button(s.reviewPaused ? 'Continuar' : 'Pausa', {
        variant: 'btn-ghost',
        onClick: () => s.reviewPaused ? Duel.resumeReview() : Duel.pauseReview()
      }));
      controls.appendChild(H.button('Siguiente', {
        variant: 'btn-primary',
        onClick: () => Duel.skipReview()
      }));
      result.appendChild(controls);
      zone.appendChild(result);
    }
    return zone;
  }

  function renderInsights(aside, H) {
    const s = Duel.state;
    const stats = s.stats;
    aside.appendChild(H.dashPanel('Distribucion preparada', (body) => {
      body.appendChild(renderDistribution(H));
    }));
    aside.appendChild(H.dashPanel('Estadisticas', (body) => {
      body.appendChild(renderStatsGrid(H, stats));
    }));
  }

  function renderGallery(root, H) {
    if (!root) return;
    root.innerHTML = '';
    root.hidden = false;
    if (root.classList) root.classList.add('sim-duel-preset-gallery');

    const presets = Duel.presets();
    const head = H.el('div', 'range-gallery-head');
    const heading = H.el('div', 'range-gallery-heading');
    heading.appendChild(H.el('span', 'range-gallery-kicker', 'Dificultad Showdown'));
    heading.appendChild(H.el('span', 'range-gallery-count', `${presets.length} niveles`));
    head.appendChild(heading);
    const note = H.el('div', 'range-gallery-actions sim-duel-preset-note',
      'Los cambios preparan el siguiente duelo');
    head.appendChild(note);
    root.appendChild(head);

    const track = H.el('div', 'range-gallery-track sim-duel-preset-track');
    presets.forEach((preset) => {
      const status = Duel.presetStatus(preset.id);
      const active = status === 'active' || status === 'edited';
      const card = H.el('button', 'range-card sim-duel-preset-card' +
        (active ? ' is-active' : '') + (status === 'edited' ? ' is-edited' : ''));
      card.type = 'button';
      card.dataset.help = presetHelp(preset, status);
      card.setAttribute('aria-pressed', String(active));
      if (active) card.setAttribute('aria-current', status === 'edited' ? 'step' : 'true');
      card.addEventListener('click', () => Duel.applyPreset(preset.id));

      const cardHead = H.el('div', 'range-card-head');
      cardHead.appendChild(H.el('strong', 'range-card-title', `Nivel ${preset.level}`));
      cardHead.appendChild(H.el('span', 'range-card-active',
        status === 'edited' ? 'Editado' : (status === 'active' ? 'Activo' : '')));
      card.appendChild(cardHead);
      card.appendChild(H.el('strong', 'sim-duel-preset-name', preset.shortTitle || preset.title));
      card.appendChild(H.el('span', 'sim-duel-preset-description', preset.goal));
      card.appendChild(H.el('span', 'sim-duel-preset-color', COLOR_LABELS[preset.colorMode] || preset.colorMode));
      card.appendChild(H.el('span', 'sim-duel-preset-summary', presetSummary(preset)));
      track.appendChild(card);
    });
    root.appendChild(track);
  }

  function presetSummary(preset) {
    const active = TYPE_ORDER.filter(type => preset.matrix[type] && preset.matrix[type] !== 'none')
      .map(type => TYPE_SHORT_LABELS[type] || type);
    if (!active.length) return 'Sin jugadas activas';
    if (active.length > 5) return `${active.slice(0, 5).join(' · ')} +${active.length - 5}`;
    return active.join(' · ');
  }

  function presetHelp(preset, status) {
    const stateText = status === 'edited'
      ? 'Este nivel esta editado manualmente; se aplicara al siguiente duelo.'
      : 'Al pulsarlo prepara esta configuracion para el siguiente duelo sin cambiar la mano actual.';
    return `Nivel ${preset.level}: ${preset.title}. ${preset.goal} Color: ${COLOR_LABELS[preset.colorMode] || preset.colorMode}. Incluye: ${presetSummary(preset)}. ${stateText}`;
  }

  function renderDistribution(H) {
    const wrap = H.el('div', 'sim-duel-weight-panel');
    wrap.dataset.help = 'Distribucion efectiva preparada para Hero y Villain en el siguiente duelo.';
    wrap.appendChild(distributionColumn(H, 'Hero', 'hero'));
    wrap.appendChild(distributionColumn(H, 'Villain', 'villain'));
    const split = Duel.splitDistribution();
    const splitRow = H.el('div', 'sim-duel-split-weight',
      `Split: ${split.enabled ? 'permitido' : '0%'}`);
    wrap.appendChild(splitRow);
    return wrap;
  }

  function distributionColumn(H, title, side) {
    const col = H.el('div', 'sim-duel-weight-col');
    col.appendChild(H.el('strong', '', title));
    const items = Duel.sideDistribution(side);
    TYPE_ORDER.filter(type => type !== 'Split').forEach((type) => {
      const item = items.find(entry => entry.type === type);
      const row = H.el('div', 'sim-duel-weight-row' + (!item || !item.enabled ? ' is-off' : ''));
      row.appendChild(H.el('span', '', TYPE_SHORT_LABELS[type] || type));
      row.appendChild(H.el('b', '', item && item.enabled ? `${item.weight}%` : '0%'));
      col.appendChild(row);
    });
    return col;
  }

  function renderStatsGrid(H, stats) {
    const grid = H.el('div', 'sim-duel-stats-grid');
    [
      ['Manos', stats.handsPlayed],
      ['Aciertos', stats.correct],
      ['Errores', stats.wrong],
      ['Precision', `${Duel.precision()}%`],
      ['Racha', stats.currentStreak],
      ['Mejor', stats.bestStreak]
    ].forEach(([label, value]) => {
      const item = H.el('div', 'sim-duel-stat-tile');
      item.appendChild(H.el('span', '', label));
      item.appendChild(H.el('strong', '', value));
      grid.appendChild(item);
    });
    return grid;
  }

  function actionBarItems(H) {
    const s = Duel.state;
    const items = [];
    if (s.phase === 'question') {
      items.push(H.button('Hero', { key: '1', onClick: () => Duel.answer('hero') }));
      items.push(H.button('Split', { key: '2', onClick: () => Duel.answer('split') }));
      items.push(H.button('Villain', { key: '3', onClick: () => Duel.answer('villain') }));
    }
    return items;
  }

  function handleKey(key) {
    const k = key.toLowerCase();
    if (k === '1') { Duel.answer('hero'); return true; }
    if (k === '2') { Duel.answer('split'); return true; }
    if (k === '3') { Duel.answer('villain'); return true; }
    if (k === 'n') { Duel.nextRound(); return true; }
    if (k === 'h') { Duel.reveal('hero'); return true; }
    if (k === 'v') { Duel.reveal('villain'); return true; }
    if (k === 'j') { Duel.reveal('winner'); return true; }
    return false;
  }

  RT.SimulatorDuelHandsUI = {
    renderPanel,
    renderStage,
    renderInsights,
    renderGallery,
    actionBarItems,
    handleKey
  };
})(window.RT);
