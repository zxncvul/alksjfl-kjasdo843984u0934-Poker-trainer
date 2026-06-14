/* ============================================================================
 * simulator-engine.js — MOTOR DEL SIMULADOR PREFLOP (sin DOM)
 * ============================================================================
 * Simula secuencias de decisión preflop realistas usando EXCLUSIVAMENTE los
 * rangos ya guardados en los repertorios (RT.Engine). No duplica datos.
 *
 * CÓMO SE EVALÚA UNA DECISIÓN (única fuente de verdad: los rangos)
 *   · Open raise  → contexto {spot:'OR', hero}. Correcto = 'OR' si la mano
 *     está en el rango OR; si no, 'FOLD'.
 *   · Defensa vs 3bet → contexto {spot:'VS3BET', hero, relative}. Correcto =
 *     la acción del actionMap para esa mano. Si la mano no está en ningún
 *     rango (o está en el rango FOLD explícito), el correcto es 'FOLD':
 *     el fold se INFIERE dentro del contexto, nunca se inventa fuera de él.
 *
 * CÓMO SE DECIDE LA POSICIÓN RELATIVA CONTRA EL 3BET
 *   El villano debe actuar DESPUÉS del héroe en el orden preflop
 *   (UTG→MP→CO→BTN→SB→BB). Postflop:
 *     · villano en ciegas (SB/BB) → el héroe juega EN POSICIÓN (IP)…
 *     · …salvo héroe SB contra BB, que juega OOP.
 *     · villano con asiento posterior no-ciega → héroe FUERA DE POSICIÓN.
 *   Solo se eligen villanos cuyo contexto VS3BET exista en los datos.
 *
 * VALIDACIÓN: una situación solo se genera si su decisión es evaluable con
 * los rangos disponibles. Si la configuración no deja ninguna situación
 * posible, start() devuelve false y la UI muestra un aviso sobrio.
 *
 * API
 *   RT.Simulator.start(config)        → bool
 *   RT.Simulator.startFromFailed(ids) → bool (repaso de falladas sim@…)
 *   RT.Simulator.answer(actionId)     / next() / stop()
 *   RT.Simulator.state / current / availability(source)
 *   Evento: 'sim:changed' en cada transición. Cada decisión evaluada deja
 *   state.lastDecision para que la UI la registre en RT.Stats.
 * ==========================================================================*/
'use strict';

