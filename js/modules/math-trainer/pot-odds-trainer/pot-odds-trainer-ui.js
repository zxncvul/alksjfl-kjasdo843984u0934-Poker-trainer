'use strict';

(function (RT) {
  const MODE_LABELS = {
    'outs-basic': 'Outs basicos',
    duel: 'Duel Odds',
    identify: 'Identificar',
    ranking: 'Ranking'
  };
  const ZONE_LABELS = {
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    hero: 'Heroe'
  };
  const LAB_SECTIONS = {
    hero: 'Hero',
    villain: 'Villain',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River'
  };

  function create(store, engine, renderTabs) {
    let hosts = null;
    let unsubscribe = null;
    let activeInput = 'needed';

    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }

    function button(label, onClick, options) {
      const config = options || {};
      const element = node('button',
        `btn pot-odds-trainer-btn ${config.className || ''}`.trim(), label);
      element.type = 'button';
      element.disabled = !!config.disabled;
      element.classList.toggle('is-active', !!config.active);
      element.classList.toggle('btn-primary', !!config.primary);
      if (config.title) element.title = config.title;
      element.addEventListener('click', onClick);
      return element;
    }

    function group(title, className) {
      const root = node('section', `panel-group ${className || ''}`.trim());
      root.appendChild(node('div', 'panel-group-title', title));
      const body = node('div', 'pot-odds-trainer-controls');
      root.appendChild(body);
      return { root, body };
    }

    function setConfig(key, value, startRound) {
      store.state.config[key] = value;
      if (startRound && store.state.session.spot) engine.next();
      else engine.configChanged();
    }

    function toggleSet(set, value) {
      if (set.has(value)) set.delete(value);
      else set.add(value);
      engine.configChanged();
    }

    function renderPanel() {
      const panel = hosts.panel;
      const state = store.state;
      panel.innerHTML = '';
      panel.className = 'panel math-trainer-panel pot-odds-trainer-panel';
      if (renderTabs) panel.appendChild(renderTabs());

      const summary = node('section', 'workspace-card pot-odds-trainer-summary');
      const head = node('div', 'workspace-head');
      head.appendChild(node('span', 'workspace-eyebrow', 'Pot Odds Trainer'));
      head.appendChild(node('span', `pot-odds-trainer-phase phase-${state.phase}`,
        !state.session.spot ? 'Laboratorio' :
          state.phase === 'question' ? 'En ronda' :
          state.phase === 'correct' ? 'Correcto' :
            state.phase === 'error' ? 'Error' : 'Preparado'));
      summary.appendChild(head);
      summary.appendChild(node('div', 'context-main',
        state.session.spot ? MODE_LABELS[state.config.mode] : 'Laboratorio'));
      summary.appendChild(node('div', 'context-sub',
        state.session.spot ? state.feedback : 'Construye Hero, Villain y board manualmente.'));
      panel.appendChild(summary);

      const dual = group('Modo', 'pot-odds-trainer-dual-mode');
      dual.body.appendChild(button('Laboratorio', engine.stop, {
        active: !state.session.spot
      }));
      dual.body.appendChild(button('Ejercicio', engine.next, {
        active: !!state.session.spot,
        primary: !state.session.spot
      }));
      panel.appendChild(dual.root);

      const modes = group('Ejercicio', 'pot-odds-trainer-modes');
      Object.entries(MODE_LABELS).forEach(([id, label]) => {
        modes.body.appendChild(button(label, () => engine.setMode(id),
          { active: state.config.mode === id }));
      });
      panel.appendChild(modes.root);

      const streets = group('Calle');
      [['flop', 'Flop'], ['turn', 'Turn'], ['mixed', 'Mixto']]
        .forEach(([id, label]) => streets.body.appendChild(button(label,
          () => setConfig('street', id, true), { active: state.config.street === id })));
      panel.appendChild(streets.root);

      const timing = group('Tiempo y memoria', 'pot-odds-trainer-timing');
      [0, 5, 10, 15, 30].forEach(seconds => timing.body.appendChild(button(
        seconds ? `${seconds}s` : 'Sin limite',
        () => setConfig('countdown', seconds, false),
        { active: state.config.countdown === seconds })));
      [0, 1, 2, 5, 10].forEach(seconds => timing.body.appendChild(button(
        seconds ? `Mem ${seconds}s` : 'Mem off',
        () => setConfig('memoryDuration', seconds, false),
        { active: state.config.memoryDuration === seconds })));
      panel.appendChild(timing.root);

      const memory = group('Zonas de memoria', 'pot-odds-trainer-memory');
      Object.entries(ZONE_LABELS).forEach(([id, label]) => {
        memory.body.appendChild(button(label, () => toggleSet(state.config.memoryZones, id),
          { active: state.config.memoryZones.has(id) }));
      });
      [0, 1, 2, 3].forEach(amount => {
        memory.body.appendChild(button(amount ? `Rnd ${amount}` : 'Rnd off', () => {
          state.config.memoryRandomCount = amount;
          engine.configChanged();
        }, { active: state.config.memoryRandomCount === amount }));
      });
      panel.appendChild(memory.root);

      const suits = group('Palos');
      [['rainbow', 'Rainbow'], ['paired', 'Pair'], ['mono', 'Mono'], ['random', 'Random']]
        .forEach(([id, label]) => suits.body.appendChild(button(label,
          () => setConfig('suitMode', id, true), { active: state.config.suitMode === id })));
      panel.appendChild(suits.root);

      const locks = group('Bloqueos');
      locks.body.appendChild(button('Board', () =>
        setConfig('boardLocked', !state.config.boardLocked, false),
      { active: state.config.boardLocked }));
      locks.body.appendChild(button('Escenario', () =>
        setConfig('scenarioLocked', !state.config.scenarioLocked, false),
      { active: state.config.scenarioLocked }));
      panel.appendChild(locks.root);

      const transport = group('Ronda', 'pot-odds-trainer-transport');
      transport.body.appendChild(button(state.session.spot ? 'Siguiente' : 'Comenzar',
        engine.next, { primary: true }));
      transport.body.appendChild(button('Random Spot', engine.labRandomSpot));
      transport.body.appendChild(button('Export', engine.exportSpot));
      transport.body.appendChild(button(state.session.reveal ? 'Ocultar' : 'Reveal',
        engine.toggleReveal));
      panel.appendChild(transport.root);

      const hidden = group('Ocultar calculo');
      [
        ['ratio', 'Ratio'],
        ['needed', 'Necesaria'],
        ['turn', 'Turn'],
        ['river', 'River'],
        ['result', 'Resultado']
      ].forEach(([id, label]) => hidden.body.appendChild(button(label,
        () => engine.toggleHiddenField(id),
        { active: state.config.hiddenFields.has(id) })));
      panel.appendChild(hidden.root);
    }

    function cardNode(card, extraClass) {
      const root = node('span', `pot-card ${extraClass || ''}`.trim());
      if (!card) {
        root.textContent = '--';
        return root;
      }
      root.dataset.suit = card[1];
      root.appendChild(node('strong', '', card[0]));
      root.appendChild(node('span', '', card[1]));
      return root;
    }

    function renderCards(cards, zone) {
      const state = store.state;
      const detail = state.session.revealDetail;
      const currentAnalysis = state.session.revealHand && !state.session.reveal &&
        state.session.spot
        ? engine.analyzeBestHand(
          state.session.spot.hero.concat(state.session.spot.board)
        )
        : null;
      const strongCards = new Set(
        detail && detail.isCorrect
          ? detail.highlightStrong || []
          : currentAnalysis ? currentAnalysis.highlightStrong : []
      );
      const kickerCards = new Set(
        detail && detail.isCorrect
          ? detail.highlightKicker || []
          : currentAnalysis ? currentAnalysis.highlightKicker : []
      );
      const root = node('div', `pot-card-row pot-zone-${zone}`);
      if (state.session.hiddenZones.has(zone)) {
        const hidden = button(`${ZONE_LABELS[zone]} oculto`, () => engine.revealZone(zone),
          { className: 'pot-zone-hidden' });
        root.appendChild(hidden);
        return root;
      }
      cards.forEach(card => {
        const classes = [];
        if (strongCards.has(card)) classes.push('is-hand-hint');
        if (kickerCards.has(card)) classes.push('is-hand-kicker');
        if (detail && detail.card === card) classes.push('is-temporary-out');
        root.appendChild(cardNode(card, classes.join(' ')));
      });
      return root;
    }

    function appendInput(root, field, label, suffix) {
      const state = store.state;
      const hidden = state.config.hiddenFields.has(field);
      const fieldRoot = button('', () => {
        activeInput = field;
        renderCenter();
      }, {
        className: `pot-equity-field${activeInput === field ? ' is-active' : ''}`
      });
      fieldRoot.textContent = '';
      fieldRoot.appendChild(node('span', 'pot-equity-label', label));
      fieldRoot.appendChild(node('strong', 'pot-equity-value',
        hidden ? 'OCULTO' : `${state.session.inputs[field] || '--'}${suffix || ''}`));
      root.appendChild(fieldRoot);
    }

    function keypadValue(value) {
      const state = store.state;
      if (!state.session.spot && ['pot', 'bet'].includes(activeInput)) {
        const current = String(state.lab.scenario[activeInput] || '');
        if (value === 'clear') engine.labSetScenario(activeInput, 0);
        else if (value === 'back') engine.labSetScenario(activeInput, current.slice(0, -1) || 0);
        else if (value === 'submit') engine.exportSpot();
        else engine.labSetScenario(activeInput, current + value);
        return;
      }
      const current = state.session.inputs[activeInput] || '';
      if (value === 'clear') engine.input(activeInput, '');
      else if (value === 'back') engine.input(activeInput, current.slice(0, -1));
      else if (value === 'submit') engine.validate(true);
      else engine.input(activeInput, current + value);
    }

    function renderKeypad() {
      const keypad = node('div', 'pot-odds-trainer-keypad');
      [
        ['7','7'], ['8','8'], ['9','9'],
        ['4','4'], ['5','5'], ['6','6'],
        ['1','1'], ['2','2'], ['3','3'],
        ['0','0'], ['.','.'], ['%', '%'],
        [':',':'], ['CLR','clear'], ['DEL','back'],
        ['ENTER','submit']
      ].forEach(([label, value]) => {
        keypad.appendChild(button(label, () => keypadValue(value),
          { className: value === 'submit' ? 'is-submit' : '' }));
      });
      return keypad;
    }
    function metricValue(value, suffix, hidden) {
      if (hidden) return 'OCULTO';
      if (value === null || value === undefined || value === '') return '--';
      return `${value}${suffix || ''}`;
    }
    function technicalField(label, value, onCommit, options) {
      const config = options || {};
      const root = node('label', 'pot-technical-field');
      if (config.inputKey && activeInput === config.inputKey) {
        root.classList.add('is-active');
      }
      root.appendChild(node('span', 'pot-equity-label', label));
      if (onCommit && !config.hidden) {
        const input = node('input', 'pot-technical-input');
        input.value = value;
        if (config.inputKey) {
          input.addEventListener('focus', () => { activeInput = config.inputKey; });
        }
        input.addEventListener('change', () => onCommit(input.value));
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') input.blur();
        });
        root.appendChild(input);
      } else {
        root.appendChild(node('strong', 'pot-equity-value',
          config.hidden ? 'OCULTO' : String(value)));
      }
      return root;
    }
    function renderScenarioFields(spot) {
      const state = store.state;
      const analysis = engine.analyzeSpot(spot.hero, spot.board, spot.scenario);
      const math = analysis.math;
      const scenario = node('div', 'pot-odds-trainer-scenario');
      scenario.appendChild(technicalField('Bote', math.pot,
        value => engine.setExerciseScenario('pot', value)));
      scenario.appendChild(technicalField('Apuesta', math.bet,
        value => engine.setExerciseScenario('bet', value)));
      scenario.appendChild(technicalField(
        state.config.displayMode === 'ratio'
          ? 'Ratio'
          : 'Equity por outs',
        state.config.displayMode === 'ratio'
          ? engine.formatRatio(math.ratio)
          : engine.formatPercent(math.needed),
        null, { hidden: state.config.hiddenFields.has('ratio') }));
      return scenario;
    }
    function appendMetric(root, field, label, value, suffix) {
      const state = store.state;
      const hidden = state.config.hiddenFields.has(field);
      const fieldRoot = button('', () => {
        activeInput = field;
        renderCenter();
      }, {
        className: `pot-equity-field${activeInput === field ? ' is-active' : ''}`
      });
      fieldRoot.textContent = '';
      fieldRoot.appendChild(node('span', 'pot-equity-label', label));
      fieldRoot.appendChild(node('strong', 'pot-equity-value',
        metricValue(value, suffix, hidden)));
      root.appendChild(fieldRoot);
    }
    function expectedPositiveOuts(outs) {
      if (!outs) return [];
      if (outs.hasVillain) return outs.positive || [];
      return outs.useful && outs.useful.length ? outs.useful : outs.clean || [];
    }
    function expectedNegativeOuts(outs) {
      return outs && outs.hasVillain ? outs.negative : [];
    }
    function displayPercent(value) {
      return value === null || value === undefined ? 'N/A' : engine.formatPercent(value);
    }

    function renderOutGrid() {
      const state = store.state;
      const spot = state.session.spot;
      const root = node('div', 'pot-odds-trainer-out-grid');
      const analysis = engine.analyzeSpot(spot.hero, spot.board, spot.scenario);
      const used = new Set(analysis.outs.deadCards);
      const expectedPositive = new Set(expectedPositiveOuts(analysis.outs));
      const expectedNegative = new Set(expectedNegativeOuts(analysis.outs));
      const expected = new Set(expectedPositiveOuts(analysis.outs)
        .concat(expectedNegativeOuts(analysis.outs)));
      const detail = state.session.revealDetail;
      const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
      const suits = ['\u2660','\u2665','\u2666','\u2663'];
      suits.forEach(suit => ranks.forEach(rank => {
        const card = rank + suit;
        const selectedPositive = state.session.selectedPositive.has(card);
        const selectedNegative = state.session.selectedNegative.has(card);
        const selectedCorrectly =
          (selectedPositive && expectedPositive.has(card)) ||
          (selectedNegative && expectedNegative.has(card));
        const selectedIncorrectly =
          (selectedPositive || selectedNegative) && !selectedCorrectly;
        const showHints = state.session.reveal || state.session.revealOuts;
        const showValidation = state.session.roundRecorded;
        const revealedPositive = showHints && expectedPositive.has(card);
        const revealedNegative = showHints && expectedNegative.has(card);
        const cell = button('', () => {
          if (state.session.reveal) engine.explainOut(card);
          else engine.toggleOut(card);
        }, {
          disabled: used.has(card),
          className: 'pot-out-cell'
        });
        cell.textContent = '';
        cell.appendChild(cardNode(card));
        cell.classList.toggle('is-positive', selectedPositive || revealedPositive);
        cell.classList.toggle('is-negative', selectedNegative || revealedNegative);
        cell.classList.toggle('is-out-hint',
          showHints && expected.has(card));
        cell.classList.toggle('is-out-selected',
          selectedPositive || selectedNegative);
        cell.classList.toggle('is-out-correct',
          showValidation && selectedCorrectly);
        cell.classList.toggle('is-out-error',
          showValidation && selectedIncorrectly);
        cell.classList.toggle('is-out-missed',
          (state.session.reveal || showValidation) &&
          expected.has(card) && !selectedCorrectly);
        cell.classList.toggle('is-clicked-out',
          !!detail && detail.card === card);
        cell.classList.toggle('is-used', used.has(card));
        root.appendChild(cell);
      }));
      return root;
    }

    function renderLabSlot(section, index) {
      const state = store.state;
      const displayCards = labDisplayCards(section);
      const card = displayCards[index];
      const active = state.lab.activeSlot.section === section &&
        state.lab.activeSlot.index === index;
      const activeAnalysis = labActiveHandAnalysis();
      const strongCards = new Set(activeAnalysis ? activeAnalysis.highlightStrong || [] : []);
      const kickerCards = new Set(activeAnalysis ? activeAnalysis.highlightKicker || [] : []);
      const classes = [];
      if (strongCards.has(card)) classes.push('is-hand-hint');
      if (kickerCards.has(card)) classes.push('is-hand-kicker');
      if (state.session.revealDetail && state.session.revealDetail.card === card) {
        classes.push('is-temporary-out');
      }
      if (active && card) classes.push('is-active-card');
      const slot = button('', () => engine.labSelectSlot(section, index), {
        className: 'pot-lab-slot',
        active
      });
      slot.appendChild(cardNode(card, classes.join(' ')));
      return slot;
    }
    function labDisplayCards(section) {
      const state = store.state;
      const detailBoard = state.session.revealDetail &&
        state.session.revealDetail.board;
      if (!detailBoard || !['flop', 'turn', 'river'].includes(section)) {
        return state.lab[section];
      }
      if (section === 'flop') return detailBoard.slice(0, 3);
      if (section === 'turn') return [detailBoard[3] || state.lab.turn[0]];
      return [detailBoard[4] || state.lab.river[0]];
    }
    function labActiveHandAnalysis() {
      const state = store.state;
      const detail = state.session.revealDetail;
      if (detail && detail.isCorrect) return detail;
      if (!state.session.revealHand || state.session.reveal) return null;
      const analysis = engine.labAnalysis();
      return analysis.current;
    }
    function renderLabRow(section) {
      const state = store.state;
      const row = node('div', `pot-lab-row pot-lab-${section}`);
      const label = node('span', 'pot-row-label', LAB_SECTIONS[section]);
      row.appendChild(label);
      const cards = node('div', 'pot-card-row');
      state.lab[section].forEach((_, index) =>
        cards.appendChild(renderLabSlot(section, index)));
      row.appendChild(cards);
      row.appendChild(button('Rnd', () => engine.labRandomSection(section), {
        className: 'pot-lab-random',
        title: `Random ${LAB_SECTIONS[section]}`
      }));
      return row;
    }
    function renderLabSpot() {
      const spot = node('div', 'pot-lab-spot');
      const board = node('div', 'pot-lab-board-line');
      const flop = node('div', 'pot-lab-mini-section pot-lab-mini-flop');
      flop.appendChild(node('span', 'pot-row-label', 'flop'));
      const flopCards = node('div', 'pot-card-row');
      store.state.lab.flop.forEach((_, index) =>
        flopCards.appendChild(renderLabSlot('flop', index)));
      flop.appendChild(flopCards);
      flop.appendChild(button('Rnd', () => engine.labRandomSection('flop'), {
        className: 'pot-lab-random',
        title: 'Random Flop'
      }));
      board.appendChild(flop);
      ['turn', 'river'].forEach(section => {
        const mini = node('div', `pot-lab-mini-section pot-lab-mini-${section}`);
        mini.appendChild(node('span', 'pot-row-label', section));
        const cards = node('div', 'pot-card-row');
        cards.appendChild(renderLabSlot(section, 0));
        mini.appendChild(cards);
        mini.appendChild(button('Rnd', () => engine.labRandomSection(section), {
          className: 'pot-lab-random',
          title: `Random ${LAB_SECTIONS[section]}`
        }));
        board.appendChild(mini);
      });
      spot.appendChild(board);

      const players = node('div', 'pot-lab-player-line');
      ['hero', 'villain'].forEach(section => {
        const mini = node('div', `pot-lab-mini-section pot-lab-mini-${section}`);
        mini.appendChild(node('span', 'pot-row-label', LAB_SECTIONS[section]));
        const cards = node('div', 'pot-card-row');
        store.state.lab[section].forEach((_, index) =>
          cards.appendChild(renderLabSlot(section, index)));
        mini.appendChild(cards);
        mini.appendChild(button('Rnd', () => engine.labRandomSection(section), {
          className: 'pot-lab-random',
          title: `Random ${LAB_SECTIONS[section]}`
        }));
        players.appendChild(mini);
      });
      spot.appendChild(players);
      return spot;
    }
    function renderExerciseSpot(spot) {
      const root = node('div', 'pot-exercise-spot');
      const displayBoard = store.state.session.revealDetail &&
        store.state.session.revealDetail.board
        ? store.state.session.revealDetail.board
        : spot.board;
      const board = node('div', 'pot-exercise-board-line');
      const flop = node('div', 'pot-exercise-mini-section pot-exercise-mini-flop');
      flop.appendChild(node('span', 'pot-row-label', 'flop'));
      flop.appendChild(renderCards(displayBoard.slice(0, 3), 'flop'));
      board.appendChild(flop);
      if (displayBoard[3]) {
        const turn = node('div', 'pot-exercise-mini-section');
        turn.appendChild(node('span', 'pot-row-label', 'turn'));
        turn.appendChild(renderCards([displayBoard[3]], 'turn'));
        board.appendChild(turn);
      }
      if (displayBoard[4]) {
        const river = node('div', 'pot-exercise-mini-section');
        river.appendChild(node('span', 'pot-row-label', 'river'));
        river.appendChild(renderCards([displayBoard[4]], 'river'));
        board.appendChild(river);
      }
      root.appendChild(board);

      const hero = node('div', 'pot-exercise-player-line');
      const heroMini = node('div', 'pot-exercise-mini-section pot-exercise-mini-hero');
      heroMini.appendChild(node('span', 'pot-row-label', 'hero'));
      heroMini.appendChild(renderCards(spot.hero, 'hero'));
      hero.appendChild(heroMini);
      root.appendChild(hero);
      return root;
    }
    function renderLiveDeck() {
      const state = store.state;
      const root = node('div', 'pot-odds-trainer-out-grid pot-lab-deck');
      const analysis = engine.labAnalysis();
      const used = new Set(analysis.outs.deadCards);
      const expectedPositive = new Set(expectedPositiveOuts(analysis.outs));
      const expectedNegative = new Set(expectedNegativeOuts(analysis.outs));
      const expected = new Set(expectedPositiveOuts(analysis.outs)
        .concat(expectedNegativeOuts(analysis.outs)));
      const detail = state.session.revealDetail;
      ['\u2660','\u2665','\u2666','\u2663'].forEach(suit =>
        ['A','K','Q','J','T','9','8','7','6','5','4','3','2'].forEach(rank => {
          const card = rank + suit;
          const showHints = state.session.reveal || state.session.revealOuts;
          const cell = button('', () => {
            if (state.session.reveal) engine.explainOut(card);
            else engine.labPlaceCard(card);
          }, {
            disabled: used.has(card),
            className: 'pot-out-cell pot-lab-card'
          });
          cell.appendChild(cardNode(card));
          cell.classList.toggle('is-positive',
            showHints && expectedPositive.has(card));
          cell.classList.toggle('is-negative',
            showHints && expectedNegative.has(card));
          cell.classList.toggle('is-out-hint',
            showHints && expected.has(card));
          cell.classList.toggle('is-clicked-out',
            !!detail && detail.card === card);
          cell.classList.toggle('is-used', used.has(card));
          root.appendChild(cell);
        }));
      return root;
    }
    function exerciseAnalysis(spot) {
      return engine.analyzeSpot(spot.hero, spot.board, spot.scenario);
    }
    function renderMathLog(analysis) {
      const state = store.state;
      const math = analysis.math;
      const madeHand = analysis.mode === 'MADE_HAND_MODE';
      const root = node('div', 'pot-math-log');
      const pot = node('section', 'pot-math-block');
      pot.appendChild(node('strong', '', 'POT ODDS'));
      pot.appendChild(node('span', '', `Bote: ${math.pot}`));
      pot.appendChild(node('span', '', `Apuesta: ${math.bet}`));
      pot.appendChild(node('span', '', `Bote final: ${math.finalPot}`));
      pot.appendChild(node('span', '',
        `Equity necesaria: ${math.bet} / ${math.finalPot} = ${engine.formatPercent(math.needed)}`));
      const outs = node('section', 'pot-math-block');
      outs.appendChild(node('strong', '', madeHand ? 'MANO HECHA' : 'OUTS'));
      if (madeHand) {
        outs.appendChild(node('span', '',
          `Mano hecha: ${analysis.current ? analysis.current.handName : '--'}`));
        outs.appendChild(node('span', '', `Mejoras posibles: ${analysis.outs.clean.length}`));
        outs.appendChild(node('span', '', 'Decision por outs: N/A'));
      } else {
        outs.appendChild(node('span', '', `Proyecto: ${analysis.project}`));
        if (analysis.mode === 'RIVER_FINAL_MODE') {
          outs.appendChild(node('span', '', 'Equity futura: N/A'));
        } else {
          if (math.turn !== null) {
            outs.appendChild(node('span', '', `Turn: ${analysis.outs.useful.length} x 2 = ${engine.formatPercent(math.turn)}`));
          }
          if (math.river !== null) {
            outs.appendChild(node('span', '', `River: ${analysis.outs.useful.length} x ${analysis.board.length === 3 ? 4 : 2} = ${engine.formatPercent(math.river)}`));
          }
        }
      }
      outs.appendChild(node('span', '', `Limpias: ${analysis.outs.clean.length}`));
      outs.appendChild(node('span', '', `Marginales: ${analysis.outs.marginal.length}`));
      outs.appendChild(node('span', '', `Brutas: ${analysis.outs.raw.length}`));
      const result = node('section', 'pot-math-block');
      result.appendChild(node('strong', '', 'RESULTADO'));
      const resultLine = state.config.hiddenFields.has('result')
        ? 'OCULTO'
        : `${engine.formatPercent(math.equity)} ${math.equity >= math.needed ? '>=' : '<'} ` +
        `${engine.formatPercent(math.needed)} - ${math.action}`;
      const finalResult = analysis.showdown === null ? 'Sin Villain' :
        analysis.showdown > 0 ? 'Hero gana' :
          analysis.showdown < 0 ? 'Villain gana' : 'Empate';
      const stableResultLine = state.config.hiddenFields.has('result')
        ? resultLine
        : analysis.mode === 'RIVER_FINAL_MODE'
          ? `${analysis.current ? analysis.current.handName : 'Final'} - ${finalResult} - equity futura N/A`
          : analysis.mode === 'MADE_HAND_MODE'
            ? `Mano hecha: ${analysis.current.handName} | Decision por outs: N/A | Mejoras posibles: ${analysis.outs.clean.length}`
            : `${engine.formatPercent(math.equity)} ${math.equity >= math.needed ? '>=' : '<'} ` +
              `${engine.formatPercent(math.needed)} - ${math.action}`;
      result.appendChild(node('span', 'pot-result-line', stableResultLine));
      root.appendChild(pot);
      root.appendChild(outs);
      root.appendChild(result);
      return root;
    }
    function renderTopActions(isLab) {
      const state = store.state;
      const actions = node('div', 'pot-odds-trainer-top-actions');
      actions.appendChild(button('Random Spot', isLab ? engine.labRandomSpot : engine.next, {
        className: 'pot-odds-trainer-toolbar-btn'
      }));
      actions.appendChild(button('Export', engine.exportSpot, {
        className: 'pot-odds-trainer-toolbar-btn'
      }));
      actions.appendChild(button('Limpiar', isLab ? engine.labClear : engine.stop, {
        className: 'pot-odds-trainer-toolbar-btn'
      }));
      actions.appendChild(button('OUTS', engine.toggleOutHints, {
        active: state.session.revealOuts,
        disabled: state.session.reveal,
        title: 'Iluminar outs correctas',
        className: 'pot-odds-trainer-hint-btn'
      }));
      actions.appendChild(button('JUGADA', engine.toggleHandHint, {
        active: state.session.revealHand,
        disabled: state.session.reveal,
        title: 'Iluminar cartas de la mejor jugada',
        className: 'pot-odds-trainer-hint-btn'
      }));
      actions.appendChild(button(state.session.reveal ? 'Ocultar' : 'Reveal',
        engine.toggleReveal, { className: 'pot-odds-trainer-toolbar-btn' }));
      actions.appendChild(button(isLab ? 'Next' : 'Siguiente', engine.next, {
        primary: true,
        className: 'pot-odds-trainer-toolbar-btn'
      }));
      return actions;
    }
    function renderOutActions(includeDisplayMode) {
      const state = store.state;
      const actions = node('div', 'pot-odds-trainer-out-actions');
      const spot = state.session.spot;
      const analysis = spot ? exerciseAnalysis(spot) : engine.labAnalysis();
      const outSelectorsDisabled = analysis.mode === 'MADE_HAND_MODE' ||
        analysis.mode === 'RIVER_FINAL_MODE';
      actions.appendChild(button('Positivas', () => engine.setSelectionMode('positive'),
        {
          active: state.session.activeSelection === 'positive' && !outSelectorsDisabled,
          disabled: outSelectorsDisabled,
          title: outSelectorsDisabled ? 'N/A en este modo' : 'Seleccionar outs positivas'
        }));
      actions.appendChild(button('Negativas', () => engine.setSelectionMode('negative'),
        {
          active: state.session.activeSelection === 'negative' && !outSelectorsDisabled,
          disabled: outSelectorsDisabled,
          title: outSelectorsDisabled ? 'N/A en este modo' : 'Seleccionar outs negativas'
        }));
      if (includeDisplayMode) {
        actions.appendChild(button('%', () => engine.setDisplayMode('percent'), {
          active: state.config.displayMode === 'percent'
        }));
        actions.appendChild(button('Ratio', () => engine.setDisplayMode('ratio'), {
          active: state.config.displayMode === 'ratio'
        }));
      }
      return actions;
    }
    function renderFinalActions(isLab) {
      const state = store.state;
      const footer = node('section', 'pot-odds-trainer-footer');
      const canDecide = !!state.session.spot &&
        (state.config.mode === 'duel' || state.config.mode === 'outs-basic');
      footer.appendChild(button('CALL', () => engine.action('CALL'), {
        active: state.session.action === 'CALL',
        primary: canDecide && state.session.action === 'CALL',
        disabled: !canDecide
      }));
      footer.appendChild(button('FOLD', () => engine.action('FOLD'), {
        active: state.session.action === 'FOLD',
        disabled: !canDecide
      }));
      footer.appendChild(button(isLab ? 'Comenzar' : 'Comprobar',
        isLab ? engine.next : () => engine.validate(true), {
          primary: true,
          className: 'pot-odds-trainer-check'
        }));
      return footer;
    }
    function renderLabCenter(root, top) {
      const state = store.state;
      const analysis = engine.labAnalysis();
      const workspace = node('div', 'pot-odds-trainer-workspace pot-lab-workspace');
      const table = node('section', 'pot-odds-trainer-table');
      const scenario = node('div', 'pot-odds-trainer-scenario pot-lab-scenario');
      scenario.appendChild(technicalField('Bote', state.lab.scenario.pot,
        value => engine.labSetScenario('pot', value), { inputKey: 'pot' }));
      scenario.appendChild(technicalField('Apuesta', state.lab.scenario.bet,
        value => engine.labSetScenario('bet', value), { inputKey: 'bet' }));
      scenario.appendChild(technicalField(
        state.config.displayMode === 'ratio'
          ? 'Ratio'
          : 'Equity por outs',
        state.config.displayMode === 'ratio'
          ? engine.formatRatio(analysis.math.ratio)
          : engine.formatPercent(analysis.math.needed)));
      table.appendChild(scenario);
      table.appendChild(renderLabSpot());
      table.appendChild(renderMathLog(analysis));
      workspace.appendChild(table);

      const response = node('section', 'pot-odds-trainer-response pot-lab-analysis');
      const metrics = node('div', 'pot-odds-trainer-equities');
      const disableDecisionEquity = analysis.mode === 'MADE_HAND_MODE' ||
        analysis.mode === 'RIVER_FINAL_MODE';
      metrics.appendChild(technicalField('Equity necesaria',
        engine.formatPercent(analysis.math.needed)));
      metrics.appendChild(technicalField('Eq. turn outs',
        disableDecisionEquity ? 'N/A' : displayPercent(analysis.math.turn)));
      metrics.appendChild(technicalField('Eq. river outs',
        disableDecisionEquity ? 'N/A' : displayPercent(analysis.math.river)));
      response.appendChild(metrics);
      response.appendChild(renderKeypad());
      workspace.appendChild(response);

      const deckPane = node('section', 'pot-odds-trainer-outs-pane');
      const head = node('div', 'pot-odds-trainer-out-head');
      head.appendChild(node('span', 'pot-row-label', 'MAZO VIVO'));
      head.appendChild(renderOutActions(true));
      deckPane.appendChild(head);
      deckPane.appendChild(renderLiveDeck());
      workspace.appendChild(deckPane);

      workspace.appendChild(renderFinalActions(true));
      root.appendChild(workspace);
    }

    function renderCenter() {
      const root = hosts.grid;
      const state = store.state;
      const spot = state.session.spot;
      root.innerHTML = '';
      root.className = `math-trainer-stage pot-odds-trainer-stage phase-${state.phase}`;

      const top = node('div', 'math-trainer-stage-top pot-odds-trainer-top');
      const identity = node('div', 'math-trainer-stage-identity');
      identity.appendChild(node('span', 'math-trainer-console-mark', 'PO'));
      identity.appendChild(node('span', 'math-trainer-category',
        MODE_LABELS[state.config.mode]));
      top.appendChild(identity);
      if (state.session.remainingMs > 0) {
        top.appendChild(node('span', 'pot-odds-trainer-clock',
          `${(state.session.remainingMs / 1000).toFixed(1)}s`));
      }
      top.appendChild(renderTopActions(!spot));
      root.appendChild(top);

      if (!spot) {
        renderLabCenter(root, top);
        return;
      }

      const hasOutGrid = state.config.mode !== 'duel' && state.config.mode !== 'ranking';
      const workspace = node('div',
        `pot-odds-trainer-workspace mode-${state.config.mode}` +
        `${hasOutGrid ? ' has-out-grid' : ''}`);
      const table = node('section', 'pot-odds-trainer-table');
      table.appendChild(renderScenarioFields(spot));
      table.appendChild(renderExerciseSpot(spot));
      table.appendChild(renderMathLog(exerciseAnalysis(spot)));

      workspace.appendChild(table);

      if (hasOutGrid) {
        const outPane = node('section', 'pot-odds-trainer-outs-pane');
        const outHead = node('div', 'pot-odds-trainer-out-head');
        outHead.appendChild(node('span', 'pot-row-label', 'SELECCION DE OUTS'));
        outPane.appendChild(outHead);
        outHead.appendChild(renderOutActions(false));
        outPane.appendChild(renderOutGrid());
        workspace.appendChild(outPane);
      }

      const response = node('section', 'pot-odds-trainer-response');
      if (state.config.mode === 'ranking' || state.config.mode === 'outs-basic') {
        if (state.config.mode === 'ranking') activeInput = 'needed';
        const fields = node('div', 'pot-odds-trainer-equities');
        appendInput(fields, 'needed', 'Equity necesaria', '%');
        if (state.config.mode === 'outs-basic') {
          if (spot.equityTurn !== null) appendInput(fields, 'turn', 'Eq. turn outs', '%');
          appendInput(fields, 'river', 'Eq. river outs', '%');
        }
        response.appendChild(fields);
      } else {
        response.appendChild(node('div', 'pot-odds-trainer-response-hint',
          state.config.mode === 'duel'
            ? 'Compara la equity disponible con las pot odds.'
            : 'Clasifica las cartas que mejoran o perjudican la mano.'));
      }
      if (state.config.mode === 'outs-basic') {
        activeInput = activeInput === 'needed' || activeInput === 'turn' ||
          activeInput === 'river' ? activeInput : 'needed';
      }
      if (state.config.mode === 'ranking' || state.config.mode === 'outs-basic') {
        response.appendChild(renderKeypad());
      }
      workspace.appendChild(response);

      workspace.appendChild(renderFinalActions(false));
      root.appendChild(workspace);
    }

    function statLine(label, value) {
      const line = node('div', 'stat-line');
      line.appendChild(node('span', 'stat-label', label));
      line.appendChild(node('span', 'stat-value', String(value)));
      return line;
    }

    function renderInsights() {
      const aside = hosts.insights;
      const state = store.state;
      const spot = state.session.spot;
      const activeAnalysis = spot
        ? engine.analyzeSpot(spot.hero, spot.board, spot.scenario)
        : engine.labAnalysis();
      const stats = state.stats;
      aside.innerHTML = '';
      aside.className = 'insights math-trainer-insights pot-odds-trainer-insights';

      const instructions = node('section', 'assistant-panel');
      instructions.appendChild(node('div', 'assistant-eyebrow',
        `Pot Odds Trainer / ${MODE_LABELS[state.config.mode]}`));
      instructions.appendChild(node('div', 'assistant-title', MODE_LABELS[state.config.mode]));
      instructions.appendChild(node('p', 'assistant-text', state.feedback));
      const detail = state.session.revealDetail;
      if (detail && detail.explanation) {
        instructions.appendChild(node('p', 'assistant-text pot-reveal-used',
          detail.explanation));
      }
      aside.appendChild(instructions);

      const progress = node('section', 'dash-panel');
      progress.appendChild(node('div', 'dash-title', 'Ronda'));
      progress.appendChild(statLine('Estado', state.phase));
      const madeHand = activeAnalysis.mode === 'MADE_HAND_MODE';
      const finalMode = activeAnalysis.mode === 'RIVER_FINAL_MODE';
      progress.appendChild(statLine(madeHand ? 'Mano hecha' : 'Proyecto',
        activeAnalysis.ready
          ? madeHand && activeAnalysis.current ? activeAnalysis.current.handName : activeAnalysis.project
          : '--'));
      progress.appendChild(statLine('Modo interno',
        activeAnalysis.ready ? activeAnalysis.mode : '--'));
      progress.appendChild(statLine(madeHand ? 'Mejoras posibles' : 'Outs utiles',
        activeAnalysis.ready
          ? madeHand ? activeAnalysis.outs.clean.length : activeAnalysis.outs.useful.length
          : 0));
      if (detail) progress.appendChild(statLine('Out explicada', detail.card));
      progress.appendChild(statLine('Seleccionadas',
        state.session.selectedPositive.size + state.session.selectedNegative.size));
      progress.appendChild(statLine('Positivas', madeHand || finalMode ? 'N/A' : state.session.selectedPositive.size));
      progress.appendChild(statLine('Negativas', madeHand || finalMode ? 'N/A' : state.session.selectedNegative.size));
      aside.appendChild(progress);

      const summary = node('section', 'dash-panel');
      const accuracy = stats.played ? Math.round(stats.correct / stats.played * 100) : 0;
      summary.appendChild(node('div', 'dash-title', 'Estadisticas'));
      summary.appendChild(statLine('Rondas', stats.played));
      summary.appendChild(statLine('Aciertos', stats.correct));
      summary.appendChild(statLine('Errores', stats.failed));
      summary.appendChild(statLine('Precision', `${accuracy}%`));
      summary.appendChild(statLine('Racha actual', stats.currentStreak));
      summary.appendChild(statLine('Mejor racha', stats.bestStreak));
      aside.appendChild(summary);

      const errors = node('section', 'dash-panel');
      errors.appendChild(node('div', 'dash-title', 'Errores por modo'));
      const entries = Object.entries(stats.errorsByMode);
      if (!entries.length) errors.appendChild(statLine('Registro', 'Sin errores'));
      entries.forEach(([mode, count]) => errors.appendChild(statLine(MODE_LABELS[mode], count)));
      aside.appendChild(errors);
    }

    function renderGallery() {
      const gallery = hosts.gallery;
      gallery.innerHTML = '';
      gallery.className = 'range-gallery math-trainer-gallery pot-odds-trainer-gallery';
      const head = node('div', 'range-gallery-head');
      const heading = node('div', 'range-gallery-heading');
      heading.appendChild(node('span', 'range-gallery-kicker', 'Ejercicios Pot Odds Trainer'));
      heading.appendChild(node('span', 'range-gallery-count', '4 modos originales'));
      head.appendChild(heading);
      const spacer = node('div', 'pot-odds-trainer-gallery-spacer');
      spacer.setAttribute('aria-hidden', 'true');
      head.appendChild(spacer);
      gallery.appendChild(head);

      const track = node('div', 'range-gallery-track pot-odds-trainer-mode-track');
      const descriptions = {
        'outs-basic': 'Outs, equity, pot odds y decision',
        duel: 'Decision CALL o FOLD',
        identify: 'Outs positivas y negativas',
        ranking: 'Equity minima necesaria'
      };
      Object.entries(MODE_LABELS).forEach(([id, label]) => {
        const card = node('button',
          `range-card pot-odds-trainer-mode-card${store.state.config.mode === id ? ' is-active' : ''}`);
        card.type = 'button';
        card.appendChild(node('strong', 'range-card-title', label));
        card.appendChild(node('span', 'pot-mode-description', descriptions[id]));
        card.appendChild(node('span', 'pot-mode-meta',
          id === 'identify' ? 'Hand evaluator + reveal' :
            id === 'duel' ? 'Pot odds vs equity' :
              id === 'ranking' ? 'Precision +/- 0.5%' : 'Trainer completo'));
        card.addEventListener('click', () => engine.setMode(id));
        track.appendChild(card);
      });
      gallery.appendChild(track);
    }

    function renderActionBar() {
      const bar = hosts.actionBar;
      bar.innerHTML = '';
      bar.appendChild(button('Comprobar', () => engine.validate(true), { primary: true }));
      bar.appendChild(button('Reveal', engine.toggleReveal));
      bar.appendChild(button('Siguiente', engine.next));
      bar.classList.add('has-items');
    }

    function render() {
      if (!hosts) return;
      renderPanel();
      renderCenter();
      renderInsights();
      renderGallery();
      renderActionBar();
      hosts.statusLabel.textContent = `Math Trainer / Pot Odds Trainer`;
      hosts.statusStats.textContent = MODE_LABELS[store.state.config.mode];
    }

    function mount(nextHosts) {
      if (unsubscribe) unsubscribe();
      hosts = nextHosts;
      unsubscribe = store.subscribe(render);
      render();
    }

    function unmount() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      engine.destroy();
      if (hosts) {
        hosts.grid.className = '';
        hosts.panel.className = 'panel';
        hosts.insights.className = 'insights';
        hosts.gallery.className = 'range-gallery';
        hosts.actionBar.classList.remove('has-items');
      }
      hosts = null;
    }

    function handleKey(key) {
      if (!hosts) return false;
      if (/^[0-9.%:]$/.test(key)) {
        keypadValue(key);
        return true;
      }
      if (key === 'Backspace') {
        keypadValue('back');
        return true;
      }
      if (key === 'Enter') {
        keypadValue('submit');
        return true;
      }
      return engine.handleKey(key);
    }

    return { mount, unmount, render, handleKey };
  }

  RT.PotOddsTrainerUI = { create };
})(window.RT);
