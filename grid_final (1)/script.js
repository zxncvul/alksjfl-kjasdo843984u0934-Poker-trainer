/* ============================================================================
   script.js — Núcleo del grid: "Script Mode" (pintado, random, challenge,
   zen, transporte) + integración con el módulo Memory (memory.js).

   Responsabilidad:
     - Lógica del grid en Script Mode (pintar/bloquear celdas, contador de
       combos, modo challenge, modo zen, random automático).
     - Máquina de estados del transporte (play / pause / stop) compartida con
       el modo Memory.
     - Entrada/salida del modo Memory y el "Ojo" local de Memory.

   Contrato con memory.js (todas las funciones son opcionales y este archivo
   funciona aunque memory.js no cargue):
     window.memoryState, window.applyMemoryState(), window.startMemorySequence(),
     window.memoryPause(), window.memoryStop(), window.memoryClearVisuals(),
     window.refreshMemoryLabelStyles()
   Este archivo expone a su vez:
     window.refreshMemoryEyeMask() → recalcula la máscara del Ojo de Memory
   ========================================================================== */

// Flags/hubs globales compartidos entre módulos (no revientan si falta alguno)
window.disableScriptPaint  = window.disableScriptPaint  || false;
window.challengeMode       = window.challengeMode       || false;
window.memoryModeActive    = window.memoryModeActive    || false;

window.memoryState         = window.memoryState         || {};
window.applyMemoryState    = window.applyMemoryState    || function () {};
window.startMemorySequence = window.startMemorySequence || function () {};
window.memoryPause         = window.memoryPause         || function () {};
window.memoryStop          = window.memoryStop          || function () {};

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // Grid & controles base
  // ──────────────────────────────────────────────────────────────────────────
  const rows  = Array.from(document.querySelectorAll('#range-table tbody tr'));
  const grid  = rows.map(r => Array.from(r.querySelectorAll('td[data-label]')));
  const cells = grid.flat();

  if (!cells.length) {
    console.warn('[script] grid vacío; la aplicación no puede inicializarse.');
    return;
  }

  const $ = id => document.getElementById(id);

  const playBtn      = $('play-btn');
  const pauseBtn     = $('pause-btn');
  const stopBtn      = $('stop-btn');
  const speedDown    = $('speed-down');
  const speedUp      = $('speed-up');
  const speedDisplay = $('speed-display');
  const quizTargetEl = $('quiz-target');

  const toggleAllBtn = $('toggle-all-btn');   // Ojo (grid / Memory local)
  const lockBtn      = $('lock-btn');         // Pintar/borrar
  const greenLockBtn = $('green-lock-btn');   // Invertir (Script)
  const randomBtn    = $('random-btn');
  const challengeBtn = $('challenge-btn');

  const memModeBtn   = $('mem-btn');          // Toggle modo Memory
  const memSeqBtn    = $('mem-seq-btn');      // Secuencial ON/OFF

  // Patrones (Pair / Zigzag / Rings / Spiral)
  const pairModeBtn  = $('pair-mode-btn');
  const zigzagBtn    = $('zigzag-btn');
  const ringsBtn     = $('rings-btn');
  const spiralBtn    = $('spiral-btn');
  const ampBtns      = Array.from(document.querySelectorAll('#zig-amps .amp-btn'));
  const zigDirBtn    = $('zig-dir-btn');
  const zigOrientBtn = $('zig-orient-btn');

  const zenEyeBtn    = $('zen-eye-btn');
  const overlay      = $('math-overlay');

  // ──────────────────────────────────────────────────────────────────────────
  // Iconos SVG
  // ──────────────────────────────────────────────────────────────────────────
  const SVG_OJO_ACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_OJO_INACTIVO = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#8B0000" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  const memIcon = stroke => `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <path d="M32 12 C24 12 18 16 18 22 C12 24 12 30 16 34 C12 36 12 42 18 44 C18 50 24 52 32 52" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32 12 C40 12 46 16 46 22 C52 24 52 30 48 34 C52 36 52 42 46 44 C46 50 40 52 32 52" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32 10 V54" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
  <path d="M26 18 C22 20 22 24 24 26" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
  <path d="M24 30 C20 32 20 36 24 38" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
  <path d="M38 18 C42 20 42 24 40 26" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
  <path d="M40 30 C44 32 44 36 40 38" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
