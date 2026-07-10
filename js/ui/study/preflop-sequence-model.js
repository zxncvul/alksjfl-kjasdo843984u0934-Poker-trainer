/* Modelo puro del constructor visual de secuencias preflop. */
'use strict';

(function (RT) {
  const ACTORS = ['hero', 'rival'];
  const LABELS = Object.freeze({
    fold: 'FOLD',
    limp: 'LIMP',
    open_raise: 'OR',
    open_jam: 'ALL IN',
    call: 'CALL',
    three_bet: '3BET',
    jam: 'ALL IN',
    four_bet: '4BET',
    four_bet_jam: '4B ALL IN',
    five_bet: '5BET+'
  });
  const MAX_RIVALS = 3;
  const AGGRESSIVE_ACTIONS = ['open_raise', 'open_jam', 'three_bet', 'jam', 'four_bet', 'four_bet_jam', 'five_bet'];
  const TERMINAL_ACTIONS = ['fold', 'four_bet_jam'];

  function selectedRivals(state) {
    const value = state && typeof state === 'object' ? state : {};
    if (Array.isArray(value.rivalPositions)) return value.rivalPositions.slice();
    return value.positions && value.positions.rival
      ? [value.positions.rival]
      : [];
  }

  function empty(order = 'hero') {
    return {
      order: order === 'rival' ? 'rival' : 'hero',
      positions: { hero: '', rival: '' },
      rivalPositions: [],
      sequence: [],
      others: [],
      heroReturnConfirmed: false
    };
  }

  function canSelectPosition(source, actor, position, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    const validPositions = Array.isArray(positions) ? positions : [];
    if (!ACTORS.includes(actor) || !validPositions.includes(position)) return false;
    return !(actor === state.order && position === 'BB');
  }

  function normalize(source, positions) {
    const value = source && typeof source === 'object' ? source : empty();
    const validPositions = Array.isArray(positions) ? positions : [];
    const result = empty(value.order);
    result.heroReturnConfirmed = value.heroReturnConfirmed === true;
    const storedRivals = Array.isArray(value.rivalPositions)
      ? value.rivalPositions
      : value.positions && value.positions.rival
        ? [value.positions.rival]
        : [];
    result.rivalPositions = Array.from(new Set(
      storedRivals.filter(position => validPositions.includes(position))
    ));
    result.others = Array.isArray(value.others)
      ? value.others.filter(item =>
        item && typeof item === 'object' &&
        validPositions.includes(item.position) &&
        !!LABELS[item.action]
      ).map(item => ({
        position: item.position,
        action: item.action,
        size: item.size == null ? null : item.size
      }))
      : [];
    ACTORS.forEach(actor => {
      const position = value.positions && value.positions[actor];
      result.positions[actor] = validPositions.includes(position) ? position : '';
    });
    if (result.positions[result.order] === 'BB') {
      result.positions[result.order] = '';
      if (result.order === 'rival') {
        result.rivalPositions = result.rivalPositions.filter(position => position !== 'BB');
      }
    }
    if (result.positions.hero) {
      result.rivalPositions = result.rivalPositions.filter(
        position => position !== result.positions.hero
      );
    }
    if (!result.rivalPositions.includes(result.positions.rival)) {
      result.positions.rival = result.rivalPositions[0] || '';
    }
    const seen = new Set();
    (Array.isArray(value.sequence) ? value.sequence : []).forEach(step => {
      if (!ACTORS.includes(step && step.actor) || !LABELS[step.action]) return;
      if (!result.positions[step.actor] || seen.has(step.actor + ':' + step.action)) return;
      result.sequence.push({
        actor: step.actor,
        position: step.actor === 'hero' ? result.positions.hero : step.position,
        positions: step.actor === 'rival'
          ? (Array.isArray(step.positions) && step.positions.length
              ? step.positions.filter(pos => validPositions.includes(pos))
              : [step.position].filter(pos => validPositions.includes(pos)))
          : [result.positions.hero],
        action: step.action,
        size: step.size == null ? null : step.size
      });
      seen.add(step.actor + ':' + step.action);
    });
    return trimInvalid(result, validPositions);
  }

  function other(actor) {
    return actor === 'hero' ? 'rival' : 'hero';
  }

  function actionLevel(action) {
    return {
      limp: 0,
      call: 0,
      open_raise: 1,
      open_jam: 5,
      three_bet: 2,
      jam: 5,
      four_bet: 3,
      four_bet_jam: 5,
      five_bet: 4
    }[action] || 0;
  }

  function indexOfPosition(positions, position) {
    return Array.isArray(positions) ? positions.indexOf(position) : -1;
  }

  function actedRivalPositions(state) {
    const used = new Set();
    (state.sequence || []).forEach(step => {
      if (step.actor !== 'rival') return;
      if (step.position) used.add(step.position);
      if (Array.isArray(step.positions)) {
        step.positions.forEach(position => used.add(position));
      }
    });
    return used;
  }

  function lastAggressiveStep(state) {
    const sequence = Array.isArray(state.sequence) ? state.sequence : [];
    for (let index = sequence.length - 1; index >= 0; index--) {
      if (AGGRESSIVE_ACTIONS.includes(sequence[index].action)) return sequence[index];
    }
    return null;
  }

  function lastRivalActionPosition(state) {
    const sequence = Array.isArray(state.sequence) ? state.sequence : [];
    for (let index = sequence.length - 1; index >= 0; index--) {
      const step = sequence[index];
      if (step && step.actor === 'rival' && step.position) return step.position;
    }
    return '';
  }

  function hasHeroDecision(state) {
    const aggressive = lastAggressiveStep(state);
    return !!aggressive && aggressive.actor === 'rival' &&
      ['open_raise', 'open_jam', 'three_bet', 'jam', 'four_bet_jam'].includes(aggressive.action);
  }

  function availableRivalPositions(source, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    const validPositions = Array.isArray(positions) ? positions : [];
    const hero = state.positions.hero;
    if (!hero) return [];
    if (state.heroReturnConfirmed === true) return [];
    const used = actedRivalPositions(state);
    if (used.size >= MAX_RIVALS) return [];
    const heroIndex = indexOfPosition(validPositions, hero);
    if (heroIndex < 0) return [];
    const lastRivalIndex = indexOfPosition(validPositions, lastRivalActionPosition(state));
    const lowerBound = state.order === 'hero'
      ? Math.max(heroIndex, lastRivalIndex)
      : lastRivalIndex;
    return validPositions.filter(position => {
      if (position === hero || used.has(position)) return false;
      const index = indexOfPosition(validPositions, position);
      if (index < 0) return false;
      if (state.order === 'hero') {
        return index > lowerBound;
      }
      if (index >= heroIndex) return false;
      return lastRivalIndex < 0 || index > lastRivalIndex;
    });
  }

  function remainingRivalsAfter(source, positions, position) {
    const state = source && typeof source === 'object' ? source : empty();
    const validPositions = Array.isArray(positions) ? positions : [];
    const used = actedRivalPositions(state);
    const selectedIndex = indexOfPosition(validPositions, position);
    if (selectedIndex < 0) return [];
    return availableRivalPositions(state, validPositions).filter(candidate => (
      indexOfPosition(validPositions, candidate) > selectedIndex &&
      !used.has(candidate)
    ));
  }

  function positionsBetween(fromPosition, toPosition, positions) {
    const validPositions = Array.isArray(positions) ? positions : [];
    const from = indexOfPosition(validPositions, fromPosition);
    const to = indexOfPosition(validPositions, toPosition);
    if (from < 0 || to < 0 || to <= from + 1) return [];
    return validPositions.slice(from + 1, to);
  }

  function foldedPositions(source, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    const validPositions = Array.isArray(positions) ? positions : [];
    const folded = new Set();
    const active = new Set();
    if (state.positions && state.positions.hero) active.add(state.positions.hero);
    selectedRivals(state).forEach(position => active.add(position));
    (state.sequence || []).forEach(step => {
      if (step.position) active.add(step.position);
    });
    const sequence = state.sequence || [];
    if (state.order === 'rival' && state.positions.hero && !sequence.length) {
      validPositions.slice(0, Math.max(0, indexOfPosition(validPositions, state.positions.hero)))
        .forEach(position => folded.add(position));
    }
    sequence.forEach((step, index) => {
      const previous = sequence[index - 1];
      const from = previous ? previous.position : (
        state.order === 'hero' ? state.positions.hero : ''
      );
      positionsBetween(from, step.position, validPositions).forEach(position => folded.add(position));
    });
    active.forEach(position => folded.delete(position));
    return Array.from(folded);
  }

  function pendingPositions(source, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    const next = stage(state, positions);
    if (needsHeroReturnConfirmation(state, positions)) {
      return [state.positions.hero].concat(availableRivalPositions(state, positions));
    }
    if (next.actor === 'hero' && state.positions.hero) return [state.positions.hero];
    if (next.actor === 'rival') return availableRivalPositions(state, positions);
    return [];
  }

  function selectedPrimaryRival(state) {
    return state.positions && state.positions.rival
      ? state.positions.rival
      : selectedRivals(state).slice(-1)[0] || '';
  }

  function currentResponseActions(state, actor, positions) {
    const aggressive = lastAggressiveStep(state);
    if (!aggressive) return [];
    if (actor === aggressive.actor) return [];
    if (aggressive.action === 'open_jam' || aggressive.action === 'jam' ||
        aggressive.action === 'four_bet_jam') {
      return ['call'];
    }
    if (aggressive.action === 'open_raise') return ['call', 'three_bet', 'jam'];
    if (aggressive.action === 'three_bet') return ['call', 'four_bet', 'four_bet_jam'];
    if (aggressive.action === 'four_bet') return ['call', 'five_bet', 'jam'];
    if (aggressive.action === 'five_bet') return ['call', 'jam'];
    return [];
  }

  function availableActionsForActor(source, actor, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    if (!ACTORS.includes(actor) || !state.positions[actor]) return [];
    const sequence = state.sequence || [];
    if (!sequence.length) {
      if (actor !== state.order) return [];
      return actor === 'hero'
        ? ['open_raise', 'open_jam']
        : ['limp', 'open_raise', 'open_jam'];
    }
    const last = sequence[sequence.length - 1];
    if (TERMINAL_ACTIONS.includes(last.action)) return [];
    if (actor === 'rival') {
      const primary = selectedPrimaryRival(state);
      if (!primary) return [];
      const last = sequence[sequence.length - 1];
      if (last && last.actor === 'hero' && AGGRESSIVE_ACTIONS.includes(last.action)) {
        if (!selectedRivals(state).includes(primary)) return [];
        if (last.action === 'open_jam' || last.action === 'four_bet_jam') return [];
        if (last.action === 'four_bet') return ['call', 'five_bet', 'jam'];
        if (last.action === 'three_bet') return ['call', 'four_bet_jam'];
        if (last.action === 'jam') return ['call'];
      }
      if (actedRivalPositions(state).has(primary)) return [];
      if (!availableRivalPositions(state, positions).includes(primary)) return [];
      const first = sequence[0];
      if (first && first.actor === 'hero' && first.action === 'open_jam') return [];
      if (state.order === 'hero' && first && first.actor === 'hero' && first.action === 'open_raise') {
        const actions = ['three_bet', 'jam'];
        if (selectedRivals(state).length < MAX_RIVALS &&
            remainingRivalsAfter(state, positions, primary).length) {
          actions.unshift('call');
        }
        return actions;
      }
      if (state.order === 'rival' && !hasHeroDecision(state)) {
        return ['limp', 'open_raise', 'open_jam'];
      }
    }
    if (actor === 'hero') {
      if (hasHeroDecision(state)) return currentResponseActions(state, actor, positions);
      if (state.order === 'rival' && last.actor === 'rival' && last.action === 'limp') {
        return ['three_bet', 'jam'];
      }
    }
    return [];
  }

  function stage(state, positions) {
    const value = state && typeof state === 'object' ? state : empty();
    const sequence = Array.isArray(value.sequence) ? value.sequence : [];
    if (!sequence.length) {
      const actor = value.order === 'rival' ? 'rival' : 'hero';
      return {
        actor,
        actions: availableActionsForActor(value, actor, positions)
      };
    }
    const last = sequence[sequence.length - 1];
    if (last.action === 'fold' || last.action === 'four_bet_jam') {
      return { actor: null, actions: [] };
    }
    if (last.action === 'call') {
      if (last.actor === 'rival' && value.order === 'hero') {
        return { actor: 'rival', actions: availableActionsForActor(value, 'rival', positions) };
      }
      return { actor: null, actions: [] };
    }
    if (last.actor === 'rival' && hasHeroDecision(value)) {
      return { actor: 'hero', actions: availableActionsForActor(value, 'hero', positions) };
    }
    if (last.actor === 'hero') {
      if (last.action === 'open_jam') return { actor: null, actions: [] };
      return { actor: 'rival', actions: availableActionsForActor(value, 'rival', positions) };
    }
    if (last.action === 'limp' && value.order === 'rival') {
      if (availableRivalPositions(value, positions).length) {
        return { actor: 'rival', actions: availableActionsForActor(value, 'rival', positions) };
      }
      return { actor: 'hero', actions: availableActionsForActor(value, 'hero', positions) };
    }
    return { actor: other(last.actor), actions: availableActionsForActor(value, other(last.actor), positions) };
  }

  function trimInvalid(source, positions) {
    const result = empty(source.order);
    result.positions = Object.assign({}, source.positions);
    result.rivalPositions = Array.isArray(source.rivalPositions)
      ? source.rivalPositions.slice()
      : result.positions.rival ? [result.positions.rival] : [];
    result.others = Array.isArray(source.others) ? source.others.slice() : [];
    (source.sequence || []).forEach(step => {
      const expected = stage(result, positions);
      if (expected.actor !== step.actor || !expected.actions.includes(step.action)) return;
      if (!result.positions[step.actor]) return;
      result.sequence.push(Object.assign({}, step, {
        position: step.actor === 'hero' ? result.positions.hero : step.position,
        positions: step.actor === 'rival'
          ? (Array.isArray(step.positions) && step.positions.length
              ? step.positions.filter(pos => pos !== result.positions.hero)
              : [step.position])
          : [result.positions.hero]
      }));
    });
    result.heroReturnConfirmed = source.heroReturnConfirmed === true;
    return result;
  }

  function needsHeroReturnConfirmation(source, positions) {
    const state = source && typeof source === 'object' ? source : empty();
    if (state.heroReturnConfirmed === true) return false;
    if (state.order !== 'hero') return false;
    if (!state.positions || !state.positions.hero) return false;
    const sequence = Array.isArray(state.sequence) ? state.sequence : [];
    const last = sequence[sequence.length - 1];
    if (!last || last.actor !== 'rival') return false;
    const next = stage(state, positions);
    return next.actor === 'hero' &&
      availableActionsForActor(state, 'hero', positions).some(action => action !== 'fold');
  }

  function confirmHeroReturn(source, positions) {
    const result = normalize(source, positions);
    if (needsHeroReturnConfirmation(result, positions)) {
      result.heroReturnConfirmed = true;
    }
    return result;
  }

  function setOrder(source, order, positions) {
    const result = normalize(source, positions);
    result.order = order === 'rival' ? 'rival' : 'hero';
    result.heroReturnConfirmed = false;
    if (result.sequence.length && result.sequence[0].actor !== result.order) {
      result.sequence = [];
    }
    return result;
  }

  function setPosition(source, actor, position, positions) {
    const result = normalize(source, positions);
    if (!canSelectPosition(result, actor, position, positions)) return result;
    if (actor === 'hero') {
      if (result.positions.hero === position && needsHeroReturnConfirmation(result, positions)) {
        result.heroReturnConfirmed = true;
        return result;
      }
      if (result.rivalPositions.includes(position)) return result;
      if (result.positions.hero && result.positions.hero !== position) {
        result.sequence = [];
        result.rivalPositions = [];
        result.positions.rival = '';
        result.heroReturnConfirmed = false;
      }
      result.positions.hero = position;
      if (!result.sequence.length) result.heroReturnConfirmed = false;
    } else {
      if (result.positions.hero === position) return result;
      result.heroReturnConfirmed = false;
      const selected = new Set(result.rivalPositions);
      if (!selected.has(position)) selected.add(position);
      result.rivalPositions = positions.filter(
        rivalPosition => selected.has(rivalPosition) &&
          rivalPosition !== result.positions.hero
      );
      result.positions.rival = position;
    }
    result.sequence = result.sequence
      .filter(step => step.actor === 'hero' || (
        step.position &&
        positions.includes(step.position) &&
        step.position !== result.positions.hero
      ))
      .map(step => Object.assign({}, step, {
        position: step.actor === 'hero' ? result.positions.hero : step.position,
        positions: step.actor === 'rival'
          ? (Array.isArray(step.positions) && step.positions.length
              ? step.positions.filter(pos => pos !== result.positions.hero)
              : [step.position])
          : [result.positions.hero]
      }))
      .filter(step => step.actor === 'hero' || step.positions.length);
    return trimInvalid(result, positions);
  }

  function addAction(source, actor, action, positions) {
    const result = normalize(source, positions);
    const expected = stage(result, positions);
    if (expected.actor !== actor || !expected.actions.includes(action)) return result;
    if (actor === 'hero' && needsHeroReturnConfirmation(result, positions)) return result;
    if (!result.positions[actor]) return result;
    const position = actor === 'rival' ? selectedPrimaryRival(result) : result.positions.hero;
    if (!position || (actor === 'rival' && actedRivalPositions(result).has(position))) return result;
    result.sequence.push({
      actor,
      position,
      positions: actor === 'rival'
        ? [position]
        : [result.positions.hero],
      action,
      size: null
    });
    if (actor === 'hero' && result.heroReturnConfirmed !== true) {
      result.heroReturnConfirmed = false;
    }
    return result;
  }

  function detect(source) {
    const state = source && typeof source === 'object' ? source : empty();
    const sequence = state.sequence || [];
    if (!sequence.length) return { spot: '', subSpot: '', complete: false };
    const first = sequence[0];
    const second = sequence[1];
    const third = sequence[2];
    const heroPosition = state.positions.hero || 'Hero';
    const rivalPosition = state.positions.rival || 'Rival';

    if (first.actor === 'hero' && first.action === 'open_raise' && !second) {
      return {
        spot: 'Unopened pot',
        subSpot: 'RFI / Open Raise',
        suggestedSubSpot: `${heroPosition} OR`,
        complete: true
      };
    }
    if (first.actor === 'hero' && first.action === 'open_jam') {
      return { spot: 'Unopened pot', subSpot: 'Open shove', complete: true };
    }
    if (first.actor === 'hero' && first.action === 'limp') {
      return { spot: 'Unopened pot', subSpot: 'Limp first in', complete: true };
    }
    if (first.actor === 'rival' && first.action === 'open_raise' && !second) {
      return {
        spot: 'Facing open',
        subSpot: 'Fold vs open',
        suggestedSubSpot: `${heroPosition} vs ${rivalPosition} Open`,
        complete: false
      };
    }
    if (first.action === 'open_raise' && second && second.action === 'three_bet') {
      if (second.actor === 'hero') {
        return {
          spot: 'Facing open',
          subSpot: '3Bet vs open',
          suggestedSubSpot: `${heroPosition} 3Bet vs ${rivalPosition} Open`,
          complete: true
        };
      }
      return {
        spot: 'Facing 3Bet',
        subSpot: third && third.action === 'four_bet'
          ? '4Bet vs 3Bet'
          : third && third.action === 'four_bet_jam'
            ? '4Bet jam'
            : third && third.action === 'call'
              ? 'Call vs 3Bet'
              : third && third.action === 'fold'
                ? 'Fold vs 3Bet'
                : 'Call vs 3Bet',
        suggestedSubSpot: `${heroPosition} vs ${rivalPosition} 3Bet`,
        complete: !!third
      };
    }
    if (first.actor === 'hero' && first.action === 'open_raise') {
      const rivalAggressionIndex = sequence.findIndex((step, index) =>
        index > 0 &&
        step.actor === 'rival' &&
        ['three_bet', 'jam'].includes(step.action)
      );
      if (rivalAggressionIndex > 0) {
        const aggressor = sequence[rivalAggressionIndex];
        const heroResponse = sequence.slice(rivalAggressionIndex + 1)
          .find(step => step.actor === 'hero');
        return {
          spot: 'Facing 3Bet',
          subSpot: heroResponse && heroResponse.action === 'four_bet'
            ? '4Bet vs 3Bet'
            : heroResponse && heroResponse.action === 'four_bet_jam'
              ? '4Bet jam'
              : heroResponse && heroResponse.action === 'call'
                ? 'Call vs 3Bet'
                : 'Call vs 3Bet',
          suggestedSubSpot: `${heroPosition} vs ${aggressor.position || rivalPosition} 3Bet`,
          complete: !!heroResponse
        };
      }
    }
    if (first.actor === 'rival' && first.action === 'open_raise' && second) {
      const subSpot = {
        fold: 'Fold vs open',
        call: 'Call vs open',
        three_bet: '3Bet vs open'
      }[second.action];
      if (subSpot) {
        return {
          spot: 'Facing open',
          subSpot,
          suggestedSubSpot: `${heroPosition} vs ${rivalPosition} Open`,
          complete: true
        };
      }
    }
    return { spot: '', subSpot: '', complete: false };
  }

  function describe(source) {
    const state = source && typeof source === 'object' ? source : empty();
    const parts = (state.sequence || []).map(step => {
      const actor = step.actor === 'hero' ? 'Hero' : 'Rival';
      const positions = step.actor === 'rival' &&
        Array.isArray(step.positions) && step.positions.length
        ? step.positions.join(' + ')
        : step.position;
      return `${actor} ${positions} ${LABELS[step.action]}`;
    });
    const next = stage(state);
    if (!parts.length) {
      const actor = state.order === 'hero' ? 'Hero' : 'Rival';
      const position = state.order === 'hero'
        ? state.positions && state.positions.hero
        : selectedRivals(state).join(' + ');
      return position
        ? `${actor} ${position}: elige accion`
        : `${actor}: elige posicion y accion`;
    }
    if (next.actor) {
      const actor = next.actor === 'hero' ? 'Hero' : 'Rival';
      const position = next.actor === 'rival'
        ? selectedRivals(state).join(' + ')
        : state.positions[next.actor];
      parts.push(`${actor}${position ? ` ${position}` : ''}: decision pendiente`);
    }
    return parts.join(' -> ');
  }

  RT.PreflopSequenceModel = {
    LABELS,
    empty,
    normalize,
    canSelectPosition,
    availableActionsForActor,
    availableRivalPositions,
    actedRivalPositions,
    foldedPositions,
    pendingPositions,
    selectedRivals,
    needsHeroReturnConfirmation,
    confirmHeroReturn,
    setOrder,
    setPosition,
    addAction,
    stage,
    detect,
    describe
  };
})(window.RT);
