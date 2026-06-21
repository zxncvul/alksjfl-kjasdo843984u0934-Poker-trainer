'use strict';

(function (RT) {
  function create(onTimeout) {
    let interval = null;
    let startedAt = 0;
    let countdownEnd = 0;
    let running = false;
    let elapsedMs = 0;
    let remainingMs = 0;
    const listeners = new Set();
    const snapshot = () => ({
      running,
      elapsedMs: running ? Date.now() - startedAt : elapsedMs,
      remainingMs: running && countdownEnd
        ? Math.max(0, countdownEnd - Date.now())
        : remainingMs
    });
    const notify = () => listeners.forEach(listener => listener(snapshot()));
    function stop() {
      if (running) {
        elapsedMs = Math.max(0, Date.now() - startedAt);
        remainingMs = countdownEnd
          ? Math.max(0, countdownEnd - Date.now())
          : 0;
      }
      clearInterval(interval);
      interval = null;
      running = false;
      notify();
    }
    function start(countdownSeconds) {
      clearInterval(interval);
      interval = null;
      running = true;
      startedAt = Date.now();
      countdownEnd = countdownSeconds > 0 ? startedAt + countdownSeconds * 1000 : 0;
      elapsedMs = 0;
      remainingMs = countdownSeconds > 0 ? countdownSeconds * 1000 : 0;
      interval = setInterval(() => {
        notify();
        if (countdownEnd && Date.now() >= countdownEnd) {
          stop();
          if (typeof onTimeout === 'function') onTimeout();
        }
      }, 100);
      notify();
    }
    function reset() {
      clearInterval(interval);
      interval = null;
      running = false;
      startedAt = 0;
      countdownEnd = 0;
      elapsedMs = 0;
      remainingMs = 0;
      notify();
    }
    return {
      start, stop, reset, snapshot,
      subscribe(listener) {
        listeners.add(listener);
        listener(snapshot());
        return () => listeners.delete(listener);
      },
      destroy() { reset(); listeners.clear(); }
    };
  }
  RT.MathTrainerTimer = { create };
})(window.RT);
