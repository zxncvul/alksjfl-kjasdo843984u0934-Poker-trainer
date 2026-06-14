/* ============================================================================
 * table-view.js - Representación visual de la mesa 6-max.
 *
 * Consume RT.Simulator.tableState(), pero no modifica el simulador ni registra
 * eventos. simulator-ui.js decide cuándo mostrarla y cómo responder acciones.
 * ==========================================================================*/
'use strict';

(function (RT) {

  const SEAT_ACTION_LABEL = {
    fold: 'Fold', wait: 'Espera', decide: 'Decide…',
    OR: 'Open 2.5', '3BET': '3Bet', CALL: 'Call', '4BET': '4Bet',
    '5BETPLUS': '5Bet+', ALLIN: 'All-in', FOLD: 'Fold'
  };
  const AGGRESSIVE_ACTIONS = new Set(['OR', '3BET', '4BET', '5BETPLUS', 'ALLIN']);

  RT.SimulatorTableView = {
    create(options) {
      const { getTableView, actionLabel, actionColor } = options;

      function handCards(hand, small) {
        const wrap = document.createElement('div');
        wrap.className = 'sim-hand sim-hole-cards is-hero-cards' +
          (small ? ' sim-hand-sm' : '');
        const suited = hand.length === 3 && hand[2] === 's';
        const pair = hand.length === 2;
        const suits = pair || !suited ? ['\u2660', '\u2665'] : ['\u2660', '\u2660'];
        [hand[0], hand[1]].forEach((rank, index) => {
          const card = document.createElement('span');
          card.className = 'sim-card' +
            (suits[index] === '\u2665' ? ' is-red' : ' is-dark-suit');
          card.textContent = rank + suits[index];
          wrap.appendChild(card);
        });
        const tag = document.createElement('span');
        tag.className = 'sim-hand-tag';
        tag.textContent = hand;
        wrap.appendChild(tag);
        return wrap;
      }

      function hiddenCards(H, folded) {
        const cards = H.el('div', 'sim-hole-cards is-hidden-cards' +
          (folded ? ' is-removed' : ''));
        cards.setAttribute('aria-label', folded ? 'Cartas retiradas' : 'Dos cartas ocultas');
        cards.appendChild(H.el('span', 'sim-card-back'));
        cards.appendChild(H.el('span', 'sim-card-back'));
        return cards;
      }

      function hiddenBoard(H) {
        const board = H.el('div', 'sim-board');
        board.setAttribute('aria-label', 'Cinco cartas comunitarias ocultas');
        for (let i = 0; i < 5; i++) {
          board.appendChild(H.el('span', 'sim-board-card', '?'));
        }
        return board;
      }

      function blindMarker(H, type) {
        const marker = H.el('span', `sim-seat-marker is-blind is-${type.toLowerCase()}`);
        marker.setAttribute('aria-label', type === 'SB' ? 'Ciega pequeña' : 'Ciega grande');
        const chipCount = type === 'SB' ? 1 : 2;
        for (let i = 0; i < chipCount; i++) marker.appendChild(H.el('span', 'sim-blind-chip'));
        return marker;
      }

      function seatSlot(seat, index, situation) {
        if (getTableView() === 'fixed') return index;
        const heroIndex = RT.Hands.POSITIONS.indexOf(situation.hero);
        const seatIndex = RT.Hands.POSITIONS.indexOf(seat.pos);
        return (seatIndex - heroIndex + RT.Hands.POSITIONS.length) %
          RT.Hands.POSITIONS.length;
      }

      function renderTable(H, state) {
        const tableState = RT.Simulator.tableState();
        if (!tableState) return H.el('div');
        const situation = RT.Simulator.current;
        const table = H.el('div', 'sim-table ' +
          (getTableView() === 'fixed' ? 'is-fixed' : 'is-hero-bottom'));
        const felt = H.el('div', 'sim-felt');

        const center = H.el('div', 'sim-center');
        center.appendChild(H.el(
          'div',
          'sim-table-spot',
          situation.stage === 'or'
            ? `${situation.hero} · Open raise`
            : `${situation.hero} vs ${situation.villain} · Defensa ${situation.relative}`
        ));
        center.appendChild(H.el('div', 'sim-pot-label', 'BOTE'));
        center.appendChild(H.el('div', 'sim-pot', `${tableState.pot} bb`));
        center.appendChild(hiddenBoard(H));
        const line = renderActionLine(H, state);
        line.classList.add('is-inside-table');
        center.appendChild(line);
        felt.appendChild(center);

        tableState.seats.forEach((seat, index) => {
          const slot = seatSlot(seat, index, situation);
          const seatNode = H.el('div', `sim-seat sim-seat-slot-${slot}` +
            (seat.isHero ? ' is-hero' : '') +
            (seat.action === 'decide' ? ' is-active' : '') +
            (seat.action === 'wait' ? ' is-pending' : '') +
            (AGGRESSIVE_ACTIONS.has(seat.action) ? ' is-aggressor' : '') +
            (seat.action === 'fold' || seat.action === 'FOLD' ? ' is-folded' : ''));
          seatNode.setAttribute('aria-label',
            `${seat.isHero ? 'Hero, ' : ''}${seat.pos}, ${seat.stack} ciegas`);

          const head = H.el('div', 'sim-seat-head');
          head.appendChild(H.el('span', 'sim-seat-pos', seat.pos));
          if (seat.isHero) head.appendChild(H.el('span', 'sim-seat-hero', 'Hero'));
          seatNode.appendChild(head);
          seatNode.appendChild(H.el('div', 'sim-seat-stack', `${seat.stack} bb`));
          seatNode.appendChild(seat.isHero
            ? handCards(situation.hand, true)
            : hiddenCards(H, seat.action === 'fold' || seat.action === 'FOLD'));

          const label = seat.isHero && seat.action === 'decide'
            ? 'Tu turno'
            : (SEAT_ACTION_LABEL[seat.action] || seat.action);
          const action = H.el('div', 'sim-seat-action' +
            (seat.action === 'decide' ? ' is-decide' : '') +
            (seat.action === '3BET' ? ' is-aggro' : ''), label);
          const color = actionColor(seat.action);
          if (color && seat.action !== 'fold' && seat.action !== 'FOLD') {
            action.style.setProperty('--seat-accent', color);
            action.classList.add('has-accent');
          }
          seatNode.appendChild(action);
          if (seat.bet > 0) {
            seatNode.appendChild(H.el('div', 'sim-seat-bet', `${seat.bet} bb`));
          }
          if (seat.dealer) seatNode.appendChild(H.el('span', 'sim-seat-marker is-dealer', 'D'));
          if (seat.sb) seatNode.appendChild(blindMarker(H, 'SB'));
          if (seat.bb) seatNode.appendChild(blindMarker(H, 'BB'));
          felt.appendChild(seatNode);
        });

        table.appendChild(felt);
        return table;
      }

      function renderActionLine(H, state) {
        const situation = state.situation;
        const line = H.el('div', 'sim-action-line');
        line.appendChild(H.el('span', 'sim-action-title', 'Línea de acción'));
        const steps = H.el('div', 'sim-action-steps');
        const addStep = (actor, action, current = false) => {
          const step = H.el('span', 'sim-action-step' + (current ? ' is-current' : ''));
          step.appendChild(H.el('strong', '', actor));
          if (action) step.appendChild(H.el('span', '', action));
          steps.appendChild(step);
        };
        const arrow = () => steps.appendChild(H.el('span', 'sim-action-arrow', '→'));
        const heroResult = state.status === 'feedback' && state.lastDecision
          ? actionLabel(state.lastDecision.chosen)
          : 'decide';

        if (situation.stage === 'vs3bet') {
          const size = situation.villain === 'SB' || situation.villain === 'BB' ? 9 : 8;
          addStep(situation.hero, 'OR 2.5bb');
          arrow();
          addStep(situation.villain, `3Bet ${size}bb`);
          arrow();
          addStep(situation.hero, heroResult, true);
        } else {
          const heroIndex = RT.Hands.POSITIONS.indexOf(situation.hero);
          RT.Hands.POSITIONS.slice(0, Math.max(0, heroIndex)).forEach((position) => {
            addStep(position, 'Fold');
            arrow();
          });
          addStep(situation.hero, heroResult, true);
        }
        line.appendChild(steps);
        return line;
      }

      return { handCards, renderTable, renderActionLine };
    }
  };

})(window.RT);
