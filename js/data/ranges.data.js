/* ============================================================================
 * ranges.data.js — DEFINICIÓN DECLARATIVA DE RANGOS
 * ============================================================================
 * Este archivo es la ÚNICA fuente de verdad de los rangos de la aplicación.
 * Para añadir, modificar o eliminar rangos NO hace falta tocar ningún otro
 * archivo: el motor (range-engine.js) indexa automáticamente lo que se
 * declare aquí y la interfaz (botones, quizzes, contadores) se adapta sola.
 *
 * Cada llamada a RT.defineRange() registra un rango con:
 *   source   : id de la fuente/autor de los rangos.
 *   spot     : situación preflop ('OR', 'VS3BET', 'VS4BET', ...).
 *   hero     : posición del héroe ('UTG','MP','CO','BTN','SB','BB').
 *   relative : 'IP' | 'OOP' | null (si el spot no distingue posición relativa).
 *   action   : acción que representa el rango ('OR','CALL','FOLD','4BET',...).
 *   hands    : lista de manos en notación estándar ('AKs','AQo','TT', ...).
 *
 * Consulta README_RANGOS.md para ejemplos completos listos para copiar.
 * ==========================================================================*/
'use strict';

/* --------------------------------------------------------------------------
 * Catálogo de fuentes. label se muestra en la interfaz.
 * ------------------------------------------------------------------------*/
RT.defineSource({ id: 'david-diaz', label: 'D. Díaz' });

/* --------------------------------------------------------------------------
 * Catálogo de spots. El orden define el orden de los botones.
 *  - dims indica qué dimensiones necesita el spot para quedar definido.
 *  - description se usa en textos de la interfaz.
 * ------------------------------------------------------------------------*/
RT.defineSpot({ id: 'OR',     label: 'OR',      name: 'Open Raise', dims: ['hero'],             description: 'Rangos de apertura' });
RT.defineSpot({ id: 'VS3BET', label: 'vs 3Bet', name: 'Vs 3Bet',    dims: ['hero', 'relative'], description: 'Defensa tras abrir y recibir 3bet' });

/* --------------------------------------------------------------------------
 * Catálogo de acciones (paleta global). El orden define el orden visual.
 * ------------------------------------------------------------------------*/
RT.defineAction({ id: 'FOLD',     label: 'Fold',  color: '#2b3036' });
RT.defineAction({ id: 'CALL',     label: 'Call',  color: '#3a7a5e' });
RT.defineAction({ id: 'OR',       label: 'OR',    color: '#9b6a35' });
RT.defineAction({ id: '3BET',     label: '3Bet',  color: '#9e4646' });
RT.defineAction({ id: '4BET',     label: '4Bet',  color: '#7e3a4c' });
RT.defineAction({ id: '5BETPLUS', label: '5Bet+', color: '#5f4378' });
RT.defineAction({ id: 'ALLIN',    label: 'All-in',color: '#7c352c' });

/* ==========================================================================
 * RANGOS — fuente: D. Díaz (básicos)
 * ==========================================================================*/

RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'UTG',
  relative: null,
  action: 'OR',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s',
      'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs',
      'JTs', 'T9s', 'J9s', 'K9s', 'Q9s', 'AKo', 'AQo', 'AJo', 'ATo', 'KQo', 'KJo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'MP',
  relative: null,
  action: 'OR',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AKs', 'AQs', 'AJs', 'ATs',
      'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs', 'K9s',
      'K8s', 'K7s', 'K6s', 'QJs', 'QTs', 'Q9s', 'JTs', 'J9s', 'T9s', 'AKo', 'AQo', 'AJo',
      'ATo', 'KQo', 'KJo', 'QJo', 'KTo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'CO',
  relative: null,
  action: 'OR',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AQs', 'AJs',
      'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs',
      'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'QJs', 'QTs', 'Q9s', 'Q8s', 'JTs', 'J9s',
      'J8s', 'T9s', 'T8s', '98s', '97s', '87s', '76s', '65s', '54s', 'AKo', 'AQo', 'AJo',
      'ATo', 'A9o', 'KQo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'BTN',
  relative: null,
  action: 'OR',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs',
      'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs',
      'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'QJs', 'QTs',
      'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'JTs', 'J9s', 'J8s', 'J7s', 'T9s', 'T8s', 'T7s',
      '98s', '97s', '87s', '86s', '76s', '65s', '54s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
      'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o', 'KQo', 'KJo', 'KTo', 'K9o', 'QJo',
      'QTo', 'Q9o', 'JTo', 'J9o', 'T9o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'SB',
  relative: null,
  action: 'OR',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs',
      'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs',
      'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'QJs', 'QTs',
      'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s', 'JTs', 'J9s', 'J8s', 'J7s',
      'J6s', 'J5s', 'J4s', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', '98s', '97s', '96s', '95s',
      '87s', '86s', '85s', '76s', '75s', '74s', '65s', '64s', '54s', 'AKo', 'AQo', 'AJo',
      'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'KQo', 'KJo', 'KTo', 'K9o', 'QJo',
      'QTo', 'Q9o', 'JTo', 'J9o', 'T9o', 'T8o', '98o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'OOP',
  action: 'FOLD',
  hands: [
      '66', 'A9s', 'A8s', 'A7s', 'A6s', 'A2s', 'KJs', 'KTs', 'K9s', 'QTs', 'Q9s', 'J9s', 'T9s',
      'AQo', 'AJo', 'ATo', 'KQo', 'KJo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'OOP',
  action: 'CALL',
  hands: [
      'QQ', 'JJ', 'TT', '99', '88', '77', 'AQs', 'AJs', 'ATs', 'KQs', 'QJs', 'JTs', 'AKo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'OOP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'AKs', 'A5s', 'A4s', 'A3s'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'OOP',
  action: 'FOLD',
  hands: [
      '55', 'A8s', 'A7s', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'QTs', 'Q9s', 'J9s', 'T9s',
      'AJo', 'ATo', 'KQo', 'KJo', 'KTo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'OOP',
  action: 'CALL',
  hands: [
      'JJ', 'TT', '99', '88', '77', '66', 'AQs', 'AJs', 'ATs', 'A9s', 'KQs', 'QJs', 'JTs',
      'AQo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'OOP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'QQ', 'AKs', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'OOP',
  action: 'FOLD',
  hands: [
      '44', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'Q9s', 'Q8s', 'J9s', 'J8s', 'T8s', '97s',
      /* CORRECCIÓN de datos heredados: KQo está en el rango de apertura de CO
       * pero no tenía acción asignada vs 3bet OOP en el proyecto original.
       * Se asigna FOLD (la opción conservadora estándar fuera de posición). */
      '54s', 'KQo', 'KJo', 'QJo', 'ATo', 'KTo', 'QTo', 'JTo', 'A9o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'OOP',
  action: 'CALL',
  /* CORRECCIÓN de datos heredados: el proyecto original tenía J9s duplicada
   * en FOLD y CALL para CO OOP. Se mantiene en FOLD (coherente con CO IP,
   * que también la tira, y con que OOP es siempre más estrecho que IP). */
  hands: [
      'JJ', 'TT', '99', '88', '77', '66', '55', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s',
      'A6s', 'A5s', 'A4s', 'A3s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s',
      '98s', '87s', '76s', '65s', 'AQo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'OOP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'QQ', 'AKs', 'A2s', 'AKo', 'AJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'SB',
  relative: 'OOP',
  action: 'FOLD',
  /* CORRECCIÓN de datos heredados: A3o y A2o aparecían en FOLD vs 3bet desde
   * SB pero no están en el rango de apertura de SB (no se puede recibir un
   * 3bet con una mano que nunca se abrió). Se eliminan de este rango. */
  hands: [
      'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s',
      'Q2s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'T7s', 'T6s', 'T5s', '96s', '95s', '85s',
      '74s', 'KTo', 'K9o', 'QTo', 'Q9o', 'JTo', 'J9o', 'T9o', 'T8o', '98o', 'A8o', 'A7o',
      'A6o', 'A5o', 'A4o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'SB',
  relative: 'OOP',
  action: 'CALL',
  hands: [
      '99', '88', '77', '66', '55', '44', '33', '22', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s',
      'A5s', 'A4s', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'QJs', 'QTs', 'Q9s', 'JTs', 'J9s',
      'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s', 'AQo',
      'AJo', 'KQo', 'KJo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'SB',
  relative: 'OOP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'A3s', 'A2s', 'AKo', 'ATo', 'A9o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'IP',
  action: 'FOLD',
  hands: [
      'A9s', 'A8s', 'A7s', 'A6s', 'KTs', 'K9s', 'QTs', 'Q9s', 'JTs', 'J9s', 'T9s', 'AQo',
      'AJo', 'ATo', 'KQo', 'KJo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'IP',
  action: 'CALL',
  hands: [
      'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', 'AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs',
      'QJs', 'AKo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'UTG',
  relative: 'IP',
  action: '4BET',
  hands: [
      'AA', 'A5s', 'A4s', 'A3s', 'A2s'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'IP',
  action: 'FOLD',
  hands: [
      'A9s', 'A8s', 'A7s', 'K9s', 'K8s', 'K7s', 'K6s', 'Q9s', 'J9s', 'T9s', 'ATo', 'AJo',
      'KQo', 'KJo', 'KTo', 'QJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'IP',
  action: 'CALL',
  hands: [
      'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'KTs',
      'QJs', 'QTs', 'JTs', 'AQo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'IP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'AKs', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'IP',
  action: 'FOLD',
  hands: [
      'A8s', 'A7s', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'Q9s', 'Q8s', 'J9s', 'J8s',
      'T8s', '98s', '97s', '87s', '54s', 'ATo', 'A9o', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'IP',
  action: 'CALL',
  hands: [
      'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'KTs',
      'QJs', 'QTs', 'JTs', 'T9s', '76s', '65s', 'AQo', 'KQo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'CO',
  relative: 'IP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'QQ', 'AKs', 'A9s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'BTN',
  relative: 'IP',
  action: 'FOLD',
  hands: [
      'A8s', 'A7s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
      'J7s', 'T7s', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o', 'KTo', 'K9o', 'QJo',
      'QTo', 'Q9o', 'JTo', 'J9o', 'T9o'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'BTN',
  relative: 'IP',
  action: 'CALL',
  hands: [
      'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AQs', 'AJs', 'ATs', 'KQs',
      'KJs', 'KTs', 'K9s', 'K8s', 'QJs', 'QTs', 'Q9s', 'JTs', 'J9s', 'J8s', 'T9s', 'T8s',
      '98s', '97s', '87s', '86s', '76s', '65s', '54s', 'AQo', 'AJo', 'KQo', 'KJo'
  ]
});

RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'BTN',
  relative: 'IP',
  action: '4BET',
  hands: [
      'AA', 'KK', 'QQ', 'AKs', 'A9s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'ATo', 'A9o'
  ]
});
