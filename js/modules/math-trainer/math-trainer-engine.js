'use strict';

(function (RT) {
  const D = () => RT.MathTrainerDatasets;
  const G = RT.MathTrainerGenerators;
  const FUGUES_SPEEDS = { '1H': 200, '2H': 500, '3H': 1000, '4H': 2000, '5H': 5000, '6H': 10000 };
  const MAX_NUMA_CHAIN = 12;
  const MAX_UNBOUNDED_NUMA_POOL = 50000;

  function setOf(values) {
    if (values && typeof values[Symbol.iterator] === 'function') return new Set(values);
    return new Set();
  }
  function cloneConfig(config) {
    return {
      sessionSize: config.sessionSize,
      chrono: config.chrono,
      countdown: config.countdown,
      numa: Object.assign({}, config.numa, {
        operations: setOf(config.numa.operations),
        numbers: setOf(config.numa.numbers),
        pokerLevels: setOf(config.numa.pokerLevels),
        modes: setOf(config.numa.modes)
      }),
      potOdds: Object.assign({}, config.potOdds, {
        outs: setOf(config.potOdds.outs),
        domains: setOf(config.potOdds.domains),
        streets: setOf(config.potOdds.streets)
      }),
      equity: Object.assign({}, config.equity, {
        practicalTypes: setOf(config.equity.practicalTypes),
        ranges: setOf(config.equity.ranges),
        bets: setOf(config.equity.bets),
        theoryFormats: setOf(config.equity.theoryFormats),
        theoryTypes: setOf(config.equity.theoryTypes)
      }),
      spr: Object.assign({}, config.spr, {
        stacks: setOf(config.spr.stacks),
        pots: setOf(config.spr.pots),
        flashcards: setOf(config.spr.flashcards)
      })
    };
  }

  function create(store, stats) {
    const { state, phases } = store;
    let fuguesTimeout = null;
    let feedbackTimeout = null;
    const timer = RT.MathTrainerTimer.create(timeout);

    function notify() { store.notify(); }
    function currentPreset() { return RT.MathTrainerPresets.get(state.activePresetId); }
    function difficulty() { return currentPreset()?.difficulty || 'Manual'; }
    function clearFugues() { clearTimeout(fuguesTimeout); fuguesTimeout = null; }
    function clearFeedback() { clearTimeout(feedbackTimeout); feedbackTimeout = null; }
    function configChanged(message) {
      state.activePresetId = null;
      if (state.session.status === 'idle') state.phase = phases.CONFIGURING;
      state.feedback = message || 'Configuración manual actualizada.';
      notify();
    }

    function potOddsPool(config) {
      const source = D()['potOddsPreguntas.json'].potOddsOps;
      const percent = config.domains.has('raw_percent');
      const odds = config.domains.has('raw_odds');
      return source.filter(item => {
        if (!config.outs.has(item.outs) || !config.streets.has(item.street)) return false;
        if (item.domain === 'raw_percent') return percent;
        if (item.domain === 'raw_odds') return odds;
        if (item.domain !== 'conversion' || !config.conversion) return false;
        return (item.format === 'percent_to_odds' && percent) ||
          (item.format === 'odds_to_percent' && odds);
      }).map(item => ({
        type: 'input', category: 'pot-odds', dataset: item.domain,
        question: item.question, answer: item.answer, accept: [item.answer]
      }));
    }

    function equityPool(config) {
      const result = [];
      if (config.practical) {
        D()['EquitiPracticoPreguntas.json'].forEach(item => {
          if (!config.practicalTypes.has(item.pregunta_tipo) ||
              !config.ranges.has(item.tags.grupo_bote) ||
              !config.bets.has(item.apuesta_frac)) return;
          const answer = item.pregunta_tipo === 'relacion'
            ? item.respuesta_ratio : item.respuesta_percent;
          result.push({ type: 'input', category: 'equity', dataset: 'practical',
            question: item.pregunta, answer, accept: [answer] });
        });
      }
      if (config.theory) {
        D()['EquitiTeoricoPreguntas.json'].forEach(item => {
          if (!config.theoryTypes.has(item.pregunta_tipo)) return;
          const accept = [];
          if (item.pregunta_tipo === 'viceversa_eq' ||
              item.pregunta_tipo === 'viceversa_ratio') {
            if (item.respuesta_frac) accept.push(item.respuesta_frac);
          } else {
            if (config.theoryFormats.has('percent') && item.respuesta_percent) {
              accept.push(item.respuesta_percent);
            }
            if (config.theoryFormats.has('ratio') && item.respuesta_ratio) {
              accept.push(item.respuesta_ratio);
            }
          }
          if (accept.length) result.push({
            type: 'input', category: 'equity', dataset: 'theory',
            question: item.pregunta, answer: accept[0], accept
          });
        });
      }
      return result;
    }

    function sprPool(config) {
      const result = [];
      if (config.practical) {
        D()['SprPracticoPreguntas.json'].forEach(item => {
          if (!config.stacks.has(item.tags.grupo_stack) ||
              !config.pots.has(item.tags.grupo_bote)) return;
          result.push({
            type: 'numeric', category: 'spr', dataset: 'practical',
            question: item.pregunta, answer: item.respuesta,
            numericTarget: item.spr, decimals: 1
          });
        });
      }
      const files = {
        interpretacion: 'SprInterpretacionPreguntas.json',
        ejemplos: 'SprEjemplosPreflop.json',
        manos: 'SprManosPreguntas.json',
        teoria: 'SprTeoricoPreguntas.json'
      };
      config.flashcards.forEach(key => {
        (D()[files[key]] || []).forEach(item => result.push({
          type: 'flashcard', category: 'spr', dataset: key,
          question: item.pregunta, answer: item.respuesta, accept: [item.respuesta]
        }));
      });
      return result;
    }

    function numaPoolUpperBound(config) {
      const operations = config.operations.size;
      const numbers = config.numbers.size;
      const range = Math.abs(config.end - config.start) + 1;
      let total = numbers;
      for (let depth = 1; depth < config.chain; depth++) {
        total *= operations * (depth % 2 === 1 ? range : numbers);
        if (total > MAX_UNBOUNDED_NUMA_POOL) return total;
      }
      return total;
    }

    function numaPool(config, sessionSize) {
      if (!Number.isSafeInteger(config.chain) ||
          config.chain < 2 ||
          config.chain > MAX_NUMA_CHAIN) return [];
      if (sessionSize === 0 &&
          numaPoolUpperBound(config) > MAX_UNBOUNDED_NUMA_POOL) return [];
      const generationLimit = sessionSize > 0
        ? Math.max(200, sessionSize * 6)
        : Number.POSITIVE_INFINITY;
      return G.generateNuma(config, generationLimit)
        .concat(G.generatePoker(config, D().pokerOps));
    }

    function buildPool(snapshot) {
      let pool = state.category === 'pot-odds' ? potOddsPool(snapshot.potOdds)
        : state.category === 'equity' ? equityPool(snapshot.equity)
        : state.category === 'spr' ? sprPool(snapshot.spr)
        : numaPool(snapshot.numa, snapshot.sessionSize);
      const modes = snapshot.numa.modes;
      if (state.category === 'numa' && modes.has('Surges')) {
        pool.sort((a, b) => String(a.question).length - String(b.question).length ||
          Math.abs(Number(a.numericTarget) || 0) - Math.abs(Number(b.numericTarget) || 0));
      } else if (state.category !== 'numa' || modes.has('Random')) {
        pool = G.shuffle(pool);
      }
      if (snapshot.sessionSize > 0) pool = pool.slice(0, snapshot.sessionSize);
      return pool;
    }

    function mirrorQuestion(item) {
      if (state.category !== 'numa' ||
          !state.session.snapshot.numa.modes.has('Mirror') ||
          item.type === 'flashcard') return item;
      const parts = String(item.question).split(/([+\-×÷])/);
      const values = parts.filter((_, index) => index % 2 === 0).reverse();
      const operations = parts.filter((_, index) => index % 2 === 1).reverse();
      const question = values.reduce((text, value, index) =>
        text + value + (operations[index] || ''), '');
      const target = evaluateExpression(question);
      return Object.assign({}, item, {
        question,
        answer: String(target),
        numericTarget: target
      });
    }

    function evaluateExpression(expression) {
      const parts = String(expression).split(/([+\-×÷])/);
      let value = Number(parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        value = G.calc(value, parts[i], Number(parts[i + 1]));
      }
      return value;
    }

    function showNext() {
      clearFugues();
      clearFeedback();
      const session = state.session;
      let reviewing = false;
      if (!session.queue.length && session.retryQueue.length) {
        session.queue = session.retryQueue.splice(0);
        reviewing = true;
      }
      if (!session.queue.length) return finish();
      session.current = mirrorQuestion(session.queue.shift());
      session.input = '';
      session.answerLocked = false;
      session.questionStartedAt = Date.now();
      session.revealed = !(
        state.category === 'numa' && session.snapshot.numa.modes.has('Fugues'));
      state.phase = reviewing ? phases.REVIEW : phases.QUESTION;
      state.feedback = session.revealed
        ? 'Responde y confirma.'
        : 'Memoriza la operación.';
      if (!session.revealed) {
        const delay = FUGUES_SPEEDS[session.snapshot.numa.fuguesSpeed] || 200;
        fuguesTimeout = setTimeout(() => {
          session.revealed = true;
          state.feedback = 'La operación se ha ocultado. Responde.';
          notify();
        }, delay);
      }
      notify();
    }

    function start() {
      stop(false);
      const snapshot = cloneConfig(state.config);
      if (state.category === 'numa' &&
          (!Number.isSafeInteger(snapshot.numa.chain) ||
           snapshot.numa.chain < 2 ||
           snapshot.numa.chain > MAX_NUMA_CHAIN)) {
        state.feedback = `La cadena debe estar entre 2 y ${MAX_NUMA_CHAIN}.`;
        state.phase = phases.CONFIGURING;
        notify();
        return false;
      }
      if (state.category === 'numa' && snapshot.sessionSize === 0 &&
          numaPoolUpperBound(snapshot.numa) > MAX_UNBOUNDED_NUMA_POOL) {
        state.feedback = 'El pool completo es demasiado grande. Reduce cadena, rango o números.';
        state.phase = phases.CONFIGURING;
        notify();
        return false;
      }
      const pool = buildPool(snapshot);
      if (!pool.length) {
        state.feedback = 'La configuración no produce ejercicios.';
        state.phase = phases.CONFIGURING;
        notify();
        return false;
      }
      Object.assign(state.session, {
        status: 'running',
        snapshot,
        statsContext: {
          category: state.category,
          difficulty: difficulty(),
          presetId: state.activePresetId
        },
        queue: pool.slice(), retryQueue: [],
        original: pool.slice(), current: null, input: '', answerLocked: false,
        history: [],
        played: 0, correct: 0, failed: 0, startedAt: Date.now(),
        questionStartedAt: 0, elapsedMs: 0, remainingMs: snapshot.countdown * 1000,
        lastTimeMs: 0, totalCorrectTimeMs: 0
      });
      if (snapshot.chrono || snapshot.countdown > 0) timer.start(snapshot.countdown);
      else timer.reset();
      showNext();
      return true;
    }

    function answer(value, known) {
      const session = state.session;
      const item = session.current;
      if (session.status !== 'running' || !item || session.answerLocked) return false;
      if (state.category === 'numa' &&
          session.snapshot.numa.modes.has('Fugues') &&
          !session.revealed) return false;
      session.answerLocked = true;
      const correct = item.type === 'flashcard'
        ? known === true
        : RT.MathTrainerValidators.validate(item, value);
      const timeMs = Math.max(0, Date.now() - session.questionStartedAt);
      session.played++;
      session.lastTimeMs = timeMs;
      if (correct) {
        session.correct++;
        session.totalCorrectTimeMs += timeMs;
        state.phase = phases.CORRECT;
        state.feedback = 'Correcto.';
      } else {
        session.failed++;
        session.retryQueue.push(item);
        state.phase = phases.ERROR;
        state.feedback = `Respuesta: ${item.answer}`;
      }
      session.history.unshift({
        question: item.question,
        answer: item.type === 'flashcard' ? (known ? 'Sabía' : 'Repetir') : String(value),
        correctAnswer: item.answer,
        correct
      });
      stats.record(correct, Object.assign({}, session.statsContext, { timeMs }));
      notify();
      clearFeedback();
      feedbackTimeout = setTimeout(() => {
        feedbackTimeout = null;
        if (session.status === 'running' && session.current === item) showNext();
      }, 350);
      return correct;
    }

    function finish() {
      clearFugues();
      clearFeedback();
      timer.stop();
      state.session.status = 'finished';
      state.session.current = null;
      state.session.answerLocked = true;
      state.phase = phases.FINISHED;
      state.feedback = 'Sesión completada.';
      notify();
    }

    function timeout() {
      if (state.session.status !== 'running') return;
      clearFugues();
      clearFeedback();
      state.session.status = 'timeout';
      state.session.current = null;
      state.session.answerLocked = true;
      state.phase = phases.TIMEOUT;
      state.feedback = 'Tiempo agotado.';
      notify();
    }

    function stop(shouldNotify = true) {
      clearFugues();
      clearFeedback();
      timer.stop();
      state.session.status = 'idle';
      state.session.current = null;
      state.session.answerLocked = true;
      state.session.queue = [];
      state.session.retryQueue = [];
      if (shouldNotify) {
        state.phase = phases.CONFIGURING;
        state.feedback = 'Sesión detenida.';
        notify();
      }
    }

    function repeat() {
      if (!state.session.original.length) return start();
      const snapshot = state.session.snapshot;
      const statsContext = state.session.statsContext;
      const original = state.session.original.slice();
      stop(false);
      Object.assign(state.session, {
        status: 'running', snapshot, statsContext, original,
        queue: G.shuffle(original), retryQueue: [], current: null, input: '',
        answerLocked: false, history: [], played: 0,
        correct: 0, failed: 0, startedAt: Date.now(), questionStartedAt: 0,
        elapsedMs: 0, remainingMs: snapshot.countdown * 1000,
        lastTimeMs: 0, totalCorrectTimeMs: 0
      });
      if (snapshot.chrono || snapshot.countdown > 0) timer.start(snapshot.countdown);
      else timer.reset();
      showNext();
    }

    function applyPreset(id) {
      const preset = RT.MathTrainerPresets.get(id);
      if (!preset) return false;
      stop(false);
      state.activePresetId = preset.id;
      state.category = preset.category;
      const cfg = preset.config;
      state.config.sessionSize = cfg.sessionSize;
      if (preset.category === 'numa') {
        Object.assign(state.config.numa, cfg, {
          operations: setOf(cfg.operations), numbers: setOf(cfg.numbers),
          pokerLevels: setOf(cfg.pokerLevels), modes: setOf(cfg.modes)
        });
      } else if (preset.category === 'pot-odds') {
        Object.assign(state.config.potOdds, cfg, {
          outs: setOf(cfg.outs), domains: setOf(cfg.domains), streets: setOf(cfg.streets)
        });
      } else if (preset.category === 'equity') {
        Object.assign(state.config.equity, cfg, {
          practicalTypes: setOf(cfg.practicalTypes),
          ranges: setOf(cfg.ranges), bets: setOf(cfg.bets),
          theoryFormats: setOf(cfg.theoryFormats), theoryTypes: setOf(cfg.theoryTypes)
        });
      } else {
        Object.assign(state.config.spr, cfg, {
          stacks: setOf(cfg.stacks), pots: setOf(cfg.pots),
          flashcards: setOf(cfg.flashcards)
        });
      }
      state.phase = phases.READY;
      state.feedback = `${preset.title}: ${preset.description}. Pulsa Comenzar.`;
      notify();
      return true;
    }

    function setCategory(category) {
      if (!['numa','pot-odds','equity','spr'].includes(category)) return;
      stop(false);
      state.category = category;
      state.activePresetId = null;
      state.phase = phases.CONFIGURING;
      state.feedback = 'Configuración avanzada disponible.';
      notify();
    }

    function input(value) {
      if (state.session.status !== 'running' || !state.session.current ||
          state.session.current.type === 'flashcard' ||
          state.session.answerLocked) return;
      if (state.category === 'numa' &&
          state.session.snapshot.numa.modes.has('Fugues') &&
          !state.session.revealed) return;
      state.session.input = String(value);
      notify();
    }

    function destroy() { stop(false); timer.destroy(); }

    return {
      timer, start, stop, repeat, answer, input, applyPreset, setCategory,
      configChanged, buildPool: () => buildPool(cloneConfig(state.config)),
      currentPreset, destroy
    };
  }

  RT.MathTrainerEngine = {
    create, cloneConfig, FUGUES_SPEEDS, MAX_NUMA_CHAIN, MAX_UNBOUNDED_NUMA_POOL
  };
})(window.RT);
