'use strict';

(function (RT) {
  const PHASE_LABELS = {
    configuring: 'Configurando',
    showing: 'Mostrando patrón',
    answering: 'Esperando respuesta',
    correct: 'Correcto',
    error: 'Error',
    'round-finished': 'Ronda terminada'
  };

  const COLOR_LABELS = {
    green: 'Verde',
    blue: 'Azul',
    red: 'Rojo',
    yellow: 'Amarillo'
  };

  const EFFECT_LABELS = {
    flash: 'Flash',
    'contrast-inversion': 'Inversión de contraste',
    'double-phase': 'Doble fase',
    'partial-reappearance': 'Reaparición parcial',
    'soft-decoys': 'Señuelos suaves',
    'complex-pattern': 'Patrón complejo',
    'temporary-inversion': 'Inversión temporal',
    'partial-hiding': 'Ocultación parcial',
    'brief-inversion': 'Inversión breve',
    'time-pressure': 'Presión temporal'
  };

  function create(store, engine, stats) {
    let hosts = null;
    let unsubscribe = null;
    let zenExitButton = null;
    let galleryScroll = 0;
    const phases = store.phases;
    const eyeOpenIcon =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>';
    const eyeClosedIcon =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.4 3.1M6.2 7.2A16.6 16.6 0 0 0 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }

    function button(label, onClick, options) {
      const config = options || {};
      const element = node('button', 'btn grid-trainer-btn', label);
      element.type = 'button';
      element.disabled = !!config.disabled;
      element.classList.toggle('is-active', !!config.active);
      element.classList.toggle('btn-primary', !!config.primary);
      element.classList.toggle('btn-ghost', !!config.ghost);
      if (config.title) element.title = config.title;
      if (config.help) element.dataset.help = config.help;
      element.addEventListener('click', onClick);
      return element;
    }

    function iconButton(label, icon, onClick, options) {
      const element = button('', onClick, options);
      element.classList.add('grid-trainer-icon-btn');
      element.setAttribute('aria-label', label);
      element.title = label;
      element.innerHTML = icon;
      return element;
    }

    function panelGroup(title, className) {
      const root = node('section', `panel-group ${className || ''}`.trim());
      root.appendChild(node('div', 'panel-group-title', title));
      const body = node('div', 'grid-trainer-controls');
      root.appendChild(body);
      return { root, body };
    }

    function valueStepper(label, value, down, up, help) {
      const root = node('div', 'grid-trainer-stepper');
      root.appendChild(node('span', 'grid-trainer-stepper-label', label));
      const row = node('div', 'grid-trainer-stepper-row');
      row.appendChild(button('−', down, { help }));
      row.appendChild(node('span', 'grid-trainer-display', value));
      row.appendChild(button('+', up, { help }));
      root.appendChild(row);
      return root;
    }

    function formatDuration(duration) {
      if (Array.isArray(duration)) {
        return duration.map(value => `${value / 1000} s`).join(' + ');
      }
      return duration ? `${duration / 1000} s` : null;
    }

    function renderModeSelector(panel) {
      const mode = panelGroup('Modo principal', 'grid-trainer-mode-group');
      mode.body.appendChild(button('Grid', () => engine.setMode('script'), {
        active: store.state.mode === 'script',
        help: 'Modo Script original: grid libre, challenge y patrones.'
      }));
      mode.body.appendChild(button('Memory', () => engine.setMode('memory'), {
        active: store.state.mode === 'memory',
        help: 'Modo Memory original: memoria visual y secuencias.'
      }));
      panel.appendChild(mode.root);
    }

    function renderScriptControls(panel) {
      const state = store.state;
      const script = state.script;

      const paintAllIcon =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>';
      const clearAllIcon =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m7 7 10 10M17 7 7 17"/></svg>';

      const tools = panelGroup('Herramientas', 'grid-trainer-script-tools');
      tools.body.appendChild(iconButton(
        script.allLocked ? 'Limpiar todo' : 'Pintar todo',
        script.allLocked ? clearAllIcon : paintAllIcon,
        engine.toggleAll, {
          active: script.allLocked,
          help: 'Pinta las 169 celdas del grid o limpia la selección completa.'
        }));
      tools.body.appendChild(iconButton(
        script.lockMode ? 'Pintar' : 'Borrar',
        script.lockMode
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5-9 9H5v-5l9-9Z"/><path d="m12 7 5 5"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 7-7 5 5-6 6H8l-3-3 2-2Z"/><path d="M12 19h8"/></svg>',
        engine.toggleLockMode, {
          active: script.lockMode,
          help: 'Define si el movimiento automático añade o elimina celdas de la selección.'
        }));
      tools.body.appendChild(iconButton('Random',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3c4 0 5 10 9 10h4M17 14l3 3-3 3M4 17h3c1.5 0 2.6-1.4 3.6-3M14 7h6M17 4l3 3-3 3"/></svg>',
        engine.toggleRandom, {
        active: script.randomMode,
        help: 'Restringe el movimiento a celdas seleccionadas o libres según el modo Pintar/Borrar.'
      }));
      tools.body.appendChild(iconButton('Challenge',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></svg>',
        engine.toggleChallenge, {
        active: script.challenge,
        help: 'Añade objetivos para localizar mientras el grid continúa moviéndose.'
      }));
      tools.body.appendChild(iconButton('Zen',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
        engine.toggleZen, {
        active: script.zen,
        help: 'Oculta los paneles y amplía el grid; Salir de Zen restaura la interfaz.'
      }));
      tools.body.appendChild(iconButton(
        state.showLabels ? 'Ocultar etiquetas' : 'Mostrar etiquetas',
        state.showLabels ? eyeOpenIcon : eyeClosedIcon,
        engine.toggleLabels, {
        active: state.showLabels,
        help: 'Muestra u oculta los nombres de las manos dentro del grid.'
      }));
      panel.appendChild(tools.root);

      const patterns = panelGroup('Patrones');
      [
        ['pair', 'Pair'],
        ['zig', 'Zigzag'],
        ['ring', 'Rings'],
        ['spiral', 'Spiral']
      ].forEach(([id, label]) => patterns.body.appendChild(
        button(label, () => engine.togglePattern(id), {
          active: script.pattern === id,
          help: `Activa el patrón ${label}; los patrones son excluyentes.`
        })));
      panel.appendChild(patterns.root);

      const zig = panelGroup('Zigzag');
      const amps = node('div', 'grid-trainer-amps');
      for (let amp = 1; amp <= 6; amp++) {
        amps.appendChild(button(String(amp), () => engine.setZigAmp(amp), {
          active: script.pattern === 'zig' && script.zigAmp === amp,
          disabled: script.pattern !== 'zig'
        }));
      }
      zig.body.appendChild(amps);
      zig.body.appendChild(button(script.zigDir === 'ltr' ? 'Dirección →' : 'Dirección ←',
        engine.toggleZigDirection, { disabled: script.pattern !== 'zig' }));
      zig.body.appendChild(button(script.zigOrient === 'vertical' ? 'Orientación ↕' : 'Orientación ↔',
        engine.toggleZigOrientation, { disabled: script.pattern !== 'zig' }));
      panel.appendChild(zig.root);

      panel.appendChild(valueStepper(
        'Velocidad Script',
        `${String(script.speedIndex + 1).padStart(2, '0')}H`,
        () => engine.stepScriptSpeed(-1),
        () => engine.stepScriptSpeed(1),
        'Velocidad original 01H–30H, de 1000 ms a 200 ms.'
      ));
    }

    function renderMemoryControls(panel) {
      const memory = store.state.memory;

      const memoryMode = panelGroup('Memory', 'grid-trainer-memory-tools');
      const secButton = button('SEC', engine.toggleMemorySequence, {
        active: memory.seqMode,
        help: 'Alterna memoria visual simultánea y respuesta en secuencia.'
      });
      secButton.classList.add('grid-trainer-sec-btn');
      memoryMode.body.appendChild(secButton);
      memoryMode.body.appendChild(iconButton(
        memory.eyeOn ? 'Mostrar contexto del grid' : 'Enfocar área activa',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>',
        engine.toggleAll, {
        active: memory.eyeOn,
        help: 'Atenúa más las celdas externas para concentrar la vista en el área activa.'
      }));
      memoryMode.body.appendChild(iconButton(
        store.state.showLabels ? 'Ocultar etiquetas' : 'Mostrar etiquetas',
        store.state.showLabels ? eyeOpenIcon : eyeClosedIcon,
        engine.toggleLabels, {
        active: store.state.showLabels,
        help: 'Muestra u oculta los nombres de las manos dentro del grid.'
      }));
      memoryMode.body.appendChild(iconButton('Orden directo',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 7l5 5-5 5"/></svg>',
        () => engine.toggleMemoryOrder('forward'), {
          active: memory.orderFwd,
          disabled: !memory.seqMode || (memory.orderFwd && !memory.orderBwd),
          help: 'Responde las celdas en el mismo orden en que fueron mostradas.'
        }));
      memoryMode.body.appendChild(iconButton('Orden inverso',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M10 7l-5 5 5 5"/></svg>',
        () => engine.toggleMemoryOrder('backward'), {
          active: memory.orderBwd,
          disabled: !memory.seqMode || (memory.orderBwd && !memory.orderFwd),
          help: 'Responde las celdas en el orden inverso al mostrado.'
        }));
      panel.appendChild(memoryMode.root);

      const colors = panelGroup('Colores');
      Object.keys(engine.colors).forEach(color => {
        const colorButton = button(COLOR_LABELS[color],
          () => engine.toggleMemoryColor(color), {
            active: memory.colors.includes(color),
            disabled: memory.seqMode
          });
        colorButton.classList.add('grid-trainer-color');
        colorButton.style.setProperty('--grid-trainer-color', engine.colors[color]);
        colors.body.appendChild(colorButton);
      });
      panel.appendChild(colors.root);

      const parameters = panelGroup('Parámetros', 'grid-trainer-parameter-group');
      parameters.body.appendChild(valueStepper(
        'Velocidad',
        formatDuration(store.state.presetDuration) ||
          `${String(memory.speed).padStart(2, '0')}x`,
        () => engine.stepMemorySpeed(-1),
        () => engine.stepMemorySpeed(1),
        'Exposición original: 250 ms en 01x y hasta 10 s en 21x.'
      ));
      parameters.body.appendChild(valueStepper(
        'Cantidad',
        String(memory.count).padStart(2, '0'),
        () => engine.stepMemoryCount(-1),
        () => engine.stepMemoryCount(1),
        'Número de celdas por ronda: 1–50.'
      ));
      parameters.body.appendChild(valueStepper(
        'Área',
        store.state.presetGridSize
          ? `${store.state.presetGridSize}x${store.state.presetGridSize}`
          : memory.area === 'M' ? 'M' : String(memory.area).padStart(2, '0'),
        () => engine.stepMemoryArea(-1),
        () => engine.stepMemoryArea(1),
        'Área 1–6 o M. M permite seleccionar el pool manualmente.'
      ));
      panel.appendChild(parameters.root);
    }

    function renderTransport(panel) {
      const state = store.state;
      const controls = panelGroup('Transporte');
      controls.body.appendChild(button('Play', engine.play, {
        primary: true,
        active: state.transport === store.transport.PLAYING,
        disabled: state.transport === store.transport.PLAYING
      }));
      controls.body.appendChild(button('Pause', engine.pause, {
        active: state.transport === store.transport.PAUSED,
        disabled: state.transport === store.transport.STOPPED
      }));
      controls.body.appendChild(button('Stop', engine.stop, {
        disabled: state.transport === store.transport.STOPPED
      }));
      controls.body.appendChild(button('Siguiente', engine.nextRound, {
        disabled: state.mode !== 'memory' && !state.script.challenge,
        help: 'Inicia una ronda nueva conservando la configuración.'
      }));
      panel.appendChild(controls.root);
    }

    function renderPanel() {
      const panel = hosts.panel;
      const state = store.state;
      panel.innerHTML = '';
      panel.classList.add('grid-trainer-panel');

      const summary = node('section', 'workspace-card grid-trainer-summary');
      const header = node('div', 'workspace-head');
      header.appendChild(node('span', 'workspace-eyebrow', 'Grid Trainer'));
      header.appendChild(node('span',
        `grid-trainer-phase phase-${state.phase}`, PHASE_LABELS[state.phase]));
      summary.appendChild(header);
      summary.appendChild(node('div', 'context-main',
        state.mode === 'memory' ? 'Memory Mode' : 'Script Mode'));
      summary.appendChild(node('div', 'context-sub', state.feedback));
      panel.appendChild(summary);

      renderModeSelector(panel);
      if (state.mode === 'memory') renderMemoryControls(panel);
      else renderScriptControls(panel);
      renderTransport(panel);
    }

    function renderGrid() {
      const state = store.state;
      const script = state.script;
      const memory = state.memory;
      const grid = hosts.grid;
      const area = engine.trainingAreaSet();
      grid.innerHTML = '';
      grid.className = 'grid-trainer-board';
      grid.classList.toggle('memory-mode', state.mode === 'memory');
      grid.classList.toggle('preset-area', !!state.presetGridSize);
      grid.classList.toggle('memory-eye', state.mode === 'memory' && memory.eyeOn);
      grid.classList.toggle('hide-labels', !state.showLabels);
      grid.classList.toggle('area-movable',
        state.mode === 'memory' && memory.area !== 'M' && !memory.active && !memory.inQuiz);
      grid.classList.toggle('manual-area',
        state.mode === 'memory' && memory.area === 'M');
      grid.classList.toggle('manual-edit',
        state.mode === 'memory' && memory.area === 'M' && !memory.active && !memory.inQuiz);
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-label', 'Grid Trainer de rangos 13 por 13');

      engine.cells().forEach(cell => {
        const element = node('button', 'grid-trainer-cell', cell.label);
        element.type = 'button';
        element.dataset.cell = cell.id;
        element.setAttribute('aria-label', cell.label);
        element.classList.toggle('is-pair', cell.label.length === 2);
        element.classList.toggle('is-locked', script.locked.has(cell.id));
        element.classList.toggle('is-highlight', script.highlight === cell.id);
        element.classList.toggle('is-wrong', script.wrong.has(cell.id));
        element.classList.toggle('is-area', area.has(cell.id));
        element.classList.toggle('is-outside-area',
          (state.presetGridSize ||
            (state.mode === 'memory' && memory.area !== 'M')) && !area.has(cell.id));
        if (grid.classList.contains('area-movable')) {
          element.title = `Centrar el área en ${cell.label}`;
        }
        element.classList.toggle('is-manual', memory.area === 'M' && memory.manualPool.has(cell.id));
        if (memory.labels.has(cell.id)) {
          const color = memory.labels.get(cell.id);
          element.classList.add('is-memory-label');
          element.style.setProperty('--memory-color', engine.colors[color]);
          element.dataset.memoryColor = color;
        }
        element.addEventListener('click', () => engine.clickCell(cell.id));
        grid.appendChild(element);
      });
    }

    function statLine(label, value) {
      const line = node('div', 'stat-line');
      line.appendChild(node('span', 'stat-label', label));
      line.appendChild(node('span', 'stat-value', String(value)));
      return line;
    }

    function topErrors(bucket) {
      const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return entries.length
        ? entries.map(([key, value]) => `${key}: ${value}`).join(' · ')
        : 'Sin errores';
    }

    function instructions() {
      const state = store.state;
      const memory = state.memory;
      if (state.mode === 'script') {
        if (state.script.challenge) {
          return {
            title: state.target === '–' ? 'Challenge' : `Encuentra ${state.target}`,
            text: 'Pulsa la celda objetivo. Un acierto bloquea la mano y genera otro objetivo; un fallo queda marcado.'
          };
        }
        if (state.script.pattern) {
          return {
            title: `Patrón ${state.script.pattern}`,
            text: 'El patrón sustituye al tick aleatorio. Ajusta velocidad y pulsa Play; Stop reinicia su progreso.'
          };
        }
        return {
          title: 'Grid libre',
          text: 'Pulsa celdas para bloquearlas. Pintar/Borrar controla el efecto del tick automático y Random limita su pool.'
        };
      }
      if (memory.area === 'M' && !memory.active && !memory.inQuiz) {
        return {
          title: 'Área manual',
          text: 'Selecciona en el grid las celdas que formarán el pool. Si queda vacío al pulsar Play se recupera el área completa.'
        };
      }
      if (state.phase === phases.SHOWING) {
        return { title: 'Memoriza', text: 'Observa posiciones, colores y orden. Todavía no respondas.' };
      }
      if (state.phase === phases.ANSWERING) {
        return {
          title: memory.seqMode ? `Responde ${state.target}` : `Color objetivo: ${state.target}`,
          text: memory.seqMode
            ? 'El orden es estricto. Directa conserva el reveal; inversa lo recorre al revés; combinada concatena verdes y rojas inversas.'
            : 'Selecciona todas las celdas del color objetivo en cualquier orden.'
        };
      }
      return {
        title: memory.seqMode ? 'Memory secuencial' : 'Memory visual',
        text: memory.area === 'M'
          ? 'Selecciona las celdas del pool manual. Play inicia el ejercicio cuando termines.'
          : 'Pulsa cualquier celda para centrar allí el área. Configura velocidad y cantidad; Play inicia el ejercicio.'
      };
    }

    function renderInsights() {
      const state = store.state;
      const data = stats.snapshot();
      const combo = engine.comboStats();
      const info = instructions();
      const aside = hosts.insights;
      aside.innerHTML = '';
      aside.classList.add('grid-trainer-insights');

      const assistant = node('section', 'assistant-panel');
      assistant.appendChild(node('div', 'assistant-eyebrow',
        `Grid Trainer · ${PHASE_LABELS[state.phase]}`));
      assistant.appendChild(node('div', 'assistant-title', info.title));
      assistant.appendChild(node('p', 'assistant-text', info.text));
      aside.appendChild(assistant);

      const preset = engine.activePreset();
      if (preset) {
        const presetPanel = node('section', 'dash-panel');
        presetPanel.appendChild(node('div', 'dash-title', 'Preset oficial'));
        presetPanel.appendChild(statLine('Preset', preset.title));
        presetPanel.appendChild(statLine('Grid', `${preset.gridSize} × ${preset.gridSize}`));
        presetPanel.appendChild(statLine(preset.category === 'memory' ? 'Dificultad' : 'Objetivo',
          preset.difficulty || preset.objective));
        const duration = formatDuration(preset.duration);
        if (duration) presetPanel.appendChild(statLine('Visible', duration));
        if (preset.specialEffect.length) {
          presetPanel.appendChild(statLine('Efectos',
            preset.specialEffect.map(effect => EFFECT_LABELS[effect] || effect).join(' · ')));
        }
        aside.appendChild(presetPanel);
      }

      const progress = node('section', 'dash-panel');
      progress.appendChild(node('div', 'dash-title', 'Estado'));
      progress.appendChild(statLine('Modo', state.mode === 'memory' ? 'Memory' : 'Script'));
      progress.appendChild(statLine('Transporte', state.transport));
      progress.appendChild(statLine('Ronda', state.round));
      progress.appendChild(statLine('Objetivo', state.target));
      if (state.mode === 'script') {
        progress.appendChild(statLine('Manos', combo.hands));
        progress.appendChild(statLine('Combos', combo.total));
        progress.appendChild(statLine('P / S / O',
          `${combo.pairs} / ${combo.suited} / ${combo.offsuit}`));
      } else {
        progress.appendChild(statLine('Pendientes', state.memory.roundSeq.length));
        progress.appendChild(statLine('Área',
          state.presetGridSize ? `${state.presetGridSize} × ${state.presetGridSize}`
            : state.memory.area === 'M' ? `${state.memory.manualPool.size} manuales`
            : `${Number(state.memory.area) * 2 + 1} × ${Number(state.memory.area) * 2 + 1}`));
      }
      aside.appendChild(progress);

      const summary = node('section', 'dash-panel');
      summary.appendChild(node('div', 'dash-title', 'Estadísticas'));
      summary.appendChild(statLine('Rondas', data.rounds));
      summary.appendChild(statLine('Acertadas', data.correct));
      summary.appendChild(statLine('Falladas', data.failed));
      summary.appendChild(statLine('Precisión', `${data.accuracy}%`));
      summary.appendChild(statLine('Racha actual', data.currentStreak));
      summary.appendChild(statLine('Mejor racha', data.bestStreak));
      aside.appendChild(summary);

      const errors = node('section', 'dash-panel');
      errors.appendChild(node('div', 'dash-title', 'Errores'));
      errors.appendChild(statLine('Por modo', topErrors(data.errorsByMode)));
      errors.appendChild(statLine('Por tamaño', topErrors(data.errorsBySize)));
      errors.appendChild(statLine('Por dificultad', topErrors(data.errorsByDifficulty)));
      aside.appendChild(errors);
    }

    function renderGallery() {
      const gallery = hosts.gallery;
      const previousTrack = gallery.querySelector('.range-gallery-track');
      if (previousTrack) galleryScroll = previousTrack.scrollLeft;
      gallery.innerHTML = '';
      gallery.className = 'range-gallery grid-trainer-gallery';
      const head = node('div', 'range-gallery-head');
      const heading = node('div', 'range-gallery-heading');
      heading.appendChild(node('span', 'range-gallery-kicker', 'Presets oficiales'));
      const visiblePresets = engine.presets.filter(preset =>
        store.state.presetFilter === 'all' || preset.category === store.state.presetFilter);
      heading.appendChild(node('span', 'range-gallery-count',
        `${visiblePresets.length} de ${engine.presets.length}`));
      head.appendChild(heading);

      const filters = node('div', 'range-gallery-filters');
      [
        ['all', 'TODOS'],
        ['memory', 'MEMORY'],
        ['visual', 'VISUAL']
      ].forEach(([id, label]) => {
        filters.appendChild(button(label, () => {
          store.state.presetFilter = id;
          galleryScroll = 0;
          store.notify();
        }, {
          active: store.state.presetFilter === id
        }));
      });
      head.appendChild(filters);
      gallery.appendChild(head);

      const rail = node('div', 'range-gallery-track grid-trainer-preset-track');
      visiblePresets.forEach(preset => {
        const active = store.state.activePresetId === preset.id;
        const card = node('button',
          `range-card grid-trainer-preset-card${active ? ' is-active' : ''}`);
        card.type = 'button';
        card.setAttribute('aria-pressed', String(active));
        if (active) card.setAttribute('aria-current', 'true');

        const cardHead = node('div', 'range-card-head');
        cardHead.appendChild(node('strong', 'range-card-title', preset.title));
        const activeLabel = node('span', 'range-card-active', active ? 'Activo' : '');
        activeLabel.hidden = !active;
        cardHead.appendChild(activeLabel);
        card.appendChild(cardHead);

        const details = node('div', 'grid-trainer-preset-details');
        details.appendChild(node('strong', 'grid-trainer-preset-description',
          preset.description));
        details.appendChild(node('span', '', `${preset.gridSize} × ${preset.gridSize}`));
        if (preset.category === 'memory') {
          details.appendChild(node('span', '', `${preset.cellCount} celdas`));
        } else if (preset.challengeEnabled) {
          details.appendChild(node('span', '',
            `Challenge${preset.pattern ? ` · ${preset.description.split(' ').pop()}` : ''}`));
        } else {
          details.appendChild(node('span', '',
            preset.pattern ? `Patrón ${preset.description}` : 'Grid libre'));
        }
        const duration = formatDuration(preset.duration);
        if (duration) details.appendChild(node('span', '', duration));
        details.appendChild(node('span', 'grid-trainer-preset-difficulty',
          preset.difficulty || `Nivel ${String(preset.level).padStart(2, '0')} · ${preset.objective}`));
        card.appendChild(details);

        const presetStats = stats.presetSnapshot(preset.id);
        const metrics = node('div', 'range-card-metrics grid-trainer-preset-metrics');
        if (presetStats) {
          metrics.appendChild(node('strong', '',
            `${presetStats.accuracy}% · ${presetStats.attempts}`));
          metrics.appendChild(node('span', '', `Racha ${presetStats.bestStreak}`));
        } else {
          metrics.appendChild(node('strong', '', 'Sin datos'));
          metrics.appendChild(node('span', '', '0 intentos'));
        }
        card.appendChild(metrics);
        card.addEventListener('click', () => {
          galleryScroll = rail.scrollLeft;
          engine.applyPreset(preset.id);
        });
        rail.appendChild(card);
      });
      rail.addEventListener('wheel', event => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (rail.scrollWidth <= rail.clientWidth) return;
        const before = rail.scrollLeft;
        rail.scrollLeft += event.deltaY;
        if (rail.scrollLeft !== before) event.preventDefault();
      }, { passive: false });
      gallery.appendChild(rail);
      rail.scrollLeft = galleryScroll;
    }

    function renderActionBar() {
      const bar = hosts.actionBar;
      bar.innerHTML = '';
      bar.appendChild(button('Play', engine.play, {
        primary: true,
        disabled: store.state.transport === store.transport.PLAYING
      }));
      bar.appendChild(button('Pause', engine.pause, {
        disabled: store.state.transport === store.transport.STOPPED
      }));
      bar.appendChild(button('Stop', engine.stop, {
        disabled: store.state.transport === store.transport.STOPPED
      }));
      bar.classList.add('has-items');
    }

    function render() {
      if (!hosts) return;
      renderPanel();
      renderGrid();
      renderInsights();
      renderGallery();
      renderActionBar();
      hosts.statusLabel.textContent =
        `Grid Trainer · ${store.state.mode === 'memory' ? 'Memory' : 'Script'}`;
      hosts.statusStats.textContent = store.state.mode === 'memory'
        ? `${String(store.state.memory.count).padStart(2, '0')} celdas · área ${store.state.memory.area}`
        : `${engine.comboStats().total} combos`;
      document.body.classList.toggle('grid-trainer-zen', store.state.script.zen);
      if (zenExitButton) zenExitButton.hidden = !store.state.script.zen;
    }

    function mount(nextHosts) {
      hosts = nextHosts;
      if (!zenExitButton) {
        zenExitButton = button('Salir de Zen', engine.toggleZen, {
          title: 'Salir del modo Zen'
        });
        zenExitButton.classList.add('grid-trainer-zen-exit');
        zenExitButton.setAttribute('aria-label', 'Salir del modo Zen');
        zenExitButton.hidden = true;
        document.body.appendChild(zenExitButton);
      }
      if (!unsubscribe) unsubscribe = store.subscribe(render);
      render();
    }

    function unmount() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      engine.destroy();
      document.body.classList.remove('grid-trainer-zen');
      if (zenExitButton) zenExitButton.remove();
      zenExitButton = null;
      if (hosts) {
        hosts.panel.classList.remove('grid-trainer-panel');
        hosts.insights.classList.remove('grid-trainer-insights');
        hosts.gallery.classList.remove('grid-trainer-gallery');
        hosts.actionBar.classList.remove('has-items');
        hosts.grid.className = '';
      }
      hosts = null;
    }

    return { mount, unmount, render };
  }

  RT.GridTrainerUI = { create };
})(window.RT);
