'use strict';

(function (RT) {
  const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const SUITS = ['♠','♥','♦','♣'];
  const HAND_ORDER = ['high','pair','twopair','trio','straight','flush','full','quads','straight-flush'];
  const MADE_HAND_TYPES = new Set([
    'twopair', 'trio', 'straight', 'flush', 'full', 'quads', 'straight-flush'
  ]);
  const HAND_LABELS = {
    high: 'Carta alta', pair: 'Pareja', twopair: 'Doble pareja',
    trio: 'Trio', straight: 'Escalera', flush: 'Color',
    full: 'Full house', quads: 'Poker', 'straight-flush': 'Escalera de color'
  };

  function rankValue(rank) { return RANKS.indexOf(rank); }
  function deck(excluded) {
    const used = new Set(excluded || []);
    return RANKS.flatMap(rank => SUITS.map(suit => rank + suit))
      .filter(card => !used.has(card));
  }
  function pick(values, amount) {
    const source = values.slice();
    const result = [];
    while (result.length < amount && source.length) {
      result.push(source.splice(Math.floor(Math.random() * source.length), 1)[0]);
    }
    return result;
  }
  function findStraight(ranks) {
    const values = Array.from(new Set(ranks.map(rankValue).filter(value => value >= 0)));
    if (values.includes(12)) values.push(-1);
    values.sort((a, b) => a - b);
    let best = null;
    for (let index = 0; index <= values.length - 5; index++) {
      const slice = values.slice(index, index + 5);
      if (slice.every((value, offset) => !offset || value === slice[offset - 1] + 1)) {
        best = slice;
      }
    }
    return best;
  }
  function getBestHand(cards) {
    const pool = Array.from(new Set(cards));
    const byRank = {};
    const bySuit = {};
    pool.forEach(card => {
      (byRank[card[0]] ||= []).push(card);
      (bySuit[card[1]] ||= []).push(card);
    });
    const groups = Object.entries(byRank)
      .map(([rank, groupCards]) => ({ rank, cards: groupCards }))
      .sort((a, b) => b.cards.length - a.cards.length ||
        rankValue(b.rank) - rankValue(a.rank));

    // Straight flush
    for (const suit of SUITS) {
      const suited = bySuit[suit] || [];
      const straight = findStraight(suited.map(card => card[0]));
      if (straight) {
        return {
          type: 'straight-flush',
          primary: straight[4] === -1 ? 3 : straight[4],
          secondary: 0,
          kickers: [],
          cards: straight.map(value => suited.find(card =>
            card[0] === (value === -1 ? 'A' : RANKS[value]))).filter(Boolean)
        };
      }
    }

    // Quads
    const quads = groups.find(group => group.cards.length === 4);
    if (quads) return groupedHand('quads', quads, null, pool, 1);

    // Full house, including the two-trips case.
    const trips = groups.filter(group => group.cards.length >= 3);
    const pairs = groups.filter(group => group.cards.length >= 2);
    if (trips.length && pairs.some(group => group.rank !== trips[0].rank)) {
      const pair = pairs.find(group => group.rank !== trips[0].rank);
      return {
        type: 'full', primary: rankValue(trips[0].rank),
        secondary: rankValue(pair.rank), kickers: [],
        cards: trips[0].cards.slice(0, 3).concat(pair.cards.slice(0, 2))
      };
    }

    // Flush
    for (const suit of SUITS) {
      const suited = (bySuit[suit] || []).slice()
        .sort((a, b) => rankValue(b[0]) - rankValue(a[0]));
      if (suited.length >= 5) {
        return {
          type: 'flush', primary: rankValue(suited[0][0]), secondary: 0,
          kickers: suited.slice(1, 5).map(card => rankValue(card[0])),
          cards: suited.slice(0, 5)
        };
      }
    }

    // Straight
    const straight = findStraight(pool.map(card => card[0]));
    if (straight) {
      return {
        type: 'straight', primary: straight[4] === -1 ? 3 : straight[4],
        secondary: 0, kickers: [],
        cards: straight.map(value => pool.find(card =>
          card[0] === (value === -1 ? 'A' : RANKS[value]))).filter(Boolean)
      };
    }

    // Trips, two pair and pair
    if (trips.length) return groupedHand('trio', trips[0], null, pool, 2);
    if (pairs.length >= 2) {
      const ordered = pairs.slice(0, 2).sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
      const used = ordered.flatMap(group => group.cards.slice(0, 2));
      const kicker = pool.filter(card => !used.includes(card))
        .sort((a, b) => rankValue(b[0]) - rankValue(a[0]))[0];
      return {
        type: 'twopair', primary: rankValue(ordered[0].rank),
        secondary: rankValue(ordered[1].rank),
        kickers: kicker ? [rankValue(kicker[0])] : [],
        cards: kicker ? used.concat(kicker) : used
      };
    }
    if (pairs.length) return groupedHand('pair', pairs[0], null, pool, 3);

    // High card
    const high = pool.slice().sort((a, b) => rankValue(b[0]) - rankValue(a[0])).slice(0, 5);
    return {
      type: 'high', primary: rankValue(high[0][0]), secondary: 0,
      kickers: high.slice(1).map(card => rankValue(card[0])), cards: high
    };
  }
  function groupedHand(type, group, secondary, cards, kickerCount) {
    const made = group.cards.slice(0, type === 'quads' ? 4 : type === 'trio' ? 3 : 2);
    const kickers = cards.filter(card => !made.includes(card))
      .sort((a, b) => rankValue(b[0]) - rankValue(a[0])).slice(0, kickerCount);
    return {
      type, primary: rankValue(group.rank), secondary: secondary || 0,
      kickers: kickers.map(card => rankValue(card[0])), cards: made.concat(kickers)
    };
  }
  function handName(hand) {
    const primary = RANKS[hand.primary] || '';
    const secondary = RANKS[hand.secondary] || '';
    if (hand.type === 'straight-flush') {
      return hand.primary === 12 ? 'Escalera real' : `Escalera de color al ${primary}`;
    }
    if (hand.type === 'quads') return `Poker de ${primary}`;
    if (hand.type === 'full') return `Full de ${primary} con ${secondary}`;
    if (hand.type === 'flush') return `Color al ${primary}`;
    if (hand.type === 'straight') return `Escalera al ${primary}`;
    if (hand.type === 'trio') return `Trio de ${primary}`;
    if (hand.type === 'twopair') return `Doble pareja de ${primary} y ${secondary}`;
    if (hand.type === 'pair') return `Pareja de ${primary}`;
    return `Carta alta ${primary}`;
  }
  function analyzeBestHand(cards, triggerCard, previousHand) {
    const hand = getBestHand(cards);
    const usedCards = hand.cards.slice(0, 5);
    let highlightStrong = usedCards.slice();
    let highlightKicker = [];
    if (hand.type === 'quads' || hand.type === 'trio' || hand.type === 'pair') {
      const mainRank = RANKS[hand.primary];
      highlightStrong = usedCards.filter(card => card[0] === mainRank);
      highlightKicker = usedCards.filter(card => card[0] !== mainRank);
    } else if (hand.type === 'twopair') {
      const pairRanks = new Set([RANKS[hand.primary], RANKS[hand.secondary]]);
      highlightStrong = usedCards.filter(card => pairRanks.has(card[0]));
      highlightKicker = usedCards.filter(card => !pairRanks.has(card[0]));
    } else if (hand.type === 'high') {
      highlightStrong = usedCards.slice(0, 1);
      highlightKicker = usedCards.slice(1);
    }
    const name = handName(hand);
    const verb = previousHand && previousHand.type === hand.type ? 'mejora' : 'completa';
    const lead = triggerCard ? `${triggerCard} ${verb} ${name}.` : `${name}.`;
    return {
      hand,
      handName: name,
      usedCards,
      highlightStrong,
      highlightKicker,
      explanation: `${lead} Cartas usadas: ${usedCards.join(' ')}`
    };
  }
  function compareHands(left, right) {
    let difference = HAND_ORDER.indexOf(left.type) - HAND_ORDER.indexOf(right.type);
    if (difference) return difference;
    difference = left.primary - right.primary;
    if (difference) return difference;
    difference = (left.secondary || 0) - (right.secondary || 0);
    if (difference) return difference;
    for (let index = 0; index < Math.max(left.kickers.length, right.kickers.length); index++) {
      difference = (left.kickers[index] || 0) - (right.kickers[index] || 0);
      if (difference) return difference;
    }
    return 0;
  }
  function handScore(hand) {
    return HAND_ORDER.indexOf(hand.type) * 10000 +
      hand.primary * 100 + (hand.secondary || 0);
  }
  function uniqueCards(cards) {
    return Array.from(new Set((cards || []).filter(Boolean)));
  }
  function deadCards(hero, board, villain) {
    return uniqueCards([].concat(hero || [], board || [], villain || []));
  }
  function availableDeck(hero, board, villain) {
    return deck(deadCards(hero, board, villain));
  }
  function hasVillain(villain) {
    return Array.isArray(villain) && villain.filter(Boolean).length === 2;
  }
  function internalModeFor(hero, board, villain) {
    if (!hero || hero.length < 2 || !board || board.length < 3) return 'DRAW_MODE';
    if (board.length >= 5) return 'RIVER_FINAL_MODE';
    const current = getBestHand(hero.concat(board));
    const opponent = (villain || []).filter(Boolean);
    if (MADE_HAND_TYPES.has(current.type) && hasVillain(opponent)) {
      const villainHand = getBestHand(opponent.concat(board));
      if (compareHands(current, villainHand) < 0) return 'MADE_HAND_BEHIND_MODE';
    }
    return MADE_HAND_TYPES.has(current.type) ? 'MADE_HAND_MODE' : 'DRAW_MODE';
  }
  function effectiveOuts(hero, board, villain) {
    const current = handScore(getBestHand(hero.concat(board)));
    return availableDeck(hero, board, villain).filter(card => {
      const hand = getBestHand(hero.concat(board, card));
      return hand.type !== 'high' && handScore(hand) > current;
    });
  }
  function immediateFlushDrawOuts(hero, board, villain) {
    if (!hero || hero.length < 2 || !board || board.length < 3 || board.length >= 5) {
      return [];
    }
    const visible = hero.concat(board);
    const available = availableDeck(hero, board, villain);
    const outs = [];
    SUITS.forEach(suit => {
      const suitedVisible = visible.filter(card => card[1] === suit);
      const suitedHero = hero.filter(card => card[1] === suit);
      if (suitedVisible.length === 4 && suitedHero.length > 0) {
        available
          .filter(card => card[1] === suit)
          .forEach(card => outs.push(card));
      }
    });
    return outs;
  }
  function cleanOuts(hero, board, rawOuts, villain) {
    const cleanTypes = new Set(['straight', 'flush', 'full', 'quads', 'straight-flush']);
    const available = new Set(availableDeck(hero, board, villain));
    const clean = (rawOuts || effectiveOuts(hero, board, villain)).filter(card => {
      if (!available.has(card)) return false;
      const analysis = analyzeBestHand(hero.concat(board, card), card);
      if (!cleanTypes.has(analysis.hand.type) ||
          !analysis.usedCards.includes(card)) return false;
      const heroUsed = analysis.usedCards.some(used => hero.includes(used));
      if (!heroUsed) return false;
      if (['full', 'quads'].includes(analysis.hand.type)) {
        return analysis.highlightStrong.includes(card) &&
          analysis.highlightStrong.some(used => hero.includes(used));
      }
      return true;
    });
    immediateFlushDrawOuts(hero, board, villain).forEach(card => {
      if (!clean.includes(card)) clean.push(card);
    });
    return clean;
  }
  function marginalOuts(hero, board, rawOuts, cleanCards, villain) {
    const cleanSet = new Set(cleanCards || []);
    const available = new Set(availableDeck(hero, board, villain));
    return (rawOuts || effectiveOuts(hero, board, villain)).filter(card => {
      if (!available.has(card) || cleanSet.has(card)) return false;
      const analysis = analyzeBestHand(hero.concat(board, card), card);
      return analysis.usedCards.includes(card);
    });
  }
  function opponentCanBeat(hero, board) {
    const heroHand = getBestHand(hero.concat(board));
    const remaining = deck(hero.concat(board));
    for (let first = 0; first < remaining.length - 1; first++) {
      for (let second = first + 1; second < remaining.length; second++) {
        const opponentHand = getBestHand(
          [remaining[first], remaining[second]].concat(board)
        );
        if (compareHands(opponentHand, heroHand) > 0) return true;
      }
    }
    return false;
  }
  function splitOuts(hero, board, villain) {
    const opponent = (villain || []).filter(Boolean);
    const villainPresent = hasVillain(opponent);
    const positive = [];
    const negative = [];
    const raw = effectiveOuts(hero, board, opponent);
    const clean = cleanOuts(hero, board, raw, opponent);
    const marginal = marginalOuts(hero, board, raw, clean, opponent);
    if (villainPresent) {
      clean.forEach(card => {
        const heroHand = getBestHand(hero.concat(board, card));
        const villainHand = getBestHand(opponent.concat(board, card));
        if (compareHands(heroHand, villainHand) > 0) positive.push(card);
        else negative.push(card);
      });
    }
    const useful = villainPresent ? positive.slice() : clean.slice();
    return {
      positive,
      negative,
      clean,
      marginal,
      raw,
      useful,
      hasVillain: villainPresent,
      deadCards: deadCards(hero, board, opponent),
      availableDeck: availableDeck(hero, board, opponent)
    };
  }
  function project() {
    const generators = [oesd, gutshot, flush, comboOesdFlush, comboGutFlush];
    for (let attempt = 0; attempt < 20; attempt++) {
      const generated = generators[Math.floor(Math.random() * generators.length)]();
      const cards = generated.hero.concat(generated.board);
      if (cards.length === new Set(cards).size && cards.every(Boolean)) return generated;
    }
    return flush();
  }
  function madeHand() {
    const rank = pick(RANKS, 1)[0];
    const suits = pick(SUITS, 3);
    const heroPair = pick(deck([rank + suits[0], rank + suits[1], rank + suits[2]])
      .filter(card => card[0] !== rank), 1)[0];
    const boardKicker = pick(deck([rank + suits[0], rank + suits[1], rank + suits[2], heroPair])
      .filter(card => card[0] !== rank), 1)[0];
    return {
      hero: [rank + suits[0], heroPair],
      board: [rank + suits[1], rank + suits[2], boardKicker],
      project: 'MADE_HAND'
    };
  }
  function projectByKind(kind) {
    const generators = {
      oesd,
      gutshot,
      flush,
      combo: () => Math.random() < .5 ? comboOesdFlush() : comboGutFlush(),
      'made-hand': madeHand
    };
    const generator = generators[kind];
    return generator ? generator() : project();
  }
  function applySuitMode(generated, mode) {
    if (mode === 'random') return generated;
    const heroRanks = generated.hero.map(card => card[0]);
    const boardRanks = generated.board.map(card => card[0]);
    const baseSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const otherSuits = SUITS.filter(suit => suit !== baseSuit);
    const boardSuits = mode === 'mono'
      ? [baseSuit, baseSuit, baseSuit]
      : mode === 'paired'
        ? [baseSuit, baseSuit, otherSuits[0]]
        : [baseSuit, otherSuits[0], otherSuits[1]];
    const used = new Set();
    function make(rank, preferredSuit) {
      const suits = [preferredSuit].concat(SUITS.filter(suit => suit !== preferredSuit));
      const suit = suits.find(candidate => !used.has(rank + candidate));
      const card = rank + suit;
      used.add(card);
      return card;
    }
    const board = boardRanks.map((rank, index) =>
      make(rank, boardSuits[index % boardSuits.length]));
    const hero = heroRanks.map((rank, index) =>
      make(rank, otherSuits[(index + 1) % otherSuits.length]));
    return { hero, board, project: generated.project };
  }
  function oesd() {
    const start = Math.floor(Math.random() * 7);
    const run = RANKS.slice(start, start + 4);
    const hero = pick(deck().filter(card => [run[0], run[1]].includes(card[0])), 2);
    const board = pick(deck(hero).filter(card => [run[1], run[2], run[3]].includes(card[0])), 3);
    return { hero, board, project: 'OESD' };
  }
  function gutshot() {
    const index = Math.floor(Math.random() * 9) + 1;
    const wanted = [RANKS[index - 1], RANKS[index + 3]];
    const hero = pick(deck().filter(card => wanted.includes(card[0])), 2);
    const available = deck(hero);
    const board = [RANKS[index], RANKS[index + 2]]
      .map(rank => pick(available.filter(card => card[0] === rank), 1)[0]);
    return { hero, board: board.concat(pick(deck(hero.concat(board)), 1)), project: 'GUT' };
  }
  function flush() {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const hero = pick(deck().filter(card => card[1] === suit), 2);
    return {
      hero,
      board: pick(deck(hero).filter(card => card[1] === suit), 2)
        .concat(pick(deck(hero).filter(card => card[1] !== suit), 1)),
      project: 'FLUSH'
    };
  }
  function comboOesdFlush() {
    const base = oesd();
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const hero = base.hero.map(card => card[0] + suit);
    return {
      hero,
      board: pick(deck(hero).filter(card => card[1] === suit), 2)
        .concat(pick(deck(hero).filter(card => card[1] !== suit), 1)),
      project: 'OESD-FLUSH'
    };
  }
  function comboGutFlush() {
    const base = gutshot();
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const hero = base.hero.map(card => card[0] + suit);
    return {
      hero,
      board: pick(deck(hero).filter(card => card[1] === suit), 2)
        .concat(pick(deck(hero).filter(card => card[1] !== suit), 1)),
      project: 'GUT-FLUSH'
    };
  }
  function scenario(outCount, boardLength) {
    const equity = outCount * (boardLength === 3 ? 4 : 2);
    const pot = pick([20,25,30,40,50,60,75,100], 1)[0];
    const bets = [Math.round(pot / 4), Math.round(pot / 3), Math.round(pot / 2),
      Math.round(pot * 2 / 3), pot];
    const bet = pick(Array.from(new Set(bets.filter(value => value > 0))), 1)[0];
    const needed = bet / (pot + bet * 2) * 100;
    return {
      pot, bet, needed, ratio: (pot + bet) / bet,
      callCorrect: equity >= needed
    };
  }
  function potMath(pot, bet, outCount, boardLength, options) {
    const config = options || {};
    const safePot = Math.max(0, Number(pot) || 0);
    const safeBet = Math.max(0, Number(bet) || 0);
    const finalPot = safePot + safeBet * 2;
    const needed = safeBet > 0 && finalPot > 0 ? safeBet / finalPot * 100 : 0;
    const ratio = safeBet > 0 ? (safePot + safeBet) / safeBet : 0;
    const remainingCards = boardLength >= 5 ? 0 : boardLength === 3 ? 2 : 1;
    const turn = remainingCards === 2 ? outCount * 2 : null;
    const river = remainingCards === 2 ? outCount * 4 :
      remainingCards === 1 ? outCount * 2 : null;
    const equity = river;
    const action = equity === null ? 'N/A' : equity >= needed ? 'CALL' : 'FOLD';
    return {
      pot: safePot,
      bet: safeBet,
      finalPot,
      needed,
      ratio,
      turn,
      river,
      equity,
      action: config.madeHand ? 'MANO HECHA' : action
    };
  }
  function formatPercent(value) {
    return `${(Number(value) || 0).toFixed(1)}%`;
  }
  function formatRatio(value) {
    return `${(Number(value) || 0).toFixed(2)}:1`;
  }
  function boardFromLab(lab) {
    return lab.flop.concat(lab.turn, lab.river).filter(Boolean);
  }
  function labUsedCards(lab) {
    return lab.hero.concat(lab.villain, lab.flop, lab.turn, lab.river).filter(Boolean);
  }
  function generateSimulatorSpot(options) {
    const config = options || {};
    const street = config.street === 'turn' ||
      (config.street === 'mixed' && Math.random() >= .5) ? 'turn' : 'flop';
    const kind = config.kind || 'mixed';
    let generated = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = projectByKind(kind);
      const cards = candidate.hero.concat(candidate.board);
      if (cards.length === new Set(cards).size && cards.every(card => deck().includes(card))) {
        generated = candidate;
        break;
      }
    }
    generated = generated || flush();
    const board = generated.board.slice(0, 3);
    if (street === 'turn') {
      board.push(pick(deck(generated.hero.concat(board)), 1)[0]);
    }
    const preliminary = analyzeSpot(generated.hero, board, { pot: 25, bet: 8 });
    const spotScenario = scenario(preliminary.outs.useful.length, board.length);
    const analysis = analyzeSpot(generated.hero, board, spotScenario);
    const decision = simulatorDecision(analysis);
    const type = {
      OESD: 'OESD',
      GUT: 'Gutshot',
      FLUSH: 'Flush draw',
      'OESD-FLUSH': 'Combo draw',
      'GUT-FLUSH': 'Combo draw',
      MADE_HAND: 'Mano hecha'
    }[generated.project] || analysis.project;
    return {
      hero: generated.hero.slice(),
      villain: [],
      board: board.slice(),
      street,
      project: analysis.project,
      sourceProject: generated.project,
      type,
      scenario: spotScenario,
      analysis,
      expectedDecision: decision.action,
      decisionReason: decision.reason
    };
  }
  function simulatorDecision(analysis) {
    if (analysis.mode === 'MADE_HAND_MODE') {
      return {
        action: 'CALL',
        reason: 'Mano hecha: no se decide por equity de outs futuras; el spot se continúa como CALL.'
      };
    }
    return {
      action: analysis.math.action === 'CALL' ? 'CALL' : 'FOLD',
      reason: `Equity por outs ${analysis.math.equity.toFixed(1)}% frente a ${analysis.math.needed.toFixed(1)}% necesaria.`
    };
  }
  function validCard(card) {
    return /^[2-9TJQKA][♠♥♦♣]$/.test(card);
  }
  function duplicateCards(cards) {
    const seen = new Set();
    const duplicates = new Set();
    cards.forEach(card => {
      if (seen.has(card)) duplicates.add(card);
      else seen.add(card);
    });
    return Array.from(duplicates);
  }
  function validateLabState(lab) {
    const notes = [];
    const cards = labUsedCards(lab);
    const duplicates = duplicateCards(cards);
    const invalidCards = cards.filter(card => !validCard(card));
    if (duplicates.length) notes.push(`Cartas duplicadas: ${duplicates.join(' ')}`);
    if (invalidCards.length) notes.push(`Cartas invalidas: ${invalidCards.join(' ')}`);
    if (lab.flop.filter(Boolean).length > 0 && lab.flop.filter(Boolean).length < 3) {
      notes.push('Flop incompleto');
    }
    if (lab.turn[0] && lab.flop.filter(Boolean).length < 3) {
      notes.push('Turn sin Flop completo');
    }
    if (lab.river[0] && !lab.turn[0]) notes.push('River sin Turn');
    if (lab.river[0] && lab.flop.filter(Boolean).length < 3) {
      notes.push('River sin Flop completo');
    }
    if (lab.hero.filter(Boolean).length > 0 && lab.hero.filter(Boolean).length < 2) {
      notes.push('Hero incompleto');
    }
    if (lab.villain.filter(Boolean).length === 1) notes.push('Villain incompleto');
    if (!cards.length) notes.push('Estado vacio');
    return notes;
  }
  function invalidLabExport(lab, notes) {
    return [
      'POT ODDS TRAINER',
      `Entrada invalida controlada: ${notes.join('; ')}`,
      `Hero: ${lab.hero.filter(Boolean).join(' ') || '--'}`,
      `Villain: ${lab.villain.filter(Boolean).join(' ') || '--'}`,
      `Flop: ${lab.flop.filter(Boolean).join(' ') || '--'}`,
      `Turn: ${lab.turn[0] || '--'}`,
      `River: ${lab.river[0] || '--'}`,
      `Bote: ${lab.scenario.pot ?? '--'}`,
      `Apuesta: ${lab.scenario.bet ?? '--'}`
    ].join('\n');
  }
  function nextLabSlot(lab) {
    const order = [
      ['hero', 0], ['hero', 1],
      ['villain', 0], ['villain', 1],
      ['flop', 0], ['flop', 1], ['flop', 2],
      ['turn', 0], ['river', 0]
    ];
    const found = order.find(([section, index]) => !lab[section][index]);
    return found ? { section: found[0], index: found[1] } : lab.activeSlot;
  }
  function detectProject(hero, board, outs, current, mode) {
    if (hero.length < 2 || board.length < 3) return 'Spot incompleto';
    if (mode === 'RIVER_FINAL_MODE') return `Final: ${current ? current.handName : 'N/A'}`;
    if (mode === 'MADE_HAND_BEHIND_MODE') return `Va por detras: ${current ? current.handName : 'N/A'}`;
    if (mode === 'MADE_HAND_MODE') return `Mano hecha: ${current ? current.handName : 'N/A'}`;
    const types = new Set((outs.clean || []).map(card =>
      analyzeBestHand(hero.concat(board, card), card).hand.type));
    const straight = types.has('straight') || types.has('straight-flush');
    const flushDraw = types.has('flush') || types.has('straight-flush');
    if (straight && flushDraw) return 'Combo Draw';
    if (flushDraw) return 'Flush Draw';
    if (straight) return outs.clean.length >= 8 ? 'OESD' : 'Gutshot';
    if (types.has('full')) return 'Full Draw';
    if (types.has('trio')) return 'Set Draw';
    if (types.has('twopair')) return 'Two Pair Draw';
    return outs.clean.length ? 'Proyecto limpio' : 'Sin proyecto limpio';
  }
  function analyzeSpot(hero, board, scenarioInput, villainInput) {
    const villain = (villainInput || []).filter(Boolean);
    const ready = hero.length === 2 && board.length >= 3;
    const current = ready ? analyzeBestHand(hero.concat(board)) : null;
    const mode = ready ? internalModeFor(hero, board, villain) : 'DRAW_MODE';
    const outs = ready && mode !== 'RIVER_FINAL_MODE' ? splitOuts(hero, board, villain) :
      {
        positive: [], negative: [], clean: [], marginal: [], raw: [], useful: [],
        hasVillain: hasVillain(villain),
        deadCards: deadCards(hero, board, villain),
        availableDeck: availableDeck(hero, board, villain)
      };
    if (mode === 'MADE_HAND_MODE') {
      outs.useful = [];
    }
    const usefulCount = outs.useful.length;
    const math = potMath(
      scenarioInput.pot,
      scenarioInput.bet,
      usefulCount,
      board.length || 3,
      { madeHand: mode === 'MADE_HAND_MODE' }
    );
    const villainCurrent = ready && hasVillain(villain)
      ? analyzeBestHand(villain.concat(board)) : null;
    const showdown = current && villainCurrent
      ? compareHands(current.hand, villainCurrent.hand) : null;
    return {
      ready,
      mode,
      hero,
      villain,
      board,
      outs,
      math,
      current,
      villainCurrent,
      showdown,
      project: detectProject(hero, board, outs, current, mode)
    };
  }
  function parseEquity(value) {
    const normalized = String(value || '').trim().replace(/\s+/g, '').replace(',', '.');
    if (!normalized) return null;
    if (normalized.includes(':')) {
      const [left, right] = normalized.split(':').map(Number);
      return left > 0 && right > 0 ? right / (left + right) * 100 : null;
    }
    const number = Number(normalized.replace('%', ''));
    if (!Number.isFinite(number) || number < 0) return null;
    return number;
  }
  function parsePercent(value) {
    const number = Number(String(value || '').trim().replace(',', '.').replace('%', ''));
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function create(store) {
    const { state } = store;
    let countdownTimer = null;
    let countdownInterval = null;
    let memoryTimers = [];
    let feedbackTimer = null;
    function notify() { store.notify(); }
    function clearTimers() {
      clearTimeout(countdownTimer);
      clearInterval(countdownInterval);
      clearTimeout(feedbackTimer);
      memoryTimers.forEach(clearTimeout);
      countdownTimer = null;
      countdownInterval = null;
      feedbackTimer = null;
      memoryTimers = [];
    }
    function record(correct) {
      if (state.session.roundRecorded) return;
      state.session.roundRecorded = true;
      state.session.rounds++;
      state.stats.played++;
      if (correct) {
        state.session.correct++;
        state.stats.correct++;
        state.stats.currentStreak++;
        state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
      } else {
        state.session.failed++;
        state.stats.failed++;
        state.stats.currentStreak = 0;
        const mode = state.config.mode;
        state.stats.errorsByMode[mode] = (state.stats.errorsByMode[mode] || 0) + 1;
      }
      store.saveStats();
    }
    function scheduleTimers() {
      if (state.config.countdown > 0) {
        const end = Date.now() + state.config.countdown * 1000;
        state.session.remainingMs = state.config.countdown * 1000;
        countdownInterval = setInterval(() => {
          state.session.remainingMs = Math.max(0, end - Date.now());
          notify();
        }, 250);
        countdownTimer = setTimeout(() => {
          clearInterval(countdownInterval);
          countdownInterval = null;
          state.session.remainingMs = 0;
          state.phase = 'error';
          state.feedback = 'Tiempo agotado.';
          record(false);
          notify();
        }, state.config.countdown * 1000);
      }
      if (state.config.memoryDuration > 0) {
        let zones = Array.from(state.config.memoryZones);
        if (state.config.memoryRandomCount > 0) {
          zones = pick(zones, Math.min(state.config.memoryRandomCount, zones.length));
        }
        zones.forEach(zone => {
          memoryTimers.push(setTimeout(() => {
            state.session.hiddenZones.add(zone);
            notify();
          }, state.config.memoryDuration * 1000));
        });
      }
    }
    function next() {
      clearTimers();
      const previous = state.session.spot;
      const generated = state.config.boardLocked && previous
        ? { hero: previous.hero.slice(), board: previous.board.slice(), project: previous.project }
        : applySuitMode(project(), state.config.suitMode);
      const board = generated.board.slice(0, 3);
      const desired = state.config.street === 'turn' ? 4
        : state.config.street === 'mixed' && Math.random() >= .5 ? 4 : 3;
      if (desired === 4) {
        const lockedTurn = state.config.boardLocked && previous && previous.board[3];
        board.push(lockedTurn || pick(deck(generated.hero.concat(board)), 1)[0]);
      }
      const outs = splitOuts(generated.hero, board);
      const nextScenario = state.config.scenarioLocked && previous
        ? Object.assign({}, previous.scenario)
        : scenario(outs.useful.length, board.length);
      const math = potMath(nextScenario.pot, nextScenario.bet,
        outs.useful.length, board.length);
      state.session.spot = {
        hero: generated.hero,
        board,
        project: generated.project,
        outs,
        bestHand: getBestHand(generated.hero.concat(board)),
        scenario: nextScenario,
        equityTurn: math.turn,
        equityRiver: math.river
      };
      state.session.selectedPositive = new Set();
      state.session.selectedNegative = new Set();
      state.session.activeSelection = 'positive';
      state.session.inputs = { needed: '', turn: '', river: '' };
      state.session.reveal = false;
      state.session.revealOuts = false;
      state.session.revealHand = false;
      state.session.revealDetail = null;
      state.session.action = null;
      state.session.roundRecorded = false;
      state.session.hiddenZones = new Set();
      state.phase = 'question';
      state.feedback = instruction();
      scheduleTimers();
      notify();
    }
    function labAnalysis() {
      return analyzeSpot(
        state.lab.hero.filter(Boolean),
        boardFromLab(state.lab),
        state.lab.scenario,
        state.lab.villain.filter(Boolean)
      );
    }
    function clearLabAids() {
      state.session.reveal = false;
      state.session.revealOuts = false;
      state.session.revealHand = false;
      state.session.revealDetail = null;
    }
    function labSelectSlot(section, index) {
      if (!state.lab[section] || index < 0 || index >= state.lab[section].length) return;
      if (state.lab[section][index]) {
        state.lab[section][index] = null;
      }
      state.lab.activeSlot = { section, index };
      state.lab.exportStatus = '';
      clearLabAids();
      notify();
    }
    function labPlaceCard(card) {
      if (!validCard(card)) return;
      const used = new Set(labUsedCards(state.lab));
      if (used.has(card)) return;
      const { section, index } = state.lab.activeSlot;
      if (!state.lab[section]) return;
      state.lab[section][index] = card;
      state.lab.exportStatus = '';
      clearLabAids();
      notify();
    }
    function labRandomSection(section) {
      if (!state.lab[section]) return;
      const sections = [];
      if ((section === 'turn' || section === 'river') &&
          state.lab.flop.filter(Boolean).length < state.lab.flop.length) {
        sections.push('flop');
      }
      if (section === 'river' && !state.lab.turn[0]) {
        sections.push('turn');
      }
      sections.push(section);
      sections.forEach(target => {
        state.lab[target] = state.lab[target].map(() => null);
        const available = deck(labUsedCards(state.lab));
        state.lab[target] = pick(available, state.lab[target].length);
      });
      state.lab.activeSlot = nextLabSlot(state.lab);
      state.lab.exportStatus = '';
      clearLabAids();
      notify();
    }
    function labRandomSpot() {
      const cards = pick(deck(), 9);
      state.lab.hero = cards.slice(0, 2);
      state.lab.villain = cards.slice(2, 4);
      state.lab.flop = cards.slice(4, 7);
      state.lab.turn = cards.slice(7, 8);
      state.lab.river = cards.slice(8, 9);
      state.lab.activeSlot = nextLabSlot(state.lab);
      state.lab.exportStatus = '';
      clearLabAids();
      notify();
    }
    function labClear() {
      state.lab.hero = [null, null];
      state.lab.villain = [null, null];
      state.lab.flop = [null, null, null];
      state.lab.turn = [null];
      state.lab.river = [null];
      state.lab.activeSlot = { section: 'hero', index: 0 };
      state.lab.exportStatus = '';
      clearLabAids();
      notify();
    }
    function labSetScenario(key, value) {
      const number = Number(String(value).replace(',', '.'));
      if (!Number.isFinite(number) || number < 0) return;
      state.lab.scenario[key] = number;
      state.lab.exportStatus = '';
      notify();
    }
    function setDisplayMode(mode) {
      if (!['percent', 'ratio'].includes(mode)) return;
      state.config.displayMode = mode;
      notify();
    }
    function toggleHiddenField(field) {
      if (state.config.hiddenFields.has(field)) state.config.hiddenFields.delete(field);
      else state.config.hiddenFields.add(field);
      notify();
    }
    function exportText() {
      const spot = state.session.spot;
      if (!spot) {
        const invalid = validateLabState(state.lab);
        if (invalid.length) return invalidLabExport(state.lab, invalid);
      }
      const analysis = spot
        ? analyzeSpot(spot.hero, spot.board, spot.scenario)
        : labAnalysis();
      const hero = analysis.hero.join(' ') || '--';
      const villain = analysis.villain.join(' ') || '--';
      const math = analysis.math;
      const futureEquity = math.equity === null ? 'N/A' : formatPercent(math.equity);
      const decisionEquityDisabled = analysis.mode === 'MADE_HAND_MODE' ||
        analysis.mode === 'RIVER_FINAL_MODE';
      const positiveText = analysis.outs.hasVillain
        ? analysis.outs.positive.join(' ') || '--'
        : 'N/A';
      const negativeText = analysis.outs.hasVillain
        ? analysis.outs.negative.join(' ') || '--'
        : 'N/A';
      const finalResult = analysis.showdown === null ? 'Sin Villain' :
        analysis.showdown > 0 ? 'Hero gana' :
          analysis.showdown < 0 ? 'Villain gana' : 'Empate';
      const resultLabel = analysis.mode === 'RIVER_FINAL_MODE'
        ? finalResult
        : math.action;
      const usefulLabel = analysis.mode === 'MADE_HAND_MODE'
        ? 'Mejoras posibles'
        : 'Outs utiles decision';
      const lines = [
        'POT ODDS TRAINER',
        `Modo interno: ${analysis.mode}`,
        `Hero: ${hero}`,
        `Villain: ${villain}`,
        `Board: ${analysis.board.slice(0, 3).join(' ') || '--'}`,
        `Turn: ${analysis.board[3] || '--'}`,
        `River: ${analysis.board[4] || '--'}`,
        `Cartas muertas: ${analysis.outs.deadCards.join(' ') || '--'}`,
        `Available deck: ${analysis.outs.availableDeck.length}`,
        '',
        `Bote: ${math.pot}`,
        `Apuesta: ${math.bet}`,
        `Ratio: ${formatRatio(math.ratio)}`,
        `Equity necesaria: ${formatPercent(math.needed)}`,
        `Mano Hero: ${analysis.current ? analysis.current.handName : '--'}`,
        `Mano Villain: ${analysis.villainCurrent ? analysis.villainCurrent.handName : '--'}`,
        '',
        `Outs positivas: ${positiveText}`,
        `Outs negativas: ${negativeText}`,
        `Outs limpias: ${analysis.outs.clean.join(' ') || '--'}`,
        `Outs marginales: ${analysis.outs.marginal.join(' ') || '--'}`,
        `Outs brutas: ${analysis.outs.raw.join(' ') || '--'}`,
        `${usefulLabel}: ${analysis.mode === 'MADE_HAND_MODE'
          ? analysis.outs.clean.join(' ') || '--'
          : analysis.outs.useful.join(' ') || '--'}`,
        '',
        `Equity por outs turn: ${decisionEquityDisabled || math.turn === null ? 'N/A' : formatPercent(math.turn)}`,
        `Equity por outs river: ${decisionEquityDisabled || math.river === null ? 'N/A' : formatPercent(math.river)}`,
        `Resultado: ${resultLabel}`,
        '',
        'Desarrollo:',
        `Bote final = ${math.pot} + ${math.bet} + ${math.bet} = ${math.finalPot}`,
        `Equity necesaria = ${math.bet} / ${math.finalPot} = ${formatPercent(math.needed)}`
      ];
      if (analysis.mode === 'RIVER_FINAL_MODE') {
        lines.push(
          `Mano final Hero = ${analysis.current ? analysis.current.handName : '--'}`,
          `Mano final Villain = ${analysis.villainCurrent ? analysis.villainCurrent.handName : '--'}`,
          `Resultado final = ${finalResult}`,
          'Equity futura = N/A'
        );
      } else if (analysis.mode === 'MADE_HAND_MODE') {
        lines.push(
          `Mano actual = ${analysis.current ? analysis.current.handName : '--'}`,
          `Mejoras posibles = ${analysis.outs.clean.join(' ') || '--'}`,
          'Decision por outs = N/A'
        );
      } else {
        if (math.turn !== null) {
          lines.push(`Turn = ${analysis.outs.useful.length} x 2 = ${formatPercent(math.turn)}`);
        }
        if (math.river !== null) {
          lines.push(`River = ${analysis.outs.useful.length} x ${analysis.board.length === 3 ? 4 : 2} = ${formatPercent(math.river)}`);
        }
        lines.push(`${futureEquity} ${math.equity === null ? '' : math.equity >= math.needed ? '>=' : '<'} ${formatPercent(math.needed)} => ${math.action}`.trim());
        if (analysis.mode === 'MADE_HAND_BEHIND_MODE') {
          lines.push('Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.');
        }
      }
      return lines.join('\n');
    }
    function openSimulatorLab(payload) {
      const source = payload && typeof payload === 'object' ? payload : null;
      if (!source || !Array.isArray(source.heroCards) || source.heroCards.length !== 2 ||
          !Array.isArray(source.board) || source.board.length < 3) return false;
      const hero = source.heroCards.slice(0, 2);
      const villain = Array.isArray(source.villainCards) ? source.villainCards.slice(0, 2) : [];
      const board = source.board.slice(0, 4);
      const used = hero.concat(villain, board).filter(Boolean);
      if (new Set(used).size !== used.length || !used.every(card => deck().includes(card))) return false;
      clearTimers();
      state.session.spot = null;
      state.session.selectedPositive = new Set();
      state.session.selectedNegative = new Set();
      state.session.reveal = false;
      state.session.revealOuts = false;
      state.session.revealHand = false;
      state.session.revealDetail = null;
      state.session.action = null;
      state.session.roundRecorded = false;
      state.lab.hero = hero;
      state.lab.villain = [villain[0] || null, villain[1] || null];
      state.lab.flop = board.slice(0, 3);
      state.lab.turn = [board[3] || null];
      state.lab.river = [null];
      state.lab.scenario = {
        pot: Math.max(0, Number(source.pot) || 0),
        bet: Math.max(0, Number(source.bet) || 0)
      };
      state.lab.activeSlot = nextLabSlot(state.lab);
      state.lab.exportStatus = '';
      state.lab.returnContext = Object.assign({}, source);
      state.phase = 'ready';
      state.feedback = 'Spot del Simulador cargado. Analiza libremente; la mesa original no cambia.';
      notify();
      return true;
    }
    function returnToSimulator() {
      if (!state.lab.returnContext) return false;
      const context = state.lab.returnContext;
      state.lab.returnContext = null;
      clearLabAids();
      RT.emit('potodds:simulator:return', context);
      notify();
      return true;
    }
    function exportSpot() {
      const text = exportText();
      state.lab.exportStatus = 'Export listo';
      if (typeof navigator !== 'undefined' &&
          navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      notify();
      return text;
    }
    function instruction() {
      return {
        'outs-basic': 'Selecciona las outs, completa la equity y decide CALL o FOLD.',
        duel: 'Compara la equity disponible con las pot odds y decide.',
        identify: 'Selecciona todas las cartas que mejoran la mano.',
        ranking: 'Introduce la equity minima necesaria.'
      }[state.config.mode];
    }
    function setMode(mode) {
      if (!['outs-basic','duel','identify','ranking'].includes(mode)) return;
      state.config.mode = mode;
      next();
    }
    function toggleOut(card) {
      const spot = state.session.spot;
      if (!spot || state.session.roundRecorded || state.session.reveal) return;
      const selected = state.session.activeSelection === 'negative'
        ? state.session.selectedNegative
        : state.session.selectedPositive;
      const other = state.session.activeSelection === 'negative'
        ? state.session.selectedPositive
        : state.session.selectedNegative;
      other.delete(card);
      if (selected.has(card)) selected.delete(card);
      else selected.add(card);
      if (state.config.mode === 'identify') validate();
      else notify();
    }
    function explainOut(card) {
      const spot = state.session.spot;
      const lab = !spot ? labAnalysis() : null;
      if ((!spot && !lab) || !state.session.reveal) return false;
      const source = spot || lab;
      const hero = spot ? spot.hero : lab.hero;
      const board = spot ? spot.board : lab.board;
      const currentHand = spot ? spot.bestHand : lab.current ? lab.current.hand : null;
      const expected = source.mode === 'MADE_HAND_MODE'
        ? source.outs.clean || []
        : source.outs.useful || source.outs.clean || [];
      const isCorrect = expected.includes(card);
      const detail = {
        card,
        isCorrect,
        board: null,
        hand: null,
        message: '',
        usedCards: []
      };
      if (isCorrect && (board.length === 3 || board.length === 4)) {
        detail.board = board.concat(card);
        const analysis = analyzeBestHand(
          hero.concat(detail.board), card, currentHand
        );
        detail.hand = analysis.hand;
        detail.handName = analysis.handName;
        detail.usedCards = analysis.usedCards;
        detail.highlightStrong = analysis.highlightStrong;
        detail.highlightKicker = analysis.highlightKicker;
        detail.explanation = analysis.explanation;
        detail.message = `${card} ${currentHand && analysis.hand.type === currentHand.type ?
          'mejora' : 'completa'} ${analysis.handName}.`;
      } else if (isCorrect) {
        detail.message = `${card} es una out correcta.`;
      } else {
        detail.message = `${card} no es una out efectiva en este proyecto.`;
      }
      state.session.revealDetail = detail;
      state.feedback = detail.message;
      notify();
      return isCorrect;
    }
    function setSelectionMode(mode) {
      if (!['positive', 'negative'].includes(mode)) return;
      state.session.activeSelection = mode;
      notify();
    }
    function input(field, value) {
      if (!state.session.spot || state.session.roundRecorded) return;
      state.session.inputs[field] = String(value);
      notify();
    }
    function action(value) {
      if (!state.session.spot || state.session.roundRecorded) return false;
      state.session.action = value;
      return validate();
    }
    function setExerciseScenario(key, value) {
      const spot = state.session.spot;
      const number = Number(String(value).replace(',', '.'));
      if (!spot || !Number.isFinite(number) || number < 0) return;
      spot.scenario[key] = number;
      const analysis = analyzeSpot(spot.hero, spot.board, spot.scenario);
      const total = analysis.outs.useful.length;
      const math = potMath(spot.scenario.pot, spot.scenario.bet, total, spot.board.length, {
        madeHand: analysis.mode === 'MADE_HAND_MODE'
      });
      spot.scenario.needed = math.needed;
      spot.scenario.ratio = math.ratio;
      spot.scenario.callCorrect = math.action === 'CALL';
      spot.outs = analysis.outs;
      spot.equityTurn = math.turn;
      spot.equityRiver = math.river;
      notify();
    }
    function validate(force) {
      const spot = state.session.spot;
      if (!spot || state.session.roundRecorded) return false;
      const selectedPositive = state.session.selectedPositive;
      const selectedNegative = state.session.selectedNegative;
      const expectedPositive = spot.outs.hasVillain ? spot.outs.positive : spot.outs.useful;
      const expectedNegative = spot.outs.hasVillain ? spot.outs.negative : [];
      const expected = expectedPositive.concat(expectedNegative);
      const outsCorrect =
        selectedPositive.size === expectedPositive.length &&
        selectedNegative.size === expectedNegative.length &&
        expectedPositive.every(card => selectedPositive.has(card)) &&
        expectedNegative.every(card => selectedNegative.has(card));
      const needed = parseEquity(state.session.inputs.needed);
      const turn = parseEquity(state.session.inputs.turn);
      const river = parseEquity(state.session.inputs.river);
      const neededCorrect = needed !== null && Math.abs(needed - spot.scenario.needed) <= .5;
      const turnCorrect = spot.equityTurn === null ||
        (turn !== null && Math.abs(turn - spot.equityTurn) <= 2);
      const riverCorrect = spot.equityRiver === null ||
        (river !== null && Math.abs(river - spot.equityRiver) <= 2);
      const actionCorrect = state.session.action ===
        (spot.scenario.callCorrect ? 'CALL' : 'FOLD');
      let correct = false;
      let complete = false;
      if (state.config.mode === 'identify') {
        complete = !!force ||
          selectedPositive.size + selectedNegative.size >= expected.length;
        correct = outsCorrect;
      } else if (state.config.mode === 'duel') {
        complete = !!state.session.action;
        correct = actionCorrect;
      } else if (state.config.mode === 'ranking') {
        const rankingValue = parsePercent(state.session.inputs.needed);
        complete = !!force || rankingValue !== null;
        correct = rankingValue !== null &&
          Math.abs(rankingValue - spot.scenario.needed) <= .5;
      } else {
        complete = !!force || (needed !== null && turnCorrect &&
          (spot.equityRiver === null || river !== null) && !!state.session.action);
        correct = outsCorrect && neededCorrect && turnCorrect && riverCorrect &&
          actionCorrect;
      }
      if (!complete) {
        notify();
        return false;
      }
      clearTimers();
      state.phase = correct ? 'correct' : 'error';
      state.feedback = correct ? 'Respuesta correcta.' : solutionText();
      record(correct);
      notify();
      return correct;
    }
    function solutionText() {
      const spot = state.session.spot;
      const analysis = analyzeSpot(spot.hero, spot.board, spot.scenario);
      if (state.config.hiddenFields.has('result')) {
        return `Outs ${analysis.outs.useful.length} - Resultado oculto.`;
      }
      if (analysis.mode === 'RIVER_FINAL_MODE') {
        return `${analysis.current ? analysis.current.handName : 'Mano final'} - Equity futura N/A.`;
      }
      if (analysis.mode === 'MADE_HAND_MODE') {
        return `${analysis.current.handName} - Mano hecha, mejoras futuras secundarias.`;
      }
      if (analysis.mode === 'MADE_HAND_BEHIND_MODE') {
        return `${analysis.current.handName} pero va por detras - ` +
          `Outs utiles ${analysis.outs.useful.length} - ${analysis.math.action}.`;
      }
      return `Outs ${analysis.outs.useful.length} - ` +
        `Equity necesaria ${analysis.math.needed.toFixed(1)}% - ${analysis.math.action}.`;
    }
    function phaseFeedback() {
      if (state.phase === 'correct') return 'Respuesta correcta.';
      if (state.phase === 'error') return solutionText();
      return instruction();
    }
    function toggleReveal() {
      state.session.reveal = !state.session.reveal;
      if (state.session.reveal) {
        clearTimers();
        state.session.remainingMs = 0;
        state.session.revealOuts = true;
        state.session.revealHand = false;
      } else {
        state.session.revealOuts = false;
        state.session.revealHand = false;
        state.session.revealDetail = null;
      }
      if (!state.session.spot) {
        state.feedback = state.session.reveal
          ? 'Reveal activo: pulsa una out limpia para ver que completa.'
          : 'Laboratorio manual.';
      } else {
        state.feedback = state.session.reveal ? solutionText() : phaseFeedback();
      }
      notify();
    }
    function toggleOutHints() {
      if (state.session.reveal) return;
      state.session.revealOuts = !state.session.revealOuts;
      notify();
    }
    function toggleHandHint() {
      if (state.session.reveal) return;
      state.session.revealHand = !state.session.revealHand;
      notify();
    }
    function revealZone(zone) {
      state.session.hiddenZones.delete(zone);
      notify();
      if (state.config.memoryDuration > 0 && state.config.memoryZones.has(zone)) {
        memoryTimers.push(setTimeout(() => {
          state.session.hiddenZones.add(zone);
          notify();
        }, 500));
      }
    }
    function configChanged() {
      state.feedback = 'Configuracion actualizada.';
      notify();
    }
    function handleKey(key) {
      const mode = state.config.mode;
      if (key === 'Escape') return false;
      if (key === 'Enter' && state.session.roundRecorded) {
        next();
        return true;
      }
      if (key.toLowerCase() === 'c' && (mode === 'duel' || mode === 'outs-basic')) {
        action('CALL'); return true;
      }
      if (key.toLowerCase() === 'f' && (mode === 'duel' || mode === 'outs-basic')) {
        action('FOLD'); return true;
      }
      return false;
    }
    function stop() {
      clearTimers();
      state.session.spot = null;
      state.session.remainingMs = 0;
      state.session.hiddenZones = new Set();
      state.session.reveal = false;
      state.session.revealOuts = false;
      state.session.revealHand = false;
      state.session.revealDetail = null;
      state.phase = 'ready';
      state.feedback = 'Configura el ejercicio o inicia una ronda.';
      notify();
    }
    function destroy() { stop(); }
    return {
      next, setMode, toggleOut, explainOut, setSelectionMode, input, action,
      setExerciseScenario, validate, toggleReveal,
      toggleOutHints, toggleHandHint, revealZone, configChanged, handleKey,
      stop, destroy, getBestHand, analyzeBestHand, labAnalysis, labSelectSlot,
      labPlaceCard, labRandomSection, labRandomSpot, labClear, labSetScenario,
      setDisplayMode, toggleHiddenField, exportSpot, exportText,
      compareHands, effectiveOuts, cleanOuts, opponentCanBeat, parseEquity,
      parsePercent, potMath, formatPercent, formatRatio, deck, analyzeSpot,
      splitOuts, availableDeck, deadCards, internalModeFor,
      handLabels: HAND_LABELS
    };
  }

  RT.PotOddsTrainerEngine = {
    create, getBestHand, analyzeBestHand, compareHands, effectiveOuts,
    cleanOuts, opponentCanBeat, potMath, formatPercent, formatRatio,
    splitOuts, availableDeck, deadCards, internalModeFor, analyzeSpot,
    generateSimulatorSpot, simulatorDecision
  };
})(window.RT);
