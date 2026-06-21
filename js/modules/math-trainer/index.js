'use strict';

(function (RT) {
  const store = RT.MathTrainerState.create();
  const stats = RT.MathTrainerStats.create();
  const engine = RT.MathTrainerEngine.create(store, stats);
  const potOddsStore = RT.PotOddsTrainerState.create();
  const potOddsEngine = RT.PotOddsTrainerEngine.create(potOddsStore);
  let adapter = null;
  const renderSubtabs = () => adapter.renderTabs();
  const ui = RT.MathTrainerUI.create(store, engine, stats, renderSubtabs);
  const potOddsUI = RT.PotOddsTrainerUI.create(
    potOddsStore, potOddsEngine, renderSubtabs
  );
  adapter = RT.PotOddsTrainerAdapter.create(ui, potOddsUI);
  RT.MathTrainer = {
    store, stats, engine, ui, adapter,
    potOddsTrainer: {
      store: potOddsStore,
      engine: potOddsEngine,
      ui: potOddsUI
    }
  };
  RT.Modules.register({
    id: 'math-trainer',
    label: 'Math Trainer',
    mount(hosts) { adapter.mount(hosts); },
    unmount() { adapter.unmount(); },
    handleKey(key) {
      if (adapter.active === 'pot-odds-trainer') return adapter.handleKey(key);
      const state = store.state;
      if (state.session.status !== 'running') {
        if (key === 'Enter' || key === ' ') { engine.start(); return true; }
        return false;
      }
      const item = state.session.current;
      if (!item) return false;
      if (item.type === 'flashcard') return false;
      if (/^[0-9.:/%-]$/.test(key)) {
        engine.input(state.session.input + key);
        ui.flashKey(key);
        return true;
      }
      if (key === 'Backspace') {
        engine.input(state.session.input.slice(0, -1));
        ui.flashKey('back');
        return true;
      }
      if (key === 'Escape') { engine.stop(); return true; }
      if (key === 'Enter') {
        engine.answer(state.session.input);
        ui.flashKey('submit');
        return true;
      }
      return false;
    }
  });
})(window.RT);
