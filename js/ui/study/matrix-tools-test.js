'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const hands = [
  'AA', 'TT', '99', '66', '55', '22',
  'AKs', 'AKo', 'KQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A5s', 'KTs', 'KTo',
  'Q9s', 'Q9o', 'J9s', 'J9o', 'J8s', 'J8o', 'T9s', '76o', '52s', '52o', '72o'
];
const Hands = {
  RANKS,
  ALL_HANDS: hands,
  isPair: hand => hand.length === 2,
  isSuited: hand => hand.length === 3 && hand[2] === 's',
  isOffsuit: hand => hand.length === 3 && hand[2] === 'o',
  hasRank: (hand, rank) => hand[0] === rank || hand[1] === rank,
  isConnector: hand => hand.length === 3 &&
    Math.abs(RANKS.indexOf(hand[0]) - RANKS.indexOf(hand[1])) === 1 &&
    hand.slice(0, 2) !== 'AK'
};
const RT = { Hands };
const sandbox = { window: { RT }, console, Set, Array, Object, String, Math };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/matrix-tools.js', 'utf8'), sandbox);
const tools = RT.MatrixTools;

assert.strictEqual(tools.ACTION_ORDER.length, 11);
assert.deepStrictEqual(
  Array.from(tools.ACTION_ORDER, action => action.label),
  ['FOLD', 'CHECK', 'CALL', 'LIMP', 'OR', 'ROL', '3B', '4B', '5B+', 'SQZ', 'ALL-IN']
);
assert.strictEqual(tools.normalizeActionCode('3Bet_Main'), '3BET');
assert.strictEqual(tools.normalizeActionCode('5Bet+'), '5BET');
assert.strictEqual(tools.normalizeActionCode('all-in'), 'ALL_IN');
assert.strictEqual(tools.normalizeActionCode('jam'), 'ALL_IN');
assert.strictEqual(tools.getActionColor('CALL_STANDARD'), '#2D6B73');
assert.strictEqual(tools.getActionColor('5BETPLUS'), '#7A3E5A');
assert(tools.getEnabledActionsForSpot('OR', ['OR']).includes('OR'));
assert(tools.getEnabledActionsForSpot('VS3BET', ['FOLD', 'CALL', '4BET']).includes('4BET'));
assert.deepStrictEqual(
  Array.from(tools.getEnabledActionsForSpot('VS3BET', ['CALL'])),
  ['CALL']
);
assert.deepStrictEqual(
  Array.from(tools.getEnabledActionsForSpot('VS3BET', ['CALL', '5BET_STACKOFF'])),
  ['CALL', '5BET']
);
assert(!tools.getEnabledActionsForSpot('OR', ['OR']).includes('SQUEEZE'));
assert(tools.getEnabledActionsForSpot('THREEBET_VS_OPEN', ['3BET_MAIN']).includes('3BET'));
assert(!tools.getEnabledActionsForSpot('THREEBET_VS_OPEN', ['3BET_MAIN']).includes('4BET'));

const actionMap = { AA: '4BET', AKs: 'CALL', AKo: 'CALL', A5s: '4BET', KQo: 'CALL' };
const performance = {
  AA: { ok: 3, fail: 0 }, AKs: { ok: 1, fail: 2 }, A5s: { ok: 0, fail: 1 }
};
const filters = extra => Object.assign({
  textureFilter: 'all',
  familyFilters: new Set(),
  strengthFilters: new Set(),
  rankFilters: new Set(),
  progress: new Set(),
  selectedActions: new Set(),
  actionFilterActive: false
}, extra);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands, filters({}), actionMap, performance
)), hands);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    useSubtractiveSelections: true,
    rankFilters: new Set(RANKS),
    strengthFilters: new Set(['A', 'M', 'B']),
    familyFilters: new Set(),
    textureFilter: 'all'
  }),
  actionMap,
  performance
)), hands);

