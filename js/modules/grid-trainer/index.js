'use strict';

(function (RT) {
  const store = RT.GridTrainerState.create();
  const stats = RT.GridTrainerStats.create();
  const engine = RT.GridTrainerEngine.create(store, stats);
  const ui = RT.GridTrainerUI.create(store, engine, stats);

  RT.GridTrainer = { store, stats, engine, ui };

  RT.Modules.register({
    id: 'grid-trainer',
    label: 'Grid Trainer',
    mount(hosts) {
      ui.mount(hosts);
    },
    unmount() {
      ui.unmount();
    },
    handleKey(key) {
      const normalized = String(key || '').toLowerCase();
      if (normalized === 'n') engine.nextRound();
      else if (normalized === 'enter' || normalized === ' ') engine.play();
      else if (normalized === 'p') engine.pause();
      else if (normalized === 'r') engine.stop();
      else if (normalized === 'escape') {
        if (store.state.script.zen) engine.toggleZen();
        else engine.stop();
      }
      else return false;
      return true;
    }
  });
})(window.RT);
