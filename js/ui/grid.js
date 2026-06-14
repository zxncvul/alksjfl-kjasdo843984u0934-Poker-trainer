/* ============================================================================
 * grid.js — COMPONENTE DE MATRIZ 13×13
 * ============================================================================
 * Genera y gestiona la matriz de manos. Es un componente "tonto":
 *   - render(viewModel) pinta el estado que le pasen.
 *   - Notifica interacciones del usuario mediante un callback onHandToggle.
 *   - Soporta pintado por arrastre (ratón y táctil) con Pointer Events.
 *
 * El viewModel que recibe render() es:
 * {
 *   interactive : bool                       — ¿se puede clicar/pintar?
 *   colors      : { mano → color CSS }       — relleno por mano (o vacío)
 *   selected    : Set<mano>                  — selección binaria (quiz B)
 *   dimmed      : Set<mano> | null           — manos atenuadas por filtros
 *   marks       : { mano → 'ok'|'extra'|'missing'|'wrong' } — revisión
 *   showLabels  : bool                       — mostrar texto de la mano
 * }
 * ==========================================================================*/
'use strict';

(function (RT) {

  const cells = Object.create(null); // mano → elemento celda
  let container = null;
  let onHandToggle = null;           // callback (mano) => void
  let interactive = false;

  /* ------------------------------------------------------------------------
   * Construcción inicial del DOM (una sola vez).
   * ----------------------------------------------------------------------*/
  function init(rootEl, handleToggle) {
    container = rootEl;
    onHandToggle = handleToggle;
    container.innerHTML = '';
    container.setAttribute('role', 'grid');
    container.setAttribute('aria-label', 'Matriz de manos 13 por 13');

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const hand = RT.Hands.MATRIX[r][c];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.hand = hand;
        const label = document.createElement('span');
        label.className = 'cell-label';
        label.textContent = hand;
        const metric = document.createElement('span');
        metric.className = 'cell-metric';
        cell.appendChild(label);
        cell.appendChild(metric);
        cell.setAttribute('aria-label', hand);
        if (hand.length === 2) cell.classList.add('cell-pair');
        container.appendChild(cell);
        cells[hand] = cell;
      }
    }
    wirePointerEvents();
  }

  /* ------------------------------------------------------------------------
   * Pintado por arrastre.
   *
   * Cada gesto (pointerdown → pointermove → pointerup) alterna como máximo
   * una vez cada mano: se puede "barrer" una zona sin parpadeos. En táctil
   * se usa elementFromPoint porque los eventos quedan capturados por la
   * celda inicial.
   * ----------------------------------------------------------------------*/
  function wirePointerEvents() {
    let dragging = false;
    let touchedThisGesture = null;

    function handFromEvent(ev) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cell = el && el.closest ? el.closest('.cell') : null;
      return cell ? cell.dataset.hand : null;
    }

    function applyToggle(hand) {
      if (!hand || !interactive || !onHandToggle) return;
      if (touchedThisGesture.has(hand)) return;
      touchedThisGesture.add(hand);
      onHandToggle(hand);
    }

    container.addEventListener('pointerdown', (ev) => {
      if (!interactive) return;
      dragging = true;
      touchedThisGesture = new Set();
      container.classList.add('grid-dragging');
      applyToggle(handFromEvent(ev));
      ev.preventDefault(); // Evita scroll/selección de texto durante el gesto.
    });

    container.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      applyToggle(handFromEvent(ev));
      ev.preventDefault();
    });

    function endGesture() {
      dragging = false;
      container.classList.remove('grid-dragging');
    }
    window.addEventListener('pointerup', endGesture);
    window.addEventListener('pointercancel', endGesture);
  }

  /* ------------------------------------------------------------------------
   * Actualización rápida de UNA celda (ruta caliente del pintado).
   *
   * Durante el pintado/selección de un quiz solo cambia una mano por evento:
   * tocar las 169 celdas en cada pointermove provoca jank en móvil. Esta
   * función aplica el cambio mínimo. Solo es válida en estado "running"
   * (sin marcas ni atenuados); los cambios de estado usan render() completo.
   * ----------------------------------------------------------------------*/
  function updateHand(hand, patch) {
    const cell = cells[hand];
    if (!cell) return;
    if ('color' in patch) {
      if (patch.color) {
        cell.style.setProperty('--cell-color', patch.color);
        cell.classList.add('cell-filled');
      } else {
        cell.style.removeProperty('--cell-color');
        cell.classList.remove('cell-filled');
      }
    }
    if ('selected' in patch) {
      cell.classList.toggle('cell-selected', !!patch.selected);
    }
  }

  /* ------------------------------------------------------------------------
   * Render.
   * ----------------------------------------------------------------------*/
  function render(vm) {
    interactive = !!vm.interactive;
    container.classList.toggle('grid-interactive', interactive);
    container.classList.toggle('grid-hide-labels', vm.showLabels === false);
    container.classList.toggle('grid-neutral', !!vm.neutralMessage);
    if (vm.neutralMessage) container.dataset.neutralMessage = vm.neutralMessage;
    else delete container.dataset.neutralMessage;

    const colors = vm.colors || Object.create(null);
    const selected = vm.selected || null;
    const dimmed = vm.dimmed || null;
    const marks = vm.marks || null;
    const metrics = vm.metrics || null;

    for (const hand of RT.Hands.ALL_HANDS) {
      const cell = cells[hand];
      const color = colors[hand] || '';

      // Relleno por acción.
      if (color) {
        cell.style.setProperty('--cell-color', color);
        cell.classList.add('cell-filled');
      } else {
        cell.style.removeProperty('--cell-color');
        cell.classList.remove('cell-filled');
      }

      // Selección binaria (quiz quirúrgico).
      cell.classList.toggle('cell-selected', !!selected && selected.has(hand));

      // Atenuado por filtros.
      cell.classList.toggle('cell-dimmed', !!dimmed && dimmed.has(hand));

      // Marcas de revisión.
      cell.classList.remove('mark-ok', 'mark-extra', 'mark-missing', 'mark-wrong');
      if (marks && marks[hand]) cell.classList.add('mark-' + marks[hand]);

      const metricNode = cell.querySelector('.cell-metric');
      const performance = metrics && metrics[hand];
      if (performance && performance.attempts) {
        metricNode.textContent =
          `${performance.pct === null ? '—' : performance.pct + '%'} · ${performance.attempts}`;
        cell.title = `${hand} · ${performance.pct === null ? 'sin porcentaje' : performance.pct + '%'} · ` +
          `${performance.attempts} intento${performance.attempts === 1 ? '' : 's'}`;
      } else {
        metricNode.textContent = '';
        cell.removeAttribute('title');
      }
    }
  }

  RT.Grid = { init, render, updateHand };

})(window.RT);