(function (RT) {

  const ORDER = RT.Hands.POSITIONS;            // UTG MP CO BTN SB BB
  const FREQ = { off: 0, baja: 0.25, media: 0.5, alta: 0.75 };

  /**
   * Frecuencia 'realista' de 3bet, aproximada por posición del abridor:
   * los opens tardíos (rangos más anchos) reciben 3bet más a menudo.
   * Además lleva cortafuegos anti-rachas (ver shouldThreeBet): nunca más de
   * 3 secuencias con 3bet seguidas, y tras 6 manos sin ninguno se fuerza uno.
   */
  const REALISTIC_FREQ = { UTG: 0.20, MP: 0.25, CO: 0.35, BTN: 0.45, SB: 0.50 };

  /** Manos premium: decisiones obvias de máxima fuerza (lista estática). */
  const PREMIUM = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs']);

  const CAMPAIGN_HANDS_PER_POS = 10;   // manos por posición en modo campaña

  /* Sizings fijos de la mesa simulada (en BB). Sobrios y documentados:
     open 2.5x; el 3bet desde ciegas es mayor (jugará OOP); 4bet ~2.6x. */
  const STACK_BB = 100;
  const SIZE = { OPEN: 2.5, THREEBET: 8, THREEBET_BLIND: 9, FOURBET: 22 };

  /* ----------------------------- Utilidades ----------------------------- */

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function contextId(ctx) {
    return RT.Engine.contextId(ctx);
  }

  function contextAllowed(config, ctx) {
    return !config.contexts || !config.contexts.size ||
      config.contexts.has(contextId(ctx));
  }

  /** Reparte una mano del dominio, ponderada por nº de combos (realismo). */
  function dealHand(domain, weightFailedHands) {
    let total = 0;
    const weight = hand => RT.Hands.comboCount(hand) *
      (weightFailedHands ? RT.Stats.getHandPerformance(hand).weight : 1);
    for (const h of domain) total += weight(h);
    let r = Math.random() * total;
    for (const h of domain) {
      r -= weight(h);
      if (r <= 0) return h;
    }
    return domain[domain.length - 1];
  }

  /** Posición relativa del héroe si `villain` 3betea (ver cabecera). */
  function relativeFor(hero, villain) {
    if (hero === 'SB' && villain === 'BB') return 'OOP';
    if (villain === 'SB' || villain === 'BB') return 'IP';
    return 'OOP';
  }

  /** Villanos válidos para un 3bet al héroe: posteriores y con datos. */
  function validVillains(source, hero) {
    if (!ORDER.includes(hero)) return [];
    const after = ORDER.slice(ORDER.indexOf(hero) + 1);
    return after.filter(v => {
      const ctx = { source, spot: 'VS3BET', hero, relative: relativeFor(hero, v) };
      return RT.Engine.isContextComplete(ctx) && RT.Engine.availableActions(ctx).length > 0;
    });
  }

  /* ------------------- Tipos de mano (fáciles/borderline) ---------------
   * "Borderline" se CALCULA desde los propios rangos: una mano es fronteriza
   * si alguna vecina ortogonal en la matriz 13×13 tiene una clasificación
   * distinta (dentro/fuera del OR, o distinta acción en la defensa). Son las
   * manos donde de verdad hay dudas. "Fáciles" es el complementario: manos
   * lejos de cualquier frontera (AA tanto como 72o). Sin listas manuales.
   * --------------------------------------------------------------------- */

  const borderCache = new Map();

  /** Conjunto de manos fronterizas para un contexto de decisión. */
  function borderlineSet(ctx) {
    const cacheKey = `${ctx.source}|${ctx.spot}|${ctx.hero}|${ctx.relative || '-'}`;
    if (borderCache.has(cacheKey)) return borderCache.get(cacheKey);

    let cls;
    if (ctx.spot === 'OR') {
      const inRange = new Set(RT.Engine.getRange(ctx, 'OR') || []);
      cls = h => (inRange.has(h) ? 'IN' : 'OUT');
    } else {
      const map = RT.Engine.getActionMap(ctx);
      cls = h => map[h] || 'FOLD';
    }

    const M = RT.Hands.MATRIX;
    const out = new Set();
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const h = M[r][c];
        const v = cls(h);
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr > 12 || nc < 0 || nc > 12) continue;
          if (cls(M[nr][nc]) !== v) { out.add(h); break; }
        }
      }
    }
    borderCache.set(cacheKey, out);
    return out;
  }

  /** Conjunto de manos según el tipo configurado (null = sin restricción). */
  function activeRangeSet(ctx) {
    if (!ctx) return new Set();
    if (ctx.spot === 'OR') {
      return new Set(RT.Engine.getRange(ctx, 'OR') || []);
    }
    const map = RT.Engine.getActionMap(ctx);
    return new Set(Object.keys(map).filter(hand => map[hand] !== 'FOLD'));
  }

  function kindSet(cfg, decisionCtx) {
    switch (cfg.handKind) {
      case 'range': return activeRangeSet(decisionCtx);
      case 'premium': return PREMIUM;
      case 'borderline': return borderlineSet(decisionCtx);
      case 'falladas':
        return new Set(Object.keys(RT.Stats.getHandHeat('fails')));
      case 'faciles': {
        const border = borderlineSet(decisionCtx);
        return new Set(RT.Hands.ALL_HANDS.filter(h => !border.has(h)));
      }
      case 'filtro':
        return cfg.filter && cfg.filter.size ? cfg.filter : null;
      default: return null;   // 'todas'
    }
  }

  /** Catálogo de lo entrenable con los datos actuales (para la UI). */
  function availability(source) {
    const orHeroes = RT.Engine.availableHeroes({ source, spot: 'OR', relative: null })
      .filter(hero => RT.Engine.getRange(
        { source, spot: 'OR', hero, relative: null }, 'OR').length > 0);
    const vs3betHeroes = orHeroes.filter(h => validVillains(source, h).length > 0);
    return { orHeroes, vs3betHeroes };
  }

  /* ------------------------------- Estado ------------------------------- */

  const sim = {
    status: 'idle',     // idle | deciding | feedback | finished
    config: null,
    heroOrder: [],      // posiciones de la sesión (orden lineal o pool aleatorio)
    heroIdx: 0,
    handsPlayed: 0,
    situation: null,    // ver newSituation()
    lastDecision: null, // {qid, perfect, hand, spot, hero, relative, correct, chosen}
    score: { ok: 0, fail: 0 },
    failsByPosition: {},
    failsByAction: {},
    history: [],        // últimas decisiones (para el historial breve)
    replayQueue: null,  // repaso de falladas: decisiones fijas pendientes
    streak3bet: 0,      // secuencias consecutivas con 3bet (cortafuegos)
    since3bet: 0        // manos abiertas sin recibir 3bet
  };

  function emit() { RT.emit('sim:changed'); }

  /* --------------------------- Generación ------------------------------- */

  /** Posiciones entrenables según el tipo de entrenamiento configurado. */
  function trainablePositions(config) {
    const av = availability(config.source);
    let base;
    if (config.train === 'vs3bet') {
      base = av.vs3betHeroes.filter(hero => eligibleDefenseVillains(config, hero).length > 0);
    }
    else {
      base = av.orHeroes.filter(hero => {
        const context = { source: config.source, spot: 'OR', hero, relative: null };
        return contextAllowed(config, context) &&
          handDomain(config, null, context).length > 0;
      });                                         // 'or' y 'full' parten del OR
    }
    if (config.positions && config.positions.length) {
      base = base.filter(p => config.positions.includes(p));
    }
    return ORDER.filter(p => base.includes(p));    // siempre en orden de mesa
  }

  /**
   * Dominio de manos iniciales: (tipo de mano configurado) ∩ (base del nodo).
   * Si hay filtro/tipo y una base previa, la intersección es estricta:
   * nunca se reparte una mano fuera de lo elegido por el usuario.
   */
  function handDomain(config, baseSet, decisionCtx) {
    const kind = kindSet(config, decisionCtx);
    if (kind !== null && baseSet) {
      return Array.from(kind).filter(h => baseSet.has(h));
    }
    if (baseSet && baseSet.size) return Array.from(baseSet);
    if (kind !== null) return Array.from(kind);
    return RT.Hands.ALL_HANDS.slice();
  }

  function eligibleDefenseVillains(config, hero) {
    const orRange = new Set(RT.Engine.getRange(
      { source: config.source, spot: 'OR', hero, relative: null }, 'OR'));
    if (!orRange.size) return [];
    return validVillains(config.source, hero).filter(villain => {
      const relative = relativeFor(hero, villain);
      const ctx = { source: config.source, spot: 'VS3BET', hero, relative };
      return contextAllowed(config, ctx) && handDomain(config, orRange, ctx).length > 0;
    });
  }

  /**
   * Crea la siguiente situación. En 'or'/'full' la primera decisión es el
   * open raise con cualquier mano; en 'vs3bet' la mano se reparte del propio
   * rango OR del héroe (solo llegan al 3bet las manos que abriste) y la
   * decisión arranca directamente en la defensa.
   */
  function newSituation() {
    const cfg = sim.config;
    let hero;
    if (cfg.mode === 'campana') {
      // Campaña: bloques ordenados de N manos por posición.
      hero = sim.heroOrder[Math.floor(sim.handsPlayed / CAMPAIGN_HANDS_PER_POS)];
    } else if (cfg.mode === 'realista' || cfg.mode === 'lineal') {
      // Realista: rota las posiciones en orden de mesa, como asientos reales.
      hero = sim.heroOrder[sim.heroIdx++ % sim.heroOrder.length];
    } else {
      hero = rand(sim.heroOrder);
    }

    if (cfg.train === 'vs3bet') {
      const villains = eligibleDefenseVillains(cfg, hero);
      if (!villains.length) return false;
      const villain = rand(villains);
      const relative = relativeFor(hero, villain);
      const defenseCtx = { source: cfg.source, spot: 'VS3BET', hero, relative };
      const orRange = new Set(RT.Engine.getRange({ source: cfg.source, spot: 'OR', hero }, 'OR') || []);
      const domain = handDomain(cfg, orRange, defenseCtx);
      if (!domain.length) return false;
      const hand = dealHand(domain, cfg.weightFailedHands);
      sim.situation = makeDefense(hand, hero, villain, relative, true);
    } else {
      const orCtx = { source: cfg.source, spot: 'OR', hero, relative: null };
      const domain = handDomain(cfg, null, orCtx);
      if (!domain.length) return false;
      const hand = dealHand(domain, cfg.weightFailedHands);
      sim.situation = {
        hand, hero, stage: 'or', villain: null, relative: null,
        context: orCtx,
        options: ['FOLD', 'OR'],
        premise: 'Primera acción: nadie ha entrado al bote.'
      };
    }
    sim.lastDecision = null;
    sim.status = 'deciding';
    return true;
  }

  /** Situación de defensa contra 3bet (segunda calle de la secuencia). */
  function makeDefense(hand, hero, villain, relative, opened) {
    const context = { source: sim.config.source, spot: 'VS3BET', hero, relative };
    const actions = RT.Engine.availableActions(context).filter(a => a !== 'FOLD');
    return {
      hand, hero, stage: 'vs3bet', villain, relative, context,
      options: ['FOLD'].concat(actions),
      premise: `${opened ? `Abriste a ${2.5}bb y ` : ''}${villain} te hace 3bet a ${(villain === 'SB' || villain === 'BB') ? 9 : 8}bb (juegas ${relative}).`
    };
  }

  /* --------------------------- Evaluación ------------------------------- */

  /** Acción correcta de la situación actual, SIEMPRE desde los rangos. */
  function correctAction(situation) {
    if (situation.stage === 'or') {
      const range = RT.Engine.getRange(situation.context, 'OR') || [];
      return range.includes(situation.hand) ? 'OR' : 'FOLD';
    }
    const map = RT.Engine.getActionMap(situation.context);
    const a = map[situation.hand];
    return (a && a !== 'FOLD') ? a : 'FOLD';   // fold explícito o inferido
  }

  function normalizeConfig(config) {
    if (!config || typeof config !== 'object') return null;
    const source = typeof config.source === 'string' &&
      RT.Engine.getSources().some(s => s.id === config.source) ? config.source : null;
    if (!source) return null;
    const mode = ['aleatorio', 'lineal', 'realista', 'campana'].includes(config.mode)
      ? config.mode : 'realista';
    const train = ['or', 'vs3bet', 'full'].includes(config.train) ? config.train : 'full';
    const threeBet = ['off', 'baja', 'media', 'alta', 'realista'].includes(config.threeBet)
      ? config.threeBet : 'realista';
    const count = typeof config.count === 'number' && isFinite(config.count) && config.count >= 0
      ? Math.min(Math.floor(config.count), 10000) : 10;
    const handKind = [
      'todas', 'range', 'premium', 'borderline', 'falladas', 'faciles', 'filtro'
    ].includes(config.handKind)
      ? config.handKind : 'todas';
    const weightFailedHands = config.weightFailedHands !== false;
    const positions = Array.isArray(config.positions)
      ? Array.from(new Set(config.positions.filter(p => ORDER.includes(p)))) : [];
    const contexts = new Set(Array.isArray(config.contexts)
      ? config.contexts.filter(id => typeof id === 'string') : []);
    let filter = null;
    if (config.filter instanceof Set) {
      filter = new Set(Array.from(config.filter).filter(h => RT.Hands.ALL_HANDS.includes(h)));
    } else if (Array.isArray(config.filter)) {
      filter = new Set(config.filter.filter(h => RT.Hands.ALL_HANDS.includes(h)));
    }
    return {
      source, mode, train, positions, contexts, threeBet, count,
      handKind, filter, weightFailedHands
    };
  }

  /* ------------------------------- API ----------------------------------*/

  RT.Simulator = {
    get state() { return sim; },
    get current() { return sim.situation; },
    availability,
    relativeFor,        // expuesto para tests y documentación
    validVillains,

    /**
     * config: { source, mode:'aleatorio'|'lineal',
     *           train:'or'|'vs3bet'|'full',
     *           positions:[…] (vacío = todas las posibles),
     *           threeBet:'off'|'baja'|'media'|'alta',
     *           count: 0|10|25|50  (0 = infinito/manual),
     *           useFilter: bool, filter: Set<hand> }
     */
    start(config) {
      const clean = normalizeConfig(config);
      if (!clean) return false;
      const heroOrder = trainablePositions(clean);
      if (!heroOrder.length) return false;
      sim.config = clean;
      if (sim.config.mode === 'campana') {
        // Campaña completa: N manos por posición, total fijo.
        sim.config.count = heroOrder.length * CAMPAIGN_HANDS_PER_POS;
      }
      sim.heroOrder = heroOrder;
      sim.heroIdx = 0;
      sim.handsPlayed = 0;
      sim.score = { ok: 0, fail: 0 };
      sim.failsByPosition = {};
      sim.failsByAction = {};
      sim.history = [];
      sim.replayQueue = null;
      sim.lastDecision = null;
      sim.streak3bet = 0;
      sim.since3bet = 0;
      if (!newSituation()) {
        sim.status = 'idle';
        sim.situation = null;
        return false;
      }
      emit();
      return true;
    },

    /** Repaso dirigido: reconstruye decisiones desde qids `sim@…`. */
    startFromFailed(ids) {
      if (!Array.isArray(ids)) return false;
      const queue = [];
      const sources = RT.Engine.getSources();
      const source = sim.config && sources.some(s => s.id === sim.config.source)
        ? sim.config.source : (sources[0] && sources[0].id);
      if (!source) return false;
      (ids || []).forEach(id => {
        if (typeof id !== 'string') return;
        const m = /^sim@([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/.exec(id);
        if (!m) return;
        const [, spot, hero, rel, hand] = m;
        const relative = rel === '-' ? null : rel;
        if (!['OR', 'VS3BET'].includes(spot) || !ORDER.includes(hero) ||
            !RT.Hands.ALL_HANDS.includes(hand)) return;
        const ctx = { source, spot, hero, relative };
        if (!RT.Engine.isContextComplete(ctx)) return;
        const open = RT.Engine.getRange({ source, spot: 'OR', hero, relative: null }, 'OR');
        if (!open.length) return;
        if (spot === 'VS3BET') {
          if (!open.includes(hand) || !RT.Engine.availableActions(ctx).length) return;
          const villains = validVillains(source, hero)
            .filter(v => relativeFor(hero, v) === relative);
          if (!villains.length) return;
        }
        queue.push({ spot, hero, relative, hand, source: ctx.source });
      });
      if (!queue.length) return false;
      sim.config = {
        source: queue[0].source, mode: 'repaso', train: 'repaso',
        threeBet: 'off', count: queue.length, useFilter: false, filter: null
      };
      sim.heroOrder = [queue[0].hero];
      sim.handsPlayed = 0;
      sim.score = { ok: 0, fail: 0 };
      sim.failsByPosition = {};
      sim.failsByAction = {};
      sim.history = [];
      sim.replayQueue = queue;
      sim.lastDecision = null;
      nextReplay();
      emit();
      return true;
    },

    /** El usuario decide. Evalúa contra los rangos y pasa a feedback. */
    answer(actionId) {
      if (sim.status !== 'deciding' || !sim.situation ||
          !sim.situation.options.includes(actionId)) return;
      const s = sim.situation;
      const correct = correctAction(s);
      const perfect = actionId === correct;
      if (perfect) sim.score.ok++;
      else {
        sim.score.fail++;
        sim.failsByPosition[s.hero] = (sim.failsByPosition[s.hero] || 0) + 1;
        sim.failsByAction[correct] = (sim.failsByAction[correct] || 0) + 1;
      }
      sim.lastDecision = {
        qid: `sim@${s.context.spot}/${s.hero}/${s.relative || '-'}/${s.hand}`,
        perfect,
        hand: s.hand, spot: s.context.spot, hero: s.hero, relative: s.relative,
        correct, chosen: actionId
      };
      sim.history.unshift({
        hand: s.hand, hero: s.hero, stage: s.stage,
        chosen: actionId, correct, perfect
      });
      if (sim.history.length > 6) sim.history.pop();
      sim.status = 'feedback';
      emit();
    },

    /**
     * Avanza la secuencia. Si la mano abierta era un open correcto y toca
     * 3bet (frecuencia configurada + datos disponibles), la MISMA mano
     * continúa a la decisión de defensa: la secuencia sigue la línea
     * correcta aunque el usuario se haya equivocado (y el fallo ya quedó
     * registrado). Si no, mano nueva o fin de sesión.
     */
    next() {
      if (sim.status !== 'feedback') return;
      const cfg = sim.config;
      const s = sim.situation;

      if (sim.replayQueue) {
        sim.handsPlayed++;
        nextReplay();
        emit();
        return;
      }

      if (s.stage === 'or' && cfg.train === 'full' && sim.lastDecision.correct === 'OR') {
        const villains = eligibleDefenseVillains(cfg, s.hero);
        if (villains.length && shouldThreeBet(cfg, s.hero)) {
          sim.streak3bet++;
          sim.since3bet = 0;
          const villain = rand(villains);
          sim.situation = makeDefense(s.hand, s.hero, villain, relativeFor(s.hero, villain), true);
          sim.lastDecision = null;
          sim.status = 'deciding';
          emit();
          return;
        }
        sim.streak3bet = 0;
        sim.since3bet++;
      }

      sim.handsPlayed++;
      if (cfg.count > 0 && sim.handsPlayed >= cfg.count) {
        sim.status = 'finished';
        sim.situation = null;
      } else {
        if (!newSituation()) {
          sim.status = 'finished';
          sim.situation = null;
        }
      }
      emit();
    },

    stop() {
      sim.status = 'idle';
      sim.situation = null;
      sim.lastDecision = null;
      sim.replayQueue = null;
      emit();
    },

    /**
     * Repite la situación actual tras fallarla: misma mano, misma decisión.
     * El fallo original ya quedó registrado; al repetir, la nueva respuesta
     * cuenta como una decisión más (acertarla salda deuda en falladas).
     */
    retry() {
      if (sim.status !== 'feedback' || !sim.situation ||
          !sim.lastDecision || sim.lastDecision.perfect) return;
      sim.status = 'deciding';
      emit();
    },

    /**
     * Estado visual de la mesa 6-max para la situación actual. Calculado al
     * vuelo desde la situación (el motor no guarda estado de mesa aparte).
     *
     * Devuelve { seats:[{pos, stack, bet, action, isHero, dealer, sb, bb}],
     *            pot, heroHand, toCall } o null si no hay situación.
     *   action: 'fold' | 'wait' | 'decide' | 'OR' | '3BET' | acción elegida.
     * Las ciegas foldeadas dejan su ciega muerta en el bote (bet se mantiene).
     */
    tableState() {
      const s = sim.situation;
      if (!s) return null;
      const chosen = sim.status === 'feedback' && sim.lastDecision
        ? sim.lastDecision.chosen : null;

      const seats = ORDER.map(pos => ({
        pos,
        stack: STACK_BB,
        bet: 0,
        action: 'wait',
        isHero: pos === s.hero,
        dealer: pos === 'BTN',
        sb: pos === 'SB',
        bb: pos === 'BB'
      }));
      const seat = pos => seats[ORDER.indexOf(pos)];

      // Ciegas posteadas.
      seat('SB').bet = 0.5; seat('SB').stack -= 0.5;
      seat('BB').bet = 1;   seat('BB').stack -= 1;

      const heroIdx = ORDER.indexOf(s.hero);
      // Los asientos que actúan antes del héroe ya foldearon.
      for (let i = 0; i < heroIdx; i++) seats[i].action = 'fold';

      function bet(pos, amount, action) {
        const st = seat(pos);
        st.stack = STACK_BB - amount - 0;
        st.bet = amount;
        st.action = action;
      }

      if (s.stage === 'or') {
        seat(s.hero).action = 'decide';
        if (chosen === 'OR') bet(s.hero, SIZE.OPEN, 'OR');
        else if (chosen === 'FOLD') seat(s.hero).action = 'fold';
      } else {
        // El héroe abrió; entre héroe y villano todos foldean; el villano
        // 3betea; el resto (incluidas las ciegas si no son el villano) folde a.
        bet(s.hero, SIZE.OPEN, 'OR');
        const vIdx = ORDER.indexOf(s.villain);
        const size3 = (s.villain === 'SB' || s.villain === 'BB')
          ? SIZE.THREEBET_BLIND : SIZE.THREEBET;
        for (let i = heroIdx + 1; i < ORDER.length; i++) {
          if (i === vIdx) bet(ORDER[i], size3, '3BET');
          else if (seats[i].action === 'wait') seats[i].action = 'fold';
        }
        seat(s.hero).action = 'decide';
        if (chosen === 'FOLD') seat(s.hero).action = 'fold';
        else if (chosen) {
          const amount = chosen === '4BET' || chosen === '5BETPLUS' || chosen === 'ALLIN'
            ? SIZE.FOURBET : size3;                 // call iguala el 3bet
          bet(s.hero, amount, chosen);
        }

      }

      let pot = 0;
      seats.forEach(st => { pot += st.bet; });      // ciegas muertas incluidas
      const toCall = s.stage === 'vs3bet'
        ? ((s.villain === 'SB' || s.villain === 'BB') ? SIZE.THREEBET_BLIND : SIZE.THREEBET)
        : SIZE.OPEN;

      return { seats, pot: Math.round(pot * 10) / 10, heroHand: s.hand, toCall };
    }
  };

  /**
   * ¿Llega un 3bet tras este open? Frecuencias fijas (baja/media/alta) o
   * 'realista': probabilidad por posición del abridor con dos cortafuegos
   * para que la sesión se sienta natural:
   *   · nunca más de 3 secuencias con 3bet seguidas;
   *   · tras 6 opens sin ningún 3bet, se fuerza uno.
   */
  function shouldThreeBet(cfg, hero) {
    if (cfg.threeBet === 'off') return false;
    if (cfg.threeBet === 'realista') {
      if (sim.streak3bet >= 3) return false;
      if (sim.since3bet >= 6) return true;
      const p = REALISTIC_FREQ[hero] !== undefined ? REALISTIC_FREQ[hero] : 0.3;
      return Math.random() < p;
    }
    return Math.random() < (FREQ[cfg.threeBet] || 0);
  }

  /** Saca la siguiente decisión fija de la cola de repaso. */
  function nextReplay() {
    const item = sim.replayQueue.shift();
    if (!item) {
      sim.status = 'finished';
      sim.situation = null;
      sim.lastDecision = null;
      return;
    }
    if (item.spot === 'OR') {
      sim.situation = {
        hand: item.hand, hero: item.hero, stage: 'or', villain: null, relative: null,
        context: { source: item.source, spot: 'OR', hero: item.hero, relative: null },
        options: ['FOLD', 'OR'],
        premise: 'Repaso · Primera acción: nadie ha entrado al bote.'
      };
    } else {
      // El villano concreto no se guarda en el qid; cualquier villano con la
      // misma relativa produce la misma decisión (mismo rango).
      const villains = validVillains(item.source, item.hero)
        .filter(v => relativeFor(item.hero, v) === item.relative);
      sim.situation = makeDefense(item.hand, item.hero, villains[0] || '—', item.relative, true);
      sim.situation.premise = 'Repaso · ' + sim.situation.premise;
    }
    sim.lastDecision = null;
    sim.status = 'deciding';
  }

})(window.RT);
