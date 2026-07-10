/* Barras compactas de acciones y filtros componibles del Visualizador. */
'use strict';

(function (RT) {
  const ACTION_PALETTE = Object.freeze({
    FOLD: '#6B7280',
    CHECK: '#3B4452',
    CALL: '#2D6B73',
    LIMP: '#6B6F4A',
    OR: '#4C6A86',
    ROL: '#5B7F8A',
    '3BET': '#5A5F8A',
    '4BET': '#6A4D6E',
    '5BET': '#7A3E5A',
    SQUEEZE: '#8A6B3D',
    ALL_IN: '#8B2E2E'
  });

  const ACTION_ORDER = [
    ['FOLD', 'FOLD'], ['CHECK', 'CHECK'], ['CALL', 'CALL'], ['LIMP', 'LIMP'],
    ['OR', 'OR'], ['ROL', 'ROL'], ['3BET', '3B'], ['4BET', '4B'],
    ['5BET', '5B+'], ['SQUEEZE', 'SQZ'], ['ALL_IN', 'ALL-IN']
  ].map(([id, label]) => ({ id, label, color: ACTION_PALETTE[id] }));

  const ACTION_ALIASES = {
    FOLD: ['FOLD', 'FOLD_VS_4BET'],
    CHECK: ['CHECK'],
    CALL: ['CALL', 'CALL_STANDARD', 'CALL_MARGINAL', 'CALL_VS_4BET'],
    LIMP: ['LIMP'],
    OR: ['OR', 'RAISE'],
    ROL: ['ROL', 'ISO'],
    '3BET': ['3BET', '3BET_MAIN', '3BET_MIXED'],
    '4BET': ['4BET'],
    '5BET': ['5BETPLUS', '5BET_STACKOFF'],
    SQUEEZE: ['SQUEEZE', 'COLD4BET'],
    ALL_IN: ['ALLIN', 'ALL_IN', 'PUSH', 'JAM', 'CALL_PUSH', 'CALL_ALLIN']
  };

  const FAMILY_OPTIONS = [
    ['pairs', 'PAIRS', '#4C6A86'],
    ['broadway', 'BWAY', '#4C6A86'],
    ['connectors', 'CONN', '#4C6A86']
  ];
  const GAP_OPTIONS = [
    ['gap1', '1', '#4C6A86'],
    ['gap2', '2', '#3F5A73'],
    ['gap3', '3', '#334B61']
  ];
  const GAP_IDS = GAP_OPTIONS.map(option => option[0]);
  const FAMILY_IDS = FAMILY_OPTIONS.map(option => option[0]).concat(GAP_IDS);

  const STRENGTH_OPTIONS = [
    ['A', 'A', 'Fuerza alta', '#3F6F5A'],
    ['M', 'M', 'Fuerza media', '#345B4C'],
    ['B', 'B', 'Fuerza baja', '#29483D']
  ];

  const TEXTURE_OPTIONS = [
    ['suited', 'SUITED', 'Suited', '#3F6F5A'],
    ['offsuit', 'OFFSUIT', 'Offsuit', '#315747']
  ];

  const USER_PRESET_STORAGE_KEY = 'rangeViewer.userFilterPresets';
  const SYSTEM_FILTER_PRESETS = Object.freeze([
    {
      name: 'Mapa completo',
      description: 'Muestra todo sin restricciones.',
      filters: {}
    },
    {
      name: 'Valor fuerte',
      description: 'Manos de valor principales.',
      filters: { families: ['pairs', 'broadway'], strengths: ['A'] }
    },
    {
      name: 'Broadways',
      description: 'Revisión rápida de broadways.',
      filters: { families: ['broadway'] }
    },
    {
      name: 'Suited jugables',
      description: 'Manos suited con buena jugabilidad.',
      filters: {
        texture: 'suited',
        families: ['broadway', 'connectors', 'gap1', 'gap2']
      }
    },
    {
      name: 'Pares',
      description: 'Revisión completa de parejas.',
      filters: { families: ['pairs'], strengths: ['A', 'M', 'B'] }
    },
    {
      name: 'Especulativas',
      description: 'Conectores y gappers medios o bajos.',
      filters: {
        texture: 'suited',
        families: ['connectors', 'gap1', 'gap2', 'gap3'],
        strengths: ['M', 'B']
      }
    }
  ]);

  const RANK_COLORS = [
    '#4C6A86', '#48647F', '#445F79', '#405A73', '#3C556D',
    '#384F66', '#344A60', '#30455A', '#2C4054', '#293B4E',
    '#263748', '#233242', '#202E3C'
  ];

  function normalizeActionCode(action) {
    const code = String(action || '').trim().toUpperCase()
      .replace(/[\s-]+/g, '_').replace(/\+/g, 'PLUS');
    const aliases = {
      ALLIN: 'ALL_IN', PUSH: 'ALL_IN', JAM: 'ALL_IN',
      CALL_PUSH: 'ALL_IN', CALL_ALL_IN: 'ALL_IN', CALL_ALLIN: 'ALL_IN',
      '5BETPLUS': '5BET', '5BET_STACKOFF': '5BET',
      '3BET_MAIN': '3BET', '3BET_MIXED': '3BET',
      CALL_STANDARD: 'CALL', CALL_MARGINAL: 'CALL', CALL_VS_4BET: 'CALL',
      FOLD_VS_4BET: 'FOLD', RAISE: 'OR', ISO: 'ROL', COLD4BET: 'SQUEEZE'
    };
    return aliases[code] || code;
  }

  function actionMatches(selected, actual) {
    const wanted = ACTION_ALIASES[selected] || [selected];
    const actualCode = String(actual || '').toUpperCase();
    return wanted.includes(actualCode) || normalizeActionCode(actualCode) === selected;
  }

  function getActionColor(action) {
    return ACTION_PALETTE[normalizeActionCode(action)] || null;
  }

  function getEnabledActionsForSpot(spot, actionsInRange) {
    const dataConcepts = new Set();
    (actionsInRange || []).forEach(actual => ACTION_ORDER.forEach(action => {
      if (actionMatches(action.id, actual)) dataConcepts.add(action.id);
    }));
    return ACTION_ORDER
      .map(action => action.id)
      .filter(action => dataConcepts.has(action));
  }

  function isBroadway(hand) {
    const ranks = ['A', 'K', 'Q', 'J', 'T'];
    return !RT.Hands.isPair(hand) && ranks.includes(hand[0]) && ranks.includes(hand[1]);
  }

  function pairStrength(hand) {
    if (!RT.Hands.isPair(hand)) return null;
    if (['A', 'K', 'Q', 'J', 'T'].includes(hand[0])) return 'A';
    if (['9', '8', '7', '6'].includes(hand[0])) return 'M';
    return 'B';
  }

  function rankGap(hand) {
    if (RT.Hands.isPair(hand)) return 0;
    return Math.abs(
      RT.Hands.RANKS.indexOf(hand[0]) - RT.Hands.RANKS.indexOf(hand[1]));
  }

  function isConnector(hand) {
    return !RT.Hands.isPair(hand) && rankGap(hand) === 1;
  }

  function isGapper(hand, gaps) {
    return !RT.Hands.isPair(hand) && rankGap(hand) === gaps + 1;
  }

  function rankStrengthBand(rank) {
    const index = RT.Hands.RANKS.indexOf(rank);
    if (index <= 4) return 'A';
    if (index <= 8) return 'M';
    return 'B';
  }

  function handStrengthBand(hand, activeRanks, rankMode) {
    if (RT.Hands.isPair(hand)) return pairStrength(hand);
    const ranks = Array.from(activeRanks || []);
    if (rankMode === 'include' && ranks.length) {
      const anchors = [hand[0], hand[1]]
        .filter(rank => ranks.includes(rank))
        .sort((a, b) => RT.Hands.RANKS.indexOf(a) - RT.Hands.RANKS.indexOf(b));
      if (anchors.length) {
        const anchor = anchors[0];
        const otherRank = hand[0] === anchor ? hand[1] : hand[0];
        return rankStrengthBand(otherRank);
      }
    }
    return rankStrengthBand(hand[1]);
  }

  function handMatchesFamily(hand, family) {
    if (family === 'pairs') return RT.Hands.isPair(hand);
    if (family === 'broadway') return isBroadway(hand);
    if (family === 'connectors') return isConnector(hand);
    if (family === 'gap1') return isGapper(hand, 1);
    if (family === 'gap2') return isGapper(hand, 2);
    if (family === 'gap3') return isGapper(hand, 3);
    return true;
  }

  function handMatchesActiveFilters(hand, activeFilters, actionMap, performanceMap) {
    const safe = activeFilters || {};
    const texture = safe.textureFilter || 'all';
    const families = Array.from(safe.familyFilters || []);
    const hasSubfilterAnchor = families.length > 0 ||
      Array.from(safe.rankFilters || []).length > 0;
    const strengths = hasSubfilterAnchor
      ? Array.from(safe.strengthFilters || [])
      : [];
    const ranks = Array.from(safe.rankFilters || []);
    const progress = Array.from(safe.progress || []);
    const actions = Array.from(safe.selectedActions || []);
    const map = actionMap || {};
    const metrics = performanceMap || {};
    const subtractive = safe.useSubtractiveSelections === true;
    if (subtractive && safe.emptyAll) return false;
    if (safe.actionFilterActive === true && !actions.length) return false;
    if (subtractive && (!ranks.length || !strengths.length)) return false;
    if (subtractive) {
      if (safe.rankMode === 'include') {
        if (!ranks.includes(hand[0]) && !ranks.includes(hand[1])) return false;
      } else if (!ranks.includes(hand[0]) || !ranks.includes(hand[1])) {
        return false;
      }
    } else if (ranks.length && !ranks.some(rank => RT.Hands.hasRank(hand, rank))) {
      return false;
    }
    if (hasSubfilterAnchor) {
      if (!RT.Hands.isPair(hand)) {
        if (texture === 'none') return false;
        if (texture === 'suited' && !RT.Hands.isSuited(hand)) return false;
        if (texture === 'offsuit' && !RT.Hands.isOffsuit(hand)) return false;
      }
      if (!strengths.length) return false;
    }

    const allStrengthsSelected = subtractive &&
      ['A', 'M', 'B'].every(strength => strengths.includes(strength));

    if (families.length) {
      const familyMatch = families.some(family =>
        handMatchesFamily(hand, family) &&
        (!strengths.length ||
          strengths.includes(handStrengthBand(hand, ranks, safe.rankMode))));
      if (!familyMatch) return false;
    } else if (hasSubfilterAnchor && !allStrengthsSelected &&
        !strengths.includes(handStrengthBand(hand, ranks, safe.rankMode))) {
      return false;
    }

    if (actions.length && !actions.some(action => actionMatches(action, map[hand]))) return false;
    if (progress.length) {
      const value = metrics[hand];
      if (!value || !progress.some(mode =>
        (mode === 'fails' && value.fail > 0) ||
        (mode === 'mastery' && value.ok > 0))) return false;
    }
    return true;
  }

  function applyMatrixFilters(hands, filters, actionMap, performanceMap) {
    return (hands || []).filter(hand =>
      handMatchesActiveFilters(hand, filters, actionMap, performanceMap));
  }

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  function sanitizePresetName(value) {
    const name = String(value || '').trim();
    return /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(name) ? name : '';
  }

  function defaultFilterSnapshot() {
    return Object.freeze({
      textureFilter: 'all',
      familyFilters: Object.freeze([]),
      strengthFilters: Object.freeze(['A', 'M', 'B']),
      rankFilters: Object.freeze(Array.from(RT.Hands.RANKS)),
      rankMode: 'subtract',
      emptyAll: false
    });
  }

  function presetDefinitionSnapshot(definition) {
    const source = definition || {};
    return Object.freeze({
      textureFilter: source.texture || 'all',
      familyFilters: Object.freeze(Array.from(source.families || [])),
      strengthFilters: Object.freeze(Array.from(
        source.strengths || ['A', 'M', 'B'])),
      rankFilters: Object.freeze(Array.from(source.ranks || RT.Hands.RANKS)),
      rankMode: source.rankMode || 'subtract',
      emptyAll: false
    });
  }

  function snapshotStructuralFilters(filters) {
    return Object.freeze({
      textureFilter: filters.textureFilter || 'all',
      familyFilters: Object.freeze(Array.from(filters.familyFilters || [])),
      strengthFilters: Object.freeze(Array.from(filters.strengthFilters || [])),
      rankFilters: Object.freeze(Array.from(filters.rankFilters || [])),
      rankMode: filters.rankMode || 'subtract',
      emptyAll: filters.emptyAll === true
    });
  }

  function normalizeStoredSnapshot(value) {
    const source = value && typeof value === 'object' ? value : {};
    const texture = ['all', 'suited', 'offsuit', 'none']
      .includes(source.textureFilter) ? source.textureFilter : 'all';
    const families = Array.from(source.familyFilters || source.families || [])
      .filter(id => FAMILY_IDS.includes(id));
    const strengths = Array.from(source.strengthFilters || source.strengths || [])
      .filter(id => ['A', 'M', 'B'].includes(id));
    const ranks = Array.from(source.rankFilters || source.ranks || [])
      .filter(rank => RT.Hands.RANKS.includes(rank));
    return Object.freeze({
      textureFilter: texture,
      familyFilters: Object.freeze(families),
      strengthFilters: Object.freeze(strengths),
      rankFilters: Object.freeze(ranks),
      rankMode: source.rankMode === 'include' ? 'include' : 'subtract',
      emptyAll: source.emptyAll === true
    });
  }

  function loadUserPresets() {
    const store = storage();
    if (!store) return [];
    try {
      const value = JSON.parse(store.getItem(USER_PRESET_STORAGE_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      const seen = new Set();
      return value.reduce((result, item) => {
        const name = sanitizePresetName(item && item.name);
        const key = name.toLocaleLowerCase();
        if (!name || seen.has(key)) return result;
        seen.add(key);
        result.push({ name, filters: normalizeStoredSnapshot(item.filters) });
        return result;
      }, []);
    } catch (_) {
      return [];
    }
  }

  function saveUserPresets(items) {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(USER_PRESET_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }

  function ensureState(ui) {
    const study = ui.study;
    if (!study.matrixFilters) study.matrixFilters = {};
    const filters = study.matrixFilters;
    // Migración defensiva del estado de la versión anterior.
    if (!filters.rankFilters && filters.cards) filters.rankFilters = filters.cards;
    if (!filters.familyFilters && filters.families) {
      filters.familyFilters = new Set(Array.from(filters.families)
        .map(id => id === 'gappers' ? 'gap2' : id)
        .filter(id => ['pairs', 'broadway', 'connectors', 'gap1', 'gap2', 'gap3'].includes(id)));
    }
    if (!filters.strengthFilters && filters.pairBands) {
      const strengthMap = { high: 'A', medium: 'M', low: 'B' };
      filters.strengthFilters = new Set(Array.from(filters.pairBands)
        .map(id => strengthMap[id]).filter(Boolean));
    }
    if (!filters.textureFilter) {
      const oldSuits = Array.from(filters.suits || []);
      filters.textureFilter = oldSuits.length === 1 ? oldSuits[0] : 'all';
    }
    ['familyFilters', 'strengthFilters', 'rankFilters', 'progress', 'selectedActions'].forEach(key => {
      if (!(filters[key] instanceof Set)) filters[key] = new Set(filters[key] || []);
    });
    if (filters.useSubtractiveSelections !== true) {
      filters.useSubtractiveSelections = true;
      filters.emptyAll = false;
      filters.rankMode = 'subtract';
      filters.textureFilter = 'all';
      filters.rankMode = 'subtract';
      filters.familyFilters = new Set();
      filters.strengthFilters = new Set(['A', 'M', 'B']);
      filters.rankFilters = new Set(RT.Hands.RANKS);
      study.subfiltersReady = true;
    }
    if (!study.actionToolbar) study.actionToolbar = {
      activeAction: null, selectedActions: new Set(),
      enabledActions: new Set(), disabledActions: new Set()
    };
    if (!(study.actionToolbar.selectedActions instanceof Set)) {
      study.actionToolbar.selectedActions = new Set(study.actionToolbar.selectedActions || []);
    }
    if (!(study.visibleSelection instanceof Set)) study.visibleSelection = new Set();
    if (!study.filterPresets) {
      study.filterPresets = {
        activePresetType: null,
        activePresetName: null,
        activePresetFilters: null,
        userPresets: loadUserPresets()
      };
    }
    if (!Array.isArray(study.filterPresets.userPresets)) {
      study.filterPresets.userPresets = loadUserPresets();
    }
    return study;
  }

  function create(options) {
    const { ui, actionRoot, filterRoot, getContext, renderAll } = options;
    const make = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    };
    const toggle = (set, value) => set.has(value) ? set.delete(value) : set.add(value);
    const chip = (label, active, onClick, extraClass, title) => {
      const control = make('button',
        `matrix-tool-chip${active ? ' is-active' : ''}${extraClass ? ` ${extraClass}` : ''}`,
        label);
      control.type = 'button';
      control.setAttribute('aria-pressed', String(active));
      if (title) {
        control.title = title;
        control.setAttribute('aria-label', title);
      }
      control.addEventListener('click', onClick);
      return control;
    };
    const markMiniReplayDirty = study => {
      if (!study || typeof study !== 'object') return;
      study.miniReplay = Object.assign({}, study.miniReplay, { manual: false });
    };
    const rerenderAfterToolChange = study => {
      markMiniReplayDirty(study);
      renderAll();
    };

    function applyStructuralSnapshot(study, snapshot) {
      const filters = study.matrixFilters;
      const safe = normalizeStoredSnapshot(snapshot);
      filters.textureFilter = safe.textureFilter;
      filters.rankMode = safe.rankMode;
      filters.familyFilters = new Set(safe.familyFilters);
      filters.strengthFilters = new Set(safe.strengthFilters);
      filters.rankFilters = new Set(safe.rankFilters);
      filters.emptyAll = safe.emptyAll;
      study.subfiltersReady = !safe.emptyAll &&
        (safe.familyFilters.length > 0 || safe.rankFilters.length > 0);
    }

    function setActivePreset(study, type, name, snapshot) {
      study.filterPresets.activePresetType = type;
      study.filterPresets.activePresetName = name;
      study.filterPresets.activePresetFilters =
        snapshotStructuralFilters(normalizeStoredSnapshot(snapshot));
    }

    function clearActivePreset(study) {
      study.filterPresets.activePresetType = null;
      study.filterPresets.activePresetName = null;
      study.filterPresets.activePresetFilters = null;
    }

    function applyPreset(study, type, name, snapshot) {
      const frozen = normalizeStoredSnapshot(snapshot);
      applyStructuralSnapshot(study, frozen);
      setActivePreset(study, type, name, frozen);
      rerenderAfterToolChange(study);
    }

    function resetStructuralFilters(study) {
      const snapshot = study.filterPresets.activePresetFilters ||
        defaultFilterSnapshot();
      applyStructuralSnapshot(study, snapshot);
    }

    function subfiltersHaveAnchor(filters) {
      return filters.familyFilters.size > 0 || filters.rankFilters.size > 0;
    }

    function reconcileSubfilters(study) {
      const filters = study.matrixFilters;
      if (subfiltersHaveAnchor(filters)) {
        const wasEmpty = filters.emptyAll;
        filters.emptyAll = false;
        if (wasEmpty) {
          study.actionToolbar.selectedActions =
            new Set(study.actionToolbar.enabledActions || []);
          filters.selectedActions = new Set(study.actionToolbar.selectedActions);
          filters.actionFilterActive = true;
        }
        if (!study.subfiltersReady) {
          filters.textureFilter = 'all';
          filters.strengthFilters = new Set(['A', 'M', 'B']);
          if (!filters.rankFilters.size) filters.rankFilters = new Set(RT.Hands.RANKS);
          study.subfiltersReady = true;
        }
      } else {
        filters.textureFilter = 'none';
        filters.strengthFilters.clear();
        study.subfiltersReady = false;
      }
    }

    function renderActionToolbar(context, actionMap) {
      const study = ensureState(ui);
      const toolbar = study.actionToolbar;
      const inRange = Array.from(new Set(Object.values(actionMap || {})));
      const enabled = new Set(context
        ? getEnabledActionsForSpot(context.spot, inRange) : []);
      toolbar.enabledActions = enabled;
      toolbar.disabledActions = new Set(
        ACTION_ORDER.map(action => action.id).filter(action => !enabled.has(action)));
      const contextKey = context
        ? [context.source, context.spot, context.hero, context.relative, context.vs]
          .map(value => value || '').join('|')
        : '';
      if (toolbar.contextKey !== contextKey || toolbar.subtractive !== true) {
        toolbar.contextKey = contextKey;
        toolbar.subtractive = true;
        toolbar.selectedActions = new Set(enabled);
      } else {
        Array.from(toolbar.selectedActions).forEach(action => {
          if (!enabled.has(action)) toolbar.selectedActions.delete(action);
        });
      }
      study.matrixFilters.selectedActions = new Set(toolbar.selectedActions);
      study.matrixFilters.actionFilterActive = !!context;

      actionRoot.innerHTML = '';
      actionRoot.hidden = ui.mode !== 'study';
      if (ui.mode !== 'study') return;
      const controls = make('div', 'matrix-action-grid');
      ACTION_ORDER.forEach(action => {
        const applicable = enabled.has(action.id);
        const control = chip(action.label, toolbar.selectedActions.has(action.id), () => {
          if (!applicable) return;
          toggle(toolbar.selectedActions, action.id);
          toolbar.activeAction = toolbar.selectedActions.size === 1
            ? Array.from(toolbar.selectedActions)[0] : null;
          study.matrixFilters.selectedActions = new Set(toolbar.selectedActions);
          rerenderAfterToolChange(study);
        }, `matrix-action-chip${applicable ? '' : ' is-disabled'}`,
        applicable ? action.label : 'No aplica para este tipo de rango');
        control.style.setProperty('--action-color', action.color);
        control.disabled = !applicable;
        controls.appendChild(control);
      });
      actionRoot.appendChild(controls);
    }

    function renderFilterToolbar() {
      const study = ensureState(ui);
      const filters = study.matrixFilters;
      reconcileSubfilters(study);
      filterRoot.innerHTML = '';
      filterRoot.hidden = ui.mode !== 'study';
      if (ui.mode !== 'study') return;

      const quick = make('div', 'matrix-filter-row is-quick');
      const cards = make('div', 'matrix-card-grid');
      RT.Hands.RANKS.forEach((rank, index) => {
        const control = chip(
        rank, filters.rankFilters.has(rank), () => {
          if (filters.emptyAll) {
            filters.rankFilters.add(rank);
            filters.rankMode = 'include';
          } else {
            toggle(filters.rankFilters, rank);
          }
          reconcileSubfilters(study);
          rerenderAfterToolChange(study);
        }, 'is-rank is-tone rank-btn');
        control.style.setProperty('--filter-color', RANK_COLORS[index]);
        cards.appendChild(control);
      });
      quick.appendChild(cards);
      filterRoot.appendChild(quick);

      const secondaryRow = make('div', 'matrix-filter-row is-secondary range-filter-row');
      const suits = make('div', 'matrix-suit-grid filter-group filter-group-suits');
      const subfiltersEnabled = subfiltersHaveAnchor(filters);
      TEXTURE_OPTIONS.forEach(([id, label, title, color]) => {
        const selected = subfiltersEnabled &&
          (filters.textureFilter === 'all' || filters.textureFilter === id);
        const control = chip(label, selected, () => {
          if (!subfiltersEnabled) return;
          if (filters.textureFilter === 'all') {
            filters.textureFilter = id === 'suited' ? 'offsuit' : 'suited';
          } else if (filters.textureFilter === id) {
            filters.textureFilter = 'none';
          } else if (filters.textureFilter === 'none') {
            filters.textureFilter = id;
          } else {
            filters.textureFilter = 'all';
          }
          rerenderAfterToolChange(study);
        }, 'is-suit is-tone filter-btn-lg', subfiltersEnabled ? title : 'Activa primero una carta o familia');
        control.disabled = !subfiltersEnabled;
        control.style.setProperty('--filter-color', color);
        suits.appendChild(control);
      });
      secondaryRow.appendChild(suits);

      const families = make('div', 'matrix-family-filters filter-group filter-group-families');
      FAMILY_OPTIONS.forEach(([id, label, color]) => {
        families.appendChild(chip(label, filters.familyFilters.has(id), () => {
          if (filters.emptyAll) {
            filters.familyFilters.add(id);
            filters.rankFilters = new Set(RT.Hands.RANKS);
            filters.rankMode = 'subtract';
          } else {
            toggle(filters.familyFilters, id);
          }
          reconcileSubfilters(study);
          rerenderAfterToolChange(study);
        }, `is-family is-tone filter-btn-md${id === 'pairs' ? ' is-pairs' : ''}`));
        const control = families.children[families.children.length - 1];
        control.style.setProperty('--filter-color', color);
      });
      secondaryRow.appendChild(families);

      const strengths = make('div', 'matrix-strength-filters filter-group filter-group-strength');
      const strengthEnabled = subfiltersHaveAnchor(filters);
      STRENGTH_OPTIONS.forEach(([id, label, title, color]) => {
        const control = chip(label, filters.strengthFilters.has(id), () => {
          if (!strengthEnabled) return;
          toggle(filters.strengthFilters, id);
          rerenderAfterToolChange(study);
        }, 'is-strength is-tone filter-btn-sm', strengthEnabled ? title : 'Activa primero una carta o familia');
        control.disabled = !strengthEnabled;
        control.style.setProperty('--filter-color', color);
        strengths.appendChild(control);
      });
      secondaryRow.appendChild(strengths);

      const gapActive = GAP_IDS.some(id => filters.familyFilters.has(id));
      const gap = chip('GAP', gapActive, () => {
        if (gapActive) {
          GAP_IDS.forEach(id => filters.familyFilters.delete(id));
        } else {
          GAP_IDS.forEach(id => filters.familyFilters.add(id));
          if (filters.emptyAll) {
            filters.rankFilters = new Set(RT.Hands.RANKS);
            filters.rankMode = 'subtract';
          }
        }
        reconcileSubfilters(study);
        rerenderAfterToolChange(study);
      }, 'is-family is-tone is-gap-parent filter-btn-md');
      gap.style.setProperty('--filter-color', '#4C6A86');

      const gaps = make('div', 'matrix-gap-filters filter-group filter-group-gaps');
      gaps.appendChild(gap);
      GAP_OPTIONS.forEach(([id, label, color]) => {
        const control = chip(label, filters.familyFilters.has(id), () => {
          if (filters.emptyAll) {
            filters.familyFilters.add(id);
            filters.rankFilters = new Set(RT.Hands.RANKS);
            filters.rankMode = 'subtract';
          } else {
            toggle(filters.familyFilters, id);
          }
          reconcileSubfilters(study);
          rerenderAfterToolChange(study);
        }, 'is-gap-subfilter is-tone filter-btn-sm');
        control.style.setProperty('--filter-color', color);
        gaps.appendChild(control);
      });
      secondaryRow.appendChild(gaps);

      const presetRow = make('div', 'matrix-filter-row is-presets range-filter-row');
      const presetGroup = make('div',
        'matrix-filter-presets filter-group filter-group-presets');
      let openPresetMenu = null;
      const closePresetMenu = menu => {
        if (menu) menu.hidden = true;
        if (openPresetMenu === menu) openPresetMenu = null;
      };
      const presetDropdown = (label, active, className) => {
        const root = make('div', `matrix-preset-control ${className || ''}`.trim());
        const trigger = chip(label, active, () => {
          const shouldOpen = menu.hidden;
          if (openPresetMenu && openPresetMenu !== menu) {
            closePresetMenu(openPresetMenu);
          }
          menu.hidden = !shouldOpen;
          openPresetMenu = shouldOpen ? menu : null;
          trigger.setAttribute('aria-expanded', String(shouldOpen));
        }, 'matrix-preset-trigger filter-select');
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        const menu = make('div', 'matrix-preset-menu');
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        root.appendChild(trigger);
        root.appendChild(menu);
        return { root, trigger, menu };
      };

      const presetState = study.filterPresets;
      const systemDropdown = presetDropdown(
        presetState.activePresetType === 'system'
          ? presetState.activePresetName : 'Presets',
        presetState.activePresetType === 'system',
        'is-system');
      SYSTEM_FILTER_PRESETS.forEach(preset => {
        const item = make('button', 'matrix-preset-item', preset.name);
        item.type = 'button';
        item.title = preset.description;
        item.setAttribute('role', 'menuitem');
        item.addEventListener('click', () => {
          applyPreset(study, 'system', preset.name,
            presetDefinitionSnapshot(preset.filters));
        });
        systemDropdown.menu.appendChild(item);
      });
      const userDropdown = presetDropdown(
        presetState.activePresetType === 'user'
          ? presetState.activePresetName : 'Custom',
        presetState.activePresetType === 'user',
        'is-user');
      const renderUserPresetMenu = () => {
        userDropdown.menu.innerHTML = '';
        if (!presetState.userPresets.length) {
          userDropdown.menu.appendChild(
            make('div', 'matrix-preset-empty', 'Sin presets guardados'));
          return;
        }
        presetState.userPresets.forEach(preset => {
          const row = make('div', 'matrix-user-preset-row');
          const apply = make('button', 'matrix-preset-item', preset.name);
          apply.type = 'button';
          apply.title = `Aplicar ${preset.name}`;
          apply.addEventListener('click', () => {
            applyPreset(study, 'user', preset.name, preset.filters);
          });
          const update = make('button', 'matrix-preset-row-action', '↻');
          update.type = 'button';
          update.title = `Actualizar ${preset.name}`;
          update.setAttribute('aria-label', `Actualizar ${preset.name}`);
          update.addEventListener('click', event => {
            if (event && event.stopPropagation) event.stopPropagation();
            preset.filters = snapshotStructuralFilters(filters);
            saveUserPresets(presetState.userPresets);
            setActivePreset(study, 'user', preset.name, preset.filters);
            userDropdown.trigger.textContent = preset.name;
            userDropdown.trigger.setAttribute('aria-pressed', 'true');
            if (!userDropdown.trigger.className.includes('is-active')) {
              userDropdown.trigger.className += ' is-active';
            }
          });
          const remove = make('button', 'matrix-preset-row-action is-delete', '×');
          remove.type = 'button';
          remove.title = `Eliminar ${preset.name}`;
          remove.setAttribute('aria-label', `Eliminar ${preset.name}`);
          remove.addEventListener('click', event => {
            if (event && event.stopPropagation) event.stopPropagation();
            const accepted = typeof window.confirm !== 'function' ||
              window.confirm(`¿Eliminar el preset "${preset.name}"?`);
            if (!accepted) return;
            presetState.userPresets = presetState.userPresets
              .filter(item => item.name !== preset.name);
            saveUserPresets(presetState.userPresets);
            if (presetState.activePresetType === 'user' &&
                presetState.activePresetName === preset.name) {
              clearActivePreset(study);
              userDropdown.trigger.textContent = 'Custom';
              userDropdown.trigger.setAttribute('aria-pressed', 'false');
              userDropdown.trigger.className = userDropdown.trigger.className
                .replace(/\s+is-active\b/g, '');
            }
            renderUserPresetMenu();
            userDropdown.menu.hidden = false;
            openPresetMenu = userDropdown.menu;
          });
          row.appendChild(apply);
          row.appendChild(update);
          row.appendChild(remove);
          userDropdown.menu.appendChild(row);
        });
      };
      renderUserPresetMenu();
      const savePreset = chip('SAVE', false, openSavePresetModal,
        'is-preset-save action-btn');
      savePreset.title = 'Guardar los filtros actuales como preset';
      presetGroup.appendChild(savePreset);
      presetGroup.appendChild(systemDropdown.root);
      presetGroup.appendChild(userDropdown.root);

      function openSavePresetModal() {
        if (!RT.Modal || typeof RT.Modal.open !== 'function') return;
        const content = make('div', 'matrix-preset-save-form');
        const input = make('input', 'matrix-preset-name-input');
        input.type = 'text';
        input.maxLength = 48;
        input.placeholder = 'Nombre del preset';
        input.setAttribute('autocomplete', 'off');
        const notice = make('p', 'matrix-preset-save-notice', '');
        notice.hidden = true;
        const footer = make('div', 'matrix-preset-save-actions');
        const cancel = make('button', 'btn ghost', 'CANCELAR');
        cancel.type = 'button';
        cancel.addEventListener('click', () => RT.Modal.close());
        const save = make('button', 'btn primary', 'GUARDAR');
        save.type = 'button';
        save.addEventListener('click', () => {
          const name = sanitizePresetName(input.value);
          if (!name) {
            notice.textContent = 'Usa solo letras, números y espacios.';
            notice.hidden = false;
            return;
          }
          const existing = presetState.userPresets.findIndex(item =>
            item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
          if (existing >= 0 && typeof window.confirm === 'function' &&
              !window.confirm(`"${name}" ya existe. ¿Sobrescribirlo?`)) return;
          const item = { name, filters: snapshotStructuralFilters(filters) };
          if (existing >= 0) presetState.userPresets[existing] = item;
          else presetState.userPresets.push(item);
          saveUserPresets(presetState.userPresets);
          setActivePreset(study, 'user', name, item.filters);
          RT.Modal.close();
          rerenderAfterToolChange(study);
        });
        footer.appendChild(cancel);
        footer.appendChild(save);
        content.appendChild(input);
        content.appendChild(notice);
        content.appendChild(footer);
        RT.Modal.open('Guardar preset', content, { variant: 'modal-filter-preset' });
        if (typeof input.focus === 'function') input.focus();
      }
      presetRow.appendChild(presetGroup);

      const utilities = make('div', 'matrix-filter-utilities filter-group filter-group-actions');
      const reset = chip('RESET', false, () => {
        resetStructuralFilters(study);
        rerenderAfterToolChange(study);
      }, 'is-filter-reset action-btn');
      reset.title = 'Restaurar el preset activo';
      utilities.appendChild(reset);
      const empty = chip('CLEAR', false, () => {
        clearActivePreset(study);
        rerenderAfterToolChange(study);
      }, 'is-filter-clear action-btn');
      empty.title = 'Quitar el preset activo sin cambiar los filtros';
      utilities.appendChild(empty);
      presetRow.appendChild(utilities);
      filterRoot.appendChild(secondaryRow);
      filterRoot.appendChild(presetRow);
    }

    function renderUtilities(root) {
      if (!root || ui.mode !== 'study') return;
      const study = ensureState(ui);
      const filters = study.matrixFilters;
      const panel = make('section', 'dash-panel matrix-utility-panel');
      const body = make('div', 'matrix-utility-body');
      const progressLine = make('div', 'matrix-utility-line');
      progressLine.appendChild(make('span', 'matrix-utility-label', 'Progreso'));
      const progress = make('div', 'matrix-utility-row is-progress');
      progress.appendChild(chip('Off', filters.progress.size === 0, () => {
        filters.progress.clear();
        rerenderAfterToolChange(study);
      }, 'is-utility'));
      [['fails', 'Fallos'], ['mastery', 'Acierto']].forEach(([id, label]) => {
        progress.appendChild(chip(label, filters.progress.has(id), () => {
          const active = filters.progress.has(id);
          filters.progress.clear();
          if (!active) filters.progress.add(id);
          rerenderAfterToolChange(study);
        }, 'is-utility'));
      });

      progressLine.appendChild(progress);
      body.appendChild(progressLine);
      panel.appendChild(body);
      root.appendChild(panel);
    }

    function render() {
      const context = getContext();
      const map = context ? RT.Engine.getActionMap(context) : {};
      renderActionToolbar(context, map);
      renderFilterToolbar();
    }

    return { render, renderUtilities };
  }

  RT.MatrixTools = {
    ACTION_PALETTE, ACTION_ORDER,
    normalizeActionCode, getActionColor, getEnabledActionsForSpot,
    handMatchesActiveFilters, applyMatrixFilters, actionMatches,
    handMatchesFamily, handStrengthBand, create
  };
})(window.RT);
