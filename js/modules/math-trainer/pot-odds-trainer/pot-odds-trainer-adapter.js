'use strict';

(function (RT) {
  function create(mathUI, potUI) {
    let hosts = null;
    let active = 'math';
    function renderTabs() {
      const root = document.createElement('div');
      root.className = 'math-trainer-subtabs';
      [['math', 'Math Trainer'], ['pot-odds-trainer', 'Pot Odds Trainer']]
        .forEach(([id, label]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn range-filter-btn';
          button.classList.toggle('is-active', active === id);
          button.textContent = label;
          button.addEventListener('click', () => switchTo(id));
          root.appendChild(button);
        });
      return root;
    }
    function currentUI() { return active === 'math' ? mathUI : potUI; }
    function switchTo(next) {
      if (!hosts || next === active || !['math','pot-odds-trainer'].includes(next)) return;
      currentUI().unmount();
      active = next;
      currentUI().mount(hosts);
    }
    return {
      mount(nextHosts) {
        hosts = nextHosts;
        currentUI().mount(hosts);
      },
      unmount() {
        currentUI().unmount();
        hosts = null;
      },
      renderTabs,
      handleKey(key) {
        return active === 'math'
          ? null
          : potUI.handleKey(key);
      },
      get active() { return active; }
    };
  }

  RT.PotOddsTrainerAdapter = { create };
})(window.RT);