</svg>`;
  const MEM_ICON_ON  = memIcon('#28a745');
  const MEM_ICON_OFF = memIcon('#8B0000');

  const invIcon = fill => `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${fill}" d="M12 2C9.5 6.2 6 9.9 6 14a6 6 0 0 0 12 0c0-4.1-3.5-7.8-6-12z"/><path fill="#000" d="M11.8 4.2v15.6a6 6 0 0 1-3.8-5.6c0-3.1 2.1-5.9 3.8-10z"/></svg>`;
  const SVG_INV_ON  = invIcon('#28a745');
  const SVG_INV_OFF = invIcon('#8B0000');

  const rndIcon = stroke => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h5l6 6"/><path d="M3 18h5l2.5-2.5"/><path d="M9 12l6-6h4"/><path d="M15 18h4"/></svg>`;
  const SVG_RND_ON  = rndIcon('#28a745');
  const SVG_RND_OFF = rndIcon('#8B0000');

  const tgtIcon = stroke => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="1.6" fill="${stroke}" stroke="${stroke}"/><line x1="12" y1="2" x2="12" y2="5.2"/><line x1="22" y1="12" x2="18.8" y2="12"/><line x1="12" y1="22" x2="12" y2="18.8"/><line x1="2" y1="12" x2="5.2" y2="12"/></svg>`;
  const SVG_TGT_ON  = tgtIcon('#28a745');
  const SVG_TGT_OFF = tgtIcon('#8B0000');

  // ──────────────────────────────────────────────────────────────────────────
  // UI inicial
  // ──────────────────────────────────────────────────────────────────────────
  function updateMemoryUI(active) {
    document.body.classList.toggle('memory-off', !active);
  }
  updateMemoryUI(window.memoryModeActive);

  // SEC empieza deshabilitado en Script Mode
  if (memSeqBtn) {
    memSeqBtn.classList.remove('active');
    memSeqBtn.disabled = !window.memoryModeActive;
    memSeqBtn.classList.toggle('disabled', !window.memoryModeActive);
  }

  if (greenLockBtn) greenLockBtn.innerHTML = SVG_INV_OFF;
  if (randomBtn)    randomBtn.innerHTML    = SVG_RND_OFF;
  if (challengeBtn) challengeBtn.innerHTML = SVG_TGT_OFF;
  if (toggleAllBtn) toggleAllBtn.innerHTML = SVG_OJO_ACTIVO;
  if (memModeBtn)   memModeBtn.innerHTML   = window.memoryModeActive ? MEM_ICON_ON : MEM_ICON_OFF;

  // ──────────────────────────────────────────────────────────────────────────
  // Estado Script Mode
  // ──────────────────────────────────────────────────────────────────────────
  let lockMode   = false;  // true = el pintado automático también bloquea
  let randomMode = false;  // filtra el pool del tick automático
  let quizActive = false;  // modo challenge

  function clearHighlights() { cells.forEach(td => td.classList.remove('highlight')); }
  function clearErrors()     { cells.forEach(td => td.classList.remove('wrong')); }

  // Velocidades del tick automático (índice 0 = 1000ms ... 29 = 200ms)
  const speedsMs = [1000, 900, 820, 750, 690, 640, 600, 565, 535, 510, 490, 470, 455, 440, 425, 410, 395, 380, 365, 350, 335, 320, 305, 290, 275, 260, 245, 230, 215, 200];
  let speedIndex = 0;
  let intervalId = null;

  function updateSpeedDisplay() {
    if (window.memoryModeActive) return; // en Memory el display lo gestiona memory.js
    if (speedDisplay) speedDisplay.textContent = String(speedIndex + 1).padStart(2, '0') + 'H';
  }
  updateSpeedDisplay();

  function updateComboCounter() {
    const comboTotalEl = $('combo-total');
    if (!comboTotalEl) return;
    const comboAllEl = $('combo-all');
    const comboSEl   = $('combo-s');
    const comboOEl   = $('combo-o');

    let totalCombos = 0, suited = 0, offsuit = 0, pairs = 0;
    cells.forEach(td => {
      if (!td.classList.contains('locked')) return;
      const label = td.getAttribute('data-label') || '';
      if (/^[AKQJT2-9]{2}$/.test(label)) { totalCombos += 6;  pairs++; }
      else if (label.endsWith('s'))       { totalCombos += 4;  suited++; }
      else if (label.endsWith('o'))       { totalCombos += 12; offsuit++; }
    });
    comboTotalEl.textContent = String(totalCombos).padStart(4, '0');
    if (comboAllEl) comboAllEl.textContent = String(suited + offsuit + pairs).padStart(3, '0');
    if (comboSEl)   comboSEl.textContent   = String(suited).padStart(2, '0');
    if (comboOEl)   comboOEl.textContent   = String(offsuit).padStart(2, '0');
  }
  updateComboCounter();

  // ──────────────────────────────────────────────────────────────────────────
  // Transporte unificado (única vía de cambio de estado play/pause/stop)
  // ──────────────────────────────────────────────────────────────────────────
  const Transport = Object.freeze({ STOP: 'stopped', PLAY: 'playing', PAUSE: 'paused' });
  let transportState = Transport.STOP;
  const ALLOWED = {
    [Transport.STOP]:  [Transport.PLAY],
    [Transport.PLAY]:  [Transport.PAUSE, Transport.STOP],
    [Transport.PAUSE]: [Transport.PLAY, Transport.STOP],
  };

  /** Refleja el estado del transporte en los botones (solo visual). */
  function renderTransport(state) {
    const playing = state === Transport.PLAY;
    const paused  = state === Transport.PAUSE;
    const stopped = state === Transport.STOP;
    if (playBtn)  playBtn.disabled  = playing;
    if (pauseBtn) pauseBtn.disabled = stopped;
    if (stopBtn)  stopBtn.disabled  = stopped;
    playBtn?.classList.toggle('active', playing);
    pauseBtn?.classList.toggle('active', paused);
    stopBtn?.classList.toggle('active', stopped);
  }

  /**
   * Transición de transporte. Despacha la acción al modo activo (Memory o
   * Script). Es la ÚNICA función que debe usarse para cambiar el transporte,
   * de forma que `transportState` y la UI no puedan divergir.
   */
  function setTransportState(next) {
    if (transportState === next) { renderTransport(next); return; }
    if (!ALLOWED[transportState].includes(next)) return;
    transportState = next;

    if (window.memoryModeActive) {
      if (next === Transport.PLAY)  { if (!window.memoryState.active) window.startMemorySequence(); }
      if (next === Transport.PAUSE) { window.memoryPause(); }
      if (next === Transport.STOP)  { window.memoryStop(); }
    } else {
      if (next === Transport.PLAY)  { clearHighlights(); startInterval(); }
      if (next === Transport.PAUSE) { stopInterval(); clearHighlights(); }
      if (next === Transport.STOP)  { stopInterval(); clearHighlights(); clearErrors(); resetPatternProgress(); }
    }
    renderTransport(next);
  }
  setTransportState(Transport.STOP);

  playBtn?.addEventListener('click', () => setTransportState(Transport.PLAY));
  pauseBtn?.addEventListener('click', () => setTransportState(Transport.PAUSE));
  stopBtn?.addEventListener('click', () => setTransportState(Transport.STOP));

  // ──────────────────────────────────────────────────────────────────────────
  // Zen
  // ──────────────────────────────────────────────────────────────────────────
  function applyZenIcon() {
    const zenOn = document.body.classList.contains('zen-mode');
    if (zenEyeBtn) zenEyeBtn.innerHTML = zenOn ? SVG_OJO_INACTIVO : SVG_OJO_ACTIVO;
  }
  applyZenIcon();

  function exitZen() {
    if (document.body.classList.contains('zen-mode')) {
      document.body.classList.remove('zen-mode');
      applyZenIcon();
    }
  }
  overlay?.addEventListener('click', exitZen);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') exitZen(); });
  zenEyeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('zen-mode');
    applyZenIcon();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Pintado automático (Script Mode)
  // ──────────────────────────────────────────────────────────────────────────
  const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

  function paintCell(td) {
    if (!td || window.disableScriptPaint) return;
    clearErrors();
    td.classList.add('highlight');
    if (lockMode) td.classList.add('locked');
    else          td.classList.remove('locked');
    updateComboCounter();
    if (quizActive && quizTargetEl && quizTargetEl.textContent === td.getAttribute('data-label')) {
      nextQuizTarget();
    }
  }

  function getRandomPool() {
    if (!randomMode) return cells;
    return lockMode
      ? cells.filter(td => !td.classList.contains('locked'))
      : cells.filter(td => td.classList.contains('locked'));
  }

  function nextQuizTarget() {
    let pool = cells.filter(td => !td.classList.contains('wrong'));
    if (randomMode) {
      pool = lockMode
        ? cells.filter(td => !td.classList.contains('locked'))
        : cells.slice();
    }
    if (!quizTargetEl) return;
    quizTargetEl.textContent = pool.length ? randomChoice(pool).getAttribute('data-label') : '–';
  }

  function startInterval() {
    stopInterval();
    intervalId = setInterval(tickRandom, speedsMs[speedIndex]);
  }
  function stopInterval() {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  }
  function refreshInterval() {
    if (intervalId !== null) { stopInterval(); startInterval(); }
  }

  function tickRandom() {
    // Si hay un patrón activo, el tick lo gobierna el patrón.
    if (zigMode)    return tickZig();
    if (ringMode)   return tickRing();
    if (spiralMode) return tickSpiral();
    if (pairMode)   return tickPair();

    clearHighlights();
    const pool = getRandomPool();
    if (!pool.length) { setTransportState(Transport.PAUSE); return; }
    paintCell(randomChoice(pool));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Patrones (Pair / Zigzag / Rings / Spiral)
  // Recorridos deterministas que sustituyen al tick aleatorio mientras están
  // activos. Son mutuamente excluyentes y solo existen en Script Mode.
  // ──────────────────────────────────────────────────────────────────────────
  const GRID_N = grid.length; // 13 en el grid estándar

  let pairMode   = false, pairStep = 0, currentCell = null, currentPartner = null, currentBaseType = 'suited';
  let spiralMode = false, spiralIndex = 0, spiralSeq = [], spiralSeqIn = [], spiralSeqOut = [], spiralOutward = false;
  let ringMode   = false, ringSequence = [], ringIndex = 0, ringCombos = [], ringComboIndex = 0, lastRingSize = null;
  let zigMode    = false, zigAmp = 1, zigDir = 'ltr', zigOrient = 'vertical', zigSequence = [], zigIndex = 0;

  function disableZigControls() {
    ampBtns.forEach(btn => { btn.disabled = true; btn.classList.remove('active'); btn.classList.add('disabled'); });
    [zigDirBtn, zigOrientBtn].forEach(el => {
      if (!el) return;
      el.disabled = true; el.classList.remove('active'); el.classList.add('disabled');
    });
  }
  function enableZigControls() {
    ampBtns.forEach(btn => { btn.disabled = false; btn.classList.remove('disabled'); });
    [zigDirBtn, zigOrientBtn].forEach(el => {
      if (!el) return;
      el.disabled = false; el.classList.remove('disabled');
    });
  }

  /** Obtiene el par espejo suited↔offsuit de una celda (los pocket pairs son su propio par). */
  function getPartner(td) {
    const lbl = td?.getAttribute('data-label');
    if (!lbl) return null;
    if (lbl.length === 2) return td; // pocket pair (p.ej. "AA")
    const rank = lbl.slice(0, 2);
    const ps   = lbl.slice(-1) === 's' ? 'o' : 's';
    return cells.find(c => c.getAttribute('data-label') === rank + ps) || null;
  }

  // ── Zigzag ──
  // Serpentea por dos columnas (o filas) separadas ±zigAmp del centro,
  // bajando por un lado y subiendo por el otro. Con Random activo, cada
  // pasada elige amplitud/dirección/orientación al azar.
  function generateNextZig() {
    const n = GRID_N, mid = Math.floor(n / 2);
    if (randomMode) {
      zigAmp    = 1 + Math.floor(Math.random() * 6);
      zigDir    = Math.random() < 0.5 ? 'ltr' : 'rtl';
      zigOrient = Math.random() < 0.5 ? 'vertical' : 'horizontal';
    }
    // Refleja el estado en los subcontroles
    ampBtns.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.amp, 10) === zigAmp));
    if (zigDirBtn)    zigDirBtn.textContent    = (zigDir === 'ltr') ? '→' : '←';
    if (zigOrientBtn) zigOrientBtn.textContent = (zigOrient === 'vertical') ? '↕' : '↔';

    const l = Math.max(0, mid - zigAmp);
    const r = Math.min(n - 1, mid + zigAmp);
    const seqA = [], seqB = [];
    if (zigOrient === 'vertical') {
      for (let i = 0; i < n; i++)      seqA.push(grid[i][i % 2 === 0 ? l : r]);
      for (let i = n - 1; i >= 0; i--) seqB.push(grid[i][i % 2 === 0 ? r : l]);
    } else {
      for (let i = 0; i < n; i++)      seqA.push(grid[i % 2 === 0 ? l : r][i]);
      for (let i = n - 1; i >= 0; i--) seqB.push(grid[i % 2 === 0 ? r : l][i]);
    }
    const combined = [...seqA, ...seqB].filter(Boolean);
    zigSequence = (zigDir === 'ltr') ? combined : combined.reverse();
    zigIndex = 0;
  }
  function tickZig() {
    if (!zigSequence.length || zigIndex >= zigSequence.length) generateNextZig();
    if (!zigSequence.length) return;
    clearHighlights();
    paintCell(zigSequence[zigIndex++]);
  }

  // ── Rings ──
  // Recorre el perímetro de un cuadrado (lado 2–5) colocado al azar en el
  // grid, dando dos vueltas y cerrando en la celda inicial. Con Random
  // activo, baraja todas las combinaciones posibles sin repetición.
  function initRingCombos() {
    ringCombos = [];
    for (let size = 2; size <= 5; size++) {
      for (let r = 0; r <= GRID_N - size; r++) {
        for (let c = 0; c <= GRID_N - size; c++) {
          ringCombos.push({ size, row: r, col: c });
        }
      }
    }
    shuffleRing();
  }
  function shuffleRing() {
    for (let i = ringCombos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ringCombos[i], ringCombos[j]] = [ringCombos[j], ringCombos[i]];
    }
    ringComboIndex = 0;
    lastRingSize = null;
  }
  function generateNextRing() {
    const n = GRID_N, maxSize = 5;
    let choice;
    if (randomMode) {
      if (ringComboIndex >= ringCombos.length) shuffleRing();
      choice = ringCombos[ringComboIndex++];
    } else {
      let sz;
      do { sz = 2 + Math.floor(Math.random() * (maxSize - 1)); }
      while (sz === lastRingSize);
      lastRingSize = sz;
      const r = Math.floor(Math.random() * (n - sz + 1));
      const c = Math.floor(Math.random() * (n - sz + 1));
      choice = { size: sz, row: r, col: c };
    }
    const { size, row: r0, col: c0 } = choice;
    const sides = [[], [], [], []];
    for (let k = 0; k < size; k++) {
      sides[0].push(grid[r0][c0 + k]);                       // lado superior →
      sides[1].push(grid[r0 + k][c0 + size - 1]);            // lado derecho ↓
      sides[2].push(grid[r0 + size - 1][c0 + size - 1 - k]); // lado inferior ←
      sides[3].push(grid[r0 + size - 1 - k][c0]);            // lado izquierdo ↑
    }
    sides.forEach(a => a.pop()); // evita duplicar esquinas
    const seqArr = Math.random() < 0.5
      ? [...sides[0], ...sides[1], ...sides[2], ...sides[3]]
      : [...sides[3].reverse(), ...sides[2].reverse(), ...sides[1].reverse(), ...sides[0].reverse()];
    ringSequence = [...seqArr, ...seqArr, seqArr[0]].filter(Boolean);
    ringIndex = 0;
  }
  function tickRing() {
    if (!ringSequence.length || ringIndex >= ringSequence.length) generateNextRing();
    if (!ringSequence.length) return;
    clearHighlights();
    paintCell(ringSequence[ringIndex++]);
  }

  // ── Spiral ──
  // Recorre el grid completo en espiral horaria: fuera→dentro y, al
  // terminar, dentro→fuera, alternando indefinidamente.
  function buildSpiralSequence() {
    const n = GRID_N;

    // Fuera → dentro
    spiralSeqIn = [];
    const used = Array.from({ length: n }, () => Array(n).fill(false));
    let r = 0, c = 0, dr = 0, dc = 1;
    for (let i = 0; i < n * n; i++) {
      spiralSeqIn.push(grid[r][c]); used[r][c] = true;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || used[nr][nc]) [dr, dc] = [dc, -dr];
      r += dr; c += dc;
    }

    // Dentro → fuera, desde el centro
    spiralSeqOut = [];
    r = Math.floor(n / 2); c = Math.floor(n / 2);
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // → ↓ ← ↑
    let dirIdx = 0, steps = 1;
    spiralSeqOut.push(grid[r][c]);
    const inBounds = (rr, cc) => rr >= 0 && rr < n && cc >= 0 && cc < n;
    while (spiralSeqOut.length < n * n) {
      for (let rep = 0; rep < 2; rep++) {
        const [vr, vc] = dirs[dirIdx % 4];
        for (let i = 0; i < steps; i++) {
          r += vr; c += vc;
          if (inBounds(r, c)) spiralSeqOut.push(grid[r][c]);
          if (spiralSeqOut.length >= n * n) break;
        }
        dirIdx++;
        if (spiralSeqOut.length >= n * n) break;
      }
      steps++;
    }

    spiralOutward = false;
    spiralSeq = spiralSeqIn;
    spiralIndex = 0;
  }
  function tickSpiral() {
    if (!spiralSeq.length) return;
    clearHighlights();
    paintCell(spiralSeq[spiralIndex++]);
    if (spiralIndex >= spiralSeq.length) {
      spiralOutward = !spiralOutward;
      spiralSeq = spiralOutward ? spiralSeqOut : spiralSeqIn;
      spiralIndex = 0;
    }
  }

  // ── Pair ──
  // Ciclo de 3 ticks: celda base (suited u offsuit) → su par espejo → de
  // nuevo la base. En cada ciclo alterna el tipo de la celda base.
  function tickPair() {
    const pool = getRandomPool();
    if (!pool.length) return;
    clearHighlights();
    if (pairStep === 0) {
      const candidates = pool.filter(td => {
        const lbl = td.dataset.label;
        return lbl && (
          (currentBaseType === 'suited'  && lbl.endsWith('s')) ||
          (currentBaseType === 'offsuit' && lbl.endsWith('o'))
        );
      });
      if (!candidates.length) return;
      currentCell    = randomChoice(candidates);
      currentPartner = getPartner(currentCell);
      paintCell(currentCell);
      pairStep = 1;
      return;
    }
    if (pairStep === 1) {
      if (currentPartner) paintCell(currentPartner);
      pairStep = 2;
      return;
    }
    paintCell(currentCell);
    currentBaseType = currentBaseType === 'suited' ? 'offsuit' : 'suited';
    pairStep = 0;
  }

  /** Desactiva todos los patrones y sus indicadores visuales. */
  function deactivateAllPatterns() {
    pairMode = spiralMode = ringMode = zigMode = false;
    pairStep = 0; spiralIndex = 0; zigIndex = 0; ringIndex = 0;
    [pairModeBtn, spiralBtn, ringsBtn, zigzagBtn].forEach(b => b?.classList.remove('active'));
    disableZigControls();
  }

  /** Deshabilita los botones de patrones (al entrar en Memory Mode). */
  function setPatternButtonsDisabled(disabled) {
    [pairModeBtn, spiralBtn, ringsBtn, zigzagBtn].forEach(b => {
      if (!b) return;
      b.disabled = disabled;
      b.classList.toggle('disabled', disabled);
    });
  }

  /** Reinicia el progreso de los patrones sin desactivarlos (al pulsar Stop). */
  function resetPatternProgress() {
    pairStep = 0;
    spiralIndex = 0;
    if (spiralMode) { spiralOutward = false; spiralSeq = spiralSeqIn; }
    zigSequence = []; zigIndex = 0;
    ringSequence = []; ringIndex = 0;
  }

  /** Activa/desactiva un patrón garantizando exclusión mutua y parando el transporte. */
  function togglePattern(which) {
    if (window.memoryModeActive) return;

    const wasActive = { pair: pairMode, zig: zigMode, ring: ringMode, spiral: spiralMode }[which];
    deactivateAllPatterns();
    clearHighlights();

    if (!wasActive) {
      switch (which) {
        case 'pair':
          pairMode = true;
          pairModeBtn?.classList.add('active');
          break;
        case 'spiral':
          spiralMode = true;
          spiralBtn?.classList.add('active');
          buildSpiralSequence();
          break;
        case 'ring':
          ringMode = true;
          ringsBtn?.classList.add('active');
          initRingCombos();
          break;
        case 'zig':
          zigMode = true;
          zigzagBtn?.classList.add('active');
          enableZigControls();
          zigAmp = 1; zigDir = 'ltr'; zigOrient = 'vertical';
          generateNextZig();
          break;
      }
    }
    // Al cambiar de patrón el transporte se detiene; el usuario decide cuándo
    // arrancar con Play.
    setTransportState(Transport.STOP);
  }

  pairModeBtn?.addEventListener('click', () => togglePattern('pair'));
  spiralBtn  ?.addEventListener('click', () => togglePattern('spiral'));
  ringsBtn   ?.addEventListener('click', () => togglePattern('ring'));
  zigzagBtn  ?.addEventListener('click', () => togglePattern('zig'));

  ampBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!zigMode || window.memoryModeActive) return;
      ampBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      zigAmp = parseInt(btn.dataset.amp, 10) || 1;
      zigSequence = []; zigIndex = 0;
      generateNextZig();
    });
  });
  zigDirBtn?.addEventListener('click', () => {
    if (!zigMode || window.memoryModeActive) return;
    zigDir = (zigDir === 'ltr') ? 'rtl' : 'ltr';
    zigDirBtn.textContent = (zigDir === 'ltr') ? '→' : '←';
    zigSequence = []; zigIndex = 0;
    generateNextZig();
  });
  zigOrientBtn?.addEventListener('click', () => {
    if (!zigMode || window.memoryModeActive) return;
    zigOrient = (zigOrient === 'vertical') ? 'horizontal' : 'vertical';
    zigOrientBtn.textContent = (zigOrient === 'vertical') ? '↕' : '↔';
    zigSequence = []; zigIndex = 0;
    generateNextZig();
  });

  // Los subcontroles del zigzag empiezan deshabilitados (zigMode = false)
  disableZigControls();

  // Velocidad (Script Mode; en Memory la gestiona memory.js sobre el mismo display)
  speedDown?.addEventListener('click', () => {
    if (window.memoryModeActive) return;
    if (speedIndex > 0) { speedIndex--; updateSpeedDisplay(); refreshInterval(); }
  });
  speedUp?.addEventListener('click', () => {
    if (window.memoryModeActive) return;
    if (speedIndex < speedsMs.length - 1) { speedIndex++; updateSpeedDisplay(); refreshInterval(); }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Click manual sobre celdas (Script Mode)
  // ──────────────────────────────────────────────────────────────────────────
  cells.forEach(td => {
    td.addEventListener('click', () => {
      if (window.memoryModeActive) return; // Memory gestiona sus propios clicks
      if (window.challengeMode) {
        const tgt = quizTargetEl?.textContent;
        if (!tgt || tgt === '–') return;
        if (td.getAttribute('data-label') === tgt) {
          td.classList.add('locked');
          updateComboCounter();
          clearHighlights();
          nextQuizTarget();
        } else {
          td.classList.add('wrong');
        }
        return;
      }
      td.classList.toggle('locked');
      td.classList.remove('wrong');
      updateComboCounter();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Random, Pintar/Borrar, Invertir, Challenge (solo Script Mode)
  // ──────────────────────────────────────────────────────────────────────────
  function updateLockIcon() {
    if (!lockBtn) return;
    const SVG_BUCKET = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22s1-5 5-9l9-9a3 3 0 0 1 4 4l-9 9c-4 4-9 5-9 5z"/><path d="M14 7l3 3"/></svg>`;
    const SVG_ERASER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.2 3.5L20.5 8.8 9.8 19.5 4.5 14.2 15.2 3.5z"/><path d="M6.6 12.1L11.9 17.4"/><path d="M9.8 19.5H21"/></svg>`;
    lockBtn.innerHTML = lockMode ? SVG_BUCKET : SVG_ERASER;
    lockBtn.title = lockMode ? 'Pintar (grabar iluminadas)' : 'Borrar (quitar bloqueadas)';
  }
  updateLockIcon();

  lockBtn?.addEventListener('click', () => {
    if (window.memoryModeActive) return;
    lockMode = !lockMode;
    lockBtn.classList.toggle('active', lockMode);
    updateLockIcon();
  });

  randomBtn?.addEventListener('click', () => {
    if (window.memoryModeActive) return;
    randomMode = !randomMode;
    randomBtn.classList.toggle('active', randomMode);
    randomBtn.innerHTML = randomMode ? SVG_RND_ON : SVG_RND_OFF;
    refreshInterval();
  });

  greenLockBtn?.addEventListener('click', () => {
    if (window.memoryModeActive) return; // en Memory la inversión la controla el Ojo
    const active = greenLockBtn.classList.toggle('active');
    document.body.classList.toggle('invert-lock', active);
    greenLockBtn.innerHTML = active ? SVG_INV_ON : SVG_INV_OFF;
  });

  challengeBtn?.addEventListener('click', () => {
    if (window.memoryModeActive) return;
    quizActive = !quizActive;
    window.challengeMode = quizActive;
    window.disableScriptPaint = false;
    challengeBtn.classList.toggle('active', quizActive);
    challengeBtn.innerHTML = quizActive ? SVG_TGT_ON : SVG_TGT_OFF;
    if (quizActive) {
      document.body.classList.add('quiz-active');
      nextQuizTarget();
    } else {
      document.body.classList.remove('quiz-active');
      if (quizTargetEl) quizTargetEl.textContent = '–';
      clearErrors();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // MODO MEMORY: Ojo local + enmascarado por área
  // ──────────────────────────────────────────────────────────────────────────
  function isMemoryEyeOn() { return document.body.classList.contains('memory-eye-on'); }

  /** Pool de celdas limitado por el área de Memory (o por el pool manual). */
  function computeMemoryPool() {
    if (typeof window.memoryGetPool === 'function') return window.memoryGetPool();
    // Fallback si memory.js no cargó
    const st = window.memoryState || {};
    const n = grid.length;
    if (!n) return [];
    if (st.manualMode || st.area === 'M') return (st.manualPool || []).slice();
    const a  = Number(st.area || 6);
    const sz = a * 2 + 1;
    const r0 = Math.max(0, Math.floor((n - sz) / 2));
    const c0 = Math.max(0, Math.floor(((grid[0] || []).length - sz) / 2));
    const pool = [];
    for (let r = r0; r < r0 + sz; r++) {
      for (let c = c0; c < c0 + sz; c++) {
        if (grid[r] && grid[r][c]) pool.push(grid[r][c]);
      }
    }
    return pool;
  }

  /** Pinta/despinta "locked" SOLO para el Ojo de Memory, sin tocar Script. */
  function refreshMemoryEyeMask() {
    const on = isMemoryEyeOn();
    cells.forEach(td => td.classList.remove('mem-eye-lock'));
    if (on) computeMemoryPool().forEach(td => td.classList.add('mem-eye-lock'));
    if (greenLockBtn) {
      greenLockBtn.classList.toggle('fake-active', on);
      greenLockBtn.innerHTML = on ? SVG_INV_ON : SVG_INV_OFF;
    }
    document.body.classList.toggle('memory-invert', on);
    // Re-estiliza las etiquetas visibles para que sigan siendo legibles
    window.refreshMemoryLabelStyles?.();
  }
  window.refreshMemoryEyeMask = refreshMemoryEyeMask;

  // Click del Ojo: en Memory actúa local; en Script, lock global del grid
  toggleAllBtn?.addEventListener('click', () => {
    if (window.memoryModeActive) {
      const next = !isMemoryEyeOn();
      document.body.classList.toggle('memory-eye-on', next);
      refreshMemoryEyeMask();
      toggleAllBtn.innerHTML = next ? SVG_OJO_INACTIVO : SVG_OJO_ACTIVO;
      return;
    }
    const closing = toggleAllBtn.dataset.closed !== '1';
    toggleAllBtn.dataset.closed = closing ? '1' : '0';
    toggleAllBtn.innerHTML = closing ? SVG_OJO_INACTIVO : SVG_OJO_ACTIVO;
    cells.forEach(td => td.classList.toggle('locked', closing));
    updateComboCounter();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Entrada/salida del modo Memory
  // ──────────────────────────────────────────────────────────────────────────
  memModeBtn?.addEventListener('click', () => {
    if (!window.memoryModeActive) {
      // ── Entrando a Memory ──
      window.memoryModeActive = true;
      window.challengeMode = false;
      updateMemoryUI(true);
      if (memSeqBtn) { memSeqBtn.disabled = false; memSeqBtn.classList.remove('disabled'); }
      memModeBtn.innerHTML = MEM_ICON_ON;

      // Desactiva challenge si estaba activo (estados incompatibles)
      if (quizActive) {
        quizActive = false;
        challengeBtn?.classList.remove('active');
        if (challengeBtn) challengeBtn.innerHTML = SVG_TGT_OFF;
        document.body.classList.remove('quiz-active');
      }

      // Limpia restos de Script y detiene el transporte
      deactivateAllPatterns();
      setPatternButtonsDisabled(true);
      stopInterval();
      clearHighlights();
      clearErrors();
      setTransportState(Transport.STOP);
      window.disableScriptPaint = true;

      // Sincroniza la UI de Memory (display de velocidad, área, máscara...)
      window.applyMemoryState();
      refreshMemoryEyeMask();
    } else {
      // ── Saliendo de Memory ──
      window.memoryModeActive = false;
      updateMemoryUI(false);
      if (memSeqBtn) {
        memSeqBtn.disabled = true;
        memSeqBtn.classList.add('disabled');
        memSeqBtn.classList.remove('active');
      }
      memModeBtn.innerHTML = MEM_ICON_OFF;

      // Detiene Memory y limpia sus visuales (incluidos estilos inline)
      window.memoryStop();
      window.memoryClearVisuals?.();
      setTransportState(Transport.STOP);

      // Quita flags del Ojo de Memory; los bloqueos de Script quedan intactos
      document.body.classList.remove('memory-eye-on', 'memory-invert', 'manual-edit');
      cells.forEach(td => td.classList.remove('mem-eye-lock'));
      if (toggleAllBtn && toggleAllBtn.dataset.closed !== '1') toggleAllBtn.innerHTML = SVG_OJO_ACTIVO;
      if (greenLockBtn) {
        greenLockBtn.classList.remove('fake-active');
        greenLockBtn.innerHTML = greenLockBtn.classList.contains('active') ? SVG_INV_ON : SVG_INV_OFF;
      }

      window.disableScriptPaint = false;
      setPatternButtonsDisabled(false);
      updateSpeedDisplay();
    }
  });

  // Si el tamaño del grid cambia dinámicamente, recalcular la máscara del Ojo
  const rangeTable = $('range-table');
  if (rangeTable && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (window.memoryModeActive) refreshMemoryEyeMask();
    }).observe(rangeTable);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Drag del panel completo (#main) con el handle de la cabecera
  // ──────────────────────────────────────────────────────────────────────────
  const main = $('main');
  const dragHandle = $('drag-handle');
  if (dragHandle && main) {
    let dragging = false;
    let startX = 0, startY = 0, origX = 0, origY = 0;

    function ensureFixed() {
      if (getComputedStyle(main).position !== 'fixed') {
        const r = main.getBoundingClientRect();
        main.style.position = 'fixed';
        main.style.top = r.top + 'px';
        main.style.left = r.left + 'px';
        main.style.right = 'auto';
        main.style.bottom = 'auto';
        main.style.margin = '0';
        main.style.transform = 'none';
      }
    }
    dragHandle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ensureFixed();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const r = main.getBoundingClientRect();
      origX = r.left; origY = r.top;
      dragHandle.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging-main');
    });
    dragHandle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      main.style.left = (origX + e.clientX - startX) + 'px';
      main.style.top  = (origY + e.clientY - startY) + 'px';
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { dragHandle.releasePointerCapture(e.pointerId); } catch {}
      document.body.classList.remove('dragging-main');
    }
    dragHandle.addEventListener('pointerup', endDrag);
    dragHandle.addEventListener('pointercancel', endDrag);
  }
});
