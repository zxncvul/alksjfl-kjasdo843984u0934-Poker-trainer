/* ============================================================================
 * app.js — ORQUESTACIÓN DE LA INTERFAZ
 * ============================================================================
 * Conecta los motores (RT.Engine, RT.RangeQuiz, RT.SurgicalQuiz, RT.Stats)
 * y la infraestructura de UI (RT.Settings, RT.Favorites, RT.Modal) con el DOM.
 *
 * ESTRUCTURA
 *   1. Estado visual compartido y contexto del workspace.
 *   2. ViewModel de la matriz y rutas calientes.
 *   3. Composición mediante StudyUI, RangeQuizUI y SurgicalQuizUI.
 *   4. Asistente, barra de estado y acciones móviles compartidas.
 *   5. Navegación, eventos, teclado y arranque.
 *
 * Las vistas completas viven en ui/study y ui/quizzes. app.js solo crea
 * sus contextos y coordina el ciclo; no debe recuperar su render interno.
 *
 * RENDIMIENTO — dos rutas de render:
 *   · Ruta COMPLETA (renderAll): cambios de modo/estado/configuración.
 *   · Ruta CALIENTE (eventos finos 'rangequiz:hand', 'surgical:hand',
 *     'rangequiz:brush'): pintado/selección durante un quiz. Solo toca la
 *     celda afectada (RT.Grid.updateHand), los contadores de texto y, si
 *     procede, el estado de un botón. NUNCA reconstruye el panel ni
 *     recalcula pools de preguntas/ejercicios.
 * ==========================================================================*/
'use strict';