const ranksWithoutK = new Set(RANKS.filter(rank => rank !== 'K'));
const subtractK = filters({
  useSubtractiveSelections: true,
  rankFilters: ranksWithoutK,
  strengthFilters: new Set(['A', 'M', 'B']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('AKs', subtractK, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', subtractK, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('KK', subtractK, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('AA', subtractK, {}, {}), true);

assert.strictEqual(tools.handStrengthBand('KQs'), 'A');
assert.strictEqual(tools.handStrengthBand('K9s'), 'M');
assert.strictEqual(tools.handStrengthBand('K6o'), 'M');
assert.strictEqual(tools.handStrengthBand('K5s'), 'B');
assert.strictEqual(tools.handStrengthBand('K2o'), 'B');

const kWithoutLow = filters({
  useSubtractiveSelections: true,
  rankFilters: new Set(RANKS),
  strengthFilters: new Set(['A', 'M']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('KQs', kWithoutLow, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K9s', kWithoutLow, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K5s', kWithoutLow, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', kWithoutLow, {}, {}), false);

const kWithoutHigh = filters({
  useSubtractiveSelections: true,
  rankFilters: new Set(RANKS),
  strengthFilters: new Set(['M', 'B']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('KQs', kWithoutHigh, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('K9s', kWithoutHigh, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K5s', kWithoutHigh, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', kWithoutHigh, {}, {}), true);

const onlyKWithoutLow = filters({
  useSubtractiveSelections: true,
  rankMode: 'include',
  rankFilters: new Set(['K']),
  strengthFilters: new Set(['A', 'M']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('KQs', onlyKWithoutLow, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K9s', onlyKWithoutLow, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K5s', onlyKWithoutLow, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', onlyKWithoutLow, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('AQs', onlyKWithoutLow, {}, {}), false);

const onlyKWithoutHigh = filters({
  useSubtractiveSelections: true,
  rankMode: 'include',
  rankFilters: new Set(['K']),
  strengthFilters: new Set(['M', 'B']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('KQs', onlyKWithoutHigh, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('K9s', onlyKWithoutHigh, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K5s', onlyKWithoutHigh, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', onlyKWithoutHigh, {}, {}), true);

const only8WithoutMedium = filters({
  useSubtractiveSelections: true,
  rankMode: 'include',
  rankFilters: new Set(['8']),
  strengthFilters: new Set(['A', 'B']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('A8s', only8WithoutMedium, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('T8s', only8WithoutMedium, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('98s', only8WithoutMedium, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('88', only8WithoutMedium, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('87s', only8WithoutMedium, {}, {}), false);
assert.strictEqual(tools.handMatchesActiveFilters('85s', only8WithoutMedium, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('82o', only8WithoutMedium, {}, {}), true);

const includeQ = filters({
  useSubtractiveSelections: true,
  rankMode: 'include',
  rankFilters: new Set(['Q']),
  strengthFilters: new Set(['A', 'M', 'B']),
  familyFilters: new Set(),
  textureFilter: 'all'
});
assert.strictEqual(tools.handMatchesActiveFilters('AQs', includeQ, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('Q2o', includeQ, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('QQ', includeQ, {}, {}), true);
assert.strictEqual(tools.handMatchesActiveFilters('K2o', includeQ, {}, {}), false);

assert.strictEqual(tools.handMatchesActiveFilters(
  'AKs',
  filters({ actionFilterActive: true, selectedActions: new Set() }),
  { AKs: 'CALL' },
  {}
), false);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({ strengthFilters: new Set(['A']) }),
  actionMap,
  performance
)), hands);

assert.strictEqual(tools.handMatchesActiveFilters(
  'AKs',
  filters({
    textureFilter: 'suited',
    familyFilters: new Set(['broadway']),
    strengthFilters: new Set(['A']),
    rankFilters: new Set(['A'])
  }),
  {},
  {}
), true);
assert.strictEqual(tools.handMatchesActiveFilters(
  'AKo',
  filters({ textureFilter: 'suited', familyFilters: new Set(['broadway']) }),
  {},
  {}
), false);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    rankFilters: new Set(['A']),
    textureFilter: 'suited',
    strengthFilters: new Set(['A', 'M', 'B']),
    selectedActions: new Set(['CALL'])
  }),
  actionMap,
  performance
)), ['AKs']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['broadway']),
    strengthFilters: new Set(['A', 'M', 'B']),
    textureFilter: 'offsuit'
  }),
  actionMap,
  performance
)), ['AKo', 'KQo', 'AJo', 'ATo', 'KTo']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['broadway']),
    strengthFilters: new Set(['A', 'M', 'B']),
    textureFilter: 'suited'
  }),
  actionMap,
  performance
)), ['AKs', 'AJs', 'ATs', 'KTs']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({ familyFilters: new Set(['pairs']), strengthFilters: new Set(['A']) }),
  actionMap,
  performance
)), ['AA', 'TT']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['pairs']),
    strengthFilters: new Set(['A', 'M', 'B']),
    textureFilter: 'suited'
  }),
  actionMap,
  performance
)), ['AA', 'TT', '99', '66', '55', '22']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({ familyFilters: new Set(['pairs']), strengthFilters: new Set(['M']) }),
  actionMap,
  performance
)), ['99', '66']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({ familyFilters: new Set(['pairs']), strengthFilters: new Set(['B']) }),
  actionMap,
  performance
)), ['55', '22']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['pairs', 'broadway']),
    strengthFilters: new Set(['A'])
  }),
  actionMap,
  performance
)), ['AA', 'TT', 'AKs', 'AKo', 'KQo', 'AJs', 'AJo', 'ATs', 'ATo', 'KTs', 'KTo']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['connectors']),
    strengthFilters: new Set(['A', 'M', 'B'])
  }),
  actionMap,
  performance
)), ['AKs', 'AKo', 'KQo', 'T9s', '76o']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['connectors']),
    strengthFilters: new Set(['A', 'M', 'B']),
    textureFilter: 'suited'
  }),
  actionMap,
  performance
)), ['AKs', 'T9s']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['connectors']),
    strengthFilters: new Set(['A', 'M', 'B']),
    textureFilter: 'offsuit'
  }),
  actionMap,
  performance
)), ['AKo', 'KQo', '76o']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['connectors']),
    strengthFilters: new Set(['A']),
    textureFilter: 'suited'
  }),
  actionMap,
  performance
)), ['AKs']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['gap2']),
    strengthFilters: new Set(['B']),
    textureFilter: 'offsuit'
  }),
  actionMap,
  performance
)), ['52o']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['gap1']),
    strengthFilters: new Set(['A', 'M', 'B'])
  }),
  actionMap,
  performance
)), ['J9s', 'J9o']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['gap2']),
    strengthFilters: new Set(['A', 'M', 'B'])
  }),
  actionMap,
  performance
)), ['AJs', 'AJo', 'KTs', 'KTo', 'Q9s', 'Q9o', 'J8s', 'J8o', '52s', '52o']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    familyFilters: new Set(['gap3']),
    strengthFilters: new Set(['A', 'M', 'B'])
  }),
  actionMap,
  performance
)), ['ATs', 'ATo']);

