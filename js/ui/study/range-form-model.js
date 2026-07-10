/* Modelo puro del formulario compacto de creaciÃ³n/ediciÃ³n de rangos. */
'use strict';

(function (RT) {
  const list = values => Object.freeze(values);

  const COLLECTIONS = list([
    'Mis rangos', 'Favoritos', 'Cash', 'MTT', 'Spins', 'SNG', 'HU', 'Crear nueva'
  ]);
  const RANGE_TYPES = list(['Personal', 'Coach', 'Escuela']);
  const BET_FORMATS = list(['No Limit Holdem', 'Pot Limit']);
  const GAMES = list(['Cash', 'MTT', 'Spins', 'SNG', 'HU']);
  const ENVIRONMENTS = list(['Online', 'Live', 'General']);

  const SUB_GAMES = Object.freeze({
    Cash: list(['Regular Cash', 'Fast Fold / Zoom', 'Ante Cash', 'Straddle Cash',
      'Deep Cash', 'Short Stack Cash', 'Nuevo']),
    MTT: list(['Standard MTT', 'KO / Bounty', 'PKO', 'Mystery Bounty', 'Satellite',
      'Re-entry', 'Rebuy', 'Freezeout', 'Turbo', 'Hyper Turbo', 'Deepstack', 'Nuevo']),
    Spins: list(['Standard Spin', 'Flash / Nitro Spin', 'Deep Spin', '6-max Spin', 'Nuevo']),
    SNG: list(['Regular SNG', 'Turbo', 'Hyper Turbo', 'KO / Bounty SNG', 'Satellite SNG',
      'Fifty50', 'Double or Nothing', 'Nuevo']),
    HU: list(['HU Cash', 'HU SNG', 'HU Spin', 'HU MTT Final', 'HU Hyper',
      'HU Turbo', 'HU Deep', 'HU Short Stack', 'Nuevo'])
  });

  const STAKES = Object.freeze({
    Cash: list(['NL2', 'NL5', 'NL10', 'NL16', 'NL25', 'NL50', 'NL100', 'NL200',
      'NL500', 'NL1000', 'NL2000+', 'Live Low', 'Live Mid', 'Live High', 'Nuevo']),
    MTT: list(['Freeroll', 'â‚¬0-â‚¬1', 'â‚¬1-â‚¬5', 'â‚¬5-â‚¬11', 'â‚¬11-â‚¬22', 'â‚¬22-â‚¬55',
      'â‚¬55-â‚¬109', 'â‚¬109-â‚¬215', 'â‚¬215-â‚¬530', 'â‚¬530-â‚¬1050', 'â‚¬1050+', 'Nuevo']),
    Spins: list(['0.25', '0.50', '1', '2', '5', '10', '25', '50', '100', '250',
      '500+', 'Nuevo']),
    SNG: list(['0.25', '0.50', '1', '2', '5', '10', '25', '50', '100', '250',
      '500+', 'Nuevo']),
    HU: list(['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100', 'NL200', 'NL500',
      'NL1000+', 'HU SNG 1', 'HU SNG 5', 'HU SNG 10', 'HU SNG 25',
      'HU SNG 50', 'HU SNG 100+', 'Nuevo'])
  });

  const TABLES = list(['2-max', '3-max', '4-max', '5-max', '6-max', '7-max',
    '8-max', '9-max', '10-max']);
  const POSITIONS = Object.freeze({
    '2-max': list(['BTN/SB', 'BB']),
    '3-max': list(['BTN', 'SB', 'BB']),
    '4-max': list(['CO', 'BTN', 'SB', 'BB']),
    '5-max': list(['HJ', 'CO', 'BTN', 'SB', 'BB']),
    '6-max': list(['LJ / UTG', 'HJ / MP', 'CO', 'BTN', 'SB', 'BB']),
    '7-max': list(['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
    '8-max': list(['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
    '9-max': list(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
    '10-max': list(['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ',
      'CO', 'BTN', 'SB', 'BB'])
  });

  const STACKS = list(['3bb', '5bb', '7bb', '10bb', '12bb', '15bb', '18bb',
    '20bb', '25bb', '30bb', '35bb', '40bb', '50bb', '60bb', '75bb', '80bb',
    '100bb', '125bb', '150bb', '175bb', '200bb', 'Nuevo']);
  const STACK_RELATIONS = list([
    'General',
    'Hero covers',
    'Rival covers',
    'Equal stacks',
    'Hero short',
    'Rival short',
    'Hero big stack',
    'Rival big stack',
    'Short vs big',
    'Big vs short',
    'Custom'
  ]);
  const RELATIONS = list(['Auto', 'IP', 'OOP']);
  const MULTIWAY_MODES = list(['OFF', 'SINGLE', 'MULTIWAY']);
  const ANTE_TYPES = list(['Ante clÃ¡sico', 'BB ante', 'Button ante',
    'Ante por jugador', 'Nuevo']);
  const STRADDLE_TYPES = list(['UTG straddle', 'Button straddle',
    'Mississippi straddle', 'Multiple straddle', 'Nuevo']);
  const FORCED_BET_MODES = list(['none', 'ante', 'straddle', 'ante_straddle']);
  const FORCED_BET_MODE_LABELS = Object.freeze({
    none: 'None',
    ante: 'Ante',
    straddle: 'Straddle',
    ante_straddle: 'Ante / Straddle'
  });
  const FORCED_ANTE_TYPES = list([
    'Classic ante', 'BB ante', 'Button ante', 'Per player ante', 'Custom'
  ]);
  const FORCED_STRADDLE_TYPES = list([
    'UTG straddle', 'Button straddle', 'Mississippi straddle',
    'Multiple straddle', 'Mandatory straddle', 'Custom'
  ]);
  const FORCED_ANTE_AMOUNTS = list([
    '0.1bb / 10%', '0.125bb / 12.5%', '0.2bb / 20%',
    '0.25bb / 25%', '0.5bb / 50%', '1bb / 100%', 'Custom'
  ]);
  const FORCED_STRADDLE_AMOUNTS = list([
    '2bb / x2', '4bb / x4', '8bb / x8', 'Custom'
  ]);

  const PHASES = Object.freeze({
    MTT: list(['General', 'Early Game', 'Middle Game', 'Bubble', 'In The Money',
      'Final Table', 'Heads-Up', 'Nuevo']),
    SNG: list(['General', 'Early Game', 'Middle Game', 'Bubble', 'In The Money',
      'Final Table', 'Heads-Up', 'Nuevo']),
    Spins: list(['General', '3-handed', 'Heads-Up', 'Nuevo'])
  });
  const PRIZES = Object.freeze({
    MTT: list(['General', 'Standard', 'Top Heavy', 'Flat', 'Satellite',
      'Winner Takes All', 'Nuevo']),
    SNG: list(['General', 'Standard', 'Top Heavy', 'Flat', 'Satellite',
      'Winner Takes All', 'Nuevo']),
    Spins: list(['General', 'Winner Takes All', 'Top 2 Paid', 'Big Multiplier', 'Nuevo'])
  });
  const MODELS = list(['General', 'ChipEV', 'ICM', 'Bubble Pressure',
    'Final Table ICM', 'Bounty EV', 'Nuevo']);
  const PROFILES = list(['General', 'Reg', 'Strong reg', 'Recreational', 'Fish',
    'Whale', 'Nit', 'Loose passive', 'Loose aggressive', 'Maniac',
    'Short stack', 'Big stack', 'Nuevo']);
  const RECREATIONAL_PROFILES = new Set([
    'Recreational', 'Fish', 'Whale', 'Loose passive', 'Loose aggressive', 'Maniac'
  ]);
  const EXPLOITS = list(['No aplica', 'Vs recreacional desconocido', 'Vs calling station',
    'Vs limp/caller', 'Vs limp/folder', 'Vs whale', 'Vs maniac',
    'Vs short recreational', 'Vs deep recreational', 'Wider ISO',
    'Wider value 3Bet', 'Reduce bluff 4Bet', 'More value-heavy',
    'Attack recreational in blinds', 'Call wider vs maniac',
    'Trap more vs maniac', 'Nuevo']);

  const SPOTS = Object.freeze({
    headsUp: list(['Unopened pot', 'Limped pot', 'Facing open', 'Facing ISO',
      'Facing 3Bet', 'Facing 4Bet', 'Facing 5Bet', 'Squeeze', 'Facing squeeze',
      'Push/Fold', 'Rejam', 'Blind vs Blind', 'HU', 'Straddle / Live', 'Nuevo']),
    multiway: list(['Multiway limped pot', 'Multiway facing open', 'Multiway squeeze',
      'Multiway facing squeeze', 'Multiway all-in', 'Open + caller',
      'Open + 2 callers', 'Open + 3Bet + call', 'Open + 3Bet + cold 4Bet', 'Nuevo'])
  });

  const SUB_SPOTS = Object.freeze({
    'Unopened pot': list(['RFI / Open Raise', 'Open shove', 'Limp first in',
      'Complete SB', 'Fold first in']),
    'Limped pot': list(['Overlimp', 'Limp behind', 'ISO vs 1 limper',
      'ISO vs multiple limpers', 'ROL', 'Raise vs limp', 'BB check option',
      'BB raise vs limp', 'SB complete', 'SB limp/call', 'SB limp/fold',
      'SB limp/raise', 'SB limp/shove']),
    'Facing open': list(['Call vs open', '3Bet vs open', 'Fold vs open',
      'Cold call', 'Cold 3Bet', 'Overcall']),
    'Facing ISO': list(['Call vs ISO', '3Bet vs ISO', 'Fold vs ISO',
      'Backraise vs ISO', 'Limp/raise vs ISO', 'Limp/shove vs ISO']),
    'Facing 3Bet': list(['Fold vs 3Bet', 'Call vs 3Bet', '4Bet vs 3Bet',
      '4Bet jam', 'Cold 4Bet', 'Cold call 3Bet', 'Backraise']),
    'Facing 4Bet': list(['Fold vs 4Bet', 'Call vs 4Bet', '5Bet',
      '5Bet jam', 'Cold 5Bet']),
    'Facing 5Bet': list(['Fold vs 5Bet', 'Call 5Bet jam', '6Bet jam', 'Nuevo']),
    Squeeze: list(['Squeeze IP', 'Squeeze OOP', 'Squeeze SB', 'Squeeze BB',
      'Squeeze BTN', 'Squeeze vs 1 caller', 'Squeeze vs 2+ callers']),
    'Facing squeeze': list(['Fold vs squeeze', 'Call vs squeeze', '4Bet vs squeeze',
      '4Bet jam vs squeeze', 'Cold call vs squeeze']),
    'Push/Fold': list(['Push/fold', 'Open shove', 'Call push', 'Call 3Bet shove',
      'Call 4Bet shove']),
    Rejam: list(['Rejam', 'Rejam over open', 'Rejam over open + call',
      'Rejam over open + 3Bet', 'Call rejam']),
    'Blind vs Blind': list(['SB limp vs BB', 'SB raise vs BB', 'SB shove vs BB',
      'BB check vs SB limp', 'BB raise vs SB limp', 'BB shove vs SB limp',
      'BB call vs SB raise', 'BB 3Bet vs SB raise', 'BB shove vs SB raise']),
    HU: list(['BTN/SB limp', 'BTN/SB minraise', 'BTN/SB open shove',
      'BB check vs limp', 'BB raise vs limp', 'BB shove vs limp',
      'BB call vs minraise', 'BB 3Bet vs minraise', 'BB shove vs minraise',
      'BTN/SB vs 3Bet', 'BTN/SB 4Bet jam', 'Call all-in HU']),
    'Straddle / Live': list(['RFI in straddled pot', 'ISO in straddled pot',
      'Limped straddle pot', 'Facing straddle raise', 'BB/SB vs straddle',
      'Button straddle spot', 'Mississippi straddle spot']),
    'Multiway limped pot': list(['Limp + limp + Hero', 'Overlimp multiway',
      'ISO multiway', 'BB check multiway', 'BB raise multiway']),
    'Multiway facing open': list(['Open + caller + Hero', 'Open + 2 callers + Hero',
      'Cold call multiway', 'Overcall multiway', 'Squeeze after open + caller',
      'Squeeze after open + 2 callers']),
    'Multiway squeeze': list(['Open + 3Bet + Hero', 'Open + 3Bet + call + Hero',
      'Cold 4Bet multiway', 'Call 3Bet multiway', 'Fold vs 3Bet multiway']),
    'Multiway facing squeeze': list(['Open + 3Bet + Hero',
      'Open + 3Bet + call + Hero', 'Cold 4Bet multiway',
      'Call 3Bet multiway', 'Fold vs 3Bet multiway']),
    'Multiway all-in': list(['Multiway call all-in', 'Multiway rejam',
      'Multiway iso shove', 'Multiway call rejam']),
    'Open + caller': list(['Open + caller + Hero', 'Cold call multiway',
      'Squeeze after open + caller']),
    'Open + 2 callers': list(['Open + 2 callers + Hero',
      'Squeeze after open + 2 callers']),
    'Open + 3Bet + call': list(['Open + 3Bet + call + Hero',
      'Call 3Bet multiway', 'Cold 4Bet multiway']),
    'Open + 3Bet + cold 4Bet': list(['Cold 4Bet multiway',
      'Multiway call all-in', 'Multiway rejam']),
    Nuevo: list(['Nuevo'])
  });

  const ACTIONS = list(['Fold', 'Check', 'Call', 'Limp', 'Complete', 'Open Raise',
    'ISO Raise', 'ROL', '3Bet', '4Bet', 'Cold 4Bet', '5Bet', '6Bet',
    'Squeeze', 'Backraise', 'Shove', 'Rejam', 'Call all-in', 'Mixed', 'Nuevo']);
  const SIZES = list(['Sin tamaÃ±o', 'Minraise', '2bb', '2.1bb', '2.2bb', '2.3bb',
    '2.5bb', '3bb', '3.5bb', '4bb', 'All-in', 'Custom bb',
    'Custom x previous', 'Nuevo']);

  function defaults() {
    return {
      collection: 'Mis rangos', name: '', rangeType: 'Personal',
      collectionView: 'Coleccion 1',
      betFormat: 'No Limit Holdem',
      game: 'Cash', environment: 'Online', subGame: 'Regular Cash', stake: 'NL50',
      tableSize: '6-max', hero: 'UTG', rival: 'BB', relation: 'Auto',
      stack: '100bb', stackRelation: 'General', ante: false, anteType: 'BB ante',
      straddle: false, straddleType: 'UTG straddle',
      forcedBetMode: 'none',
      anteConfig: { type: 'BB ante', amount: '1bb / 100%', unit: 'bb' },
      straddleConfig: { type: 'UTG straddle', amount: '2bb / x2', unit: 'bb' },
      multiway: false, multiwayMode: 'OFF',
      phase: 'General', prize: 'General', model: 'General',
      profile: 'General', exploit: 'No aplica',
      spot: 'Unopened pot', subSpot: 'RFI / Open Raise',
      action: 'Open Raise', size: '2.5bb',
      personalCollections: ['Coleccion 1', 'Coleccion 2']
    };
  }

  function option(value) { return { id: value, label: value }; }
  function options(values) { return (values || []).map(option); }
  function positions(tableSize) { return POSITIONS[tableSize] || POSITIONS['6-max']; }
  function subGames(game) { return SUB_GAMES[game] || SUB_GAMES.Cash; }
  function stakes(game) { return STAKES[game] || STAKES.Cash; }
  function phases(game) { return PHASES[game] || []; }
  function prizes(game) { return PRIZES[game] || []; }
  function spots(multiway) { return multiway ? SPOTS.multiway : SPOTS.headsUp; }
  function subSpots(spot) { return SUB_SPOTS[spot] || list(['Nuevo']); }
  function actionNeedsSize(action) {
    return !['Fold', 'Check', 'Limp'].includes(action);
  }

  function inferRelation(hero, rival, tableSize) {
    if (!hero || !rival || ['No aplica', 'Varios rivales'].includes(rival)) return null;
    const tablePositions = positions(tableSize);
    if (!tablePositions.includes(hero) || !tablePositions.includes(rival) || hero === rival) {
      return null;
    }
    const postflopOrder = ['SB', 'BB'].concat(
      tablePositions.filter(position => !['SB', 'BB'].includes(position))
    );
    if (hero === 'BTN/SB') return rival === 'BB' ? 'IP' : null;
    return postflopOrder.indexOf(hero) > postflopOrder.indexOf(rival) ? 'IP' : 'OOP';
  }

  function anteTypeLabel(type) {
    const labels = {
      'Classic ante': 'Classic',
      'BB ante': 'BB',
      'Button ante': 'BTN',
      'Per player ante': 'Per player',
      Custom: 'Custom'
    };
    return labels[type] || type || '—';
  }

  function straddleTypeLabel(type) {
    const labels = {
      'UTG straddle': 'UTG',
      'Button straddle': 'BTN',
      'Mississippi straddle': 'Mississippi',
      'Multiple straddle': 'Multiple',
      'Mandatory straddle': 'Mandatory',
      Custom: 'Custom'
    };
    return labels[type] || type || '—';
  }

  function forcedBetAmountValue(amount, unit) {
    const parts = String(amount || '—').split(' / ');
    return unit === 'percent' || unit === 'multiplier'
      ? (parts[1] || parts[0])
      : parts[0];
  }

  function forcedBetTypeLabel(state) {
    const value = state || {};
    if (value.forcedBetMode === 'ante') return value.anteConfig.type;
    if (value.forcedBetMode === 'straddle') return value.straddleConfig.type;
    if (value.forcedBetMode === 'ante_straddle') {
      return `${anteTypeLabel(value.anteConfig.type)} / ${
        straddleTypeLabel(value.straddleConfig.type)
      }`;
    }
    return '—';
  }

  function forcedBetAmountLabel(state) {
    const value = state || {};
    if (value.forcedBetMode === 'ante') {
      return forcedBetAmountValue(value.anteConfig.amount, value.anteConfig.unit);
    }
    if (value.forcedBetMode === 'straddle') {
      return forcedBetAmountValue(value.straddleConfig.amount, value.straddleConfig.unit);
    }
    if (value.forcedBetMode === 'ante_straddle') {
      return `${forcedBetAmountValue(value.anteConfig.amount, value.anteConfig.unit)} / ${
        forcedBetAmountValue(value.straddleConfig.amount, value.straddleConfig.unit)
      }`;
    }
    return '—';
  }

  function enginePosition(position) {
    const aliases = {
      'LJ / UTG': 'UTG',
      'HJ / MP': 'MP',
      HJ: 'MP',
      LJ: 'UTG'
    };
    return aliases[position] || position;
  }

  function engineSpotForForm(spot) {
    const map = {
      'Unopened pot': 'OR',
      'Facing open': 'THREEBET_VS_OPEN',
      'Facing 3Bet': 'VS3BET',
      'Facing 4Bet': 'VS4BET_AFTER_3BET'
    };
    return map[spot] || null;
  }

  function formSpotForEngine(spot) {
    const map = {
      OR: 'Unopened pot',
      THREEBET_VS_OPEN: 'Facing open',
      BB_DEFENSE_VS_OPEN: 'Facing open',
      VS3BET: 'Facing 3Bet',
      VS4BET_AFTER_3BET: 'Facing 4Bet'
    };
    return map[spot] || null;
  }

  function normalize(state) {
    const sourceState = state || {};
    const value = Object.assign(defaults(), sourceState);
    value.personalCollections = Array.isArray(value.personalCollections)
      ? Array.from(new Set(
        value.personalCollections
          .map(item => String(item || '').trim())
          .filter(Boolean)
      ))
      : ['ColecciÃ³n 1', 'ColecciÃ³n 2'];
    if (!value.personalCollections.length) {
      value.personalCollections = ['ColecciÃ³n 1', 'ColecciÃ³n 2'];
    }
    value.customSpotPairs = Array.isArray(value.customSpotPairs)
      ? value.customSpotPairs
        .filter(item => item && typeof item.spot === 'string' &&
          typeof item.subSpot === 'string' && item.spot && item.subSpot)
        .map(item => ({ spot: item.spot, subSpot: item.subSpot }))
      : [];
    value.name = typeof value.name === 'string' ? value.name : '';
    if (!RANGE_TYPES.includes(value.rangeType)) value.rangeType = RANGE_TYPES[0];
    if (!BET_FORMATS.includes(value.betFormat)) value.betFormat = BET_FORMATS[0];
    if (!COLLECTIONS.includes(value.collection)) value.collection = COLLECTIONS[0];
    if (value.rangeType === 'Personal') {
      if (!value.personalCollections.includes(value.collectionView)) {
        value.collectionView = value.personalCollections[0];
      }
    } else if (!['Personalizado', 'Estandar'].includes(value.collectionView)) {
      value.collectionView = 'Personalizado';
    }
    if (!GAMES.includes(value.game)) value.game = GAMES[0];
    if (!ENVIRONMENTS.includes(value.environment)) value.environment = ENVIRONMENTS[0];
    if (!TABLES.includes(value.tableSize)) value.tableSize = '6-max';
    if (!RELATIONS.includes(value.relation)) value.relation = 'Auto';
    if (!STACKS.includes(value.stack)) value.stack = '100bb';
    if (!STACK_RELATIONS.includes(value.stackRelation)) value.stackRelation = STACK_RELATIONS[0];
    value.ante = value.ante === true;
    value.straddle = value.straddle === true;
    if (!Object.prototype.hasOwnProperty.call(sourceState, 'forcedBetMode')) {
      value.forcedBetMode = value.ante && value.straddle
        ? 'ante_straddle'
        : value.ante
          ? 'ante'
          : value.straddle
            ? 'straddle'
            : 'none';
    }
    if (!FORCED_BET_MODES.includes(value.forcedBetMode)) value.forcedBetMode = 'none';
    const legacyAnteType = {
      'Ante clÃ¡sico': 'Classic ante',
      'Ante por jugador': 'Per player ante',
      Nuevo: 'Custom'
    }[value.anteType] || value.anteType;
    const legacyStraddleType = value.straddleType === 'Nuevo'
      ? 'Custom'
      : value.straddleType;
    value.anteConfig = Object.assign(
      { type: legacyAnteType || 'BB ante', amount: '1bb / 100%', unit: 'bb' },
      value.anteConfig && typeof value.anteConfig === 'object' ? value.anteConfig : {}
    );
    value.straddleConfig = Object.assign(
      { type: legacyStraddleType || 'UTG straddle', amount: '2bb / x2', unit: 'bb' },
      value.straddleConfig && typeof value.straddleConfig === 'object'
        ? value.straddleConfig
        : {}
    );
    if (!FORCED_ANTE_TYPES.includes(value.anteConfig.type)) {
      value.anteConfig.type = 'BB ante';
    }
    if (!FORCED_ANTE_AMOUNTS.includes(value.anteConfig.amount)) {
      value.anteConfig.amount = '1bb / 100%';
    }
    if (!['bb', 'percent'].includes(value.anteConfig.unit)) value.anteConfig.unit = 'bb';
    if (!FORCED_STRADDLE_TYPES.includes(value.straddleConfig.type)) {
      value.straddleConfig.type = 'UTG straddle';
    }
    if (!FORCED_STRADDLE_AMOUNTS.includes(value.straddleConfig.amount)) {
      value.straddleConfig.amount = '2bb / x2';
    }
    if (!['bb', 'multiplier'].includes(value.straddleConfig.unit)) {
      value.straddleConfig.unit = 'bb';
    }
    value.ante = value.forcedBetMode === 'ante' ||
      value.forcedBetMode === 'ante_straddle';
    value.straddle = value.forcedBetMode === 'straddle' ||
      value.forcedBetMode === 'ante_straddle';
    value.anteType = value.anteConfig.type;
    value.straddleType = value.straddleConfig.type;
    value.forcedBetTypeLabel = forcedBetTypeLabel(value);
    value.forcedBetAmountLabel = forcedBetAmountLabel(value);
    if (Object.prototype.hasOwnProperty.call(sourceState, 'multiwayMode') &&
        MULTIWAY_MODES.includes(sourceState.multiwayMode)) {
      value.multiwayMode = sourceState.multiwayMode;
    } else if (Object.prototype.hasOwnProperty.call(sourceState, 'multiway')) {
      value.multiwayMode = sourceState.multiway === true ? 'MULTIWAY' : 'OFF';
    } else if (!MULTIWAY_MODES.includes(value.multiwayMode)) {
      value.multiwayMode = 'OFF';
    }
    value.multiway = value.multiwayMode === 'MULTIWAY';
    if (!ANTE_TYPES.includes(value.anteType)) value.anteType = ANTE_TYPES[0];
    if (!STRADDLE_TYPES.includes(value.straddleType)) {
      value.straddleType = STRADDLE_TYPES[0];
    }
    value.anteType = value.anteConfig.type;
    value.straddleType = value.straddleConfig.type;
    if (!MODELS.includes(value.model)) value.model = MODELS[0];
    if (!PROFILES.includes(value.profile)) value.profile = PROFILES[0];
    if (!EXPLOITS.includes(value.exploit)) value.exploit = EXPLOITS[0];
    if (!ACTIONS.includes(value.action)) value.action = ACTIONS[0];
    if (!SIZES.includes(value.size)) value.size = SIZES[0];
    if (!actionNeedsSize(value.action)) value.size = 'Sin tamaÃ±o';
    if (value.game === 'HU') value.tableSize = '2-max';
    const tablePositions = positions(value.tableSize);
    if (!tablePositions.includes(value.hero)) value.hero = tablePositions[0];
    const rivals = tablePositions.filter(position => position !== value.hero);
    if (!rivals.includes(value.rival) && value.rival !== 'No aplica' &&
        value.rival !== 'Varios rivales') value.rival = rivals[0] || 'No aplica';
    if (!subGames(value.game).includes(value.subGame)) value.subGame = subGames(value.game)[0];
    if (!stakes(value.game).includes(value.stake)) value.stake = stakes(value.game)[0];
    if (!['MTT', 'SNG', 'Spins'].includes(value.game)) {
      value.phase = 'General';
      value.prize = 'General';
    } else {
      if (!phases(value.game).includes(value.phase)) value.phase = phases(value.game)[0];
      if (!prizes(value.game).includes(value.prize)) value.prize = prizes(value.game)[0];
    }
    if (!RECREATIONAL_PROFILES.has(value.profile)) value.exploit = 'No aplica';
    const validSpots = Array.from(new Set(
      spots(value.multiway).concat(value.customSpotPairs.map(item => item.spot))
    ));
    if (!validSpots.includes(value.spot)) value.spot = validSpots[0];
    const validSubSpots = Array.from(new Set(
      subSpots(value.spot).concat(
        value.customSpotPairs
          .filter(item => item.spot === value.spot)
          .map(item => item.subSpot)
      )
    ));
    if (!validSubSpots.includes(value.subSpot)) value.subSpot = validSubSpots[0];
    const inferredRelation = inferRelation(value.hero, value.rival, value.tableSize);
    if (inferredRelation) value.relation = inferredRelation;
    else if (!RELATIONS.includes(value.relation)) value.relation = 'Auto';
    return value;
  }

  function validate(state) {
    const source = state || {};
    const value = normalize(state);
    const required = [
      ['collection', 'Coleccion'], ['collectionView', 'Coleccion interna'], ['rangeType', 'Tipo'], ['betFormat', 'Formato'],
      ['game', 'Game'], ['environment', 'Entorno'], ['subGame', 'Sub game'],
      ['stake', 'Stake / Buy-in'], ['tableSize', 'Mesa'], ['hero', 'Hero'],
      ['stack', 'Stack'], ['stackRelation', 'Stack relation'], ['profile', 'Perfil'], ['spot', 'Spot'],
      ['subSpot', 'Sub spot'], ['action', 'AcciÃ³n']
    ];
    const errors = required
      .filter(([key]) => Object.prototype.hasOwnProperty.call(source, key)
        ? !String(source[key] || '').trim()
        : !String(value[key] || '').trim())
      .map(([key, label]) => ({ key, message: `${label} es obligatorio` }));
    if (value.ante && (
      !source.anteConfig ||
      !FORCED_ANTE_TYPES.includes(source.anteConfig.type) ||
      !FORCED_ANTE_AMOUNTS.includes(source.anteConfig.amount)
    )) {
      errors.push({
        key: 'anteConfig',
        message: 'La configuracion de ante debe incluir tipo y cantidad validos'
      });
    }
    if (value.straddle && (
      !source.straddleConfig ||
      !FORCED_STRADDLE_TYPES.includes(source.straddleConfig.type) ||
      !FORCED_STRADDLE_AMOUNTS.includes(source.straddleConfig.amount)
    )) {
      errors.push({
        key: 'straddleConfig',
        message: 'La configuracion de straddle debe incluir tipo y cantidad validos'
      });
    }
    if (source.game === 'HU' && source.tableSize && source.tableSize !== '2-max') {
      errors.push({ key: 'tableSize', message: 'HU requiere mesa 2-max' });
    }
    if (source.multiway === true && source.spot && !SPOTS.multiway.includes(source.spot)) {
      errors.push({ key: 'spot', message: 'El spot debe ser multiway' });
    }
    return errors;
  }

  RT.RangeFormModel = {
    CATALOG: {
      collections: COLLECTIONS, rangeTypes: RANGE_TYPES, betFormats: BET_FORMATS, games: GAMES,
      environments: ENVIRONMENTS, tables: TABLES, stacks: STACKS, stackRelations: STACK_RELATIONS,
      relations: RELATIONS, anteTypes: ANTE_TYPES,
      straddleTypes: STRADDLE_TYPES, models: MODELS, profiles: PROFILES,
      exploits: EXPLOITS, actions: ACTIONS, sizes: SIZES,
      forcedBetModes: FORCED_BET_MODES,
      forcedBetModeLabels: FORCED_BET_MODE_LABELS,
      forcedAnteTypes: FORCED_ANTE_TYPES,
      forcedStraddleTypes: FORCED_STRADDLE_TYPES,
      forcedAnteAmounts: FORCED_ANTE_AMOUNTS,
      forcedStraddleAmounts: FORCED_STRADDLE_AMOUNTS
    },
    defaults, normalize, validate, options, positions, subGames, stakes,
    phases, prizes, spots, subSpots, engineSpotForForm, formSpotForEngine,
    actionNeedsSize, inferRelation, enginePosition,
    forcedBetTypeLabel, forcedBetAmountLabel, forcedBetAmountValue,
    isTournament: game => ['MTT', 'SNG', 'Spins'].includes(game),
    showStraddle: state => state.game === 'Cash' || state.environment === 'Live',
    showExploit: profile => RECREATIONAL_PROFILES.has(profile)
  };
})(window.RT);

