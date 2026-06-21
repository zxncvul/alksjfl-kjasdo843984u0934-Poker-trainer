/* ============================================================================
 * simulator-ui.js — SIMULADOR INTEGRADO EN EL WORKSPACE (mesa 6-max)
 * ============================================================================
 * El simulador es un modo del workspace compartido. app.js conserva matriz,
 * paneles y biblioteca, y delega aquí la configuración y la mesa:
 *
 *   RT.SimUI.renderStage(stageEl, helpers) → superficie de mesa/configuración
 *   RT.SimUI.actionBarItems(helpers)       → botones de la barra móvil
 *   RT.SimUI.handleKey(key)                → 1-4 decidir · N siguiente ·
 *                                            R repetir · V ver rangos
 *
 * PANTALLAS
 *   idle/finished → configuración en los paneles laterales, con matriz visible.
 *   deciding      → mesa 6-max esquemática (asientos, ciegas, apuestas,
 *                   bote, dealer), mano de Hero, decisión con botones
 *                   grandes, stats pequeñas de sesión e historial breve.
 *   feedback      → mismo escenario con veredicto compacto, acción correcta,
 *                   rango usado, Siguiente y Repetir situación si hubo fallo.
 *
 * VER RANGOS: además de la matriz principal, el botón "Ver rangos" abre un
 * modal amplio con el contexto relevante y su desglose.
 *
 * La mesa es HTML/CSS puro: un óvalo sobrio con 6 asientos posicionados,
 * sin fieltro verde, sin avatares, sin animaciones.
 *
 * El registro en RT.Stats se mantiene aquí (una vez por decisión), igual que
 * antes. Configuración persistida en 'rt:sim:v1' y filtro en 'rt:simfilter:v1'.
 * ==========================================================================*/
'use strict';