assert.deepStrictEqual(Array.from(tools.applyMatrixFilters(
  hands,
  filters({
    rankFilters: new Set(['A']),
    strengthFilters: new Set(['A', 'M', 'B']),
    progress: new Set(['fails'])
  }),
  actionMap,
  performance
)), ['AKs', 'A5s']);

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.listeners = {};
    this.style = { setProperty: () => {} };
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this._html = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(name, value) { this[name] = value; }
  set innerHTML(value) { this._html = value; if (!value) this.children = []; }
  get innerHTML() { return this._html; }
}
sandbox.document = { createElement: tag => new FakeElement(tag) };
const localData = {
  'rangeViewer.userFilterPresets': JSON.stringify([{
    name: 'Mi Preset',
    filters: {
      textureFilter: 'suited',
      familyFilters: ['connectors'],
      strengthFilters: ['A', 'M'],
      rankFilters: RANKS,
      rankMode: 'subtract',
      emptyAll: false
    }
  }])
};
sandbox.window.localStorage = {
  getItem: key => localData[key] || null,
  setItem: (key, value) => { localData[key] = value; }
};
sandbox.window.confirm = () => true;
RT.Engine = { getActionMap: () => ({ AKo: 'OR' }) };
RT.Stats = { getHandPerformanceMap: () => ({}) };
const actionRoot = new FakeElement('section');
const filterRoot = new FakeElement('section');
let renderCalls = 0;
const ui = {
  mode: 'study',
  study: {
    matrixFilters: filters({}),
    actionToolbar: {
      activeAction: null, selectedActions: new Set(),
      enabledActions: new Set(), disabledActions: new Set()
    },
    visibleSelection: new Set()
  }
};
const component = tools.create({
  ui, actionRoot, filterRoot,
  getContext: () => ({ spot: 'OR' }),
  renderAll: () => { renderCalls++; }
});
component.render();
const openRaiseButton = actionRoot.children[0].children[4];
assert.strictEqual(openRaiseButton['aria-pressed'], 'true');
const squeezeButton = actionRoot.children[0].children[9];
assert.strictEqual(squeezeButton.disabled, true);
squeezeButton.listeners.click({});
assert.strictEqual(renderCalls, 0);
openRaiseButton.listeners.click({});
assert.strictEqual(ui.study.matrixFilters.selectedActions.size, 0);
component.render();
actionRoot.children[0].children[4].listeners.click({});
assert.strictEqual(ui.study.matrixFilters.selectedActions.has('OR'), true);

