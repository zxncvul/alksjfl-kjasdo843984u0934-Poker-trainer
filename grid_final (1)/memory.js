/* ============================================================================
   memory.js — Módulo de ejercicios de memoria visual sobre el grid.

   Responsabilidad:
     - Estado del modo Memory (configuración + ejecución de rondas).
     - Generación de rondas (no-secuencial y secuencial fwd/bwd/combinada).
     - Validación de respuestas del usuario.
     - API pública mínima consumida por script.js:
         window.memoryState          → estado observable (solo lectura externa)
         window.applyMemoryState()   → re-render de la UI de Memory
         window.startMemorySequence()→ arranca el bucle de rondas
         window.memoryPause()        → pausa (termina la ronda en curso)
         window.memoryStop()         → detiene y limpia todo
         window.memoryGetPool()      → pool de celdas según área activa
         window.memoryClearVisuals() → limpia estilos inline al salir del modo
         window.refreshMemoryLabelStyles() → re-estiliza etiquetas según el Ojo

   Integración futura:
     Todo el estado vive en el objeto `state` (cerrado en este closure) y la
     comunicación con el exterior se hace solo a través de la API anterior.
     Para integrarlo como módulo independiente basta con envolver este archivo
     en un factory que reciba { gridTable, quizTarget, controls } en lugar de
     resolverlos por id.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // Referencias DOM (todas opcionales: el módulo no debe romper si falta algo)
  // ──────────────────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const gridTable  = $('range-table');
  const quizTarget = $('quiz-target');

  // Sin grid no hay módulo: salida silenciosa y segura.
  if (!gridTable) {
    console.warn('[memory] #range-table no encontrado; módulo Memory desactivado.');
    return;
  }

  const btnSeq        = $('mem-seq-btn');
  const btnFwd        = $('mem-order-fwd');
  const btnBwd        = $('mem-order-bwd');
  const colorBtns     = Array.from(document.querySelectorAll('.color-selector .control-btn[data-color]'));

  const speedMinus    = $('speed-down');
  const speedPlus     = $('speed-up');
  const speedDisplay  = $('speed-display');

  const countDisplayEl = $('count-display');
  const areaDisplayEl  = $('area-display');
  const countDownBtn   = $('count-down');
  const countUpBtn     = $('count-up');
  const areaDownBtn    = $('area-down');
  const areaUpBtn      = $('area-up');

  // ──────────────────────────────────────────────────────────────────────────
  // Constantes de configuración
  // ──────────────────────────────────────────────────────────────────────────
  const LAST_CLICK_LINGER = 220;  // ms que se mantiene visible el último click
  const FADE_MS           = 260;  // ms del fade-out entre rondas
  const INTER_ROUND_MS    = 250;  // pausa entre rondas
  const SHOW_STEP_GAP_MS  = 120;  // pausa extra entre pasos del reveal secuencial

  const SPEED_MIN = 1;
  const SPEED_MAX = 21;
  const COUNT_MIN = 1;
  const COUNT_MAX = 50;

  const MEM_TEXT_COLORS = { red: '#c00', green: '#28a745', blue: '#0d6efd', yellow: '#ffc107' };
  const MEM_BG_COLORS   = {
    red:    'rgba(255, 80, 80, 0.9)',
    green:  'rgba(80, 255, 120, 0.9)',
    blue:   'rgba(80, 150, 255, 0.9)',
    yellow: 'rgba(255, 220, 100, 0.9)'
  };

  // Valores posibles del área: radios 1..6 alrededor del centro, o 'M' (manual)
  const AREA_VALUES = ['1', '2', '3', '4', '5', '6', 'M'];

  // Refuerzo CSS para las etiquetas de celda (no toca style.css)
  const memStyle = document.createElement('style');
  memStyle.textContent = 'td .mem-cell{ z-index:5; pointer-events:none; position:absolute; }';
  document.head.appendChild(memStyle);

  // ──────────────────────────────────────────────────────────────────────────
  // Estado del módulo
  //   `loopGen` es un token de generación: cada start incrementa el contador y
  //   cualquier bucle antiguo que despierte con un token distinto se aborta.
  //   Esto elimina la condición de carrera de "doble loop" tras pause→play o
  //   stop→play en mitad de una ronda.
  // ──────────────────────────────────────────────────────────────────────────
  const state = {
    active: false,          // bucle de rondas en ejecución
    seqMode: false,         // true = ejercicios secuenciales (orden importa)
    pendingSeqMode: undefined, // cambio de modo aplazado al fin de ronda
    speed: 5,               // 1..21 → tiempo de exposición (pulseTime)
    orderFwd: false,        // secuencia directa (→)
    orderBwd: false,        // secuencia inversa (←)
    colors: ['green'],      // colores activos en modo no-secuencial
    count: 1,               // nº de celdas por ronda
    area: '6',              // '1'..'6' o 'M'
    manualPool: [],         // celdas elegidas a mano cuando area === 'M'
    manualMode: false,      // espejo de (area === 'M')
    inQuiz: false,          // esperando respuesta del usuario
    roundSeq: [],           // secuencia esperada (sec) o conjunto target (no-sec)
    currentTarget: null,    // color objetivo en modo no-secuencial
    roundResolve: null      // resolver de la promesa de la ronda en curso
  };
  window.memoryState = state;

  let loopGen = 0; // token de generación del bucle

  // Matriz de celdas del grid
  const rows    = Array.from(gridTable.querySelectorAll('tbody tr'));
  const matrix  = rows.map(r => Array.from(r.querySelectorAll('td[data-label]')));
  const cells   = matrix.flat();
  const numRows = matrix.length;
  const numCols = numRows ? matrix[0].length : 0;

  if (!cells.length) {
    console.warn('[memory] grid vacío; módulo Memory desactivado.');
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilidades
  // ──────────────────────────────────────────────────────────────────────────
  const delay = ms => new Promise(res => setTimeout(res, ms));

  /** Fisher-Yates: copia barajada sin mutar el original. */
  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** Tiempo de exposición por paso: lineal 250ms (speed 1) → 10s (speed 21). */
  const pulseTime = () => {
    const s = Math.min(SPEED_MAX, Math.max(SPEED_MIN, state.speed | 0));
    if (s === 1) return 250;
    return 500 * (s - 1); // 2→500, 3→1000, ... 21→10000 (idéntico a la tabla original)
  };

  /** ¿Está activo el Ojo de Memory? (clase gestionada por script.js) */
  const isEyeOn = () => document.body.classList.contains('memory-eye-on');

  /** Asegura <span class="num"> dentro de un display sin tocar su SVG. */
  function ensureNumSpan(container, def) {
    if (!container) return null;
    let span = container.querySelector('.num');
    if (span) return span;
    Array.from(container.childNodes).forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) container.removeChild(n);
    });
    span = document.createElement('span');
    span.className = 'num';
    span.textContent = def;
    container.insertBefore(span, container.firstElementChild);
    return span;
  }
  const countNumEl = ensureNumSpan(countDisplayEl, '01');
  const areaNumEl  = ensureNumSpan(areaDisplayEl, '06');

  // ──────────────────────────────────────────────────────────────────────────
  // Etiquetas visuales en celdas
  // ──────────────────────────────────────────────────────────────────────────

  /** Aplica el estilo correspondiente (normal u "ojo activo") a una etiqueta. */
  function styleMemLabel(span, color) {
    if (isEyeOn()) {
      // Con el ojo activo las etiquetas llevan fondo de color para ser legibles
      span.style.color = '#000';
      span.style.backgroundColor = MEM_BG_COLORS[color] || 'rgba(200,200,200,0.9)';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
    } else {
      span.style.color = MEM_TEXT_COLORS[color] || '#e6f1ea';
      span.style.backgroundColor = '';
      span.style.padding = '';
      span.style.borderRadius = '';
    }
  }

  /** Pinta (o repinta) la etiqueta de memoria de una celda con un color dado. */
  function addMemLabel(td, color) {
    if (!td) return;
    const cs = getComputedStyle(td);
    if (cs.position === 'static') td.style.position = 'relative';
    if (cs.overflow === 'hidden') td.style.overflow = 'visible';

    let span = td.querySelector('.mem-cell');
    if (!span) {
      span = document.createElement('span');
      span.className = 'mem-cell';
      span.textContent = td.getAttribute('data-label') || '';
      span.style.top = '50%';
      span.style.left = '50%';
      span.style.transform = 'translate(-50%, -50%)';
      span.style.userSelect = 'none';
      span.style.fontSize = '14px';
      span.style.fontFamily = "'JetBrains Mono', monospace";
      span.style.fontWeight = '600';
      span.style.letterSpacing = '0.5px';
      span.style.textShadow = '0 0 2px rgba(0,0,0,0.6)';
      td.appendChild(span);
    }
    span.dataset.memColor = color;
    styleMemLabel(span, color);
  }

  /** Re-estiliza todas las etiquetas visibles (lo llama script.js al togglear el Ojo). */
  window.refreshMemoryLabelStyles = function () {
    gridTable.querySelectorAll('.mem-cell').forEach(span => {
      styleMemLabel(span, span.dataset.memColor || 'green');
    });
  };

  function removeAllMemLabels() {
    gridTable.querySelectorAll('.mem-cell').forEach(s => s.remove());
  }

  /** Limpia etiquetas y restos visuales; re-aplica contorno de edición manual. */
  function clearHighlights() {
    removeAllMemLabels();
    cells.forEach(td => {
      td.style.boxShadow = '';
      td.style.color = '';
    });
    if ((state.manualMode || state.area === 'M') && !state.active && !state.inQuiz) {
      applyAreaHighlight();
      window.refreshMemoryEyeMask?.();
    }
  }

  /** Fade-out suave de todas las marcas antes de la siguiente ronda. */
  async function fadeOutHighlights(ms = FADE_MS) {
    const spans = Array.from(gridTable.querySelectorAll('.mem-cell'));
    const hasAny = spans.length > 0 || (quizTarget && quizTarget.textContent);
    if (!hasAny) return;
    spans.forEach(s => {
      s.style.transition = `opacity ${ms}ms ease`;
      s.style.opacity = '0';
    });
    if (quizTarget) {
      quizTarget.style.transition = `opacity ${ms}ms ease`;
      quizTarget.style.opacity = '0';
    }
    await delay(ms);
    if (quizTarget) {
      quizTarget.style.transition = '';
      quizTarget.style.opacity = '';
    }
    clearHighlights();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Pool y área
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Devuelve el pool de celdas jugables según el área:
   *  - 'M': las celdas marcadas manualmente.
   *  - '1'..'6': cuadrado centrado de lado (2a+1), recortado al grid.
   */
  window.memoryGetPool = function getPool() {
    if (state.manualMode || state.area === 'M') return state.manualPool.slice();
    const a  = Math.max(1, Math.min(6, +state.area || 6));
    const sz = a * 2 + 1;
    const r0 = Math.max(0, Math.floor((numRows - sz) / 2));
    const c0 = Math.max(0, Math.floor((numCols - sz) / 2));
    const r1 = Math.min(numRows, r0 + sz);
    const c1 = Math.min(numCols, c0 + sz);
    const pool = [];
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (matrix[r] && matrix[r][c]) pool.push(matrix[r][c]);
      }
    }
    return pool;
  };

  /** Dibuja el contorno del área activa (o las celdas manuales) con estilos inline. */
  function applyAreaHighlight() {
    const inside  = '#28a745';
    const outside = '#0f2711';
    cells.forEach(td => {
      td.style.backgroundColor = 'black';
      td.style.border = `1px solid ${outside}`;
      td.style.outline = 'none';
    });
    if (state.manualMode || state.area === 'M') {
      state.manualPool.forEach(td => {
        td.style.outline = `1px solid ${inside}`;
        td.style.border = `1px solid ${inside}`;
      });
      return;
    }
    const a  = Math.max(1, Math.min(6, +state.area || 6));
    const sz = a * 2 + 1;
    const r0 = Math.max(0, Math.floor((numRows - sz) / 2));
    const c0 = Math.max(0, Math.floor((numCols - sz) / 2));
    const r1 = Math.min(numRows - 1, r0 + sz - 1);
    const c1 = Math.min(numCols - 1, c0 + sz - 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const td = matrix[r] && matrix[r][c];
        if (!td) continue;
        if (r > r0) td.style.borderTop = `1px solid ${inside}`;
        if (r < r1) td.style.borderBottom = `1px solid ${inside}`;
        if (c > c0) td.style.borderLeft = `1px solid ${inside}`;
        if (c < c1) td.style.borderRight = `1px solid ${inside}`;
      }
    }
  }

  /**
   * Restaura los estilos inline aplicados por Memory en todas las celdas.
   * script.js lo invoca al salir del modo para que Script Mode recupere
   * su aspecto original (antes los bordes/fondos inline se quedaban pegados).
   */
  window.memoryClearVisuals = function () {
    removeAllMemLabels();
    cells.forEach(td => {
      td.style.backgroundColor = '';
      td.style.border = '';
      td.style.borderTop = '';
      td.style.borderBottom = '';
      td.style.borderLeft = '';
      td.style.borderRight = '';
      td.style.outline = '';
      td.style.boxShadow = '';
      td.style.color = '';
      td.style.position = '';
      td.style.overflow = '';
    });
    if (quizTarget) {
      quizTarget.style.backgroundColor = '';
      quizTarget.style.color = '';
      quizTarget.textContent = '–';
      delete quizTarget.dataset.color;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // UI: reflejar estado en pantalla
  // ──────────────────────────────────────────────────────────────────────────
  function applyState() {
    if (window.memoryModeActive && speedDisplay) {
      speedDisplay.textContent = String(state.speed).padStart(2, '0') + 'x';
    }
    if (countNumEl) countNumEl.textContent = String(state.count).padStart(2, '0');
    if (areaNumEl)  areaNumEl.textContent  = state.area === 'M' ? ' M' : String(state.area).padStart(2, '0');

    btnSeq?.classList.toggle('active', state.seqMode);

    // Las flechas solo aplican en modo secuencial; la única activa queda
    // bloqueada para garantizar que siempre haya al menos un orden.
    const disableOrder = !state.seqMode;
    const lockFwd = state.seqMode && state.orderFwd && !state.orderBwd;
    const lockBwd = state.seqMode && state.orderBwd && !state.orderFwd;
    if (btnFwd) {
      btnFwd.disabled = disableOrder || lockFwd;
      btnFwd.classList.toggle('active', state.orderFwd);
    }
    if (btnBwd) {
      btnBwd.disabled = disableOrder || lockBwd;
      btnBwd.classList.toggle('active', state.orderBwd);
    }

    colorBtns.forEach(b => {
      b.disabled = state.seqMode;
      b.classList.toggle('active', state.colors.includes(b.dataset.color));
    });

    // Cursor/feedback de edición manual
    document.body.classList.toggle(
      'manual-edit',
      !!window.memoryModeActive && (state.manualMode || state.area === 'M') && !state.active && !state.inQuiz
    );

    if (window.memoryModeActive) {
      applyAreaHighlight();
      window.refreshMemoryEyeMask?.();
    }
  }
  window.applyMemoryState = applyState;

  // ──────────────────────────────────────────────────────────────────────────
  // Controles
  // ──────────────────────────────────────────────────────────────────────────
  speedMinus?.addEventListener('click', () => {
    if (!window.memoryModeActive) return;
    if (state.speed > SPEED_MIN) state.speed--;
    applyState();
  });
  speedPlus?.addEventListener('click', () => {
    if (!window.memoryModeActive) return;
    if (state.speed < SPEED_MAX) state.speed++;
    applyState();
  });

  countDownBtn?.addEventListener('click', () => {
    if (!window.memoryModeActive) return;
    if (state.count > COUNT_MIN) state.count--;
    applyState();
  });
  countUpBtn?.addEventListener('click', () => {
    if (!window.memoryModeActive) return;
    if (state.count < COUNT_MAX) state.count++;
    applyState();
  });

  function stepArea(dir) {
    if (!window.memoryModeActive) return;
    let idx = AREA_VALUES.indexOf(state.area);
    if (idx === -1) idx = AREA_VALUES.length - 2; // fallback a '6'
    idx = (idx + dir + AREA_VALUES.length) % AREA_VALUES.length;
    state.area = AREA_VALUES[idx];
    state.manualMode = (state.area === 'M');
    applyState();
  }
  areaDownBtn?.addEventListener('click', () => stepArea(-1));
  areaUpBtn?.addEventListener('click', () => stepArea(+1));

  // Toggle de modo secuencial. Si hay una ronda en curso, el cambio se aplaza
  // hasta que termine para no invalidar la validación en marcha.
  btnSeq?.addEventListener('click', () => {
    if (!window.memoryModeActive) return;
    if (state.pendingSeqMode !== undefined) return;
    if (state.active) {
      state.pendingSeqMode = !state.seqMode;
      btnSeq.classList.toggle('active', state.pendingSeqMode);
      btnSeq.disabled = true;
      return;
    }
    setSeqMode(!state.seqMode);
    applyState();
  });

  /** Aplica el cambio de modo secuencial y normaliza el estado dependiente. */
  function setSeqMode(on) {
    state.seqMode = on;
    if (on) {
      state.orderFwd = true;
      state.orderBwd = false;
      state.colors = [];
    } else {
      state.orderFwd = false;
      state.orderBwd = false;
      if (!state.colors.length) state.colors = ['green'];
    }
  }

  // Flechas de orden: la activa única no puede apagarse (siempre hay un orden).
  btnFwd?.addEventListener('click', () => {
    if (!window.memoryModeActive || !state.seqMode) return;
    if (state.orderFwd) {
      if (state.orderBwd) state.orderFwd = false;
    } else {
      state.orderFwd = true;
    }
    applyState();
  });
  btnBwd?.addEventListener('click', () => {
    if (!window.memoryModeActive || !state.seqMode) return;
    if (state.orderBwd) {
      if (state.orderFwd) state.orderBwd = false;
    } else {
      state.orderBwd = true;
    }
    applyState();
  });

  // Colores (solo no-secuencial); siempre debe quedar al menos uno activo.
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!window.memoryModeActive || state.seqMode) return;
      const c = btn.dataset.color;
      let next = state.colors.includes(c)
        ? state.colors.filter(col => col !== c)
        : [...state.colors, c];
      if (!next.length) next = ['green'];
      state.colors = next;
      applyState();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Generación de rondas
  // ──────────────────────────────────────────────────────────────────────────

  /** Reveal acumulativo: muestra las celdas una a una y las mantiene visibles. */
  async function showKeep(seq, color, gen) {
    for (const td of seq) {
      if (gen !== loopGen || !state.active) return; // abortado (stop/pause)
      addMemLabel(td, color);
      await delay(pulseTime());
      await delay(SHOW_STEP_GAP_MS);
    }
  }

  /**
   * Genera y revela una ronda; deja `state.roundSeq` con la respuesta esperada
   * y `state.inQuiz = true` cuando hay que esperar input del usuario.
   *
   * Modos:
   *  - No secuencial: reparte `count` celdas entre los colores activos, las
   *    muestra a la vez, y pide marcar (en cualquier orden) las del color
   *    objetivo que se indica en #quiz-target.
   *  - Secuencial forward (→): reveal en orden; se valida en el mismo orden.
   *  - Secuencial backward (←): reveal en orden; se valida en orden inverso.
   *  - Combinada (→ + ←): dos conjuntos disjuntos; primero las verdes en su
   *    orden, después las rojas en orden inverso al mostrado.
   */
  async function startRound(gen) {
    clearHighlights();
    state.inQuiz = false;
    if (quizTarget) {
      quizTarget.style.backgroundColor = '';
      quizTarget.textContent = '';
      quizTarget.style.color = '';
      delete quizTarget.dataset.color;
    }
    if (!state.count || state.count < 1) state.count = 1;

    // Pool real; si el área manual quedó vacía, cae a toda la parrilla.
    let pool = shuffle(window.memoryGetPool());
    if (!pool.length) pool = shuffle(cells);

    // ================== NO SECUENCIAL ==================
    if (!state.seqMode) {
      const colors = state.colors.length ? state.colors.slice() : ['green'];
      const groups = {};
      const per = Math.max(1, Math.floor(state.count / colors.length));
      let rem = Math.max(0, state.count - per * colors.length);
      let off = 0;

      for (const c of colors) {
        const take = per + (rem > 0 ? 1 : 0);
        rem = Math.max(0, rem - 1);
        groups[c] = pool.slice(off, off + take);
        off += take;
      }

      // Reveal simultáneo de todos los grupos
      Object.entries(groups).forEach(([c, arr]) => arr.forEach(td => addMemLabel(td, c)));
      await delay(pulseTime());
      if (gen !== loopGen || !state.active) return;
      clearHighlights();

      // Color objetivo aleatorio entre los grupos no vacíos
      const nonEmpty = colors.filter(c => groups[c] && groups[c].length);
      if (!nonEmpty.length) return; // pool insuficiente: ronda vacía, no bloquear
      const tgt = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      state.currentTarget = tgt;
      state.roundSeq = groups[tgt].slice();
      state.inQuiz = true;
      if (quizTarget) {
        quizTarget.dataset.color = tgt;
        quizTarget.style.backgroundColor = tgt;
        quizTarget.style.color = 'transparent';
      }
      return;
    }

    // ================== SECUENCIAL ==================
    let wantFwd = !!state.orderFwd;
    let wantBwd = !!state.orderBwd;
    if (!wantFwd && !wantBwd) { // salvaguarda: nunca sin orden
      wantFwd = true;
      state.orderFwd = true;
      state.orderBwd = false;
      applyState();
    }

    const baseSeq = pool.slice(0, Math.max(1, state.count));
    if (!baseSeq.length) return;

    if (wantFwd && !wantBwd) {
      await showKeep(baseSeq, 'green', gen);
      if (gen !== loopGen || !state.active) return;
      await delay(LAST_CLICK_LINGER);
      clearHighlights();
      state.roundSeq = baseSeq.slice();           // validación en el mismo orden
      state.inQuiz = true;
      if (quizTarget) quizTarget.textContent = '→';
      return;
    }

    if (wantBwd && !wantFwd) {
      await showKeep(baseSeq, 'red', gen);
      if (gen !== loopGen || !state.active) return;
      await delay(LAST_CLICK_LINGER);
      clearHighlights();
      state.roundSeq = baseSeq.slice().reverse(); // validación en orden inverso
      state.inQuiz = true;
      if (quizTarget) quizTarget.textContent = '←';
      return;
    }

    // ===== COMBINADA: dos conjuntos disjuntos =====
    const seqFwd = baseSeq;
    let rest = pool.filter(td => !seqFwd.includes(td));
    if (rest.length < state.count) {
      // si el pool no alcanza, rellena desde toda la parrilla sin duplicados
      const extras = shuffle(cells).filter(td => !seqFwd.includes(td) && !rest.includes(td));
      rest = rest.concat(extras);
    }
    const seqBwd = rest.slice(0, Math.max(1, state.count));

    await showKeep(seqFwd, 'green', gen);
    await showKeep(seqBwd, 'red', gen);
    if (gen !== loopGen || !state.active) return;

    await delay(FADE_MS);
    clearHighlights();

    // Verdes en su orden + rojas en orden INVERSO al mostrado
    state.roundSeq = [...seqFwd, ...seqBwd.slice().reverse()];
    state.inQuiz = true;
    if (quizTarget) quizTarget.textContent = '↔';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Validación de respuestas (input del usuario)
  // ──────────────────────────────────────────────────────────────────────────

  /** Resuelve la ronda en curso tras el linger visual del último click. */
  function finishRound(result) {
    state.inQuiz = false;
    const done = state.roundResolve;
    state.roundResolve = null;
    if (!done) return;
    // Doble rAF + timeout: garantiza que el último label se pinte antes del fade
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => done(result), LAST_CLICK_LINGER);
      });
    });
  }

  // Un único listener de click sobre el grid gestiona ambos contextos:
  // edición manual del área (juego parado) y respuesta durante la ronda.
  gridTable.addEventListener('click', (ev) => {
    if (!window.memoryModeActive) return;
    const td = ev.target.closest('td[data-label]');
    if (!td) return;

    // — Edición manual del pool (área 'M', juego parado) —
    if ((state.manualMode || state.area === 'M') && !state.active && !state.inQuiz) {
      const idx = state.manualPool.indexOf(td);
      if (idx >= 0) state.manualPool.splice(idx, 1);
      else state.manualPool.push(td);
      applyAreaHighlight();
      window.refreshMemoryEyeMask?.();
      return;
    }

    // — Respuesta del usuario (solo durante la pregunta) —
    if (!state.inQuiz) return;

    if (state.seqMode) {
      // Validación estricta por orden: solo vale la siguiente celda esperada
      const expected = state.roundSeq[0];
      if (!expected) return;
      if (td === expected) {
        addMemLabel(td, 'green');
        state.roundSeq.shift();
        if (state.roundSeq.length === 0) finishRound('success');
      } else {
        addMemLabel(td, 'red');
        finishRound('fail');
      }
      return;
    }

    // No secuencial: orden libre; ignora repetir una celda ya acertada
    const span = td.querySelector('.mem-cell');
    if (span && span.dataset.memColor === 'green') return;

    const idx = state.roundSeq.indexOf(td);
    if (idx !== -1) {
      addMemLabel(td, 'green');
      state.roundSeq.splice(idx, 1);
      if (state.roundSeq.length === 0) finishRound('success');
    } else {
      addMemLabel(td, 'red');
      finishRound('fail');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bucle principal
  // ──────────────────────────────────────────────────────────────────────────
  async function loop(gen) {
    while (state.active && gen === loopGen) {
      await startRound(gen);
      if (gen !== loopGen) return; // abortado durante el reveal

      if (state.inQuiz) {
        // Espera la respuesta del usuario (o el aborto por stop/pause)
        const result = await new Promise(res => { state.roundResolve = res; });
        if (gen !== loopGen) return;
        if (result === 'aborted') break;
      }
      await fadeOutHighlights(FADE_MS);
      if (gen !== loopGen) return;
      await delay(LAST_CLICK_LINGER);

      // Aplica el cambio de modo secuencial aplazado, si lo había
      if (state.pendingSeqMode !== undefined) {
        setSeqMode(state.pendingSeqMode);
        state.pendingSeqMode = undefined;
        if (btnSeq) btnSeq.disabled = false;
        applyState();
      }
      await delay(INTER_ROUND_MS);
    }
  }

  /** Resuelve cualquier ronda pendiente para que ningún bucle quede colgado. */
  function abortPendingRound() {
    const done = state.roundResolve;
    state.roundResolve = null;
    state.inQuiz = false;
    if (done) done('aborted');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API pública (consumida por script.js)
  // ──────────────────────────────────────────────────────────────────────────
  window.startMemorySequence = function () {
    if (state.active) return;

    // En SEC garantiza al menos un orden activo
    if (state.seqMode && !state.orderFwd && !state.orderBwd) {
      state.orderFwd = true;
      state.orderBwd = false;
    }
    if (!state.count || state.count < 1) state.count = 1;

    // Área manual vacía ⇒ vuelve al área completa para no quedarse sin pool
    if ((state.manualMode || state.area === 'M') && state.manualPool.length === 0) {
      state.manualMode = false;
      state.area = '6';
    }

    abortPendingRound();   // por si quedó una ronda colgada de una sesión previa
    loopGen++;             // invalida cualquier bucle antiguo
    state.active = true;
    applyState();
    loop(loopGen);
  };

  window.memoryPause = function () {
    state.active = false;
    loopGen++;             // el bucle actual muere en su próximo checkpoint
    abortPendingRound();
  };

  window.memoryStop = function () {
    state.active = false;
    loopGen++;
    abortPendingRound();
    state.roundSeq = [];
    clearHighlights();
    if (quizTarget) {
      quizTarget.textContent = '–';
      quizTarget.style.backgroundColor = '';
      quizTarget.style.color = '';
      delete quizTarget.dataset.color;
    }
    if (state.pendingSeqMode !== undefined) {
      setSeqMode(state.pendingSeqMode);
      state.pendingSeqMode = undefined;
      if (btnSeq) btnSeq.disabled = false;
    }
    applyState();
  };

  // Estado inicial de la UI (solo displays; los estilos del grid se aplican
  // al entrar en modo Memory, para no pisar el aspecto de Script Mode).
  if (countNumEl) countNumEl.textContent = String(state.count).padStart(2, '0');
  if (areaNumEl)  areaNumEl.textContent  = String(state.area).padStart(2, '0');
});
