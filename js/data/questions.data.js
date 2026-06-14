/* ============================================================================
 * questions.data.js — PREGUNTAS DEL QUIZ QUIRÚRGICO
 * ============================================================================
 * Las preguntas quirúrgicas se generan a partir de PLANTILLAS declarativas.
 * Cada plantilla define un filtro de familia de manos (ver RT.Hands) y un
 * texto. El motor de quiz (quiz-engine.js) expande automáticamente cada
 * plantilla sobre TODOS los contextos y acciones disponibles en los rangos,
 * descartando las combinaciones sin respuesta (preguntas vacías).
 *
 * Esto significa que al añadir un rango nuevo en ranges.data.js, sus
 * preguntas aparecen solas: no hay que escribir nada aquí.
 *
 * CATEGORÍAS
 * Cada plantilla pertenece a una categoría (campo `category`) declarada con
 * RT.defineQuestionCategory. El usuario filtra por categorías en la pantalla
 * de configuración del quiz; una categoría sin contenido no genera botón.
 *
 * Para crear una plantilla nueva basta con añadir RT.defineQuestionTemplate:
 *

 *   RT.defineQuestionTemplate({
 *     id: 'broadways-suited',                          // único
 *     category: 'broadway',                            // ver categorías abajo
 *     level: 1,                                        // 1 básico · 2 medio · 3 avanzado
 *     text: 'broadways suited',                        // se inserta en la frase
 *     filter: { suited: true,
 *               custom: h => 'AKQJT'.includes(h[0]) && 'AKQJT'.includes(h[1]) },
 *     // Campos pedagógicos OPCIONALES (arquitectura preparada, sin rellenar):
 *     // explanation: '...', concept: '...', observations: '...', commonErrors: '...'
 *   });
 *
 * También se pueden añadir preguntas sueltas 100% manuales con
 * RT.defineQuestion (contexto + acción + filtro fijos):
 *
 *   RT.defineQuestion({
 *     id: 'custom-1',
 *     category: 'ax',
 *     text: '¿Qué Ax suited pagamos un 3bet desde UTG fuera de posición?',
 *     context: { spot: 'VS3BET', hero: 'UTG', relative: 'OOP' },
 *     action: 'CALL',
 *     filter: { suited: true, rank: 'A', pair: false }
 *   });
 *
 * Ejemplos completos en README_RANGOS.md.
 * ==========================================================================*/
'use strict';

(function () {

/* --------------------------------------------------------------------------
 * Categorías. El orden define el orden de los botones de configuración.
 * ------------------------------------------------------------------------*/
RT.defineQuestionCategory({ id: 'ax',         label: 'Ax' });
RT.defineQuestionCategory({ id: 'kx',         label: 'Kx' });
RT.defineQuestionCategory({ id: 'qx',         label: 'Qx' });
RT.defineQuestionCategory({ id: 'media-baja', label: 'Jx–2x' });
RT.defineQuestionCategory({ id: 'broadway',   label: 'Broadway' });
RT.defineQuestionCategory({ id: 'pairs',      label: 'Parejas' });
RT.defineQuestionCategory({ id: 'connectors', label: 'Conectores' });
RT.defineQuestionCategory({ id: 'gappers',    label: 'Gappers' });

/** Nivel de dificultad por carta alta: A básico, K/Q medio, resto avanzado. */
function rankLevel(rank) {
  if (rank === 'A') return 1;
  if (rank === 'K' || rank === 'Q') return 2;
  return 3;
}

/** Categoría por carta alta para las plantillas de rango. */
function rankCategory(rank) {
  if (rank === 'A') return 'ax';
  if (rank === 'K') return 'kx';
  if (rank === 'Q') return 'qx';
  return 'media-baja';
}

/* --------------------------------------------------------------------------
 * Plantillas por rango alto: "¿Qué Kx suited...?" (sin conectores ni parejas,
 * réplica de la cobertura del proyecto original).
 * ------------------------------------------------------------------------*/
['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'].forEach(rank => {
  RT.defineQuestionTemplate({
    id: `rank-${rank}-suited`,
    category: rankCategory(rank),
    level: rankLevel(rank),
    text: `${rank}x suited`,
    filter: { suited: true, rank: rank, pair: false, connector: false }
  });
  RT.defineQuestionTemplate({
    id: `rank-${rank}-offsuit`,
    category: rankCategory(rank),
    level: rankLevel(rank),
    text: `${rank}x offsuit`,
    filter: { offsuit: true, rank: rank, pair: false }
  });
});

/* --------------------------------------------------------------------------
 * Familias clásicas.
 * ------------------------------------------------------------------------*/
RT.defineQuestionTemplate({
  id: 'pairs',
  category: 'pairs',
  level: 1,
  text: 'parejas',
  filter: { pair: true }
});

RT.defineQuestionTemplate({
  id: 'suited-connectors',
  category: 'connectors',
  level: 2,
  text: 'conectores suited',
  filter: { suited: true, connector: true }
});

RT.defineQuestionTemplate({
  id: 'broadways-suited',
  category: 'broadway',
  level: 1,
  text: 'broadways suited',
  filter: { suited: true, custom: h => 'AKQJT'.includes(h[0]) && 'AKQJT'.includes(h[1]) }
});

RT.defineQuestionTemplate({
  id: 'broadways-offsuit',
  category: 'broadway',
  level: 2,
  text: 'broadways offsuit',
  filter: { offsuit: true, custom: h => 'AKQJT'.includes(h[0]) && 'AKQJT'.includes(h[1]) }
});

/** Distancia entre las dos cartas de una mano no pareja (1 = conector). */
function handGap(h) {
  const order = 'AKQJT98765432';
  return Math.abs(order.indexOf(h[0]) - order.indexOf(h[1]));
}

RT.defineQuestionTemplate({
  id: 'one-gappers-suited',
  category: 'gappers',
  level: 3,
  text: 'one-gappers suited',
  filter: { suited: true, pair: false, custom: h => handGap(h) === 2 }
});

RT.defineQuestionTemplate({
  id: 'two-gappers-suited',
  category: 'gappers',
  level: 3,
  text: 'two-gappers suited',
  filter: { suited: true, pair: false, custom: h => handGap(h) === 3 }
});

})();
