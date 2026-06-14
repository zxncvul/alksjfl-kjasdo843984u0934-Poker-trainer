/* ============================================================================
 * stats.js — MOTOR DE PROGRESO Y ESTADÍSTICAS (sin DOM)
 * ============================================================================
 * Registra cada respuesta de los quizzes y mantiene agregados persistentes:
 *
 *   · Totales y porcentaje global.
 *   · Desglose por posición, acción, spot y categoría.
 *   · Calor por mano (fallos y aciertos): alimenta el heatmap de la matriz.
 *   · Índice de preguntas falladas (recientes / frecuentes) para el sistema
 *     de repaso dirigido.
 *
 * PERSISTENCIA: localStorage (clave versionada). Si localStorage no está
 * disponible (modo privado, etc.) el motor funciona igual en memoria.
 *
 * El motor no toca el DOM ni conoce la UI: la UI llama a record() cuando un
 * quiz comprueba una respuesta y lee los agregados para pintarlos.
 * ==========================================================================*/
'use strict';

(function (RT) {

  const STORE_KEY = 'rt:stats:v1';
  const LEGACY_STORE_KEYS = ['rt:stats'];
  const HISTORY_LIMIT = 300;   // fallos recientes conservados con detalle

  /** Estado vacío. */
  function emptyState() {
    return {
      totals: { ok: 0, fail: 0 },
      byPosition: Object.create(null),   // hero    → {ok, fail}
      byAction:   Object.create(null),   // acción  → {ok, fail}
      bySpot:     Object.create(null),   // spot    → {ok, fail}
      byCategory: Object.create(null),   // cat     → {ok, fail}
      handFails:  Object.create(null),   // mano    → nº de veces implicada en un fallo
      handOks:    Object.create(null),   // mano    → nº de veces respondida bien
      failedIndex: Object.create(null),  // qid → {count, last, spot, hero, relative, action, category}
      failHistory: []   // [{qid, ts}] cronológico (recientes al final)
    };
  }

  let state = emptyState();

  /* ----------------------------- Persistencia --------------------------- */

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  /**
   * Sanea datos cargados: cualquier campo ausente, con tipo equivocado o
   * corrupto se sustituye por su valor vacío. Un localStorage roto degrada
   * a estadísticas parciales, nunca rompe la aplicación.
   */
  function sanitize(raw) {
    const clean = emptyState();
    if (!raw || typeof raw !== 'object') return clean;
    const num = v => (typeof v === 'number' && isFinite(v) && v >= 0
      ? Math.min(Math.floor(v), Number.MAX_SAFE_INTEGER) : 0);
    const text = v => (typeof v === 'string' && v.length <= 200 ? v : null);
    if (raw.totals && typeof raw.totals === 'object') {
      clean.totals.ok = num(raw.totals.ok);
      clean.totals.fail = num(raw.totals.fail);
    }
    for (const mapKey of ['byPosition', 'byAction', 'bySpot', 'byCategory']) {
      const src = raw[mapKey];
      if (src && typeof src === 'object') {
        for (const k of Object.keys(src)) {
          if (src[k] && typeof src[k] === 'object') {
            const entry = {
              ok: Math.min(num(src[k].ok), clean.totals.ok),
              fail: Math.min(num(src[k].fail), clean.totals.fail)
            };
            if (entry.ok || entry.fail) clean[mapKey][k] = entry;
          }
        }
      }
    }
    for (const mapKey of ['handFails', 'handOks']) {
      const src = raw[mapKey];
      if (src && typeof src === 'object') {
        for (const k of Object.keys(src)) {
          const count = num(src[k]);
          if (count > 0 && RT.Hands.ALL_HANDS.includes(k)) clean[mapKey][k] = count;
        }
      }
    }
    if (raw.failedIndex && typeof raw.failedIndex === 'object') {
      for (const qid of Object.keys(raw.failedIndex)) {
        const e = raw.failedIndex[qid];
        const count = e && typeof e === 'object'
          ? Math.min(num(e.count), clean.totals.fail) : 0;
        if (typeof qid === 'string' && qid.length <= 300 &&
            e && typeof e === 'object' && count > 0) {
          clean.failedIndex[qid] = {
            count, last: num(e.last),
            spot: text(e.spot), hero: text(e.hero),
            relative: text(e.relative), action: text(e.action),
            category: text(e.category)
          };
        }
      }
    }
    if (Array.isArray(raw.failHistory)) {
      clean.failHistory = raw.failHistory
        .filter(e => e && typeof e === 'object' && typeof e.qid === 'string' &&
          e.qid.length <= 300 && num(e.ts) > 0)
        .map(e => ({ qid: e.qid, ts: num(e.ts) }))
        .slice(-HISTORY_LIMIT);
    }
    return clean;
  }

  function load() {
    const ls = storage();
    if (!ls) return;
    try {
      let raw = ls.getItem(STORE_KEY);
      if (!raw) {
        for (const legacyKey of LEGACY_STORE_KEYS) {
          raw = ls.getItem(legacyKey);
          if (raw) break;
        }
      }
      if (raw) {
        state = sanitize(JSON.parse(raw));
        save();
      }
    } catch (err) {
      console.warn('[RT.Stats] Progreso guardado ilegible; se parte de cero:', err);
      state = emptyState();
      save();
    }
  }

  function save() {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (err) { console.warn('[RT.Stats] No se pudo guardar el progreso:', err); }
  }

  /* ------------------------------- Registro ----------------------------- */

  function bump(map, key, field) {
    if (!key) return;
    const e = map[key] || (map[key] = { ok: 0, fail: 0 });
    e[field]++;
  }

  /**
   * Registra el resultado de UNA pregunta/ejercicio comprobado.
   *
   * @param {object} entry
   *   qid       : id estable de la pregunta/ejercicio
   *   perfect   : bool — respuesta perfecta
   *   spot/hero/relative/action/category : dimensiones (las que apliquen)
   *   okHands   : manos respondidas correctamente
   *   failHands : manos implicadas en el fallo (faltantes/sobrantes/acción mal)
   */
  function record(entry) {
    if (!entry || typeof entry !== 'object') return;
    const field = entry.perfect ? 'ok' : 'fail';
    state.totals[field]++;
    bump(state.byPosition, entry.hero, field);
    bump(state.byAction, entry.action, field);
    bump(state.bySpot, entry.spot, field);
    bump(state.byCategory, entry.category, field);

    (Array.isArray(entry.okHands) ? entry.okHands : []).filter(h => RT.Hands.ALL_HANDS.includes(h))
      .forEach(h => { state.handOks[h] = (state.handOks[h] || 0) + 1; });
    (Array.isArray(entry.failHands) ? entry.failHands : []).filter(h => RT.Hands.ALL_HANDS.includes(h))
      .forEach(h => { state.handFails[h] = (state.handFails[h] || 0) + 1; });

    const qid = typeof entry.qid === 'string' && entry.qid.length <= 300
      ? entry.qid : null;
    if (!entry.perfect && qid) {
      const e = state.failedIndex[qid] || (state.failedIndex[qid] = {
        count: 0, last: 0,
        spot: entry.spot, hero: entry.hero, relative: entry.relative || null,
        action: entry.action || null, category: entry.category || null
      });
      e.count++;
      e.last = Date.now();
      state.failHistory.push({ qid, ts: e.last });
      if (state.failHistory.length > HISTORY_LIMIT) {
        state.failHistory.splice(0, state.failHistory.length - HISTORY_LIMIT);
      }
    } else if (entry.perfect && qid && state.failedIndex[qid]) {
      // Acertarla resta una "deuda": al llegar a 0 sale del índice de repaso.
      const e = state.failedIndex[qid];
      e.count--;
      if (e.count <= 0) delete state.failedIndex[qid];
    }

    save();
    RT.emit('stats:changed');
  }

  /* ------------------------------- Consultas ---------------------------- */

  function pct(e) { const t = e.ok + e.fail; return t ? Math.round((e.ok / t) * 100) : null; }

  /** Resumen completo para el panel de estadísticas. */
  function getSummary() {
    function table(map) {
      return Object.keys(map).map(key => ({
        key, ok: map[key].ok, fail: map[key].fail, pct: pct(map[key])
      })).sort((a, b) => (b.ok + b.fail) - (a.ok + a.fail));
    }
    function best(rows, min) {
      const elig = rows.filter(r => r.ok + r.fail >= (min || 3) && r.pct !== null);
      if (!elig.length) return { best: null, worst: null };
      const sorted = elig.slice().sort((a, b) => b.pct - a.pct);
      return { best: sorted[0], worst: sorted[sorted.length - 1] };
    }
    const byCategory = table(state.byCategory);
    const bySpot = table(state.bySpot);
    return {
      totals: { ok: state.totals.ok, fail: state.totals.fail, pct: pct(state.totals) },
      byPosition: table(state.byPosition),
      byAction: table(state.byAction),
      bySpot, byCategory,
      categoryEdge: best(byCategory),
      spotEdge: best(bySpot),
      answered: state.totals.ok + state.totals.fail
    };
  }

  /**
   * Calor por mano para el heatmap.
   * mode 'fails'   → intensidad por nº de fallos.
   * mode 'mastery' → intensidad por nº de aciertos (manos sin fallos).
   * Devuelve { hand: valor 0..1 } normalizado al máximo observado.
   */
  function getHandHeat(mode) {
    const src = mode === 'mastery' ? state.handOks : state.handFails;
    const out = Object.create(null);
    let max = 0;
    for (const h of Object.keys(src)) {
      let v = src[h];
      if (mode === 'mastery' && state.handFails[h]) {
        v = Math.max(0, v - state.handFails[h] * 2); // dominada = bien y sin tropiezos
      }
      if (v > 0) { out[h] = v; if (v > max) max = v; }
    }
    if (max > 0) for (const h of Object.keys(out)) out[h] = out[h] / max;
    return out;
  }

  /** Métricas persistentes por mano para heatmaps y reparto adaptativo. */
  function getHandPerformance(hand) {
    if (!RT.Hands.ALL_HANDS.includes(hand)) {
      return { ok: 0, fail: 0, attempts: 0, pct: null, weight: 1 };
    }
    const ok = state.handOks[hand] || 0;
    const fail = state.handFails[hand] || 0;
    const attempts = ok + fail;
    const accuracy = attempts ? ok / attempts : null;
    return {
      ok,
      fail,
      attempts,
      pct: accuracy === null ? null : Math.round(accuracy * 100),
      // El peso crece con errores repetidos y baja precisión, con límite para
      // que el reparto siga siendo variado.
      weight: attempts
        ? Math.min(5, 1 + fail * 0.35 + (1 - accuracy) * 2)
        : 1
    };
  }

  function getHandPerformanceMap() {
    const out = Object.create(null);
    RT.Hands.ALL_HANDS.forEach(hand => {
      const metrics = getHandPerformance(hand);
      if (metrics.attempts) out[hand] = metrics;
    });
    return out;
  }

  /**
   * Ids de preguntas falladas para el repaso dirigido.
   * filters: { mode: 'recent'|'frequent', hero?, action?, spot? }
   */
  function getFailedIds(filters) {
    const f = filters || {};
    let entries = Object.keys(state.failedIndex).map(qid =>
      Object.assign({ qid }, state.failedIndex[qid]));
    if (f.hero)   entries = entries.filter(e => e.hero === f.hero);
    if (f.action) entries = entries.filter(e => e.action === f.action);
    if (f.spot)   entries = entries.filter(e => e.spot === f.spot);
    if (f.mode === 'frequent') {
      entries.sort((a, b) => b.count - a.count);
    } else {
      entries.sort((a, b) => b.last - a.last); // recientes primero
    }
    return entries.map(e => e.qid);
  }

  /** Dimensiones presentes en el índice de falladas (para botones condicionales). */
  function getFailedDims(filters) {
    const prefixes = filters && Array.isArray(filters.excludePrefixes)
      ? filters.excludePrefixes : [];
    const heroes = new Set(), actions = new Set();
    for (const qid of Object.keys(state.failedIndex)) {
      if (prefixes.some(prefix => qid.startsWith(prefix))) continue;
      const e = state.failedIndex[qid];
      if (e.hero) heroes.add(e.hero);
      if (e.action) actions.add(e.action);
    }
    return { heroes: Array.from(heroes), actions: Array.from(actions) };
  }

  /* --------------------------- Exportar / resetear ----------------------- */

  function exportJSON() { return JSON.stringify({ version: 1, stats: state }, null, 2); }

  function importJSON(text) {
    const data = JSON.parse(text); // que lance si es inválido: la UI lo captura
    if (!data || typeof data !== 'object' || !data.stats) {
      throw new Error('Formato de progreso no reconocido');
    }
    state = sanitize(data.stats);
    save();
    RT.emit('stats:changed');
  }

  function reset() {
    state = emptyState();
    save();
    RT.emit('stats:changed');
  }

  load();

  RT.Stats = {
    record, getSummary, getHandHeat, getHandPerformance, getHandPerformanceMap,
    getFailedIds, getFailedDims,
    exportJSON, importJSON, reset,
    get hasData() { return state.totals.ok + state.totals.fail > 0; }
  };

})(window.RT);
