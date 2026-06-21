'use strict';

(function (RT) {
  const CATEGORY_LABELS = {
    numa: 'NUMA', 'pot-odds': 'Pot Odds', equity: 'Equity', spr: 'SPR'
  };
  const PHASE_LABELS = {
    configuring: 'Configurando', ready: 'Preparado', question: 'Respondiendo',
    correct: 'Correcto', error: 'Error', review: 'Repaso de fallos',
    finished: 'Completado', timeout: 'Tiempo agotado'
  };

  function create(store, engine, stats, renderSubtabs) {
    let hosts = null;
    let unsubscribe = null;
    let unsubscribeTimer = null;
    let timerElements = null;
    let flashItem = null;
    let flashStartedAt = 0;
    let flashRevealed = false;
    let galleryScroll = 0;
    let focusMode = false;
    let floatingMode = false;
    let activeKey = null;
    let keyHighlightTimer = null;

    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function button(label, onClick, options) {
      const config = options || {};
      const element = node('button', `btn math-trainer-btn ${config.className || ''}`.trim(), label);
      element.type = 'button';
      element.disabled = !!config.disabled;
      element.classList.toggle('is-active', !!config.active);
      element.classList.toggle('btn-primary', !!config.primary);
      element.classList.toggle('btn-ghost', !!config.ghost);
      if (config.title) element.title = config.title;
      element.addEventListener('click', onClick);
      return element;
    }
    function iconButton(label, title, onClick, active) {
      const element = node('button', 'math-trainer-console-btn');
      element.type = 'button';
      element.title = title;
      element.setAttribute('aria-label', title);
      element.setAttribute('aria-pressed', String(active));
      element.classList.toggle('is-active', active);
      element.innerHTML = label;
      element.addEventListener('click', onClick);
      return element;
    }
    function group(title, className) {
      const root = node('section', `panel-group ${className || ''}`.trim());
      root.appendChild(node('div', 'panel-group-title', title));
      const body = node('div', 'math-trainer-controls');
      root.appendChild(body);
      return { root, body };
    }
    function toggleSet(set, value) {
      if (set.has(value)) set.delete(value); else set.add(value);
      engine.configChanged();
    }
    function options(groupElement, values, selected, formatter) {
      values.forEach(value => groupElement.body.appendChild(button(
        formatter ? formatter(value) : String(value),
        () => toggleSet(selected, value),
        { active: selected.has(value) })));
    }
    function stepper(label, value, down, up) {
      const root = node('div', 'math-trainer-stepper');
      root.appendChild(node('span', 'math-trainer-stepper-label', label));
      const row = node('div', 'math-trainer-stepper-row');
      row.appendChild(button('−', down));
      row.appendChild(node('span', 'math-trainer-display', value));
      row.appendChild(button('+', up));
      root.appendChild(row);
      return root;
    }
    function setNumber(target, key, value, min, max) {
      target[key] = Math.max(min, Math.min(max, value));
      engine.configChanged();
    }

    function renderCommon(panel) {
      const state = store.state;
      const categories = group('Categoría', 'math-trainer-categories');
      ['numa','pot-odds','equity','spr'].forEach(category =>
        categories.body.appendChild(button(CATEGORY_LABELS[category],
          () => engine.setCategory(category), { active: state.category === category })));
      panel.appendChild(categories.root);

      const session = group('Sesión', 'math-trainer-session-config');
      session.body.appendChild(stepper('Ejercicios',
        state.config.sessionSize === 0 ? 'Todos' : state.config.sessionSize,
        () => setNumber(state.config, 'sessionSize',
          state.config.sessionSize === 0 ? 50 : state.config.sessionSize - 5, 0, 500),
        () => setNumber(state.config, 'sessionSize', state.config.sessionSize + 5, 0, 500)));
      session.body.appendChild(button('Cronómetro', () => {
        state.config.chrono = !state.config.chrono; engine.configChanged();
      }, { active: state.config.chrono }));
      const countdowns = [0,5,15,30,60,180,300,600,900,1800,3600,7200,10800];
      const index = countdowns.indexOf(state.config.countdown);
      session.body.appendChild(stepper('Contrarreloj',
        state.config.countdown ? formatCompactTime(state.config.countdown * 1000) : 'Off',
        () => { state.config.countdown = countdowns[Math.max(0, index - 1)]; engine.configChanged(); },
        () => { state.config.countdown = countdowns[Math.min(countdowns.length - 1, index + 1)]; engine.configChanged(); }));
      panel.appendChild(session.root);
    }

    function renderNuma(panel) {
      const config = store.state.config.numa;
      const ops = group('Operaciones');
      options(ops, ['+','-','×','÷'], config.operations);
      panel.appendChild(ops.root);

      const modes = group('Modos');
      options(modes, ['Random','Mirror','Surges','Fugues','Cipher'], config.modes);
      panel.appendChild(modes.root);

      const speed = group('Velocidad Fugues');
      ['1H','2H','3H','4H','5H','6H'].forEach(value => {
        const element = button(value, () => {
          config.fuguesSpeed = value;
          store.state.activePresetId = null;
          engine.configChanged();
        }, { active: config.fuguesSpeed === value });
        element.disabled = !config.modes.has('Fugues');
        speed.body.appendChild(element);
      });
      panel.appendChild(speed.root);

      const poker = group('Poker Numbs');
      options(poker, [1,2,3,4], config.pokerLevels,
        value => ['Basic','Med','High','Advance'][value - 1]);
      panel.appendChild(poker.root);

      const ranges = group('Rangos NUMA', 'math-trainer-range-config');
      ranges.body.appendChild(stepper('Inicio', config.start,
        () => setNumber(config, 'start', config.start - 1, 1, config.end),
        () => setNumber(config, 'start', config.start + 1, 1, config.end)));
      ranges.body.appendChild(stepper('Fin', config.end,
        () => setNumber(config, 'end', config.end - 1, config.start, 100),
        () => setNumber(config, 'end', config.end + 1, config.start, 100)));
      ranges.body.appendChild(stepper('Cadena', config.chain,
        () => setNumber(config, 'chain', config.chain - 1, 2,
          RT.MathTrainerEngine.MAX_NUMA_CHAIN),
        () => setNumber(config, 'chain', config.chain + 1, 2,
          RT.MathTrainerEngine.MAX_NUMA_CHAIN)));
      panel.appendChild(ranges.root);

      const numbers = group('Números 1–100', 'math-trainer-number-picker');
      for (let number = 1; number <= 100; number++) {
        numbers.body.appendChild(button(String(number),
          () => toggleSet(config.numbers, number),
          { active: config.numbers.has(number) }));
      }
      panel.appendChild(numbers.root);
    }

    function renderPotOdds(panel) {
      const config = store.state.config.potOdds;
      const outs = group('Outs 1–20', 'math-trainer-outs');
      options(outs, Array.from({ length: 20 }, (_, index) => index + 1), config.outs);
      panel.appendChild(outs.root);
      const domains = group('Formato');
      options(domains, ['raw_percent','raw_odds'], config.domains,
        value => value === 'raw_percent' ? 'N%' : 'N:N');
      domains.body.appendChild(button('Conversiones', () => {
        config.conversion = !config.conversion; engine.configChanged();
      }, { active: config.conversion }));
      panel.appendChild(domains.root);
      const streets = group('Calles');
      options(streets, ['flop_turn','turn_river','flop_river'], config.streets,
        value => ({ flop_turn: 'F–T', turn_river: 'T–R', flop_river: 'F–R' })[value]);
      panel.appendChild(streets.root);
    }

    function renderEquity(panel) {
      const config = store.state.config.equity;
      const datasets = group('Datasets');
      datasets.body.appendChild(button('Práctica', () => {
        config.practical = !config.practical; engine.configChanged();
      }, { active: config.practical }));
      datasets.body.appendChild(button('Teoría', () => {
        config.theory = !config.theory; engine.configChanged();
      }, { active: config.theory }));
      panel.appendChild(datasets.root);
      const types = group('Práctica');
      options(types, ['relacion','equity'], config.practicalTypes,
        value => value === 'relacion' ? 'Relación' : 'EQ');
      options(types, ['2-10','12-30','35-50'], config.ranges);
      panel.appendChild(types.root);
      const bets = group('Apuestas');
      options(bets, ['1/4','1/3','1/2','2/3','3/4','1x','1.5x','2x'], config.bets);
      panel.appendChild(bets.root);
      const theory = group('Teoría e inversa');
      options(theory, ['percent','ratio'], config.theoryFormats,
        value => value === 'percent' ? 'N%' : 'N:N');
      options(theory, ['eq','ratio','viceversa_eq','viceversa_ratio'], config.theoryTypes,
        value => ({ eq: 'EQ', ratio: 'Ratio', viceversa_eq: 'Inversa EQ',
          viceversa_ratio: 'Inversa Ratio' })[value]);
      panel.appendChild(theory.root);
    }

    function renderSpr(panel) {
      const config = store.state.config.spr;
      const datasets = group('Datasets');
      datasets.body.appendChild(button('SPR práctico', () => {
        config.practical = !config.practical; engine.configChanged();
      }, { active: config.practical }));
      options(datasets, ['teoria','interpretacion','manos','ejemplos'], config.flashcards,
        value => ({ teoria: 'Teoría', interpretacion: 'Interpretación',
          manos: 'Manos', ejemplos: 'Ejemplos' })[value]);
      panel.appendChild(datasets.root);
      const stacks = group('Stacks');
      options(stacks, ['15-35','40-60','70-100'], config.stacks);
      panel.appendChild(stacks.root);
      const pots = group('Botes');
      options(pots, ['2-10','12-30','35-50'], config.pots);
      panel.appendChild(pots.root);
    }

    function renderTransport(panel) {
      const running = store.state.session.status === 'running';
      const transport = group('Entrenamiento');
      transport.body.appendChild(button('Comenzar', engine.start,
        { primary: true, disabled: running }));
      transport.body.appendChild(button('Reiniciar', engine.repeat,
        { disabled: !running && !store.state.session.original.length }));
      transport.body.appendChild(button('Detener', engine.stop, { disabled: !running }));
      transport.body.appendChild(button('Siguiente', () => {
        const current = store.state.session.current;
        if (current) engine.answer('', false);
      }, { disabled: !running }));
      panel.appendChild(transport.root);
    }

    function renderPanel() {
      const panel = hosts.panel;
      panel.innerHTML = '';
      panel.className = 'panel math-trainer-panel';
      if (renderSubtabs) panel.appendChild(renderSubtabs());
      const summary = node('section', 'workspace-card math-trainer-summary');
      const head = node('div', 'workspace-head');
      head.appendChild(node('span', 'workspace-eyebrow', 'Math Trainer'));
      head.appendChild(node('span', `math-trainer-phase phase-${store.state.phase}`,
        PHASE_LABELS[store.state.phase]));
      summary.appendChild(head);
      summary.appendChild(node('div', 'context-main', CATEGORY_LABELS[store.state.category]));
      summary.appendChild(node('div', 'context-sub', store.state.feedback));
      panel.appendChild(summary);
      renderCommon(panel);
      if (store.state.category === 'numa') renderNuma(panel);
      else if (store.state.category === 'pot-odds') renderPotOdds(panel);
      else if (store.state.category === 'equity') renderEquity(panel);
      else renderSpr(panel);
      renderTransport(panel);
    }

    function appendKey(keypad, label, value, className) {
      const key = button(label, () => {
        const current = store.state.session.input;
        if (value === 'clear') engine.input('');
        else if (value === 'back') engine.input(current.slice(0, -1));
        else if (value === 'submit') engine.answer(current);
        else engine.input(current + value);
      }, { className });
      key.dataset.mathKey = value;
      key.classList.toggle('is-key-active', activeKey === value);
      keypad.appendChild(key);
    }

    function resetFloatingPosition() {
      if (!hosts) return;
      ['left','top','width','height'].forEach(property => {
        hosts.grid.style.removeProperty(property);
      });
    }

    function setFocusMode(enabled) {
      focusMode = enabled;
      if (!focusMode) {
        floatingMode = false;
        resetFloatingPosition();
      }
      document.body.classList.toggle('math-trainer-focus', focusMode);
      document.body.classList.toggle('math-trainer-floating', focusMode && floatingMode);
      render();
    }

    function setFloatingMode(enabled) {
      if (!focusMode) return;
      floatingMode = enabled;
      if (!floatingMode) resetFloatingPosition();
      document.body.classList.toggle('math-trainer-floating', floatingMode);
      renderCenter();
    }

    function attachDragHandle(handle, root) {
      if (!floatingMode) return;
      handle.addEventListener('pointerdown', event => {
        if (event.target.closest('button')) return;
        const rect = root.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        handle.setPointerCapture(event.pointerId);
        root.style.left = `${rect.left}px`;
        root.style.top = `${rect.top}px`;
        root.style.width = `${rect.width}px`;
        root.style.height = `${rect.height}px`;
        const move = moveEvent => {
          const maxLeft = Math.max(0, window.innerWidth - 280);
          const maxTop = Math.max(0, window.innerHeight - 160);
          root.style.left = `${Math.min(maxLeft, Math.max(0, rect.left + moveEvent.clientX - startX))}px`;
          root.style.top = `${Math.min(maxTop, Math.max(0, rect.top + moveEvent.clientY - startY))}px`;
        };
        const end = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      });
    }

    function flashKey(value) {
      activeKey = value;
      clearTimeout(keyHighlightTimer);
      if (hosts) {
        hosts.grid.querySelectorAll('[data-math-key]').forEach(element => {
          element.classList.toggle('is-key-active', element.dataset.mathKey === value);
        });
      }
      keyHighlightTimer = setTimeout(() => {
        activeKey = null;
        if (hosts) {
          hosts.grid.querySelectorAll('[data-math-key]').forEach(element => {
            element.classList.remove('is-key-active');
          });
        }
      }, 140);
    }

    function renderCenter() {
      const root = hosts.grid;
      const state = store.state;
      const session = state.session;
      const item = session.current;
      root.innerHTML = '';
      root.className = `math-trainer-stage phase-${state.phase}` +
        `${focusMode ? ' is-focus' : ''}${floatingMode ? ' is-floating' : ''}`;

      const top = node('div', 'math-trainer-stage-top');
      const identity = node('div', 'math-trainer-stage-identity');
      identity.appendChild(node('span', 'math-trainer-console-mark', 'MT'));
      identity.appendChild(node('span', 'math-trainer-category', CATEGORY_LABELS[state.category]));
      identity.appendChild(node('span', 'math-trainer-stage-state', PHASE_LABELS[state.phase]));
      top.appendChild(identity);
      const timers = node('div', 'math-trainer-live-timers');
      const chrono = node('span', 'math-trainer-chrono', '00:00.0');
      const countdown = node('span', 'math-trainer-countdown', '');
      timers.appendChild(chrono); timers.appendChild(countdown);
      const actions = node('div', 'math-trainer-stage-actions');
      actions.appendChild(timers);
      actions.appendChild(iconButton(
        focusMode
          ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.5M6.6 6.6C3.8 8.5 2 12 2 12s3 8 10 8a10.5 10.5 0 0 0 4.1-.8"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
        focusMode ? 'Restaurar paneles' : 'Ocultar paneles y presets',
        () => setFocusMode(!focusMode),
        focusMode
      ));
      actions.appendChild(iconButton(
        '<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5M3 8l5-5M21 8l-5-5M3 16l5 5M21 16l-5 5"/></svg>',
        floatingMode ? 'Fijar consola' : 'Mover y redimensionar consola',
        () => setFloatingMode(!floatingMode),
        floatingMode
      ));
      actions.lastChild.disabled = !focusMode;
      top.appendChild(actions);
      root.appendChild(top);
      attachDragHandle(top, root);
      timerElements = { chrono, countdown };

      const exercise = node('section', 'math-trainer-exercise');
      if (!item) {
        flashItem = null;
        flashStartedAt = 0;
        flashRevealed = false;
        const empty = node('div', 'math-trainer-empty');
        empty.appendChild(node('div', 'math-trainer-empty-title',
          state.phase === store.phases.FINISHED ? 'Sesión completada' : 'Preparado para entrenar'));
        empty.appendChild(node('p', 'math-trainer-empty-text',
          state.phase === store.phases.FINISHED
            ? `${session.correct} aciertos · ${session.failed} errores`
            : 'Elige un preset o ajusta la configuración avanzada y pulsa Comenzar.'));
        if (state.phase === store.phases.FINISHED || state.phase === store.phases.TIMEOUT) {
          empty.appendChild(button('Repetir sesión', engine.repeat, { primary: true }));
        }
        exercise.appendChild(empty);
      } else {
        if (flashItem !== item || flashStartedAt !== session.questionStartedAt) {
          flashItem = item;
          flashStartedAt = session.questionStartedAt;
          flashRevealed = false;
        }
        const isFugues = state.category === 'numa' &&
          session.snapshot.numa.modes.has('Fugues');
        const question = isFugues && session.revealed ? '••••••••' : item.question;
        const exercisePane = node('div', 'math-trainer-exercise-pane');
        const command = node('div', 'math-trainer-command');
        command.appendChild(node('div', 'math-trainer-command-label', 'Comando activo'));
        command.appendChild(node('div', 'math-trainer-question', question));
        exercisePane.appendChild(command);
        if (item.type === 'flashcard') {
          if (!flashRevealed) {
            exercisePane.appendChild(button('Mostrar respuesta', () => {
              flashRevealed = true; renderCenter();
            }, { primary: true }));
          } else {
            exercisePane.appendChild(node('div', 'math-trainer-flash-answer', item.answer));
            const actions = node('div', 'math-trainer-flash-actions');
            actions.appendChild(button('Sabía', () => engine.answer('', true), { primary: true }));
            actions.appendChild(button('Repetir', () => engine.answer('', false)));
            exercisePane.appendChild(actions);
          }
        } else if (!isFugues || session.revealed) {
          const prompt = node('div', 'math-trainer-prompt');
          prompt.appendChild(node('span', 'math-trainer-prompt-symbol', '›'));
          prompt.appendChild(node('span', 'math-trainer-answer-display',
            session.input || '0'));
          prompt.appendChild(node('span', 'math-trainer-prompt-cursor', ''));
          exercisePane.appendChild(prompt);

          const workstation = node('div', 'math-trainer-workstation');
          const keypad = node('div', 'math-trainer-keypad');
          [
            ['7', '7'], ['8', '8'], ['9', '9'],
            ['4', '4'], ['5', '5'], ['6', '6'],
            ['1', '1'], ['2', '2'], ['3', '3'],
            ['0', '0'], ['.', '.'], ['%', '%'],
            [':', ':'], ['/', '/'], ['−', '-'],
            ['CLR', 'clear'], ['DEL', 'back'], ['ENTER', 'submit', 'is-submit']
          ].forEach(([label, value, className]) =>
            appendKey(keypad, label, value, className));
          workstation.appendChild(keypad);
          exercise.appendChild(exercisePane);
          exercise.appendChild(workstation);
        } else {
          exercisePane.appendChild(node('div', 'math-trainer-memorize',
            'Memoriza la operación'));
          exercise.appendChild(exercisePane);
        }
        if (!exercisePane.parentElement) exercise.appendChild(exercisePane);
      }
      root.appendChild(exercise);

      const telemetry = node('section', 'math-trainer-telemetry');
      const telemetryHead = node('div', 'math-trainer-telemetry-head');
      telemetryHead.appendChild(node('span', 'math-trainer-telemetry-title', 'Registro de ejecución'));
      telemetryHead.appendChild(node('span', 'math-trainer-telemetry-count',
        `${session.history.length} eventos`));
      telemetry.appendChild(telemetryHead);
      const history = node('div', 'math-trainer-history');
      if (!session.history.length) {
        history.appendChild(node('div', 'math-trainer-history-empty',
          'La actividad de la sesión aparecerá aquí.'));
      }
      session.history.forEach(entry => {
        const row = node('div', `math-trainer-history-row ${entry.correct ? 'is-correct' : 'is-error'}`);
        row.appendChild(node('span', 'math-trainer-history-status',
          entry.correct ? 'OK' : 'ERROR'));
        const detail = node('div', 'math-trainer-history-detail');
        detail.appendChild(node('span', 'math-trainer-history-question', entry.question));
        const response = node('span', 'math-trainer-history-response');
        response.appendChild(node('span', '', 'Respuesta '));
        response.appendChild(node('strong', '', entry.answer || '—'));
        if (!entry.correct) {
          response.appendChild(node('span', 'math-trainer-history-correct',
            ` · Correcta ${entry.correctAnswer}`));
        }
        detail.appendChild(response);
        row.appendChild(detail);
        history.appendChild(row);
      });
      telemetry.appendChild(history);
      root.appendChild(telemetry);
    }

    function statLine(label, value) {
      const line = node('div', 'stat-line');
      line.appendChild(node('span', 'stat-label', label));
      line.appendChild(node('span', 'stat-value', String(value)));
      return line;
    }
    function topBucket(bucket) {
      const entries = Object.entries(bucket).sort((a,b) => b[1] - a[1]).slice(0,3);
      return entries.length ? entries.map(([key,value]) => `${key}: ${value}`).join(' · ') : 'Sin errores';
    }
    function renderInsights() {
      const aside = hosts.insights;
      const state = store.state;
      const session = state.session;
      const data = stats.snapshot();
      aside.innerHTML = '';
      aside.className = 'insights math-trainer-insights';
      const instructions = node('section', 'assistant-panel');
      instructions.appendChild(node('div', 'assistant-eyebrow',
        `Math Trainer · ${PHASE_LABELS[state.phase]}`));
      instructions.appendChild(node('div', 'assistant-title',
        engine.currentPreset()?.title || CATEGORY_LABELS[state.category]));
      instructions.appendChild(node('p', 'assistant-text',
        state.category === 'spr' && session.current?.type === 'flashcard'
          ? 'Revela la respuesta y marca Sabía o Repetir. Los fallos vuelven al final.'
          : 'Responde con el teclado Numa. Los errores vuelven al final de la sesión.'));
      aside.appendChild(instructions);

      const progress = node('section', 'dash-panel');
      progress.appendChild(node('div', 'dash-title', 'Progreso'));
      progress.appendChild(statLine('Estado', session.status));
      progress.appendChild(statLine('Respondidos', session.played));
      progress.appendChild(statLine('Pendientes', session.queue.length + session.retryQueue.length));
      progress.appendChild(statLine('Aciertos', session.correct));
      progress.appendChild(statLine('Errores', session.failed));
      progress.appendChild(statLine('Última', formatCompactTime(session.lastTimeMs)));
      aside.appendChild(progress);

      const summary = node('section', 'dash-panel');
      summary.appendChild(node('div', 'dash-title', 'Estadísticas'));
      summary.appendChild(statLine('Ejercicios', data.played));
      summary.appendChild(statLine('Aciertos', data.correct));
      summary.appendChild(statLine('Errores', data.failed));
      summary.appendChild(statLine('Precisión', `${data.accuracy}%`));
      summary.appendChild(statLine('Racha actual', data.currentStreak));
      summary.appendChild(statLine('Mejor racha', data.bestStreak));
      summary.appendChild(statLine('Tiempo medio', formatCompactTime(data.averageTimeMs)));
      aside.appendChild(summary);

      const errors = node('section', 'dash-panel');
      errors.appendChild(node('div', 'dash-title', 'Errores'));
      errors.appendChild(statLine('Por categoría', topBucket(data.errorsByCategory)));
      errors.appendChild(statLine('Por dificultad', topBucket(data.errorsByDifficulty)));
      aside.appendChild(errors);
    }

    function renderGallery() {
      const gallery = hosts.gallery;
      const previous = gallery.querySelector('.range-gallery-track');
      if (previous) galleryScroll = previous.scrollLeft;
      gallery.innerHTML = '';
      gallery.className = 'range-gallery math-trainer-gallery';
      const visible = RT.MathTrainerPresets.presets.filter(preset =>
        store.state.presetFilter === 'all' || preset.category === store.state.presetFilter);
      const head = node('div', 'range-gallery-head');
      const heading = node('div', 'range-gallery-heading');
      heading.appendChild(node('span', 'range-gallery-kicker', 'Presets Math Trainer'));
      heading.appendChild(node('span', 'range-gallery-count',
        `${visible.length} de ${RT.MathTrainerPresets.presets.length}`));
      head.appendChild(heading);
      const filters = node('div', 'range-gallery-filters');
      [['all','TODOS'],['pot-odds','POT ODDS'],['equity','EQUITY'],['spr','SPR'],['numa','NUMA']]
        .forEach(([id,label]) => filters.appendChild(button(label, () => {
          store.state.presetFilter = id; galleryScroll = 0; store.notify();
        }, {
          active: store.state.presetFilter === id,
          className: 'range-filter-btn'
        })));
      head.appendChild(filters);
      gallery.appendChild(head);
      const track = node('div', 'range-gallery-track math-trainer-preset-track');
      visible.forEach(preset => {
        const active = store.state.activePresetId === preset.id;
        const card = node('button', `range-card math-trainer-preset-card${active ? ' is-active' : ''}`);
        card.type = 'button';
        const cardHead = node('div', 'range-card-head');
        cardHead.appendChild(node('strong', 'range-card-title', preset.title));
        const badge = node('span', 'range-card-active', active ? 'Activo' : '');
        badge.hidden = !active; cardHead.appendChild(badge); card.appendChild(cardHead);
        const body = node('div', 'math-trainer-preset-body');
        body.appendChild(node('strong', '', preset.description));
        body.appendChild(node('span', '', CATEGORY_LABELS[preset.category]));
        body.appendChild(node('span', '', preset.difficulty));
        body.appendChild(node('span', '', preset.config.sessionSize
          ? `${preset.config.sessionSize} ejercicios` : 'Pool completo'));
        card.appendChild(body);
        const metric = node('div', 'range-card-metrics');
        const presetStats = stats.presetSnapshot(preset.id);
        metric.appendChild(node('strong', '', presetStats
          ? `${presetStats.accuracy}% · ${presetStats.attempts}` : 'Sin datos'));
        metric.appendChild(node('span', '', presetStats
          ? `Racha ${presetStats.bestStreak}` : '0 intentos'));
        card.appendChild(metric);
        card.addEventListener('click', () => {
          galleryScroll = track.scrollLeft; engine.applyPreset(preset.id);
        });
        track.appendChild(card);
      });
      track.scrollLeft = galleryScroll;
      gallery.appendChild(track);
    }

    function renderActionBar() {
      const bar = hosts.actionBar;
      bar.innerHTML = '';
      const running = store.state.session.status === 'running';
      const current = store.state.session.current;
      const directAnswer = running && current && current.type !== 'flashcard';
      bar.appendChild(button(running ? (directAnswer ? 'OK' : 'Responde arriba') : 'Comenzar',
        directAnswer ? () => engine.answer(store.state.session.input) : engine.start,
        { primary: true, disabled: running && !directAnswer }));
      bar.appendChild(button('Detener', engine.stop, { disabled: !running }));
      bar.classList.add('has-items');
    }

    function formatCompactTime(ms) {
      const value = Math.max(0, Number(ms) || 0);
      if (value >= 3600000) return `${Math.floor(value / 3600000)}h`;
      if (value >= 60000) return `${Math.floor(value / 60000)}m ${Math.floor(value % 60000 / 1000)}s`;
      return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}s`;
    }
    function updateTimerDisplay(timer) {
      if (!timerElements) return;
      const session = store.state.session;
      const config = session.status !== 'idle' && session.snapshot
        ? session.snapshot
        : store.state.config;
      timerElements.chrono.textContent = config.chrono
        ? formatCompactTime(timer.elapsedMs) : '';
      timerElements.countdown.textContent = config.countdown
        ? formatCompactTime(timer.remainingMs) : '';
    }

    function render() {
      if (!hosts) return;
      renderPanel(); renderCenter(); renderInsights(); renderGallery(); renderActionBar();
      hosts.statusLabel.textContent = `Math Trainer · ${CATEGORY_LABELS[store.state.category]}`;
      hosts.statusStats.textContent = store.state.activePresetId
        ? engine.currentPreset().title : 'Configuración manual';
      updateTimerDisplay(engine.timer.snapshot());
    }
    function mount(nextHosts) {
      hosts = nextHosts;
      if (!unsubscribe) unsubscribe = store.subscribe(render);
      if (!unsubscribeTimer) unsubscribeTimer = engine.timer.subscribe(updateTimerDisplay);
      render();
    }
    function unmount() {
      if (unsubscribe) unsubscribe();
      if (unsubscribeTimer) unsubscribeTimer();
      unsubscribe = null; unsubscribeTimer = null;
      engine.destroy();
      clearTimeout(keyHighlightTimer);
      activeKey = null;
      focusMode = false;
      floatingMode = false;
      document.body.classList.remove('math-trainer-focus', 'math-trainer-floating');
      if (hosts) {
        resetFloatingPosition();
        hosts.grid.className = '';
        hosts.panel.className = 'panel';
        hosts.insights.className = 'insights';
        hosts.gallery.className = 'range-gallery';
        hosts.actionBar.classList.remove('has-items');
      }
      hosts = null; timerElements = null;
    }
    return { mount, unmount, render, flashKey };
  }

  RT.MathTrainerUI = { create };
})(window.RT);
