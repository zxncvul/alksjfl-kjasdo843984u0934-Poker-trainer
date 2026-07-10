'use strict';

const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'css', 'styles.css'), 'utf8');
const studyUi = fs.readFileSync(path.join(__dirname, 'study-ui.js'), 'utf8');
let checks = 0;
function contains(fragment, message) {
  checks++;
  if (!css.includes(fragment)) throw new Error(message);
}

function absent(fragment, message) {
  checks++;
  if (css.includes(fragment) || studyUi.includes(fragment)) throw new Error(message);
}

function cssBraceBalance(source) {
  let depth = 0;
  let quote = '';
  let comment = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (comment) {
      if (char === '*' && next === '/') { comment = false; i++; }
      continue;
    }
    if (!quote && char === '/' && next === '*') { comment = true; i++; continue; }
    if (quote) {
      if (char === '\\') { i++; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth < 0) return -1;
  }
  return depth;
}

contains('--cell-gap: 2px', 'Debe existir una separación única de 2px');
contains('--cell-border: 1px', 'Cada lado de celda debe aportar 1px transparente');
contains('--cell-radius: 6px', 'El radio de celda debe ser consistente');
contains('--button-gap: 4px', 'Los botones deben separarse 4px en ambos ejes');
contains('border-radius: 6px !important', 'Los botones deben usar un radio de 6px');
contains('--radius-sm: 6px', 'Los subcontenedores deben usar un radio de 6px');
contains('--radius-xs: 6px', 'Los contenedores pequeños deben usar un radio de 6px');
contains('border: var(--cell-border) solid transparent !important',
  'Los grids deben usar bordes transparentes');
contains('background-clip: padding-box !important',
  'El relleno de una celda no debe invadir su borde');
contains('.gallery-mini-cell', 'La galería debe participar en el contrato visual');
contains('.grid-trainer-cell', 'Grid Trainer debe participar en el contrato visual');
contains('.pot-out-cell', 'Pot Odds debe participar en el contrato visual');
contains('.matrix-action-chip {\n  height: 30px;\n  min-height: 30px',
  'Las acciones deben compartir altura con los campos del formulario');
contains('body.mode-study :where(.viewer-toolbar, .viewer-context-grid, .viewer-active-context)',
  'El panel izquierdo debe eliminar subfondos propios');
contains('body.mode-study .viewer-toolbar .panel-group',
  'La zona izquierda debe compartir la separación de botones');
contains('body.mode-study .viewer-context-grid {\n  gap: 8px',
  'Los campos del panel izquierdo deben quedar separados');
contains('background-color: var(--bg)', 'Los campos deben usar el fondo de la aplicación');
contains('body.mode-study .insights > .dash-panel',
  'El análisis no debe desaparecer en responsive');
contains('grid-template-columns: repeat(12, minmax(0, 1fr))',
  'El formulario debe usar una retícula interna de doce columnas');
contains('.viewer-form-field.span-4',
  'Los campos cortos deben compartir filas en tres columnas');
contains('.viewer-form-field.span-12',
  'Los campos largos deben poder ocupar una fila completa');
contains('height: 30px', 'Los campos del formulario deben mantener altura compacta');
contains('border-radius: 10px',
  'Las tarjetas del formulario deben usar un radio premium sobrio');
contains('min-height: 34px',
  'Guardar rango debe tener mayor jerarquía que los campos');
contains('.viewer-segmented {',
  'Ante, Strad, MW e IP/OOP deben usar controles segmentados');
contains('.viewer-segment-option.is-active',
  'Los segmentos activos deben tener una jerarquía visual clara');
contains('.viewer-form-field.is-disabled',
  'Los campos encadenados deben conservar un estado disabled premium');
contains('background: rgba(255, 255, 255, .018)',
  'Las tarjetas deben usar un fondo neutro y silencioso');
contains('.viewer-form-section {\n  display: grid;',
  'Las tarjetas deben conservar su retícula sin cabecera');
contains('.viewer-form-status-dot.is-dirty',
  'El footer debe diferenciar cambios sin guardar');
contains('background: #5d7793',
  'El azul pizarra debe actuar como acento principal');
checks++;
if (css.includes('.viewer-form-section::before')) {
  throw new Error('Las tarjetas no deben conservar barras laterales de acento');
}
checks++;
if (!css.includes('.viewer-form-section {\n  display: grid;') ||
    !css.includes('background: rgba(255, 255, 255, .018);\n  border: 0;')) {
  throw new Error('Los subcontenedores deben quedar neutros y sin borde');
}
contains('body.mode-study .panel:has(.viewer-form-head)',
  'El panel del editor debe usar espaciado específico compacto');
