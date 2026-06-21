'use strict';

(function (RT) {
  const SCRIPT_SPEEDS = [
    1000, 900, 820, 750, 690, 640, 600, 565, 535, 510,
    490, 470, 455, 440, 425, 410, 395, 380, 365, 350,
    335, 320, 305, 290, 275, 260, 245, 230, 215, 200
  ];
  const AREA_VALUES = ['1', '2', '3', '4', '5', '6', 'M'];
  const COLORS = Object.freeze({
    green: '#3f9d74',
    blue: '#5d8fc2',
    red: '#bd5550',
    yellow: '#bd9343'
  });
  const LAST_CLICK_LINGER = 220;
  const FADE_MS = 260;
  const INTER_ROUND_MS = 250;
  const SHOW_STEP_GAP_MS = 120;

  const EXERCISES = Object.freeze([
    { id: 'script', label: 'Grid libre', help: 'Selección manual, pintado automático y contador de combos.' },
    { id: 'challenge', label: 'Challenge', help: 'Localiza la mano indicada en el grid.' },
    { id: 'pair', label: 'Pair', help: 'Base suited/offsuit, pareja espejo y regreso a la base.' },
    { id: 'zig', label: 'Zigzag', help: 'Recorrido con amplitud, dirección y orientación.' },
    { id: 'ring', label: 'Rings', help: 'Dos vueltas al perímetro de cuadrados de lado 2–5.' },
    { id: 'spiral', label: 'Spiral', help: 'Espiral exterior-interior y después interior-exterior.' },
    { id: 'memory', label: 'Memory', help: 'Memoria visual por colores, sin orden.' },
    { id: 'memory-seq', label: 'Memory SEC', help: 'Secuencia directa, inversa o combinada.' }
  ]);

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const randomChoice = values => values[Math.floor(Math.random() * values.length)];
  const shuffle = values => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function create(store, stats) {
    const { state, phases, transport } = store;
    const presets = RT.GridTrainerPresets.exercisePresets;
    const matrix = RT.Hands.MATRIX.map((row, r) =>
      row.map((label, c) => ({ id: `${r}-${c}`, row: r, col: c, label })));
    const cells = matrix.flat();
    const byId = new Map(cells.map(cell => [cell.id, cell]));
    const byLabel = new Map(cells.map(cell => [cell.label, cell]));

    let scriptTimer = null;
    let memoryGeneration = 0;
    let memoryRoundResolve = null;
    let memoryRoundStatsContext = null;
    let feedbackTimer = null;

    let pairStep = 0;
    let currentPairCell = null;
    let currentPartner = null;
    let currentBaseType = 'suited';
    let zigSequence = [];
    let zigIndex = 0;
    let ringSequence = [];
    let ringIndex = 0;
    let ringCombos = [];
    let ringComboIndex = 0;
    let lastRingSize = null;
    let spiralSequence = [];
    let spiralIn = [];
    let spiralOut = [];
    let spiralIndex = 0;
    let spiralOutward = false;

    function notify() {
      store.notify();
    }

    function comboStats() {
      return RT.Hands.comboStats(
        cells.filter(cell => state.script.locked.has(cell.id)).map(cell => cell.label));
    }

    function activePreset() {
      return RT.GridTrainerPresets.get(state.activePresetId);
    }

    function primaryDuration() {
      const duration = state.presetDuration;
      if (Array.isArray(duration)) return Number(duration[0]) || null;
      return Number(duration) || null;
    }

    function memoryPulseTime() {
      const presetDuration = primaryDuration();
      if (presetDuration) return presetDuration;
      const speed = Math.max(1, Math.min(21, state.memory.speed | 0));
      return speed === 1 ? 250 : 500 * (speed - 1);
    }

    function areaSize() {
      if (state.presetGridSize) return state.presetGridSize;
      if (state.memory.area === 'M') return state.memory.manualPool.size;
      const radius = Math.max(1, Math.min(6, Number(state.memory.area) || 6));
      return Math.min(13, radius * 2 + 1);
    }

    function difficultyBucket() {
      const preset = activePreset();
      if (preset && preset.difficulty) return preset.difficulty;
      if (state.mode === 'script') {
        const speedIndex = Math.max(0, Math.min(29, state.script.speedIndex | 0));
        if (speedIndex <= 7) return 'easy';
        if (speedIndex <= 15) return 'medium';
        if (speedIndex <= 23) return 'hard';
        return 'expert';
      }
      const memory = state.memory;
      let score = memory.count;
      score += memory.seqMode ? 4 : 0;
      score += memory.orderFwd && memory.orderBwd ? 4 : 0;
      score += memory.speed <= 3 ? 4 : memory.speed <= 6 ? 2 : 0;
      score += areaSize() <= 5 ? 2 : 0;
      if (score <= 5) return 'easy';
      if (score <= 10) return 'medium';
      if (score <= 17) return 'hard';
      return 'expert';
    }

    function resultMode() {
      const memory = state.memory;
      if (state.mode === 'script') return 'challenge';
      if (!memory.seqMode) return 'visual';
      if (memory.orderFwd && memory.orderBwd) return 'combined';
      return memory.orderBwd ? 'backward' : 'forward';
    }

    function resultContext() {
      return {
        mode: resultMode(),
        size: state.mode === 'memory'
          ? (state.presetGridSize
            ? `${state.presetGridSize}x${state.presetGridSize}`
            : state.memory.area === 'M'
            ? `${state.memory.manualPool.size} manual`
            : `${areaSize()}x${areaSize()}`)
          : `${state.presetGridSize || 13}x${state.presetGridSize || 13}`,
        difficulty: difficultyBucket(),
        presetId: state.activePresetId
      };
    }

    function centeredBounds(size) {
      const value = Math.max(1, Math.min(13, Number(size) || 13));
      const start = Math.floor((13 - value) / 2);
      return { startRow: start, startCol: start, size: value };
    }

    function cellsInBounds(bounds) {
      const result = [];
      for (let row = bounds.startRow; row < bounds.startRow + bounds.size; row++) {
        for (let col = bounds.startCol; col < bounds.startCol + bounds.size; col++) {
          result.push(matrix[row][col]);
        }
      }
      return result;
    }

    function presetAreaCells() {
      return state.presetGridSize
        ? cellsInBounds(centeredBounds(state.presetGridSize))
        : cells;
    }

    function syncAllLocked() {
      const available = presetAreaCells();
      state.script.allLocked = available.length > 0 &&
        available.every(cell => state.script.locked.has(cell.id));
    }

    function recordResult(correct, context) {
      stats.record(correct ? 'correct' : 'error', context || resultContext());
    }

    function clearFeedbackTimer() {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }

    function clearScriptTimer() {
      clearInterval(scriptTimer);
      scriptTimer = null;
    }

    function clearScriptVisuals() {
      state.script.highlight = null;
      state.script.wrong.clear();
    }

    function clearMemoryVisuals() {
      state.memory.labels.clear();
      state.memory.roundSeq = [];
      state.memory.currentTarget = null;
      state.target = '–';
    }

    function detachPreset(options) {
      const config = options || {};
      state.activePresetId = null;
      state.presetSpecialEffects = [];
      if (config.gridSize) state.presetGridSize = null;
      if (config.duration) state.presetDuration = null;
      if (config.pattern) state.presetPattern = null;
    }

    function resetPatternProgress() {
      pairStep = 0;
      currentPairCell = null;
      currentPartner = null;
      spiralIndex = 0;
      spiralOutward = false;
      spiralSequence = spiralIn;
      zigSequence = [];
      zigIndex = 0;
      ringSequence = [];
      ringIndex = 0;
    }

    function abortMemoryRound() {
      memoryGeneration++;
      state.memory.active = false;
      state.memory.inQuiz = false;
      memoryRoundStatsContext = null;
      const resolve = memoryRoundResolve;
      memoryRoundResolve = null;
      if (resolve) resolve('aborted');
    }

    function applyPendingMemoryMode() {
      if (state.memory.pendingSeqMode === undefined) return;
      setMemorySequence(state.memory.pendingSeqMode);
      state.memory.pendingSeqMode = undefined;
    }

    function stop() {
      clearFeedbackTimer();
      clearScriptTimer();
      abortMemoryRound();
      clearScriptVisuals();
      clearMemoryVisuals();
      applyPendingMemoryMode();
      resetPatternProgress();
      state.transport = transport.STOPPED;
      state.phase = phases.CONFIGURING;
      state.feedback = state.mode === 'memory'
        ? 'Configura Memory y pulsa Play.'
        : 'Grid detenido.';
      notify();
    }

    function pause() {
      if (state.transport !== transport.PLAYING) return;
      clearFeedbackTimer();
      clearScriptTimer();
      abortMemoryRound();
      applyPendingMemoryMode();
      state.script.highlight = null;
      state.memory.labels.clear();
      state.transport = transport.PAUSED;
      state.phase = phases.CONFIGURING;
      state.feedback = 'Pausado.';
      notify();
    }

    function play() {
      if (state.transport === transport.PLAYING) return;
      clearFeedbackTimer();
      state.transport = transport.PLAYING;
      if (state.mode === 'memory') startMemoryLoop();
      else startScriptPlayback();
      notify();
    }

    function startScriptPlayback() {
      clearScriptTimer();
      clearScriptVisuals();
      if (state.script.challenge) {
        if (!state.target || state.target === '–') nextChallengeTarget();
        else {
          state.phase = phases.ANSWERING;
          state.feedback = `Encuentra ${state.target}.`;
        }
      } else {
        state.phase = phases.SHOWING;
        state.feedback = state.script.pattern
          ? `Patrón ${state.script.pattern} en ejecución.`
          : 'Pintado automático en ejecución.';
      }
      startScriptTimer();
    }

    function setMode(mode) {
      if (!['script', 'memory'].includes(mode) || state.mode === mode) return;
      detachPreset({ gridSize: true, duration: true, pattern: true });
      const previousTransport = state.transport;
      clearFeedbackTimer();
      clearScriptTimer();
      abortMemoryRound();
      applyPendingMemoryMode();
      clearScriptVisuals();
      clearMemoryVisuals();
      state.mode = mode;
      state.transport = previousTransport;
      if (previousTransport === transport.PLAYING) {
        if (mode === 'memory') startMemoryLoop();
        else startScriptPlayback();
      } else {
        state.phase = phases.CONFIGURING;
        state.feedback = mode === 'memory'
          ? 'Memory activo: configura cantidad, área, velocidad y modo.'
          : 'Script activo: selección libre, challenge y patrones.';
      }
      notify();
    }

    function selectExercise(id) {
      if (!EXERCISES.some(exercise => exercise.id === id)) return;
      detachPreset({ gridSize: true, duration: true, pattern: true });
      const wasPlaying = state.transport === transport.PLAYING;
      clearFeedbackTimer();
      clearScriptTimer();
      abortMemoryRound();
      applyPendingMemoryMode();
      clearScriptVisuals();
      clearMemoryVisuals();

      if (id === 'memory' || id === 'memory-seq') {
        state.mode = 'memory';
        state.memory.pendingSeqMode = undefined;
        setMemorySequence(id === 'memory-seq');
        state.feedback = id === 'memory'
          ? 'Memory visual: recuerda las celdas del color objetivo.'
          : 'Memory SEC: responde en el orden configurado.';
        state.phase = phases.CONFIGURING;
        if (wasPlaying) {
          state.transport = transport.PLAYING;
          startMemoryLoop();
        }
      } else {
        state.mode = 'script';
        if (id === 'challenge') state.script.challenge = true;
        else if (id === 'script') {
          state.script.challenge = false;
          state.script.pattern = null;
          state.target = '–';
        } else {
          state.script.pattern = id;
        }
        resetPatternProgress();
        if (state.script.challenge) nextChallengeTarget();
        if (id === 'spiral') buildSpiralSequence();
        if (id === 'ring') initRingCombos();
        if (id === 'zig') generateZig();
        state.feedback = EXERCISES.find(exercise => exercise.id === id).help;
        if (wasPlaying) {
          state.transport = transport.PLAYING;
          startScriptPlayback();
        } else if (state.script.challenge) {
          state.phase = phases.ANSWERING;
          state.feedback = `Encuentra ${state.target}.`;
        } else {
          state.phase = phases.CONFIGURING;
        }
      }
      notify();
    }

    function paintCell(cell) {
      if (!cell) return;
      state.script.wrong.clear();
      state.script.highlight = cell.id;
      if (state.script.lockMode) state.script.locked.add(cell.id);
      else state.script.locked.delete(cell.id);
      syncAllLocked();
      notify();
    }

    function randomPool() {
      const available = presetAreaCells();
      if (!state.script.randomMode) return available;
      return state.script.lockMode
        ? available.filter(cell => !state.script.locked.has(cell.id))
        : available.filter(cell => state.script.locked.has(cell.id));
    }

    function nextChallengeTarget() {
      const available = presetAreaCells();
      let pool = available.filter(cell => !state.script.wrong.has(cell.id));
      if (state.script.randomMode) {
        pool = state.script.lockMode
          ? available.filter(cell => !state.script.locked.has(cell.id))
          : available.slice();
      }
      if (!pool.length) pool = available.filter(cell => !state.script.wrong.has(cell.id));
      if (!pool.length) pool = available;
      state.target = pool.length ? randomChoice(pool).label : '–';
      state.round++;
      state.phase = phases.ANSWERING;
      state.feedback = `Encuentra ${state.target}.`;
    }

    function scheduleChallengeReady(feedback) {
      const nextTarget = state.target;
      state.phase = feedback.correct ? phases.CORRECT : phases.ERROR;
      state.feedback = feedback.text;
      clearFeedbackTimer();
      feedbackTimer = setTimeout(() => {
        state.phase = phases.ANSWERING;
        state.feedback = `Encuentra ${nextTarget}.`;
        notify();
      }, 500);
    }

    function startScriptTimer() {
      clearScriptTimer();
      scriptTimer = setInterval(scriptTick, SCRIPT_SPEEDS[state.script.speedIndex]);
    }

    function scriptTick() {
      if (state.script.pattern === 'zig') return tickZig();
      if (state.script.pattern === 'ring') return tickRing();
      if (state.script.pattern === 'spiral') return tickSpiral();
      if (state.script.pattern === 'pair') return tickPair();
      state.script.highlight = null;
      const pool = randomPool();
      if (!pool.length) return pause();
      paintCell(randomChoice(pool));
    }

    function getPartner(cell) {
      if (!cell) return null;
      if (cell.label.length === 2) return cell;
      const label = cell.label.slice(0, 2) + (cell.label.endsWith('s') ? 'o' : 's');
      return byLabel.get(label) || null;
    }

    function generateZig() {
      const bounds = centeredBounds(state.presetGridSize || 13);
      const n = bounds.size;
      const mid = Math.floor(n / 2);
      if (state.script.randomMode) {
        state.script.zigAmp = 1 + Math.floor(Math.random() * 6);
        state.script.zigDir = Math.random() < .5 ? 'ltr' : 'rtl';
        state.script.zigOrient = Math.random() < .5 ? 'vertical' : 'horizontal';
      }
      const left = Math.max(0, mid - state.script.zigAmp);
      const right = Math.min(n - 1, mid + state.script.zigAmp);
      const first = [];
      const second = [];
      if (state.script.zigOrient === 'vertical') {
        for (let i = 0; i < n; i++) {
          first.push(matrix[bounds.startRow + i][bounds.startCol + (i % 2 === 0 ? left : right)]);
        }
        for (let i = n - 1; i >= 0; i--) {
          second.push(matrix[bounds.startRow + i][bounds.startCol + (i % 2 === 0 ? right : left)]);
        }
      } else {
        for (let i = 0; i < n; i++) {
          first.push(matrix[bounds.startRow + (i % 2 === 0 ? left : right)][bounds.startCol + i]);
        }
        for (let i = n - 1; i >= 0; i--) {
          second.push(matrix[bounds.startRow + (i % 2 === 0 ? right : left)][bounds.startCol + i]);
        }
      }
      const combined = first.concat(second).filter(Boolean);
      zigSequence = state.script.zigDir === 'ltr' ? combined : combined.reverse();
      zigIndex = 0;
    }

    function tickZig() {
      if (!zigSequence.length || zigIndex >= zigSequence.length) generateZig();
      state.script.highlight = null;
      paintCell(zigSequence[zigIndex++]);
    }

    function initRingCombos() {
      ringCombos = [];
      const bounds = centeredBounds(state.presetGridSize || 13);
      for (let size = 2; size <= Math.min(5, bounds.size); size++) {
        for (let row = bounds.startRow; row <= bounds.startRow + bounds.size - size; row++) {
          for (let col = bounds.startCol; col <= bounds.startCol + bounds.size - size; col++) {
            ringCombos.push({ size, row, col });
          }
        }
      }
      ringCombos = shuffle(ringCombos);
      ringComboIndex = 0;
      lastRingSize = null;
    }

    function generateRing() {
      let choice;
      if (state.script.randomMode) {
        if (ringComboIndex >= ringCombos.length) initRingCombos();
        choice = ringCombos[ringComboIndex++];
      } else {
        const bounds = centeredBounds(state.presetGridSize || 13);
        let size;
        const maxSize = Math.min(5, bounds.size);
        do size = 2 + Math.floor(Math.random() * Math.max(1, maxSize - 1));
        while (size === lastRingSize);
        lastRingSize = size;
        choice = {
          size,
          row: bounds.startRow + Math.floor(Math.random() * (bounds.size - size + 1)),
          col: bounds.startCol + Math.floor(Math.random() * (bounds.size - size + 1))
        };
      }
      const sides = [[], [], [], []];
      for (let k = 0; k < choice.size; k++) {
        sides[0].push(matrix[choice.row][choice.col + k]);
        sides[1].push(matrix[choice.row + k][choice.col + choice.size - 1]);
        sides[2].push(matrix[choice.row + choice.size - 1][choice.col + choice.size - 1 - k]);
        sides[3].push(matrix[choice.row + choice.size - 1 - k][choice.col]);
      }
      sides.forEach(side => side.pop());
      const perimeter = Math.random() < .5
        ? sides[0].concat(sides[1], sides[2], sides[3])
        : sides[3].reverse().concat(sides[2].reverse(), sides[1].reverse(), sides[0].reverse());
      ringSequence = perimeter.concat(perimeter, perimeter[0]).filter(Boolean);
      ringIndex = 0;
    }

    function tickRing() {
      if (!ringSequence.length || ringIndex >= ringSequence.length) generateRing();
      state.script.highlight = null;
      paintCell(ringSequence[ringIndex++]);
    }

    function buildSpiralSequence() {
      const bounds = centeredBounds(state.presetGridSize || 13);
      const n = bounds.size;
      spiralIn = [];
      const used = Array.from({ length: n }, () => Array(n).fill(false));
      let row = 0, col = 0, dr = 0, dc = 1;
      for (let i = 0; i < n * n; i++) {
        spiralIn.push(matrix[bounds.startRow + row][bounds.startCol + col]);
        used[row][col] = true;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (nextRow < 0 || nextCol < 0 || nextRow >= n || nextCol >= n || used[nextRow][nextCol]) {
          [dr, dc] = [dc, -dr];
        }
        row += dr;
        col += dc;
      }

      spiralOut = [];
      row = Math.floor(n / 2);
      col = Math.floor(n / 2);
      const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      let direction = 0;
      let steps = 1;
      spiralOut.push(matrix[bounds.startRow + row][bounds.startCol + col]);
      while (spiralOut.length < n * n) {
        for (let repeat = 0; repeat < 2; repeat++) {
          const [vr, vc] = directions[direction % 4];
          for (let i = 0; i < steps; i++) {
            row += vr;
            col += vc;
            if (row >= 0 && row < n && col >= 0 && col < n) {
              spiralOut.push(matrix[bounds.startRow + row][bounds.startCol + col]);
            }
            if (spiralOut.length >= n * n) break;
          }
          direction++;
          if (spiralOut.length >= n * n) break;
        }
        steps++;
      }
      spiralOutward = false;
      spiralSequence = spiralIn;
      spiralIndex = 0;
    }

    function tickSpiral() {
      if (!spiralSequence.length) buildSpiralSequence();
      state.script.highlight = null;
      paintCell(spiralSequence[spiralIndex++]);
      if (spiralIndex >= spiralSequence.length) {
        spiralOutward = !spiralOutward;
        spiralSequence = spiralOutward ? spiralOut : spiralIn;
        spiralIndex = 0;
      }
    }

    function tickPair() {
      const pool = randomPool();
      if (!pool.length) return;
      state.script.highlight = null;
      if (pairStep === 0) {
        const candidates = pool.filter(cell =>
          currentBaseType === 'suited' ? cell.label.endsWith('s') : cell.label.endsWith('o'));
        if (!candidates.length) return;
        currentPairCell = randomChoice(candidates);
        currentPartner = getPartner(currentPairCell);
        paintCell(currentPairCell);
        pairStep = 1;
      } else if (pairStep === 1) {
        paintCell(currentPartner);
        pairStep = 2;
      } else {
        paintCell(currentPairCell);
        currentBaseType = currentBaseType === 'suited' ? 'offsuit' : 'suited';
        pairStep = 0;
      }
    }

    function clickCell(id) {
      const cell = byId.get(id);
      if (!cell) return;
      if (state.mode === 'memory') return clickMemoryCell(cell);
      if (state.script.challenge) {
        if (state.phase !== phases.ANSWERING || state.target === '–') return;
        if (cell.label === state.target) {
          state.script.locked.add(cell.id);
          syncAllLocked();
          state.script.wrong.clear();
          recordResult(true);
          nextChallengeTarget();
          scheduleChallengeReady({ correct: true, text: `Correcto: ${cell.label}.` });
        } else {
          state.script.wrong.add(cell.id);
          recordResult(false);
          scheduleChallengeReady({
            correct: false,
            text: `${cell.label} no es ${state.target}.`
          });
        }
        notify();
        return;
      }
      if (state.script.locked.has(id)) state.script.locked.delete(id);
      else state.script.locked.add(id);
      syncAllLocked();
      state.script.wrong.delete(id);
      notify();
    }

    function togglePattern(pattern) {
      if (state.mode !== 'script') return;
      detachPreset({ pattern: true });
      const wasPlaying = state.transport === transport.PLAYING;
      clearFeedbackTimer();
      clearScriptVisuals();
      resetPatternProgress();
      state.script.pattern = state.script.pattern === pattern ? null : pattern;
      if (state.script.pattern === 'zig') generateZig();
      if (state.script.pattern === 'ring') initRingCombos();
      if (state.script.pattern === 'spiral') buildSpiralSequence();
      if (wasPlaying) startScriptPlayback();
      else if (state.script.challenge) {
        state.phase = phases.ANSWERING;
        state.feedback = `Encuentra ${state.target}.`;
      }
      else {
        state.phase = phases.CONFIGURING;
        state.feedback = state.script.pattern
          ? `${state.script.pattern} preparado. Pulsa Play.`
          : 'Patrón desactivado.';
      }
      notify();
    }

    function toggleChallenge() {
      if (state.mode !== 'script') return;
      detachPreset();
      const wasPlaying = state.transport === transport.PLAYING;
      clearFeedbackTimer();
      state.script.challenge = !state.script.challenge;
      state.script.wrong.clear();
      if (state.script.challenge) {
        nextChallengeTarget();
        if (wasPlaying) startScriptTimer();
      }
      else {
        state.target = '–';
        if (wasPlaying) {
          state.phase = phases.SHOWING;
          state.feedback = state.script.pattern
            ? `Patrón ${state.script.pattern} en ejecución.`
            : 'Pintado automático en ejecución.';
          startScriptTimer();
        }
        else {
          state.phase = phases.CONFIGURING;
          state.feedback = 'Challenge desactivado.';
        }
      }
      notify();
    }

    function toggleAll() {
      if (state.mode === 'memory') {
        state.memory.eyeOn = !state.memory.eyeOn;
      } else {
        state.script.allLocked = !state.script.allLocked;
        presetAreaCells().forEach(cell => {
          if (state.script.allLocked) state.script.locked.add(cell.id);
          else state.script.locked.delete(cell.id);
        });
      }
      notify();
    }

    function toggleLockMode() {
      if (state.mode !== 'script') return;
      detachPreset();
      state.script.lockMode = !state.script.lockMode;
      notify();
    }

    function toggleRandom() {
      if (state.mode !== 'script') return;
      detachPreset();
      state.script.randomMode = !state.script.randomMode;
      if (state.transport === transport.PLAYING) startScriptTimer();
      notify();
    }

    function toggleInvert() {
      if (state.mode !== 'script') return;
      state.script.invertLock = !state.script.invertLock;
      notify();
    }

    function toggleZen() {
      state.script.zen = !state.script.zen;
      notify();
    }

    function stepScriptSpeed(direction) {
      if (state.mode !== 'script') return;
      detachPreset({ duration: true });
      state.script.speedIndex = Math.max(0, Math.min(29, state.script.speedIndex + direction));
      if (state.transport === transport.PLAYING) startScriptTimer();
      notify();
    }

    function setZigAmp(value) {
      if (state.script.pattern !== 'zig') return;
      detachPreset();
      state.script.zigAmp = Math.max(1, Math.min(6, Number(value) || 1));
      generateZig();
      notify();
    }

    function toggleZigDirection() {
      if (state.script.pattern !== 'zig') return;
      detachPreset();
      state.script.zigDir = state.script.zigDir === 'ltr' ? 'rtl' : 'ltr';
      generateZig();
      notify();
    }

    function toggleZigOrientation() {
      if (state.script.pattern !== 'zig') return;
      detachPreset();
      state.script.zigOrient =
        state.script.zigOrient === 'vertical' ? 'horizontal' : 'vertical';
      generateZig();
      notify();
    }

    function memoryPool() {
      const memory = state.memory;
      if (state.presetGridSize) {
        return cellsInBounds(centeredBounds(state.presetGridSize));
      }
      if (memory.area === 'M') return cells.filter(cell => memory.manualPool.has(cell.id));
      const radius = Math.max(1, Math.min(6, Number(memory.area) || 6));
      const size = radius * 2 + 1;
      const maxStart = 13 - size;
      const startRow = Math.max(0, Math.min(maxStart, memory.centerRow - radius));
      const startCol = Math.max(0, Math.min(maxStart, memory.centerCol - radius));
      const pool = [];
      for (let row = startRow; row < startRow + size; row++) {
        for (let col = startCol; col < startCol + size; col++) pool.push(matrix[row][col]);
      }
      return pool;
    }

    function memoryAreaSet() {
      return new Set(memoryPool().map(cell => cell.id));
    }

    function trainingAreaSet() {
      if (state.presetGridSize) {
        return new Set(cellsInBounds(centeredBounds(state.presetGridSize))
          .map(cell => cell.id));
      }
      return state.mode === 'memory' ? memoryAreaSet() : new Set(cells.map(cell => cell.id));
    }

    function preparePresetPool(pool) {
      if (!state.presetPattern || !pool.length) return shuffle(pool);
      if (state.presetPattern === 'diagonal') {
        const bounds = centeredBounds(state.presetGridSize || 13);
        const diagonal = pool.filter(cell => {
          const row = cell.row - bounds.startRow;
          const col = cell.col - bounds.startCol;
          return row === col || row + col === bounds.size - 1;
        });
        const rest = pool.filter(cell => !diagonal.includes(cell));
        return shuffle(diagonal).concat(shuffle(rest));
      }
      if (state.presetPattern === 'dispersed') {
        const pending = shuffle(pool);
        const dispersed = [];
        while (pending.length) {
          const index = pending.findIndex(candidate => dispersed.every(selected =>
            Math.max(Math.abs(candidate.row - selected.row),
              Math.abs(candidate.col - selected.col)) > 1));
          if (index < 0) break;
          dispersed.push(pending.splice(index, 1)[0]);
        }
        return dispersed.concat(pending);
      }
      return shuffle(pool);
    }

    function setMemorySequence(on) {
      const memory = state.memory;
      memory.seqMode = !!on;
      if (on) {
        memory.orderFwd = true;
        memory.orderBwd = false;
        memory.colors = [];
      } else {
        memory.orderFwd = false;
        memory.orderBwd = false;
        if (!memory.colors.length) memory.colors = ['green'];
      }
    }

    function toggleMemorySequence() {
      if (state.mode !== 'memory') return;
      detachPreset({ pattern: true });
      const memory = state.memory;
      if (memory.pendingSeqMode !== undefined) return;
      if (memory.active) {
        memory.pendingSeqMode = !memory.seqMode;
        state.feedback = 'El cambio de SEC se aplicará al terminar la ronda.';
      } else {
        setMemorySequence(!memory.seqMode);
      }
      notify();
    }

    function toggleMemoryOrder(order) {
      const memory = state.memory;
      if (state.mode !== 'memory' || !memory.seqMode) return;
      detachPreset({ pattern: true });
      if (order === 'forward') {
        if (memory.orderFwd && memory.orderBwd) memory.orderFwd = false;
        else memory.orderFwd = true;
      } else if (memory.orderBwd && memory.orderFwd) memory.orderBwd = false;
      else memory.orderBwd = true;
      notify();
    }

    function toggleMemoryColor(color) {
      const memory = state.memory;
      if (state.mode !== 'memory' || memory.seqMode || !COLORS[color]) return;
      detachPreset({ pattern: true });
      if (memory.colors.includes(color) && memory.colors.length > 1) {
        memory.colors = memory.colors.filter(item => item !== color);
      } else if (!memory.colors.includes(color)) {
        memory.colors = memory.colors.concat(color);
      }
      notify();
    }

    function stepMemorySpeed(direction) {
      if (state.mode !== 'memory') return;
      detachPreset({ duration: true, pattern: true });
      state.memory.speed = Math.max(1, Math.min(21, state.memory.speed + direction));
      notify();
    }

    function stepMemoryCount(direction) {
      if (state.mode !== 'memory') return;
      detachPreset({ pattern: true });
      state.memory.count = Math.max(1, Math.min(50, state.memory.count + direction));
      notify();
    }

    function stepMemoryArea(direction) {
      if (state.mode !== 'memory') return;
      detachPreset({ gridSize: true, pattern: true });
      let index = AREA_VALUES.indexOf(state.memory.area);
      if (index < 0) index = 5;
      index = (index + direction + AREA_VALUES.length) % AREA_VALUES.length;
      state.memory.area = AREA_VALUES[index];
      notify();
    }

    function toggleLabels() {
      state.showLabels = !state.showLabels;
      notify();
    }

    async function showMemorySequence(sequence, color, generation) {
      for (const cell of sequence) {
        if (generation !== memoryGeneration || !state.memory.active) return false;
        state.memory.labels.set(cell.id, color);
        notify();
        await delay(memoryPulseTime());
        await delay(SHOW_STEP_GAP_MS);
      }
      return generation === memoryGeneration && state.memory.active;
    }

    async function startMemoryRound(generation) {
      const memory = state.memory;
      memory.labels.clear();
      memory.inQuiz = false;
      memory.roundSeq = [];
      state.target = '';
      state.phase = phases.SHOWING;
      state.feedback = 'Memoriza el patrón.';
      state.round++;
      notify();

      let pool = preparePresetPool(memoryPool());
      if (!pool.length) pool = shuffle(cells);
      memoryRoundStatsContext = resultContext();

      if (!memory.seqMode) {
        const colors = memory.colors.length ? memory.colors.slice() : ['green'];
        const groups = Object.fromEntries(colors.map(color => [color, []]));
        const total = Math.min(memory.count, pool.length);
        const perColor = Math.floor(total / colors.length);
        let remainder = total % colors.length;
        let offset = 0;
        colors.forEach(color => {
          const take = perColor + (remainder > 0 ? 1 : 0);
          remainder = Math.max(0, remainder - 1);
          groups[color] = pool.slice(offset, offset + take);
          offset += take;
        });
        Object.entries(groups).forEach(([color, group]) =>
          group.forEach(cell => memory.labels.set(cell.id, color)));
        notify();
        await delay(memoryPulseTime());
        if (generation !== memoryGeneration || !memory.active) return;
        memory.labels.clear();
        const availableColors = colors.filter(color => groups[color].length);
        if (!availableColors.length) return;
        const target = randomChoice(availableColors);
        memory.currentTarget = target;
        memory.roundSeq = groups[target].map(cell => cell.id);
        memory.inQuiz = true;
        state.target = target;
        state.phase = phases.ANSWERING;
        state.feedback = `Selecciona las celdas ${target}; el orden no importa.`;
        notify();
        return;
      }

      let forward = memory.orderFwd;
      let backward = memory.orderBwd;
      if (!forward && !backward) {
        forward = true;
        memory.orderFwd = true;
      }
      const base = pool.slice(0, Math.max(1, memory.count));
      if (forward && !backward) {
        if (!await showMemorySequence(base, 'green', generation)) return;
        await delay(LAST_CLICK_LINGER);
        memory.labels.clear();
        memory.roundSeq = base.map(cell => cell.id);
        state.target = '→';
      } else if (backward && !forward) {
        if (!await showMemorySequence(base, 'red', generation)) return;
        await delay(LAST_CLICK_LINGER);
        memory.labels.clear();
        memory.roundSeq = base.map(cell => cell.id).reverse();
        state.target = '←';
      } else {
        const first = base;
        let rest = pool.filter(cell => !first.some(firstCell => firstCell.id === cell.id));
        if (rest.length < memory.count) {
          rest = rest.concat(shuffle(cells).filter(cell =>
            !first.some(firstCell => firstCell.id === cell.id) &&
            !rest.some(restCell => restCell.id === cell.id)));
        }
        const second = rest.slice(0, Math.max(1, memory.count));
        if (!await showMemorySequence(first, 'green', generation)) return;
        if (!await showMemorySequence(second, 'red', generation)) return;
        await delay(FADE_MS);
        memory.labels.clear();
        memory.roundSeq = first.map(cell => cell.id).concat(second.map(cell => cell.id).reverse());
        state.target = '↔';
      }
      if (generation !== memoryGeneration || !memory.active) return;
      memory.inQuiz = true;
      state.phase = phases.ANSWERING;
      state.feedback = 'Pulsa las celdas en el orden exacto.';
      notify();
    }

    function resolveMemoryRound(result) {
      const resolve = memoryRoundResolve;
      memoryRoundResolve = null;
      state.memory.inQuiz = false;
      if (!resolve) return;
      requestAnimationFrame(() => requestAnimationFrame(() =>
        setTimeout(() => resolve(result), LAST_CLICK_LINGER)));
    }

    function finishMemoryRound(correct) {
      recordResult(correct, memoryRoundStatsContext);
      state.phase = correct ? phases.CORRECT : phases.ERROR;
      state.feedback = correct ? 'Respuesta correcta.' : 'Respuesta incorrecta.';
      notify();
      resolveMemoryRound(correct ? 'success' : 'fail');
    }

    function clickMemoryCell(cell) {
      const memory = state.memory;
      if (memory.area === 'M' && !memory.active && !memory.inQuiz) {
        if (memory.manualPool.has(cell.id)) memory.manualPool.delete(cell.id);
        else memory.manualPool.add(cell.id);
        notify();
        return;
      }
      if (memory.area !== 'M' && !memory.active && !memory.inQuiz) {
        memory.centerRow = cell.row;
        memory.centerCol = cell.col;
        state.feedback = `Área centrada en ${cell.label}.`;
        notify();
        return;
      }
      if (!memory.inQuiz) return;
      if (memory.seqMode) {
        if (cell.id === memory.roundSeq[0]) {
          memory.labels.set(cell.id, 'green');
          memory.roundSeq.shift();
          notify();
          if (!memory.roundSeq.length) finishMemoryRound(true);
        } else {
          memory.labels.set(cell.id, 'red');
          finishMemoryRound(false);
        }
        return;
      }
      if (memory.labels.get(cell.id) === 'green') return;
      const index = memory.roundSeq.indexOf(cell.id);
      if (index >= 0) {
        memory.labels.set(cell.id, 'green');
        memory.roundSeq.splice(index, 1);
        notify();
        if (!memory.roundSeq.length) finishMemoryRound(true);
      } else {
        memory.labels.set(cell.id, 'red');
        finishMemoryRound(false);
      }
    }

    async function memoryLoop(generation) {
      const memory = state.memory;
      while (memory.active && generation === memoryGeneration) {
        await startMemoryRound(generation);
        if (generation !== memoryGeneration) return;
        if (memory.inQuiz) {
          const result = await new Promise(resolve => { memoryRoundResolve = resolve; });
          if (generation !== memoryGeneration || result === 'aborted') return;
        }
        await delay(FADE_MS);
        if (generation !== memoryGeneration) return;
        memory.labels.clear();
        state.phase = phases.FINISHED;
        state.feedback = 'Ronda terminada.';
        notify();
        await delay(LAST_CLICK_LINGER);
        applyPendingMemoryMode();
        await delay(INTER_ROUND_MS);
      }
    }

    function startMemoryLoop() {
      const memory = state.memory;
      if (memory.active) return;
      if (memory.seqMode && !memory.orderFwd && !memory.orderBwd) {
        memory.orderFwd = true;
      }
      if (memory.area === 'M' && !memory.manualPool.size) memory.area = '6';
      memoryGeneration++;
      memory.active = true;
      memoryLoop(memoryGeneration);
    }

    function nextRound() {
      if (state.mode !== 'memory') {
        clearFeedbackTimer();
        if (state.script.challenge) {
          clearScriptVisuals();
          nextChallengeTarget();
        }
        notify();
        return;
      }
      clearFeedbackTimer();
      abortMemoryRound();
      applyPendingMemoryMode();
      clearMemoryVisuals();
      state.transport = transport.PLAYING;
      startMemoryLoop();
      notify();
    }

    function memorySpeedForDuration(duration) {
      const target = Array.isArray(duration) ? duration[0] : duration;
      if (!target) return state.memory.speed;
      let bestSpeed = 1;
      let bestDistance = Infinity;
      for (let speed = 1; speed <= 21; speed++) {
        const milliseconds = speed === 1 ? 250 : 500 * (speed - 1);
        const distance = Math.abs(milliseconds - target);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSpeed = speed;
        }
      }
      return bestSpeed;
    }

    function applyPreset(id) {
      const preset = RT.GridTrainerPresets.get(id);
      if (!preset) return false;

      stop();
      state.activePresetId = preset.id;
      state.presetGridSize = preset.gridSize;
      state.presetDuration = preset.duration;
      state.presetPattern = preset.pattern;
      state.presetSpecialEffects = preset.specialEffect.slice();
      state.mode = preset.mode;
      state.script.highlight = null;
      state.script.wrong.clear();
      state.script.locked.clear();
      state.script.allLocked = false;
      state.script.pattern = null;
      state.script.challenge = false;
      state.target = '–';
      resetPatternProgress();

      if (preset.mode === 'memory') {
        const sequence = preset.sequenceMode;
        state.memory.pendingSeqMode = undefined;
        state.memory.count = preset.cellCount;
        state.memory.speed = memorySpeedForDuration(preset.duration);
        state.memory.colors = ['green'];
        state.memory.seqMode = sequence !== 'free';
        state.memory.orderFwd = sequence === 'forward' || sequence === 'combined';
        state.memory.orderBwd = sequence === 'backward' || sequence === 'combined';
        state.memory.centerRow = 6;
        state.memory.centerCol = 6;
        state.phase = phases.CONFIGURING;
        state.feedback = `${preset.title}: ${preset.description}. Pulsa Play para comenzar.`;
      } else {
        state.script.pattern = preset.pattern;
        state.script.challenge = preset.challengeEnabled;
        if (preset.pattern === 'zig') generateZig();
        if (preset.pattern === 'ring') initRingCombos();
        if (preset.pattern === 'spiral') buildSpiralSequence();
        if (preset.challengeEnabled) nextChallengeTarget();
        else {
          state.phase = phases.CONFIGURING;
          state.feedback = `${preset.title}: ${preset.description}. Pulsa Play cuando quieras.`;
        }
      }
      state.transport = transport.STOPPED;
      notify();
      return true;
    }

    function destroy() {
      stop();
      state.script.zen = false;
    }

    return {
      cells: () => cells.slice(),
      colors: COLORS,
      exercises: EXERCISES,
      presets,
      comboStats,
      memoryPool,
      memoryAreaSet,
      trainingAreaSet,
      difficultyBucket,
      activePreset,
      applyPreset,
      play,
      pause,
      stop,
      nextRound,
      destroy,
      setMode,
      selectExercise,
      clickCell,
      togglePattern,
      toggleChallenge,
      toggleAll,
      toggleLockMode,
      toggleRandom,
      toggleInvert,
      toggleZen,
      stepScriptSpeed,
      setZigAmp,
      toggleZigDirection,
      toggleZigOrientation,
      toggleMemorySequence,
      toggleMemoryOrder,
      toggleMemoryColor,
      stepMemorySpeed,
      stepMemoryCount,
      stepMemoryArea,
      toggleLabels
    };
  }

  RT.GridTrainerEngine = {
    create,
    COLORS,
    EXERCISES,
    SCRIPT_SPEEDS,
    AREA_VALUES
  };
})(window.RT);
