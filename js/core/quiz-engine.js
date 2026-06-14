/* ============================================================================
 * quiz-engine.js — MOTOR DE QUIZ (sin DOM)
 * ============================================================================
 * Implementa los dos modos de quiz como máquinas de estado puras:
 *
 *   TIPO A — QUIZ DE RANGO COMPLETO (RT.RangeQuiz)
 *     "Pinta el rango completo de OR desde UTG."
 *     El usuario pinta la matriz (con pincel de acción si el spot tiene
 *     varias acciones) y el motor compara contra el rango real:
 *     aciertos / errores de acción / faltantes / sobrantes.
 *
 *   TIPO B — QUIZ QUIRÚRGICO (RT.SurgicalQuiz)
 *     "¿Con qué Ax suited pagamos un 3bet desde UTG OOP?"
 *     Preguntas generadas desde plantillas (questions.data.js) expandidas
 *     sobre los rangos disponibles. El usuario selecciona manos y el motor
 *     evalúa la selección. Lleva registro de fallos para repasarlos.
 *
 * Ambos motores emiten eventos vía RT.emit y exponen su estado de forma
 * inmutable hacia fuera (la UI solo lee). No tocan el DOM.
 *
 * El simulador reutiliza la misma fuente de verdad mediante
 * RT.Engine.getActionMap(ctx); no mantiene respuestas paralelas.
 * ==========================================================================*/
'use strict';

