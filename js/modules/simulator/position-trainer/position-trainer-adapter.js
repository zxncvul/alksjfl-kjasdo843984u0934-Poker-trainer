'use strict';

(function (RT) {
  const Engine = RT.SimulatorPositionEngine;
  const State = RT.SimulatorPositionState;
  const state = State.state;
  const REVIEW_MS = 5000;
  let timer = null;
  let reviewTimeout = null;
  let reviewInterval = null;
  let reviewDeadline = 0;

  function emit() {
    RT.emit('sim:changed');
  }

  function clearTimer() {
    if (timer) window.clearInterval(timer);
    timer = null;
    state.timerRunning = false;
  }

  function clearReviewTimers() {
    if (reviewTimeout) window.clearTimeout(reviewTimeout);
    if (reviewInterval) window.clearInterval(reviewInterval);
    reviewTimeout = null;
    reviewInterval = null;
    reviewDeadline = 0;
    state.reviewRemaining = 0;
    state.reviewPaused = false;
  }

  function refreshReviewRemaining() {
    if (!reviewDeadline || state.reviewPaused) return;
    state.reviewRemaining = Math.max(0, reviewDeadline - Date.now());
    emit();
  }

  function armReview(ms) {
    clearReviewTimers();
    reviewDeadline = Date.now() + Math.max(0, ms);
    state.reviewRemaining = Math.max(0, ms);
    state.reviewPaused = false;
    reviewInterval = window.setInterval(refreshReviewRemaining, 500);
    reviewTimeout = window.setTimeout(() => {
      clearReviewTimers();
      nextRound(true);
    }, Math.max(0, ms));
  }

  function startTimer() {
    clearTimer();
    if (state.config.timerEnabled === false) {
      state.remaining = 0;
      return;
    }
    state.remaining = state.config.timerSec;
    if (state.config.timerSec <= 0) return;
    state.timerRunning = true;
    timer = window.setInterval(() => {
      if (state.phase !== 'question') {
        clearTimer();
        return;
      }
      state.remaining = Math.max(0, Math.round((state.remaining - 1) * 10) / 10);
      if (state.remaining <= 0) {
        clearTimer();
        answerTimeout();
      } else {
        emit();
      }
    }, 1000);
  }

  function ensureRound() {
    if (!state.round) nextRound(false);
  }

  function nextRound(shouldEmit = true) {
    clearTimer();
    clearReviewTimers();
    const round = Engine.generateRound(state.config);
    const error = Engine.validateRound(round);
    state.round = round;
    state.phase = error ? 'error' : 'question';
    state.selected = null;
    state.feedback = error || '';
    state.lastError = error || '';
    if (!error) startTimer();
    if (shouldEmit) emit();
  }

  function repeatRound() {
    ensureRound();
    clearTimer();
    clearReviewTimers();
    state.phase = 'question';
    state.selected = null;
    state.feedback = '';
    state.lastError = '';
    startTimer();
    emit();
  }

  function setMode(mode) {
    if (!Engine.MODES.includes(mode)) return;
    state.config.mode = mode;
    State.persistConfig();
    nextRound(true);
  }

  function setPlayers(value) {
    state.config.players = Math.max(2, Math.min(10, Number(value) || 6));
    State.persistConfig();
    nextRound(true);
  }

  function stepPlayers(delta) {
    setPlayers(state.config.players + delta);
  }

  function setRandomPlayers(enabled) {
    state.config.randomPlayers = enabled === true;
    State.persistConfig();
    nextRound(true);
  }

  function setTimerSec(value) {
    state.config.timerSec = Math.max(3, Math.min(60, Number(value) || 10));
    State.persistConfig();
    if (state.phase === 'question' && state.config.timerEnabled !== false) {
      state.remaining = Math.min(state.remaining || state.config.timerSec, state.config.timerSec);
    }
    emit();
  }

  function stepTimer(delta) {
    setTimerSec(state.config.timerSec + delta);
  }

  function setTimerEnabled(enabled) {
    state.config.timerEnabled = enabled !== false;
    State.persistConfig();
    if (state.phase === 'question') startTimer();
    else if (state.config.timerEnabled === false) {
      clearTimer();
      state.remaining = 0;
    }
    emit();
  }

  function setNamingSet(value) {
    state.config.namingSet = value === 'A' ? 'A' : 'B';
    State.persistConfig();
    nextRound(true);
  }

  function answerSeat(seat) {
    ensureRound();
    if (state.phase !== 'question' || !state.round) return;
    if (!Engine.seatCanAnswer(state.round, seat)) return;
    const ok = seat === state.round.correctSeat;
    state.selected = String(seat);
    finish(ok, ok ? 'Correcto.' : `Incorrecto. Era ${seatLabel(state.round, state.round.correctSeat)}.`);
  }

  function answerPosition(label) {
    ensureRound();
    if (state.phase !== 'question' || !state.round) return;
    if (!Engine.positionCanAnswer(state.round, label)) return;
    const ok = label === state.round.correctLabel;
    state.selected = label;
    finish(ok, ok ? 'Correcto.' : `Incorrecto. Era ${state.round.correctLabel}.`);
  }

  function answerIp(choice) {
    ensureRound();
    if (state.phase !== 'question' || !state.round) return;
    if (!Engine.ipCanAnswer(state.round)) return;
    const clean = choice === 'IP' ? 'IP' : 'OOP';
    const ok = clean === state.round.correctChoice;
    state.selected = clean;
    finish(ok, ok ? 'Correcto.' : `Incorrecto. Era ${state.round.correctChoice}.`);
  }

  function answerTimeout() {
    if (state.phase !== 'question' || !state.round) return;
    finish(false, 'Tiempo agotado.');
  }

  function fail(message) {
    finish(false, message || 'Incorrecto.');
  }

  function finish(ok, message) {
    clearTimer();
    State.recordResult(ok, state.round, message);
    if (ok) {
      nextRound(true);
      return;
    }
    state.phase = 'feedback';
    armReview(REVIEW_MS);
    emit();
  }

  function pauseReview() {
    if (state.phase !== 'feedback' || state.reviewPaused) return;
    state.reviewRemaining = Math.max(0, reviewDeadline - Date.now());
    state.reviewPaused = true;
    if (reviewTimeout) window.clearTimeout(reviewTimeout);
    if (reviewInterval) window.clearInterval(reviewInterval);
    reviewTimeout = null;
    reviewInterval = null;
    reviewDeadline = 0;
    emit();
  }

  function resumeReview() {
    if (state.phase !== 'feedback' || !state.reviewPaused) return;
    armReview(state.reviewRemaining || REVIEW_MS);
    emit();
  }

  function skipReview() {
    if (state.phase !== 'feedback') return;
    clearReviewTimers();
    nextRound(true);
  }

  function seatLabel(round, seat) {
    if (!round || seat == null) return 'el asiento correcto';
    const label = round.labels[seat] || `asiento ${seat + 1}`;
    return `${label}`;
  }

  function stop(shouldEmit = true) {
    clearTimer();
    clearReviewTimers();
    State.resetRound();
    if (shouldEmit) emit();
  }

  function resetStats() {
    State.resetStats();
    emit();
  }

  function precision() {
    const total = state.stats.rounds;
    return total ? Math.round(state.stats.correct / total * 100) : 0;
  }

  function modeInstruction(mode = state.config.mode) {
    return {
      posToSeat: 'Lee la posicion preguntada y pulsa el asiento correcto. Las etiquetas se ocultan para entrenar visualizacion.',
      seatToPos: 'Se marca un asiento. Elige que posicion ocupa segun BTN, SB, BB y numero de jugadores.',
      seatIp: 'Se genera una accion preflop. Decide si el asiento marcado actuara IP u OOP postflop.',
      ipToSeat: 'Busca que jugador queda IP u OOP despues de la accion preflop y pulsa su asiento.',
      actionOrder: 'Identifica quien habla primero, segundo o despues, alternando preflop y postflop.',
      mixed: 'Cada ronda selecciona uno de los ejercicios de Position Trainer.'
    }[mode] || '';
  }

  function handleKey(key) {
    const k = String(key || '').toLowerCase();
    if (state.phase === 'feedback') {
      if (k === 'n') { skipReview(); return true; }
      if (k === 'r') { repeatRound(); return true; }
    }
    if (k === 'n') { nextRound(true); return true; }
    if (k === 'r') { repeatRound(); return true; }
    if (state.round && state.round.answerType === 'ip') {
      if (k === 'i') { answerIp('IP'); return true; }
      if (k === 'o') { answerIp('OOP'); return true; }
    }
    return false;
  }

  RT.SimulatorPosition = {
    state,
    ensureRound,
    nextRound,
    repeatRound,
    stop,
    setMode,
    setPlayers,
    stepPlayers,
    setRandomPlayers,
    setTimerSec,
    stepTimer,
    setTimerEnabled,
    setNamingSet,
    answerSeat,
    answerPosition,
    answerIp,
    pauseReview,
    resumeReview,
    skipReview,
    resetStats,
    precision,
    modeInstruction,
    handleKey,
    engine: Engine
  };
})(window.RT);