const secondaryRow = filterRoot.children[1];
let suitButtons = secondaryRow.children[0].children;
const familyButtons = secondaryRow.children[1].children;
let strengthButtons = secondaryRow.children[2].children;
let gapGroupButtons = secondaryRow.children[3].children;
let presetRow = filterRoot.children[2];
let utilityButtons = presetRow.children[1].children;
assert.deepStrictEqual(
  suitButtons.map(button => button.textContent),
  ['SUITED', 'OFFSUIT']
);
assert.deepStrictEqual(
  familyButtons.map(button => button.textContent),
  ['PAIRS', 'BWAY', 'CONN']
);
assert.deepStrictEqual(
  gapGroupButtons.map(button => button.textContent),
  ['GAP', '1', '2', '3']
);
assert(!familyButtons.some(button =>
  ['Axs', 'Offsuit altas', 'Baja jugabilidad'].includes(button.textContent)));
assert(familyButtons.every(
  button => button['aria-pressed'] === 'false'));
assert(gapGroupButtons.every(button => button['aria-pressed'] === 'false'));

gapGroupButtons[0].listeners.click({});
component.render();
const currentGapGroup = () => filterRoot.children[1].children[3].children;
gapGroupButtons = currentGapGroup();
const currentGapParent = () => currentGapGroup()[0];
assert.strictEqual(currentGapParent()['aria-pressed'], 'true');
assert(gapGroupButtons.every(button => button['aria-pressed'] === 'true'));
assert.deepStrictEqual(
  Array.from(ui.study.matrixFilters.familyFilters),
  ['gap1', 'gap2', 'gap3']
);