contains('.mini-spot-replayer',
  'El visualizador debe incluir el mini replayer del spot preflop');
contains('min-height: 262px',
  'El mini replayer debe tener altura suficiente para no quedar aplastado');
contains('width: 98%',
  'La mesa mini debe aprovechar mejor el ancho del bloque');
contains('height: 238px',
  'La mesa mini debe tener altura suficiente');
contains('.mini-table-felt',
  'El mini replayer debe conservar una mesa ovalada compacta');
contains('.mini-chip-commitment',
  'El mini replayer debe representar compromisos con fichas');
contains('.mini-seat-badge.hero',
  'El mini replayer debe marcar Hero con una insignia propia');
contains('.mini-seat-badge.rival',
  'El mini replayer debe marcar Rival con una insignia propia');
contains('.mini-replay-stepper',
  'El mini replayer debe incluir stepper local Anterior/Siguiente');
contains('.mini-replay-stepper {\n  position: absolute;',
  'El stepper debe ir centrado dentro de la mesa mini');
contains('top: 50%;',
  'El stepper del mini replayer debe quedar en el centro vertical de la mesa');
contains('transform: translate(-50%, 6px);',
  'Las monedas superiores deben quedar pegadas al asiento');
contains('transform: translate(-50%, -6px);',
  'Las monedas inferiores deben quedar pegadas al asiento');
contains('transform: translate(7px, -50%);',
  'Las monedas del rail izquierdo deben quedar cerca de su asiento');
contains('transform: translate(-7px, -50%);',
  'Las monedas del rail derecho deben quedar cerca de su asiento');
contains('.mini-chip-commitment.is-or {\n  grid-template-columns: repeat(2, 14px);',
  'OR debe usar dos montones compactos sin aire extra');
contains('.mini-chip-commitment.is-three-bet {\n  grid-template-columns: repeat(2, 14px);\n  grid-template-rows: repeat(2, 17px);',
  '3Bet debe formar triángulo de tres montones');
contains('.mini-chip-commitment.is-four-bet {\n  grid-template-columns: repeat(2, 14px);\n  grid-template-rows: repeat(2, 17px);',
  '4Bet debe formar cuadrado de cuatro montones');
contains('.mini-chip-commitment.is-five-bet {\n  grid-template-columns: repeat(3, 14px);\n  grid-template-rows: repeat(2, 17px);',
  '5Bet debe formar figura compacta de cinco montones');
contains('.mini-chip-commitment.is-jam {\n  display: block;',
  'Jam debe mostrarse como una banda de All In, no como montones de fichas');
contains('.mini-all-in-strip',
  'El mini replayer debe tener estilo propio para la banda ALL IN');
absent('.mini-chip-jam',
  'Jam no debe volver a renderizarse como texto');
absent('roleBox.appendChild(sb)',
  'El mini replayer no debe dibujar marcador extra de SB');
absent('roleBox.appendChild(bb)',
  'El mini replayer no debe dibujar marcador extra de BB');
absent('.mini-blind-badge',
  'El CSS no debe conservar estilos de circulitos SB/BB antiguos');
absent('.mini-seat-action',
  'El mini replayer no debe conservar textos de acción pegados al asiento');
contains('grid-template-columns: repeat(36, minmax(0, 1fr))',
  'Las tres filas deben usar una retícula de 36 columnas');
contains('.matrix-card-grid > .matrix-tool-chip { grid-column: span 2; }',
  'Cada rango A-2 debe ocupar dos columnas');
contains('.matrix-suit-grid > .matrix-tool-chip { grid-column: span 5; }',
  'S y O deben ocupar cinco columnas');
contains('.matrix-family-filters > .matrix-tool-chip { grid-column: span 4; }',
  'Cada familia debe ocupar cuatro columnas');
contains('.matrix-strength-filters > .matrix-tool-chip { grid-column: span 2; }',
  'A M B deben ocupar dos columnas');
contains('.matrix-filter-utilities > .matrix-tool-chip { grid-column: span 3; }',
  'Reset y Vaciar deben ocupar tres columnas');
contains('.matrix-filter-utilities',
  'Reset y Vaciar deben formar un bloque alineado con O');
contains('.matrix-tools-toolbar {', 'Acciones y filtros deben compartir un contenedor');
contains('text-transform: uppercase', 'Los controles deben mostrarse en mayúsculas');
contains('.matrix-tool-chip.is-rank {\n  width: 100%;\n  height: 30px;\n  aspect-ratio: auto',
  'Los rangos A-2 deben igualar la altura del resto de botones');
checks++;
if (cssBraceBalance(css) !== 0) throw new Error('La hoja de estilos tiene llaves desbalanceadas');

console.log(`visual-contract: ${checks} comprobaciones OK`);
