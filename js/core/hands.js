/* ============================================================================
 * hands.js — UTILIDADES DE MANOS + NAMESPACE GLOBAL (RT)
 * ============================================================================
 * Define el namespace global `RT`, un bus de eventos mínimo y todas las
 * utilidades puras relacionadas con manos de póker:
 *   - Orden de rangos y posiciones.
 *   - Generación de la matriz 13×13.
 *   - Clasificación de manos (pareja / suited / offsuit / conectores...).
 *   - Conteo de combos (pareja=6, suited=4, offsuit=12).
 *   - Filtros componibles usados por el quiz quirúrgico.
 *
 * Este módulo NO toca el DOM y NO conoce los rangos: es 100% reutilizable
 * por quizzes, visualizador y simulador.
 * ==========================================================================*/
'use strict';

/** Namespace global de la aplicación (Range Trainer). */
window.RT = window.RT || {};

(function (RT) {

  /* ------------------------------------------------------------------------
   * Bus de eventos: desacopla motor ↔ interfaz.
   * ----------------------------------------------------------------------*/
  const listeners = Object.create(null);

  RT.on = function (event, handler) {
    (listeners[event] = listeners[event] || []).push(handler);
  };

  RT.emit = function (event, payload) {
    const list = listeners[event];
    if (!list) return;
    for (const fn of list) {
      try { fn(payload); }
      catch (err) { console.error(`[RT] Error en handler de "${event}"`, err); }
    }
  };

  /* ------------------------------------------------------------------------
   * Constantes de dominio.
   * ----------------------------------------------------------------------*/

  /** Rangos de carta de mayor a menor (orden de la matriz). */
  const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

  /** Orden canónico de asientos preflop (6-max). */
  const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  /** Posiciones relativas posibles. */
  const RELATIVES = ['OOP', 'IP'];
  const warnedFilters = new WeakSet();

  /* ------------------------------------------------------------------------
   * Matriz 13×13.
   * ----------------------------------------------------------------------*/

  /**
   * Devuelve la mano canónica de la celda (fila, columna) de la matriz:
   * diagonal = parejas, encima de la diagonal = suited, debajo = offsuit.
   */
  function handAt(row, col) {
    const hi = RANKS[Math.min(row, col)];
    const lo = RANKS[Math.max(row, col)];
    if (row === col) return hi + hi;            // Pareja
    return row < col ? hi + lo + 's' : hi + lo + 'o';
  }

  /** Matriz completa (13 filas × 13 columnas) de etiquetas de mano. */
  const MATRIX = [];
  for (let r = 0; r < 13; r++) {
    const row = [];
    for (let c = 0; c < 13; c++) row.push(handAt(r, c));
    MATRIX.push(row);
  }

  /** Lista plana de las 169 manos canónicas. */
  const ALL_HANDS = MATRIX.flat();

  /* ------------------------------------------------------------------------
   * Clasificación de manos.
   * ----------------------------------------------------------------------*/

  const isPair    = (h) => h.length === 2;
  const isSuited  = (h) => h.length === 3 && h[2] === 's';
  const isOffsuit = (h) => h.length === 3 && h[2] === 'o';

  /** Diferencia de rangos entre las dos cartas (0 para parejas). */
  function rankGap(h) {
    return Math.abs(RANKS.indexOf(h[0]) - RANKS.indexOf(h[1]));
  }

  /**
   * Conector: dos cartas consecutivas, no pareja. AK se excluye por
   * convención del proyecto original (se considera broadway, no conector).
   */
  function isConnector(h) {
    if (isPair(h)) return false;
    if ((h[0] === 'A' && h[1] === 'K') || (h[0] === 'K' && h[1] === 'A')) return false;
    return rankGap(h) === 1;
  }

  /** ¿La mano contiene el rango indicado ('A', 'K', ... '2')? */
  function hasRank(h, rank) {
    return h[0] === rank || h[1] === rank;
  }

  /** Número de combos reales que representa una mano canónica. */
  function comboCount(h) {
    if (isPair(h)) return 6;
    return isSuited(h) ? 4 : 12;
  }

  /**
   * Estadísticas de combos para una lista de manos.
   * @returns {{total:number, hands:number, suited:number, offsuit:number, pairs:number}}
   */
  function comboStats(hands) {
    const stats = { total: 0, hands: hands.length, suited: 0, offsuit: 0, pairs: 0 };
    for (const h of hands) {
      stats.total += comboCount(h);
      if (isPair(h)) stats.pairs++;
      else if (isSuited(h)) stats.suited++;
      else stats.offsuit++;
    }
    return stats;
  }

  /* ------------------------------------------------------------------------
   * Filtros componibles (base del quiz quirúrgico y de los filtros de UI).
   *
   * Un "filtro" es un objeto plano con cualquier combinación de claves:
   *   { pair: true }            → solo parejas
   *   { suited: true }          → solo suited
   *   { offsuit: true }         → solo offsuit
   *   { connector: true }       → solo conectores
   *   { connector: false }      → excluir conectores
   *   { rank: 'K' }             → manos que contienen una K
   *   { ranks: ['A','K'] }      → manos que contienen alguno de esos rangos
   *   { custom: (hand)=>bool }  → condición personalizada
   * Las claves se combinan con AND. Claves ausentes no filtran.
   * ----------------------------------------------------------------------*/

  /** ¿La mano cumple el filtro? */
  function matchesFilter(hand, filter) {
    if (!filter) return true;
    if (!ALL_HANDS.includes(hand) || typeof filter !== 'object') return false;
    if (filter.pair === true && !isPair(hand)) return false;
    if (filter.pair === false && isPair(hand)) return false;
    if (filter.suited === true && !isSuited(hand)) return false;
    if (filter.offsuit === true && !isOffsuit(hand)) return false;
    if (filter.connector === true && !isConnector(hand)) return false;
    if (filter.connector === false && isConnector(hand)) return false;
    if (filter.rank && !hasRank(hand, filter.rank)) return false;
    if (filter.ranks) {
      if (!Array.isArray(filter.ranks) || !filter.ranks.some(r => hasRank(hand, r))) return false;
    }
    if (typeof filter.custom === 'function') {
      try {
        if (!filter.custom(hand)) return false;
      } catch (err) {
        if (!warnedFilters.has(filter)) {
          warnedFilters.add(filter);
          console.error('[RT datos] Filtro de manos inválido; se ignora:', err);
        }
        return false;
      }
    }
    return true;
  }

  /** Aplica un filtro a una lista de manos. */
  function filterHands(hands, filter) {
    return hands.filter(h => matchesFilter(h, filter));
  }

  /* ------------------------------------------------------------------------
   * Exportar API pública.
   * ----------------------------------------------------------------------*/
  RT.Hands = {
    RANKS, POSITIONS, RELATIVES, MATRIX, ALL_HANDS,
    handAt, isPair, isSuited, isOffsuit, isConnector, hasRank,
    comboCount, comboStats, matchesFilter, filterHands
  };

})(window.RT);