gapGroupButtons[2].listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
assert.strictEqual(currentGapParent()['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[1]['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[2]['aria-pressed'], 'false');
assert.strictEqual(gapGroupButtons[3]['aria-pressed'], 'true');

gapGroupButtons[1].listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
gapGroupButtons[3].listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
assert.strictEqual(currentGapParent()['aria-pressed'], 'false');
assert(gapGroupButtons.every(button => button['aria-pressed'] === 'false'));
assert.strictEqual(ui.study.matrixFilters.familyFilters.size, 0);

gapGroupButtons[1].listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
assert.strictEqual(currentGapParent()['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[1]['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[2]['aria-pressed'], 'false');
assert.strictEqual(gapGroupButtons[3]['aria-pressed'], 'false');
gapGroupButtons[2].listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
assert.strictEqual(currentGapParent()['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[1]['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[2]['aria-pressed'], 'true');
assert.strictEqual(gapGroupButtons[3]['aria-pressed'], 'false');
currentGapParent().listeners.click({});
component.render();
gapGroupButtons = currentGapGroup();
assert.strictEqual(currentGapParent()['aria-pressed'], 'false');
assert(gapGroupButtons.every(button => button['aria-pressed'] === 'false'));
assert.strictEqual(ui.study.matrixFilters.familyFilters.size, 0);

assert(strengthButtons.every(button => !button.disabled));
assert(strengthButtons.every(button => button['aria-pressed'] === 'true'));
suitButtons = filterRoot.children[1].children[0].children;
assert(suitButtons.every(button => !button.disabled));
assert(suitButtons.every(button => button['aria-pressed'] === 'true'));
assert.deepStrictEqual(
  suitButtons.map(button => button.textContent),
  ['SUITED', 'OFFSUIT']
);
const rankButtons = filterRoot.children[0].children[0].children;
assert(rankButtons.every(button => button['aria-pressed'] === 'true'));
assert.strictEqual(utilityButtons[0].textContent, 'RESET');
assert.strictEqual(utilityButtons[1].textContent, 'CLEAR');

const presetGroup = filterRoot.children[2].children[0];
assert.strictEqual(presetGroup.children[0].textContent, 'SAVE');
const systemPresetMenu = presetGroup.children[1].children[1];
assert.strictEqual(systemPresetMenu.children[0].textContent, 'Mapa completo');
assert.strictEqual(systemPresetMenu.children[2].textContent, 'Broadways');
systemPresetMenu.children[2].listeners.click({});
component.render();
assert.deepStrictEqual(
  Array.from(ui.study.matrixFilters.familyFilters),
  ['broadway']
);
assert.strictEqual(ui.study.filterPresets.activePresetType, 'system');
assert.strictEqual(ui.study.filterPresets.activePresetName, 'Broadways');

filterRoot.children[1].children[1].children[1].listeners.click({});
component.render();
assert.strictEqual(ui.study.matrixFilters.familyFilters.size, 0);
utilityButtons = filterRoot.children[2].children[1].children;
utilityButtons[0].listeners.click({});
component.render();
assert.deepStrictEqual(
  Array.from(ui.study.matrixFilters.familyFilters),
  ['broadway']
);

utilityButtons = filterRoot.children[2].children[1].children;
utilityButtons[1].listeners.click({});
component.render();
assert.strictEqual(ui.study.filterPresets.activePresetType, null);
assert.strictEqual(ui.study.filterPresets.activePresetName, null);
assert.deepStrictEqual(
  Array.from(ui.study.matrixFilters.familyFilters),
  ['broadway']
);
utilityButtons = filterRoot.children[2].children[1].children;
utilityButtons[0].listeners.click({});
component.render();
assert.strictEqual(ui.study.matrixFilters.familyFilters.size, 0);
assert.strictEqual(ui.study.matrixFilters.rankFilters.size, 13);
assert.strictEqual(ui.study.matrixFilters.strengthFilters.size, 3);
assert.strictEqual(ui.study.matrixFilters.textureFilter, 'all');

const currentPresetGroup = filterRoot.children[2].children[0];
const userPresetMenu = currentPresetGroup.children[2].children[1];
assert.strictEqual(userPresetMenu.children.length, 1);
assert.strictEqual(userPresetMenu.children[0].children[0].textContent, 'Mi Preset');
userPresetMenu.children[0].children[0].listeners.click({});
component.render();
assert.strictEqual(ui.study.filterPresets.activePresetType, 'user');
assert.strictEqual(ui.study.filterPresets.activePresetName, 'Mi Preset');
assert.strictEqual(ui.study.matrixFilters.textureFilter, 'suited');
assert.deepStrictEqual(
  Array.from(ui.study.matrixFilters.familyFilters),
  ['connectors']
);

const refreshedUserMenu = filterRoot.children[2].children[0].children[2].children[1];
refreshedUserMenu.children[0].children[2].listeners.click({});
assert.strictEqual(ui.study.filterPresets.activePresetType, null);
assert.deepStrictEqual(
  JSON.parse(localData['rangeViewer.userFilterPresets']),
  []
);

filterRoot.children[2].children[1].children[0].listeners.click({});
component.render();
filterRoot.children[0].children[0].children[1].listeners.click({});
assert.strictEqual(ui.study.matrixFilters.rankFilters.has('K'), false);
assert.strictEqual(tools.handMatchesActiveFilters(
  'AKs',
  ui.study.matrixFilters,
  { AKs: 'OR' },
  {}
), false);
assert.strictEqual(tools.handMatchesActiveFilters(
  'KK',
  ui.study.matrixFilters,
  { KK: 'OR' },
  {}
), false);

const utilityRoot = new FakeElement('aside');
component.renderUtilities(utilityRoot);
const utilityBody = utilityRoot.children[0].children[0];
assert.strictEqual(utilityBody.children.length, 1);
assert.strictEqual(utilityBody.children[0].children[0].textContent, 'Progreso');

console.log('matrix-tools: estructura, paleta y filtros correctos');