(function (RT) {

  /* ========================================================================
   * 1. ESTADO DE INTERFAZ.
   * ======================================================================*/
  const ui = {
    mode: 'study',                  // modos principales y módulos del workspace
    trainingMode: 'range',          // 'range' | 'questions'
    source: null,
    showLabels: true,

    // Modo estudio: contexto único + filtros visuales + heatmap.
    study: {
      spot: null,
      relative: null,
      hero: null,
      vs: null,
      highlightAction: null,        // null = todas las acciones
      heatmap: null,                // null | 'fails' | 'mastery'
      filters: { ranks: new Set(), suited: false, offsuit: false, pair: false, connector: false }
    },

    // Configuración del quiz de rango completo (Sets vacíos = todos).
    rangeQuizConfig: { spots: new Set(), relatives: new Set(), heroes: new Set(), includeFold: false },

    // Configuración del quiz quirúrgico (Sets vacíos = todos).
    surgicalConfig: {
      spots: new Set(), relatives: new Set(), heroes: new Set(),
      actionGroups: new Set(), ranks: new Set(),
      families: new Set(), levels: new Set()
    },

    // Estado del panel de revisión (tras Comprobar).
    review: {
      view: 'compare',              // 'compare' | 'mine' | 'correct'
      focus: null                   // null | 'ok' | 'wrong' | 'extra' | 'missing' | 'errors'
    },

    // Desplegables abiertos (persisten entre renders dentro de la sesión).
    openSections: new Set(),

    // Página visible del módulo informativo superior del panel izquierdo.
    leftUtilityPage: 0,

    // Categoría visible en la biblioteca inferior de rangos.
    galleryFilter: 'all',
    galleryRelatives: new Set(['IP', 'OOP']),
    galleryScroll: 0,
    gallerySelection: new Set(),

    // Texto secundario del asistente contextual. La pregunta activa vive
    // siempre en la cabecera del asistente y nunca se sustituye al hacer hover.
    help: { title: 'Ayuda contextual', text: 'Pasa el cursor por un control para ver qué hace.' }
  };

  // Referencias estables al DOM y a nodos "calientes" del panel actual.
  const els = {};
  const hot = {
    brushBox: null, surgicalCheckBtn: null, helpTitle: null, helpText: null,
    leftSummary: null
  };

  // Última fase conocida de cada motor (para detectar la entrada en review).
  const lastStatus = { range: 'idle', surgical: 'idle' };

  // Temporizador del auto-avance (configurable). Se cancela en cada cambio.
  let autoAdvanceTimer = null;
  let suppressEngineRender = false;
  let layoutFrame = 0;
  let rangeGallery = null;
  let dialogs = null;
  let studyUI = null;
  let quizCommonUI = null;
  let quizResultsUI = null;
  let rangeQuizUI = null;
  let surgicalQuizUI = null;
  let trainingUI = null;
  let activeWorkspaceModule = null;
  const analyticsCache = new Map();

  /**
   * Métricas de la sesión de quiz en curso (solo presentación: alimenta el
   * panel de análisis del escritorio). Se reinicia al arrancar una sesión.
   *   answers: [{perfect, ms, action, category, failHands}]
   */
  const session = { mode: null, answers: [], lastShownAt: 0 };

  function resetSession(mode) {
    session.mode = mode;
    session.answers = [];
    session.lastShownAt = Date.now();
  }

  function isRangeTraining() {
    return ui.mode === 'training' && ui.trainingMode === 'range';
  }

  function isQuestionTraining() {
    return ui.mode === 'training' && ui.trainingMode === 'questions';
  }

  /* ========================================================================
   * 2. HELPERS DE DOM.
   * ======================================================================*/

  // Toolkit DOM compartido. app.js conserva solo la orquestaci?n y el estado.
  const uiToolkit = RT.UI.create({
    openSections: ui.openSections,
    invalidatePanel: () => renderPanel()
  });
  const {
    el, button, group, selectGroup, multiSelectGroup, collapsible,
    chip, hint, dashPanel, statLine, barRow, sparkline, helpTextFor
  } = uiToolkit;

  /** Acierto acumulado tras cada respuesta (para el sparkline). */
  function rollingAccuracy(answers) {
    const out = [];
    let ok = 0;
    answers.forEach((a, i) => { if (a.perfect) ok++; out.push(Math.round(ok / (i + 1) * 100)); });
    return out;
  }

  /** Análisis de un rango: combos, %, desglose por acción y por familia. */
  function rangeAnalytics(ctx) {
    const cacheKey = `${ctx.source}|${RT.Engine.contextId(ctx)}`;
    if (analyticsCache.has(cacheKey)) return analyticsCache.get(cacheKey);
    const map = RT.Engine.getActionMap(ctx);
    const byAction = {};
    const fam = { suited: 0, offsuit: 0, pairs: 0 };
    let total = 0;
    for (const h of Object.keys(map)) {
      const a = map[h];
      if (a === 'FOLD') continue;
      const c = RT.Hands.comboCount(h);
      total += c;
      byAction[a] = (byAction[a] || 0) + c;
      if (h.length === 2) fam.pairs += c;
      else if (h[2] === 's') fam.suited += c;
      else fam.offsuit += c;
    }
    const result = { total, pct: total / 1326 * 100, byAction, fam };
    analyticsCache.set(cacheKey, result);
    return result;
  }

  function promptCard(text, progress, subText) {
    const card = el('div', 'prompt-card');
    if (progress) card.appendChild(el('div', 'prompt-progress', progress));
    card.appendChild(el('div', 'prompt-text', text));
    if (subText) card.appendChild(el('div', 'prompt-sub', subText));
    return card;
  }

  function scoreCard(title, score, total) {
    const card = el('div', 'score-card');
    card.appendChild(el('div', 'score-title', title));
    const row = el('div', 'score-row');
    row.appendChild(chip('Perfectas', score.ok, 'ok'));
    row.appendChild(chip('Con fallos', score.fail, 'wrong'));
    row.appendChild(chip('Total', total, 'neutral'));
    card.appendChild(row);
    return card;
  }

  /** Mezcla dos colores hex según t ∈ [0,1] (para el heatmap). */
  function blendHex(a, b, t) {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) =>
      Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* ========================================================================
   * 3. MATRIZ — viewModel por modo.
   * ======================================================================*/

  function studyDimmedSet() {
    const f = ui.study.filters;
    const anyFilter = f.ranks.size || f.suited || f.offsuit || f.pair || f.connector;
    if (!anyFilter) return null;
    const filter = {
      ranks: f.ranks.size ? Array.from(f.ranks) : undefined,
      suited: f.suited || undefined,
      offsuit: f.offsuit || undefined,
      pair: f.pair || undefined,
      connector: f.connector || undefined
    };
    const dimmed = new Set();
    for (const h of RT.Hands.ALL_HANDS) {
      if (!RT.Hands.matchesFilter(h, filter)) dimmed.add(h);
    }
    return dimmed;
  }

  function studyContext() {
    const s = ui.study;
    const ctx = {
      source: ui.source, spot: s.spot, hero: s.hero,
      relative: s.relative, vs: s.vs
    };
    return RT.Engine.isContextComplete(ctx) && RT.Engine.availableActions(ctx).length
      ? ctx : null;
  }

  function colorOf(actionId) {
    const def = RT.Engine.getActionDef(actionId);
    return def ? def.color : '#888';
  }

  /** Manos atenuadas en revisión según el foco activo (chips clicables). */
  function focusDimmedSet(groups) {
    const focus = ui.review.focus;
    if (!focus) return null;
    let keepHands;
    if (focus === 'errors') {
      keepHands = [].concat(groups.wrong || [], groups.extra || [], groups.missing || []);
    } else {
      keepHands = groups[focus];
    }
    if (!keepHands) return null;
    const keep = new Set(keepHands);
    const dimmed = new Set();
    for (const h of RT.Hands.ALL_HANDS) if (!keep.has(h)) dimmed.add(h);
    return dimmed;
  }

  function buildReferenceGridViewModel() {
    if (ui.study.heatmap) {
      const heat = RT.Stats.getHandHeat(ui.study.heatmap);
      const base = '#0a0c0e';
      const top = ui.study.heatmap === 'fails' ? '#c25450' : '#4caf82';
      const colors = Object.create(null);
      for (const h of Object.keys(heat)) {
        colors[h] = blendHex(base, top, 0.25 + 0.75 * heat[h]);
      }
      return {
        interactive: false,
        colors,
        metrics: RT.Stats.getHandPerformanceMap(),
        showLabels: ui.showLabels
      };
    }
    const ctx = studyContext();
    const colors = Object.create(null);
    if (ctx) {
      const map = RT.Engine.getActionMap(ctx);
      for (const h of Object.keys(map)) {
        if (ui.study.highlightAction && map[h] !== ui.study.highlightAction) continue;
        colors[h] = colorOf(map[h]);
      }
    }
    return { interactive: false, colors, dimmed: studyDimmedSet(), showLabels: ui.showLabels };
  }

  function buildGridViewModel() {
    /* ---- Estudio ---- */
    if (ui.mode === 'study' || ui.mode === 'simulator') {
      return buildReferenceGridViewModel();
    }

    /* ---- Quiz de rango completo ---- */
    if (isRangeTraining()) {
      const q = RT.RangeQuiz.state;
      if (q.status === 'running') {
        const colors = Object.create(null);
        for (const h of Object.keys(q.paint)) colors[h] = colorOf(q.paint[h]);
        return { interactive: true, colors, showLabels: ui.showLabels };
      }
      if (q.status === 'review') {
        const target = RT.RangeQuiz.current.target;
        const r = q.result;
        const colors = Object.create(null);
        const marks = Object.create(null);

        if (ui.review.view === 'mine') {
          for (const h of Object.keys(q.paint)) colors[h] = colorOf(q.paint[h]);
        } else if (ui.review.view === 'correct') {
          for (const h of Object.keys(target)) colors[h] = colorOf(target[h]);
        } else {
          for (const h of r.correct)     { colors[h] = colorOf(q.paint[h]);  marks[h] = 'ok'; }
          for (const h of r.wrongAction) { colors[h] = colorOf(q.paint[h]);  marks[h] = 'wrong'; }
          for (const h of r.extra)       { colors[h] = colorOf(q.paint[h]);  marks[h] = 'extra'; }
          for (const h of r.missing)     { colors[h] = colorOf(target[h]);   marks[h] = 'missing'; }
        }
        const dimmed = ui.review.view === 'compare'
          ? focusDimmedSet({ ok: r.correct, wrong: r.wrongAction, extra: r.extra, missing: r.missing })
          : null;
        return { interactive: false, colors, marks, dimmed, showLabels: ui.showLabels };
      }
      return {
        interactive: false,
        colors: {},
        showLabels: ui.showLabels,
        neutralMessage: ui.gallerySelection.size
          ? `${ui.gallerySelection.size} rangos seleccionados · configura la sesión`
          : 'Selecciona rangos para entrenar'
      };
    }

    /* ---- Quiz quirúrgico ---- */
    const s = RT.SurgicalQuiz.state;
    if (s.status === 'running') {
      return { interactive: true, colors: {}, selected: s.selected, showLabels: ui.showLabels };
    }
    if (s.status === 'review') {
      const r = s.result;
      const marks = Object.create(null);
      let selected = s.selected;

      if (ui.review.view === 'mine') {
        // Solo mi selección.
      } else if (ui.review.view === 'correct') {
        selected = RT.SurgicalQuiz.current.target;
      } else {
        for (const h of r.correct) marks[h] = 'ok';
        for (const h of r.extra)   marks[h] = 'extra';
        for (const h of r.missing) marks[h] = 'missing';
      }
      const dimmed = ui.review.view === 'compare'
        ? focusDimmedSet({ ok: r.correct, extra: r.extra, missing: r.missing })
        : null;
      return { interactive: false, colors: {}, selected, marks, dimmed, showLabels: ui.showLabels };
    }
    return {
      interactive: false,
      colors: {},
      showLabels: ui.showLabels,
      neutralMessage: ui.gallerySelection.size
        ? `${ui.gallerySelection.size} rangos seleccionados · configura la sesión`
        : 'Selecciona rangos para entrenar'
    };
  }

  function onHandToggle(hand) {
    if (isRangeTraining()) RT.RangeQuiz.toggleHand(hand);
    else if (isQuestionTraining()) RT.SurgicalQuiz.toggleHand(hand);
  }

  /* ========================================================================
   * 4. PANEL — render por modo.
   * ======================================================================*/

  function renderPanel() {
    const panel = els.panel;
    panel.innerHTML = '';
    hot.brushBox = null;
    hot.surgicalCheckBtn = null;
    hot.leftSummary = null;
    if (ui.mode === 'grid-trainer' || ui.mode === 'math-trainer') return;
    const simTool = ui.mode === 'simulator' && RT.SimUI &&
      typeof RT.SimUI.currentTool === 'function' ? RT.SimUI.currentTool() : '';
    if (simTool !== 'duel' && simTool !== 'position' && simTool !== 'pot-odds') renderLeftUtility(panel);
    if (ui.mode === 'study') studyUI.renderPanel(panel);
    else if (ui.mode === 'training') trainingUI.renderPanel(panel);
    else renderSimulatorWorkspacePanel(panel);
  }

  function renderSimulatorWorkspacePanel(panel) {
    RT.SimUI.renderPanel(panel, simHelpers());
  }

  function modeLabel() {
    if (ui.mode === 'training') {
      return ui.trainingMode === 'range'
        ? 'Entrenamiento · Rango completo'
        : 'Entrenamiento · Preguntas';
    }
    return {
      study: 'Estudio',
      simulator: 'Simulador',
      'grid-trainer': 'Grid Trainer',
      'math-trainer': 'Math Trainer'
    }[ui.mode] || ui.mode;
  }

  function shortcutRow(key, label) {
    const row = el('div', 'shortcut-row');
    row.appendChild(el('kbd', 'shortcut-key', key));
    row.appendChild(el('span', 'shortcut-label', label));
    row.dataset.help = `${key}: ${label}.`;
    return row;
  }

  function currentShortcuts() {
    if (ui.mode === 'study') return [['F', 'Filtros'], ['H', 'Heatmap'], ['Esc', 'Cerrar']];
    if (isRangeTraining()) {
      return [['Enter', 'Comprobar'], ['N', 'Siguiente'], ['R', 'Reiniciar'], ['1–4', 'Acciones'], ['Esc', 'Cerrar']];
    }
    if (ui.mode === 'simulator') {
      return [['1–5', 'Decidir'], ['N', 'Siguiente'], ['R', 'Repetir'], ['V', 'Ver rango']];
    }
    return [['Enter', 'Comprobar'], ['N', 'Siguiente'], ['R', 'Reiniciar'], ['Esc', 'Cerrar']];
  }

  function dominantAction(an) {
    const ids = Object.keys(an.byAction);
    if (!ids.length) return '—';
    const id = ids.sort((a, b) => an.byAction[b] - an.byAction[a])[0];
    const def = RT.Engine.getActionDef(id);
    return def ? def.label : id;
  }

  function renderLeftUtility(panel) {
    const ctx = studyContext();
    const pages = [
      {
        title: 'Resumen',
        build(body) {
          body.appendChild(statLine('Modo actual', modeLabel()));
          if (ui.mode === 'study' && ctx) {
            const an = rangeAnalytics(ctx);
            body.appendChild(statLine('Combos', an.total));
            body.appendChild(statLine('Porcentaje', `${an.pct.toFixed(1)}%`));
            body.appendChild(statLine('Dominante', dominantAction(an)));
          } else if (isRangeTraining() && RT.RangeQuiz.state.status === 'running') {
            const stats = RT.Hands.comboStats(Object.keys(RT.RangeQuiz.state.paint));
            const line = statLine('Pintado', `${stats.total} combos`);
            hot.leftSummary = line.querySelector('.stat-value');
            body.appendChild(line);
          } else if (ui.mode === 'simulator') {
            const status = RT.Simulator.state.status;
            body.appendChild(statLine('Estado',
              status === 'deciding' ? 'Decidiendo'
                : (status === 'feedback' ? 'Revisión' : 'Sin ejercicio activo')));
          } else if (isQuestionTraining() && RT.SurgicalQuiz.state.status === 'running') {
            const stats = RT.Hands.comboStats(Array.from(RT.SurgicalQuiz.state.selected));
            const line = statLine('Selección', `${stats.total} combos`);
            hot.leftSummary = line.querySelector('.stat-value');
            body.appendChild(line);
          } else {
            body.appendChild(statLine('Estado', 'Sin ejercicio activo'));
          }
        }
      },
      {
        title: 'Contexto',
        build(body) {
          let rows;
          if (ui.mode === 'study') {
            rows = [
              ['Spot', ctx ? RT.Engine.describeContext(ctx) : 'Sin completar'],
              ['Posición', ui.study.hero || 'Todas'],
              ['Acción', ui.study.highlightAction
                ? (RT.Engine.getActionDef(ui.study.highlightAction) || {}).label || ui.study.highlightAction
                : 'Todas'],
              ['Familia', activeFamilyLabel()]
            ];
          } else {
            const current = isRangeTraining()
              ? RT.RangeQuiz.current
              : (isQuestionTraining() ? RT.SurgicalQuiz.current : RT.Simulator.current);
            rows = [
              ['Spot', current ? RT.Engine.describeContext(current.context) : 'Configuración de sesión'],
              ['Estado', current ? 'Ejercicio activo' : 'Sin ejercicio activo']
            ];
          }
          rows.forEach(([label, value]) => body.appendChild(statLine(label, value)));
        }
      },
      {
        title: 'Leyenda',
        build(body) {
          const legend = el('div', 'legend-grid');
          RT.Engine.getActionsCatalog().forEach(def => {
            const item = el('div', 'legend-item');
            const dot = el('span', 'legend-dot');
            dot.style.background = def.color;
            item.appendChild(dot);
            item.appendChild(el('span', '', def.label));
            item.dataset.help = `${def.label}: color usado para identificar esta acción en la matriz.`;
            legend.appendChild(item);
          });
          body.appendChild(legend);
        }
      },
      {
        title: 'Atajos',
        build(body) {
          const shortcuts = el('div', 'shortcut-grid');
          currentShortcuts().forEach(([key, label]) =>
            shortcuts.appendChild(shortcutRow(key, label)));
          body.appendChild(shortcuts);
        }
      }
    ];

    ui.leftUtilityPage = Math.max(0, Math.min(pages.length - 1, ui.leftUtilityPage));
    const page = pages[ui.leftUtilityPage];
    const module = el('section', 'workspace-card workspace-pager');
    const head = el('div', 'workspace-pager-head');
    const prev = button('<', {
      variant: 'workspace-page-btn',
      title: 'Sección anterior',
      onClick: () => {
        ui.leftUtilityPage = (ui.leftUtilityPage - 1 + pages.length) % pages.length;
        renderPanel();
      }
    });
    const title = el('div', 'workspace-page-title');
    title.appendChild(el('span', 'workspace-eyebrow', page.title));
    title.appendChild(el('span', 'workspace-page-index',
      `${ui.leftUtilityPage + 1} / ${pages.length}`));
    const next = button('>', {
      variant: 'workspace-page-btn',
      title: 'Sección siguiente',
      onClick: () => {
        ui.leftUtilityPage = (ui.leftUtilityPage + 1) % pages.length;
        renderPanel();
      }
    });
    head.appendChild(prev);
    head.appendChild(title);
    head.appendChild(next);
    module.appendChild(head);

    const body = el('div', 'workspace-page-body');
    page.build(body);
    module.appendChild(body);
    panel.appendChild(module);
  }

  function activeFamilyLabel() {
    const f = ui.study.filters;
    const labels = [];
    if (f.suited) labels.push('Suited');
    if (f.offsuit) labels.push('Offsuit');
    if (f.pair) labels.push('Parejas');
    if (f.connector) labels.push('Conectores');
    if (f.ranks.size) labels.push(Array.from(f.ranks).join(''));
    return labels.length ? labels.join(' · ') : 'Todas';
  }

  // Fachada local: los consumidores no conocen la implementaci?n de la galer?a.
  function contextId(context) { return rangeGallery.contextId(context); }
  function selectedGalleryContexts() { return rangeGallery.selectedContexts(); }
  function selectedContextIds() { return rangeGallery.selectedIds(); }
  function renderRangeGallery() {
    const simTool = ui.mode === 'simulator' && RT.SimUI &&
      typeof RT.SimUI.currentTool === 'function' ? RT.SimUI.currentTool() : '';
    const isDuelGallery = simTool === 'duel' &&
      RT.SimulatorDuelHandsUI && typeof RT.SimulatorDuelHandsUI.renderGallery === 'function';
    if (isDuelGallery) {
      RT.SimulatorDuelHandsUI.renderGallery(els.rangeGallery, simHelpers());
      return;
    }
    const isPositionGallery = simTool === 'position' &&
      RT.SimulatorPositionUI && typeof RT.SimulatorPositionUI.renderGallery === 'function';
    if (isPositionGallery) {
      RT.SimulatorPositionUI.renderGallery(els.rangeGallery, simHelpers());
      return;
    }
    const isPotOddsGallery = simTool === 'pot-odds' &&
      RT.SimulatorPotOddsUI && typeof RT.SimulatorPotOddsUI.renderGallery === 'function';
    if (isPotOddsGallery) {
      RT.SimulatorPotOddsUI.renderGallery(els.rangeGallery, simHelpers());
      return;
    }
    if (els.rangeGallery && els.rangeGallery.classList) {
      els.rangeGallery.classList.remove('sim-duel-preset-gallery');
      els.rangeGallery.classList.remove('position-gallery');
    }
    rangeGallery.render();
  }

  /** Caja de herramientas que app.js presta a la UI del simulador. */
  function simHelpers() {
    return {
      el, button, group, hint, selectGroup, multiSelectGroup, collapsible, chip,
      dashPanel, statLine, barRow, sparkline, rangeAnalytics,
      bindHelp: (titleNode, textNode) => {
        hot.helpTitle = titleNode;
        hot.helpText = textNode;
        titleNode.textContent = ui.help.title;
        textNode.textContent = ui.help.text;
      },
      selectedContexts: selectedContextIds(),
      source: ui.source,
      renderAll,
      renderSimulatorTool
    };
  }

  function renderSimulatorTool() {
    if (ui.mode !== 'simulator') {
      renderAll();
      return;
    }
    renderPanel();
    renderStatusBar();
    renderInsights();
    RT.SimUI.renderStage(els.simStage, simHelpers());
    renderRangeGallery();
    renderActionBar();
    scheduleDesktopPanelMetrics();
  }

  /* Vistas de modo: delegadas a m?dulos con contrato expl?cito. */

  function renderInsights() {
    const aside = els.insights;
    if (!aside) return;
    aside.innerHTML = '';
    if (ui.mode === 'grid-trainer' || ui.mode === 'math-trainer') return;
    renderAssistant(aside);
    if (ui.mode === 'study') studyUI.renderInsights(aside);
    else if (isRangeTraining()) quizResultsUI.renderInsights(aside, 'range');
    else if (isQuestionTraining()) quizResultsUI.renderInsights(aside, 'surgical');
    else renderSimulatorInsights(aside);
  }

  function assistantContent() {
    if (ui.mode === 'study') {
      const ctx = studyContext();
      return {
        eyebrow: 'Asistente · Estudio',
        title: ctx ? RT.Engine.describeContext(ctx) : 'Explora tus rangos',
        text: 'Selecciona un spot, una posición y una acción. Usa filtros para aislar familias y el heatmap para revisar tu progreso.'
      };
    }
    if (isRangeTraining()) {
      const q = RT.RangeQuiz.state;
      const ex = RT.RangeQuiz.current;
      if (ex && (q.status === 'running' || q.status === 'review')) {
        return {
          eyebrow: `Ejercicio ${q.index + 1} de ${q.exercises.length}`,
          title: `Pinta el rango completo de ${RT.Engine.describeContext(ex.context)}`,
          text: q.status === 'running'
            ? 'Elige un pincel con 1–4, pinta la matriz y pulsa Enter para comprobar.'
            : 'Revisa las diferencias en la matriz. N avanza y R reinicia el ejercicio.'
        };
      }
      return {
        eyebrow: 'Asistente · Entrenamiento',
        title: 'Entrena rangos completos',
        text: 'Configura los spots y posiciones o inicia una sesión rápida. Deberás reconstruir cada rango desde memoria.'
      };
    }
    if (ui.mode === 'simulator') {
      const simTool = RT.SimUI && typeof RT.SimUI.currentTool === 'function' ? RT.SimUI.currentTool() : '';
      const isDuelTool = simTool === 'duel';
      if (isDuelTool) {
        return {
          eyebrow: 'Asistente · Showdown',
          title: 'Lee la mesa y decide el ganador',
          text: 'Decide Hero, Villain o Split. Los ojos revelan solo las cartas usadas por la mejor jugada.',
          variant: 'showdown',
          noKeys: true
        };
      }
      if (simTool === 'position' && RT.SimulatorPosition) {
        return {
          eyebrow: 'Asistente · Position',
          title: 'Lee la mesa y responde',
          text: 'Usa las ciegas, el dealer y las acciones visibles. La pregunta central indica que debes localizar.',
          variant: 'position',
          noKeys: true
        };
      }
      const st = RT.Simulator.state;
      const situation = RT.Simulator.current;
      if (situation) {
        return {
          eyebrow: st.status === 'feedback' ? 'Asistente · Revisión' : 'Asistente · Simulador',
          title: `Hero ${situation.hero} recibe ${situation.hand}. ¿Qué haces?`,
          text: `${RT.Engine.describeContext(situation.context)}. Usa 1–5 para decidir y N para avanzar.`
        };
      }
      return {
        eyebrow: 'Asistente · Simulador',
        title: 'Configura una sesión con tus repertorios',
        text: 'La biblioteca limita los contextos participantes. La matriz mantiene visible el rango activo como referencia.'
      };
    }
    const s = RT.SurgicalQuiz.state;
    const q = RT.SurgicalQuiz.current;
    if (q && (s.status === 'running' || s.status === 'review')) {
      return {
        eyebrow: `Pregunta ${s.index + 1} de ${s.pool.length}`,
        title: q.text,
        text: s.status === 'running'
          ? 'Selecciona las manos que responden a la pregunta y pulsa Enter para comprobar.'
          : 'Compara tu selección con la solución. Pulsa N para continuar.'
      };
    }
    return {
      eyebrow: 'Asistente · Entrenamiento',
      title: 'Entrena preguntas individuales',
      text: 'Combina cartas, familias, acciones, nivel y repertorios para construir el conjunto de manos.'
    };
  }

  function renderAssistant(aside) {
    const data = assistantContent();
    const card = el('section', 'assistant-panel' + (data.variant ? ` is-${data.variant}` : ''));
    card.appendChild(el('div', 'assistant-eyebrow', data.eyebrow));
    card.appendChild(el('h2', 'assistant-title', data.title));
    card.appendChild(el('p', 'assistant-text', data.text));

    const live = el('div', 'assistant-live');
    hot.helpTitle = el('strong', 'assistant-live-title', ui.help.title);
    hot.helpText = el('span', 'assistant-live-text', ui.help.text);
    live.appendChild(hot.helpTitle);
    live.appendChild(hot.helpText);
    card.appendChild(live);

    if (!data.noKeys) {
      const keys = el('div', 'assistant-keys');
      currentShortcuts().slice(0, 4).forEach(([key, label]) => keys.appendChild(shortcutRow(key, label)));
      card.appendChild(keys);
    }
    aside.appendChild(card);
  }

  function renderSimulatorInsights(aside) {
    RT.SimUI.renderInsights(aside, simHelpers());
  }

  function setContextHelp(title, text) {
    ui.help.title = title;
    ui.help.text = text;
    if (hot.helpTitle) hot.helpTitle.textContent = title;
    if (hot.helpText) hot.helpText.textContent = text;
  }

  function contextualNode(target) {
    return target && target.closest
      ? target.closest('[data-help], button, select, .stat-line, .bar-row, .legend-item')
      : null;
  }

  function showHelpFor(target) {
    const node = contextualNode(target);
    if (!node) return;
    const groupNode = node.closest('.panel-group, .workspace-card, .dash-panel');
    const heading = groupNode && groupNode.querySelector(
      '.panel-group-title, .workspace-eyebrow, .dash-title');
    const title = heading ? heading.textContent : (node.textContent || 'Control').trim();
    const text = node.dataset.help || node.title || helpTextFor(node.textContent || 'este control');
    setContextHelp(title, text);
  }

  /** Estudio: el visualizador como herramienta de análisis del rango. */
  function renderStatusBar() {
    let label = '';
    let hands = [];

    if (ui.mode === 'grid-trainer' || ui.mode === 'math-trainer') return;
    if (ui.mode === 'study') {
      if (ui.study.heatmap) {
        const heat = RT.Stats.getHandHeat(ui.study.heatmap);
        label = ui.study.heatmap === 'fails' ? 'Heatmap · más falladas' : 'Heatmap · más dominadas';
        els.statusLabel.textContent = label;
        els.statusStats.textContent = `${Object.keys(heat).length} manos con datos`;
        return;
      }
      const ctx = studyContext();
      if (ctx) {
        label = RT.Engine.describeContext(ctx);
        const map = RT.Engine.getActionMap(ctx);
        hands = Object.keys(map).filter(h =>
          !ui.study.highlightAction || map[h] === ui.study.highlightAction);
        hands = hands.filter(h => map[h] !== 'FOLD' ||
          ui.study.highlightAction === 'FOLD');
      } else {
        label = 'Selecciona un contexto';
      }
    } else if (isRangeTraining()) {
      const q = RT.RangeQuiz.state;
      if (q.status === 'running') {
        hands = Object.keys(q.paint);
        label = `Pintadas ${hands.length} de ${Object.keys(RT.RangeQuiz.current.target).length} manos`;
      } else if (q.status === 'review') {
        label = 'Revisión';
        hands = Object.keys(RT.RangeQuiz.current.target);
      } else label = 'Entrenamiento · Rango completo';
    } else if (isQuestionTraining()) {
      const s = RT.SurgicalQuiz.state;
      if (s.status === 'running') {
        hands = Array.from(s.selected);
        label = `${hands.length} mano${hands.length === 1 ? '' : 's'} seleccionada${hands.length === 1 ? '' : 's'}`;
      } else if (s.status === 'review') {
        label = 'Revisión';
        hands = Array.from(RT.SurgicalQuiz.current.target);
      } else label = 'Entrenamiento · Preguntas individuales';
    } else {
      const situation = RT.Simulator.current;
      label = situation
        ? `Simulador · ${RT.Engine.describeContext(situation.context)}`
        : 'Simulador · configuración';
      hands = situation ? [situation.hand] : [];
    }

    els.statusLabel.textContent = label;
    const stats = RT.Hands.comboStats(hands);
    const parts = [];
    if (RT.Settings.get('showCombos')) {
      parts.push(`${stats.total} combos · ${stats.pairs}P / ${stats.suited}s / ${stats.offsuit}o`);
    }
    if (RT.Settings.get('showPercents') && stats.total) {
      parts.push(`${(stats.total / 1326 * 100).toFixed(1)}%`);
    }
    els.statusStats.textContent = parts.join(' · ');
  }

  /** Combos totales de una lista de manos. */
  function renderActionBar() {
    const bar = els.actionBar;
    bar.innerHTML = '';
    const items = [];

    if (ui.mode === 'grid-trainer' || ui.mode === 'math-trainer') return;
    if (ui.mode === 'simulator') {
      RT.SimUI.actionBarItems({ button }).forEach(b => items.push(b));
    } else if (isRangeTraining()) {
      const st = RT.RangeQuiz.state.status;
      if (st === 'running') {
        items.push(button('Comprobar', {
          variant: 'btn-primary', key: 'Enter', onClick: () => RT.RangeQuiz.check()
        }));
        items.push(button('Borrar', { key: 'R', onClick: () => RT.RangeQuiz.clearPaint() }));
        items.push(button('Salir', { variant: 'btn-ghost', onClick: () => RT.RangeQuiz.stop() }));
      } else if (st === 'review') {
        if (!RT.RangeQuiz.state.result.isPerfect) {
          items.push(button('Reintentar', { onClick: () => RT.RangeQuiz.retry() }));
        }
        items.push(button('Siguiente →', {
          variant: 'btn-primary', key: 'N', onClick: () => RT.RangeQuiz.next()
        }));
        items.push(button('Salir', { variant: 'btn-ghost', onClick: () => RT.RangeQuiz.stop() }));
      }
    } else if (isQuestionTraining()) {
      const st = RT.SurgicalQuiz.state.status;
      if (st === 'running') {
        const check = button('Comprobar', {
          variant: 'btn-primary',
          key: 'Enter',
          disabled: RT.SurgicalQuiz.state.selected.size === 0,
          onClick: () => RT.SurgicalQuiz.check()
        });
        check.dataset.role = 'check';
        items.push(check);
        items.push(button('Salir', { variant: 'btn-ghost', onClick: () => RT.SurgicalQuiz.stop() }));
      } else if (st === 'review') {
        items.push(button('Siguiente →', {
          variant: 'btn-primary', key: 'N', onClick: () => RT.SurgicalQuiz.next()
        }));
        items.push(button('Salir', { variant: 'btn-ghost', onClick: () => RT.SurgicalQuiz.stop() }));
      }
    }

    if (items.length) {
      items.push(button('⚙', { variant: 'btn-ghost', title: 'Configuración', onClick: openConfigModal }));
    }
    items.forEach(b => bar.appendChild(b));
    bar.classList.toggle('has-items', items.length > 0);
  }

  /* ========================================================================
   * 6. MODALES — configuración y estadísticas.
   * ======================================================================*/

  /** Toggle de configuración persistente. */
  function openConfigModal() { dialogs.openConfig(); }
  function openStatsModal() { dialogs.openStats(); }

  /* ========================================================================
   * 7. RENDER GLOBAL, RUTAS CALIENTES, TECLADO Y ARRANQUE.
   * ======================================================================*/

  function renderTabs() {
    els.tabs.querySelectorAll('button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.mode === ui.mode);
      b.setAttribute('aria-selected', String(b.dataset.mode === ui.mode));
    });
  }

  function renderAll() {
    // Un reset de progreso invalida cualquier heatmap que siguiera activo.
    if (ui.study.heatmap && !RT.Stats.hasData) ui.study.heatmap = null;
    renderTabs();
    const isSim = ui.mode === 'simulator';
    const isGridTrainer = ui.mode === 'grid-trainer';
    const isMathTrainer = ui.mode === 'math-trainer';
    const workspaceModuleId = isGridTrainer ? 'grid-trainer'
      : isMathTrainer ? 'math-trainer' : null;
    const simActive = isSim && ['deciding', 'feedback'].includes(RT.Simulator.state.status);
    document.body.classList.toggle('mode-simulator', isSim);
    document.body.classList.toggle('mode-grid-trainer', isGridTrainer);
    document.body.classList.toggle('mode-math-trainer', isMathTrainer);
    document.body.classList.toggle('sim-session-active', simActive);
    if (workspaceModuleId) {
      const module = RT.Modules.get(workspaceModuleId);
      if (!module) throw new Error(`Módulo no registrado: ${workspaceModuleId}.`);
      activeWorkspaceModule = module;
      els.simStage.innerHTML = '';
      module.mount({
        grid: els.grid,
        panel: els.panel,
        insights: els.insights,
        gallery: els.rangeGallery,
        statusLabel: els.statusLabel,
        statusStats: els.statusStats,
        actionBar: els.actionBar
      });
      syncDesktopPanelMetrics();
      return;
    }
    RT.Grid.render(buildGridViewModel());
    renderPanel();
    renderStatusBar();
    renderInsights();
    if (isSim) RT.SimUI.renderStage(els.simStage, simHelpers());
    else els.simStage.innerHTML = '';
    renderRangeGallery();
    renderActionBar();
    syncDesktopPanelMetrics();
  }

  function syncDesktopPanelMetrics() {
    if (!els.grid || !els.panel || !els.insights) return;
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!desktop) {
      document.documentElement.style.removeProperty('--workspace-grid-height');
      document.documentElement.style.removeProperty('--workspace-grid-offset');
      return;
    }
    const reference = document.body.classList.contains('mode-simulator')
      ? els.simStage
      : els.grid;
    const gridRect = reference.getBoundingClientRect();
    const main = els.panel.parentElement;
    const mainRect = main.getBoundingClientRect();
    const mainStyle = window.getComputedStyle(main);
    const mainContentTop = mainRect.top + (parseFloat(mainStyle.paddingTop) || 0);
    document.documentElement.style.setProperty(
      '--workspace-grid-height', `${Math.round(gridRect.height)}px`);
    document.documentElement.style.setProperty(
      '--workspace-grid-offset',
      `${Math.max(0, Math.round(gridRect.top - mainContentTop))}px`);
  }

  function scheduleDesktopPanelMetrics() {
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      syncDesktopPanelMetrics();
    });
  }

  function setMode(mode) {
    if (mode === 'range-quiz' || mode === 'surgical-quiz') {
      ui.trainingMode = mode === 'range-quiz' ? 'range' : 'questions';
      mode = 'training';
    }
    if (ui.mode === mode) return;
    clearTimeout(autoAdvanceTimer);
    const previousMode = ui.mode;
    if (['grid-trainer', 'math-trainer'].includes(previousMode) && activeWorkspaceModule) {
      activeWorkspaceModule.unmount();
      activeWorkspaceModule = null;
      RT.Grid.init(els.grid, onHandToggle);
    }
    suppressEngineRender = true;
    try {
      if (previousMode === 'training' && RT.RangeQuiz.state.status !== 'idle') RT.RangeQuiz.stop();
      if (previousMode === 'training' && RT.SurgicalQuiz.state.status !== 'idle') RT.SurgicalQuiz.stop();
      if (previousMode === 'simulator' && RT.Simulator.state.status !== 'idle') RT.Simulator.stop();
      if (previousMode === 'simulator' && RT.SimUI &&
          typeof RT.SimUI.currentTool === 'function' &&
          RT.SimUI.currentTool() === 'position' && RT.SimulatorPosition) {
        RT.SimulatorPosition.stop();
      }
    } finally {
      suppressEngineRender = false;
    }
    ui.mode = mode;
    renderAll();
  }

  function setTrainingMode(mode) {
    if (!['range', 'questions'].includes(mode) || ui.trainingMode === mode) return;
    clearTimeout(autoAdvanceTimer);
    suppressEngineRender = true;
    try {
      if (ui.trainingMode === 'range' && RT.RangeQuiz.state.status !== 'idle') {
        RT.RangeQuiz.stop();
      }
      if (ui.trainingMode === 'questions' &&
          RT.SurgicalQuiz.state.status !== 'idle') {
        RT.SurgicalQuiz.stop();
      }
    } finally {
      suppressEngineRender = false;
    }
    ui.trainingMode = mode;
    ui.review.focus = null;
    ui.review.view = 'compare';
    renderAll();
  }

  /* ------------------- Registro de progreso y automatismos -------------- */

  /**
   * Reacciona a la ENTRADA en review de un motor (una sola vez por check):
   * resetea la vista de revisión, registra estadísticas y dispara los
   * automatismos configurables (solución automática, auto-avance).
   */
  function trackStatus(key, status) {
    // Métricas de sesión: arrancar sesión nueva y cronometrar cada pregunta.
    if (status === 'running') {
      if (lastStatus[key] === 'idle' || lastStatus[key] === 'finished') resetSession(key);
      session.lastShownAt = Date.now();   // nueva pregunta o reintento
    }
    const entered = status === 'review' && lastStatus[key] !== 'review';
    lastStatus[key] = status;
    if (!entered) return;

    ui.review.focus = null;
    ui.review.view = 'compare';

    if (key === 'surgical') {
      const q = RT.SurgicalQuiz.current;
      const r = RT.SurgicalQuiz.state.result;
      session.answers.push({
        perfect: r.isPerfect,
        ms: Date.now() - session.lastShownAt,
        action: q.action, category: q.category,
        failHands: r.extra.concat(r.missing)
      });
      RT.Stats.record({
        qid: q.id, perfect: r.isPerfect,
        spot: q.context.spot, hero: q.context.hero, relative: q.context.relative,
        action: q.action, category: q.category,
        okHands: r.correct, failHands: r.extra.concat(r.missing)
      });
      if (!r.isPerfect && RT.Settings.get('autoSolution')) ui.review.view = 'correct';
      if (r.isPerfect && RT.Settings.get('autoAdvance')) {
        autoAdvanceTimer = setTimeout(() => RT.SurgicalQuiz.next(),
          RT.Settings.get('autoAdvanceSecs') * 1000);
      }
    } else {
      const ex = RT.RangeQuiz.current;
      const r = RT.RangeQuiz.state.result;
      session.answers.push({
        perfect: r.isPerfect,
        ms: Date.now() - session.lastShownAt,
        action: null, category: null,
        failHands: r.wrongAction.concat(r.extra, r.missing)
      });
      RT.Stats.record({
        qid: null, perfect: r.isPerfect,
        spot: ex.context.spot, hero: ex.context.hero, relative: ex.context.relative,
        action: null, category: null,
        okHands: r.correct, failHands: r.wrongAction.concat(r.extra, r.missing)
      });
      if (!r.isPerfect && RT.Settings.get('autoSolution')) ui.review.view = 'correct';
      if (r.isPerfect && RT.Settings.get('autoAdvance')) {
        autoAdvanceTimer = setTimeout(() => RT.RangeQuiz.next(),
          RT.Settings.get('autoAdvanceSecs') * 1000);
      }
    }
  }

  /* ------------------------------ Teclado ------------------------------- */

  function onKeyDown(ev) {
    // ESC cierra primero el modal; si no hay uno, el modulo activo puede usarlo.
    if (ev.key === 'Escape' && RT.Modal.isOpen) {
      RT.Modal.close();
      ev.preventDefault();
      return;
    }
    if (RT.Modal.isOpen) return;
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;

    if (ui.mode === 'grid-trainer' || ui.mode === 'math-trainer') {
      const module = RT.Modules.get(ui.mode);
      if (module && module.handleKey && module.handleKey(ev.key)) ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape') return;

    if (ui.mode === 'simulator') {
      const r = RT.SimUI.handleKey(ev.key);
      if (r === 'viewer') { RT.SimUI.openRangeViewer(simHelpers()); ev.preventDefault(); }
      else if (r) ev.preventDefault();
      return;
    }

    const rq = RT.RangeQuiz.state, sq = RT.SurgicalQuiz.state;

    const k = ev.key.toLowerCase();
    if (ui.mode === 'study' && k === 'f') {
      if (ui.openSections.has('study-filters')) ui.openSections.delete('study-filters');
      else ui.openSections.add('study-filters');
      renderPanel();
      ev.preventDefault();
      return;
    }
    if (ui.mode === 'study' && k === 'h' && RT.Stats.hasData) {
      ui.study.heatmap = ui.study.heatmap === 'fails'
        ? 'mastery'
        : (ui.study.heatmap === 'mastery' ? null : 'fails');
      renderAll();
      ev.preventDefault();
      return;
    }

    if (ev.key === 'Enter') {
      if (isRangeTraining() && rq.status === 'running') { RT.RangeQuiz.check(); ev.preventDefault(); }
      else if (isQuestionTraining() && sq.status === 'running' && sq.selected.size) {
        RT.SurgicalQuiz.check(); ev.preventDefault();
      }
      return;
    }
    if (k === 'n') {
      if (isRangeTraining() && rq.status === 'review') RT.RangeQuiz.next();
      else if (isQuestionTraining() && sq.status === 'review') RT.SurgicalQuiz.next();
      return;
    }
    if (k === 'r') {
      if (isRangeTraining() && rq.status === 'review') RT.RangeQuiz.retry();
      else if (isRangeTraining() && rq.status === 'running') RT.RangeQuiz.clearPaint();
      else if (isQuestionTraining() && sq.status === 'running') {
        Array.from(sq.selected).forEach(hand => RT.SurgicalQuiz.toggleHand(hand));
      }
      return;
    }
    if (isRangeTraining() && rq.status === 'running' && /^[1-4]$/.test(ev.key)) {
      const action = RT.RangeQuiz.current.actions[Number(ev.key) - 1];
      if (action) RT.RangeQuiz.setBrush(action);
    }
  }

  /* ------------------------------- Arranque ----------------------------- */

  function boot() {
    els.tabs = document.getElementById('mode-tabs');
    els.panel = document.getElementById('panel');
    els.statusLabel = document.getElementById('status-label');
    els.statusStats = document.getElementById('status-stats');
    els.sourceLabel = document.getElementById('source-label');
    els.labelsToggle = document.getElementById('labels-toggle');
    els.actionBar = document.getElementById('action-bar');
    els.simStage = document.getElementById('sim-stage');
    els.insights = document.getElementById('insights');
    els.grid = document.getElementById('grid');
    els.rangeGallery = document.getElementById('range-gallery');
    rangeGallery = RT.RangeGallery.create({
      ui,
      root: els.rangeGallery,
      toolkit: uiToolkit,
      rangeAnalytics,
      colorOf,
      onContextSelected: () => renderAll(),
      renderAll
    });
    dialogs = RT.Dialogs.create({ toolkit: uiToolkit, renderAll });
    quizCommonUI = RT.QuizCommonUI.create({
      ui,
      toolkit: uiToolkit,
      renderPanel
    });
    quizResultsUI = RT.QuizResultsUI.create({
      ui,
      toolkit: uiToolkit,
      session,
      rollingAccuracy,
      renderGrid: () => RT.Grid.render(buildGridViewModel()),
      renderPanel,
      panelElement: () => els.panel
    });
    studyUI = RT.StudyUI.create({
      ui,
      toolkit: uiToolkit,
      studyContext,
      rangeAnalytics,
      renderAll,
      renderPanel
    });
    rangeQuizUI = RT.RangeQuizUI.create({
      ui,
      hot,
      toolkit: uiToolkit,
      promptCard,
      scoreCard,
      selectedContextIds,
      common: quizCommonUI,
      results: quizResultsUI
    });
    surgicalQuizUI = RT.SurgicalQuizUI.create({
      ui,
      hot,
      toolkit: uiToolkit,
      promptCard,
      scoreCard,
      selectedContextIds,
      common: quizCommonUI,
      results: quizResultsUI
    });
    trainingUI = RT.TrainingUI.create({
      ui,
      toolkit: uiToolkit,
      rangeQuizUI,
      surgicalQuizUI,
      onModeChange: setTrainingMode
    });

    const sources = RT.Engine.getSources();
    if (!sources.length) {
      console.error('[RT] No hay fuentes de rangos definidas.');
      els.statusLabel.textContent = 'No hay datos de rangos';
      els.panel.textContent = 'No se pudo iniciar: añade al menos una fuente y un rango válido.';
      return;
    }
    ui.source = sources[0].id;
    els.sourceLabel.textContent = sources[0].label;

    RT.Engine.validate();
    RT.Settings.applyVisual();

    // Nivel por defecto del quiz quirúrgico según la dificultad configurada.
    RT.Settings.difficultyLevels().forEach(l => ui.surgicalConfig.levels.add(l));
    ui.rangeQuizConfig.includeFold = !!RT.Settings.get('includeFold');

    ui.study.spot = RT.Engine.availableSpots(ui.source)[0] || null;
    studyUI.reconcileSelection();
    const initialContext = studyContext();
    if (initialContext) ui.gallerySelection.add(contextId(initialContext));

    RT.Grid.init(els.grid, onHandToggle);

    els.tabs.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-mode]');
      if (b) setMode(b.dataset.mode);
    });

    els.labelsToggle.addEventListener('click', () => {
      ui.showLabels = !ui.showLabels;
      els.labelsToggle.classList.toggle('is-active', !ui.showLabels);
      els.labelsToggle.setAttribute('aria-pressed', String(!ui.showLabels));
      RT.Grid.render(buildGridViewModel());
    });

    document.getElementById('config-btn').addEventListener('click', openConfigModal);
    document.getElementById('stats-btn').addEventListener('click', openStatsModal);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerover', (ev) => showHelpFor(ev.target));
    document.addEventListener('focusin', (ev) => showHelpFor(ev.target));
    window.addEventListener('resize', scheduleDesktopPanelMetrics, { passive: true });
    if ('ResizeObserver' in window) {
      const layoutObserver = new ResizeObserver(scheduleDesktopPanelMetrics);
      layoutObserver.observe(document.getElementById('grid'));
    }

    /* ---- Render completo en transiciones de estado de los motores ---- */
    RT.on('rangequiz:changed', () => {
      clearTimeout(autoAdvanceTimer);
      trackStatus('range', RT.RangeQuiz.state.status);
      if (!suppressEngineRender) renderAll();
    });
    RT.on('surgical:changed', () => {
      clearTimeout(autoAdvanceTimer);
      trackStatus('surgical', RT.SurgicalQuiz.state.status);
      if (!suppressEngineRender) renderAll();
    });

    /* ---- RUTAS CALIENTES: pintado/selección sin reconstruir nada ---- */
    RT.on('rangequiz:hand', ({ hand, action }) => {
      if (!isRangeTraining()) return;
      RT.Grid.updateHand(hand, { color: action ? colorOf(action) : '' });
      renderStatusBar();
      if (hot.leftSummary) {
        hot.leftSummary.textContent =
          `${RT.Hands.comboStats(Object.keys(RT.RangeQuiz.state.paint)).total} combos`;
      }
    });
    RT.on('surgical:hand', ({ hand, selected }) => {
      if (!isQuestionTraining()) return;
      RT.Grid.updateHand(hand, { selected });
      renderStatusBar();
      if (hot.leftSummary) {
        hot.leftSummary.textContent =
          `${RT.Hands.comboStats(Array.from(RT.SurgicalQuiz.state.selected)).total} combos`;
      }
      const enabled = RT.SurgicalQuiz.state.selected.size > 0;
      if (hot.surgicalCheckBtn) hot.surgicalCheckBtn.disabled = !enabled;
      const barCheck = els.actionBar.querySelector('[data-role="check"]');
      if (barCheck) barCheck.disabled = !enabled;
    });
    RT.on('rangequiz:brush', () => rangeQuizUI.renderBrushBox());
    RT.on('sim:changed', (change) => {
      if (suppressEngineRender || ui.mode !== 'simulator') return;
      if (change && change.type === 'duel:position-config') {
        // Hero/Villain solo actualiza los selectores y sus opciones inválidas.
        // Evita una reconstrucción completa de la mesa y la galería en cada cambio.
        renderPanel();
        scheduleDesktopPanelMetrics();
        return;
      }
      renderAll();
    });

    /* ---- Cambios de configuración / favoritos ---- */
    RT.on('settings:changed', (change) => {
      const key = change && change.key;
      if (key === 'includeFold' || key === '*') {
        ui.rangeQuizConfig.includeFold = !!RT.Settings.get('includeFold');
      }
      if (key === 'difficulty' || key === '*') {
        ui.surgicalConfig.levels.clear();
        RT.Settings.difficultyLevels().forEach(l => ui.surgicalConfig.levels.add(l));
      }
      renderAll();
    });
    RT.on('favorites:changed', () => { /* el panel se re-renderiza donde toca */ });

    renderAll();
  }

  document.addEventListener('DOMContentLoaded', boot);

})(window.RT);
