'use strict';

(function (RT) {
  const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const SUITS = ['s', 'h', 'd', 'c'];
  const SUIT_LABELS = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const SUIT_NAMES = { s: 'picas', h: 'corazones', d: 'diamantes', c: 'treboles' };
  const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index]));
  const HAND_TYPES = [
    'Carta alta',
    'Pareja',
    'Doble pareja',
    'Trio',
    'Escalera',
    'Color',
    'Full house',
    'Poker',
    'Escalera de color'
  ];
  const FILTER_TYPES = HAND_TYPES.concat('Split');
  const MAX_ATTEMPTS = 800;

  function createDeck() {
    const deck = [];
    RANKS.forEach((rank) => {
      SUITS.forEach((suit) => deck.push({ rank, suit, code: rank + suit }));
    });
    return deck;
  }

  function shuffle(cards) {
    const copy = cards.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function cardLabel(card) {
    return card ? `${card.rank}${SUIT_LABELS[card.suit] || card.suit}` : '';
  }

  function cardLongLabel(card) {
    return card ? `${card.rank} de ${SUIT_NAMES[card.suit] || card.suit}` : '';
  }

  function nextPosition(position) {
    const index = POSITIONS.indexOf(position);
    return POSITIONS[(index + 1 + POSITIONS.length) % POSITIONS.length] || 'MP';
  }

  function randomPosition(exclude) {
    const pool = POSITIONS.filter((position) => position !== exclude);
    return pool[Math.floor(Math.random() * pool.length)] || nextPosition(exclude);
  }

  function resolvePositions(config) {
    let hero = config.heroPosition || 'random';
    let villain = config.villainPosition || 'random';
    if (hero === 'random' && villain === 'random') {
      hero = randomPosition(null);
      villain = randomPosition(hero);
    } else if (hero === 'random') {
      hero = randomPosition(villain);
    } else if (villain === 'random') {
      villain = randomPosition(hero);
    } else if (hero === villain) {
      villain = nextPosition(hero);
    }
    return { hero, villain };
  }

  function generate(config) {
    const positions = resolvePositions(config || {});
    const targets = buildTargets(config || {});
    if (targets.impossible) {
      const fallback = generateRound(positions);
      fallback.filterFallback = true;
      fallback.filterNotice = 'La matriz no deja jugadas posibles para Hero o Villain; se genero un duelo aleatorio valido.';
      return fallback;
    }
    if (!targets.enabled && !targets.hasRestrictions) return generateRound(positions);
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const round = generateRound(positions);
      if (matchesTargets(round, targets)) {
        round.filterAttempts = attempt;
        return round;
      }
    }
    const fallback = generateRound(positions);
    fallback.filterFallback = true;
    fallback.filterNotice = 'No se pudo cumplir el filtro tras varios intentos; se genero un duelo aleatorio valido.';
    return fallback;
  }

  function generateRound(positions) {
    const deck = shuffle(createDeck());
    const hero = deck.splice(0, 2);
    const villain = deck.splice(0, 2);
    const board = deck.splice(0, 5);
    const heroBest = evaluate(hero.concat(board));
    const villainBest = evaluate(villain.concat(board));
    const cmp = compareHands(heroBest, villainBest);
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      heroPosition: positions.hero,
      villainPosition: positions.villain,
      hero,
      villain,
      board,
      heroBest,
      villainBest,
      winner: cmp > 0 ? 'hero' : (cmp < 0 ? 'villain' : 'split')
    };
  }

  function buildTargets(config) {
    const mode = config.filterMode || 'random';
    const rules = filterRules(config.filters || {});
    if (mode === 'random') return Object.assign({ enabled: false }, rules);
    const entries = activeFilterEntries(config.filters || {});
    if (!entries.length || isNeutralMatrix(entries)) return Object.assign({ enabled: false }, rules);
    return Object.assign({ enabled: true, target: weightedEntry(entries) }, rules);
  }

  function activeFilterEntries(groups) {
    const entries = [];
    ['hero', 'villain', 'both'].forEach((side) => {
      FILTER_TYPES.forEach((type) => {
        const cfg = groups[side] && groups[side][type];
        if (cfg && cfg.enabled && Number(cfg.weight) > 0) {
          entries.push({ side, type, weight: Number(cfg.weight) });
        }
      });
    });
    return entries;
  }

  function matrixSelection(groups, type) {
    if (groups.both && groups.both[type] && groups.both[type].enabled) return 'both';
    if (groups.hero && groups.hero[type] && groups.hero[type].enabled) return 'hero';
    if (groups.villain && groups.villain[type] && groups.villain[type].enabled) return 'villain';
    return 'none';
  }

  function filterRules(groups) {
    const heroAllowed = new Set();
    const villainAllowed = new Set();
    let splitAllowed = false;
    let hasRestrictions = false;
    HAND_TYPES.forEach((type) => {
      const selected = matrixSelection(groups, type);
      if (selected === 'hero' || selected === 'both') heroAllowed.add(type);
      if (selected === 'villain' || selected === 'both') villainAllowed.add(type);
      if (selected !== 'both') hasRestrictions = true;
    });
    splitAllowed = matrixSelection(groups, 'Split') !== 'none';
    if (!splitAllowed) hasRestrictions = true;
    return {
      heroAllowed,
      villainAllowed,
      splitAllowed,
      hasRestrictions,
      impossible: !heroAllowed.size || !villainAllowed.size
    };
  }

  function weightedEntry(entries) {
    const total = entries.reduce((sum, item) => sum + item.weight, 0);
    let needle = Math.random() * total;
    for (const item of entries) {
      needle -= item.weight;
      if (needle <= 0) return item;
    }
    return entries[entries.length - 1];
  }

  function isNeutralMatrix(entries) {
    if (entries.length !== FILTER_TYPES.length) return false;
    if (entries.some(item => item.side !== 'both')) return false;
    const first = entries[0].weight || 0;
    return entries.every(item => Math.abs((item.weight || 0) - first) < 0.001);
  }

  function matchesTargets(round, targets) {
    if (targets.heroAllowed && !targets.heroAllowed.has(round.heroBest.type)) return false;
    if (targets.villainAllowed && !targets.villainAllowed.has(round.villainBest.type)) return false;
    if (round.winner === 'split' && targets.splitAllowed === false) return false;
    if (!targets.target) return true;
    if (targets.target.side === 'hero' && !matchesSide(round, 'hero', targets.target.type)) return false;
    if (targets.target.side === 'villain' && !matchesSide(round, 'villain', targets.target.type)) return false;
    if (targets.target.side === 'both' && !matchesBoth(round, targets.target.type)) return false;
    return true;
  }

  function matchesSide(round, side, target) {
    if (target === 'Split') return round.winner === 'split';
    const best = side === 'hero' ? round.heroBest : round.villainBest;
    return best && best.type === target;
  }

  function matchesBoth(round, target) {
    if (target === 'Split') return round.winner === 'split';
    return (round.heroBest && round.heroBest.type === target) ||
      (round.villainBest && round.villainBest.type === target);
  }

  function combinations5(cards) {
    const result = [];
    for (let a = 0; a < cards.length - 4; a++) {
      for (let b = a + 1; b < cards.length - 3; b++) {
        for (let c = b + 1; c < cards.length - 2; c++) {
          for (let d = c + 1; d < cards.length - 1; d++) {
            for (let e = d + 1; e < cards.length; e++) {
              result.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            }
          }
        }
      }
    }
    return result;
  }

  function straightHigh(values) {
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    if (unique.length !== 5) return null;
    if (unique[4] - unique[0] === 4) return unique[4];
    if (unique.join(',') === '0,1,2,3,12') return 3;
    return null;
  }

  function scoreFive(cards) {
    const values = cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    const groups = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || b.value - a.value);
    const flush = cards.every((card) => card.suit === cards[0].suit);
    const straight = straightHigh(values);

    let category = 0;
    let tiebreak = values.slice();
    if (flush && straight !== null) {
      category = 8;
      tiebreak = [straight];
    } else if (groups[0].count === 4) {
      category = 7;
      tiebreak = [groups[0].value, groups[1].value];
    } else if (groups[0].count === 3 && groups[1].count === 2) {
      category = 6;
      tiebreak = [groups[0].value, groups[1].value];
    } else if (flush) {
      category = 5;
      tiebreak = values.slice();
    } else if (straight !== null) {
      category = 4;
      tiebreak = [straight];
    } else if (groups[0].count === 3) {
      category = 3;
      tiebreak = [groups[0].value].concat(groups.slice(1).map(g => g.value).sort((a, b) => b - a));
    } else if (groups[0].count === 2 && groups[1].count === 2) {
      category = 2;
      const pairs = groups.filter(g => g.count === 2).map(g => g.value).sort((a, b) => b - a);
      const kicker = groups.find(g => g.count === 1).value;
      tiebreak = pairs.concat(kicker);
    } else if (groups[0].count === 2) {
      category = 1;
      tiebreak = [groups[0].value].concat(groups.slice(1).map(g => g.value).sort((a, b) => b - a));
    }

    return { category, tiebreak, cards, label: handLabel(category, tiebreak) };
  }

  function rankName(value) {
    return RANKS[value] || '?';
  }

  function handLabel(category, values) {
    if (category === 8) return values[0] === 12 ? 'Escalera real' : `Escalera de color al ${rankName(values[0])}`;
    if (category === 7) return `Poker de ${rankName(values[0])}`;
    if (category === 6) return `Full house de ${rankName(values[0])} con ${rankName(values[1])}`;
    if (category === 5) return `Color al ${rankName(values[0])}`;
    if (category === 4) return `Escalera al ${rankName(values[0])}`;
    if (category === 3) return `Trio de ${rankName(values[0])}`;
    if (category === 2) return `Doble pareja de ${rankName(values[0])} y ${rankName(values[1])}`;
    if (category === 1) return `Pareja de ${rankName(values[0])}`;
    return `Carta alta ${rankName(values[0])}`;
  }

  function compareScore(a, b) {
    if (a.category !== b.category) return a.category - b.category;
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  function evaluate(cards) {
    let best = null;
    combinations5(cards).forEach((combo) => {
      const score = scoreFive(combo);
      if (!best || compareScore(score, best) > 0) best = score;
    });
    if (!best) return null;
    return {
      type: HAND_TYPES[best.category],
      rank: best.category,
      values: best.tiebreak,
      label: best.label,
      cards: best.cards.slice(),
      usedCodes: best.cards.map(card => card.code)
    };
  }

  function compareHands(heroBest, villainBest) {
    if (!heroBest || !villainBest) return 0;
    return compareScore(
      { category: heroBest.rank, tiebreak: heroBest.values },
      { category: villainBest.rank, tiebreak: villainBest.values }
    );
  }

  RT.SimulatorDuelHandsEngine = {
    POSITIONS,
    RANKS,
    SUITS,
    SUIT_LABELS,
    HAND_TYPES,
    FILTER_TYPES,
    MAX_ATTEMPTS,
    createDeck,
    generate,
    evaluate,
    compareHands,
    cardLabel,
    cardLongLabel
  };
})(window.RT);