(function (RT) {

  /* ------------------------------------------------------------------------
   * Utilidades comunes.
   * ----------------------------------------------------------------------*/

  /** Baraja una copia del array (Fisher-Yates). */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Reordena un pool ya barajado agrupándolo por dimensiones (orden estable).
   * options.groupBy: subconjunto de ['spot','hero','action'] — corresponde a
   * los toggles "mezclar spots/posiciones/acciones" desactivados.
   */
  function groupPool(pool, groupBy) {
    if (!groupBy || !groupBy.length) return pool;
    const keyOf = (q) => groupBy.map(dim =>
      dim === 'action' ? (q.action || '') : (q.context ? q.context[dim] || '' : '')
    ).join('|');
    return pool
      .map((q, i) => ({ q, i }))
      .sort((a, b) => {
        const ka = keyOf(a.q), kb = keyOf(b.q);
        return ka < kb ? -1 : ka > kb ? 1 : a.i - b.i; // estable
      })
      .map(e => e.q);
  }

  /** Compara un Set de manos seleccionadas contra un Set objetivo. */
  function evaluateSelection(selected, target) {
    const correct = [], extra = [], missing = [];
    for (const h of selected) (target.has(h) ? correct : extra).push(h);
    for (const h of target) if (!selected.has(h)) missing.push(h);
    return {
      correct, extra, missing,
      isPerfect: extra.length === 0 && missing.length === 0
    };
  }

  /* ==========================================================================
   * REGISTRO DE PREGUNTAS (plantillas + preguntas manuales).
   * ========================================================================*/
  const questionTemplates = [];
  const manualQuestions = [];
  const questionCategories = []; // [{id,label}] — orden de definición = orden visual
  const questionIds = new Set();
  const warnedPoolIds = new Set();

  /**
   * Declara una categoría de preguntas (p. ej. 'ax', 'pairs'). Las plantillas
   * y preguntas manuales se asignan a una categoría con su campo `category`,
   * y el usuario puede filtrar por categorías al configurar el quiz.
   */
  RT.defineQuestionCategory = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id || !def.label) {
      console.error('[RT datos] defineQuestionCategory: falta id o label'); return;
    }
    if (questionCategories.some(c => c.id === def.id)) {
      console.error(`[RT datos] defineQuestionCategory: id duplicado "${def.id}"`); return;
    }
    questionCategories.push(def);
  };

  RT.defineQuestionTemplate = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id || !def.text ||
        !def.filter || typeof def.filter !== 'object' || Array.isArray(def.filter)) {
      console.error('[RT datos] defineQuestionTemplate: faltan id, text o filter válido'); return;
    }
    if (questionIds.has(def.id)) {
      console.error(`[RT datos] defineQuestionTemplate: id duplicado "${def.id}"`); return;
    }
    if (def.category && !questionCategories.some(c => c.id === def.category)) {
      console.error(`[RT datos] defineQuestionTemplate: categoría desconocida "${def.category}"`); return;
    }
    if (def.level !== undefined && ![1, 2, 3].includes(def.level)) {
      console.error(`[RT datos] defineQuestionTemplate: nivel inválido en "${def.id}"`); return;
    }
    questionIds.add(def.id);
    questionTemplates.push(def);
  };

  RT.defineQuestion = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id || !def.text || !def.context || !def.action ||
        !def.filter || typeof def.filter !== 'object' || Array.isArray(def.filter)) {
      console.error('[RT datos] defineQuestion: faltan campos válidos (id, text, context, action, filter)'); return;
    }
    if (questionIds.has(def.id)) {
      console.error(`[RT datos] defineQuestion: id duplicado "${def.id}"`); return;
    }
    if (def.category && !questionCategories.some(c => c.id === def.category)) {
      console.error(`[RT datos] defineQuestion: categoría desconocida "${def.category}"`); return;
    }
    if (def.level !== undefined && ![1, 2, 3].includes(def.level)) {
      console.error(`[RT datos] defineQuestion: nivel inválido en "${def.id}"`); return;
    }
    const hasContext = RT.Engine.getSources().some(source => {
      const ctx = Object.assign({ source: source.id }, def.context);
      return RT.Engine.isContextComplete(ctx) &&
        RT.Engine.availableActions(ctx).includes(def.action);
    });
    if (!RT.Engine.getActionDef(def.action) || !hasContext) {
      console.error(`[RT datos] defineQuestion: contexto o acción inexistente en "${def.id}"`); return;
    }
    questionIds.add(def.id);
    manualQuestions.push(def);
  };

  /** Verbo en español para enunciados según la acción. */
  const ACTION_VERBS = {
    OR: 'abrimos (OR)',
    CALL: 'pagamos (Call)',
    FOLD: 'tiramos (Fold)',
    '3BET': 'hacemos 3bet',
    '3BET_MAIN': 'hacemos 3bet principal',
    '3BET_MIXED': 'hacemos 3bet mixto',
    '4BET': 'hacemos 4bet',
    '5BETPLUS': 'hacemos 5bet+',
    '5BET_STACKOFF': 'hacemos 5bet+ / stack-off',
    'CALL_STANDARD': 'pagamos (Call estándar)',
    'CALL_MARGINAL': 'pagamos (Call marginal)',
    'CALL_VS_4BET': 'pagamos el 4bet',
    'FOLD_VS_4BET': 'foldeamos frente al 4bet',
    ALLIN: 'vamos all-in'
  };

  /** Enunciado humano de una pregunta generada. */
  function questionText(template, ctx, action) {
    const verb = ACTION_VERBS[action] || action;
    if (ctx.vs) {
      return `¿Qué ${template.text} ${verb} en ${RT.Engine.describeContext(ctx)}?`;
    }
    const spotDef = RT.Engine.getSpotDef(ctx.spot);
    const where = ctx.spot === 'OR'
      ? `desde ${ctx.hero}`
      : `desde ${ctx.hero} ${ctx.relative === 'OOP' ? 'fuera de posición' : 'en posición'} (${spotDef.label})`;
    return `¿Qué ${template.text} ${verb} ${where}?`;
  }

  /**
   * Expande plantillas + preguntas manuales sobre los rangos disponibles
   * y devuelve solo preguntas con respuesta no vacía.
   *
   * @param {object} options
   *   source   : id de fuente de rangos (obligatorio)
   *   spots    : array de spots a incluir (vacío = todos)
   *   heroes   : array de posiciones (vacío = todas)
   *   relatives: array de IP/OOP (vacío = todas)
   *   actions  : array de acciones (vacío = todas EXCEPTO FOLD, que solo
   *              entra si se pide explícitamente: preguntar "¿qué foldeamos?"
   *              genera respuestas enormes y poco útiles por defecto)
   *   categories: array de ids de categoría (vacío = todas). Ver
   *              RT.defineQuestionCategory y el campo `category` de plantillas.
   *   kinds    : array con 'suited' y/o 'offsuit' (vacío = ambos + el resto).
   *              Filtra plantillas por el tipo de mano que preguntan.
   *   levels   : array de niveles 1|2|3 (vacío = todos). Las plantillas sin
   *              `level` cuentan como nivel 2 (medio).
   * @returns {Array<{id,text,context,action,target:Set,category,level,meta}>}
   */
  function buildQuestionPool(options) {
    options = options || {};
    const { source } = options;
    const wantSpots   = new Set(options.spots || []);
    const wantHeroes  = new Set(options.heroes || []);
    const wantRels    = new Set(options.relatives || []);
    const wantActions = new Set(options.actions || []);
    const wantCats    = new Set(options.categories || []);
    const wantKinds   = new Set(options.kinds || []);
    const wantLevels  = new Set(options.levels || []);
    const wantContexts = new Set(options.contexts || []);
    const handFilter = options.handFilter || {};
    const wantRanks = new Set(handFilter.ranks || []);
    const wantFamilies = new Set(handFilter.families || []);
    const pool = [];

    // Filtro opcional de la interfaz. Intersecta el resultado de cada
    // plantilla sin alterar las plantillas ni las reglas de evaluación.
    function passesHandFilter(hand) {
      if (wantRanks.size &&
          !Array.from(wantRanks).some(rank => RT.Hands.hasRank(hand, rank))) {
        return false;
      }
      if (!wantFamilies.size) return true;
      return (wantFamilies.has('suited') && RT.Hands.isSuited(hand)) ||
        (wantFamilies.has('offsuit') && RT.Hands.isOffsuit(hand)) ||
        (wantFamilies.has('pair') && RT.Hands.isPair(hand)) ||
        (wantFamilies.has('connector') && RT.Hands.isConnector(hand));
    }

    function filteredTarget(hands, templateFilter) {
      return RT.Hands.filterHands(hands, templateFilter)
        .filter(passesHandFilter);
    }

    /** ¿Pasa una plantilla/pregunta los filtros de categoría, tipo y nivel? */
    function passesTemplateFilters(def) {
      if (wantCats.size && !wantCats.has(def.category)) return false;
      if (wantLevels.size && !wantLevels.has(def.level || 2)) return false;
      if (wantKinds.size) {
        const f = def.filter || {};
        const isSuited = f.suited === true;
        const isOffsuit = f.offsuit === true;
        if (!((wantKinds.has('suited') && isSuited) || (wantKinds.has('offsuit') && isOffsuit))) return false;
      }
      return true;
    }

    /**
     * Metadatos pedagógicos opcionales que viajan con cada pregunta generada.
     * ARQUITECTURA PREPARADA (sin contenido aún): cuando las plantillas o
     * preguntas declaren estos campos, la UI los mostrará en la revisión.
     */
    function metaOf(def) {
      if (!def.explanation && !def.concept && !def.observations && !def.commonErrors) return null;
      return {
        explanation: def.explanation || null,    // por qué la respuesta es esa
        concept: def.concept || null,            // concepto teórico asociado
        observations: def.observations || null,  // matices / notas
        commonErrors: def.commonErrors || null   // errores frecuentes
      };
    }

    const contexts = RT.Engine.getContexts({ source }).filter(ctx => {
      if (wantSpots.size && !wantSpots.has(ctx.spot)) return false;
      if (wantHeroes.size && !wantHeroes.has(ctx.hero)) return false;
      if (ctx.relative && wantRels.size && !wantRels.has(ctx.relative)) return false;
      return !wantContexts.size || wantContexts.has(RT.Engine.contextId(ctx));
    });

    // Expandir plantillas.
    for (const ctx of contexts) {
      for (const action of RT.Engine.availableActions(ctx)) {
        if (wantActions.size ? !wantActions.has(action) : action === 'FOLD') continue;
        const actionRange = RT.Engine.getRange(ctx, action);
        if (!actionRange.length) continue;
        for (const tpl of questionTemplates) {
          if (!passesTemplateFilters(tpl)) continue;
          const target = filteredTarget(actionRange, tpl.filter);
          if (!target.length) continue; // Sin respuesta → pregunta descartada.
          pool.push({
            id: `${tpl.id}@${RT.Engine.contextId(ctx)}/${action}`,
            text: questionText(tpl, ctx, action),
            context: ctx,
            action,
            target: new Set(target),
            category: tpl.category || null,
            level: tpl.level || 2,
            meta: metaOf(tpl)
          });
        }
      }
    }

    // Añadir preguntas manuales que encajen con los filtros de configuración.
    for (const q of manualQuestions) {
      if (!passesTemplateFilters(q)) continue;
      const ctx = Object.assign({ source }, q.context);
      const contextId = RT.Engine.contextId(ctx);
      if (wantContexts.size && !wantContexts.has(contextId)) continue;
      if (wantSpots.size && !wantSpots.has(ctx.spot)) continue;
      if (wantHeroes.size && !wantHeroes.has(ctx.hero)) continue;
      if (ctx.relative && wantRels.size && !wantRels.has(ctx.relative)) continue;
      if (wantActions.size ? !wantActions.has(q.action) : q.action === 'FOLD') continue;
      const target = filteredTarget(
        RT.Engine.getRange(ctx, q.action), q.filter);
      if (!target.length) continue;
      pool.push({
        id: q.id, text: q.text, context: ctx, action: q.action,
        target: new Set(target),
        category: q.category || null, level: q.level || 2, meta: metaOf(q)
      });
    }

    const seen = new Set();
    return pool.filter(q => {
      if (!seen.has(q.id)) { seen.add(q.id); return true; }
      if (!warnedPoolIds.has(q.id)) {
        warnedPoolIds.add(q.id);
        console.error(`[RT datos] Pregunta duplicada ignorada: "${q.id}"`);
      }
      return false;
    });
  }

  /* ==========================================================================
   * TIPO B — QUIZ QUIRÚRGICO.
   * Estados: idle → running → (review por pregunta) → finished.
   * ========================================================================*/
  const surgical = {
    status: 'idle',        // idle | running | review | finished
    pool: [],              // preguntas de la sesión (barajadas)
    index: 0,
    selected: new Set(),   // manos seleccionadas por el usuario
    result: null,          // resultado de la última comprobación
    score: { ok: 0, fail: 0 },
    failedQuestions: [],   // preguntas falladas (para repaso)
    isFailRun: false,
    requeueFails: false    // "repetir hasta dominar"
  };

  /** Estado inicial común de cualquier sesión quirúrgica. */
  function beginSession(pool, flags) {
    surgical.status = 'running';
    surgical.pool = pool;
    surgical.index = 0;
    surgical.selected = new Set();
    surgical.result = null;
    surgical.score = { ok: 0, fail: 0 };
    surgical.failedQuestions = [];
    surgical.isFailRun = !!flags.isFailRun;
    surgical.requeueFails = !!flags.requeueFails;
    RT.emit('surgical:changed');
  }

  const SurgicalQuiz = {
    /** Estado de solo lectura para la UI. */
    get state() { return surgical; },

    /**
     * Catálogo de categorías con alguna plantilla/pregunta asignada
     * (condicional: una categoría sin contenido no genera botón).
     */
    getCategories() {
      const used = new Set();
      questionTemplates.forEach(t => used.add(t.category));
      manualQuestions.forEach(q => used.add(q.category));
      return questionCategories.filter(c => used.has(c.id));
    },

    /** Cuenta cuántas preguntas generaría una configuración (para la UI). */
    countQuestions(options) { return buildQuestionPool(options).length; },

    /**
     * Arranca una sesión. Devuelve false si no hay preguntas.
     * options.limit        → recorta la sesión a N preguntas (sesiones rápidas
     *                        y "preguntas por sesión" de la configuración).
     * options.requeueFails → "repetir hasta dominar": cada pregunta fallada
     *                        se reencola al final hasta acertarla.
     */
    start(options) {
      options = options || {};
      let pool = groupPool(shuffle(buildQuestionPool(options)), options.groupBy);
      if (!pool.length) return false;
      if (options.limit > 0) pool = pool.slice(0, options.limit);
      beginSession(pool, { requeueFails: !!options.requeueFails, isFailRun: false });
      return true;
    },

    /**
     * Arranca una sesión SOLO con preguntas de una lista de ids (repaso
     * dirigido de falladas: el orden de `ids` manda — recientes/frecuentes).
     */
    startFromIds(options, ids) {
      options = options || {};
      if (!ids || !ids.length) return false;
      const byId = new Map(buildQuestionPool(options).map(q => [q.id, q]));
      const pool = ids.map(id => byId.get(id)).filter(Boolean);
      if (!pool.length) return false;
      beginSession(pool, { requeueFails: !!options.requeueFails, isFailRun: true });
      return true;
    },

    /** Repasa solo las preguntas falladas de la sesión anterior. */
    startFailRun() {
      if (!surgical.failedQuestions.length) return false;
      beginSession(shuffle(surgical.failedQuestions), { requeueFails: surgical.requeueFails, isFailRun: true });
      return true;
    },

    get current() { return surgical.pool[surgical.index] || null; },

    /**
     * Alterna la selección de una mano (solo en estado running).
     * Emite 'surgical:hand' (evento FINO): la UI solo actualiza esa celda
     * y los contadores, sin reconstruir el panel. Las transiciones de
     * estado siguen emitiendo 'surgical:changed' (render completo).
     */
    toggleHand(hand) {
      if (surgical.status !== 'running' || !RT.Hands.ALL_HANDS.includes(hand)) return;
      const selected = !surgical.selected.has(hand);
      if (selected) surgical.selected.add(hand);
      else surgical.selected.delete(hand);
      RT.emit('surgical:hand', { hand, selected });
    },

    /** Comprueba la selección actual contra el objetivo. */
    check() {
      if (surgical.status !== 'running' || !this.current) return;
      surgical.result = evaluateSelection(surgical.selected, this.current.target);
      surgical.status = 'review';
      if (surgical.result.isPerfect) {
        surgical.score.ok++;
        if (surgical.requeueFails) {
          surgical.failedQuestions = surgical.failedQuestions
            .filter(q => q.id !== this.current.id);
        }
      } else {
        surgical.score.fail++;
        if (!surgical.failedQuestions.some(q => q.id === this.current.id)) {
          surgical.failedQuestions.push(this.current);
        }
        // "Repetir hasta dominar": la pregunta vuelve al final de la cola.
        if (surgical.requeueFails) surgical.pool.push(this.current);
      }
      RT.emit('surgical:changed');
    },

    /** Pasa a la siguiente pregunta o termina la sesión. */
    next() {
      if (surgical.status !== 'review') return;
      surgical.index++;
      surgical.selected = new Set();
      surgical.result = null;
      surgical.status = surgical.index >= surgical.pool.length ? 'finished' : 'running';
      RT.emit('surgical:changed');
    },

    /** Aborta la sesión y vuelve a idle. */
    stop() {
      surgical.status = 'idle';
      surgical.pool = [];
      surgical.index = 0;
      surgical.selected = new Set();
      surgical.result = null;
      RT.emit('surgical:changed');
    }
  };

  /* ==========================================================================
   * TIPO A — QUIZ DE RANGO COMPLETO.
   * El ejercicio es un contexto completo; el usuario pinta cada mano con la
   * acción que cree correcta. Estados: idle → running → review → finished.
   * ========================================================================*/
  const rangeQuiz = {
    status: 'idle',          // idle | running | review | finished
    exercises: [],           // [{context, actionMap, actions}]
    index: 0,
    brush: null,             // acción activa del pincel
    paint: Object.create(null), // mano → acción pintada por el usuario
    result: null,
    score: { ok: 0, fail: 0 }
  };

  /**
   * Construye la lista de ejercicios (contextos completos) a partir de filtros.
   * options.includeFold = true exige también pintar las manos de FOLD
   * (por defecto FOLD queda fuera: las manos sin pintar cuentan como fold).
   */
  function buildExercises(options) {
    options = options || {};
    const { source } = options;
    const wantSpots  = new Set(options.spots || []);
    const wantHeroes = new Set(options.heroes || []);
    const wantRels   = new Set(options.relatives || []);
    const includeFold = !!options.includeFold;
    const wantContexts = new Set(options.contexts || []);
    const list = [];
    for (const ctx of RT.Engine.getContexts({ source })) {
      if (wantSpots.size && !wantSpots.has(ctx.spot)) continue;
      if (wantHeroes.size && !wantHeroes.has(ctx.hero)) continue;
      if (ctx.relative && wantRels.size && !wantRels.has(ctx.relative)) continue;
      if (wantContexts.size && !wantContexts.has(RT.Engine.contextId(ctx))) continue;
      const actionMap = RT.Engine.getActionMap(ctx);
      const actions = RT.Engine.availableActions(ctx)
        .filter(a => includeFold || a !== 'FOLD');
      const target = Object.create(null);
      for (const h of Object.keys(actionMap)) {
        if (actions.includes(actionMap[h])) target[h] = actionMap[h];
      }
      if (Object.keys(target).length) {
        list.push({
          id: `range@${RT.Engine.contextId(ctx)}${includeFold ? '/fold' : ''}`,
          context: ctx, target, actions
        });
      }
    }
    return list;
  }

  /** Evalúa pintura del usuario contra el objetivo mano→acción. */
  function evaluatePaint(paint, target) {
    const correct = [], wrongAction = [], extra = [], missing = [];
    for (const h of Object.keys(paint)) {
      if (!target[h]) extra.push(h);
      else if (target[h] === paint[h]) correct.push(h);
      else wrongAction.push(h);
    }
    for (const h of Object.keys(target)) if (!paint[h]) missing.push(h);
    return {
      correct, wrongAction, extra, missing,
      isPerfect: wrongAction.length === 0 && extra.length === 0 && missing.length === 0
    };
  }

  const RangeQuiz = {
    get state() { return rangeQuiz; },

    countExercises(options) { return buildExercises(options).length; },

    start(options) {
      options = options || {};
      let exercises = groupPool(shuffle(buildExercises(options)), options.groupBy);
      if (!exercises.length) return false;
      if (options.limit > 0) exercises = exercises.slice(0, options.limit);
      rangeQuiz.status = 'running';
      rangeQuiz.exercises = exercises;
      rangeQuiz.index = 0;
      rangeQuiz.paint = Object.create(null);
      rangeQuiz.result = null;
      rangeQuiz.score = { ok: 0, fail: 0 };
      rangeQuiz.brush = exercises[0].actions[0] || null;
      RT.emit('rangequiz:changed');
      return true;
    },

    get current() { return rangeQuiz.exercises[rangeQuiz.index] || null; },

    setBrush(action) {
      if (rangeQuiz.status !== 'running' || !this.current ||
          !this.current.actions.includes(action)) return;
      rangeQuiz.brush = action;
      // Evento fino: la UI solo actualiza la botonera de pinceles.
      RT.emit('rangequiz:brush', { action });
    },

    /**
     * Pinta/despinta una mano con el pincel activo.
     * Emite 'rangequiz:hand' (evento FINO): la UI solo repinta esa celda
     * y los contadores. Ver nota equivalente en SurgicalQuiz.toggleHand.
     */
    toggleHand(hand) {
      if (rangeQuiz.status !== 'running' || !rangeQuiz.brush ||
          !RT.Hands.ALL_HANDS.includes(hand)) return;
      let action;
      if (rangeQuiz.paint[hand] === rangeQuiz.brush) {
        delete rangeQuiz.paint[hand];
        action = null;
      } else {
        rangeQuiz.paint[hand] = rangeQuiz.brush;
        action = rangeQuiz.brush;
      }
      RT.emit('rangequiz:hand', { hand, action });
    },

    clearPaint() {
      if (rangeQuiz.status !== 'running') return;
      rangeQuiz.paint = Object.create(null);
      RT.emit('rangequiz:changed');
    },

    check() {
      if (rangeQuiz.status !== 'running' || !this.current) return;
      rangeQuiz.result = evaluatePaint(rangeQuiz.paint, this.current.target);
      rangeQuiz.status = 'review';
      if (rangeQuiz.result.isPerfect) rangeQuiz.score.ok++;
      else rangeQuiz.score.fail++;
      RT.emit('rangequiz:changed');
    },

    /** Reintenta el ejercicio actual (conserva la pintura para corregirla). */
    retry() {
      if (rangeQuiz.status !== 'review') return;
      rangeQuiz.status = 'running';
      rangeQuiz.result = null;
      RT.emit('rangequiz:changed');
    },

    next() {
      if (rangeQuiz.status !== 'review') return;
      rangeQuiz.index++;
      rangeQuiz.paint = Object.create(null);
      rangeQuiz.result = null;
      if (rangeQuiz.index >= rangeQuiz.exercises.length) {
        rangeQuiz.status = 'finished';
      } else {
        rangeQuiz.status = 'running';
        rangeQuiz.brush = this.current.actions[0] || null;
      }
      RT.emit('rangequiz:changed');
    },

    stop() {
      rangeQuiz.status = 'idle';
      rangeQuiz.exercises = [];
      rangeQuiz.index = 0;
      rangeQuiz.paint = Object.create(null);
      rangeQuiz.result = null;
      RT.emit('rangequiz:changed');
    }
  };

  RT.SurgicalQuiz = SurgicalQuiz;
  RT.RangeQuiz = RangeQuiz;

})(window.RT);