(function (RT) {

  /* ------------------------- Configuración local ------------------------ */

  const CFG_KEY = 'rt:sim:v1';
  const FILTER_KEY = 'rt:simfilter:v1';
  const LEGACY_CFG_KEYS = ['rt:sim'];
  const LEGACY_FILTER_KEYS = ['rt:simfilter'];

  const MODES = ['realista', 'aleatorio', 'campana'];
  const TRAINS = ['or', 'vs3bet', 'full'];
  const FREQS = ['off', 'baja', 'media', 'alta', 'realista'];
  const KINDS = [
    'todas', 'range', 'premium', 'borderline', 'falladas', 'faciles', 'filtro'
  ];
  const ACTION_KEYS = { FOLD: '1', OR: '2', CALL: '3', '3BET': '4', '4BET': '5' };

  const cfg = {
    tool: 'preflop',
    mode: 'realista',
    train: 'full',
    positions: new Set(),
    threeBet: 'realista',
    count: 10,             // 0 = infinito (la campaña fija su propio total)
    handKind: 'todas',
    tableView: 'hero-bottom'
  };

  let filter = new Set();       // filtro personalizado de manos iniciales
  let editingFilter = false;    // mini-matriz del filtro en modo edición
  let lastSimStatus = 'idle';
  let configNotice = '';
  const REVIEW_MS = 4000;
  let reviewTimeout = null;
  let reviewInterval = null;
  let reviewDeadline = 0;
  let reviewRemaining = REVIEW_MS;
  let reviewPaused = false;

  function updateReviewCountdown() {
    const seconds = Math.max(0, Math.ceil(reviewRemaining / 1000));
    document.querySelectorAll('.sim-review-countdown').forEach((node) => {
      node.textContent = reviewPaused ? `Pausada · ${seconds}s` : `Siguiente en ${seconds}s`;
    });
    document.querySelectorAll('.sim-review-toggle').forEach((button) => {
      button.textContent = reviewPaused ? 'Continuar' : 'Pausar revisión';
    });
  }

  function clearReviewTimers(reset = true) {
    clearTimeout(reviewTimeout);
    clearInterval(reviewInterval);
    reviewTimeout = null;
    reviewInterval = null;
    if (reset) {
      reviewDeadline = 0;
      reviewRemaining = REVIEW_MS;
      reviewPaused = false;
    }
  }

  function finishReview() {
    clearReviewTimers();
    if (RT.Simulator.state.status === 'feedback') RT.Simulator.next();
  }

  function armReviewTimer() {
    clearReviewTimers(false);
    reviewDeadline = Date.now() + reviewRemaining;
    reviewTimeout = setTimeout(finishReview, reviewRemaining);
    reviewInterval = setInterval(() => {
      reviewRemaining = Math.max(0, reviewDeadline - Date.now());
      updateReviewCountdown();
    }, 200);
    updateReviewCountdown();
  }

  function startReview() {
    clearReviewTimers();
    reviewRemaining = REVIEW_MS;
    armReviewTimer();
  }

  function pauseReview() {
    if (reviewPaused || !reviewTimeout) return;
    reviewRemaining = Math.max(0, reviewDeadline - Date.now());
    reviewPaused = true;
    clearReviewTimers(false);
    updateReviewCountdown();
  }

  function resumeReview() {
    if (!reviewPaused || reviewRemaining <= 0) return;
    reviewPaused = false;
    armReviewTimer();
  }

  function resetLocalState() {
    cfg.mode = 'realista';
    cfg.train = 'full';
    cfg.positions = new Set();
    cfg.threeBet = 'realista';
    cfg.count = 10;
    cfg.handKind = 'todas';
    cfg.tableView = 'hero-bottom';
    cfg.tool = 'preflop';
    filter = new Set();
    editingFilter = false;
    configNotice = '';
  }

  function readStored(ls, key, legacyKeys) {
    let value = ls.getItem(key);
    if (value) return value;
    for (const legacyKey of legacyKeys) {
      value = ls.getItem(legacyKey);
      if (value) return value;
    }
    return null;
  }

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  function loadLocal() {
    const ls = storage();
    if (!ls) return;
    try {
      const d = JSON.parse(readStored(ls, CFG_KEY, LEGACY_CFG_KEYS) || '{}');
      if (MODES.includes(d.mode)) cfg.mode = d.mode;
      else if (d.mode === 'lineal') cfg.mode = 'realista';   // migración
      if (TRAINS.includes(d.train)) cfg.train = d.train;
      if (FREQS.includes(d.threeBet)) cfg.threeBet = d.threeBet;
      if ([0, 10, 25, 50].includes(d.count)) cfg.count = d.count;
      if (d.handKind === 'premium') cfg.handKind = 'range';
      else if (d.handKind === 'faciles') cfg.handKind = 'todas';
      else if (KINDS.includes(d.handKind)) cfg.handKind = d.handKind;
      else if (d.useFilter === true) cfg.handKind = 'filtro'; // migración
      if (d.tableView === 'fixed' || d.tableView === 'hero-bottom') {
        cfg.tableView = d.tableView;
      }
      if (d.tool === 'preflop' || d.tool === 'duel' || d.tool === 'position' || d.tool === 'pot-odds') cfg.tool = d.tool;
      if (Array.isArray(d.positions)) {
        cfg.positions = new Set(d.positions.filter(p => RT.Hands.POSITIONS.includes(p)));
      }
    } catch (err) {
      console.warn('[RT.Simulator] Configuración guardada ilegible; se usan valores por defecto:', err);
    }
    try {
      const rawF = JSON.parse(readStored(ls, FILTER_KEY, LEGACY_FILTER_KEYS) || '[]');
      if (Array.isArray(rawF)) {
        filter = new Set(rawF.filter(h => RT.Hands.ALL_HANDS.includes(h)));
      }
    } catch (err) {
      console.warn('[RT.Simulator] Filtro guardado ilegible; se limpia:', err);
      filter = new Set();
    }
    saveLocal();
  }

  function saveLocal() {
    const ls = storage();
    if (!ls) return;
    try {
      ls.setItem(CFG_KEY, JSON.stringify({
        mode: cfg.mode, train: cfg.train, threeBet: cfg.threeBet,
        count: cfg.count, handKind: cfg.handKind, tableView: cfg.tableView,
        tool: cfg.tool,
        positions: Array.from(cfg.positions)
      }));
      ls.setItem(FILTER_KEY, JSON.stringify(Array.from(filter)));
    } catch (err) {
      console.warn('[RT.Simulator] No se pudo guardar la configuración:', err);
    }
  }

  function selectedTrain(contexts, fallback) {
    const selected = simulatorContexts(contexts);
    const spots = new Set(selected.map(id => id.split('|')[0]));
    return selected.length
      ? (spots.size === 1 && spots.has('OR')
          ? 'or'
          : (spots.size === 1 && spots.has('VS3BET') ? 'vs3bet' : 'full'))
      : fallback;
  }

  /** El motor actual solo evalúa OR y VS3BET; otros repertorios se explican
   * en la UI y nunca se cuentan silenciosamente como participantes. */
  function simulatorContexts(contexts) {
    return (contexts || []).filter(id => {
      const spot = String(id).split('|')[0];
      return spot === 'OR' || spot === 'VS3BET';
    });
  }

  function engineConfig(source, contexts) {
    const selected = simulatorContexts(contexts);
    return {
      source,
      mode: cfg.mode,
      train: selectedTrain(selected, cfg.train),
      positions: selected.length ? [] : Array.from(cfg.positions),
      threeBet: cfg.threeBet,
      count: cfg.mode === 'campana' ? 0 : cfg.count,
      handKind: cfg.handKind,
      weightFailedHands: RT.Settings.get('weightFailedHands'),
      filter,
      contexts: selected
    };
  }

  /* ----------------------------- Utilidades ----------------------------- */

  function actionLabel(id) {
    if (id === 'OR') return 'Open Raise';
    const d = RT.Engine.getActionDef(id);
    return d ? d.label : id;
  }

  function actionColor(id) {
    const d = RT.Engine.getActionDef(id);
    return d ? d.color : null;
  }

  const tableView = RT.SimulatorTableView.create({
    getTableView: () => cfg.tableView,
    actionLabel,
    actionColor
  });

  function renderToolChange(H) {
    const paint = () => {
      if (H && typeof H.renderAll === 'function') H.renderAll();
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(paint);
      return;
    }
    paint();
  }

  function setSimulatorTool(tool, H) {
    if (tool !== 'preflop' && tool !== 'duel' && tool !== 'position' && tool !== 'pot-odds') return;
    if (cfg.tool === tool) return;
    const previousTool = cfg.tool;
    clearReviewTimers();
    // Selecciona el destino antes de parar el ejercicio anterior. Los stop()
    // emiten sim:changed de forma síncrona; así ese único repintado ya muestra
    // la herramienta nueva, en vez de reconstruir la interfaz vieja y la nueva.
    cfg.tool = tool;
    saveLocal();
    if (tool === 'pot-odds' && RT.SimulatorPotOdds && !RT.SimulatorPotOdds.state.round) {
      RT.SimulatorPotOdds.startSession(false);
    }
    if (previousTool === 'preflop' && RT.Simulator.state.status !== 'idle') {
      RT.Simulator.stop();
      return;
    }
    if (previousTool === 'duel' && RT.SimulatorDuelHands) {
      RT.SimulatorDuelHands.stop();
      return;
    }
    if (previousTool === 'position' && RT.SimulatorPosition) {
      RT.SimulatorPosition.stop(false);
      renderToolChange(H);
      return;
    }
    if (previousTool === 'pot-odds' && RT.SimulatorPotOdds) {
      RT.SimulatorPotOdds.stop(false);
      renderToolChange(H);
      return;
    }
    // Preflop inactivo no emite al salir: en ese caso sí necesitamos pintar.
    H.renderAll();
  }

  function renderSimulatorToolTabs(H) {
    const tabs = H.el('div', 'sim-tool-tabs');
    [
      ['preflop', 'Preflop'],
      ['duel', 'Showdown'],
      ['position', 'Position'],
      ['pot-odds', 'Pot Odds']
    ].forEach(([id, label]) => {
      tabs.appendChild(H.button(label, {
        variant: cfg.tool === id ? 'btn-primary' : '',
        onClick: () => setSimulatorTool(id, H)
      }));
    });
    return tabs;
  }

  /* ========================================================================
   * PANTALLA COMPLETA (stage)
   * ======================================================================*/

  function renderStage(stage, H) {
    stage.innerHTML = '';
    if (cfg.tool === 'position' && RT.SimulatorPositionUI) {
      RT.SimulatorPositionUI.renderStage(stage, H);
      return;
    }
    if (cfg.tool === 'pot-odds' && RT.SimulatorPotOddsUI) {
      if (RT.SimulatorPotOdds && !RT.SimulatorPotOdds.state.round) {
        RT.SimulatorPotOdds.startSession(false);
      }
      RT.SimulatorPotOddsUI.renderStage(stage, H);
      return;
    }
    if (cfg.tool === 'duel' && RT.SimulatorDuelHandsUI) {
      RT.SimulatorDuelHandsUI.renderStage(stage, H);
      return;
    }
    const st = RT.Simulator.state;
    if (st.status === 'deciding' || st.status === 'feedback') {
      renderPlayScreen(stage, H, st);
      return;
    }
    const wrap = H.el('div', 'sim-play sim-play-waiting');
    const dash = H.el('div', 'sim-dash');
    const main = H.el('div', 'sim-main');
    main.appendChild(tableView.renderWaitingTable(H));
    const zone = H.el('div', 'sim-zone sim-zone-placeholder');
    const row = H.el('div', 'sim-decisions');
    ['Fold', 'Open Raise'].forEach((label) => {
      const b = H.button(label, { variant: 'btn-decision' });
      b.setAttribute('tabindex', '-1');
      row.appendChild(b);
    });
    zone.appendChild(row);
    main.appendChild(zone);
    dash.appendChild(main);
    wrap.appendChild(dash);
    stage.appendChild(wrap);
  }

  function renderPanel(panel, H) {
    if (cfg.tool === 'position' && RT.SimulatorPositionUI) {
      const box = H.el('div', 'sim-config');
      RT.SimulatorPositionUI.renderPanel(box, H, renderSimulatorToolTabs(H));
      panel.appendChild(box);
      return;
    }
    if (cfg.tool === 'duel' && RT.SimulatorDuelHandsUI) {
      const box = H.el('div', 'sim-config');
      RT.SimulatorDuelHandsUI.renderPanel(box, H, renderSimulatorToolTabs(H));
      panel.appendChild(box);
      return;
    }
    if (cfg.tool === 'pot-odds' && RT.SimulatorPotOddsUI) {
      const box = H.el('div', 'sim-config');
      RT.SimulatorPotOddsUI.renderPanel(box, H, renderSimulatorToolTabs(H));
      panel.appendChild(box);
      return;
    }
    const st = RT.Simulator.state;
    if (st.status === 'idle' || st.status === 'finished') {
      renderConfigScreen(panel, H, st);
      return;
    }
    panel.appendChild(renderSimulatorToolTabs(H));
    const card = H.el('section', 'workspace-card');
    card.appendChild(H.el('div', 'workspace-eyebrow', 'Control de sesión'));
    card.appendChild(H.statLine('Repertorios', H.selectedContexts.length || 'Todos'));
    card.appendChild(H.statLine('Estado', st.status === 'feedback' ? 'Revisión' : 'Decidiendo'));
    card.appendChild(H.group('', [
      H.button('Ver rango', { variant: 'btn-ghost', onClick: () => openRangeViewer(H) }),
      H.button('Salir', { variant: 'btn-ghost', onClick: () => RT.Simulator.stop() })
    ]));
    panel.appendChild(card);
  }

  /* --------------------------- Configuración ---------------------------- */

  function renderConfigScreen(stage, H, st) {
    const box = H.el('div', 'sim-config');
    box.appendChild(renderSimulatorToolTabs(H));

    if (st.status === 'finished') renderSessionSummary(box, H, st);

    const av = RT.Simulator.availability(H.source);
    if (!av.orHeroes.length && !av.vs3betHeroes.length) {
      box.appendChild(H.hint('No hay rangos suficientes para simular: añade rangos OR o de defensa vs 3bet al repertorio.'));
      stage.appendChild(box);
      return;
    }

    box.appendChild(H.el('h2', 'sim-config-title', 'Simulador preflop 6-max'));
    box.appendChild(H.hint('Decisiones reales de mesa, evaluadas con tus rangos guardados.'));
    const compatibleContexts = simulatorContexts(H.selectedContexts);
    const ignoredContexts = H.selectedContexts.length - compatibleContexts.length;
    if (compatibleContexts.length) {
      const selectedTrainLabel = {
        or: 'Open raise', vs3bet: 'Defensa vs 3bet', full: 'Spot completo'
      }[selectedTrain(compatibleContexts, cfg.train)];
      box.appendChild(H.el('div', 'inline-notice',
        `${compatibleContexts.length} repertorios desde la biblioteca · ${selectedTrainLabel}`));
    }
    if (ignoredContexts) {
      box.appendChild(H.el(
        'div',
        'inline-notice is-warning',
        `${ignoredContexts} repertorio${ignoredContexts === 1 ? '' : 's'} ` +
          'no participa en este simulador porque no es OR ni defensa vs 3bet.'
      ));
    }
    if (configNotice) {
      const notice = H.el('div', 'inline-notice is-warning', configNotice);
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      box.appendChild(notice);
    }

    box.appendChild(H.selectGroup('Modo', [
      { id: 'realista', label: 'Realista · rota posiciones como en mesa' },
      { id: 'aleatorio', label: 'Aleatorio · posición y mano al azar' },
      { id: 'campana', label: 'Campaña · 10 manos por posición, en orden' }
    ], cfg.mode, (v) => { cfg.mode = v; saveLocal(); H.renderAll(); }));

    const trainOpts = [];
    if (av.orHeroes.length) trainOpts.push({ id: 'or', label: 'Solo open raise' });
    if (av.vs3betHeroes.length) trainOpts.push({ id: 'vs3bet', label: 'Solo defensa vs 3bet' });
    if (av.orHeroes.length && av.vs3betHeroes.length) {
      trainOpts.push({ id: 'full', label: 'Spot completo · open y posible 3bet' });
    }
    if (!trainOpts.some(o => o.id === cfg.train)) cfg.train = trainOpts[0].id;
    if (!H.selectedContexts.length) {
      box.appendChild(H.selectGroup('Entrenamiento', trainOpts, cfg.train,
        (v) => {
          cfg.train = v;
          const allowed = v === 'vs3bet' ? av.vs3betHeroes : av.orHeroes;
          cfg.positions = new Set(Array.from(cfg.positions).filter(p => allowed.includes(p)));
          saveLocal();
          H.renderAll();
        }));
    }

    if (selectedTrain(H.selectedContexts, cfg.train) === 'full') {
      box.appendChild(H.selectGroup('Aparición de 3bet', [
        { id: 'off', label: 'Sin 3bets' },
        { id: 'baja', label: 'Baja (~25%)' },
        { id: 'media', label: 'Media (~50%)' },
        { id: 'alta', label: 'Alta (~75%)' },
        { id: 'realista', label: 'Realista · según posición, sin rachas' }
      ], cfg.threeBet, (v) => { cfg.threeBet = v; saveLocal(); H.renderAll(); }));
    }

    if (cfg.mode !== 'campana') {
      box.appendChild(H.selectGroup('Número de manos', [
        { id: 10, label: '10' }, { id: 25, label: '25' }, { id: 50, label: '50' },
        { id: 0, label: 'Infinito · salir a mano' }
      ], cfg.count, (v) => { cfg.count = Number(v); saveLocal(); H.renderAll(); }));
    } else {
      const basePositions = selectedTrain(H.selectedContexts, cfg.train) === 'vs3bet'
        ? av.vs3betHeroes : av.orHeroes;
      const nPos = cfg.positions.size
        ? Array.from(cfg.positions).filter(p => basePositions.includes(p)).length || basePositions.length
        : basePositions.length;
      box.appendChild(H.hint(`Campaña completa: 10 manos × ${nPos} posiciones = ${nPos * 10} manos.`));
    }

    box.appendChild(H.selectGroup('Dealing Coverage', [
      { id: 'todas', label: 'Todo' },
      { id: 'range', label: 'Solo rango' },
      { id: 'borderline', label: 'Solo frontera' },
      {
        id: 'falladas',
        label: Object.keys(RT.Stats.getHandHeat('fails')).length
          ? 'Solo falladas'
          : 'Solo falladas · sin datos',
        disabled: !Object.keys(RT.Stats.getHandHeat('fails')).length
      },
      { id: 'filtro', label: 'Personalizado' }
    ], cfg.handKind, (v) => { cfg.handKind = v; saveLocal(); H.renderAll(); }));

    // Posiciones — plegado.
    const basePositions = selectedTrain(H.selectedContexts, cfg.train) === 'vs3bet'
      ? av.vs3betHeroes : av.orHeroes;
    if (!H.selectedContexts.length) {
      box.appendChild(H.collapsible('sim-positions', 'Posiciones', (body) => {
        body.appendChild(H.multiSelectGroup('Vacío = todas las disponibles',
          RT.Hands.POSITIONS.map(p => ({ id: p, label: p, disabled: !basePositions.includes(p) })),
          cfg.positions, () => { saveLocal(); H.renderAll(); }));
      }, { badge: cfg.positions.size ? String(cfg.positions.size) : '' }));
    }

    // Filtro personalizado — editor con mini-matriz dentro del propio bloque.
    if (cfg.handKind === 'filtro') {
      box.appendChild(H.collapsible('sim-filter', 'Filtro de manos iniciales', (body) => {
        body.appendChild(H.hint('Las manos pintadas son las que PUEDEN repartirse. No es la respuesta correcta: solo controla el reparto.'));
        body.appendChild(H.group('', [
          H.button(editingFilter ? 'Terminar edición' : 'Editar pintando', {
            active: editingFilter,
            onClick: () => { editingFilter = !editingFilter; H.renderAll(); }
          }),
          H.button('Toda la matriz', {
            onClick: () => { filter = new Set(RT.Hands.ALL_HANDS); saveLocal(); H.renderAll(); }
          }),
          H.button('Limpiar', {
            variant: 'btn-ghost',
            onClick: () => { filter.clear(); saveLocal(); H.renderAll(); }
          })
        ]));
        body.appendChild(H.group('Atajos', filterPresets(H)));
        body.appendChild(miniMatrix(H, {
          interactive: editingFilter,
          selected: filter,
          onToggle: (hand) => {
            if (filter.has(hand)) filter.delete(hand);
            else filter.add(hand);
            saveLocal();
          }
        }));
        body.appendChild(H.hint(filter.size
          ? `${filter.size} manos en el filtro.`
          : 'Filtro vacío = toda la matriz.'));
      }, { badge: filter.size ? String(filter.size) : '' }));
    }

    // Repaso de falladas del simulador.
    const failedSim = RT.Stats.getFailedIds({}).filter(id => id.startsWith('sim@'));
    if (failedSim.length) {
      box.appendChild(H.collapsible('sim-failed', 'Repasar falladas del simulador', (body) => {
        const startFailed = (ids) => {
          if (!RT.Simulator.startFromFailed(ids)) {
            configNotice = 'Esas situaciones ya no se pueden reconstruir con los rangos actuales.';
            H.renderAll();
          }
        };
        body.appendChild(H.group('', [
          H.button(`Recientes (${Math.min(failedSim.length, 25)})`, {
            onClick: () => startFailed(
              RT.Stats.getFailedIds({ mode: 'recent' }).filter(id => id.startsWith('sim@')).slice(0, 25))
          }),
          H.button('Más falladas', {
            onClick: () => startFailed(
              RT.Stats.getFailedIds({ mode: 'frequent' }).filter(id => id.startsWith('sim@')))
          })
        ]));
      }, { badge: String(failedSim.length) }));
    }

    box.appendChild(H.group('', [
      H.button('Empezar simulación', {
        variant: 'btn-primary',
        disabled: H.selectedContexts.length > 0 && compatibleContexts.length === 0,
        onClick: () => {
          editingFilter = false;
          configNotice = '';
          if (!RT.Simulator.start(engineConfig(H.source, H.selectedContexts))) {
            configNotice = 'No hay situaciones posibles con esa configuración. Revisa las posiciones y el tipo de entrenamiento.';
            H.renderAll();
          }
        }
      }),
      H.button('Ver rangos', { variant: 'btn-ghost', onClick: () => openRangeViewer(H) })
    ]));

    stage.appendChild(box);
  }

  /** Atajos del filtro personalizado (presets pintados de una vez). */
  function filterPresets(H) {
    const presets = [
      ['Solo Ax', h => h[0] === 'A' && h.length > 2],
      ['Solo pares', h => h.length === 2],
      ['Suited connectors', h => h.length === 3 && h[2] === 's' && RT.Hands.isConnector(h)]
    ];
    const buttons = presets.map(([label, fn]) => H.button(label, {
      onClick: () => {
        filter = new Set(RT.Hands.ALL_HANDS.filter(fn));
        saveLocal();
        H.renderAll();
      }
    }));
    // "Solo falladas" si hay calor de fallos suficiente.
    const fails = Object.keys(RT.Stats.getHandHeat('fails'));
    if (fails.length >= 3) {
      buttons.push(H.button(`Solo falladas (${fails.length})`, {
        onClick: () => { filter = new Set(fails); saveLocal(); H.renderAll(); }
      }));
    }
    return buttons;
  }

  /* ------------------------------ En juego ------------------------------ */

  function renderPlayScreen(stage, H, st) {
    const s = st.situation;
    const wrap = H.el('div', 'sim-play');

    // Cabecera fina: progreso + stats pequeñas + ver rangos + salir.
    const top = H.el('div', 'sim-topbar');
    // Datos de sesión compactos: mano, acierto, errores y racha actual.
    const total = st.score.ok + st.score.fail;
    const pct = total ? Math.round(st.score.ok / total * 100) : 100;
    let streak = 0;
    for (const h of st.history) { if (h.perfect) streak++; else break; }
    top.appendChild(H.el('span', 'sim-progress', progressLabel(st)));
    top.appendChild(H.el('span', 'sim-session-stats',
      `Acierto ${pct}% · Errores ${st.score.fail} · Racha ${streak}`));
    const topBtns = H.el('span', 'sim-topbtns');
    const layoutBtn = H.button(
      cfg.tableView === 'hero-bottom' ? 'Hero abajo' : 'Posiciones fijas',
      {
        variant: 'btn-ghost',
        title: 'Cambiar distribución visual de los asientos',
        onClick: () => {
          cfg.tableView = cfg.tableView === 'hero-bottom' ? 'fixed' : 'hero-bottom';
          saveLocal();
          H.renderAll();
        }
      }
    );
    layoutBtn.classList.add('btn-sm', 'sim-layout-toggle');
    topBtns.appendChild(layoutBtn);
    const viewBtn = H.button('Ver rangos', { variant: 'btn-ghost', onClick: () => openRangeViewer(H) });
    viewBtn.classList.add('btn-sm');
    topBtns.appendChild(viewBtn);
    const exitBtn = H.button('Salir', { variant: 'btn-ghost', onClick: () => RT.Simulator.stop() });
    exitBtn.classList.add('btn-sm');
    topBtns.appendChild(exitBtn);
    top.appendChild(topBtns);
    wrap.appendChild(top);

    // Dashboard: columna principal (mesa + decisión) y columna de métricas.
    const dash = H.el('div', 'sim-dash');
    const main = H.el('div', 'sim-main');
    main.appendChild(tableView.renderTable(H, st));

    // La mesa ya contiene cartas, stacks, spot y línea de acción.
    const zone = H.el('div', 'sim-zone');

    if (st.status === 'deciding') {
      const row = H.el('div', 'sim-decisions');
      s.options.forEach((opt) => {
        const b = H.button(actionLabel(opt), {
          variant: 'btn-decision',
          help: `Elige ${actionLabel(opt)} para la mano y el contexto actuales.`,
          onClick: () => RT.Simulator.answer(opt)
        });
        b.appendChild(H.el('span', 'sim-key-hint', ACTION_KEYS[opt] || ''));
        const color = actionColor(opt);
        if (color) { b.style.setProperty('--btn-accent', color); b.classList.add('btn-action'); }
        row.appendChild(b);
      });
      zone.appendChild(row);
    } else if (st.lastDecision && !st.lastDecision.perfect) {
      zone.appendChild(renderVerdict(H, st));
    }

    main.appendChild(zone);
    dash.appendChild(main);
    wrap.appendChild(dash);
    stage.appendChild(wrap);
  }

  /** Columna de métricas (escritorio): todo visible, sin desplegables. */
  function renderInsights(aside, H) {
    if (cfg.tool === 'position' && RT.SimulatorPositionUI) {
      RT.SimulatorPositionUI.renderInsights(aside, H);
      return;
    }
    if (cfg.tool === 'duel' && RT.SimulatorDuelHandsUI) {
      RT.SimulatorDuelHandsUI.renderInsights(aside, H);
      return;
    }
    if (cfg.tool === 'pot-odds' && RT.SimulatorPotOddsUI) {
      RT.SimulatorPotOddsUI.renderInsights(aside, H);
      return;
    }
    const st = RT.Simulator.state;
    const active = st.status === 'deciding' || st.status === 'feedback';

    aside.appendChild(H.dashPanel('Workspace', (body) => {
      body.appendChild(H.statLine('Repertorios', H.selectedContexts.length || 'Todos'));
      body.appendChild(H.statLine('Estado', active
        ? (st.status === 'feedback' ? 'Revisión' : 'Decidiendo')
        : 'Configuración'));
      if (st.config) body.appendChild(H.statLine('Entrenamiento', st.config.train));
    }));

    if (!active) {
      aside.appendChild(H.dashPanel('Vista de mesa', (body) => {
        body.appendChild(H.selectGroup('', [
          { id: 'hero-bottom', label: 'Hero abajo · posiciones rotatorias' },
          { id: 'fixed', label: 'Posiciones fijas · Hero rota' }
        ], cfg.tableView, (value) => {
          cfg.tableView = value;
          saveLocal();
          H.renderAll();
        }));
        body.appendChild(H.hint(
          'La mesa sustituye a la matriz en el simulador. La biblioteca seguirá disponible debajo.'
        ));
      }));
      return;
    }

    const total = st.score.ok + st.score.fail;
    const pct = total ? Math.round(st.score.ok / total * 100) : 100;
    let streak = 0;
    for (const item of st.history) {
      if (item.perfect) streak++;
      else break;
    }

    aside.appendChild(H.dashPanel('Sesión', (body) => {
      body.appendChild(H.statLine('Decisiones', total));
      body.appendChild(H.statLine('Precisión', `${pct}%`));
      body.appendChild(H.statLine('Errores', st.score.fail));
      body.appendChild(H.statLine('Racha', streak));
    }));

    if (st.status === 'feedback' && st.lastDecision && !st.lastDecision.perfect) {
      aside.appendChild(H.dashPanel('Resultado', (body) => {
        body.appendChild(H.statLine('Estado',
          st.lastDecision.perfect ? 'Correcto' : 'Incorrecto'));
        if (!st.lastDecision.perfect) {
          body.appendChild(H.statLine('Tu acción', actionLabel(st.lastDecision.chosen)));
        }
        body.appendChild(H.statLine('Correcta', actionLabel(st.lastDecision.correct)));
      }));
    }

    aside.appendChild(H.dashPanel('Configuración activa', (body) => {
      const current = st.config || cfg;
      body.appendChild(H.statLine('Modo', current.mode));
      body.appendChild(H.statLine('Entreno', current.train));
      body.appendChild(H.statLine('Manos', current.handKind));
      if (current.train === 'full') body.appendChild(H.statLine('3Bet', current.threeBet));
    }));
  }

  function progressLabel(st) {
    const n = st.handsPlayed + 1;
    if (st.config.mode === 'campana') {
      const per = 10;
      const block = Math.floor(st.handsPlayed / per) + 1;
      const inBlock = (st.handsPlayed % per) + 1;
      return `Campaña · ${st.heroOrder[block - 1] || ''} · mano ${inBlock}/${per} · bloque ${block}/${st.heroOrder.length}`;
    }
    return st.config.count > 0 ? `Mano ${n} de ${st.config.count}` : `Mano ${n}`;
  }

  /** Veredicto compacto: sin textos largos. */
  function renderVerdict(H, st) {
    const d = st.lastDecision;
    const s = st.situation;
    const box = H.el('div', 'sim-verdict-card is-fail');
    const copy = H.el('div', 'sim-review-copy');
    copy.appendChild(H.el('div', 'sim-verdict is-fail', 'REVISIÓN'));
    const rows = H.el('div', 'sim-verdict-rows');
    rows.appendChild(verdictRow(H, 'Tu acción', actionLabel(d.chosen)));
    rows.appendChild(verdictRow(H, 'Correcta', actionLabel(d.correct)));
    rows.appendChild(verdictRow(H, 'Rango', RT.Engine.describeContext(s.context)));
    copy.appendChild(rows);
    copy.appendChild(H.el('div', 'sim-review-countdown',
      reviewPaused ? `Pausada · ${Math.ceil(reviewRemaining / 1000)}s`
        : `Siguiente en ${Math.ceil(reviewRemaining / 1000)}s`));

    const map = RT.Engine.getActionMap(s.context);
    const colors = Object.create(null);
    Object.keys(map).forEach((hand) => {
      const color = actionColor(map[hand]);
      if (color) colors[hand] = color;
    });
    const range = miniMatrix(H, { colors, mark: s.hand });
    range.classList.add('sim-review-range');

    const review = H.el('div', 'sim-review-layout');
    review.appendChild(copy);
    review.appendChild(range);
    box.appendChild(review);

    const btns = H.el('div', 'sim-decisions');
    const pauseB = H.button(reviewPaused ? 'Continuar' : 'Pausar revisión', {
      onClick: () => {
        if (reviewPaused) resumeReview();
        else pauseReview();
      }
    });
    pauseB.classList.add('sim-review-toggle');
    btns.appendChild(pauseB);
    const nextB = H.button('Siguiente →', {
      variant: 'btn-primary',
      onClick: () => {
        clearReviewTimers();
        RT.Simulator.next();
      }
    });
    nextB.appendChild(H.el('span', 'sim-key-hint', 'N'));
    btns.appendChild(nextB);
    const retryB = H.button('Repetir situación', {
      onClick: () => {
        clearReviewTimers();
        RT.Simulator.retry();
      }
    });
    retryB.appendChild(H.el('span', 'sim-key-hint', 'R'));
    btns.appendChild(retryB);
    const seeB = H.button('Ver rango', { variant: 'btn-ghost', onClick: () => openRangeViewer(H) });
    seeB.appendChild(H.el('span', 'sim-key-hint', 'V'));
    btns.appendChild(seeB);
    box.appendChild(btns);
    return box;
  }

  function verdictRow(H, label, value) {
    const r = H.el('div', 'sim-verdict-row');
    r.appendChild(H.el('span', 'sim-verdict-label', label));
    r.appendChild(H.el('span', 'sim-verdict-value', value));
    return r;
  }

  function renderSessionSummary(box, H, st) {
    const total = st.score.ok + st.score.fail;
    const pct = total ? Math.round(st.score.ok / total * 100) : 0;
    const card = H.el('div', 'score-card');
    card.appendChild(H.el('div', 'score-title', `Simulación completada · ${pct}%`));
    const row = H.el('div', 'score-row');
    row.appendChild(H.chip('Aciertos', st.score.ok, 'ok'));
    row.appendChild(H.chip('Errores', st.score.fail, 'wrong'));
    row.appendChild(H.chip('Decisiones', total, 'neutral'));
    card.appendChild(row);
    const posKeys = Object.keys(st.failsByPosition);
    if (posKeys.length) {
      card.appendChild(H.el('div', 'panel-group-title', 'Errores por posición'));
      const r2 = H.el('div', 'score-row');
      posKeys.forEach(p => r2.appendChild(H.chip(p, st.failsByPosition[p], 'wrong')));
      card.appendChild(r2);
    }
    const actKeys = Object.keys(st.failsByAction);
    if (actKeys.length) {
      card.appendChild(H.el('div', 'panel-group-title', 'Errores por acción correcta'));
      const r3 = H.el('div', 'score-row');
      actKeys.forEach(a => r3.appendChild(H.chip(actionLabel(a), st.failsByAction[a], 'wrong')));
      card.appendChild(r3);
    }
    box.appendChild(card);
  }

  /* ========================================================================
   * VISOR DE RANGOS (modal amplio con matriz estática)
   * ======================================================================*/

  /**
   * Mini-matriz 13×13 de solo lectura (o pintable para el filtro). No usa
   * RT.Grid para no interferir con la matriz principal del workspace.
   */
  function miniMatrix(H, opts) {
    const grid = H.el('div', 'mini-grid' + (opts.interactive ? ' is-interactive' : ''));
    const colors = opts.colors || {};
    const selected = opts.selected || null;
    const mark = opts.mark || null;
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const hand = RT.Hands.MATRIX[r][c];
        const cell = H.el(opts.interactive ? 'button' : 'div',
          'mini-cell' + (hand.length === 2 ? ' is-pair' : ''));
        if (opts.interactive) cell.type = 'button';
        cell.textContent = hand;
        if (colors[hand]) {
          cell.style.setProperty('--cell-color', colors[hand]);
          cell.classList.add('is-filled');
        }
        if (selected && selected.has(hand)) cell.classList.add('is-selected');
        if (mark === hand) cell.classList.add('is-marked');
        if (opts.interactive) {
          cell.addEventListener('click', () => {
            opts.onToggle(hand);
            cell.classList.toggle('is-selected');
          });
        }
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  /** Contexto relevante para el visor: el de la decisión actual si la hay. */
  function viewerContext(H) {
    const st = RT.Simulator.state;
    if (st.situation) return st.situation.context;
    const av = RT.Simulator.availability(H.source);
    if (av.orHeroes[0]) {
      return { source: H.source, spot: 'OR', hero: av.orHeroes[0], relative: null };
    }
    for (const relative of RT.Engine.availableRelatives({ source: H.source, spot: 'VS3BET' })) {
      const hero = RT.Engine.availableHeroes({ source: H.source, spot: 'VS3BET', relative })[0];
      if (hero) return { source: H.source, spot: 'VS3BET', hero, relative };
    }
    return null;
  }

  function openRangeViewer(H, ctxOverride) {
    const ctx = ctxOverride || viewerContext(H);
    const root = H.el('div', 'range-viewer');
    if (!ctx) {
      root.appendChild(H.hint('No hay rangos disponibles.'));
      RT.Modal.open('Rangos', root, { variant: 'modal-wide' });
      return;
    }

    // Selector de contexto solo cuando NO hay una decisión en curso.
    const st = RT.Simulator.state;
    if (!st.situation) {
      const options = RT.Engine.getContexts({ source: H.source })
        .map(c => ({ id: JSON.stringify(c), label: RT.Engine.describeContext(c) }));
      root.appendChild(H.selectGroup('Contexto', options, JSON.stringify(ctx),
        (v) => openRangeViewer(H, JSON.parse(v))));
    } else {
      root.appendChild(H.el('div', 'context-main', RT.Engine.describeContext(ctx)));
    }

    const map = RT.Engine.getActionMap(ctx);
    const colors = Object.create(null);
    for (const h of Object.keys(map)) {
      const c = actionColor(map[h]);
      if (c) colors[h] = c;
    }
    const markHand = st.situation && st.status === 'feedback' ? st.situation.hand : null;
    root.appendChild(miniMatrix(H, { colors, mark: markHand }));

    // Análisis del rango: combos, % y desglose por acción (datos, no adorno).
    const an = H.rangeAnalytics(ctx);
    const analysis = H.el('div', 'range-analysis');
    analysis.appendChild(H.statLine('Combos', `${an.total} / 1326 · ${an.pct.toFixed(1)}%`));
    for (const a of Object.keys(an.byAction)) {
      const def = RT.Engine.getActionDef(a);
      analysis.appendChild(H.barRow(def ? def.label : a,
        an.byAction[a] / an.total * 100,
        `${an.byAction[a]} · ${Math.round(an.byAction[a] / an.total * 100)}%`,
        def ? def.color : null));
    }
    root.appendChild(analysis);

    // Leyenda de acciones presentes.
    const legend = H.el('div', 'range-legend');
    RT.Engine.availableActions(ctx).forEach(a => {
      const item = H.el('span', 'range-legend-item');
      const dot = H.el('span', 'range-legend-dot');
      dot.style.background = actionColor(a) || '#888';
      item.appendChild(dot);
      item.appendChild(H.el('span', '', actionLabel(a)));
      legend.appendChild(item);
    });
    root.appendChild(legend);

    RT.Modal.open('Rangos', root, { variant: 'modal-wide' });
  }

  /* ------------------------- Barra móvil y teclado ---------------------- */

  function actionBarItems(H) {
    if (cfg.tool === 'position' && RT.SimulatorPositionUI) {
      return RT.SimulatorPositionUI.actionBarItems(H);
    }
    if (cfg.tool === 'duel' && RT.SimulatorDuelHandsUI) {
      return RT.SimulatorDuelHandsUI.actionBarItems(H);
    }
    if (cfg.tool === 'pot-odds' && RT.SimulatorPotOddsUI) {
      return RT.SimulatorPotOddsUI.actionBarItems(H);
    }
    const st = RT.Simulator.state;
    const items = [];
    if (st.status === 'deciding' && st.situation) {
      st.situation.options.forEach(opt => {
        const b = H.button(actionLabel(opt), {
          variant: 'btn-decision',
          key: ACTION_KEYS[opt] || '',
          onClick: () => RT.Simulator.answer(opt)
        });
        const color = actionColor(opt);
        if (color) { b.style.setProperty('--btn-accent', color); b.classList.add('btn-action'); }
        items.push(b);
      });
    } else if (st.status === 'feedback' && st.lastDecision && !st.lastDecision.perfect) {
      const pauseB = H.button(reviewPaused ? 'Continuar' : 'Pausar revisión', {
        onClick: () => {
          if (reviewPaused) resumeReview();
          else pauseReview();
        }
      });
      pauseB.classList.add('sim-review-toggle');
      items.push(pauseB);
      items.push(H.button('Repetir', {
        key: 'R',
        onClick: () => {
          clearReviewTimers();
          RT.Simulator.retry();
        }
      }));
      items.push(H.button('Siguiente →', {
        variant: 'btn-primary', key: 'N', onClick: () => {
          clearReviewTimers();
          RT.Simulator.next();
        }
      }));
    }
    return items;
  }

  function handleKey(key) {
    if (cfg.tool === 'position' && RT.SimulatorPositionUI) {
      return RT.SimulatorPositionUI.handleKey(key);
    }
    if (cfg.tool === 'duel' && RT.SimulatorDuelHandsUI) {
      return RT.SimulatorDuelHandsUI.handleKey(key);
    }
    if (cfg.tool === 'pot-odds' && RT.SimulatorPotOddsUI) {
      return RT.SimulatorPotOddsUI.handleKey(key);
    }
    const st = RT.Simulator.state;
    if (st.status === 'deciding' && /^[1-5]$/.test(key)) {
      const wanted = Object.keys(ACTION_KEYS).find(action => ACTION_KEYS[action] === key);
      const opt = st.situation.options.find(action => action === wanted);
      if (opt) { RT.Simulator.answer(opt); return true; }
    }
    const k = key.toLowerCase();
    if (st.status === 'feedback') {
      if (k === 'n') { clearReviewTimers(); RT.Simulator.next(); return true; }
      if (k === 'r' && !st.lastDecision.perfect) {
        clearReviewTimers();
        RT.Simulator.retry();
        return true;
      }
    }
    if (k === 'v' && (st.status === 'deciding' || st.status === 'feedback')) {
      return 'viewer';   // app.js abre el visor (necesita helpers)
    }
    return false;
  }

  /* -------- Registro en estadísticas (una vez por decisión) ------------- */

  RT.on('sim:changed', () => {
    if (cfg.tool === 'duel') {
      clearReviewTimers();
      lastSimStatus = RT.Simulator.state.status;
      return;
    }
    const st = RT.Simulator.state;
    if (st.status === 'feedback' && lastSimStatus !== 'feedback' && st.lastDecision) {
      const d = st.lastDecision;
      RT.Stats.record({
        qid: d.qid, perfect: d.perfect,
        spot: d.spot, hero: d.hero, relative: d.relative,
        action: d.correct, category: null,
        okHands: d.perfect ? [d.hand] : [],
        failHands: d.perfect ? [] : [d.hand]
      });
      if (d.perfect) {
        clearReviewTimers();
        setTimeout(() => {
          const current = RT.Simulator.state;
          if (current.status === 'feedback' && current.lastDecision === d) {
            RT.Simulator.next();
          }
        }, 0);
      } else {
        startReview();
      }
    } else if (st.status !== 'feedback') {
      clearReviewTimers();
    }
    lastSimStatus = st.status;
  });

  loadLocal();

  RT.SimUI = {
    renderStage, renderPanel, renderInsights,
    actionBarItems, handleKey, openRangeViewer,
    resetConfig() {
      resetLocalState();
      saveLocal();
    },
    get isEditingFilter() { return editingFilter; },
    currentTool() { return cfg.tool; }
  };

})(window.RT);
